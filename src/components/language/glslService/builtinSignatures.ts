// GLSL 4.50 の組み込み関数のシグネチャと説明。
// 型は仕様書と同じ総称型 (genType = float/vec2/vec3/vec4 など。typeSystem.ts の FAMILIES) で書く。
// double 版の重複オーバーロードは ErnstRenderer で使わないので省いている

import { parseFunctionHeader } from './symbols';

export interface BuiltinOverload {
  returnType: string;
  params: string[];
}

export interface BuiltinFunction {
  name: string;
  doc: string;
  overloads: BuiltinOverload[];
}

const DEFS: Array<[string, ...string[]]> = [
  // 角度・三角関数
  ['度をラジアンに変換する', 'genType radians(genType degrees)'],
  ['ラジアンを度に変換する', 'genType degrees(genType radians)'],
  ['正弦', 'genType sin(genType angle)'],
  ['余弦', 'genType cos(genType angle)'],
  ['正接', 'genType tan(genType angle)'],
  ['逆正弦。戻り値は [-π/2, π/2]', 'genType asin(genType x)'],
  ['逆余弦。戻り値は [0, π]', 'genType acos(genType x)'],
  ['逆正接。2 引数版は象限を考慮して [-π, π] を返す', 'genType atan(genType y, genType x)', 'genType atan(genType y_over_x)'],
  ['双曲線正弦', 'genType sinh(genType x)'],
  ['双曲線余弦', 'genType cosh(genType x)'],
  ['双曲線正接', 'genType tanh(genType x)'],
  ['逆双曲線正弦', 'genType asinh(genType x)'],
  ['逆双曲線余弦', 'genType acosh(genType x)'],
  ['逆双曲線正接', 'genType atanh(genType x)'],

  // 指数関数
  ['x の y 乗。x < 0 や x = 0 かつ y <= 0 は未定義', 'genType pow(genType x, genType y)'],
  ['自然指数 e^x', 'genType exp(genType x)'],
  ['自然対数。x <= 0 は未定義', 'genType log(genType x)'],
  ['2^x', 'genType exp2(genType x)'],
  ['底 2 の対数', 'genType log2(genType x)'],
  ['平方根', 'genType sqrt(genType x)'],
  ['平方根の逆数 1/√x', 'genType inversesqrt(genType x)'],

  // 共通関数
  ['絶対値', 'genType abs(genType x)', 'genIType abs(genIType x)'],
  ['符号。正なら 1、0 なら 0、負なら -1', 'genType sign(genType x)', 'genIType sign(genIType x)'],
  ['x 以下の最大の整数', 'genType floor(genType x)'],
  ['0 方向への切り捨て', 'genType trunc(genType x)'],
  ['最も近い整数。0.5 の扱いは実装依存', 'genType round(genType x)'],
  ['最も近い整数。0.5 は偶数側に丸める', 'genType roundEven(genType x)'],
  ['x 以上の最小の整数', 'genType ceil(genType x)'],
  ['小数部 x - floor(x)', 'genType fract(genType x)'],
  ['剰余 x - y * floor(x / y)。負の x でも結果は y と同じ符号', 'genType mod(genType x, float y)', 'genType mod(genType x, genType y)'],
  ['整数部を i に、小数部を戻り値に分ける', 'genType modf(genType x, out genType i)'],
  ['小さい方', 'genType min(genType x, genType y)', 'genType min(genType x, float y)', 'genIType min(genIType x, genIType y)', 'genIType min(genIType x, int y)', 'genUType min(genUType x, genUType y)', 'genUType min(genUType x, uint y)'],
  ['大きい方', 'genType max(genType x, genType y)', 'genType max(genType x, float y)', 'genIType max(genIType x, genIType y)', 'genIType max(genIType x, int y)', 'genUType max(genUType x, genUType y)', 'genUType max(genUType x, uint y)'],
  ['min(max(x, minVal), maxVal)', 'genType clamp(genType x, genType minVal, genType maxVal)', 'genType clamp(genType x, float minVal, float maxVal)', 'genIType clamp(genIType x, genIType minVal, genIType maxVal)', 'genIType clamp(genIType x, int minVal, int maxVal)', 'genUType clamp(genUType x, genUType minVal, genUType maxVal)', 'genUType clamp(genUType x, uint minVal, uint maxVal)'],
  ['線形補間 x * (1 - a) + y * a。bool 版は a が true の成分で y を選ぶ', 'genType mix(genType x, genType y, genType a)', 'genType mix(genType x, genType y, float a)', 'genType mix(genType x, genType y, genBType a)'],
  ['x < edge なら 0、それ以外は 1', 'genType step(genType edge, genType x)', 'genType step(float edge, genType x)'],
  ['edge0 から edge1 のあいだをエルミート補間する。範囲外は 0 / 1', 'genType smoothstep(genType edge0, genType edge1, genType x)', 'genType smoothstep(float edge0, float edge1, genType x)'],
  ['NaN かどうか', 'genBType isnan(genType x)'],
  ['無限大かどうか', 'genBType isinf(genType x)'],
  ['float のビット列を int として返す', 'genIType floatBitsToInt(genType value)'],
  ['float のビット列を uint として返す', 'genUType floatBitsToUint(genType value)'],
  ['int のビット列を float として返す', 'genType intBitsToFloat(genIType value)'],
  ['uint のビット列を float として返す', 'genType uintBitsToFloat(genUType value)'],
  ['a * b + c を 1 回の丸めで計算する', 'genType fma(genType a, genType b, genType c)'],
  ['x を仮数 [0.5, 1) と指数に分ける', 'genType frexp(genType x, out genIType exp)'],
  ['x * 2^exp', 'genType ldexp(genType x, genIType exp)'],

  // パック・アンパック
  ['[0, 1] の vec2 を 16bit ずつ uint に詰める', 'uint packUnorm2x16(vec2 v)'],
  ['[-1, 1] の vec2 を 16bit ずつ uint に詰める', 'uint packSnorm2x16(vec2 v)'],
  ['[0, 1] の vec4 を 8bit ずつ uint に詰める', 'uint packUnorm4x8(vec4 v)'],
  ['[-1, 1] の vec4 を 8bit ずつ uint に詰める', 'uint packSnorm4x8(vec4 v)'],
  ['packUnorm2x16 の逆', 'vec2 unpackUnorm2x16(uint p)'],
  ['packSnorm2x16 の逆', 'vec2 unpackSnorm2x16(uint p)'],
  ['packUnorm4x8 の逆', 'vec4 unpackUnorm4x8(uint p)'],
  ['packSnorm4x8 の逆', 'vec4 unpackSnorm4x8(uint p)'],
  ['vec2 を半精度 2 つとして uint に詰める', 'uint packHalf2x16(vec2 v)'],
  ['packHalf2x16 の逆', 'vec2 unpackHalf2x16(uint v)'],
  ['uvec2 のビット列を double にする', 'double packDouble2x32(uvec2 v)'],
  ['double のビット列を uvec2 にする', 'uvec2 unpackDouble2x32(double v)'],

  // 幾何関数
  ['ベクトルの長さ', 'float length(genType x)'],
  ['2 点間の距離 length(p0 - p1)', 'float distance(genType p0, genType p1)'],
  ['内積', 'float dot(genType x, genType y)'],
  ['外積', 'vec3 cross(vec3 x, vec3 y)'],
  ['長さ 1 に正規化する', 'genType normalize(genType x)'],
  ['固定機能と同じ頂点変換 (互換プロファイルのみ)', 'vec4 ftransform()'],
  ['dot(Nref, I) < 0 なら N、それ以外は -N', 'genType faceforward(genType N, genType I, genType Nref)'],
  ['入射ベクトル I を法線 N で反射する。N は正規化しておく', 'genType reflect(genType I, genType N)'],
  ['屈折ベクトル。eta は屈折率の比。全反射では 0 を返す', 'genType refract(genType I, genType N, float eta)'],

  // 行列関数
  ['成分ごとの積', 'mat matrixCompMult(mat x, mat y)'],
  ['列ベクトル c と行ベクトル r の外積', 'mat outerProduct(vec c, vec r)'],
  ['転置', 'mat transpose(mat m)'],
  ['行列式', 'float determinant(mat m)'],
  ['逆行列', 'mat inverse(mat m)'],

  // ベクトルの比較
  ['成分ごとに x < y', 'bvec lessThan(vec x, vec y)', 'bvec lessThan(ivec x, ivec y)', 'bvec lessThan(uvec x, uvec y)'],
  ['成分ごとに x <= y', 'bvec lessThanEqual(vec x, vec y)', 'bvec lessThanEqual(ivec x, ivec y)', 'bvec lessThanEqual(uvec x, uvec y)'],
  ['成分ごとに x > y', 'bvec greaterThan(vec x, vec y)', 'bvec greaterThan(ivec x, ivec y)', 'bvec greaterThan(uvec x, uvec y)'],
  ['成分ごとに x >= y', 'bvec greaterThanEqual(vec x, vec y)', 'bvec greaterThanEqual(ivec x, ivec y)', 'bvec greaterThanEqual(uvec x, uvec y)'],
  ['成分ごとに x == y', 'bvec equal(vec x, vec y)', 'bvec equal(ivec x, ivec y)', 'bvec equal(uvec x, uvec y)', 'bvec equal(bvec x, bvec y)'],
  ['成分ごとに x != y', 'bvec notEqual(vec x, vec y)', 'bvec notEqual(ivec x, ivec y)', 'bvec notEqual(uvec x, uvec y)', 'bvec notEqual(bvec x, bvec y)'],
  ['いずれかの成分が true か', 'bool any(bvec x)'],
  ['すべての成分が true か', 'bool all(bvec x)'],
  ['成分ごとの論理否定', 'bvec not(bvec x)'],

  // 整数関数
  ['符号なし加算。桁あふれを carry に返す', 'genUType uaddCarry(genUType x, genUType y, out genUType carry)'],
  ['符号なし減算。借りを borrow に返す', 'genUType usubBorrow(genUType x, genUType y, out genUType borrow)'],
  ['符号なし 32bit 乗算の 64bit 結果を上位 msb / 下位 lsb に返す', 'void umulExtended(genUType x, genUType y, out genUType msb, out genUType lsb)'],
  ['符号付き 32bit 乗算の 64bit 結果を上位 msb / 下位 lsb に返す', 'void imulExtended(genIType x, genIType y, out genIType msb, out genIType lsb)'],
  ['offset から bits ビットを取り出す', 'genIType bitfieldExtract(genIType value, int offset, int bits)', 'genUType bitfieldExtract(genUType value, int offset, int bits)'],
  ['base の offset から bits ビットを insert で置き換える', 'genIType bitfieldInsert(genIType base, genIType insert, int offset, int bits)', 'genUType bitfieldInsert(genUType base, genUType insert, int offset, int bits)'],
  ['ビット順を反転する', 'genIType bitfieldReverse(genIType value)', 'genUType bitfieldReverse(genUType value)'],
  ['立っているビットの数', 'genIType bitCount(genIType value)', 'genIType bitCount(genUType value)'],
  ['最下位の立っているビットの位置。0 なら -1', 'genIType findLSB(genIType value)', 'genIType findLSB(genUType value)'],
  ['最上位の立っているビットの位置。0 なら -1', 'genIType findMSB(genIType value)', 'genIType findMSB(genUType value)'],

  // テクスチャ
  ['ミップレベル lod の解像度', 'ivec2 textureSize(gsampler2D sampler, int lod)', 'ivec3 textureSize(gsampler3D sampler, int lod)', 'ivec2 textureSize(gsamplerCube sampler, int lod)'],
  ['使われるミップレベル (x) と LOD (y)', 'vec2 textureQueryLod(gsampler2D sampler, vec2 P)'],
  ['ミップレベルの数', 'int textureQueryLevels(gsampler2D sampler)'],
  ['テクスチャをサンプリングする。bias でミップレベルをずらす', 'gvec4 texture(gsampler2D sampler, vec2 P)', 'gvec4 texture(gsampler2D sampler, vec2 P, float bias)', 'gvec4 texture(gsampler3D sampler, vec3 P)', 'gvec4 texture(gsamplerCube sampler, vec3 P)', 'float texture(sampler2DShadow sampler, vec3 P)'],
  ['P を最後の成分で割ってからサンプリングする', 'gvec4 textureProj(gsampler2D sampler, vec3 P)', 'gvec4 textureProj(gsampler2D sampler, vec4 P)'],
  ['ミップレベルを指定してサンプリングする', 'gvec4 textureLod(gsampler2D sampler, vec2 P, float lod)', 'gvec4 textureLod(gsampler3D sampler, vec3 P, float lod)', 'gvec4 textureLod(gsamplerCube sampler, vec3 P, float lod)'],
  ['テクセル単位の offset を足してサンプリングする', 'gvec4 textureOffset(gsampler2D sampler, vec2 P, ivec2 offset)'],
  ['整数座標のテクセルをフィルタなしで読む', 'gvec4 texelFetch(gsampler2D sampler, ivec2 P, int lod)', 'gvec4 texelFetch(gsampler3D sampler, ivec3 P, int lod)'],
  ['texelFetch に offset を足したもの', 'gvec4 texelFetchOffset(gsampler2D sampler, ivec2 P, int lod, ivec2 offset)'],
  ['textureProj に offset を足したもの', 'gvec4 textureProjOffset(gsampler2D sampler, vec3 P, ivec2 offset)'],
  ['textureLod に offset を足したもの', 'gvec4 textureLodOffset(gsampler2D sampler, vec2 P, float lod, ivec2 offset)'],
  ['textureProj をミップレベル指定で', 'gvec4 textureProjLod(gsampler2D sampler, vec3 P, float lod)'],
  ['textureProjLod に offset を足したもの', 'gvec4 textureProjLodOffset(gsampler2D sampler, vec3 P, float lod, ivec2 offset)'],
  ['微分を明示してサンプリングする', 'gvec4 textureGrad(gsampler2D sampler, vec2 P, vec2 dPdx, vec2 dPdy)'],
  ['textureGrad に offset を足したもの', 'gvec4 textureGradOffset(gsampler2D sampler, vec2 P, vec2 dPdx, vec2 dPdy, ivec2 offset)'],
  ['textureProj を微分明示で', 'gvec4 textureProjGrad(gsampler2D sampler, vec3 P, vec2 dPdx, vec2 dPdy)'],
  ['textureProjGrad に offset を足したもの', 'gvec4 textureProjGradOffset(gsampler2D sampler, vec3 P, vec2 dPdx, vec2 dPdy, ivec2 offset)'],
  ['周囲 4 テクセルの comp 成分を集める', 'gvec4 textureGather(gsampler2D sampler, vec2 P)', 'gvec4 textureGather(gsampler2D sampler, vec2 P, int comp)'],
  ['textureGather に offset を足したもの', 'gvec4 textureGatherOffset(gsampler2D sampler, vec2 P, ivec2 offset)', 'gvec4 textureGatherOffset(gsampler2D sampler, vec2 P, ivec2 offset, int comp)'],
  ['4 テクセルそれぞれに offsets を足して集める', 'gvec4 textureGatherOffsets(gsampler2D sampler, vec2 P, ivec2 offsets[4])', 'gvec4 textureGatherOffsets(gsampler2D sampler, vec2 P, ivec2 offsets[4], int comp)'],

  // フラグメント処理 (微分・補間)
  ['画面 x 方向の偏微分', 'genType dFdx(genType p)'],
  ['画面 y 方向の偏微分', 'genType dFdy(genType p)'],
  ['画面 x 方向の偏微分 (ピクセル単位の精度)', 'genType dFdxFine(genType p)'],
  ['画面 y 方向の偏微分 (ピクセル単位の精度)', 'genType dFdyFine(genType p)'],
  ['画面 x 方向の偏微分 (2x2 ブロック単位)', 'genType dFdxCoarse(genType p)'],
  ['画面 y 方向の偏微分 (2x2 ブロック単位)', 'genType dFdyCoarse(genType p)'],
  ['abs(dFdx(p)) + abs(dFdy(p))。アンチエイリアスの幅に使う', 'genType fwidth(genType p)'],
  ['fwidth の Fine 版', 'genType fwidthFine(genType p)'],
  ['fwidth の Coarse 版', 'genType fwidthCoarse(genType p)'],
  ['入力変数をピクセルの重心で補間し直す', 'genType interpolateAtCentroid(genType interpolant)'],
  ['入力変数をサンプル位置で補間し直す', 'genType interpolateAtSample(genType interpolant, int sample)'],
  ['入力変数をピクセル中心からの offset で補間し直す', 'genType interpolateAtOffset(genType interpolant, vec2 offset)'],

  // ノイズ (非推奨。多くの実装で 0 を返す)
  ['非推奨。多くの実装で 0 を返す', 'float noise1(genType x)'],
  ['非推奨。多くの実装で 0 を返す', 'vec2 noise2(genType x)'],
  ['非推奨。多くの実装で 0 を返す', 'vec3 noise3(genType x)'],
  ['非推奨。多くの実装で 0 を返す', 'vec4 noise4(genType x)'],

  // ジオメトリシェーダー
  ['頂点をストリームに出力する', 'void EmitStreamVertex(int stream)'],
  ['ストリームのプリミティブを閉じる', 'void EndStreamPrimitive(int stream)'],
  ['頂点を出力する', 'void EmitVertex()'],
  ['プリミティブを閉じる', 'void EndPrimitive()'],

  // 同期
  ['ワークグループ内の実行を同期する', 'void barrier()'],
  ['すべてのメモリアクセスの順序を保証する', 'void memoryBarrier()'],
  ['アトミックカウンタのアクセス順を保証する', 'void memoryBarrierAtomicCounter()'],
  ['バッファ変数のアクセス順を保証する', 'void memoryBarrierBuffer()'],
  ['イメージのアクセス順を保証する', 'void memoryBarrierImage()'],
  ['shared 変数のアクセス順を保証する', 'void memoryBarrierShared()'],

  // アトミック
  ['カウンタを 1 増やし、増やす前の値を返す', 'uint atomicCounterIncrement(atomic_uint c)'],
  ['カウンタを 1 減らし、減らした後の値を返す', 'uint atomicCounterDecrement(atomic_uint c)'],
  ['カウンタの現在値', 'uint atomicCounter(atomic_uint c)'],
  ['mem に data を足し、元の値を返す', 'uint atomicAdd(inout uint mem, uint data)', 'int atomicAdd(inout int mem, int data)'],
  ['mem を min(mem, data) にし、元の値を返す', 'uint atomicMin(inout uint mem, uint data)', 'int atomicMin(inout int mem, int data)'],
  ['mem を max(mem, data) にし、元の値を返す', 'uint atomicMax(inout uint mem, uint data)', 'int atomicMax(inout int mem, int data)'],
  ['mem を mem & data にし、元の値を返す', 'uint atomicAnd(inout uint mem, uint data)', 'int atomicAnd(inout int mem, int data)'],
  ['mem を mem | data にし、元の値を返す', 'uint atomicOr(inout uint mem, uint data)', 'int atomicOr(inout int mem, int data)'],
  ['mem を mem ^ data にし、元の値を返す', 'uint atomicXor(inout uint mem, uint data)', 'int atomicXor(inout int mem, int data)'],
  ['mem を data に置き換え、元の値を返す', 'uint atomicExchange(inout uint mem, uint data)', 'int atomicExchange(inout int mem, int data)'],
  ['mem が compare と等しければ data に置き換え、元の値を返す', 'uint atomicCompSwap(inout uint mem, uint compare, uint data)', 'int atomicCompSwap(inout int mem, int compare, int data)'],

  // イメージ
  ['イメージの解像度', 'ivec2 imageSize(gimage2D image)'],
  ['イメージのテクセルを読む', 'gvec4 imageLoad(gimage2D image, ivec2 P)'],
  ['イメージのテクセルに書く', 'void imageStore(gimage2D image, ivec2 P, gvec4 data)'],
  ['テクセルに data を足し、元の値を返す', 'uint imageAtomicAdd(gimage2D image, ivec2 P, uint data)', 'int imageAtomicAdd(gimage2D image, ivec2 P, int data)'],
  ['テクセルを min にし、元の値を返す', 'uint imageAtomicMin(gimage2D image, ivec2 P, uint data)', 'int imageAtomicMin(gimage2D image, ivec2 P, int data)'],
  ['テクセルを max にし、元の値を返す', 'uint imageAtomicMax(gimage2D image, ivec2 P, uint data)', 'int imageAtomicMax(gimage2D image, ivec2 P, int data)'],
  ['テクセルを & data にし、元の値を返す', 'uint imageAtomicAnd(gimage2D image, ivec2 P, uint data)', 'int imageAtomicAnd(gimage2D image, ivec2 P, int data)'],
  ['テクセルを | data にし、元の値を返す', 'uint imageAtomicOr(gimage2D image, ivec2 P, uint data)', 'int imageAtomicOr(gimage2D image, ivec2 P, int data)'],
  ['テクセルを ^ data にし、元の値を返す', 'uint imageAtomicXor(gimage2D image, ivec2 P, uint data)', 'int imageAtomicXor(gimage2D image, ivec2 P, int data)'],
  ['テクセルを data に置き換え、元の値を返す', 'uint imageAtomicExchange(gimage2D image, ivec2 P, uint data)', 'int imageAtomicExchange(gimage2D image, ivec2 P, int data)'],
  ['テクセルが compare と等しければ data に置き換え、元の値を返す', 'uint imageAtomicCompSwap(gimage2D image, ivec2 P, uint compare, uint data)', 'int imageAtomicCompSwap(gimage2D image, ivec2 P, int compare, int data)']
];

function build(): Map<string, BuiltinFunction> {
  const map = new Map<string, BuiltinFunction>();
  for (const [doc, ...sigs] of DEFS) {
    for (const sig of sigs) {
      const parsed = parseFunctionHeader(sig);
      if (!parsed) throw new Error(`組み込み関数のシグネチャを読めません: ${sig}`);
      const entry = map.get(parsed.name) ?? { name: parsed.name, doc, overloads: [] };
      entry.overloads.push({ returnType: parsed.returnType, params: parsed.params });
      map.set(parsed.name, entry);
    }
  }
  return map;
}

export const BUILTIN_SIGNATURES: ReadonlyMap<string, BuiltinFunction> = build();

// 型がぴったり合っても候補の上に来ないよう、補完では最後に回して取り消し線を付ける
export const DEPRECATED_BUILTINS: ReadonlySet<string> = new Set(['noise1', 'noise2', 'noise3', 'noise4', 'ftransform']);
