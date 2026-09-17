import { Color, ShaderMaterial } from "three";
import type { DataLensData } from "./sceneMapping";

const vertexShader = /* glsl */ `
  attribute vec2 aParam;
  attribute float aMealIndex;
  attribute float aMealShare;
  attribute float aMealMargin;
  attribute float aFoodIndex;
  attribute float aFoodShare;
  attribute float aFoodMargin;
  attribute vec3 aMacroMix;

  uniform float uTime;
  uniform float uMealDepth;
  uniform float uFocus;
  uniform float uFood;
  uniform float uMacro;
  uniform float uFlatten;

  varying vec3 vWorldPosition;
  varying vec2 vParam;
  varying float vAlpha;
  varying float vLunch;
  varying float vMealIndex;
  varying float vMealMargin;
  varying float vFoodIndex;
  varying float vFoodMargin;
  varying vec3 vMacroMix;

  void main() {
    vec3 p = position;
    float lunch = 1.0 - step(.25, abs(aMealIndex - 1.0));
    float presence = smoothstep(.005, .04, aMealShare);
    float tension = sin(aParam.x * 2.6 + aParam.y * 1.8 + uTime * .18) * .012;
    p.z += tension * (1.0 - uMealDepth * .7);

    // Four meals become contiguous terraces on one specimen; no vertex group detaches.
    float terrace = presence * (.018 + aMealShare * .2);
    p.z += terrace * uMealDepth;
    p.z += lunch * uFocus * .035;
    p.z -= (1.0 - lunch) * uFocus * .008;

    // Food contribution becomes shallow relief inside the lunch terrace.
    float foodRelief = (.008 + aFoodShare * .085) * lunch;
    p.z += foodRelief * uFood;
    p.z = mix(p.z, p.z * .34, uFlatten);

    vParam = aParam;
    vLunch = lunch;
    vMealIndex = aMealIndex;
    vMealMargin = aMealMargin;
    vFoodIndex = aFoodIndex;
    vFoodMargin = aFoodMargin;
    vMacroMix = aMacroMix;
    vAlpha = mix(1.0, mix(.68, 1.0, lunch), uFocus) * mix(.4, 1.0, presence);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uPearl;
  uniform vec3 uProtein;
  uniform vec3 uCarbs;
  uniform vec3 uFat;
  uniform float uMealDepth;
  uniform float uFocus;
  uniform float uFood;
  uniform float uMacro;

  varying vec3 vWorldPosition;
  varying vec2 vParam;
  varying float vAlpha;
  varying float vLunch;
  varying float vMealIndex;
  varying float vMealMargin;
  varying float vFoodIndex;
  varying float vFoodMargin;
  varying vec3 vMacroMix;

  float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  vec2 foodCenter(float index) {
    if (index < .5) return vec2(-.02, .38);
    if (index < 1.5) return vec2(.4, .32);
    if (index < 2.5) return vec2(.08, .02);
    return vec2(.5, .02);
  }
  vec3 foodTint(float index) {
    if (index < .5) return vec3(.95, .91, .84);
    if (index < 1.5) return vec3(.82, .86, .87);
    if (index < 2.5) return vec3(.9, .87, .73);
    return vec3(.76, .82, .78);
  }

  void main() {
    vec3 normal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    if (!gl_FrontFacing) normal *= -1.0;
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = abs(dot(normal, viewDirection));
    float fresnel = pow(1.0 - facing, 2.3);
    float pearlShift = .5 + .5 * dot(normal, normalize(vec3(-.4, .7, .6)));
    float softBand = .5 + .5 * sin(vParam.x * 3.2 - vParam.y * 2.15 + normal.x * 2.0);
    vec3 warmPearl = mix(vec3(.19, .17, .15), uPearl, .48 + facing * .32);
    vec3 coolPearl = vec3(.24, .27, .31);
    vec3 color = mix(warmPearl, coolPearl, softBand * .18 + fresnel * .28);
    color += mix(vec3(.06, .08, .11), vec3(.22, .16, .12), pearlShift) * fresnel;
    color += vec3(.32, .3, .27) * pow(facing, 11.0);
    float glint = 1.0 - smoothstep(.018, .16, abs(vParam.y + vParam.x * .34 - .16));
    color += vec3(.32, .29, .25) * glint * (.12 + fresnel * .26);

    // Sparse contour lines make the object read as one surveyed terrain specimen.
    float terrain = length(vParam * vec2(.9, 1.08)) + sin(vParam.x * 4.0) * .035;
    float contourWave = abs(fract(terrain * 5.2) - .5);
    float contour = 1.0 - smoothstep(.455, .49, contourWave);
    color = mix(color, color * .72, contour * .18);

    float mealBoundary = (1.0 - smoothstep(.002, .025, vMealMargin)) * uMealDepth;
    color *= 1.0 - mealBoundary * .22;
    color += vec3(.68, .7, .72) * mealBoundary * .1;

    float foodBoundary = (1.0 - smoothstep(.002, .026, vFoodMargin)) * uFood * vLunch;
    color = mix(color, foodTint(vFoodIndex), uFood * vLunch * .11);
    color *= 1.0 - foodBoundary * .24;
    color += vec3(.78, .8, .8) * foodBoundary * .11;

    // Macro nutrients first read as tributaries running across the existing surface.
    vec2 center = foodCenter(vFoodIndex);
    vec2 hub = vec2(.14, .1);
    float proteinDistance = min(
      segmentDistance(vParam, center, hub),
      segmentDistance(vParam, hub, vec2(-.92, .3))
    );
    float carbsDistance = min(
      segmentDistance(vParam, center, hub),
      segmentDistance(vParam, hub, vec2(.88, .46))
    );
    float fatDistance = min(
      segmentDistance(vParam, center, hub),
      segmentDistance(vParam, hub, vec2(.58, -.76))
    );
    float proteinFlow = (1.0 - smoothstep(.014, .07, proteinDistance)) * vMacroMix.x;
    float carbsFlow = (1.0 - smoothstep(.014, .07, carbsDistance)) * vMacroMix.y;
    float fatFlow = (1.0 - smoothstep(.014, .07, fatDistance)) * vMacroMix.z;
    vec3 flowColor =
      uProtein * proteinFlow + uCarbs * carbsFlow + uFat * fatFlow;
    float flowStrength = clamp(proteinFlow + carbsFlow + fatFlow, 0.0, 1.0) * uMacro;
    color = mix(color, flowColor, flowStrength * (.86 + uMacro * .12));

    float alpha = vAlpha * (.78 + fresnel * .16 + foodBoundary * .06);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createDataLensMaterial(_data: DataLensData) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: true,
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uMealDepth: { value: 0 },
      uFocus: { value: 0 },
      uFood: { value: 0 },
      uMacro: { value: 0 },
      uFlatten: { value: 0 },
      uPearl: { value: new Color("#d8d1c6") },
      uProtein: { value: new Color("#ff4c36") },
      uCarbs: { value: new Color("#5661ff") },
      uFat: { value: new Color("#f0d94e") },
    },
    side: 2,
  });
}
