uniform sampler2D displacementMap;
uniform float displacementScale;

varying vec2 vUv;

void main() {
  float height = texture2D(displacementMap, uv).r;
  vec3 displacedPosition = position + normal * height * displacementScale;

  gl_Position =
      projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  vUv = uv;
}