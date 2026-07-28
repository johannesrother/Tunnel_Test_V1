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

function createOrganicSurfaceTexture(scene) {
  const texture = new BABYLON.DynamicTexture("organic-concrete-detail", { width: 1024, height: 1024 }, scene, false);
  const context = texture.getContext();
  const base = context.createLinearGradient(0, 0, 1024, 1024);
  base.addColorStop(0, "#172117");
  base.addColorStop(0.46, "#3e4b34");
  base.addColorStop(1, "#10170f");
  context.fillStyle = base;
  context.fillRect(0, 0, 1024, 1024);

  // Fine, repeated contour lines create a damp, layered surface without a
  // high-resolution bitmap download or a texture lookup per tunnel segment.
  for (let line = 0; line < 30; line += 1) {
    const y = line * 35 + 14;
    context.beginPath();
    context.moveTo(-20, y);
    for (let x = 0; x <= 1050; x += 60) {
      const wave = Math.sin(x * 0.018 + line * 0.9) * 8
        + Math.sin(x * 0.047 + line * 0.37) * 4;
      context.lineTo(x, y + wave);
    }
    context.strokeStyle = line % 4 === 0
      ? "rgba(202, 213, 156, 0.12)"
      : "rgba(8, 14, 8, 0.16)";
    context.lineWidth = line % 4 === 0 ? 2.2 : 1;
    context.stroke();
  }

  for (let fleck = 0; fleck < 320; fleck += 1) {
    const x = (fleck * 137) % 1024;
    const y = (fleck * 311) % 1024;
    const radius = 0.5 + ((fleck * 17) % 5) * 0.24;
    context.fillStyle = fleck % 3 === 0
      ? "rgba(206, 214, 169, 0.07)"
      : "rgba(4, 10, 4, 0.10)";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.uScale = 0.72;
  texture.vScale = 0.82;
  texture.update(false);
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
 * A single welded, high-roundness loft creates the architecture. The shell
 * remains continuous; the inset ribs are one lightweight decorative mesh that
 * adds the layered, organic cadence of the reference without creating seams.
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
  }

  #createShellMaterial() {
    const material = new BABYLON.PBRMaterial("moss-concrete", this.scene);
    material.albedoColor = BABYLON.Color3.FromHexString("#647055");
    material.albedoTexture = createOrganicSurfaceTexture(this.scene);
    material.metallic = 0.12;
    material.roughness = 0.61;
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

  #createRibs() {
    const positions = [];
    const indices = [];
    const radialCount = TUNNEL_CONFIG.radialSegments;
    const ribHalfWidth = 0.18;
    const ribInset = 0.095;
    let vertexOffset = 0;

    for (let centerZ = 6; centerZ < TUNNEL_CONFIG.length - 4; centerZ += 6) {
      const nearProfile = profileAt(centerZ - ribHalfWidth);
      const farProfile = profileAt(centerZ + ribHalfWidth);
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
    }

    const material = new BABYLON.PBRMaterial("organic-ribs", this.scene);
    material.albedoColor = BABYLON.Color3.FromHexString("#263020");
    material.metallic = 0.22;
    material.roughness = 0.42;
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
    const pulse = Math.max(0, Math.sin(frame.elapsed * (1.1 + frame.stage.rhythm * 4)));
    const intensity = frame.stage.light * (0.16 + pulse * frame.stage.rhythm * 0.34);
    this.lightRibbons.material.emissiveColor.set(
      intensity * 0.85,
      intensity,
      intensity * 0.55,
    );
  }
}
