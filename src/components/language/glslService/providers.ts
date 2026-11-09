import type * as Monaco from 'monaco-editor';
import { BUILTIN_FUNCTIONS, BUILTIN_TYPES, KEYWORDS, vectorInfo } from './builtins';
import { BUILTIN_SIGNATURES, BuiltinFunction, DEPRECATED_BUILTINS } from './builtinSignatures';
import { ExpectedTypeEnv, findOpenCall, inferExpectedTypes } from './expectedType';
import { basename, dirname, isUnder, pathKey, relativePath } from './paths';
import {
  collectIdentifiers,
  collectLocalDeclarations,
  formatMacro,
  formatSignature,
  GlslFunction,
  GlslMacro,
  GlslStruct,
  ParsedGlsl,
  stripComments
} from './symbols';
import {
  autoIncludeBlockedReason,
  buildContext,
  filePathOfModel,
  getLibModules,
  GlslContext,
  LibModule,
  parseCached
} from './workspaceIndex';
import { bestFit } from './typeSystem';

type MonacoApi = typeof Monaco;
type Model = Monaco.editor.ITextModel;

// 同点のときの並び順。Monaco は一致度が同じ候補をこの順に並べる。
// 組み込み関数は smoothstep のように使用頻度が高いので、include 先の同じ接頭辞の関数より前に出す
const SORT_LOCAL = '0';
const SORT_BUILTIN = '1';
const SORT_REACHABLE = '2';
const SORT_LIB = '3';
const SORT_WORD = '4';

const BUILTIN_TYPE_SET = new Set(BUILTIN_TYPES);
const BUILTIN_WHERE = 'GLSL 組み込み関数';

/**
 * 期待される型が分かるとき、sortText の先頭に付ける当てはまり具合。
 * 0: 一致 / 1: 総称型や暗黙変換で入る / 2: 型が分からない / 3: 入らない / 4: 値にならない (void や制御構文)
 * 型による並びを、出どころ (SORT_*) による並びより優先する
 */
type Ranker = (valueTypes: string[] | null) => string;

function makeRanker(expected: string[] | null): Ranker {
  if (!expected) return () => '';
  return valueTypes => {
    if (valueTypes === null) return '2';
    const values = valueTypes.filter(t => t !== 'void');
    if (values.length === 0) return '4';
    const fit = bestFit(values, expected);
    return fit === 0 ? '0' : fit === 1 ? '1' : '3';
  };
}

function builtinAsFunctions(b: BuiltinFunction): GlslFunction[] {
  return b.overloads.map(o => ({ name: b.name, returnType: o.returnType, params: o.params, line: 0, doc: b.doc }));
}

interface Located<T> {
  symbol: T;
  /** 現在のファイルなら null */
  path: string | null;
}

interface SymbolTable {
  functions: Map<string, Located<GlslFunction>[]>;
  macros: Map<string, Located<GlslMacro>>;
  structs: Map<string, Located<GlslStruct>>;
  variables: Map<string, { type: string; path: string | null }>;
}

const modelParseCache = new WeakMap<Model, { version: number; parsed: ParsedGlsl }>();

