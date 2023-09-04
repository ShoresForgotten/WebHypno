#version 460 core

layout(location=0) uniform vec2 iResolution;
layout(location=2) uniform float iTime;
// colors
layout(location=3) uniform vec3 colors[2];
// others
//fuckin idk
out vec4 fragColor;

vec2 polarCoord(vec2 coord, vec2 resolution) {
    vec2 uv = (coord - resolution.xy * .5); // get vector to centre
    uv = uv/min(resolution.x, resolution.y); // Normalize to screen
    float dist = distance(uv, vec2(.0));
    float angle = atan(uv.y, uv.x); // get angle
    angle = angle/(radians(180.)*2.0) + 0.5; // angle is between [-Pi,Pi], so get it into [.0,1.0]
    return vec2(dist, angle);
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 pos = polarCoord(fragCoord.xy, iResolution.xy);

    fragColor = vec4(mix(colors[0], colors[1], pos.x), 1.0);
}
