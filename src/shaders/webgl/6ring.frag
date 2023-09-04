#version 460 core

layout(location=0) uniform vec2 iResolution;
layout(location=2) uniform float iTime;
// colors
layout(location=3) uniform vec3 colors[6];
// sizes
layout(location=21) uniform float sizes[6];
// other
layout(location=27) uniform float zoom;
layout(location=28) uniform float speed;
out vec4 fragColor;

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
    // Wrap around until we've got a position within [0.0, twoRingWidth)
    float ringPos = mod(pos.x + iTime * speed, ringsWidth);
    // Divide by twoRingWidth to get back into [0.0, 1.0]
    float relativeRingPos = ringPos / ringsWidth;

    float sizeSum = 0.;
    for (int i = 0; i < sizes.length(); ++i) {
        sizeSum += sizes[i];
    }
    float scaledSizes[sizes.length()];
    for (int i = 0; i < sizes.length(); ++i) {
        if (i == 0) {
            scaledSizes[i] = sizes[i] / sizeSum;
        }
        else {
            scaledSizes[i] = sizes[i] / sizeSum + scaledSizes [i - 1];
        }
    }

    // I have nightmares about SkSL hunting me down and kneeing me in the groin
    if (relativeRingPos < scaledSizes[0]){
        fragColor = vec4(colors[0], 1.);
    }
    else if(relativeRingPos >= scaledSizes[0] && relativeRingPos < scaledSizes[1]){
        fragColor = vec4(colors[1], 1.);
    }
    else if(relativeRingPos >= scaledSizes[1] && relativeRingPos < scaledSizes[2]) {
        fragColor = vec4(colors[2], 1.);
    }
    else if(relativeRingPos >= scaledSizes[2] && relativeRingPos < scaledSizes[3]){
        fragColor = vec4(colors[3], 1.);
    }
    else if(relativeRingPos >= scaledSizes[3] && relativeRingPos < scaledSizes[4]){
        fragColor = vec4(colors[4], 1.);
    }
    else {
        fragColor = vec4(colors[5], 1.);
    }
    // if SkSL allowed for non-constant expression array indices I could divide relativeRingPos by visibleRings
    // And then access the color at the resulting number (truncated to int)
    // This would theoretically allow for an arbitrary amount of colors between [1, (MAX_UNIFORM_LOCATIONS - 5) / 3]
    // and that would be pretty cool
}
