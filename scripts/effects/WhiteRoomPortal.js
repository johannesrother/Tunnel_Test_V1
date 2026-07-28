import { TUNNEL_CONFIG } from "../core/config.js";
import { clamp, lerp, smoothstep } from "../utils/math.js";

/**
 * A minimal emissive target at the far end of the shell. It is actual scene
 * geometry rather than a screen-space effect, so its scale and brightness are
 * naturally tied to the visitor's forward movement and remain inexpensive on
 * standalone VR hardware.
 */
export class WhiteRoomPortal {
  constructor(scene) {
    this.scene = scene;
    this.root = new BABYLON.TransformNode("white-room-portal", scene);
    this.root.position.set(0, TUNNEL_CONFIG.eyeLineHeight, TUNNEL_CONFIG.length + 0.035);

    this.haloMaterial = this.#createMaterial("white-room-halo", 0.11);
    this.coreMaterial = this.#createMaterial("white-room-core", 1);
    this.halo = BABYLON.MeshBuilder.CreateDisc("white-room-halo-disc", {
      radius: 1,
      tessellation: 48,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    }, scene);
    this.core = BABYLON.MeshBuilder.CreateDisc("white-room-core-disc", {
      radius: 1,
      tessellation: 48,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    }, scene);
    this.halo.material = this.haloMaterial;
    this.core.material = this.coreMaterial;
    this.halo.parent = this.root;
    this.core.parent = this.root;
    this.halo.renderingGroupId = 1;
    this.core.renderingGroupId = 2;
    this.halo.isPickable = false;
    this.core.isPickable = false;
  }

  #createMaterial(name, alpha) {
    const material = new BABYLON.StandardMaterial(name, this.scene);
    material.disableLighting = true;
    material.diffuseColor = BABYLON.Color3.Black();
    material.emissiveColor = new BABYLON.Color3(2.2, 2.2, 2.2);
    material.alpha = alpha;
    material.backFaceCulling = false;
    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    return material;
  }

  update(frame) {
    if (frame.isWhiteRoom) {
      this.root.setEnabled(false);
      return;
    }

    this.root.setEnabled(true);
    const journeyProgress = clamp(frame.distance / TUNNEL_CONFIG.length, 0, 1);
    const gradualGrowth = smoothstep(0, 0.98, journeyProgress);
    const baseRadius = lerp(0.22, 0.69, gradualGrowth);
    const pullScale = frame.isFinalAcceleration
      ? lerp(1, 10, Math.pow(frame.finalAccelerationProgress, 2))
      : 1;
    const radius = baseRadius * pullScale;
    const brightness = lerp(1.15, 3.4, gradualGrowth);

    this.core.scaling.setAll(radius);
    this.halo.scaling.setAll(radius * 2.65);
    this.coreMaterial.emissiveColor.set(brightness, brightness, brightness);
    this.haloMaterial.emissiveColor.set(brightness, brightness, brightness);
    this.haloMaterial.alpha = lerp(0.07, 0.5, gradualGrowth);
  }
}
