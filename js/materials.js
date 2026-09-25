const shaderTime = { value: 0 };
const shaderWind = { value: 1 };
const shaderPlayer = { value: new THREE.Vector3(0, -1000, 0) };

function createGradientMap(renderer) {
  const steps = new Uint8Array([112, 144, 178, 206, 224, 234]);
  const format = renderer.capabilities.isWebGL2 ? THREE.RedFormat : THREE.LuminanceFormat;
  const texture = new THREE.DataTexture(steps, steps.length, 1, format);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function addWind(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shaderTime;
    shader.uniforms.uWind = shaderWind;
    shader.uniforms.uPlayer = shaderPlayer;
    shader.vertexShader = 'attribute float sway;\nuniform float uTime;\nuniform float uWind;\nuniform vec3 uPlayer;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float windPhase = instanceMatrix[3].x * 0.21 + instanceMatrix[3].z * 0.17;
      #else
        float windPhase = 0.0;
      #endif
      float gust = (0.75 + 0.25 * sin(uTime * 0.35 + windPhase * 0.1)) * uWind;
      transformed.x += sin(uTime * 1.7 * (0.7 + 0.3 * uWind) + windPhase) * sway * 0.12 * gust;
      transformed.z += cos(uTime * 1.3 * (0.7 + 0.3 * uWind) + windPhase * 1.3) * sway * 0.08 * gust;
      #if defined(USE_INSTANCING) && __VERSION__ >= 300
        if (sway > 0.0) {
          vec4 bendWorld = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
          vec2 away = bendWorld.xz - uPlayer.xz;
          float reach = length(away);
          float above = bendWorld.y - uPlayer.y;
          float push = (1.0 - smoothstep(0.2, 1.4, reach)) * step(-0.5, above) * (1.0 - step(1.6, above));
          if (push > 0.0) {
            vec3 worldPush = vec3(normalize(away + 1e-4) * push * 0.55 * sway, -push * 0.25 * sway);
            worldPush = vec3(worldPush.x, worldPush.z, worldPush.y);
            mat3 im = mat3(instanceMatrix);
            transformed += transpose(im) * worldPush / max(dot(im[0], im[0]), 1e-3);
          }
        }
      #endif`
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
  return {
    gradientMap,
    toon,
    terrain: toon(0xffffff, { vertexColors: true }),
    decor: addWind(toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide })),
    decorDepth: addWind(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide })),
    solid: toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }),
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
