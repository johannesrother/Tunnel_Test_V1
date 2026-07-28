/**
 * The locomotion rig owns all forward translation. XR head tracking remains
 * unmodified under it, so visitors can look freely but never steer or walk.
 */
export class AutoRailCamera {
  constructor(scene, canvas) {
    this.scene = scene;
    this.rig = new BABYLON.TransformNode("experience-rig", scene);
    this.desktopCamera = new BABYLON.UniversalCamera(
      "desktop-view",
      new BABYLON.Vector3(0, 1.68, 0),
      scene,
    );
    this.desktopCamera.minZ = 0.05;
    this.desktopCamera.fov = 1.02;
    this.desktopCamera.parent = this.rig;
    this.desktopCamera.attachControl(canvas, true);

    // Prevent desktop keys/gamepad from contradicting the authored rail path.
    this.desktopCamera.inputs.removeByType("FreeCameraKeyboardMoveInput");
    this.desktopCamera.inputs.removeByType("FreeCameraGamepadInput");
    scene.activeCamera = this.desktopCamera;
  }

  update(distance) {
    this.rig.position.z = distance;
  }

  bindXR(xr) {
    xr.baseExperience.onStateChangedObservable.add((state) => {
      if (state === BABYLON.WebXRState.IN_XR) {
        xr.baseExperience.camera.parent = this.rig;
      }
    });
  }
}
