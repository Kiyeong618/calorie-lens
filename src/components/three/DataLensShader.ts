import { Color, ShaderMaterial, Vector3, Vector4 } from "three";
import type { DataLensData } from "./sceneMapping";

const vertexShader = /* glsl */ `
  attribute vec2 aParam;
  attribute float aMealIndex;
  attribute float aFoodIndex;
  attribute float aCellMargin;
  attribute float aMacroIndex;
  attribute float aFlowDelay;

  uniform float uTime;
  uniform float uMealDepth;
  uniform float uFocus;
  uniform float uFood;
  uniform float uMacro;
  uniform float uFlatten;
  uniform vec4 uMealShares;
  uniform vec3 uMacroShares;

  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  varying float vAlpha;
  varying float vFoodIndex;
  varying float vCellMargin;
  varying float vFoodAmount;
  varying float vMacroIndex;
  varying float vExtract;

  float mealShare(float index) {
    if (index < .5) return uMealShares.x;
    if (index < 1.5) return uMealShares.y;
    if (index < 2.5) return uMealShares.z;
    return uMealShares.w;
  }

  float macroShare(float index) {
    if (index < .5) return uMacroShares.x;
    if (index < 1.5) return uMacroShares.y;
    return uMacroShares.z;
  }

  vec3 bezier(vec3 a, vec3 b, vec3 c, float t) {
    float s = 1.0 - t;
    return s * s * a + 2.0 * s * t * b + t * t * c;
  }

  void main() {
    vec3 p = position;
    float lunch = 1.0 - step(.25, abs(aMealIndex - 1.0));
    float share = mealShare(aMealIndex);
    float presence = smoothstep(.005, .04, share);

    // A: a thin membrane whose motion is surface tension, not object rotation.
    float breathing = sin(aParam.x * 4.1 + aParam.y * 2.7 + uTime * .34) * .035;
    p.z += breathing * (1.0 - uMealDepth * .72);

    // B: the original membrane vertices separate into calorie-weighted depth bands.
    float layerOrder = 1.5 - aMealIndex;
    float layerDepth = presence * (layerOrder * .55 + sign(layerOrder) * share * 1.75);
    p.z += layerDepth * uMealDepth;
    p.y += layerOrder * .035 * uMealDepth;

    // C: the lunch band stays present and expands; the other original vertices recede.
    vec2 lunchCenter = vec2(0.0, .82);
    vec2 focused = (p.xy - lunchCenter) * 2.08 + vec2(.45, -.58);
    p.xy = mix(p.xy, focused, uFocus * lunch);
    p.z -= uFocus * (1.0 - lunch) * (2.55 + abs(aMealIndex - 1.0) * .38);
    float mealPresence = mix(1.0, .08 + .92 * presence, uMealDepth);
    vAlpha = mix(1.0, mix(.055, 1.0, lunch), uFocus) * mealPresence;

    // D: boundaries and shallow relief arise on the same lunch surface.
    float cellRelief = (.5 - abs(aFoodIndex - 1.5) / 3.0) * .16;
    cellRelief += sin(aParam.x * 7.0 + aFoodIndex * 1.8) * .025;
    p.z += lunch * uFood * cellRelief;

    // E: the very same lunch vertices stretch from cells into three connected streams.
    float extraction = smoothstep(aFlowDelay, min(1.0, aFlowDelay + .38), uMacro) * lunch * presence;
    float channelShare = macroShare(aMacroIndex);
    float t = clamp((aParam.x + 1.0) * .43 + .08, 0.04, .96);
    vec3 root = vec3(p.xy, p.z);
    vec3 control;
    vec3 tip;
    vec3 side;
    if (aMacroIndex < .5) {
      control = vec3(-1.9, 2.7, 1.9);
      tip = vec3(-3.75, .9, -.15);
      side = vec3(.12, .36, .22);
    } else if (aMacroIndex < 1.5) {
      control = vec3(.35, 3.55, -1.4);
      tip = vec3(3.25, 1.75, .75);
      side = vec3(-.25, .22, .38);
    } else {
      control = vec3(2.15, 1.4, 2.5);
      tip = vec3(1.3, -2.55, -.45);
      side = vec3(.34, -.12, .2);
    }
    float sculpt = sin(t * 6.283 + aMacroIndex * 1.7) * .22;
    vec3 stream = bezier(root * .42, control, tip, t);
    float width = .12 + channelShare * 1.36;
    stream += side * (aParam.y - .24) * width;
    stream.z += sculpt + sin(t * 12.0 + aParam.y * 4.0) * .08;
    p = mix(p, stream, extraction);
    p.z = mix(p.z, p.z * .12, uFlatten);

    vFoodIndex = aFoodIndex;
    vCellMargin = aCellMargin;
    vFoodAmount = uFood * lunch;
    vMacroIndex = aMacroIndex;
    vExtract = extraction;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec4 view = viewMatrix * world;
    vWorldPosition = world.xyz;
    vViewPosition = -view.xyz;
    gl_Position = projectionMatrix * view;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uPearl;
  uniform vec3 uProtein;
  uniform vec3 uCarbs;
  uniform vec3 uFat;
  uniform float uMacro;

  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  varying float vAlpha;
  varying float vFoodIndex;
  varying float vCellMargin;
  varying float vFoodAmount;
  varying float vMacroIndex;
  varying float vExtract;

  vec3 macroColor(float index) {
    if (index < .5) return uProtein;
    if (index < 1.5) return uCarbs;
    return uFat;
  }

  vec3 foodTint(float index) {
    if (index < .5) return vec3(.96, .91, .84);
    if (index < 1.5) return vec3(.82, .86, .87);
    if (index < 2.5) return vec3(.91, .88, .72);
    return vec3(.76, .82, .78);
  }

  void main() {
    vec3 normal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    if (!gl_FrontFacing) normal *= -1.0;
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = abs(dot(normal, viewDirection));
    float fresnel = pow(1.0 - facing, 2.25);
    float pearlShift = .5 + .5 * dot(normal, normalize(vec3(-.4, .7, .6)));
    vec3 pearl = uPearl * (.48 + facing * .48);
    pearl += mix(vec3(.12, .15, .18), vec3(.34, .27, .2), pearlShift) * fresnel;
    pearl += vec3(.22, .24, .25) * pow(facing, 8.0);

    vec3 cellColor = mix(pearl, foodTint(vFoodIndex), vFoodAmount * .15);
    float boundary = (1.0 - smoothstep(.002, .025, vCellMargin)) * vFoodAmount;
    cellColor += vec3(.72, .76, .78) * boundary * .42;
    cellColor *= 1.0 - boundary * .28;

    vec3 color = mix(cellColor, macroColor(vMacroIndex), vExtract * (.72 + uMacro * .28));
    color += macroColor(vMacroIndex) * fresnel * vExtract * .22;
    float alpha = vAlpha * (.56 + fresnel * .36 + boundary * .12);
    alpha = mix(alpha, .9, vExtract);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createDataLensMaterial(data: DataLensData) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uMealDepth: { value: 0 },
      uFocus: { value: 0 },
      uFood: { value: 0 },
      uMacro: { value: 0 },
      uFlatten: { value: 0 },
      uMealShares: { value: new Vector4(...data.mealShares) },
      uMacroShares: { value: new Vector3(...data.macroShares) },
      uPearl: { value: new Color("#e9e6df") },
      uProtein: { value: new Color("#ff4c36") },
      uCarbs: { value: new Color("#5661ff") },
      uFat: { value: new Color("#f0d94e") },
    },
    side: 2,
  });
}
