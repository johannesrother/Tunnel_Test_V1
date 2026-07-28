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
    const background = context.createRadialGradient(512, 256, 20, 512, 256, 640);
    background.addColorStop(0, "#9ba875");
    background.addColorStop(0.18, "#536043");
    background.addColorStop(0.72, "#1b2619");
    background.addColorStop(1, "#0a1009");
    context.fillStyle = background;
    context.fillRect(0, 0, 1024, 512);

    for (let band = 0; band < 18; band += 1) {
      const offset = side === "left" ? band * 38 : 1024 - band * 38;
      context.beginPath();
      context.ellipse(512, 256, Math.abs(510 - offset), 234 - band * 8, 0, 0, Math.PI * 2);
      context.strokeStyle = band % 3 === 0
        ? "rgba(221, 218, 155, 0.18)"
        : "rgba(16, 28, 13, 0.28)";
      context.lineWidth = band % 3 === 0 ? 2 : 1;
      context.stroke();
    }

    for (let vein = 0; vein < 12; vein += 1) {
      context.beginPath();
      context.moveTo(vein * 98, -10);
      for (let y = 0; y <= 530; y += 32) {
        const x = vein * 98 + Math.sin(y * 0.027 + vein * 1.7) * 15;
        context.lineTo(x, y);
      }
      context.strokeStyle = "rgba(202, 207, 140, 0.15)";
      context.lineWidth = 1.25;
      context.stroke();
    }
    texture.update(false);
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
