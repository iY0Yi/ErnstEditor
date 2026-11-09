// uber_scripts/<ctx>/ 以下のファイルで使える $cp などのプレースホルダ。
// ErnstRenderer がシェーダ生成時に置き換えるので、ファイル単体では宣言が無い

import registry from '../../../config/schemas/uber_placeholders.json';
import { dirname, isUnder, joinPath } from './paths';
import { findTrackRoot } from './workspaceIndex';

export type UberContext = keyof typeof registry;

export interface Placeholder {
  name: string;
  type: string;
  desc: string;
  context: UberContext;
}

const UBER_CONTEXTS = Object.keys(registry) as UberContext[];

async function uberContextOf(docPath: string | null): Promise<UberContext | null> {
  if (!docPath) return null;
  const trackRoot = await findTrackRoot(dirname(docPath));
  if (!trackRoot) return null;
  return UBER_CONTEXTS.find(ctx => isUnder(docPath, joinPath(trackRoot, `uber_scripts/${ctx}`))) ?? null;
}

/** 名前 → プレースホルダ。登録表の順に並ぶ。uber_scripts/<ctx>/ の外なら空 */
export async function placeholdersOf(docPath: string | null): Promise<Map<string, Placeholder>> {
  const context = await uberContextOf(docPath);
  if (!context) return new Map();
  return new Map(registry[context].map(it => [it.name, { ...it, context }]));
}
