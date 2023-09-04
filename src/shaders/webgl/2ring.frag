#version 100

#define NUM_RINGS 2

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 iResolution;
uniform float iTime;
// colors
uniform vec3 colors[NUM_RINGS];
// sizes
uniform float sizes[NUM_RINGS];
// other
uniform float zoom;
uniform float speed;

// https://stackoverflow.com/a/32353829
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

    // This logic could be taken out of the shader and be marginally faster
    // but I don't feel like programming that logic right now
    // it'll probably be fine
    float sizeSum = 0.;
    for (int i = 0; i < NUM_RINGS; ++i) {
        sizeSum += sizes[i];
    }
    float scaledSizes[NUM_RINGS];
    for (int i = 0; i < NUM_RINGS; ++i) {
        scaledSizes[i] = sizes[i] / sizeSum;
    }

    // How wide a pair of rings are.
    // Dividing sizeSum by the length to keep zoom based on [1.,1.]
    float ringsWidth = 1. / zoom;
    // Wrap around until we've got a position within [0.0, twoRingWidth)
    float ringPos = mod(pos.x + iTime * speed, ringsWidth);
    // Divide by twoRingWidth to get back into [0.0, 1.0]
    if (ringPos / ringsWidth < scaledSizes[0]){
        gl_FragColor = vec4(colors[0], 1.);
    }
    else{
        gl_FragColor = vec4(colors[1], 1.);
    }
}
