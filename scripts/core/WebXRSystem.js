/** Quest-safe WebXR setup: headset rotation is allowed; teleport and pointers are not. */
export class WebXRSystem {
  constructor(scene) {
    this.scene = scene;
    this.experience = null;
  }

  async initialize() {
    if (!navigator.xr) return null;
    this.experience = await this.scene.createDefaultXRExperienceAsync({
      disableDefaultUI: true,
      disablePointerSelection: true,
      disableTeleportation: true,
      disableNearInteraction: true,
    });
    return this.experience;
  }

  async enter() {
    if (!this.experience) return false;
    try {
      await this.experience.baseExperience.enterXRAsync("immersive-vr", "local-floor");
      return true;
    } catch (error) {
      console.warn("WebXR session could not start.", error);
      return false;
    }
  }
}
