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

| Time | State | Interior profile |
| --- | --- | --- |
| 0–8 s | Calm | 8.0 m wide × 6.0 m high |
| 8–18 s | Unease | 7.2 m × 5.5 m |
| 18–29 s | Compression | 6.0 m × 4.8 m |
| 29–40 s | Acceleration | 5.0 m × 4.0 m |
| 40–50 s | Peak | 3.8 m × 3.2 m |
| 50–55 s | Crawl | 3.0 m × 2.8 m |
| 55–60 s | White room | unbounded pure white clear space |

At exactly 60 seconds, **The End** appears while the display fades to black.

## Architecture decisions

### One continuous organic shell

`scripts/tunnel/OrganicTunnel.js` generates a single welded loft, sampled every 1.5 metres from a rounded superellipse profile. Width, height, and curvature interpolate smoothly between the authored anchors in `scripts/core/config.js`. The floor, walls, and ceiling therefore share one continuous surface; there are no rectangular corridor pieces or visible modular seams.

The video surfaces and slim practical-light ribbons are separate only because they require different materials. They conform to the same mathematical profile, so they read as integrated architectural insets rather than attached screens.

### Master timeline

`ExperienceTimeline` is the sole clock. Each frame supplies an immutable state containing elapsed time, stage, rail distance, and stage progress. Camera movement, fog, practical lighting, display brightness, ambience, white-room release, and the ending all consume that same state, which keeps the score synchronized.

### Comfortable automatic locomotion

The camera is parented to a forward-only rig. The rig moves along the positive-Z rail; headset orientation is untouched. Desktop keyboard/gamepad movement, WebXR teleportation, pointer selection, and near interaction are disabled.

### Video and audio replacement

Each wall has one shared material and at most one `VideoTexture`/HTML5 decoder. This is substantially lighter than decoding a video for each apparent panel. Replace the `null` values in `scripts/core/config.js`:

```js
export const VIDEO_SOURCES = Object.freeze({
  left: "./assets/videos/left-wall.mp4",
  right: "./assets/videos/right-wall.mp4",
});
```

Place H.264/AAC MP4 files in `assets/videos/`. Keep them short, muted, loopable, and appropriately encoded for mobile hardware. With no files configured, generated placeholder display textures keep the installation immediately runnable.

`AudioSystem` creates a minimal procedural ambient bed and the ending flatline without external files. `addSpatialLoop(url, position)` is the production hook for authored spatial loops in `assets/audio/`.

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

- Maintain the `TUNNEL_PROFILE_ANCHORS` order and ensure that each successive anchor has a greater `z` value.
- Keep all timing edits in `STAGES`; the total remains exactly 60 seconds.
- Do not add video textures per repeated surface. Reuse the two wall materials.
- Use KTX2/Basis or low-resolution textures for production assets when possible, and test decoded media memory on the headset.
- The project uses relative URLs throughout, so it works from a GitHub Pages project URL without configuring a base path.

## License

The code is released under the [MIT License](LICENSE). Any media added to `assets/` must be separately licensed for its intended use.
