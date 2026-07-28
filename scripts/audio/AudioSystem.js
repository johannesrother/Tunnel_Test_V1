/**
 * Web Audio-based score engine. It is intentionally asset-independent for a
 * reliable first upload, but exposes spatial loop loading for authored audio.
 */
export class AudioSystem {
  constructor() {
    this.context = null;
    this.master = null;
    this.ambientGain = null;
    this.flatlineGain = null;
    this.flatline = null;
    this.whiteStarted = false;
    this.spatialLoops = [];
  }

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.context.destination);
      this.#createAmbientBed();
    }
    if (this.context.state !== "running") await this.context.resume();
  }

  #createAmbientBed() {
    const oscillator = this.context.createOscillator();
    const modulation = this.context.createOscillator();
    const modulationGain = this.context.createGain();
    this.ambientGain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 42;
    modulation.type = "sine";
    modulation.frequency.value = 0.08;
    modulationGain.gain.value = 5;
    this.ambientGain.gain.value = 0.012;
    modulation.connect(modulationGain).connect(oscillator.frequency);
    oscillator.connect(this.ambientGain).connect(this.master);
    oscillator.start();
    modulation.start();
  }

  /** Hook for authored binaural/spatial ambience later in production. */
  async addSpatialLoop(url, position) {
    await this.unlock();
    const response = await fetch(url);
    const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    const source = this.context.createBufferSource();
    const panner = this.context.createPanner();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
    gain.gain.value = 0;
    source.connect(panner).connect(gain).connect(this.master);
    source.start();
    this.spatialLoops.push({ source, panner, gain });
  }

  update(frame) {
    if (!this.context || !this.ambientGain) return;
    const now = this.context.currentTime;
    const target = frame.isWhiteRoom ? 0 : 0.004 + frame.stage.light * 0.022;
    this.ambientGain.gain.setTargetAtTime(target, now, 0.25);
    this.spatialLoops.forEach(({ gain }) => gain.gain.setTargetAtTime(target * 0.7, now, 0.25));
    if (frame.isWhiteRoom && !this.whiteStarted) this.#startFlatline();
  }

  #startFlatline() {
    this.whiteStarted = true;
    this.flatline = this.context.createOscillator();
    this.flatlineGain = this.context.createGain();
    this.flatline.type = "sine";
    this.flatline.frequency.value = 1000;
    this.flatlineGain.gain.value = 0;
    this.flatline.connect(this.flatlineGain).connect(this.master);
    this.flatline.start();
    this.flatlineGain.gain.linearRampToValueAtTime(0.09, this.context.currentTime + 0.16);
  }
}
