/**
 * A deliberately small practical-light rig. Three dynamic point lights and
 * exponential distance fog give depth without the fill-rate cost of screen
 * space volumetrics on a standalone headset.
 */
export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = BABYLON.Color3.FromHexString("#090c0e");
    scene.fogDensity = 0.012;
    scene.clearColor = new BABYLON.Color4(0.012, 0.016, 0.019, 1);

    this.ambient = new BABYLON.HemisphericLight(
      "architectural-ambient", new BABYLON.Vector3(0, 1, 0), scene,
    );
    this.ambient.diffuse = BABYLON.Color3.FromHexString("#7f98a5");
    this.ambient.groundColor = BABYLON.Color3.FromHexString("#050607");
    this.ambient.intensity = 0.24;

    this.practicals = [
      this.#point("practical-left", new BABYLON.Color3(0.58, 0.72, 0.8)),
      this.#point("practical-right", new BABYLON.Color3(0.6, 0.68, 0.74)),
      this.#point("practical-forward", new BABYLON.Color3(0.72, 0.79, 0.8)),
    ];
  }

  #point(name, color) {
    const light = new BABYLON.PointLight(name, BABYLON.Vector3.Zero(), this.scene);
    light.diffuse = color;
    light.specular = color;
    light.range = 16;
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
    this.scene.clearColor.set(0.012, 0.016, 0.019, 1);
    this.scene.fogDensity = frame.stage.fog;
    this.ambient.intensity = Math.max(0.035, frame.stage.light * 0.27);

    const flickerAmount = frame.stage.id === "calm" || frame.stage.id === "crawl"
      ? 0
      : Math.max(0, Math.sin(frame.elapsed * (7 + frame.stage.rhythm * 2)));
    const intensity = frame.stage.light * (1.1 + flickerAmount * 0.85);
    const z = frame.distance;
    this.practicals[0].position.set(-2.6, 2.5, z + 4.5);
    this.practicals[1].position.set(2.6, 2.3, z + 8.5);
    this.practicals[2].position.set(0, 2.8, z + 13);
    this.practicals[0].intensity = intensity * 0.82;
    this.practicals[1].intensity = intensity * 0.68;
    this.practicals[2].intensity = intensity * 0.55;
  }
}
