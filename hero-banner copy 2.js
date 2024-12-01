import { GUI } from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';

// Select the canvas element
const canvas = document.getElementById('shader-canvas');
const gl = canvas.getContext('webgl');

// Resize the canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

// Vertex Shader
const vertexShaderSource = `
attribute vec4 a_position;
void main() {
    gl_Position = a_position;
}
`;

// Fragment Shader
const fragmentShaderSource = `
precision highp float;

uniform vec2 iResolution; // Canvas resolution
uniform float iTime;      // Time in seconds
uniform vec4 iMouse;      // Mouse input (x, y, click state)
uniform vec3 iColor;      // Base color
uniform float roughness;  // Roughness (0.0 = smooth, 1.0 = rough)
uniform float metallic;   // Metallic property (0.0 = non-metal, 1.0 = metal)
uniform float clearcoat;  // Clearcoat intensity (0.0 = none, 1.0 = full)

mat2 rot(in float a) {
    return mat2(cos(a), sin(a), -sin(a), cos(a));
}

float de(vec3 p) {
    float de = length(p) - 5.0;
    de += (sin(p.x * 1.5 + iTime * 1.0) * 0.5 + 0.5) * 0.2;
    de += (sin(p.y * 1.5 + iTime * 1.5) * 0.5 + 0.5) * 0.2;
    de += (sin(p.z * 3.5 + iTime * 2.5) * 0.5 + 0.5) * 0.2;
    de += (cos(length(p.xy) * 2.0 + iTime) * 0.5 + 0.5) * 0.1;
    return de;
}

vec3 normal(vec3 p) {
    float h = 0.001; // Smaller offset for higher precision
    return normalize(vec3(
        de(p + vec3(h, 0.0, 0.0)) - de(p - vec3(h, 0.0, 0.0)),
        de(p + vec3(0.0, h, 0.0)) - de(p - vec3(0.0, h, 0.0)),
        de(p + vec3(0.0, 0.0, h)) - de(p - vec3(0.0, 0.0, h))
    ));
}

vec3 calculateLighting(
    vec3 normal, vec3 viewDir, vec3 lightDir, vec3 lightColor, float lightIntensity
) {
    normal = normalize(normal);
    lightDir = normalize(lightDir);
    viewDir = normalize(viewDir);

    // Diffuse component
    float diffuseStrength = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = lightColor * diffuseStrength * lightIntensity;

    // Specular component (Phong model)
    float rough = max(roughness, 0.001); // Use a local variable
    float shininess = pow(2.0, (1.0 - rough) * 8.0); // Adjusted mapping
    vec3 reflectDir = reflect(-lightDir, normal);
    float specularStrength = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = specularStrength * lightColor * lightIntensity;

    // Combine metallic and non-metallic properties
    vec3 finalColor = mix(diffuse, specular, metallic);
    return finalColor;
}

float ambientOcclusion(vec3 p, vec3 n) {
    float occlusion = 0.0;
    float scale = 0.1;
    for (int i = 0; i < 5; i++) {
        float dist = de(p + n * scale);
        occlusion += max(scale - dist, 0.0);
        scale *= 2.0;
    }
    return 1.0 - clamp(occlusion, 0.0, 1.0);
}

float softShadow(vec3 ro, vec3 rd) {
    float res = 1.0;
    float t = 0.01;
    for (int i = 0; i < 32; i++) {
        float d = de(ro + rd * t);
        res = min(res, 10.0 * d / t);
        t += clamp(d, 0.02, 0.1);
        if (d < 0.001) break;
    }
    return clamp(res, 0.0, 1.0);
}

vec3 subsurfaceScattering(vec3 lightDir, vec3 norm) {
    float scatter = max(dot(lightDir, -norm), 0.0);
    return vec3(0.949, 0.369, 0.478) * pow(scatter, 2.0); // Warm subsurface color
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy * 2.0 - 1.0;
    uv.y *= iResolution.y / iResolution.x;

    vec3 from = vec3(-50.0, 0.0, 0.0);
    vec3 dir = normalize(vec3(uv * 0.2, 1.0));
    dir.xz *= rot(3.1415 * 0.5);

    vec2 mouse = (iMouse.xy / iResolution.xy - 0.5) * 0.5;
    if (iMouse.z < 1.0) mouse = vec2(0.0);

    mat2 rotxz = rot(iTime * 0.0652 + mouse.x * 5.0);
    mat2 rotxy = rot(0.3 - mouse.y * 5.0);

    from.xy *= rotxy;
    from.xz *= rotxz;
    dir.xy *= rotxy;
    dir.xz *= rotxz;

    float totdist = 0.0;
    vec3 norm = vec3(0.0);
    vec3 p = from;
    bool hit = false;

    // Lighting parameters
    vec3 light1Dir = normalize(vec3(-1.0, -1.0, 2.0)); // Original light 1
    vec3 light1Color = vec3(0.851, 0.016, 0.086); // White
    float light1Intensity = 0.4;

    vec3 light2Dir = normalize(vec3(1.0, 1.0, -2.0)); // Original light 2
    vec3 light2Color = vec3(0.949, 0.369, 0.478); // Soft blue
    float light2Intensity = 0.4;

    vec3 light3Dir = normalize(vec3(0.0, -1.0, 0.0)); // Light from top
    vec3 light3Color = vec3(0.937, 0.686, 0.643); // Warm orange
    float light3Intensity = 0.3;

    vec3 light4Dir = normalize(vec3(0.0, 1.0, 0.0)); // Light from bottom
    vec3 light4Color = vec3(0.937, 0.686, 0.643); // Cool cyan
    float light4Intensity = 0.3;

    vec3 ambientLightColor = vec3(1.0, 1.0, 1.0); // Slightly bluish ambient light
    float ambientLightIntensity = 0.2;

    for (int i = 0; i < 200; i++) {
        p = from + totdist * dir;
        float dist = de(p);
        totdist += dist;
        if (dist < 0.005) {
            norm = normal(p);
            hit = true;
            break;
        }
    }

    vec3 color = vec3(0.0);

    if (hit) {
        vec3 viewDir = normalize(-dir);

        float ao = ambientOcclusion(p, norm);

        float fresnel = pow(1.0 - max(dot(viewDir, norm), 0.0), 3.0);
        color = mix(color, vec3(1.0), fresnel * 0.2); // Blend with white

        float shadow = softShadow(from, dir);
        color *= shadow;

        // Lighting contributions
        vec3 lighting1 = calculateLighting(norm, viewDir, light1Dir, light1Color, light1Intensity);
        vec3 lighting2 = calculateLighting(norm, viewDir, light2Dir, light2Color, light2Intensity);
        vec3 lighting3 = calculateLighting(norm, viewDir, light3Dir, light3Color, light3Intensity);
        vec3 lighting4 = calculateLighting(norm, viewDir, light4Dir, light4Color, light4Intensity);
        vec3 ambientLighting = ambientLightColor * ambientLightIntensity;

        vec3 sss = subsurfaceScattering(dir, norm);
        color += sss * 0.3; // Blend with base color

        // Combine all lighting
        vec3 totalLighting = lighting1 + lighting2 + lighting3 + lighting4 + ambientLighting;

        // Apply clearcoat
        if (clearcoat > 0.0) {
            vec3 clearcoatDir = reflect(-viewDir, norm);
            float clearcoatSpec = pow(max(dot(viewDir, clearcoatDir), 0.0), 128.0);
            totalLighting = mix(totalLighting, vec3(1.0), clearcoat * clearcoatSpec);
        }

        // Apply consistent material properties
        color = (totalLighting + sss) * shadow;
        color = mix(color, vec3(1.0), fresnel * 0.2);

        fragColor = vec4(color, 1.0);
    } else {
        // Set background color when no object is hit
        vec3 backgroundColor = vec3(0.937, 0.686, 0.643); // Light blue
        fragColor = vec4(backgroundColor, 1.0);
}
 
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

// Shader Compilation Helper
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader Compilation Error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Program Creation Helper
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader); // Attach the vertex shader
    gl.attachShader(program, fragmentShader); // Attach the fragment shader
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program Linking Error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

// Create Shaders and Program
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);

// Use the Program
gl.useProgram(program);

// Set up Geometry
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1,
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// Uniform Locations
const resolutionLocation = gl.getUniformLocation(program, 'iResolution');
const timeLocation = gl.getUniformLocation(program, 'iTime');
const mouseLocation = gl.getUniformLocation(program, 'iMouse');
const colorLocation = gl.getUniformLocation(program, 'iColor');
const roughnessLocation = gl.getUniformLocation(program, 'roughness');
const metallicLocation = gl.getUniformLocation(program, 'metallic');
const clearcoatLocation = gl.getUniformLocation(program, 'clearcoat');

// Define initial parameters
const params = {
    baseColor: [255, 255, 255], // Default to red
    roughness: 0.0,
    metallic: 0.0,
    clearcoat: 0.0
};

// Set initial uniform values
gl.uniform3fv(colorLocation, params.baseColor.map(c => c / 255));
gl.uniform1f(roughnessLocation, params.roughness);
gl.uniform1f(metallicLocation, params.metallic);
gl.uniform1f(clearcoatLocation, params.clearcoat);

// Animation Loop
function render(time) {
    resizeCanvas();
    time *= 0.001; // Convert to seconds
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, time);
    gl.uniform4f(mouseLocation, 0.0, 0.0, 0.0, 0.0); // Replace with actual mouse input if needed
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}

// Start Rendering
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
requestAnimationFrame(render);