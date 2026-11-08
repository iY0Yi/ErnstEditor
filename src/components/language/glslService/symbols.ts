// GLSL のトップレベル宣言だけを拾う軽量パーサー。
// 補完・ホバーの材料にするのが目的なので、完全な構文解析はせず括弧の深さで宣言を切り出す

import { BUILTIN_TYPES } from './builtins';

export interface GlslFunction {
  name: string;
  returnType: string;
  params: string[];
  line: number;
  doc: string;
}

export interface GlslMacro {
  name: string;
  params: string[] | null;
  value: string;
  line: number;
  doc: string;
}

export interface GlslField {
  type: string;
  name: string;
}

export interface GlslStruct {
  name: string;
  members: GlslField[];
  line: number;
}

export interface GlslVariable extends GlslField {
  line: number;
}

export interface GlslInclude {
  path: string;
  quoted: boolean;
  line: number;
}

export interface ParsedGlsl {
  functions: GlslFunction[];
  macros: GlslMacro[];
  structs: GlslStruct[];
  variables: GlslVariable[];
  includes: GlslInclude[];
  /** コメントとプリプロセッサ行を空白にし、改行を LF に揃えたもの。行番号は元の文字列と一致する */
  code: string;
}

const CONTROL_WORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'else', 'do']);
const NON_TYPE_WORDS = new Set([...CONTROL_WORDS, 'precision', 'struct', 'layout', 'uniform']);
const DECL_QUALIFIERS_RE = /^(?:(?:const|uniform|in|out|inout|buffer|shared|highp|mediump|lowp|flat|smooth|noperspective|centroid|invariant|precise|readonly|writeonly|coherent|volatile|restrict)\s+)+/;
const FUNCTION_HEADER_RE = /^(?:(?:const|highp|mediump|lowp|precise|invariant|inline)\s+)*([A-Za-z_]\w*(?:\s*\[\s*\w*\s*\])?)\s+([A-Za-z_]\w*)\s*\((.*)\)$/;
const INCLUDE_RE = /^\s*#\s*include\s+(["'<]?)([^"'<>\s]+)["'>]?/;
const DEFINE_RE = /^\s*#\s*define\s+([A-Za-z_]\w*)(\(([^)]*)\))?\s*(.*)$/;

export function stripComments(text: string): string {
  const chars = text.split('');
  const n = chars.length;
  let i = 0;
  while (i < n) {
    if (chars[i] === '/' && chars[i + 1] === '/') {
      while (i < n && chars[i] !== '\n') chars[i++] = ' ';
    } else if (chars[i] === '/' && chars[i + 1] === '*') {
      chars[i++] = ' ';
      chars[i++] = ' ';
      while (i < n && !(chars[i] === '*' && chars[i + 1] === '/')) {
        if (chars[i] !== '\n') chars[i] = ' ';
        i++;
      }
      if (i < n) {
        chars[i++] = ' ';
        chars[i++] = ' ';
      }
    } else {
      i++;
    }
  }
  return chars.join('');
}

/** 括弧の内側にある区切りでは割らない */
export function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === sep && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

function parseFunctionHeader(header: string): Pick<GlslFunction, 'name' | 'returnType' | 'params'> | null {
  const h = header.replace(/\s+/g, ' ').trim();
  const m = FUNCTION_HEADER_RE.exec(h);
  if (!m) return null;
  const [, returnType, name, rawParams] = m;
  if (CONTROL_WORDS.has(name) || NON_TYPE_WORDS.has(returnType)) return null;
  const trimmed = rawParams.trim();
  const params = trimmed === '' || trimmed === 'void'
    ? []
    : splitTopLevel(trimmed, ',').map(p => p.trim()).filter(Boolean);
  return { name, returnType, params };
}

function parseDeclaration(stmt: string): GlslField[] {
  const s = stmt.replace(/\s+/g, ' ').trim()
    .replace(/^layout\s*\([^)]*\)\s*/, '')
    .replace(DECL_QUALIFIERS_RE, '');
  const m = /^([A-Za-z_]\w*)\s+(.+)$/.exec(s);
  if (!m || NON_TYPE_WORDS.has(m[1])) return [];
  const type = m[1];
  const fields: GlslField[] = [];
  for (const declarator of splitTopLevel(m[2], ',')) {
    const name = /^\s*([A-Za-z_]\w*)/.exec(declarator);
    if (name) fields.push({ type, name: name[1] });
  }
  return fields;
}

function docAbove(lines: string[], line: number): string {
  const doc: string[] = [];
  for (let i = line - 2; i >= 0; i--) {
    const t = lines[i].trim();
    if (!t.startsWith('//')) break;
    doc.unshift(t.replace(/^\/\/+\s?/, ''));
  }
  return doc.join('\n');
}

