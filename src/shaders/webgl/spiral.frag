#version 100

#define MILLISECONDS 1000.0
#define COLORS 2
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

// Resolution and time
uniform vec2 iResolution;
uniform float iTime;
// Colors
uniform vec3 colors[COLORS];
// Sizes
uniform float sizes[COLORS];
// Other uniforms
uniform int arms;
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
    vec2 pos = polarCoord(fragCoord.xy, iResolution);// get the polar coordinates of the current fragment
    float time = iTime / MILLISECONDS;

    float sizeSum = 0.;
    for (int i = 0; i < COLORS; ++i) {
        sizeSum += sizes[i];
    }
    float scaledSizes[COLORS];
    for (int i = 0; i < COLORS; ++i) {
        scaledSizes[i] = sizes[i] / sizeSum;
    }

    float spiral = mod(pos.y + time * speed * (1./60.) + pos.x * zoom, 1.0 );
    float armInterval = 1.0 / float(arms);
    // divide the angle of the current position by the arm interval to get the arm we're on
    if (mod(abs(spiral / armInterval), 1.0) < scaledSizes[0]) {
        gl_FragColor = vec4(colors[0], 1.);
    }
    else {
        gl_FragColor = vec4(colors[1], 1.);
    }
}