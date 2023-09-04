#version 100

#define MILLISECONDS 1000.0
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 colorOne;
uniform float dingus;

void main() {
    //gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
    gl_FragColor = vec4(abs(sin(colorOne + (iTime / MILLISECONDS) * dingus)), 1.0);
}