export function parseGlsl(text: string): ParsedGlsl {
  // CRLF のままだと行末の \r で正規表現の $ が合わなくなる
  const originalLines = text.split(/\r?\n/);
  const lines = stripComments(text).split(/\r?\n/);
  const includes: GlslInclude[] = [];
  const macros: GlslMacro[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*#/.test(lines[i])) continue;
    const line = i + 1;
    let directive = lines[i];
    lines[i] = ' '.repeat(lines[i].length);
    while (directive.trimEnd().endsWith('\\') && i + 1 < lines.length) {
      i++;
      directive = directive.trimEnd().slice(0, -1) + ' ' + lines[i];
      lines[i] = ' '.repeat(lines[i].length);
    }
    const inc = INCLUDE_RE.exec(directive);
    if (inc) {
      includes.push({ path: inc[2], quoted: inc[1] !== '', line });
      continue;
    }
    const def = DEFINE_RE.exec(directive);
    if (def) {
      macros.push({
        name: def[1],
        params: def[2] ? def[3].split(',').map(p => p.trim()).filter(Boolean) : null,
        value: def[4].trim(),
        line,
        doc: docAbove(originalLines, line)
      });
    }
  }

  const code = lines.join('\n');
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStarts.push(i + 1);
  const lineAt = (offset: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const firstNonSpace = (from: number, to: number): number => {
    let i = from;
    while (i < to && /\s/.test(code[i])) i++;
    return i;
  };

  const functions: GlslFunction[] = [];
  const structs: GlslStruct[] = [];
  const variables: GlslVariable[] = [];
  let depth = 0;
  let parenDepth = 0;
  let chunkStart = 0;
  let openStruct: { name: string; bodyStart: number; line: number } | null = null;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '(') {
      parenDepth++;
    } else if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
    } else if (ch === '{') {
      if (depth === 0) {
        const header = code.slice(chunkStart, i);
        const line = lineAt(firstNonSpace(chunkStart, i));
        const st = /^\s*struct\s+([A-Za-z_]\w*)\s*$/.exec(header);
        if (st) {
          openStruct = { name: st[1], bodyStart: i + 1, line };
        } else {
          const fn = parseFunctionHeader(header);
          if (fn) functions.push({ ...fn, line, doc: docAbove(originalLines, line) });
        }
      }
      depth++;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        if (openStruct) {
          const members = splitTopLevel(code.slice(openStruct.bodyStart, i), ';').flatMap(parseDeclaration);
          structs.push({ name: openStruct.name, members, line: openStruct.line });
          openStruct = null;
        }
        chunkStart = i + 1;
      }
    } else if (ch === ';' && depth === 0 && parenDepth === 0) {
      const stmt = code.slice(chunkStart, i);
      const line = lineAt(firstNonSpace(chunkStart, i));
      const proto = parseFunctionHeader(stmt);
      if (proto) {
        functions.push({ ...proto, line, doc: docAbove(originalLines, line) });
      } else {
        for (const field of parseDeclaration(stmt)) variables.push({ ...field, line });
      }
      chunkStart = i + 1;
    }
  }

  return { functions: dedupePrototypes(functions), macros, structs, variables, includes, code };
}

// 前方宣言と本体の両方がある関数を 1 つにまとめる。doc は本体側を優先する
function dedupePrototypes(functions: GlslFunction[]): GlslFunction[] {
  const seen = new Map<string, GlslFunction>();
  for (const fn of functions) {
    const key = `${fn.name}(${fn.params.map(paramType).join(',')})`;
    const prev = seen.get(key);
    if (!prev || (!prev.doc && fn.doc)) seen.set(key, fn);
  }
  return [...seen.values()];
}

/** 'inout vec3 p' → 'vec3' */
export function paramType(param: string): string {
  const words = param.replace(DECL_QUALIFIERS_RE, '').trim().split(/\s+/);
  return words.length > 1 ? words[words.length - 2] : words[0];
}

export function formatSignature(fn: Pick<GlslFunction, 'name' | 'returnType' | 'params'>): string {
  return `${fn.returnType} ${fn.name}(${fn.params.join(', ')})`;
}

export function formatMacro(macro: GlslMacro): string {
  const params = macro.params ? `(${macro.params.join(', ')})` : '';
  return `#define ${macro.name}${params} ${macro.value}`.trimEnd();
}

/**
 * 関数本体の中を含めた変数宣言 (引数も含む) を拾う。スコープは見ない。
 * 型名が既知 (組み込み型か struct) のものだけにして、式の誤検出を抑える
 */
export function collectLocalDeclarations(code: string, structNames: Iterable<string>): Map<string, string> {
  const types = new Set([...BUILTIN_TYPES, ...structNames]);
  const result = new Map<string, string>();
  const re = /\b([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(?=[=;,)\[])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (types.has(m[1]) && !result.has(m[2])) result.set(m[2], m[1]);
  }
  return result;
}

export function collectIdentifiers(code: string): Set<string> {
  return new Set(code.match(/[A-Za-z_]\w+/g) ?? []);
}
