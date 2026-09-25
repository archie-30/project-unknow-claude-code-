const shaderTime = { value: 0 };

function createGradientMap(renderer) {
  const steps = new Uint8Array([95, 175, 240]);
  const format = renderer.capabilities.isWebGL2 ? THREE.RedFormat : THREE.LuminanceFormat;
  const texture = new THREE.DataTexture(steps, steps.length, 1, format);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function addWind(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shaderTime;
    shader.vertexShader = 'attribute float sway;\nuniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float windPhase = instanceMatrix[3].x * 0.21 + instanceMatrix[3].z * 0.17;
      #else
        float windPhase = 0.0;
      #endif
      float gust = 0.75 + 0.25 * sin(uTime * 0.35 + windPhase * 0.1);
      transformed.x += sin(uTime * 1.7 + windPhase) * sway * 0.12 * gust;
      transformed.z += cos(uTime * 1.3 + windPhase * 1.3) * sway * 0.08 * gust;`
    );
  };
  return material;
}

function addWaves(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shaderTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 waveWorld = modelMatrix * vec4(transformed, 1.0);
      transformed.y += sin(waveWorld.x * 0.45 + uTime * 1.3) * 0.06
        + sin(waveWorld.z * 0.38 - uTime * 1.1) * 0.05
        + sin((waveWorld.x + waveWorld.z) * 0.9 + uTime * 2.1) * 0.025;`
    );
  };
  return material;
}

function createMaterials(gradientMap) {
  const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap, ...extra });
  const water = addWaves(toon(0xffffff, { vertexColors: true, transparent: true, depthWrite: false }));
  water.flatShading = true;
  return {
    gradientMap,
    toon,
    terrain: toon(0xffffff, { vertexColors: true }),
    decor: addWind(toon(0xffffff, { vertexColors: true })),
    decorDepth: addWind(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })),
    water,
    cloud: toon(0xffffff, { fog: false }),
  };
}

function flatShaded(geometry) {
  const result = geometry.index ? geometry.toNonIndexed() : geometry;
  result.computeVertexNormals();
  return result;
}

function jitterVertices(geometry, seed, min, max) {
  const position = geometry.attributes.position;
  const rng = mulberry32(seed);
  const offsets = new Map();
  for (let i = 0; i < position.count; i++) {
    const key = [position.getX(i), position.getY(i), position.getZ(i)].map((v) => v.toFixed(3)).join(',');
    if (!offsets.has(key)) offsets.set(key, min + rng() * (max - min));
    const s = offsets.get(key);
    position.setXYZ(i, position.getX(i) * s, position.getY(i) * s, position.getZ(i) * s);
  }
  return geometry;
}
