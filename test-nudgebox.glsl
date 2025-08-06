// Test GLSL file for Inline Nudgebox (Float) testing
// Alt+X で数値入力ボックスをテスト

precision mediump float;

uniform float u_time;
uniform float u_inline1f;
varying vec2 v_uv;

void main() {
    float value1 = 1.0;
    float value2 = 0.5;
    float value3 = 3.14159;
    float value4 = -2.5;

    vec3 color = vec3(value1 * sin(u_time), value2, value3 * cos(u_time));
    gl_FragColor = vec4(color, 1.0);
}