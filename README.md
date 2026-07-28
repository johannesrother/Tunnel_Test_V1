# Tunnel Test V3

Tunnel Test V3 is a complete 60-second architectural WebXR experience for Meta Quest Browser and modern desktop browsers. It is a cinematic study of pressure, sensory overload, loss of control, and release—not a simulation of a medical condition.

It is intentionally a static website. There is no Node.js, npm, Vite, framework, build step, or local development server requirement. Babylon.js is loaded directly from its CDN and the application is authored as browser-native ES modules.

## Publish to GitHub Pages

1. Create a GitHub repository called `Tunnel_Test_V3`.
2. Upload the **contents** of this folder to the repository root.
3. In **Settings → Pages**, deploy from the `main` branch, folder `/ (root)`.
4. Open the resulting HTTPS URL in Meta Quest Browser.

GitHub Pages provides the HTTPS secure context required by immersive WebXR. The project also works from any normal HTTPS web server. Babylon.js is fetched from `https://cdn.babylonjs.com`, so the visitor needs an internet connection.

## Controls

Select **BEGIN** once. The browser uses that gesture to permit audio and, where supported, enter immersive VR. The visitor moves automatically through the tunnel, cannot steer or teleport, and can freely rotate their head. The entry screen disappears before the experience; there is no in-experience HUD or menu.

## Artistic timeline

| Time | State | Architecture and sound |
| --- | --- | --- |
| 0–8 s | Calm | Spring-morning daylight, restrained moss/grass/flowers, warm pad, soft piano, wind and varied distant birds |
| 8–18 s | Unease | Imperceptible narrowing; daylight, vegetation and bird calls fade continuously while low drone and subtle dissonance emerge |
| 18–29 s | Compression | Peaceful layer recedes; breath, pulse and harmonic tension grow |
| 29–40 s | Acceleration | Rail remains steady; only visual and rhythmic density increases |
| 40–50 s | Peak | Dense 1.9–2.4 m architecture; layered drone, breath and pulse |
| 50–55 s | Crawl | Final descent to 1.5 m; exhausted residual textures |
| 54–55 s | Final pull | The fixed rail resolves into a smooth, powerful one-second acceleration toward the light |
| 55–58 s | White room | Infinite white clear space; only a clean flatline tone |
| 58–60 s | Silent fade | Flatline fades away; a blank white veil completes the experience |

No text, logo, menu, credits, or interface appears after the visitor enters the White Room.

## Architecture decisions

### One continuous organic shell

`scripts/tunnel/OrganicTunnel.js` generates a single welded loft, sampled every 1.1 metres from a rounded superellipse profile. Its inner diameter reduces continuously from **3.5 m to 1.5 m** over the entire 55-second tunnel traversal. The profile centre follows the headset eye line, allowing the final 1.5 m diameter to surround the visitor without clipping tracked head movement. Diameter and curvature interpolate smoothly between authored anchors in `scripts/core/config.js`; floor, walls, and ceiling therefore remain one continuous surface with no rectangular modules or visible seams.

The video surfaces and slim practical-light ribbons are separate only because they require different materials. They conform to the same mathematical profile, so they read as integrated architectural insets rather than attached screens. `WhiteRoomPortal` adds two low-cost emissive discs at the final opening: the core is a small, visible white point at the start, grows naturally with forward travel, and expands rapidly during the final pull.

### Spring-morning opening

`CalmNatureSystem` dresses only the lower edges of the initial 40 m with a single moss mesh, one grass line system, and two instanced flower meshes. This keeps the structure legible as architecture rather than turning it into a forest, while adding small signs of life at the threshold. `LightingSystem` blends a shadow-free warm directional source, brighter hemispheric fill, and pale atmospheric fog through Calm and then eases it out throughout Unease. The fog is deliberately exponential rather than a full-screen volumetric effect, preserving depth at Quest-friendly cost.

### Master timeline

