import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

// 構文の色分けのみ（ワーカー不要）。言語サービスは webpack の alias で除外している
import 'monaco-editor/esm/vs/basic-languages/monaco.contribution';

self.MonacoEnvironment = {
  getWorker(): Worker {
    return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url));
  }
};

// @monaco-editor/react は既定で CDN から別の Monaco を読み込む。
// コード側で import する monaco-editor と同一インスタンスにしないと EditorOption の番号などがずれる
loader.config({ monaco });
