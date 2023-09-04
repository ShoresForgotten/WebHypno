#version 100

#define MAX_RINGS 62

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 iResolution;
uniform float iTime;
uniform int ringCount;
// colors
uniform vec3 colors[MAX_RINGS];
// sizes
uniform float sizes[MAX_RINGS];
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

    // How wide a group of rings is.
    float ringsWidth = 1. / zoom;
    // Wrap around until we've got a position within [0.0, ringsWidth)
    float ringPos = mod(pos.x + iTime * speed, ringsWidth);
    // Divide by ringsWidth to get back into [0.0, 1.0]
    float relativeRingPos = ringPos / ringsWidth;

    float sizeSum = 0.;
    for (int i = 0; i < MAX_RINGS; ++i) {// getting what the sum of the sizes is
        sizeSum += sizes[i];
    }
    float scaledSizes[MAX_RINGS];
    for (int i = 0; i < MAX_RINGS; ++i) {// normalize sizes to [0.0, 1.0]
        if (i == 0) {
            scaledSizes[i] = sizes[i] / sizeSum;
        }
        else {
            scaledSizes[i] = sizes[i] / sizeSum + scaledSizes[i - 1];
        }
        if (ringPos < scaledSizes[i]) {
            // if the current scaled size is greater than ringPos, we've got it.
            gl_FragColor = vec4(colors[i], 1.0);
            break;
        }
    }
}
