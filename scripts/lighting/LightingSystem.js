/**
 * Small practical-light rig tuned for an organic, mineral palette. Exponential
 * fog provides the soft, milky depth of the reference without a costly
 * fullscreen volumetric pass on a standalone headset.
 */
export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = BABYLON.Color3.FromHexString("#4b5940");
    scene.fogDensity = 0.012;
    scene.clearColor = new BABYLON.Color4(0.045, 0.066, 0.042, 1);

    this.ambient = new BABYLON.HemisphericLight(
      "architectural-ambient", new BABYLON.Vector3(0, 1, 0), scene,
    );
    this.ambient.diffuse = BABYLON.Color3.FromHexString("#bac89a");
    this.ambient.groundColor = BABYLON.Color3.FromHexString("#071006");
    this.ambient.intensity = 0.34;

    this.practicals = [
      this.#point("practical-left", BABYLON.Color3.FromHexString("#9db17a")),
      this.#point("practical-right", BABYLON.Color3.FromHexString("#c0b878")),
      this.#point("practical-forward", BABYLON.Color3.FromHexString("#d0d49a")),
    ];
  }

  #point(name, color) {
    const light = new BABYLON.PointLight(name, BABYLON.Vector3.Zero(), this.scene);
    light.diffuse = color;
    light.specular = color;
    light.range = 18;
    light.intensity = 1;
    return light;
  }

  update(frame) {
    if (frame.isWhiteRoom) {
      this.ambient.setEnabled(false);
      this.practicals.forEach((light) => light.setEnabled(false));
      this.scene.fogDensity = 0;
      this.scene.clearColor.set(1, 1, 1, 1);
      return;
    }

    this.ambient.setEnabled(true);
    this.practicals.forEach((light) => light.setEnabled(true));
    const release = frame.isWhiteTransition ? frame.whiteTransitionProgress : 0;
    const baseFog = frame.isWhiteTransition ? 0.065 : frame.stage.fog;
    const baseLight = frame.isWhiteTransition ? 0.12 : frame.stage.light;
    this.scene.clearColor.set(
      0.045 + (1 - 0.045) * release,
      0.066 + (1 - 0.066) * release,
      0.042 + (1 - 0.042) * release,
      1,
    );
    this.scene.fogDensity = baseFog * (1 - release);
    this.ambient.intensity = Math.max(0, baseLight * 0.34 * (1 - release));

    const flickerAmount = frame.stage.id === "calm" || frame.stage.id === "crawl" || frame.isWhiteTransition
      ? 0
      : Math.max(0, Math.sin(frame.elapsed * (7 + frame.stage.rhythm * 2)));
    const intensity = baseLight * (1.15 + flickerAmount * 0.92) * (1 - release);
    const radius = frame.tunnelProfile.diameter / 2;
    const lateral = radius * 0.76;
    const ceiling = 1.68 + radius * 0.72;
    const z = frame.distance;
    this.practicals[0].position.set(-lateral, ceiling, z + 4.5);
    this.practicals[1].position.set(lateral, ceiling - 0.25, z + 8.5);
    this.practicals[2].position.set(0, ceiling, z + 13);
    this.practicals[0].intensity = intensity * 0.88;
    this.practicals[1].intensity = intensity * 0.74;
    this.practicals[2].intensity = intensity * 0.62;
  }
}
