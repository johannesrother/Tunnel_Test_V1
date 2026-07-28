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
    this.scene.clearColor.set(0.045, 0.066, 0.042, 1);
    this.scene.fogDensity = frame.stage.fog;
    this.ambient.intensity = Math.max(0.05, frame.stage.light * 0.34);

    const flickerAmount = frame.stage.id === "calm" || frame.stage.id === "crawl"
      ? 0
      : Math.max(0, Math.sin(frame.elapsed * (7 + frame.stage.rhythm * 2)));
    const intensity = frame.stage.light * (1.15 + flickerAmount * 0.92);
    const compression = Math.min(frame.distance / 192, 1);
    const lateral = 2.55 - compression * 1.6;
    const ceiling = 2.65 - compression * 0.8;
    const z = frame.distance;
    this.practicals[0].position.set(-lateral, ceiling, z + 4.5);
    this.practicals[1].position.set(lateral, ceiling - 0.25, z + 8.5);
    this.practicals[2].position.set(0, ceiling, z + 13);
    this.practicals[0].intensity = intensity * 0.88;
    this.practicals[1].intensity = intensity * 0.74;
    this.practicals[2].intensity = intensity * 0.62;
  }
}
