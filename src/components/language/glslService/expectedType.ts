// カーソル位置に来る式が何型であるべきかを、直前のテキストから推定する。
// 式の先頭 (= の直後、引数の先頭、return の直後) だけを扱う。
// `a * |` のような演算子の後は、スカラーとベクトルが混ざって正しく絞れないので推定しない

import { paramType } from './symbols';

export interface ExpectedTypeEnv {
  /** 'p'・'p.xy'・'ray.dir' のような式 → 型。分からなければ undefined */
  expressionType(expr: string): string | undefined;
  /** 組み込み型か struct 名か */
  isType(name: string): boolean;
  /** 関数名 → 引数リストの候補 (オーバーロード分) */
  overloads(name: string): string[][];
  /** カーソルを含む関数の戻り値の型 */
  enclosingReturnType: string | null;
}

/** カーソル直前の閉じていない呼び出しの関数名と、何番目の引数か */
export function findOpenCall(text: string): { name: string; argIndex: number } | null {
  let depth = 0;
  let argIndex = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    const c = text[i];
    if (c === ')' || c === ']') depth++;
    else if (c === '[') depth--;
    else if (c === '(') {
      if (depth > 0) {
        depth--;
        continue;
      }
      const name = /([A-Za-z_]\w*)\s*$/.exec(text.slice(0, i));
      return name ? { name: name[1], argIndex } : null;
    } else if (c === ',' && depth === 0) argIndex++;
    else if ((c === ';' || c === '{' || c === '}') && depth === 0) return null;
  }
  return null;
}

const CONDITION_KEYWORDS = new Set(['if', 'while']);

export function inferExpectedTypes(textBefore: string, env: ExpectedTypeEnv): string[] | null {
  const t = textBefore.replace(/\s+$/, '');

  // `=` の直後。==, <=, >=, !=, += などの複合代入は除く (vec3 *= float のように型が揃わない)
  if (/(?:^|[^=!<>+\-*/%&|^])=$/.test(t)) {
    const lhs = t.slice(0, -1).trimEnd();
    const decl = /\b([A-Za-z_]\w*)\s+[A-Za-z_]\w*\s*(?:\[[^\]]*\])?$/.exec(lhs);
    if (decl && env.isType(decl[1])) return [decl[1]];
    const assign = /(\$?[A-Za-z_]\w*(?:\s*\.\s*\w+)*)$/.exec(lhs);
    const type = assign ? env.expressionType(assign[1]) : undefined;
    return type ? [type] : null;
  }

  if (/\breturn$/.test(t)) {
    const ret = env.enclosingReturnType;
    return ret && ret !== 'void' ? [ret] : null;
  }

  if (t.endsWith('(') || t.endsWith(',')) {
    const call = findOpenCall(t);
    if (!call) return null;
    if (CONDITION_KEYWORDS.has(call.name)) return ['bool'];
    // vec3( や Ray( の引数は成分の組み合わせが自由なので絞らない
    if (env.isType(call.name)) return null;
    const types = new Set<string>();
    for (const params of env.overloads(call.name)) {
      if (params.length > call.argIndex) types.add(paramType(params[call.argIndex]));
    }
    return types.size > 0 ? [...types] : null;
  }

  return null;
}
