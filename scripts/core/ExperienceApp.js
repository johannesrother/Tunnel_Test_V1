import { AudioSystem } from "../audio/AudioSystem.js";
import { AutoRailCamera } from "../camera/AutoRailCamera.js";
import { CalmNatureSystem } from "../effects/CalmNatureSystem.js";
import { WhiteRoomPortal } from "../effects/WhiteRoomPortal.js";
import { LightingSystem } from "../lighting/LightingSystem.js";
import { ExperienceTimeline } from "../timeline/ExperienceTimeline.js";
import { OrganicTunnel } from "../tunnel/OrganicTunnel.js";
import { VideoWallSystem } from "../video/VideoWallSystem.js";
import { WebXRSystem } from "./WebXRSystem.js";

/** Application composition root; feature systems do not depend on page UI. */
export class ExperienceApp {
  constructor(canvas, onComplete, onWhiteFade = () => {}) {
    this.canvas = canvas;
    this.onComplete = onComplete;
    this.onWhiteFade = onWhiteFade;
    this.engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: false,
      adaptToDeviceRatio: true,
    });
    this.scene = null;
    this.timeline = new ExperienceTimeline();
    this.started = false;
    this.completed = false;
  }

  async initialize() {
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.skipPointerMovePicking = true;
    this.scene.autoClear = true;
    this.scene.imageProcessingConfiguration.contrast = 1.12;
    this.scene.imageProcessingConfiguration.exposure = 0.9;

    this.camera = new AutoRailCamera(this.scene, this.canvas);
    this.videoWalls = new VideoWallSystem(this.scene);
    this.tunnel = new OrganicTunnel(this.scene, this.videoWalls);
    this.calmNature = new CalmNatureSystem(this.scene);
    this.whiteRoomPortal = new WhiteRoomPortal(this.scene);
    this.lighting = new LightingSystem(this.scene);
    this.audio = new AudioSystem();
    this.xr = new WebXRSystem(this.scene);
    const xrExperience = await this.xr.initialize();
    if (xrExperience) this.camera.bindXR(xrExperience);

    this.engine.runRenderLoop(() => this.#render());
    window.addEventListener("resize", () => this.engine.resize());
  }

  async begin() {
    if (this.started) return;
    this.started = true;
    this.timeline.start();
    // Start permission-gated operations in the original click task. WebXR
    // session requests may be rejected if delayed behind an unrelated await.
    await Promise.all([this.audio.unlock(), this.videoWalls.unlock(), this.xr.enter()]);
  }

  #render() {
    if (this.started) {
      const frame = this.timeline.getFrame();
      this.camera.update(frame.distance);
      this.tunnel.update(frame);
      this.calmNature.update(frame);
      this.whiteRoomPortal.update(frame);
      this.videoWalls.update(frame);
      this.lighting.update(frame);
      this.audio.update(frame);
      this.onWhiteFade(frame.whiteFadeProgress);
      if (frame.isComplete && !this.completed) {
        this.completed = true;
        this.onComplete();
      }
    }
    this.scene.render();
  }
}