`ExperienceTimeline` is the sole clock. Each frame supplies an immutable state containing elapsed time, stage, rail distance, inner profile, portal-pull state, White Room duration, and white-fade progress. The rail advances at a calm fixed 3.0 m/s until second 54. Its fourth-power final term begins with that same incoming velocity, then accelerates continuously into the portal at second 55. Camera movement, portal scale, fog, practical lighting, display brightness, ambience, release, and the silent fade all consume that same state.

### Comfortable automatic locomotion

The camera is parented to a forward-only rig. It advances at a fixed **3.0 m/s** until the final second, then follows the authored continuous pull into the White Room and stops completely. Headset orientation is untouched. Desktop keyboard/gamepad movement, WebXR teleportation, pointer selection, and near interaction are disabled.

### Video and audio replacement

Each wall has one shared material and at most one `VideoTexture`/HTML5 decoder. This is substantially lighter than decoding a video for each apparent panel. Replace the `null` values in `scripts/core/config.js`:

```js
export const VIDEO_SOURCES = Object.freeze({
  left: "./assets/videos/left-wall.mp4",
  right: "./assets/videos/right-wall.mp4",
});
```

Place H.264/AAC MP4 files in `assets/videos/`. Keep them short, muted, loopable, and appropriately encoded for mobile hardware. With no files configured, generated placeholder display textures keep the installation immediately runnable.

`AudioSystem` creates an authored procedural score without external files: warm pad, soft piano, flowing air, and irregular multi-note bird phrases initially; then increasingly low drones, breath texture, shaped pulse and filtered air. The bird phrases and the nature bus fade smoothly across Unease and reach silence before Compression begins. Each layer is independently mixed by the master timeline, so the sound changes continuously rather than jumping between scenes. All layers stop instantly at White Room entry; the room contains only a clean 1 kHz flatline tone, which fades to silence from second 58. `addSpatialLoop(url, position)` remains the production hook for authored binaural or spatial loops in `assets/audio/`.

### Quest-oriented rendering budget

The scene uses one shell mesh, two display meshes, two emissive ribbons, and three moving practical lights. The architectural depth effect is produced with exponential fog instead of expensive fullscreen volumetric passes. This keeps draw calls, geometry count, video decoders, and lighting cost suitable for a Meta Quest 3 browser target. Add production textures conservatively and test the actual headset at 72 Hz.

## Project structure

```text
Tunnel_Test_V3/
├── index.html                 Page shell and Babylon CDN reference
├── style.css                  Entry and ending presentation only
├── main.js                    Browser module entry point
├── README.md
├── LICENSE
├── .gitignore
├── assets/
│   ├── models/                Reserved for optimized glTF/GLB assets
│   ├── textures/              Reserved for compressed texture assets
│   ├── videos/                Optional wall MP4 files
│   ├── audio/                 Optional authored spatial loops
│   └── hdr/                   Reserved for environment maps
├── scripts/
│   ├── core/                  Composition root, configuration, WebXR
│   ├── tunnel/                Continuous parametric architecture
│   ├── timeline/              Deterministic 60-second score
│   ├── lighting/              Practical lights and fog
│   ├── video/                 Shared video-texture channels
│   ├── audio/                 Web Audio and spatial-loop hook
│   ├── camera/                Forward-only locomotion rig
│   └── utils/                 Small shared math helpers
└── libs/                      Deliberately empty; Babylon is CDN-hosted
```

## Authoring notes

- Maintain the `TUNNEL_PROFILE_ANCHORS` order and ensure that each successive anchor has a greater `z` value and a smaller diameter.
- Keep all timing edits in `STAGES`, `TUNNEL_TRAVEL_DURATION_SECONDS`, `FINAL_ACCELERATION_DURATION_SECONDS`, and `WHITE_ROOM_FADE_START_SECONDS`; the total remains exactly 60 seconds.
- Do not add video textures per repeated surface. Reuse the two wall materials.
- Use KTX2/Basis or low-resolution textures for production assets when possible, and test decoded media memory on the headset.
- The project uses relative URLs throughout, so it works from a GitHub Pages project URL without configuring a base path.

## License

The code is released under the [MIT License](LICENSE). Any media added to `assets/` must be separately licensed for its intended use.
