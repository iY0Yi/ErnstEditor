import * as monaco from 'monaco-editor';

// GLSL組み込み関数のリスト
const builtinFunctions = [
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

// GLSLシンタックスハイライト設定
const glslTokensProvider: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      // コメント
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      // プリプロセッサディレクティブ
      [/#.*$/, 'preprocessor'],

      // 文字列
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string'],

      // 数値
      [/[0-9]+\.[0-9]*([eE][-+]?[0-9]+)?/, 'number.float'],
      [/\.[0-9]+([eE][-+]?[0-9]+)?/, 'number.float'],
      [/[0-9]+[eE][-+]?[0-9]+/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/0[0-7]+/, 'number.octal'],
      [/[0-9]+/, 'number'],

      // 括弧類を明示的に定義
      [/[\[\]]/, 'delimiter.square'],
      [/[{}]/, 'delimiter.curly'],
      [/[()]/, 'delimiter.parenthesis'],
      [/[<>]/, 'delimiter.angle'],
      [/[;,]/, 'delimiter'],

      // structキーワードとその後の識別子をハイライト
      [/\b(struct)\b/, 'keyword.struct', '@struct_def'],

      // 組み込み変数
      [/\b(gl_\w+)\b/, 'variable.predefined'],

      // 型
      [/\b(void|bool|int|uint|float|double|vec[2-4]|dvec[2-4]|bvec[2-4]|ivec[2-4]|uvec[2-4]|mat[2-4]|mat[2-4]x[2-4]|dmat[2-4]|dmat[2-4]x[2-4]|sampler[1-3]D|image[1-3]D|samplerCube|imageCube|sampler[1-2]DShadow|sampler[1-2]DArray|image[1-2]DArray|samplerBuffer|imageBuffer|sampler2DRect|image2DRect|sampler[1-2]DArrayShadow|samplerCubeShadow|samplerCubeArray|imageCubeArray|samplerCubeArrayShadow|isampler[1-3]D|iimage[1-3]D|isamplerCube|iimageCube|isampler[1-2]DArray|iimage[1-2]DArray|isamplerBuffer|iimageBuffer|isampler2DRect|iimage2DRect|isamplerCubeArray|iimageCubeArray|usampler[1-3]D|uimage[1-3]D|usamplerCube|uimageCube|usampler[1-2]DArray|uimage[1-2]DArray|usamplerBuffer|uimageBuffer|usampler2DRect|uimage2DRect|usamplerCubeArray|uimageCubeArray|atomic_uint)\b/, 'keyword.type'],

      // 関数定義
      [/\b([a-zA-Z_]\w*)\s*(?=\()/, {
        cases: {
          '@builtinFunctions': 'keyword.function',
          '@default': 'user.function'
        }
      }],

      // 制御フロー
      [/\b(break|case|continue|default|discard|do|else|for|if|return|switch|while)\b/, 'keyword.control'],

      // 修飾子
      [/\b(attribute|const|uniform|varying|buffer|shared|coherent|volatile|restrict|readonly|writeonly|layout|centroid|flat|smooth|noperspective|patch|sample|subroutine|in|out|inout|invariant|precise|lowp|mediump|highp)\b/, 'keyword.storage'],

      // 予約語
      [/\b(asm|class|union|enum|typedef|template|this|packed|goto|inline|noinline|volatile|public|static|extern|external|interface|long|short|half|fixed|unsigned|superp|input|output|hvec[2-4]|fvec[2-4]|sampler3DRect|filter|sizeof|cast|namespace|using)\b/, 'keyword.reserved'],

      // 組み込み関数
      [/\b(abs|acos|acosh|all|any|asin|asinh|atan|atanh|atomicAdd|atomicAnd|atomicCompSwap|atomicCounter|atomicCounterDecrement|atomicCounterIncrement|atomicExchange|atomicMax|atomicMin|atomicOr|atomicXor|barrier|bitCount|bitfieldExtract|bitfieldInsert|bitfieldReverse|ceil|clamp|cos|cosh|cross|degrees|determinant|dFdx|dFdy|dFdxCoarse|dFdyCoarse|dFdxFine|dFdyFine|distance|dot|EmitStreamVertex|EmitVertex|EndPrimitive|EndStreamPrimitive|equal|exp|exp2|faceforward|findLSB|findMSB|floatBitsToInt|floatBitsToUint|floor|fma|fract|frexp|ftransform|fwidth|fwidthCoarse|fwidthFine|greaterThan|greaterThanEqual|imageAtomicAdd|imageAtomicAnd|imageAtomicCompSwap|imageAtomicExchange|imageAtomicMax|imageAtomicMin|imageAtomicOr|imageAtomicXor|imageLoad|imageSize|imageStore|imulExtended|intBitsToFloat|interpolateAtCentroid|interpolateAtOffset|interpolateAtSample|inverse|inversesqrt|isinf|isnan|ldexp|length|lessThan|lessThanEqual|log|log2|matrixCompMult|max|memoryBarrier|memoryBarrierAtomicCounter|memoryBarrierBuffer|memoryBarrierImage|memoryBarrierShared|min|mix|mod|modf|noise|noise[1-4]|normalize|not|notEqual|outerProduct|packDouble2x32|packHalf2x16|packSnorm2x16|packSnorm4x8|packUnorm2x16|packUnorm4x8|pow|radians|reflect|refract|round|roundEven|sign|sin|sinh|smoothstep|sqrt|step|tan|tanh|texelFetch|texelFetchOffset|texture|textureGather|textureGatherOffset|textureGatherOffsets|textureGrad|textureGradOffset|textureLod|textureLodOffset|textureOffset|textureProj|textureProjGrad|textureProjGradOffset|textureProjLod|textureProjLodOffset|textureProjOffset|textureQueryLevels|textureQueryLod|textureSize|transpose|trunc|uaddCarry|uintBitsToFloat|umulExtended|unpackDouble2x32|unpackHalf2x16|unpackSnorm2x16|unpackSnorm4x8|unpackUnorm2x16|unpackUnorm4x8|usubBorrow)\b/, 'keyword.function'],

      // 定数
      [/\b(true|false)\b/, 'constant.language.boolean'],

      // 演算子
      [/[+\-*/=<>!~^|&%]+/, 'operator'],

      // 識別子
      [/[a-zA-Z_]\w*/, 'identifier'],
    ],

    // structキーワードの後のトークンを処理
    struct_def: [
      [/\s+/, 'white'],
      [/([a-zA-Z_]\w*)/, 'struct.name', '@pop'],
      [/./, 'text', '@pop']
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\/\*/, 'comment', '@push'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment']
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop']
    ],
  },

  // 組み込み関数のリスト
  builtinFunctions
};

// GLSL言語設定
const glslLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ]
};

/**
 * GLSL言語をMonacoエディタに登録する
 */
export function setupGLSLLanguage(monacoInstance?: any): void {
  const monacoToUse = monacoInstance || monaco;

  // 言語を登録
  monacoToUse.languages.register({ id: 'glsl' });

  // シンタックスハイライト設定
  monacoToUse.languages.setMonarchTokensProvider('glsl', glslTokensProvider);

  // 言語設定
  monacoToUse.languages.setLanguageConfiguration('glsl', glslLanguageConfiguration);
}