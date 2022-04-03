uniform sampler2D initialData; // R - terrain height, G - blood, B - sediment
uniform sampler2D prevSimulation;
uniform sampler2D flux;

uniform float brushIntensity;
uniform float brushRadius;
uniform vec2 brushLocation;

uniform float area;
uniform float pipeLength;
uniform float pixelSize;
uniform float timeStep;

varying vec2 vUv;

void main() {
  vec4 initData = texture2D(initialData, vUv);
  initData.r = initData.r * 3.0;

  vec4 prevSim = texture2D(prevSimulation, vUv);
  float bloodEmitter =
      step(length(vUv - brushLocation), brushRadius) * brushIntensity;

  // Initial blood increment
  float blood = min(1.0, max(0.0, prevSim.g + bloodEmitter * timeStep));

  // Update blood simulation
  vec2 offset = vec2(pixelSize, 0.0);

  float outflowFlux = dot(texture2D(flux, vUv), vec4(1.0));
  float inflowFluxL = texture2D(flux, vUv + offset.xy).x;
  float inflowFluxR = texture2D(flux, vUv - offset.xy).y;
  float inflowFluxT = texture2D(flux, vUv - offset.yx).z;
  float inflowFluxB = texture2D(flux, vUv + offset.yx).w;

  float volumeChange =
      (inflowFluxL + inflowFluxR + inflowFluxT + inflowFluxB - outflowFlux) *
      timeStep;

  blood += volumeChange / area;
  blood = min(1.0, max(0.0, blood));

  vec4 outData = vec4(initData.r, blood, 0.0, 1.0);

  if (vUv.x > 0.99 || vUv.x < 0.01 || vUv.y > 0.99 || vUv.y < 0.01) {
    outData = vec4(0.0);
  };

  gl_FragColor = outData;
}
