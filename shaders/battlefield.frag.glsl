uniform sampler2D color;
uniform sampler2D simData;
uniform float pixelSize;

varying vec2 vUv;

void main() {
  vec2 offset = vec2(pixelSize, 0.0);
  vec4 beauty = texture2D(color, vUv);
  vec4 data = texture2D(simData, vUv);

  vec3 color = mix(beauty.rgb, vec3(.5, 0.0, 0.0), vec3(data.g));

  gl_FragColor = vec4(color.rgb, 1.0);
}