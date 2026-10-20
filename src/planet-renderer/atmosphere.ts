import * as THREE from 'three';

// Atmosfera w dwóch warstwach:
// 1) poświata ZA krawędzią planety — jasność zależy od tego, jak blisko powierzchni
//    przechodzi promień widzenia, więc zanika płynnie do zera na zewnętrznym brzegu
//    (poprzednia wersja liczyła fresnel na tylnej ściance sfery, co dawało jasny
//    pierścień z ostrą krawędzią — „aureolę”);
// 2) delikatna mgiełka NA tarczy planety, gęstniejąca przy krawędzi.
// Obie warstwy słabną po nocnej stronie.

export const ATMOSPHERE_RADIUS = 1.075;
const HAZE_RADIUS = 1.012;

const vertexShader = /* glsl */ `
  varying vec3 vViewPos;
  varying vec3 vCenter;
  varying vec3 vNormal;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    vCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const glowFragment = /* glsl */ `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float planetRadius;
  uniform float atmosphereRadius;
  uniform vec3 lightDir;
  varying vec3 vViewPos;
  varying vec3 vCenter;
  void main() {
    vec3 ray = normalize(vViewPos);
    vec3 closest = ray * dot(vCenter, ray) - vCenter;
    float dist = length(closest);
    float h = clamp((dist - planetRadius) / (atmosphereRadius - planetRadius), 0.0, 1.0);
    float glow = pow(1.0 - h, 2.4) * (1.0 - h);
    float lit = smoothstep(-0.45, 0.55, dot(closest / max(dist, 1e-4), lightDir));
    float a = glow * intensity * 0.6 * (0.18 + 0.82 * lit);
    gl_FragColor = vec4(glowColor, a);
  }
`;

const hazeFragment = /* glsl */ `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform vec3 lightDir;
  varying vec3 vViewPos;
  varying vec3 vNormal;
  void main() {
    float facing = clamp(dot(vNormal, normalize(-vViewPos)), 0.0, 1.0);
    // Mgiełka gęstnieje ku krawędzi, ale wygasa tuż przy samej sylwetce,
    // żeby razem z poświatą nie tworzyć jasnej, ostrej linii.
    float rim = pow(1.0 - facing, 2.2) * smoothstep(0.0, 0.12, facing);
    float lit = smoothstep(-0.25, 0.6, dot(vNormal, lightDir));
    float a = rim * intensity * 0.42 * lit;
    gl_FragColor = vec4(glowColor, a);
  }
`;

export function createAtmosphere(color: string, intensity: number, lightDir: THREE.Vector3): THREE.Mesh[] {
  const common = {
    glowColor: { value: new THREE.Color(color) },
    intensity: { value: intensity },
    lightDir: { value: lightDir.clone().normalize() },
  };

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(ATMOSPHERE_RADIUS, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        ...common,
        planetRadius: { value: 1 },
        atmosphereRadius: { value: ATMOSPHERE_RADIUS },
      },
      vertexShader,
      fragmentShader: glowFragment,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.name = 'atmosphere';

  const haze = new THREE.Mesh(
    new THREE.SphereGeometry(HAZE_RADIUS, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: common,
      vertexShader,
      fragmentShader: hazeFragment,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  haze.name = 'haze';
  return [glow, haze];
}
