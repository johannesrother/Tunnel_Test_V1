import { getTunnelProfileAt, TUNNEL_CONFIG } from "../core/config.js";
import { signedPower } from "../utils/math.js";

function profilePoint(profile, angle, inset = 0) {
  const exponent = 2 / profile.roundness;
  const radius = profile.diameter / 2 - inset;
  return new BABYLON.Vector3(
    radius * signedPower(Math.cos(angle), exponent),
    TUNNEL_CONFIG.eyeLineHeight + radius * signedPower(Math.sin(angle), exponent),
    profile.z,
  );
}

function createLimestoneAlbedo(scene) {
  const texture = new BABYLON.Texture(
    "./assets/textures/limestone-albedo-v1.png", scene, false, false,
    BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.uScale = 0.84;
  texture.vScale = 0.84;
  texture.anisotropicFilteringLevel = 4;
  return texture;
}

function createLimestoneNormal(scene) {
  const texture = new BABYLON.Texture(
    "./assets/textures/limestone-normal-v1.png", scene, false, false,
    BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.uScale = 0.84;
  texture.vScale = 0.84;
  texture.anisotropicFilteringLevel = 4;
  texture.level = 0.46;
  return texture;
}

function buildStrip(name, scene, centerAngle, angularSpan, inset, material) {
  const positions = [];
  const indices = [];
  const uvs = [];
  const rings = Math.ceil(TUNNEL_CONFIG.length / TUNNEL_CONFIG.ringSpacing) + 1;
  const across = 6;

  for (let ring = 0; ring < rings; ring += 1) {
    const z = Math.min(ring * TUNNEL_CONFIG.ringSpacing, TUNNEL_CONFIG.length);
    const profile = getTunnelProfileAt(z);
    for (let column = 0; column < across; column += 1) {
      const lateral = column / (across - 1) - 0.5;
      const point = profilePoint(profile, centerAngle + lateral * angularSpan, inset);
      positions.push(point.x, point.y, point.z);
      uvs.push(column / (across - 1), z / 12);
    }
  }

  for (let ring = 0; ring < rings - 1; ring += 1) {
    for (let column = 0; column < across - 1; column += 1) {
      const a = ring * across + column;
      const b = a + 1;
      const c = (ring + 1) * across + column;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const mesh = new BABYLON.Mesh(name, scene);
  const data = new BABYLON.VertexData();
  data.positions = positions;
  data.indices = indices;
  data.uvs = uvs;
  data.normals = [];
  BABYLON.VertexData.ComputeNormals(positions, indices, data.normals);
  data.applyToMesh(mesh);
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}

/**
 * A single welded, high-roundness loft creates the architecture. The shell
 * remains continuous; the inset ribs are one lightweight decorative mesh with
 * deliberately irregular spacing, avoiding a modular pipe-like cadence.
 */
export class OrganicTunnel {
  constructor(scene, videoWalls) {
    this.scene = scene;
    this.root = new BABYLON.TransformNode("organic-tunnel", scene);
    this.root.setEnabled(true);
    this.shellMaterial = this.#createShellMaterial();
    this.shell = this.#createShell();
    this.shell.parent = this.root;
    this.ribs = this.#createRibs();
    this.ribs.parent = this.root;

    this.leftDisplay = buildStrip(
      "left-video-surface", scene, Math.PI, TUNNEL_CONFIG.displayAngularSpan,
      TUNNEL_CONFIG.displayInset, videoWalls.getMaterial("left"),
    );
    this.rightDisplay = buildStrip(
      "right-video-surface", scene, 0, TUNNEL_CONFIG.displayAngularSpan,
      TUNNEL_CONFIG.displayInset, videoWalls.getMaterial("right"),
    );
    this.leftDisplay.parent = this.root;
    this.rightDisplay.parent = this.root;
    this.lightRibbons = this.#createLightRibbons();
    this.fadeMeshes = [
      this.shell,
      this.ribs,
      this.leftDisplay,
      this.rightDisplay,
      ...this.lightRibbons.meshes,
    ];
  }

  #createShellMaterial() {
    const material = new BABYLON.PBRMaterial("living-limestone", this.scene);
    this.surfaceTexture = createLimestoneAlbedo(this.scene);
    this.surfaceNormal = createLimestoneNormal(this.scene);
    material.albedoColor = BABYLON.Color3.FromHexString("#e7e2c8");
    material.albedoTexture = this.surfaceTexture;
    material.bumpTexture = this.surfaceNormal;
    material.metallic = 0;
    material.roughness = 0.66;
    material.usePhysicalLightFalloff = true;
    material.backFaceCulling = false;
    material.twoSidedLighting = true;
    material.environmentIntensity = 0.22;
    return material;
  }

  #createShell() {
    const positions = [];
    const indices = [];
    const uvs = [];
    const ringCount = Math.ceil(TUNNEL_CONFIG.length / TUNNEL_CONFIG.ringSpacing) + 1;
    const radialCount = TUNNEL_CONFIG.radialSegments;

    for (let ring = 0; ring < ringCount; ring += 1) {
      const z = Math.min(ring * TUNNEL_CONFIG.ringSpacing, TUNNEL_CONFIG.length);
      const profile = getTunnelProfileAt(z);
      for (let radial = 0; radial < radialCount; radial += 1) {
        const angle = (radial / radialCount) * Math.PI * 2;
        const point = profilePoint(profile, angle);
        positions.push(point.x, point.y, point.z);
        uvs.push(radial / radialCount, z / 8);
      }
    }

    for (let ring = 0; ring < ringCount - 1; ring += 1) {
      for (let radial = 0; radial < radialCount; radial += 1) {
        const nextRadial = (radial + 1) % radialCount;
        const a = ring * radialCount + radial;
        const b = ring * radialCount + nextRadial;
        const c = (ring + 1) * radialCount + radial;
        const d = (ring + 1) * radialCount + nextRadial;
        indices.push(a, b, c, b, d, c);
      }
    }

    const mesh = new BABYLON.Mesh("continuous-organic-shell", this.scene);
    const data = new BABYLON.VertexData();
    data.positions = positions;
    data.indices = indices;
    data.uvs = uvs;
    data.normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, data.normals);
    data.applyToMesh(mesh);
    mesh.material = this.shellMaterial;
    mesh.isPickable = false;
    return mesh;
  }

  #createRibs() {
    const positions = [];
    const indices = [];
    const radialCount = TUNNEL_CONFIG.radialSegments;
    const ribInset = 0.095;
    let vertexOffset = 0;
    const ribCenters = [
      5.2, 11.8, 18.9, 25.1, 33.4, 40.2, 48.6, 55.5, 63.1, 71.8,
      79.4, 88.7, 97.1, 105.2, 115.3, 124.6, 133.1, 143.7, 152.4, 161.9, 170.1,
    ];

    ribCenters.forEach((centerZ, ribIndex) => {
      const ribHalfWidth = 0.11 + (ribIndex % 4) * 0.045;
      const nearProfile = getTunnelProfileAt(centerZ - ribHalfWidth);
      const farProfile = getTunnelProfileAt(centerZ + ribHalfWidth);
      for (let radial = 0; radial < radialCount; radial += 1) {
        const angle = (radial / radialCount) * Math.PI * 2;
        const near = profilePoint(nearProfile, angle, ribInset);
        const far = profilePoint(farProfile, angle, ribInset);
        positions.push(near.x, near.y, near.z, far.x, far.y, far.z);
      }

      for (let radial = 0; radial < radialCount; radial += 1) {
        const next = (radial + 1) % radialCount;
        const a = vertexOffset + radial * 2;
        const b = vertexOffset + next * 2;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
      vertexOffset += radialCount * 2;
    });

    const material = new BABYLON.PBRMaterial("organic-ribs", this.scene);
    material.albedoColor = BABYLON.Color3.FromHexString("#263020");
    material.metallic = 0.22;
    material.roughness = 0.5;
    material.backFaceCulling = false;
    material.twoSidedLighting = true;
    material.emissiveColor = BABYLON.Color3.FromHexString("#071006");

    const mesh = new BABYLON.Mesh("organic-rib-field", this.scene);
    const data = new BABYLON.VertexData();
    data.positions = positions;
    data.indices = indices;
    data.normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, data.normals);
    data.applyToMesh(mesh);
    mesh.material = material;
    mesh.isPickable = false;
    this.ribMaterial = material;
    return mesh;
  }

  #createLightRibbons() {
    const material = new BABYLON.StandardMaterial("ribbon-emissive", this.scene);
    material.disableLighting = true;
    material.emissiveColor = new BABYLON.Color3(0.62, 0.7, 0.43);
    material.diffuseColor = BABYLON.Color3.Black();
    material.backFaceCulling = false;
    const left = buildStrip("left-ceiling-ribbon", this.scene, 1.15, 0.045, 0.02, material);
    const right = buildStrip("right-ceiling-ribbon", this.scene, 1.99, 0.045, 0.02, material);
    left.parent = this.root;
    right.parent = this.root;
    return { material, meshes: [left, right] };
  }

  update(frame) {
    if (frame.isWhiteRoom) {
      this.root.setEnabled(false);
      return;
    }
    this.root.setEnabled(true);
    this.fadeMeshes.forEach((mesh) => { mesh.visibility = 1; });
    const morning = frame.stage.id === "calm"
      ? 1
      : frame.stage.id === "unease"
        ? 1 - frame.stageProgress * frame.stageProgress * (3 - 2 * frame.stageProgress)
        : 0;
    const tension = frame.stage.id === "unease"
      ? 0.12 + frame.stageProgress * 0.12
      : frame.stage.id === "compression"
        ? 0.32 + frame.stageProgress * 0.2
        : frame.stage.id === "acceleration"
          ? 0.56 + frame.stageProgress * 0.18
          : frame.stage.id === "peak"
            ? 0.86
            : frame.stage.id === "crawl"
              ? 0.42
              : 0;
    // The shell itself, never the camera, performs tiny slow changes in
    // diameter. Brief higher-frequency contractions are limited to later
    // stages and read as architectural tension rather than a jump scare.
    const breath = Math.sin(frame.elapsed * (0.34 + tension * 0.22)) * (0.002 + tension * 0.007);
    const twitch = Math.pow(Math.max(0, Math.sin(
      frame.elapsed * (2.13 + tension * 0.47) + Math.sin(frame.elapsed * 0.41) * 1.8,
    )), 18) * tension * tension * 0.007;
    this.root.scaling.set(1 + breath - twitch, 1 + breath * 0.78 - twitch * 0.62, 1);
    this.surfaceTexture.uOffset = (frame.elapsed * (0.0012 + tension * 0.006)) % 1;
    this.surfaceTexture.vOffset = Math.sin(frame.elapsed * 0.23) * tension * 0.009;
    this.shellMaterial.roughness = 0.58 + tension * 0.24;
    this.ribMaterial.roughness = 0.5 + tension * 0.18;
    this.shellMaterial.albedoColor.set(
      0.23 + morning * 0.69 - tension * 0.06,
      0.28 + morning * 0.62 - tension * 0.07,
      0.20 + morning * 0.56 - tension * 0.04,
    );
    this.shellMaterial.emissiveColor.set(morning * 0.028, morning * 0.035, morning * 0.012);
    this.ribMaterial.albedoColor.set(0.12 + morning * 0.48, 0.15 + morning * 0.45, 0.10 + morning * 0.32);
    this.ribMaterial.emissiveColor.set(morning * 0.012, morning * 0.018, morning * 0.005);
    this.ribs.visibility = 0.18 + tension * 0.62;
    const pulse = Math.max(0, Math.sin(frame.elapsed * (1.1 + frame.stage.rhythm * 4)));
    const intensity = frame.stage.light * (0.16 + pulse * frame.stage.rhythm * 0.34);
    this.lightRibbons.material.emissiveColor.set(
      intensity * 0.72 + morning * 0.15 + twitch * 4,
      intensity * 0.82 + morning * 0.11 + twitch * 4.5,
      intensity * 0.48 + morning * 0.025 + twitch * 2.2,
    );
  }
}
