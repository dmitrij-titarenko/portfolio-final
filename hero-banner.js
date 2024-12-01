import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { SSAARenderPass } from 'three/addons/postprocessing/SSAARenderPass.js';

function init() {
    // Get the canvas element
    const canvas = document.getElementById('shader-canvas');

    // Set up the renderer
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth / 2, window.innerHeight / 2, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0)); 
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setDithering = true;

    // Set up the scene
    const scene = new THREE.Scene();

    // Set up the camera
    const camera = new THREE.OrthographicCamera(
        -1, 1, 1, -1, 0.1, 10
    );
    camera.position.z = 1;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.material.uniforms['resolution'].value.set(
      1 / (window.innerWidth * renderer.getPixelRatio()),
      1 / (window.innerHeight * renderer.getPixelRatio())
    );
    composer.addPass(fxaaPass);

    // Full-Screen Quad Geometry
    const geometry = new THREE.PlaneGeometry(2, 2);

    // ShaderMaterial with your shader code
    const material = new THREE.ShaderMaterial({
        uniforms: {
            iTime: { value: 0.0 },
            iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            iMouse: { value: new THREE.Vector2(0, 0) },
            iAmplitude: { value: 1.0 }, // Default amplitude
            iFrequency: { value: 1.0 }, // Default frequency
            iColor: { value: new THREE.Color(0.0, 0.0, 0.0) }, // Default black
        },
        vertexShader: `
            void main() {
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float iTime;
            uniform vec2 iResolution;
            uniform vec2 iMouse;
            uniform float iAmplitude;
            uniform float iFrequency;
            uniform vec3 iColor; // New uniform for dynamic color
            
            const float PI=3.14159265359;

            const float TWO_PI=6.28318530718;

            mat2 rotation2d(float angle){
                float s=sin(angle);
                float c=cos(angle);
                
                return mat2(
                    c,-s,
                    s,c
                );
            }

            mat4 rotation3d(vec3 axis,float angle){
                axis=normalize(axis);
                float s=sin(angle);
                float c=cos(angle);
                float oc=1.-c;
                
                return mat4(
                    oc*axis.x*axis.x+c,oc*axis.x*axis.y-axis.z*s,oc*axis.z*axis.x+axis.y*s,0.,
                    oc*axis.x*axis.y+axis.z*s,oc*axis.y*axis.y+c,oc*axis.y*axis.z-axis.x*s,0.,
                    oc*axis.z*axis.x-axis.y*s,oc*axis.y*axis.z+axis.x*s,oc*axis.z*axis.z+c,0.,
                    0.,0.,0.,1.
                );
            }

            vec2 rotate(vec2 v,float angle){
                return rotation2d(angle)*v;
            }

            vec3 rotate(vec3 v,vec3 axis,float angle){
                return(rotation3d(axis,angle)*vec4(v,1.)).xyz;
            }

            vec3 mod289(vec3 x)
            {
                return x-floor(x*(1./289.))*289.;
            }

            vec4 mod289(vec4 x)
            {
                return x-floor(x*(1./289.))*289.;
            }

            vec4 permute(vec4 x)
            {
                return mod289(((x*34.)+1.)*x);
            }

            vec4 taylorInvSqrt(vec4 r)
            {
                return 1.79284291400159-.85373472095314*r;
            }

            vec3 fade(vec3 t){
                return t*t*t*(t*(t*6.-15.)+10.);
            }

            // Classic Perlin noise
            float cnoise(vec3 P)
            {
                vec3 Pi0=floor(P);// Integer part for indexing
                vec3 Pi1=Pi0+vec3(1.);// Integer part + 1
                Pi0=mod289(Pi0);
                Pi1=mod289(Pi1);
                vec3 Pf0=fract(P);// Fractional part for interpolation
                vec3 Pf1=Pf0-vec3(1.);// Fractional part - 1.0
                vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
                vec4 iy=vec4(Pi0.yy,Pi1.yy);
                vec4 iz0=Pi0.zzzz;
                vec4 iz1=Pi1.zzzz;
                
                vec4 ixy=permute(permute(ix)+iy);
                vec4 ixy0=permute(ixy+iz0);
                vec4 ixy1=permute(ixy+iz1);
                
                vec4 gx0=ixy0*(1./7.);
                vec4 gy0=fract(floor(gx0)*(1./7.))-.5;
                gx0=fract(gx0);
                vec4 gz0=vec4(.5)-abs(gx0)-abs(gy0);
                vec4 sz0=step(gz0,vec4(0.));
                gx0-=sz0*(step(0.,gx0)-.5);
                gy0-=sz0*(step(0.,gy0)-.5);
                
                vec4 gx1=ixy1*(1./7.);
                vec4 gy1=fract(floor(gx1)*(1./7.))-.5;
                gx1=fract(gx1);
                vec4 gz1=vec4(.5)-abs(gx1)-abs(gy1);
                vec4 sz1=step(gz1,vec4(0.));
                gx1-=sz1*(step(0.,gx1)-.5);
                gy1-=sz1*(step(0.,gy1)-.5);
                
                vec3 g000=vec3(gx0.x,gy0.x,gz0.x);
                vec3 g100=vec3(gx0.y,gy0.y,gz0.y);
                vec3 g010=vec3(gx0.z,gy0.z,gz0.z);
                vec3 g110=vec3(gx0.w,gy0.w,gz0.w);
                vec3 g001=vec3(gx1.x,gy1.x,gz1.x);
                vec3 g101=vec3(gx1.y,gy1.y,gz1.y);
                vec3 g011=vec3(gx1.z,gy1.z,gz1.z);
                vec3 g111=vec3(gx1.w,gy1.w,gz1.w);
                
                vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
                g000*=norm0.x;
                g010*=norm0.y;
                g100*=norm0.z;
                g110*=norm0.w;
                vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
                g001*=norm1.x;
                g011*=norm1.y;
                g101*=norm1.z;
                g111*=norm1.w;
                
                float n000=dot(g000,Pf0);
                float n100=dot(g100,vec3(Pf1.x,Pf0.yz));
                float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));
                float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
                float n001=dot(g001,vec3(Pf0.xy,Pf1.z));
                float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
                float n011=dot(g011,vec3(Pf0.x,Pf1.yz));
                float n111=dot(g111,Pf1);
                
                vec3 fade_xyz=fade(Pf0);
                vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
                vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);
                float n_xyz=mix(n_yz.x,n_yz.y,fade_xyz.x);
                return 2.2*n_xyz;
            }

            float pow5(const in float v){
                float v2=v*v;
                return v2*v2*v;
            }

            vec3 schlick(const in vec3 f0,const in float f90,const in float VoH){
                float f=pow5(1.-VoH);
                return f+f0*(f90-f);
            }

            vec3 fresnel(vec3 f0,vec3 normal,vec3 view){
                return schlick(f0,1.,dot(view,normal));
            }

            float sdSphere(vec3 p,float r)
            {
                return length(p)-r;
            }

            float opUnion(float d1,float d2)
            {
                return min(d1,d2);
            }

            vec2 opUnion(vec2 d1,vec2 d2)
            {
                return(d1.x<d2.x)?d1:d2;
            }

            vec3 distort(vec3 p){
                float frequency=1.7;
                float offset=cnoise(p/frequency+iTime*.5);
                float t=(p.y+offset)*PI*12.;
                float noise=(sin(t)*p.x+cos(t)*p.z)*2.;
                p+=noise*.01;
                return p;
            }

            vec2 map(vec3 p){
                p-=vec3(0.,0.,-2.);
                
                // orbit
                vec2 mouse=iMouse.xy/iResolution.xy;
                p.yz=rotate(p.yz,-mouse.y*PI+1.);
                p.xz=rotate(p.xz,-mouse.x*TWO_PI);
                
                p=distort(p);
                
                vec2 d=vec2(1e10,0.);
                float d1=sdSphere(p,1.5);
                d=opUnion(d,vec2(d1,2.));
                return d*.5;
            }

            vec3 calcNormal(in vec3 p)
            {
                const float h=.0001;
                const vec2 k=vec2(1,-1);
                return normalize(k.xyy*map(p+k.xyy*h).x+
                k.yyx*map(p+k.yyx*h).x+
                k.yxy*map(p+k.yxy*h).x+
                k.xxx*map(p+k.xxx*h).x);
            }

            vec3 render(vec2 uv){
                vec3 col = iColor; // Use the dynamic color
                
                uv=(uv-.5)*2.;
                uv.x*=iResolution.x/iResolution.y;
                
                vec3 ro=vec3(0.,0.,1.);
                vec3 rd=normalize(vec3(uv,0.)-ro);
                
                float depth=0.;
                for(int i=0;i<64;i++){
                    vec3 p=ro+rd*depth;
                    vec2 t=map(p);
                    float d=t.x;
                    float m=t.y;
                    depth+=d;
                    
                    if(d<.01){
                        // col=vec3(1.);
                        vec3 normal=calcNormal(p);
                        // col=normal;
                        
                        // fresnel
                        vec3 viewDir=normalize(ro-p);
                        float smoothDepth = smoothstep(0.0, 1.0, depth / 10.0); // Normalize depth and apply smoothstep
                        col = mix(col, fresnel(vec3(0.0,0.0,0.0), normal, viewDir), smoothDepth);
                        
                        break;
                    }
                }
                
                return col;
            }

            vec3 getSceneColor(vec2 fragCoord){
                vec2 uv=fragCoord/iResolution.xy;
                vec3 col=render(uv);
                return col;
            }

            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
                vec3 col = getSceneColor(fragCoord);
                fragColor = vec4(col, 1.0);
            }
                        
            void main() {
                vec4 fragColor;
                mainImage(fragColor, gl_FragCoord.xy);
                gl_FragColor = fragColor;
            }
        `,
    });

    // Create the mesh
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);
    
    // Variables for smoother mouse tracking
