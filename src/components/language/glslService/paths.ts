// renderer プロセスには Node の path が無いので、include 解決に要る最小限を自前で持つ

const DRIVE_RE = /^[A-Za-z]:$/;

export function normalizeSlashes(p: string): string {
  return p.replace(/\\/g, '/');
}

/** 'C:/foo/bar' → 'C:\foo\bar'。タブの filePath は Electron のダイアログ由来で \ 区切りなので揃える */
export function toNativePath(p: string): string {
  return /^[A-Za-z]:\//.test(p) ? p.replace(/\//g, '\\') : p;
}

function isAbsolute(p: string): boolean {
  return p.startsWith('/') || /^[A-Za-z]:\//.test(p);
}

/** `.` と `..` を畳んだ / 区切りのパスにする */
export function collapsePath(p: string): string {
  const n = normalizeSlashes(p);
  const out: string[] = [];
  for (const part of n.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      const last = out[out.length - 1];
      if (last !== undefined && !DRIVE_RE.test(last)) out.pop();
      continue;
    }
    out.push(part);
  }
  return (n.startsWith('/') ? '/' : '') + out.join('/');
}

export function joinPath(base: string, rel: string): string {
  const r = normalizeSlashes(rel);
  return isAbsolute(r) ? collapsePath(r) : collapsePath(`${base}/${r}`);
}

export function dirname(p: string): string {
  const n = collapsePath(p);
  const idx = n.lastIndexOf('/');
  if (idx < 0) return n;
  const parent = n.slice(0, idx);
  // 'C:/foo' の親は 'C:' ではなく 'C:/' 相当として扱う
  return DRIVE_RE.test(parent) || parent === '' ? n.slice(0, idx + 1) : parent;
}

export function basename(p: string): string {
  const n = collapsePath(p);
  return n.slice(n.lastIndexOf('/') + 1);
}

/** 同一ファイル判定用のキー。Windows 前提で大文字小文字を区別しない */
export function pathKey(p: string): string {
  return collapsePath(p).toLowerCase();
}

export function isUnder(p: string, dir: string): boolean {
  const k = pathKey(p);
  const d = pathKey(dir);
  return k.startsWith(d.endsWith('/') ? d : `${d}/`);
}

export function relativePath(fromDir: string, to: string): string {
  const from = collapsePath(fromDir).split('/').filter(Boolean);
  const target = collapsePath(to).split('/').filter(Boolean);
  let common = 0;
  while (
    common < from.length &&
    common < target.length &&
    from[common].toLowerCase() === target[common].toLowerCase()
  ) {
    common++;
  }
  const ups = from.slice(common).map(() => '..');
  return [...ups, ...target.slice(common)].join('/');
}
