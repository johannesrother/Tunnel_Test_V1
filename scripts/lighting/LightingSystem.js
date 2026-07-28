/**
 * Small practical-light rig tuned for an organic, mineral palette. Exponential
 * fog provides the soft, milky depth of the reference without a costly
 * fullscreen volumetric pass on a standalone headset.
 */
export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.nightClear = new BABYLON.Color3(0.045, 0.066, 0.042);
    this.springClear = new BABYLON.Color3(0.255, 0.315, 0.19);
    this.nightFog = BABYLON.Color3.FromHexString("#4b5940");
    this.springFog = BABYLON.Color3.FromHexString("#d5d0a5");
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = this.nightFog.clone();
    scene.fogDensity = 0.012;
    scene.clearColor = new BABYLON.Color4(this.nightClear.r, this.nightClear.g, this.nightClear.b, 1);

    this.ambient = new BABYLON.HemisphericLight(
      "architectural-ambient", new BABYLON.Vector3(0, 1, 0), scene,
    );
    this.ambient.diffuse = BABYLON.Color3.FromHexString("#bac89a");
    this.ambient.groundColor = BABYLON.Color3.FromHexString("#071006");
    this.ambient.intensity = 0.34;

    // The directional source supplies soft morning warmth without real-time
    // shadows, which keeps the effect comfortable on a standalone headset.
    this.daylight = new BABYLON.DirectionalLight(
      "soft-spring-daylight", new BABYLON.Vector3(-0.34, -0.82, 0.42), scene,
    );
    this.daylight.diffuse = BABYLON.Color3.FromHexString("#ffe9ad");
    this.daylight.specular = BABYLON.Color3.FromHexString("#fff4d2");
    this.daylight.intensity = 0;

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
      this.daylight.setEnabled(false);
      this.practicals.forEach((light) => light.setEnabled(false));
      this.scene.fogDensity = 0;
      this.scene.clearColor.set(1, 1, 1, 1);
      return;
    }

    this.ambient.setEnabled(true);
    this.daylight.setEnabled(true);
    this.practicals.forEach((light) => light.setEnabled(true));
    const morning = frame.stage.id === "calm"
      ? 1
      : frame.stage.id === "unease"
        ? 1 - frame.stageProgress * frame.stageProgress * (3 - 2 * frame.stageProgress)
        : 0;
    const clearRed = this.nightClear.r + (this.springClear.r - this.nightClear.r) * morning;
    const clearGreen = this.nightClear.g + (this.springClear.g - this.nightClear.g) * morning;
    const clearBlue = this.nightClear.b + (this.springClear.b - this.nightClear.b) * morning;
    this.scene.clearColor.set(clearRed, clearGreen, clearBlue, 1);
    this.scene.fogColor.set(
      this.nightFog.r + (this.springFog.r - this.nightFog.r) * morning,
      this.nightFog.g + (this.springFog.g - this.nightFog.g) * morning,
      this.nightFog.b + (this.springFog.b - this.nightFog.b) * morning,
    );
    this.scene.fogDensity = frame.stage.fog * (1 - morning * 0.27);
    this.ambient.diffuse.set(0.73 + morning * 0.27, 0.78 + morning * 0.16, 0.60 + morning * 0.20);
    this.ambient.groundColor.set(0.027 + morning * 0.085, 0.063 + morning * 0.10, 0.024 + morning * 0.035);
    this.ambient.intensity = Math.max(0.05, frame.stage.light * (0.34 + morning * 0.34));
    this.daylight.intensity = morning * 0.72;

    const flickerAmount = frame.stage.id === "calm" || frame.stage.id === "crawl"
      ? 0
      : Math.max(0, Math.sin(frame.elapsed * (7 + frame.stage.rhythm * 2)));
    const intensity = frame.stage.light * (1.15 + flickerAmount * 0.92);
    const radius = frame.tunnelProfile.diameter / 2;
    const lateral = radius * 0.76;
    const ceiling = 1.68 + radius * 0.72;
    const z = frame.distance;
    this.practicals[0].position.set(-lateral, ceiling, z + 4.5);
    this.practicals[1].position.set(lateral, ceiling - 0.25, z + 8.5);
    this.practicals[2].position.set(0, ceiling, z + 13);
    this.practicals[0].diffuse.set(0.62 + morning * 0.34, 0.69 + morning * 0.20, 0.48 + morning * 0.25);
    this.practicals[1].diffuse.set(0.75 + morning * 0.25, 0.72 + morning * 0.17, 0.47 + morning * 0.27);
    this.practicals[2].diffuse.set(0.82 + morning * 0.18, 0.83 + morning * 0.13, 0.60 + morning * 0.25);
    this.practicals.forEach((light) => light.specular.copyFrom(light.diffuse));
    this.practicals[0].intensity = intensity * (0.88 + morning * 0.32);
    this.practicals[1].intensity = intensity * (0.74 + morning * 0.28);
    this.practicals[2].intensity = intensity * (0.62 + morning * 0.26);
  }
}