const targetMouse = new THREE.Vector2(0, 0);
const currentMouse = new THREE.Vector2(0, 0);
const smoothingFactor = 0.01; // Adjust this to control the smoothing (lower values = smoother, higher = snappier)

// Handle mouse movement
document.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    targetMouse.set(
        (event.clientX - rect.left) / rect.width, // Normalize to 0-1
        1 - (event.clientY - rect.top) / rect.height // Normalize to 0-1 and invert Y-axis
    );
});

    window.addEventListener('resize', () => {
      composer.setSize(window.innerWidth / 2, window.innerHeight / 2);
      fxaaPass.material.uniforms['resolution'].value.set(
          1 / (window.innerWidth / 2),
          1 / (window.innerHeight / 2)
      );
  });

  // Reference the material and the color uniform
// Reference the material and the color uniforms
const colorUniform = material.uniforms.iColor; // Current color
const targetColor = new THREE.Color(0.0, 0.0, 0.0); // Target color
const lerpFactor = 0.04; // Adjust for smoothing (0.1 = slow, 1.0 = instant)

// Map selected color names to RGB values
const colorMap = {
    black: new THREE.Color(0.0, 0.0, 0.0),
    purple: new THREE.Color(0.1, 0.05, 0.1),
    navy: new THREE.Color(0.0, 0.0, 0.1),
    burgundy: new THREE.Color(0.1, 0.0, 0.0),
};

// Add event listener for color picker menu
const menuItems = document.querySelectorAll('.menu-item');
menuItems.forEach((item) => {
    item.addEventListener('click', () => {
        const selectedColor = item.querySelector('span:first-child').textContent;
        const newColor = colorMap[selectedColor] || new THREE.Color(0.0, 0.0, 0.0); // Default to black
        targetColor.copy(newColor); // Set the target color
    });
});

  // Animation loop
  let lastTime = 0;
  const speedFactor = 0.3; // Adjust this value to control speed (e.g., 0.5 is slower, 2.0 is faster)
  function animate(time) {
    // Update time uniform
    material.uniforms.iTime.value = time / 1000 * speedFactor;

    colorUniform.value.lerp(targetColor, lerpFactor);

    // Smoothly interpolate currentMouse towards targetMouse
    currentMouse.lerp(targetMouse, smoothingFactor);

    // Update the shader with smoothed mouse position
    material.uniforms.iMouse.value.set(
        currentMouse.x * window.innerWidth, // Scale back to canvas size
        currentMouse.y * window.innerHeight
    );

    // Render the scene
    composer.render();
    requestAnimationFrame(animate);
}

  animate();

}

// Initialize
window.addEventListener('DOMContentLoaded', init);