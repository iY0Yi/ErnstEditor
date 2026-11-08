export const BUILTIN_FUNCTIONS = [
  'abs', 'acos', 'acosh', 'all', 'any', 'asin', 'asinh', 'atan', 'atanh',
  'atomicAdd', 'atomicAnd', 'atomicCompSwap', 'atomicCounter', 'atomicCounterDecrement',
  'atomicCounterIncrement', 'atomicExchange', 'atomicMax', 'atomicMin', 'atomicOr',
  'atomicXor', 'barrier', 'bitCount', 'bitfieldExtract', 'bitfieldInsert',
  'bitfieldReverse', 'ceil', 'clamp', 'cos', 'cosh', 'cross', 'degrees', 'determinant',
  'dFdx', 'dFdy', 'dFdxCoarse', 'dFdyCoarse', 'dFdxFine', 'dFdyFine', 'distance', 'dot',
  'EmitStreamVertex', 'EmitVertex', 'EndPrimitive', 'EndStreamPrimitive', 'equal', 'exp',
  'exp2', 'faceforward', 'findLSB', 'findMSB', 'floatBitsToInt', 'floatBitsToUint',
  'floor', 'fma', 'fract', 'frexp', 'ftransform', 'fwidth', 'fwidthCoarse', 'fwidthFine',
  'greaterThan', 'greaterThanEqual', 'imageAtomicAdd', 'imageAtomicAnd', 'imageAtomicCompSwap',
  'imageAtomicExchange', 'imageAtomicMax', 'imageAtomicMin', 'imageAtomicOr',
  'imageAtomicXor', 'imageLoad', 'imageSize', 'imageStore', 'imulExtended',
  'intBitsToFloat', 'interpolateAtCentroid', 'interpolateAtOffset', 'interpolateAtSample',
  'inverse', 'inversesqrt', 'isinf', 'isnan', 'ldexp', 'length', 'lessThan',
  'lessThanEqual', 'log', 'log2', 'matrixCompMult', 'max', 'memoryBarrier',
  'memoryBarrierAtomicCounter', 'memoryBarrierBuffer', 'memoryBarrierImage',
  'memoryBarrierShared', 'min', 'mix', 'mod', 'modf', 'noise', 'noise1', 'noise2',
  'noise3', 'noise4', 'normalize', 'not', 'notEqual', 'outerProduct', 'packDouble2x32',
  'packHalf2x16', 'packSnorm2x16', 'packSnorm4x8', 'packUnorm2x16', 'packUnorm4x8',
  'pow', 'radians', 'reflect', 'refract', 'round', 'roundEven', 'sign', 'sin', 'sinh',
  'smoothstep', 'sqrt', 'step', 'tan', 'tanh', 'texelFetch', 'texelFetchOffset',
  'texture', 'textureGather', 'textureGatherOffset', 'textureGatherOffsets',
  'textureGrad', 'textureGradOffset', 'textureLod', 'textureLodOffset',
  'textureOffset', 'textureProj', 'textureProjGrad', 'textureProjGradOffset',
  'textureProjLod', 'textureProjLodOffset', 'textureProjOffset', 'textureQueryLevels',
  'textureQueryLod', 'textureSize', 'transpose', 'trunc', 'uaddCarry',
  'uintBitsToFloat', 'umulExtended', 'unpackDouble2x32', 'unpackHalf2x16',
  'unpackSnorm2x16', 'unpackSnorm4x8', 'unpackUnorm2x16', 'unpackUnorm4x8', 'usubBorrow'
];

const VECTOR_PREFIXES = ['', 'b', 'i', 'u', 'd'];

export const BUILTIN_TYPES: string[] = [
  'void', 'bool', 'int', 'uint', 'float', 'double',
  ...VECTOR_PREFIXES.flatMap(p => [2, 3, 4].map(n => `${p}vec${n}`)),
  ...['', 'd'].flatMap(p => [2, 3, 4].flatMap(n => [
    `${p}mat${n}`,
    ...[2, 3, 4].map(m => `${p}mat${n}x${m}`)
  ])),
  ...['', 'i', 'u'].flatMap(p => [
    `${p}sampler1D`, `${p}sampler2D`, `${p}sampler3D`, `${p}samplerCube`,
    `${p}sampler2DArray`, `${p}samplerBuffer`, `${p}sampler2DRect`
  ]),
  'sampler2DShadow', 'samplerCubeShadow', 'sampler2DArrayShadow'
];

export const KEYWORDS = [
  'break', 'case', 'continue', 'default', 'discard', 'do', 'else', 'for', 'if', 'return',
  'switch', 'while', 'struct', 'true', 'false',
  'const', 'uniform', 'in', 'out', 'inout', 'layout', 'flat', 'smooth', 'highp', 'mediump', 'lowp',
  'precision', 'invariant', 'precise', 'buffer', 'shared'
];

const SCALAR_OF_PREFIX: Record<string, string> = { '': 'float', b: 'bool', i: 'int', u: 'uint', d: 'double' };

/** swizzle 補完用。'ivec3' → { size: 3, scalar: 'int' } */
export function vectorInfo(type: string): { size: number; scalar: string } | null {
  const m = /^([bidu]?)vec([234])$/.exec(type);
  return m ? { size: Number(m[2]), scalar: SCALAR_OF_PREFIX[m[1]] } : null;
}
