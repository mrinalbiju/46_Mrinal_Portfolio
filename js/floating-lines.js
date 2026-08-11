/* Site-wide background (fixed behind the whole page, not just the
   hero) — adapted from react-bits' FloatingLines
   (https://reactbits.dev), which ships as a React + Three.js
   component. This site has no React/build step, so the effect is
   re-implemented as a plain ES module driving the same WebGL shader.

   Two changes from the source component:
   - Colours are read live from --accent / --accent-glow (this
     site's own palette, css/style.css) instead of the component's
     stock pink/blue, and update automatically when the theme toggle
     flips data-theme.
   - The shader outputs alpha from line brightness instead of always
     opaque + mix-blend-mode, so it sits correctly over the paper
     background in both light and dark mode without a blend hack. */

import {
  Clock,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const vertexShader = `
precision highp float;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;
uniform vec2  parallaxOffset;

uniform vec3 lineGradient[2];

mat2 rotate(float r) { return mat2(cos(r), sin(r), -sin(r), cos(r)); }

vec3 getLineColor(float t) {
  return mix(lineGradient[0], lineGradient[1], clamp(t, 0.0, 1.0));
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv) {
  float time = iTime * animationSpeed;
  float x_movement = time * 0.1;
  float amp = sin(offset + time * 0.2) * 0.3;
  float y = sin(uv.x + offset + x_movement) * amp;

  vec2 d = screenUv - mouseUv;
  float influence = exp(-dot(d, d) * bendRadius);
  y += (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;

  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void main() {
  vec2 baseUv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;
  baseUv += parallaxOffset;

  vec2 mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
  mouseUv.y *= -1.0;

  vec3 col = vec3(0.0);

  for (int i = 0; i < bottomLineCount; ++i) {
    float fi = float(i);
    float t = fi / max(float(bottomLineCount - 1), 1.0);
    float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
    vec2 ruv = baseUv * rotate(angle);
    col += getLineColor(t) * wave(
      ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
      1.5 + 0.2 * fi, baseUv, mouseUv
    ) * 0.2;
  }

  for (int i = 0; i < middleLineCount; ++i) {
    float fi = float(i);
    float t = fi / max(float(middleLineCount - 1), 1.0);
    float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
    vec2 ruv = baseUv * rotate(angle);
    col += getLineColor(t) * wave(
      ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
      2.0 + 0.15 * fi, baseUv, mouseUv
    );
  }

  for (int i = 0; i < topLineCount; ++i) {
    float fi = float(i);
    float t = fi / max(float(topLineCount - 1), 1.0);
    float angle = topWavePosition.z * log(length(baseUv) + 1.0);
    vec2 ruv = baseUv * rotate(angle);
    ruv.x *= -1.0;
    col += getLineColor(t) * wave(
      ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
      1.0 + 0.2 * fi, baseUv, mouseUv
    ) * 0.1;
  }

  float a = clamp(max(max(col.r, col.g), col.b) * 1.7, 0.0, 0.65);
  gl_FragColor = vec4(col, a);
}
`;

function hexToVec3(hex) {
  const v = hex.trim().replace('#', '');
  return new Vector3(
    parseInt(v.slice(0, 2), 16) / 255,
    parseInt(v.slice(2, 4), 16) / 255,
    parseInt(v.slice(4, 6), 16) / 255
  );
}

/* Pull --accent and --accent-glow straight from the CSS custom
   properties (css/style.css, :root) so this always matches the
   headline shimmer (.hero h1 em) — one source of truth for the
   decorative accent duo, instead of a hardcoded hex duplicated in
   two files. Both stops need to stay reasonably bright: this shader
   blends lines additively and derives alpha from brightness, so a
   near-black stop (e.g. --ink) would just fade to invisible instead
   of reading as a dark line. */
function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue('--accent').trim() || '#8b2635';
  const glow = styles.getPropertyValue('--accent-glow').trim() || '#0ea5e9';
  return [hexToVec3(accent), hexToVec3(glow)];
}

export function initFloatingLines(container) {
  if (!container || !window.WebGLRenderingContext) return () => {};

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return () => {};
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new Vector3(1, 1, 1) },
    animationSpeed: { value: 0.5 },

    topLineCount: { value: 3 },
    middleLineCount: { value: 5 },
    bottomLineCount: { value: 3 },

    topLineDistance: { value: 0.09 },
    middleLineDistance: { value: 0.05 },
    bottomLineDistance: { value: 0.12 },

    topWavePosition: { value: new Vector3(10.0, 0.5, -0.4) },
    middleWavePosition: { value: new Vector3(5.0, 0.0, 0.2) },
    bottomWavePosition: { value: new Vector3(2.0, -0.7, 0.4) },

    iMouse: { value: new Vector2(-1000, -1000) },
    bendRadius: { value: 4.5 },
    bendStrength: { value: -0.6 },
    bendInfluence: { value: 0 },
    parallaxOffset: { value: new Vector2(0, 0) },

    lineGradient: { value: readThemeColors() }
  };

  function applyThemeColors() {
    const [c1, c2] = readThemeColors();
    uniforms.lineGradient.value[0].copy(c1);
    uniforms.lineGradient.value[1].copy(c2);
  }

  const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  scene.add(mesh);

  const clock = new Clock();
  const targetMouse = new Vector2(-1000, -1000);
  const currentMouse = new Vector2(-1000, -1000);
  let targetInfluence = 0;
  let currentInfluence = 0;
  const targetParallax = new Vector2(0, 0);
  const currentParallax = new Vector2(0, 0);
  const mouseDamping = 0.06;
  const parallaxStrength = 0.12;

  function setSize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    uniforms.iResolution.value.set(renderer.domElement.width, renderer.domElement.height, 1);
  }
  setSize();

  const ro = new ResizeObserver(setSize);
  ro.observe(container);

  function onPointerMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const dpr = renderer.getPixelRatio();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    targetMouse.set(x * dpr, (rect.height - y) * dpr);
    targetInfluence = 1;
    targetParallax.set(
      ((x - rect.width / 2) / rect.width) * parallaxStrength,
      -((y - rect.height / 2) / rect.height) * parallaxStrength
    );
  }
  function onPointerLeave() { targetInfluence = 0; }

  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerleave', onPointerLeave);

  const themeObserver = new MutationObserver(applyThemeColors);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let raf = 0;
  let active = true;
  function loop() {
    if (!active) return;
    uniforms.iTime.value = clock.getElapsedTime();

    currentMouse.lerp(targetMouse, mouseDamping);
    uniforms.iMouse.value.copy(currentMouse);
    currentInfluence += (targetInfluence - currentInfluence) * mouseDamping;
    uniforms.bendInfluence.value = currentInfluence;

    currentParallax.lerp(targetParallax, mouseDamping);
    uniforms.parallaxOffset.value.copy(currentParallax);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  loop();

  return function destroy() {
    active = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    themeObserver.disconnect();
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerleave', onPointerLeave);
    mesh.geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
  };
}

const heroBg = document.getElementById('hero-bg');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (heroBg && !reduceMotion) initFloatingLines(heroBg);
