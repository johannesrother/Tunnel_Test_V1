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
    material.emissiveColor = new BABYLON.Color3(0.42, 0.46, 0.49);
    material.backFaceCulling = false;
    material.diffuseTexture = source ? this.#videoTexture(side, source) : this.#placeholderTexture(side);
    material.diffuseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    material.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
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

  #placeholderTexture(side) {
    const texture = new BABYLON.DynamicTexture(`${side}-placeholder`, { width: 1024, height: 512 }, this.scene, false);
    const context = texture.getContext();
    const gradient = context.createLinearGradient(0, 0, 1024, 512);
    gradient.addColorStop(0, "#111518");
    gradient.addColorStop(0.5, "#293238");
    gradient.addColorStop(1, "#0d1012");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 512);
    context.strokeStyle = "rgba(204, 217, 222, 0.28)";
    context.lineWidth = 2;
    context.strokeRect(42, 42, 940, 428);
    context.fillStyle = "rgba(226, 235, 238, 0.72)";
    context.font = "600 22px Arial";
    context.textAlign = "center";
    context.fillText(`${side.toUpperCase()} WALL / VIDEO INPUT`, 512, 258);
    texture.update(false);
    return texture;
  }

  getMaterial(side) {
    return this.materials.get(side);
  }

  update(frame) {
    const brightness = frame.isWhiteRoom ? 0 : 0.28 + frame.stage.light * 0.72;
    for (const material of this.materials.values()) {
      material.emissiveColor.set(brightness * 0.37, brightness * 0.42, brightness * 0.46);
    }
  }

  async unlock() {
    await Promise.all(this.videoTextures.map(async (texture) => {
      try { await texture.video.play(); } catch { /* Gesture policies may defer playback. */ }
    }));
  }
}
