// ファイル拡張子から言語を判定する関数
export function getLanguageFromFileName(fileName?: string): string {
  if (!fileName) return 'glsl';

  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return 'glsl';

  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'glsl': 'glsl',
    'glslinc': 'glsl',
    'vert': 'glsl',
    'frag': 'glsl',
    'vs': 'glsl',
    'fs': 'glsl',
    'vertex': 'glsl',
    'fragment': 'glsl',
    'shader': 'glsl',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'xml': 'xml',
    'md': 'markdown',
    'txt': 'plaintext',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'py': 'python',
    'java': 'java',
    'cs': 'csharp',
    'php': 'php',
    'go': 'go',
    'rust': 'rust',
    'rs': 'rust'
  };

  return languageMap[ext] || 'glsl';
}