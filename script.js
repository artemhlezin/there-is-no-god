import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

// Load Shaders
const battlefieldFS = await loadShader("shaders/battlefield.frag.glsl");
const battlefieldVS = await loadShader("shaders/battlefield.vert.glsl");
const bufferVS = await loadShader("shaders/buffer.vert.glsl");
const fluxFS = await loadShader("shaders/flux.frag.glsl");
const simulationFS = await loadShader("shaders/simulation.frag.glsl");

// Load textures
const textureLoader = new THREE.TextureLoader();
const initialData = textureLoader.load("image/height.webp"); // R - terrain, G - blood
const beauty = textureLoader.load("image/beauty.webp"); // Terrain beauty pass

// Sim parameters
const gravity = 10.0;
const pipeLength = 1;
const area = pipeLength * pipeLength;
const timeStep = 0.004;
const textureSize = {
  width: 512,
  height: 512,
};
const pixelSize = 1.0 / textureSize.width;
const brushIntensity = 1.0;
const brushRadius = 0.03; // [0.0 to 0.5]

// Main scene parameters
const canvas = document.querySelector(".gpu-canvas");
const viewportSizes = {
  width: canvas.clientWidth,
  height: canvas.clientWidth * 0.5,
};

const backgroundColor = new THREE.Color(0.9, 0.9, 0.9);
const displacementScale = 0.1;

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  precision: "highp",
});
renderer.setSize(viewportSizes.width, viewportSizes.height);

// Setup simulation scene
let simulationRTA = new THREE.WebGLRenderTarget(
  textureSize.width,
  textureSize.height,
  {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    encoding: THREE.LinearEncoding,
  }
);
let simulationRTB = simulationRTA.clone();
let fluxRTA = simulationRTA.clone();
let fluxRTB = simulationRTA.clone();

const simulationMat = new THREE.ShaderMaterial({
  uniforms: {
    initialData: { value: initialData },
    prevSimulation: { value: simulationRTB.texture },
    flux: { value: fluxRTB.texture },
    brushIntensity: { value: brushIntensity },
    brushRadius: { value: brushRadius },
    brushLocation: { value: new THREE.Vector2(0.5, 0.5) },

    area: { value: area },
    pipeLength: { value: pipeLength },
    pixelSize: { value: pixelSize },
    timeStep: { value: timeStep },
  },
  vertexShader: bufferVS,
  fragmentShader: simulationFS,
});

const fluxMat = new THREE.ShaderMaterial({
  uniforms: {
    prevFlux: { value: fluxRTB.texture },
    initDataUpdated: { value: simulationRTB.texture },

    area: { value: area },
    gravity: { value: gravity },
    pipeLength: { value: pipeLength },
    pixelSize: { value: pixelSize },
    timeStep: { value: timeStep },
  },
  vertexShader: bufferVS,
  fragmentShader: fluxFS,
});

const simulationQuad = new FullScreenQuad(simulationMat);
const fluxQuad = new FullScreenQuad(fluxMat);

// Setup main scene
const mainScene = new THREE.Scene();
mainScene.background = backgroundColor;

const battlefieldMat = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: beauty },
    simData: { value: simulationRTB.texture },
    pixelSize: { value: pixelSize },

    displacementMap: { value: initialData },
    displacementScale: { value: displacementScale },
  },
  vertexShader: battlefieldVS,
  fragmentShader: battlefieldFS,
});

const battlefieldMesh = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(2, 2, 300, 300),
  battlefieldMat
);

battlefieldMesh.rotateX(-0.5 * Math.PI); // 90 degree
mainScene.add(battlefieldMesh);

// Setup main camera and controls
const mainCamera = new THREE.PerspectiveCamera(
  45,
  viewportSizes.width / viewportSizes.height,
  0.1,
  100
);
mainCamera.position.z = 1.3;
mainCamera.position.y = 1;
// mainCamera.position.x = -0.3;

mainScene.add(mainCamera);

const controls = new OrbitControls(mainCamera, renderer.domElement);
controls.target = new THREE.Vector3(0.0, 0.0, 0.3);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.maxPolarAngle = THREE.MathUtils.degToRad(60);
controls.minDistance = 0.5;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(1.0, 1.0);

function animate() {
  setTimeout(function () {
    requestAnimationFrame(animate);
  }, 1000 / 60);

  simulationMat.uniforms.timeStep.value = timeStep;
  fluxMat.uniforms.timeStep.value = timeStep;

  controls.update();

  // Raycast
  raycaster.setFromCamera(pointer, mainCamera);
  const intersects = raycaster.intersectObject(battlefieldMesh);
  controls.enabled = intersects.length > 0;
  if (intersects.length > 0 && intersects[0].uv) {
    simulationQuad.material.uniforms.brushLocation.value = intersects[0].uv;
  }

  // Simulation
  for (let i = 0; i < 15; i++) {
    renderer.setRenderTarget(fluxRTA);
    fluxQuad.render(renderer);

    renderer.setRenderTarget(null);
    renderer.clear();

    renderer.setRenderTarget(simulationRTA);
    simulationQuad.render(renderer);

    renderer.setRenderTarget(null);
    renderer.clear();

    // Swap ping pong buffers
    let tempFluxRT = fluxRTA;
    fluxRTA = fluxRTB;
    fluxRTB = tempFluxRT;
    fluxMat.uniforms.prevFlux.value = fluxRTB.texture;

    let tempSimRT = simulationRTA;
    simulationRTA = simulationRTB;
    simulationRTB = tempSimRT;
    simulationMat.uniforms.prevSimulation.value = simulationRTB.texture;
  }
  renderer.render(mainScene, mainCamera);
}

canvas.addEventListener("pointermove", (event) => {
  const cRect = canvas.getBoundingClientRect();
  const canvasX = Math.round(event.clientX - cRect.left);
  const canvasY = Math.round(event.clientY - cRect.top);

  pointer.x = (canvasX / viewportSizes.width) * 2 - 1; // -1 to +1
  pointer.y = -(canvasY / viewportSizes.height) * 2 + 1;
});

window.addEventListener("resize", () => {
  const container = document.querySelector(".container");
  viewportSizes.width = container.clientWidth;
  viewportSizes.height = container.clientWidth * 0.5;

  mainCamera.aspect = viewportSizes.width / viewportSizes.height;
  mainCamera.updateProjectionMatrix();

  renderer.setSize(viewportSizes.width, viewportSizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function loadShader(url) {
  return fetch(url).then((data) => data.text());
}

animate();
