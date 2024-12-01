// Ensure this file is hero-banner.js and is included in your HTML with type="module"

import * as THREE from 'three';

// Get the container element
const container = document.getElementById('webgl-overlay');

// Create the renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});

// Set the renderer size to the window size initially
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Create the scene
const scene = new THREE.Scene();

// Create an orthographic camera covering NDC from -1 to 1
const camera = new THREE.OrthographicCamera(
  -1,  // left
  1,   // right
  1,   // top
  -1,  // bottom
  -1,  // near
  1    // far
);

// Get the video element and create a texture
const video = document.querySelector('.background-video');
const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;

// Define uniforms
const uniforms = {
  videoTexture: { value: videoTexture },
  mouse: { value: new THREE.Vector2(0.5, 0.5) },
  time: { value: 0 },
  resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
};

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Fragment shader
const fragmentShader = `
  uniform sampler2D videoTexture;
  uniform vec2 mouse;
  uniform float time;
  uniform vec2 resolution;
  varying vec2 vUv;

  // Simplex noise functions
  vec3 mod289(vec3 x) {
    return x - floor(x / 289.0) * 289.0;
  }

  vec2 mod289(vec2 x) {
    return x - floor(x / 289.0) * 289.0;
  }

  vec3 permute(vec3 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  float simplexNoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,  // (3.0 - sqrt(3.0)) / 6.0
      0.366025403784439,  // 0.5 * (sqrt(3.0) - 1.0)
      -0.577350269189626, // -1.0 + 2.0 * C.x
      0.024390243902439   // 1.0 / 41.0
    );

    // First corner
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    // Other corners
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    // Permutations
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                   + i.x + vec3(0.0, i1.x, 1.0));

    vec3 m = max(0.5 - vec3(
      dot(x0, x0),
      dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)
    ), 0.0);

    m = m * m;
    m = m * m;

    // Gradients
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalize gradients implicitly by scaling m
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    // Compute final noise value at P
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = vUv;

    // Calculate the aspect ratio
    float aspect = resolution.x / resolution.y;

    // Adjust the UV coordinates for aspect ratio correction
    vec2 diff = uv - mouse;
    diff.x *= aspect;
    float distToMouse = length(diff);

    float mouseEffect = smoothstep(0.25, 0.1, distToMouse);

    // Turbulence calculation
    vec2 turbulence = vec2(
      simplexNoise(uv * 4.0 + time * 0.1),
      simplexNoise(uv * 2.5 - time * 0.1)
    ) * 1.0;

    turbulence += vec2(
      simplexNoise(uv * 2.5 + time * 0.05),
      simplexNoise(uv * 4.0 - time * 0.05)
    ) * 0.7;

    uv += turbulence * (0.1 - mouseEffect);

    vec4 color = texture2D(videoTexture, uv);

    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 red = vec3(1.0, 0.9, 0.9);
    vec3 blendedColor = mix(white, red, mouseEffect);

    color.rgb = color.rgb * (1.0 - mouseEffect) + blendedColor * mouseEffect;

    gl_FragColor = color;
  }
`;

// Create the shader material
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
});

// Create the plane geometry
const geometry = new THREE.PlaneGeometry(2, 2);
const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// Mouse interaction variables
let targetMouseX = 0.5;
let targetMouseY = 0.5;
let currentMouseX = 0.5;
let currentMouseY = 0.5;
const smoothness = 0.05;

// Mouse move event
window.addEventListener('mousemove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  targetMouseX = (event.clientX - rect.left) / rect.width;
  targetMouseY = 1 - ((event.clientY - rect.top) / rect.height);
});

// Touch events
window.addEventListener('touchstart', updateTouchPosition);
window.addEventListener('touchmove', updateTouchPosition);

function updateTouchPosition(event) {
  if (event.touches.length > 0) {
    const touch = event.touches[0];
    const rect = renderer.domElement.getBoundingClientRect();
    targetMouseX = (touch.clientX - rect.left) / rect.width;
    targetMouseY = 1 - ((touch.clientY - rect.top) / rect.height);
  }
}

// Update mouse position
function updateMousePosition() {
  currentMouseX += (targetMouseX - currentMouseX) * smoothness;
  currentMouseY += (targetMouseY - currentMouseY) * smoothness;
  uniforms.mouse.value.set(currentMouseX, currentMouseY);
}

// Handle window resizing
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update uniforms
  uniforms.time.value += 0.016; // Approximate time increment (60 FPS)
  updateMousePosition();

  // Update the video texture
  if (video.readyState >= video.HAVE_CURRENT_DATA) {
    videoTexture.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

animate();