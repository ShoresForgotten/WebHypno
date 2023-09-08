#version 100

#define NUM_RINGS 6
#define MILLISECONDS 1000.0

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
    float time = iTime / MILLISECONDS;
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 pos = polarCoord(fragCoord.xy, iResolution.xy);

    // How wide a group of rings is.
    float ringsWidth = 1. / zoom;
    // Wrap around until we've got a position within [0.0, twoRingWidth)
    float ringPos = mod(pos.x + (time * speed) / zoom, ringsWidth);
    // Divide by twoRingWidth to get back into [0.0, 1.0]
    float relativeRingPos = ringPos / ringsWidth;

    float sizeSum = 0.;
    for (int i = 0; i < NUM_RINGS; ++i) {
        sizeSum += sizes[i];
    }
    float scaledSizes[NUM_RINGS];
    for (int i = 0; i < NUM_RINGS; ++i) {
        if (i == 0) {
            scaledSizes[i] = sizes[i] / sizeSum;
        }
        else {
            scaledSizes[i] = sizes[i] / sizeSum + scaledSizes [i - 1];
        }
    }

    // I have nightmares about SkSL hunting me down and kneeing me in the groin
    if (relativeRingPos < scaledSizes[0]){
        gl_FragColor = vec4(colors[0], 1.);
    }
    else if(relativeRingPos >= scaledSizes[0] && relativeRingPos < scaledSizes[1]){
        gl_FragColor = vec4(colors[1], 1.);
    }
    else if(relativeRingPos >= scaledSizes[1] && relativeRingPos < scaledSizes[2]) {
        gl_FragColor = vec4(colors[2], 1.);
    }
    else if(relativeRingPos >= scaledSizes[2] && relativeRingPos < scaledSizes[3]){
        gl_FragColor = vec4(colors[3], 1.);
    }
    else if(relativeRingPos >= scaledSizes[3] && relativeRingPos < scaledSizes[4]){
        gl_FragColor = vec4(colors[4], 1.);
    }
    else {
        gl_FragColor = vec4(colors[5], 1.);
    }
}
