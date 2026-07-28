import { getTunnelProfileAt, TUNNEL_CONFIG } from "../core/config.js";
import { signedPower, smoothstep } from "../utils/math.js";

const NATURE_LENGTH_METRES = 42;
const NATURE_BANDS = [3.98, 5.44];
const NATURE_ANGULAR_SPAN = 0.44;

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

function createNatureAlbedo(scene) {
  const texture = new BABYLON.Texture(
    "./assets/textures/calm-nature-limestone-v1.png", scene, false, false,
    BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.uScale = 1.6;
  texture.vScale = 5.6;
  texture.anisotropicFilteringLevel = 4;
  return texture;
}

function createSurfaceNormal(scene) {
  const texture = new BABYLON.Texture(
    "./assets/textures/limestone-normal-v1.png", scene, false, false,
    BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.uScale = 1.6;
  texture.vScale = 5.6;
  texture.level = 0.24;
  texture.anisotropicFilteringLevel = 4;
  return texture;
}

function buildNaturalInset(scene, root, name, centerAngle, albedo, normal) {
  const positions = [];
  const indices = [];
  const uvs = [];
  const rings = Math.ceil(NATURE_LENGTH_METRES / TUNNEL_CONFIG.ringSpacing) + 1;
  const across = 7;

  for (let ring = 0; ring < rings; ring += 1) {
    const distance = Math.min(ring * TUNNEL_CONFIG.ringSpacing, NATURE_LENGTH_METRES);
    for (let column = 0; column < across; column += 1) {
      const lateral = column / (across - 1) - 0.5;
      const point = profilePoint(distance, centerAngle + lateral * NATURE_ANGULAR_SPAN, 0.034);
      positions.push(point.x, point.y, point.z);
      uvs.push(column / (across - 1), distance / 7.5);
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
  mesh.parent = root;
  mesh.isPickable = false;

  const material = new BABYLON.PBRMaterial(`${name}-material`, scene);
  material.albedoTexture = albedo;
  material.bumpTexture = normal;
  material.metallic = 0;
  material.roughness = 0.8;
  material.usePhysicalLightFalloff = true;
  material.environmentIntensity = 0.2;
  material.backFaceCulling = false;
  material.twoSidedLighting = true;
  material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
  material.alpha = 0.9;
  mesh.material = material;
  return { mesh, material };
}

/**
 * Photographed nature exists as two nearly flush limestone insets, not as
 * separate prop geometry. This keeps the tunnel sculptural in VR while the
 * real moss, lichen and small spring details remain physically plausible.
 */
export class CalmNatureSystem {
  constructor(scene) {
    this.root = new BABYLON.TransformNode("calm-nature", scene);
    const albedo = createNatureAlbedo(scene);
    const normal = createSurfaceNormal(scene);
    this.insetBands = NATURE_BANDS.map((angle, index) => buildNaturalInset(
      scene, this.root, `calm-natural-inset-${index}`, angle, albedo, normal,
    ));
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

    this.insetBands.forEach(({ mesh, material }) => {
      mesh.visibility = vitality;
      material.alpha = 0.9 * vitality;
    });
  }
}
