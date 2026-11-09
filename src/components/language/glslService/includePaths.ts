// #include "..." の中で、ファイルとディレクトリの名前を補完する

import type * as Monaco from 'monaco-editor';
import { electronClient } from '../../../services/electronClient';
import { dirname, joinPath } from './paths';
import { filePathOfModel, GLSL_FILE_RE } from './workspaceIndex';

type MonacoApi = typeof Monaco;

export async function provideIncludePathCompletions(
  monaco: MonacoApi,
  model: Monaco.editor.ITextModel,
  position: Monaco.Position
): Promise<Monaco.languages.CompletionList> {
  const lineToCursor = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
  // 閉じクォートより後ろにカーソルがあれば [^"]* が一致しないので外れる
  const prefix = /^\s*#\s*include\s*"([^"]*)$/.exec(lineToCursor)?.[1];
  if (prefix === undefined) return { suggestions: [] };

  const docPath = filePathOfModel(model);
  const baseDir = docPath ? dirname(docPath) : window.__ERNST_PROJECT_ROOT__;
  if (!baseDir) return { suggestions: [] };

  const slash = prefix.lastIndexOf('/');
  const dirPart = prefix.slice(0, slash + 1);
  const segment = prefix.slice(slash + 1);
  const entries = await electronClient.listDir(dirPart ? joinPath(baseDir, dirPart) : baseDir);

  // 打ちかけの最後のセグメントだけを置き換える。ディレクトリにも末尾の / は付けない
  const range = new monaco.Range(position.lineNumber, position.column - segment.length, position.lineNumber, position.column);
  const Kind = monaco.languages.CompletionItemKind;
  const suggestions = entries
    .filter(e => e.type === 'directory' || GLSL_FILE_RE.test(e.name))
    .map(e => ({
      label: e.name,
      kind: e.type === 'directory' ? Kind.Folder : Kind.File,
      insertText: e.name,
      range
    }));
  return { suggestions };
}
