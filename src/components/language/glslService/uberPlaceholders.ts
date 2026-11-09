// uber_scripts/<ctx>/ 以下のファイルで使える $cp などのプレースホルダ。
// ErnstRenderer がシェーダ生成時に置き換えるので、ファイル単体では宣言が無い

import type * as Monaco from 'monaco-editor';
import registry from '../../../config/schemas/uber_placeholders.json';
import { dirname, isUnder, joinPath } from './paths';
import { filePathOfModel, findTrackRoot } from './workspaceIndex';

type MonacoApi = typeof Monaco;

export type UberContext = keyof typeof registry;

const UBER_CONTEXTS = Object.keys(registry) as UberContext[];

export async function uberContextOf(docPath: string | null): Promise<UberContext | null> {
  if (!docPath) return null;
  const trackRoot = await findTrackRoot(dirname(docPath));
  if (!trackRoot) return null;
  return UBER_CONTEXTS.find(ctx => isUnder(docPath, joinPath(trackRoot, `uber_scripts/${ctx}`))) ?? null;
}

export async function providePlaceholderCompletions(
  monaco: MonacoApi,
  model: Monaco.editor.ITextModel,
  position: Monaco.Position
): Promise<Monaco.languages.CompletionList> {
  const lineToCursor = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
  const typed = /\$\w*$/.exec(lineToCursor)?.[0];
  if (!typed) return { suggestions: [] };
  const ctx = await uberContextOf(filePathOfModel(model));
  if (!ctx) return { suggestions: [] };

  // $ ごと置き換えるので、range は $ の位置から
  const range = new monaco.Range(position.lineNumber, position.column - typed.length, position.lineNumber, position.column);
  const suggestions = registry[ctx].map((it, idx) => ({
    label: it.name,
    kind: monaco.languages.CompletionItemKind.Variable,
    detail: it.type,
    documentation: { value: it.desc },
    insertText: it.name,
    sortText: String(idx).padStart(3, '0'),
    range
  }));
  return { suggestions };
}
