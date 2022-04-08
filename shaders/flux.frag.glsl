uniform sampler2D initDataUpdated; // R - terrain height, G - water height
uniform sampler2D prevFlux;

uniform float area;
uniform float gravity;
uniform float pipeLength;
uniform float pixelSize;
uniform float timeStep;

varying vec2 vUv;

void main() {
  float dumping = 0.999;
  vec2 offset = vec2(pixelSize, 0.0);

  vec4 initDataUpdatedC = texture2D(initDataUpdated, vUv);
  vec4 initDataUpdatedL = texture2D(initDataUpdated, vUv - offset.xy);
  vec4 initDataUpdatedR = texture2D(initDataUpdated, vUv + offset.xy);
  vec4 initDataUpdatedT = texture2D(initDataUpdated, vUv + offset.yx);
  vec4 initDataUpdatedB = texture2D(initDataUpdated, vUv - offset.yx);

  float totalHeight = initDataUpdatedC.r + initDataUpdatedC.g;
  float deltaHeightL = totalHeight - initDataUpdatedL.r - initDataUpdatedL.g;
  float deltaHeightR = totalHeight - initDataUpdatedR.r - initDataUpdatedR.g;
  float deltaHeightT = totalHeight - initDataUpdatedT.r - initDataUpdatedT.g;
  float deltaHeightB = totalHeight - initDataUpdatedB.r - initDataUpdatedB.g;

  vec4 oldOutflowFlux = texture2D(prevFlux, vUv);

  float newOutflowFluxL =
      max(0.0, oldOutflowFlux.x * dumping +
                   timeStep * area * gravity * deltaHeightL / pipeLength);
  float newOutflowFluxR =
      max(0.0, oldOutflowFlux.y * dumping +
                   timeStep * area * gravity * deltaHeightR / pipeLength);
  float newOutflowFluxT =
      max(0.0, oldOutflowFlux.z * dumping +
                   timeStep * area * gravity * deltaHeightT / pipeLength);
  float newOutflowFluxB =
      max(0.0, oldOutflowFlux.w * dumping +
                   timeStep * area * gravity * deltaHeightB / pipeLength);

  float maxWater = initDataUpdatedC.g * pipeLength * pipeLength;

  float scalingFactor = min(1.0, initDataUpdatedC.g * pipeLength * pipeLength /
                                     (newOutflowFluxL + newOutflowFluxR +
                                      newOutflowFluxT + newOutflowFluxB) /
                                     timeStep);

  vec4 flux =
      vec4(newOutflowFluxL, newOutflowFluxR, newOutflowFluxT, newOutflowFluxB) *
      scalingFactor;

  gl_FragColor = flux;
}
