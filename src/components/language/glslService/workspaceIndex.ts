// 補完で見えるべき記号を集める。
// - 現在のファイルから #include をたどったファイル群 (ErnstRenderer と同じく正規化パスで重複排除)
// - track/bl_modules/bl_inc_common.glslinc (uber_scripts や lib_modules は common の後ろに展開されるので暗黙に見える)
// - track/lib_modules/ 以下の全モジュール (未 include でも候補に出し、確定時に include を足す)

import type * as Monaco from 'monaco-editor';
import { electronClient } from '../../../services/electronClient';
import { DirEntry, FileTab } from '../../../types';
import { basename, collapsePath, dirname, isUnder, joinPath, pathKey } from './paths';
import { parseGlsl, ParsedGlsl } from './symbols';

const GLSL_FILE_RE = /\.(glsl|glslinc|vert|frag|vs|fs|geom|comp|tesc|tese|vertex|fragment|shader)$/i;
// ディスク上のファイルは保存で変わる。開いているタブはモデルから直接読むので短めでよい
const DISK_TTL_MS = 2000;
const LIB_TTL_MS = 30000;
// ErnstRenderer の parse_for_includes_loop と同じ上限
const MAX_INCLUDE_DEPTH = 32;
const MAX_ROOT_SEARCH_DEPTH = 8;

export interface SourceFile {
  path: string;
  parsed: ParsedGlsl;
}

export interface LibModule extends SourceFile {
  /** lib_modules からの相対パス。'boolean/uni_smooth.glsl' */
  relPath: string;
}

export interface GlslContext {
  docPath: string | null;
  trackRoot: string | null;
  /** 現在のファイル以外で見えるファイル。include の展開順 */
  files: SourceFile[];
  reachableKeys: Set<string>;
}

export function openTabs(): FileTab[] {
  const tabs = window.__ERNST_BUFFER_TABS__;
  return Array.isArray(tabs) ? tabs : [];
}

export function filePathOfModel(model: Monaco.editor.ITextModel): string | null {
  return openTabs().find(t => t.model === model)?.filePath ?? null;
}

const diskCache = new Map<string, { text: Promise<string | null>; at: number }>();

function readText(path: string): Promise<string | null> {
  const key = pathKey(path);
  const tab = openTabs().find(t => t.filePath && pathKey(t.filePath) === key);
  if (tab) {
    const model = tab.model as Monaco.editor.ITextModel | undefined;
    return Promise.resolve(model ? model.getValue() : tab.content);
  }
  const hit = diskCache.get(key);
  if (hit && Date.now() - hit.at < DISK_TTL_MS) return hit.text;
  const text = electronClient.readFile(path);
  diskCache.set(key, { text, at: Date.now() });
  return text;
}

const parseCache = new Map<string, { text: string; parsed: ParsedGlsl }>();

export function parseCached(key: string, text: string): ParsedGlsl {
  const hit = parseCache.get(key);
  if (hit && hit.text === text) return hit.parsed;
  const parsed = parseGlsl(text);
  parseCache.set(key, { text, parsed });
  return parsed;
}

async function loadSource(path: string): Promise<SourceFile | null> {
  const text = await readText(path);
  if (text === null) return null;
  return { path: collapsePath(path), parsed: parseCached(pathKey(path), text) };
}

function listDir(dir: string): Promise<DirEntry[]> {
  return electronClient.listDir(dir);
}

const trackRootCache = new Map<string, Promise<string | null>>();

