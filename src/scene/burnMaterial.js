import * as THREE from 'three'

// Shared uniforms: every effigy material references these same objects.
export const burnUniforms = {
  uImpact: { value: new THREE.Vector3() },
  uFront: { value: -1 },
  uChar: { value: 0 },
  uDissolve: { value: 0 },
  uTime: { value: 0 },
  uHeight: { value: 17 },
}

const NOISE = /* glsl */ `
float bh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float burnNoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(bh(i+vec3(0,0,0)),bh(i+vec3(1,0,0)),f.x), mix(bh(i+vec3(0,1,0)),bh(i+vec3(1,1,0)),f.x), f.y),
              mix(mix(bh(i+vec3(0,0,1)),bh(i+vec3(1,0,1)),f.x), mix(bh(i+vec3(0,1,1)),bh(i+vec3(1,1,1)),f.x), f.y), f.z);
}`

const VARY_DECL = 'varying vec3 vBurnPos;'
const FRAG_DECL = `${VARY_DECL}
uniform vec3 uImpact; uniform float uFront, uChar, uDissolve, uTime, uHeight;
${NOISE}`

const DISSOLVE = /* glsl */ `
float bn = burnNoise(vBurnPos * 0.9);
float dissolveEdge = 0.0;
if (uDissolve > 0.0) {
  float hh = vBurnPos.y / uHeight;
  float thr = 1.15 - uDissolve * 1.45;
  float kk = hh + bn * 0.28;
  if (kk > thr) discard;
  dissolveEdge = smoothstep(thr - 0.07, thr, kk);
}`

function injectVertex(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${VARY_DECL}`)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBurnPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
}

export function injectBurn(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, burnUniforms)
    injectVertex(shader)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_DECL}`)
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
${DISSOLVE}
float dI = distance(vBurnPos, uImpact);
float rag = (bn - 0.5) * 2.2;
float bedge = uFront + rag - dI;
float burnt = uFront > 0.0 ? smoothstep(0.0, 2.2, bedge) : 0.0;
float glowEdge = uFront > 0.0 ? smoothstep(-0.7, 0.0, bedge) * (1.0 - smoothstep(0.0, 1.5, bedge)) : 0.0;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
vec3 charCol = vec3(0.028, 0.02, 0.017) * (0.6 + bn * 0.8);
diffuseColor.rgb = mix(diffuseColor.rgb, charCol, clamp(burnt * (0.5 + 0.5 * uChar), 0.0, 1.0));`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.95, burnt);',
      )
      .replace(
        '#include <metalnessmap_fragment>',
        '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - burnt * 0.85;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
float fl = 0.65 + 0.35 * sin(uTime * 9.0 + bn * 20.0);
float embers = smoothstep(0.52, 0.85, burnNoise(vBurnPos * 2.2 + vec3(0.0, uTime * 0.25, 0.0)));
totalEmissiveRadiance += vec3(3.2, 1.0, 0.15) * glowEdge * fl * 1.6;
totalEmissiveRadiance += vec3(1.8, 0.38, 0.05) * embers * burnt * (1.0 - 0.4 * uChar) * fl;
totalEmissiveRadiance += vec3(3.0, 1.2, 0.2) * dissolveEdge * 2.0;`,
      )
  }
  material.customProgramCacheKey = () => 'burn-v1'
  return material
}

// Depth material so shadows dissolve with the effigy.
export function makeBurnDepthMaterial() {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, burnUniforms)
    injectVertex(shader)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_DECL}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${DISSOLVE}`)
  }
  m.customProgramCacheKey = () => 'burn-depth-v1'
  return m
}