function parseModel(model: Model): ParsedGlsl {
  const version = model.getVersionId();
  const hit = modelParseCache.get(model);
  if (hit && hit.version === version) return hit.parsed;
  const parsed = parseCached(`model:${model.uri.toString()}`, model.getValue());
  modelParseCache.set(model, { version, parsed });
  return parsed;
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function buildSymbolTable(doc: ParsedGlsl, ctx: GlslContext): SymbolTable {
  const table: SymbolTable = { functions: new Map(), macros: new Map(), structs: new Map(), variables: new Map() };
  const sources: Array<{ parsed: ParsedGlsl; path: string | null }> = [
    { parsed: doc, path: null },
    ...ctx.files.map(f => ({ parsed: f.parsed, path: f.path }))
  ];
  for (const { parsed, path } of sources) {
    for (const fn of parsed.functions) pushTo(table.functions, fn.name, { symbol: fn, path });
    for (const m of parsed.macros) if (!table.macros.has(m.name)) table.macros.set(m.name, { symbol: m, path });
    for (const s of parsed.structs) if (!table.structs.has(s.name)) table.structs.set(s.name, { symbol: s, path });
    for (const v of parsed.variables) if (!table.variables.has(v.name)) table.variables.set(v.name, { type: v.type, path });
  }
  return table;
}

function displayPath(path: string | null, ctx: GlslContext): string {
  if (!path) return 'このファイル';
  if (ctx.trackRoot && isUnder(path, ctx.trackRoot)) return relativePath(ctx.trackRoot, path);
  return basename(path);
}

function functionDoc(overloads: GlslFunction[], where: string, note?: string): Monaco.IMarkdownString {
  const docs = [...new Set(overloads.map(f => f.doc).filter(Boolean))];
  const parts = [
    '```glsl\n' + overloads.map(formatSignature).join('\n') + '\n```',
    ...docs,
    `*${where}*`
  ];
  if (note) parts.push(note);
  return { value: parts.join('\n\n') };
}

/** 既存の #include の直後 (無ければ #version などの後、それも無ければ先頭) に足す */
function includeEdit(monaco: MonacoApi, model: Model, doc: ParsedGlsl, docPath: string, target: string): Monaco.languages.TextEdit {
  const rel = relativePath(dirname(docPath), target);
  const quoted = doc.includes.length === 0 || doc.includes[0].quoted;
  const text = `#include ${quoted ? `"${rel}"` : rel}`;
  let afterLine = doc.includes.length > 0 ? Math.max(...doc.includes.map(i => i.line)) : 0;
  if (afterLine === 0) {
    for (let line = 1; line <= model.getLineCount(); line++) {
      if (/^\s*#\s*(version|extension)\b/.test(model.getLineContent(line))) afterLine = line;
    }
  }
  if (afterLine >= model.getLineCount()) {
    const last = model.getLineCount();
    const col = model.getLineMaxColumn(last);
    return { range: new monaco.Range(last, col, last, col), text: `\n${text}` };
  }
  return { range: new monaco.Range(afterLine + 1, 1, afterLine + 1, 1), text: `${text}\n` };
}

function memberCompletions(
  monaco: MonacoApi,
  receiver: string,
  table: SymbolTable,
  locals: Map<string, string>,
  range: Monaco.IRange
): Monaco.languages.CompletionItem[] | null {
  const type = locals.get(receiver) ?? table.variables.get(receiver)?.type;
  if (!type) return null;
  const Kind = monaco.languages.CompletionItemKind;
  const struct = table.structs.get(type);
  if (struct) {
    return struct.symbol.members.map((m, i) => ({
      label: m.name,
      kind: Kind.Field,
      detail: m.type,
      insertText: m.name,
      sortText: String(i).padStart(3, '0'),
      range
    }));
  }
  const vec = vectorInfo(type);
  if (vec) {
    return ['xyzw', 'rgba'].flatMap(set => set.slice(0, vec.size).split('').map((c, i) => ({
      label: c,
      kind: Kind.Field,
      detail: vec.scalar,
      insertText: c,
      sortText: `${set === 'xyzw' ? 0 : 1}${i}`,
      range
    })));
  }
  return null;
}

async function provideCompletions(
  monaco: MonacoApi,
  model: Model,
  position: Monaco.Position
): Promise<Monaco.languages.CompletionList> {
  const lineToCursor = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
  // #include のパスと $ プレースホルダは専用のプロバイダーに任せる
  if (/^\s*#\s*include\b/.test(lineToCursor) || /\$\w*$/.test(lineToCursor)) return { suggestions: [] };

  const doc = parseModel(model);
  const docPath = filePathOfModel(model);
  const ctx = await buildContext(docPath, doc);
  const table = buildSymbolTable(doc, ctx);
  const locals = collectLocalDeclarations(doc.code, table.structs.keys());

  const word = model.getWordUntilPosition(position);
  const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);

  const member = /([A-Za-z_]\w*)\s*\.\s*\w*$/.exec(lineToCursor);
  if (member) {
    // 型が分からない (ubo など) ときは空を返し、Monaco の単語補完に任せる
    return { suggestions: memberCompletions(monaco, member[1], table, locals, range) ?? [] };
  }

  const libs = ctx.trackRoot ? await getLibModules(ctx.trackRoot) : [];
  const startLine = Math.max(1, position.lineNumber - 30);
  const textBefore = stripComments(model.getValueInRange(new monaco.Range(startLine, 1, position.lineNumber, word.startColumn)));
  const env: ExpectedTypeEnv = {
    variableType: name => locals.get(name) ?? table.variables.get(name)?.type,
    isType: name => BUILTIN_TYPE_SET.has(name) || table.structs.has(name),
    overloads: name => {
      const reachable = table.functions.get(name);
      if (reachable) return reachable.map(r => r.symbol.params);
      const builtin = BUILTIN_SIGNATURES.get(name);
      if (builtin) return builtin.overloads.map(o => o.params);
      return libs.flatMap(lib => lib.parsed.functions.filter(f => f.name === name).map(f => f.params));
    },
    enclosingReturnType: enclosingFunction(doc, position.lineNumber)?.returnType ?? null
  };
  const rank = makeRanker(inferExpectedTypes(textBefore, env));
  // `vec3 n = |` の n 自身は初期化に使えないので出さない
  const declaring = /\b[A-Za-z_]\w*\s+([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*=[^;=]*$/.exec(lineToCursor)?.[1];

  const Kind = monaco.languages.CompletionItemKind;
  const items = new Map<string, Monaco.languages.CompletionItem>();
  const add = (key: string, item: Monaco.languages.CompletionItem): void => {
    if (key !== declaring && !items.has(key)) items.set(key, item);
  };

  for (const [name, type] of locals) {
    add(name, { label: name, kind: Kind.Variable, detail: type, insertText: name, sortText: rank([type]) + SORT_LOCAL, range });
  }
  for (const [name, overloads] of table.functions) {
    const fns = overloads.map(o => o.symbol);
    const more = fns.length > 1 ? ` (+${fns.length - 1})` : '';
    add(name, {
      label: { label: name, description: displayPath(overloads[0].path, ctx) },
      kind: Kind.Function,
      detail: formatSignature(fns[0]) + more,
      documentation: functionDoc(fns, displayPath(overloads[0].path, ctx)),
      insertText: name,
      sortText: rank(fns.map(f => f.returnType)) + SORT_REACHABLE,
      range
    });
  }
  for (const [name, { symbol, path }] of table.macros) {
    add(name, {
      label: { label: name, description: displayPath(path, ctx) },
      kind: symbol.params ? Kind.Function : Kind.Constant,
      detail: formatMacro(symbol),
      documentation: symbol.doc || undefined,
      insertText: name,
      sortText: rank(null) + SORT_REACHABLE,
      range
    });
  }
  for (const [name, { symbol, path }] of table.structs) {
    add(name, {
      label: { label: name, description: displayPath(path, ctx) },
      kind: Kind.Struct,
      detail: `struct ${name}`,
      documentation: { value: '```glsl\n' + symbol.members.map(m => `${m.type} ${m.name};`).join('\n') + '\n```' },
      insertText: name,
      sortText: rank([name]) + SORT_REACHABLE,
      range
    });
  }
  for (const [name, { type, path }] of table.variables) {
    add(name, {
      label: { label: name, description: displayPath(path, ctx) },
      kind: Kind.Variable,
      detail: type,
      insertText: name,
      sortText: rank([type]) + SORT_REACHABLE,
      range
    });
  }
  for (const name of BUILTIN_FUNCTIONS) {
    const builtin = BUILTIN_SIGNATURES.get(name);
    if (!builtin) {
      add(name, { label: name, kind: Kind.Function, detail: BUILTIN_WHERE, insertText: name, sortText: rank(null) + SORT_BUILTIN, range });
      continue;
    }
    const fns = builtinAsFunctions(builtin);
    const deprecated = DEPRECATED_BUILTINS.has(name);
    add(name, {
      label: { label: name, description: BUILTIN_WHERE },
      kind: Kind.Function,
      detail: formatSignature(fns[0]) + (fns.length > 1 ? ` (+${fns.length - 1})` : ''),
      documentation: functionDoc(fns, BUILTIN_WHERE),
      insertText: name,
      sortText: deprecated ? `9${SORT_BUILTIN}` : rank(fns.map(f => f.returnType)) + SORT_BUILTIN,
      tags: deprecated ? [monaco.languages.CompletionItemTag.Deprecated] : undefined,
      range
    });
  }
  for (const name of BUILTIN_TYPES) {
    add(name, { label: name, kind: Kind.Keyword, insertText: name, sortText: rank([name]) + SORT_BUILTIN, range });
  }
  for (const name of KEYWORDS) {
    const valueTypes = name === 'true' || name === 'false' ? ['bool'] : ['void'];
    add(name, { label: name, kind: Kind.Keyword, insertText: name, sortText: rank(valueTypes) + SORT_BUILTIN, range });
  }

  if (ctx.trackRoot) {
    const blocked = autoIncludeBlockedReason(docPath, ctx.trackRoot);
    for (const lib of libs) {
      if (ctx.reachableKeys.has(pathKey(lib.path))) continue;
      for (const item of libCompletions(monaco, model, doc, docPath, lib, blocked, range, rank)) {
        if (!items.has(item.insertText)) add(`lib:${lib.relPath}:${item.insertText}`, item);
      }
    }
  }

  for (const name of collectIdentifiers(doc.code)) {
    if (name === word.word) continue;
    add(name, { label: name, kind: Kind.Text, insertText: name, sortText: rank(null) + SORT_WORD, range });
  }

  return { suggestions: [...items.values()] };
}

/** トップレベルの関数しか拾っていないので、カーソルより前で最後に始まった関数がカーソルを含む関数 */
function enclosingFunction(doc: ParsedGlsl, line: number): GlslFunction | null {
  let found: GlslFunction | null = null;
  for (const fn of doc.functions) {
    if (fn.line <= line && (!found || fn.line > found.line)) found = fn;
  }
  return found;
}

function libCompletions(
  monaco: MonacoApi,
  model: Model,
  doc: ParsedGlsl,
  docPath: string | null,
  lib: LibModule,
  blocked: string | null,
  range: Monaco.IRange,
  rank: Ranker
): Monaco.languages.CompletionItem[] {
  const Kind = monaco.languages.CompletionItemKind;
  const where = `lib_modules/${lib.relPath}`;
  const edits = !blocked && docPath ? [includeEdit(monaco, model, doc, docPath, lib.path)] : undefined;
  const note = edits ? '確定すると include を追加します' : `未 include: ${blocked ?? ''}`;
  const byName = new Map<string, GlslFunction[]>();
  for (const fn of lib.parsed.functions) pushTo(byName, fn.name, fn);
  const functions = [...byName].map(([name, fns]) => ({
    label: { label: name, description: where },
    kind: Kind.Function,
    detail: formatSignature(fns[0]) + (fns.length > 1 ? ` (+${fns.length - 1})` : ''),
    documentation: functionDoc(fns, where, note),
    insertText: name,
    additionalTextEdits: edits,
    sortText: rank(fns.map(f => f.returnType)) + SORT_LIB,
    range
  }));
  // packS2 や fbm_base のようにマクロだけで書かれた lib もある
  const macros = lib.parsed.macros.map(m => ({
    label: { label: m.name, description: where },
    kind: m.params ? Kind.Function : Kind.Constant,
    detail: formatMacro(m),
    documentation: { value: [m.doc, `*${where}*`, note].filter(Boolean).join('\n\n') },
    insertText: m.name,
    additionalTextEdits: edits,
    sortText: rank(null) + SORT_LIB,
    range
  }));
  return [...functions, ...macros];
}

interface FunctionLookup {
  /** sdBox のように別ファイルに同名の関数があるので、オーバーロードごとに出どころを持つ */
  overloads: Array<{ fn: GlslFunction; where: string }>;
  note?: string;
}

async function lookupFunction(model: Model, name: string): Promise<{ fn: FunctionLookup | null; macro: Located<GlslMacro> | null; table: SymbolTable; ctx: GlslContext; doc: ParsedGlsl }> {
  const doc = parseModel(model);
  const docPath = filePathOfModel(model);
  const ctx = await buildContext(docPath, doc);
  const table = buildSymbolTable(doc, ctx);
  const reachable = table.functions.get(name);
  if (reachable) {
    const overloads = reachable.map(r => ({ fn: r.symbol, where: displayPath(r.path, ctx) }));
    return { fn: { overloads }, macro: null, table, ctx, doc };
  }
  const macro = table.macros.get(name) ?? null;
  // lib に組み込みと同名の関数があっても、include していなければ組み込みの方を指しているはず
  const builtin = macro ? undefined : BUILTIN_SIGNATURES.get(name);
  if (builtin) {
    const overloads = builtinAsFunctions(builtin).map(fn => ({ fn, where: BUILTIN_WHERE }));
    return { fn: { overloads }, macro: null, table, ctx, doc };
  }
  if (!macro && ctx.trackRoot) {
    const libs = await getLibModules(ctx.trackRoot);
    const overloads = libs.flatMap(lib => lib.parsed.functions
      .filter(f => f.name === name)
      .map(fn => ({ fn, where: `lib_modules/${lib.relPath}` })));
    if (overloads.length > 0) return { fn: { overloads, note: '未 include' }, macro: null, table, ctx, doc };
    for (const lib of libs) {
      const libMacro = lib.parsed.macros.find(m => m.name === name);
      if (libMacro) return { fn: null, macro: { symbol: libMacro, path: lib.path }, table, ctx, doc };
    }
  }
  return { fn: null, macro, table, ctx, doc };
}

async function provideHover(monaco: MonacoApi, model: Model, position: Monaco.Position): Promise<Monaco.languages.Hover | null> {
  const word = model.getWordAtPosition(position);
  if (!word) return null;
  const before = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
  if (/\.\s*$/.test(before)) return null;
  const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);

  const { fn, macro, table, ctx, doc } = await lookupFunction(model, word.word);
  if (fn) {
    const wheres = [...new Set(fn.overloads.map(o => o.where))].join(' / ');
    return { range, contents: [functionDoc(fn.overloads.map(o => o.fn), wheres, fn.note)] };
  }
  if (macro) {
    const parts = ['```glsl\n' + formatMacro(macro.symbol) + '\n```', macro.symbol.doc, `*${displayPath(macro.path, ctx)}*`];
    return { range, contents: [{ value: parts.filter(Boolean).join('\n\n') }] };
  }
  const struct = table.structs.get(word.word);
  if (struct) {
    const body = struct.symbol.members.map(m => `  ${m.type} ${m.name};`).join('\n');
    return { range, contents: [{ value: '```glsl\nstruct ' + word.word + ' {\n' + body + '\n}\n```\n\n*' + displayPath(struct.path, ctx) + '*' }] };
  }
  const locals = collectLocalDeclarations(doc.code, table.structs.keys());
  const type = locals.get(word.word) ?? table.variables.get(word.word)?.type;
  if (type) return { range, contents: [{ value: '```glsl\n' + `${type} ${word.word}` + '\n```' }] };
  return null;
}

function toSignature(fn: GlslFunction, documentation: Monaco.IMarkdownString): Monaco.languages.SignatureInformation {
  const head = `${fn.returnType} ${fn.name}(`;
  let label = head;
  const parameters: Monaco.languages.ParameterInformation[] = [];
  fn.params.forEach((p, i) => {
    if (i > 0) label += ', ';
    parameters.push({ label: [label.length, label.length + p.length] });
    label += p;
  });
  return { label: `${label})`, parameters, documentation };
}

async function provideSignatureHelp(monaco: MonacoApi, model: Model, position: Monaco.Position): Promise<Monaco.languages.SignatureHelpResult | null> {
  const startLine = Math.max(1, position.lineNumber - 30);
  const text = stripComments(model.getValueInRange(new monaco.Range(startLine, 1, position.lineNumber, position.column)));
  const call = findOpenCall(text);
  if (!call) return null;
  const { fn, macro } = await lookupFunction(model, call.name);
  let signatures: Monaco.languages.SignatureInformation[];
  if (fn) {
    const note = fn.note;
    signatures = fn.overloads.map(o => toSignature(o.fn, {
      value: [o.fn.doc, [`*${o.where}*`, note].filter(Boolean).join('  ')].filter(Boolean).join('\n\n')
    }));
  } else if (macro?.symbol.params) {
    const m = macro.symbol;
    signatures = [toSignature({ name: m.name, returnType: '#define', params: m.params ?? [], line: m.line, doc: m.doc }, { value: m.value })];
  } else {
    return null;
  }
  const fitting = signatures.findIndex(s => s.parameters.length > call.argIndex);
  return {
    value: { signatures, activeSignature: Math.max(0, fitting), activeParameter: call.argIndex },
    dispose: () => undefined
  };
}

let registered = false;

export function registerGlslLanguageFeatures(monaco: MonacoApi): void {
  // beforeMount は Editor の再マウントで再び呼ばれる。二重登録すると候補が重複する
  if (registered) return;
  registered = true;

  monaco.languages.registerCompletionItemProvider('glsl', {
    triggerCharacters: ['.'],
    provideCompletionItems: (model, position) => provideCompletions(monaco, model, position)
  });
  monaco.languages.registerHoverProvider('glsl', {
    provideHover: (model, position) => provideHover(monaco, model, position)
  });
  monaco.languages.registerSignatureHelpProvider('glsl', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [')'],
    provideSignatureHelp: (model, position) => provideSignatureHelp(monaco, model, position)
  });
}
