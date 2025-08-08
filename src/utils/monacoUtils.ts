import type * as monaco from 'monaco-editor';

export function applyModelEdits(
  model: monaco.editor.ITextModel,
  edits: Array<{ range: monaco.IRange; text: string }>
): void {
  model.pushEditOperations([], edits, () => null);
}


