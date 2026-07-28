import { VIDEO_SOURCES } from "../core/config.js";

/** One shared material/decoder per wall, avoiding a video texture per segment. */
export class VideoWallSystem {
  constructor(scene) {
    this.scene = scene;
    this.materials = new Map();
    this.videoTextures = [];
    this.#create("left", VIDEO_SOURCES.left);
    this.#create("right", VIDEO_SOURCES.right);
  }

  #create(side, source) {
    const material = new BABYLON.StandardMaterial(`${side}-display-material`, this.scene);
    material.disableLighting = true;
    material.specularColor = BABYLON.Color3.Black();
    material.emissiveColor = new BABYLON.Color3(0.36, 0.42, 0.27);
    material.backFaceCulling = false;
    material.diffuseTexture = source ? this.#videoTexture(side, source) : this.#photographicPlaceholder();
    material.emissiveTexture = material.diffuseTexture;
    material.diffuseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    // The architectural strip spans the complete tunnel length. Mirroring
    // avoids the opaque black band caused by clamping a short placeholder at
    // its last texel, while keeping future looping video content continuous.
    material.diffuseTexture.wrapV = BABYLON.Texture.MIRROR_ADDRESSMODE;
    this.materials.set(side, material);
  }

  #videoTexture(side, source) {
    const texture = new BABYLON.VideoTexture(
      `${side}-video`, source, this.scene, true, false,
      BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
      { autoPlay: true, loop: true, muted: true, poster: "" },
    );
    texture.video.playsInline = true;
    texture.video.setAttribute("webkit-playsinline", "true");
    this.videoTextures.push(texture);
    return texture;
  }

  #photographicPlaceholder() {
    const texture = new BABYLON.Texture(
      "./assets/textures/display-ambient-v1.png", this.scene, false, false,
      BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
    );
    texture.anisotropicFilteringLevel = 4;
    return texture;
  }

  getMaterial(side) {
    return this.materials.get(side);
  }

  update(frame) {
    const brightness = frame.isWhiteRoom ? 0 : 0.22 + frame.stage.light * 0.72;
    for (const material of this.materials.values()) {
      material.emissiveColor.set(brightness * 0.45, brightness * 0.5, brightness * 0.28);
    }
  }

  async unlock() {
    await Promise.all(this.videoTextures.map(async (texture) => {
      try { await texture.video.play(); } catch { /* Gesture policies may defer playback. */ }
    }));
  }
}
