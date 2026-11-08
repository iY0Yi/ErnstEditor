// 補完の並べ替えに使う、GLSL の型の当てはまり判定

const vecs = (prefix: string): string[] => [2, 3, 4].map(n => `${prefix}vec${n}`);
const MATS = [2, 3, 4].flatMap(n => [`mat${n}`, ...[2, 3, 4].map(m => `mat${n}x${m}`)]);

// 仕様書の総称型。組み込み関数のシグネチャ (builtinSignatures.ts) はこの名前で書いている
const FAMILIES: Record<string, string[]> = {
  genType: ['float', ...vecs('')],
  genIType: ['int', ...vecs('i')],
  genUType: ['uint', ...vecs('u')],
  genBType: ['bool', ...vecs('b')],
  genDType: ['double', ...vecs('d')],
  vec: vecs(''),
  ivec: vecs('i'),
  uvec: vecs('u'),
  bvec: vecs('b'),
  mat: MATS,
  gvec4: ['vec4', 'ivec4', 'uvec4'],
  gsampler2D: ['sampler2D', 'isampler2D', 'usampler2D'],
  gsampler3D: ['sampler3D', 'isampler3D', 'usampler3D'],
  gsamplerCube: ['samplerCube', 'isamplerCube', 'usamplerCube'],
  gimage2D: ['image2D', 'iimage2D', 'uimage2D']
};

const SCALAR_BY_PREFIX: Record<string, string> = { '': 'float', i: 'int', u: 'uint', b: 'bool', d: 'double' };

// GLSL 4.x の暗黙の型変換 (int → float など)。ベクトルは成分数が同じときだけ
const IMPLICIT: Record<string, string[]> = {
  int: ['uint', 'float', 'double'],
  uint: ['float', 'double'],
  float: ['double']
};

function scalarShape(type: string): { base: string; size: number } | null {
  if (type in IMPLICIT || type === 'bool' || type === 'double') return { base: type, size: 1 };
  const m = /^([iubd]?)vec([234])$/.exec(type);
  return m ? { base: SCALAR_BY_PREFIX[m[1]], size: Number(m[2]) } : null;
}

function concrete(type: string): string[] {
  return FAMILIES[type] ?? [type];
}

/** 0: そのまま一致 / 1: 総称型や暗黙変換で入る / 2: 入らない */
export type Fit = 0 | 1 | 2;

export function typeFit(candidate: string, expected: string): Fit {
  if (candidate === expected && !(candidate in FAMILIES)) return 0;
  const cs = concrete(candidate);
  const es = concrete(expected);
  if (cs.some(c => es.includes(c))) return 1;
  for (const c of cs) {
    const from = scalarShape(c);
    if (!from) continue;
    for (const e of es) {
      const to = scalarShape(e);
      if (to && from.size === to.size && IMPLICIT[from.base]?.includes(to.base)) return 1;
    }
  }
  return 2;
}

/** 候補が返しうる型のうち、期待される型のどれかに最もよく当てはまるもの */
export function bestFit(candidateTypes: string[], expectedTypes: string[]): Fit {
  let best: Fit = 2;
  for (const c of candidateTypes) {
    for (const e of expectedTypes) {
      const fit = typeFit(c, e);
      if (fit < best) best = fit;
      if (best === 0) return 0;
    }
  }
  return best;
}

/** vec3 の .xy → vec2、.x → float */
export function swizzleType(type: string, swizzle: string): string | null {
  const shape = scalarShape(type);
  if (!shape || shape.size === 1 || swizzle.length > 4) return null;
  if (swizzle.length === 1) return shape.base;
  const prefix = Object.entries(SCALAR_BY_PREFIX).find(([, base]) => base === shape.base)?.[0] ?? '';
  return `${prefix}vec${swizzle.length}`;
}
