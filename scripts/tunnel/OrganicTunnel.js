import { TUNNEL_CONFIG, TUNNEL_PROFILE_ANCHORS } from "../core/config.js";
import { lerp, signedPower, smoothstep } from "../utils/math.js";

function profileAt(z) {
  const last = TUNNEL_PROFILE_ANCHORS.at(-1);
  if (z >= last.z) return { ...last };

  for (let index = 0; index < TUNNEL_PROFILE_ANCHORS.length - 1; index += 1) {
    const from = TUNNEL_PROFILE_ANCHORS[index];
    const to = TUNNEL_PROFILE_ANCHORS[index + 1];
    if (z <= to.z) {
      const progress = smoothstep(from.z, to.z, z);
      return {
        z,
        width: lerp(from.width, to.width, progress),
        height: lerp(from.height, to.height, progress),
        roundness: lerp(from.roundness, to.roundness, progress),
      };
    }
  }
  return { ...last };
}

function profilePoint(profile, angle, inset = 0) {
  const exponent = 2 / profile.roundness;
  const horizontalRadius = profile.width / 2 - inset;
  const verticalRadius = profile.height / 2 - inset;
  return new BABYLON.Vector3(
    horizontalRadius * signedPower(Math.cos(angle), exponent),
    profile.height / 2 + verticalRadius * signedPower(Math.sin(angle), exponent),
    profile.z,
  );
}

function buildStrip(name, scene, centerAngle, angularSpan, inset, material) {
  const positions = [];
  const indices = [];
  const uvs = [];
  const rings = Math.ceil(TUNNEL_CONFIG.length / TUNNEL_CONFIG.ringSpacing) + 1;
  const across = 6;

  for (let ring = 0; ring < rings; ring += 1) {
    const z = Math.min(ring * TUNNEL_CONFIG.ringSpacing, TUNNEL_CONFIG.length);
    const profile = profileAt(z);
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
 * A single welded, high-roundness loft creates the architecture. The tunnel is
 * not assembled from visible boxes: longitudinal samples smoothly interpolate
 * the authored spatial states, eliminating seams between former "modules".
 */
export class OrganicTunnel {
  constructor(scene, videoWalls) {
    this.scene = scene;
    this.root = new BABYLON.TransformNode("organic-tunnel", scene);
    this.root.setEnabled(true);
    this.shellMaterial = this.#createShellMaterial();
    this.shell = this.#createShell();
    this.shell.parent = this.root;

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
  }

  #createShellMaterial() {
    const material = new BABYLON.PBRMaterial("dark-concrete", this.scene);
    material.albedoColor = BABYLON.Color3.FromHexString("#151719");
    material.metallic = 0.08;
    material.roughness = 0.78;
    material.backFaceCulling = false;
    material.twoSidedLighting = true;
    material.environmentIntensity = 0.18;
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
      const profile = profileAt(z);
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

  #createLightRibbons() {
    const material = new BABYLON.StandardMaterial("ribbon-emissive", this.scene);
    material.disableLighting = true;
    material.emissiveColor = new BABYLON.Color3(0.42, 0.48, 0.52);
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
    const pulse = Math.max(0, Math.sin(frame.elapsed * (1.1 + frame.stage.rhythm * 4)));
    const intensity = frame.stage.light * (0.14 + pulse * frame.stage.rhythm * 0.28);
    this.lightRibbons.material.emissiveColor.set(
      intensity * 0.78,
      intensity * 0.87,
      intensity,
    );
  }
}
