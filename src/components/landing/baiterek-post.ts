import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const BLOOM_STRENGTH = 0.22;
const BLOOM_RADIUS = 0.45;
const BLOOM_THRESHOLD = 1.3; // linear luminance: only the sphere's glow and hot highlights pass

// The scene renders on transparent black, so alpha = object coverage. After tone mapping the
// OutputPass lays that over the page paper, untouched by ACES: the canvas edge disappears.
function paperOutput(paper: THREE.Color): OutputPass {
  const pass = new OutputPass();
  pass.uniforms.paper = { value: paper.clone() }; // linear, same colour the page shows
  pass.material.fragmentShader = pass.material.fragmentShader
    .replace("uniform sampler2D tDiffuse;", "uniform sampler2D tDiffuse;\nuniform vec3 paper;")
    .replace(
      "// color space",
      "gl_FragColor.rgb += paper * (1.0 - clamp(gl_FragColor.a, 0.0, 1.0));\ngl_FragColor.a = 1.0;\n// color space",
    );
  return pass;
}

function bloomPass(): UnrealBloomPass {
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
  // Bloom adds light but must not add coverage, or the glow would punch holes into the paper.
  Object.assign(bloom.blendMaterial, {
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  return bloom;
}

export interface Post {
  render(): void;
  setSize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

/** Render → bloom (half resolution internally) → tone map + paper composite. */
export function createPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  paper: THREE.Color,
): Post {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera, undefined, new THREE.Color(0x000000), 0));
  composer.addPass(bloomPass());
  composer.addPass(paperOutput(paper));
  return {
    render: () => composer.render(),
    setSize(width, height, pixelRatio) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height);
    },
    dispose() {
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
    },
  };
}
