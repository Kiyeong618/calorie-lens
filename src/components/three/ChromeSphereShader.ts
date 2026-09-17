import { AdditiveBlending, Color, DoubleSide, FrontSide, ShaderMaterial } from "three";

const commonVertex = /* glsl */ `
  attribute vec3 aScatter;
  uniform float uTime;
  uniform float uMorph;
  uniform float uScatter;
  varying vec3 vWorld;
  varying vec3 vObject;
  varying vec3 vNormal;
  varying float vNoise;

  float field(vec3 p) {
    float a = sin(p.x * 1.72 + uTime * .34) * sin(p.y * 1.46 - uTime * .21);
    float b = sin(p.z * 2.08 + p.x * .74 - uTime * .18);
    float c = cos((p.x + p.y - p.z) * 1.18 + uTime * .27);
    return a * .48 + b * .31 + c * .21;
  }

  vec3 deformPoint(vec3 source) {
    vec3 direction = normalize(source);
    float noiseValue = field(direction * 2.2);
    float largeForm = sin(direction.y * 2.6 + uTime * .16) * .5 +
      cos(direction.x * 2.2 - direction.z * 1.6) * .5;
    float displacement = (noiseValue * .34 + largeForm * .12) * uMorph;
    vec3 p = source + direction * displacement;
    p.x *= 1.0 + uMorph * .12;
    p.y *= 1.0 - uMorph * .055;
    p += aScatter * uScatter;
    return p;
  }

  void main() {
    vec3 direction = normalize(position);
    float noiseValue = field(direction * 2.2);
    vec3 p = deformPoint(position);
    vec3 helper = abs(direction.y) > .92 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 tangent = normalize(cross(helper, direction));
    vec3 bitangent = normalize(cross(direction, tangent));
    float epsilon = .035;
    vec3 tangentPoint = deformPoint(position + tangent * epsilon);
    vec3 bitangentPoint = deformPoint(position + bitangent * epsilon);
    vec3 smoothNormal = normalize(cross(tangentPoint - p, bitangentPoint - p));
    if (dot(smoothNormal, direction) < 0.0) smoothNormal *= -1.0;
    vNormal = normalize(normalMatrix * smoothNormal);
    vNoise = noiseValue;
    vObject = p;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const surfaceFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uGlass;
  uniform float uTime;
  uniform vec3 uCobalt;
  varying vec3 vWorld;
  varying vec3 vObject;
  varying vec3 vNormal;
  varying float vNoise;

  void main() {
    vec3 normal = normalize(vNormal);
    if (!gl_FrontFacing) normal *= -1.0;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float facing = clamp(dot(normal, viewDir), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 3.1);
    vec3 reflected = reflect(-viewDir, normal);

    float graphiteBand = .5 + .5 * sin(reflected.y * 7.2 + reflected.x * 3.6 + vNoise * 3.4);
    float movingBand = .5 + .5 * sin(reflected.x * 9.0 - reflected.z * 5.8 + vNoise * 2.2 + uTime * .22);
    vec3 graphite = mix(vec3(.012, .014, .017), vec3(.34, .37, .42), graphiteBand);
    graphite = mix(graphite, vec3(.72, .76, .82), pow(movingBand, 9.0) * .72);
    graphite += vec3(.14, .17, .24) * fresnel;
    graphite += uCobalt * pow(fresnel, 1.5) * .12;

    vec3 glass = mix(vec3(.3, .38, .6), vec3(.62, .76, 1.0), fresnel);
    glass += vec3(.88, .94, 1.0) * pow(facing, 24.0) * .48;
    glass += vec3(.13, .18, .3) * pow(.5 + .5 * sin(vNoise * 5.0 + uTime * .18), 6.0);
    glass += uCobalt * (.04 + fresnel * .12);

    vec3 color = mix(graphite, glass, uGlass);
    float alpha = uOpacity * mix(1.0, .16 + fresnel * .58, uGlass);
    gl_FragColor = vec4(color, alpha);
  }
`;

const lineFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vNoise;
  void main() {
    vec3 lineColor = mix(vec3(.18, .21, .26), vec3(.78, .84, .94), .5 + vNoise * .35);
    gl_FragColor = vec4(lineColor, uOpacity * .82);
  }
`;

const pointsVertex = /* glsl */ `
  attribute vec3 aScatter;
  uniform float uTime;
  uniform float uMorph;
  uniform float uScatter;
  uniform float uPointSize;
  varying float vDepth;

  float field(vec3 p) {
    float a = sin(p.x * 1.72 + uTime * .34) * sin(p.y * 1.46 - uTime * .21);
    float b = sin(p.z * 2.08 + p.x * .74 - uTime * .18);
    float c = cos((p.x + p.y - p.z) * 1.18 + uTime * .27);
    return a * .48 + b * .31 + c * .21;
  }

  void main() {
    vec3 direction = normalize(position);
    float n = field(direction * 2.2);
    vec3 p = position + direction * n * .34 * uMorph;
    p.x *= 1.0 + uMorph * .12;
    p.y *= 1.0 - uMorph * .055;
    p += aScatter * uScatter;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = clamp((-mv.z - 3.0) / 8.0, 0.0, 1.0);
    gl_PointSize = uPointSize * (8.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const pointsFragment = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uCobalt;
  varying float vDepth;
  void main() {
    vec2 p = gl_PointCoord - .5;
    float circle = 1.0 - smoothstep(.32, .5, length(p));
    vec3 color = mix(vec3(.72, .78, .9), uCobalt, vDepth * .42);
    gl_FragColor = vec4(color, circle * uOpacity);
  }
`;

const uniforms = () => ({
  uTime: { value: 0 },
  uMorph: { value: 0 },
  uScatter: { value: 0 },
  uOpacity: { value: 0 },
  uGlass: { value: 0 },
  uPointSize: { value: 3.2 },
  uCobalt: { value: new Color("#5661ff") },
});

export function createChromeSurfaceMaterial(glass = false) {
  const material = new ShaderMaterial({
    vertexShader: commonVertex,
    fragmentShader: surfaceFragment,
    uniforms: uniforms(),
    transparent: true,
    depthWrite: !glass,
    side: glass ? DoubleSide : FrontSide,
  });
  material.uniforms.uGlass.value = glass ? 1 : 0;
  return material;
}

export function createChromeLineMaterial() {
  return new ShaderMaterial({
    vertexShader: commonVertex,
    fragmentShader: lineFragment,
    uniforms: uniforms(),
    transparent: true,
    depthWrite: false,
    wireframe: true,
  });
}

export function createChromePointMaterial() {
  return new ShaderMaterial({
    vertexShader: pointsVertex,
    fragmentShader: pointsFragment,
    uniforms: uniforms(),
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}