/** lib_modules と bl_modules を両方持つ祖先ディレクトリを track ルートとみなす */
export function findTrackRoot(startDir: string): Promise<string | null> {
  const key = pathKey(startDir);
  const cached = trackRootCache.get(key);
  if (cached) return cached;
  const found = (async () => {
    let dir = collapsePath(startDir);
    for (let i = 0; i < MAX_ROOT_SEARCH_DEPTH; i++) {
      const dirs = new Set((await listDir(dir)).filter(e => e.type === 'directory').map(e => e.name));
      if (dirs.has('lib_modules') && dirs.has('bl_modules')) return dir;
      const parent = collapsePath(dirname(dir));
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  })();
  trackRootCache.set(key, found);
  return found;
}

async function walkLibDir(dir: string, rel: string, depth: number): Promise<LibModule[]> {
  if (depth > 3) return [];
  const entries = await listDir(dir);
  const nested = await Promise.all(entries.map(async (e): Promise<LibModule[]> => {
    const relPath = rel ? `${rel}/${e.name}` : e.name;
    if (e.type === 'directory') return walkLibDir(e.path, relPath, depth + 1);
    if (!GLSL_FILE_RE.test(e.name)) return [];
    const src = await loadSource(e.path);
    return src ? [{ ...src, relPath }] : [];
  }));
  return nested.flat();
}

interface LibIndexState {
  modules: LibModule[] | null;
  at: number;
  pending: Promise<LibModule[]> | null;
}

const libIndex = new Map<string, LibIndexState>();

function rebuildLibIndex(trackRoot: string, state: LibIndexState): Promise<LibModule[]> {
  const pending = walkLibDir(joinPath(trackRoot, 'lib_modules'), '', 0).then(
    modules => {
      state.modules = modules;
      state.at = Date.now();
      state.pending = null;
      return modules;
    },
    (error: unknown) => {
      state.pending = null;
      throw error;
    }
  );
  state.pending = pending;
  return pending;
}

export async function getLibModules(trackRoot: string): Promise<LibModule[]> {
  const key = pathKey(trackRoot);
  let state = libIndex.get(key);
  if (!state) {
    state = { modules: null, at: 0, pending: null };
    libIndex.set(key, state);
  }
  if (state.modules) {
    // 古くなっていたら裏で作り直し、今回は手元の索引で答える
    if (!state.pending && Date.now() - state.at > LIB_TTL_MS) {
      rebuildLibIndex(trackRoot, state).catch((error: unknown) => {
        console.error('[glsl] lib_modules の再索引に失敗しました', error);
      });
    }
    return state.modules;
  }
  return state.pending ?? rebuildLibIndex(trackRoot, state);
}

async function resolveTrackRoot(docPath: string | null): Promise<string | null> {
  if (docPath) return findTrackRoot(dirname(docPath));
  const projectRoot = window.__ERNST_PROJECT_ROOT__;
  return projectRoot ? findTrackRoot(projectRoot) : null;
}

export async function buildContext(docPath: string | null, docParsed: ParsedGlsl): Promise<GlslContext> {
  const reachableKeys = new Set<string>();
  const files: SourceFile[] = [];
  if (docPath) reachableKeys.add(pathKey(docPath));

  const visit = async (target: string, depth: number): Promise<void> => {
    const key = pathKey(target);
    if (reachableKeys.has(key) || depth > MAX_INCLUDE_DEPTH) return;
    reachableKeys.add(key);
    const src = await loadSource(target);
    if (!src) return;
    files.push(src);
    for (const inc of src.parsed.includes) await visit(joinPath(dirname(target), inc.path), depth + 1);
  };

  if (docPath) {
    for (const inc of docParsed.includes) await visit(joinPath(dirname(docPath), inc.path), 1);
  }
  const trackRoot = await resolveTrackRoot(docPath);
  if (trackRoot) await visit(joinPath(trackRoot, 'bl_modules/bl_inc_common.glslinc'), 1);

  return { docPath, trackRoot, files, reachableKeys };
}

/** 自動 include してはいけないファイルなら理由を返す */
export function autoIncludeBlockedReason(docPath: string | null, trackRoot: string | null): string | null {
  if (!docPath) return '未保存のファイルには include を自動で足しません';
  if (!trackRoot) return null;
  // uber_scripts の本体 (prim_*.frag など) は関数の中に埋め込まれるので、#include を書くとコンパイルが通らない。
  // inc_*.glsl は #include で読み込まれ、自分の位置を基準に解決されるので自動で足してよい。
  // ErnstRenderer 側に区別の仕組みは無く、inc_ という命名の慣習で見分けている
  if (isUnder(docPath, joinPath(trackRoot, 'uber_scripts')) && !basename(docPath).startsWith('inc_')) {
    return 'uber スクリプトの本体は関数の中に埋め込まれるため、include は自動で足しません (inc_ で始まるファイルでは足します)';
  }
  if (isUnder(docPath, joinPath(trackRoot, 'bl_modules'))) {
    return 'bl_modules は Blender が生成し直すため、include は自動で足しません';
  }
  return null;
}
