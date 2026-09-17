import { Color, ShaderMaterial, Vector4 } from "three";

const vertexShader = /* glsl */ `
  attribute vec2 aParam;
  attribute vec4 aMeal;
  attribute vec4 aFood;
  attribute vec3 aMacro;
  attribute float aEdge;

  uniform float uTime;
  uniform float uBirth;
  uniform float uMeals;
  uniform float uFocus;
  uniform float uFoods;
  uniform float uExtraction;
  uniform vec4 uMealShares;

  varying vec3 vWorld;
  varying vec2 vParam;
  varying vec4 vFood;
  varying vec3 vMacro;
  varying float vHeight;
  varying float vEdge;
  varying float vLunch;

  void main() {
    vec3 p = position;
    float breathing = sin(aParam.x * 4.1 + aParam.y * 2.7 + uTime * .32) * .025;
    breathing += cos(aParam.y * 5.3 - aParam.x * 1.8 + uTime * .21) * .015;

    float breakfast = aMeal.x * (.15 + uMealShares.x * 1.5);
    float lunch = aMeal.y * (.18 + uMealShares.y * 1.75);
    float dinner = aMeal.z * (.15 + uMealShares.z * 1.55);
    float snack = aMeal.w * (.08 + uMealShares.w * 1.15);
    float mealHeight = breakfast + lunch + dinner + snack;

    float foodRelief = dot(aFood, vec4(.13, .2, .11, .16)) * aMeal.y;
    p.z += breathing * (1.0 - uMeals * .55);
    p.z += mealHeight * uMeals;
    p.z += foodRelief * uFoods;
    p.z += aMeal.y * uFocus * .13;

    // The island is born from a low, tense sheet instead of scaling in as a new object.
    p.z *= mix(.12, 1.0, uBirth);
    p.xy *= mix(.92, 1.0, uBirth);

    // During extraction the same edge is pulled toward three exits before trails extend it.
    float leftExit = smoothstep(.25, .92, -aParam.x) * aMacro.x;
    float rightExit = smoothstep(.28, .92, aParam.x + aParam.y * .22) * aMacro.y;
    float lowerExit = smoothstep(.25, .88, -aParam.y) * aMacro.z;
    float pull = uExtraction * uExtraction * aEdge;
    p.x += (-leftExit * .52 + rightExit * .58 + lowerExit * .2) * pull;
    p.y += (leftExit * .18 + rightExit * .12 - lowerExit * .48) * pull;
    p.z += (leftExit + rightExit + lowerExit) * .2 * pull;

    vParam = aParam;
    vFood = aFood;
    vMacro = aMacro;
    vHeight = p.z;
    vEdge = aEdge;
    vLunch = aMeal.y;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uMeals;
  uniform float uFocus;
  uniform float uFoods;
  uniform float uExtraction;
  uniform vec3 uCoral;
  uniform vec3 uCobalt;
  uniform vec3 uGold;

  varying vec3 vWorld;
  varying vec2 vParam;
  varying vec4 vFood;
  varying vec3 vMacro;
  varying float vHeight;
  varying float vEdge;
  varying float vLunch;

  float lineMask(float value, float density, float width) {
    float wave = abs(fract(value * density) - .5);
    return 1.0 - smoothstep(width, width + .055, wave);
  }

  float segment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (!gl_FrontFacing) normal *= -1.0;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float facing = clamp(dot(normal, viewDir), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 2.35);
    float travellingLight = .5 + .5 * sin(vParam.x * 3.4 - vParam.y * 2.1 + uTime * .18);

    vec3 darkChrome = vec3(.022, .017, .014);
    vec3 warmMetal = vec3(.46, .37, .28);
    vec3 coldMetal = vec3(.12, .18, .29);
    vec3 color = mix(darkChrome, warmMetal, facing * .5 + travellingLight * .17);
    color = mix(color, coldMetal, fresnel * .65);
    color += vec3(.82, .68, .5) * pow(facing, 20.0) * (.42 + travellingLight * .32);

    // Survey lines make the material immediately legible as a terrain specimen.
    float contours = lineMask(vHeight + sin(vParam.x * 3.0) * .018, 7.5, .445);
    color += vec3(.7, .61, .49) * contours * mix(.07, .16, uMeals);

    // Organic food boundaries emerge inside the same lunch relief.
    float strongest = 0.0;
    float runnerUp = 0.0;
    float foodValues[4];
    foodValues[0] = vFood.x;
    foodValues[1] = vFood.y;
    foodValues[2] = vFood.z;
    foodValues[3] = vFood.w;
    for (int i = 0; i < 4; i++) {
      float value = foodValues[i];
      if (value > strongest) {
        runnerUp = strongest;
        strongest = value;
      } else if (value > runnerUp) {
        runnerUp = value;
      }
    }
    float cellBoundary = 1.0 - smoothstep(.025, .095, strongest - runnerUp);
    float lunchMask = smoothstep(.12, .44, vLunch);
    color *= 1.0 - cellBoundary * uFoods * lunchMask * .32;
    color += vec3(.78, .66, .5) * cellBoundary * uFoods * lunchMask * .46;
    vec3 foodTint =
      vec3(.44, .36, .27) * vFood.x +
      vec3(.28, .34, .36) * vFood.y +
      vec3(.38, .34, .24) * vFood.z +
      vec3(.25, .34, .29) * vFood.w;
    color = mix(color, foodTint, uFoods * lunchMask * .3);

    // Surface tributaries precede the detached sculpture, keeping cause and effect visible.
    vec2 hub = vec2(.05, .08);
    float proteinPath = min(segment(vParam, vec2(-.18,.28), hub), segment(vParam, hub, vec2(-1.08,.28)));
    float carbsPath = min(segment(vParam, vec2(.22,.19), hub), segment(vParam, hub, vec2(1.08,.34)));
    float fatPath = min(segment(vParam, vec2(-.08,-.08), hub), segment(vParam, hub, vec2(.42,-1.04)));
    float protein = (1.0 - smoothstep(.015, .09, proteinPath)) * vMacro.x;
    float carbs = (1.0 - smoothstep(.015, .09, carbsPath)) * vMacro.y;
    float fat = (1.0 - smoothstep(.015, .09, fatPath)) * vMacro.z;
    vec3 flow = uCoral * protein + uCobalt * carbs + uGold * fat;
    float flowAmount = clamp(protein + carbs + fat, 0.0, 1.0) * uExtraction;
    color = mix(color, flow, flowAmount);
    color += flow * flowAmount * .32;
    color += vec3(.07, .025, .1) * fresnel * (.25 + travellingLight * .2);

    float alpha = .98 - vEdge * .08 + fresnel * .02;
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createNutritionTerrainMaterial(mealShares: number[]) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: true,
    side: 2,
    uniforms: {
      uTime: { value: 0 },
      uBirth: { value: 0 },
      uMeals: { value: 0 },
      uFocus: { value: 0 },
      uFoods: { value: 0 },
      uExtraction: { value: 0 },
      uMealShares: {
        value: new Vector4(
          mealShares[0] ?? 0,
          mealShares[1] ?? 0,
          mealShares[2] ?? 0,
          mealShares[3] ?? 0,
        ),
      },
      uCoral: { value: new Color("#ff4c36") },
      uCobalt: { value: new Color("#5661ff") },
      uGold: { value: new Color("#f0d94e") },
    },
  });
}
