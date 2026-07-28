import { getTunnelProfileAt, TUNNEL_CONFIG } from "../core/config.js";
import { signedPower, smoothstep } from "../utils/math.js";

function profilePoint(distance, angle, inset = 0) {
  const profile = getTunnelProfileAt(distance);
  const exponent = 2 / profile.roundness;
  const radius = profile.diameter / 2 - inset;
  return new BABYLON.Vector3(
    radius * signedPower(Math.cos(angle), exponent),
    TUNNEL_CONFIG.eyeLineHeight + radius * signedPower(Math.sin(angle), exponent),
    profile.z,
  );
}

function buildMossField(scene, root) {
  const positions = [];
  const indices = [];
  let offset = 0;

  // A single mesh carries all of the small, lower-edge patches. The values are
  // authored rather than random, so the composition stays calm and repeatable.
  for (let index = 0; index < 24; index += 1) {
    const distance = 3 + index * 1.52;
    const angle = index % 2 === 0 ? 3.98 : 5.45;
    const point = profilePoint(distance, angle, 0.028);
    const halfWidth = 0.11 + (index % 4) * 0.026;
    const halfLength = 0.15 + (index % 3) * 0.045;
    const tangentX = -Math.sin(angle) * halfWidth;
    const tangentY = Math.cos(angle) * halfWidth;
    positions.push(
      point.x - tangentX, point.y - tangentY, point.z - halfLength,
      point.x + tangentX, point.y + tangentY, point.z - halfLength,
      point.x + tangentX, point.y + tangentY, point.z + halfLength,
      point.x - tangentX, point.y - tangentY, point.z + halfLength,
    );
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    offset += 4;
  }

  const moss = new BABYLON.Mesh("calm-moss-patches", scene);
  const data = new BABYLON.VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = [];
  BABYLON.VertexData.ComputeNormals(positions, indices, data.normals);
  data.applyToMesh(moss);
  moss.parent = root;
  moss.isPickable = false;

  const material = new BABYLON.StandardMaterial("calm-moss-material", scene);
  material.diffuseColor = BABYLON.Color3.FromHexString("#4e7641");
  material.emissiveColor = BABYLON.Color3.FromHexString("#12250d");
  material.specularColor = BABYLON.Color3.Black();
  material.alpha = 0.66;
  material.backFaceCulling = false;
  moss.material = material;
  return { mesh: moss, material };
}

function buildGrassField(scene, root) {
  const lines = [];
  for (let index = 0; index < 48; index += 1) {
    const distance = 2.4 + index * 0.76;
    const angle = index % 2 === 0 ? 4.16 : 5.26;
    const rootPoint = profilePoint(distance, angle, 0.04);
    const height = 0.09 + (index % 5) * 0.018;
    const sway = ((index % 7) - 3) * 0.008;
    lines.push([
      rootPoint,
      new BABYLON.Vector3(rootPoint.x + sway, rootPoint.y + height * 0.58, rootPoint.z + 0.018),
      new BABYLON.Vector3(rootPoint.x + sway * 1.7, rootPoint.y + height, rootPoint.z + 0.048),
    ]);
  }
  const grass = BABYLON.MeshBuilder.CreateLineSystem("calm-grass", { lines }, scene);
  grass.parent = root;
  grass.color = BABYLON.Color3.FromHexString("#729b4f");
  grass.isPickable = false;
  return grass;
}

function buildFlowerInstances(scene, root, name, color, startIndex) {
  const flower = BABYLON.MeshBuilder.CreateSphere(name, { diameter: 0.052, segments: 4 }, scene);
  flower.parent = root;
  flower.isPickable = false;
  const material = new BABYLON.StandardMaterial(`${name}-material`, scene);
  material.diffuseColor = color;
  material.emissiveColor = color.scale(0.22);
  material.specularColor = BABYLON.Color3.Black();
  flower.material = material;

  const matrix = new BABYLON.Matrix();
  for (let index = 0; index < 8; index += 1) {
    const sourceIndex = startIndex + index * 5;
    const distance = 4.8 + sourceIndex * 0.76;
    const angle = sourceIndex % 2 === 0 ? 4.16 : 5.26;
    const point = profilePoint(distance, angle, 0.047);
    BABYLON.Matrix.TranslationToRef(point.x, point.y + 0.13, point.z + 0.045, matrix);
    flower.thinInstanceAdd(matrix);
  }
  flower.setEnabled(true);
  return { mesh: flower, material };
}

/**
 * Restrained spring-life dressing for the first tunnel section. It uses one
 * moss mesh, one line system, and two instanced flower meshes, keeping the
 * architectural shell dominant and the GPU cost effectively constant.
 */
export class CalmNatureSystem {
  constructor(scene) {
    this.root = new BABYLON.TransformNode("calm-nature", scene);
    this.moss = buildMossField(scene, this.root);
    // Low-poly blades and spheres read as game props in a headset. Keep the
    // organic hint limited to nearly flush moss until photographed vegetation
    // cards are authored for the final installation.
    this.grass = null;
    this.flowers = [];
  }

  update(frame) {
    const vitality = frame.stage.id === "calm"
      ? 1
      : frame.stage.id === "unease"
        ? 1 - smoothstep(0, 1, frame.stageProgress)
        : 0;
    const visible = vitality > 0.002;
    this.root.setEnabled(visible);
    if (!visible) return;

    this.moss.mesh.visibility = vitality;
    this.moss.material.alpha = 0.66 * vitality;
    if (this.grass) this.grass.visibility = vitality;
    this.flowers.forEach(({ mesh, material }) => {
      mesh.visibility = vitality;
      material.alpha = vitality;
    });
  }
}
