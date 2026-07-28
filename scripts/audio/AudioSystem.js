const PIANO_NOTES = Object.freeze([57, 60, 64, 67, 64, 60, 55, 62]);
const BIRD_PHRASES = Object.freeze([
  Object.freeze([{ note: 81, offset: 0, duration: 0.17, bend: 5 }, { note: 85, offset: 0.19, duration: 0.24, bend: 3 }]),
  Object.freeze([{ note: 78, offset: 0, duration: 0.22, bend: 4 }, { note: 82, offset: 0.31, duration: 0.17, bend: 6 }]),
  Object.freeze([{ note: 86, offset: 0, duration: 0.13, bend: 2 }, { note: 83, offset: 0.16, duration: 0.19, bend: 5 }, { note: 80, offset: 0.4, duration: 0.17, bend: 3 }]),
  Object.freeze([{ note: 76, offset: 0, duration: 0.25, bend: 6 }]),
]);
const BIRD_INTERVALS = Object.freeze([2.65, 3.82, 2.34, 4.18]);

function midiToFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

function createNoiseBuffer(context, seconds = 2) {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
  const channel = buffer.getChannelData(0);
  let state = 0x12345678;
  for (let index = 0; index < channel.length; index += 1) {
    // A deterministic pseudo-random source keeps the rendered texture stable.
    state = (1664525 * state + 1013904223) >>> 0;
    channel[index] = (state / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

/**
 * Asset-independent, layered score engine. It deliberately uses Web Audio
 * primitives instead of mandatory media files so the uploaded installation is
 * complete today, while addSpatialLoop remains the hook for final mastered
 * material in assets/audio.
 */
export class AudioSystem {
  constructor() {
    this.context = null;
    this.master = null;
    this.buses = null;
    this.layers = null;
    this.flatline = null;
    this.flatlineGain = null;
    this.whiteStarted = false;
    this.spatialLoops = [];
    this.nextPianoAt = 0;
    this.nextBirdAt = 0;
    this.pianoIndex = 0;
    this.birdIndex = 0;
  }

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.context.destination);
      this.#createScore();
    }
    if (this.context.state !== "running") await this.context.resume();
  }

  #createBus() {
    const bus = this.context.createGain();
    bus.gain.value = 0;
    bus.connect(this.master);
    return bus;
  }

  #createScore() {
    this.buses = {
      comfort: this.#createBus(),
      nature: this.#createBus(),
      tension: this.#createBus(),
      pulse: this.#createBus(),
      breath: this.#createBus(),
      peak: this.#createBus(),
    };
    this.layers = {
      pad: this.#createWarmPad(),
      wind: this.#createNoiseLayer(this.buses.nature, "lowpass", 720, 0.5),
      drone: this.#createDrone(),
      pulse: this.#createPulse(),
      breath: this.#createNoiseLayer(this.buses.breath, "bandpass", 210, 1.4),
      air: this.#createNoiseLayer(this.buses.peak, "highpass", 1450, 0.8),
    };
    this.nextPianoAt = this.context.currentTime + 0.2;
    this.nextBirdAt = this.context.currentTime + 1.1;
  }

  #createWarmPad() {
    const filter = this.context.createBiquadFilter();
    const output = this.context.createGain();
    const lfo = this.context.createOscillator();
    const lfoDepth = this.context.createGain();
    filter.type = "lowpass";
    filter.frequency.value = 620;
    filter.Q.value = 0.35;
    output.gain.value = 0.52;
    filter.connect(output).connect(this.buses.comfort);
    lfo.frequency.value = 0.075;
    lfoDepth.gain.value = 150;
    lfo.connect(lfoDepth).connect(filter.frequency);
    lfo.start();

    [110, 165, 220].forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const voiceGain = this.context.createGain();
      oscillator.type = index === 1 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 0 ? -4 : index === 2 ? 3 : 0;
      voiceGain.gain.value = index === 1 ? 0.34 : 0.22;
      oscillator.connect(voiceGain).connect(filter);
      oscillator.start();
    });
    return { output };
  }

  #createNoiseLayer(destination, filterType, frequency, resonance) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const output = this.context.createGain();
    source.buffer = createNoiseBuffer(this.context);
    source.loop = true;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = resonance;
    output.gain.value = 0.34;
    source.connect(filter).connect(output).connect(destination);
    source.start();
    return { source, filter, output };
  }

  #createDrone() {
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const output = this.context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 38;
    filter.type = "lowpass";
    filter.frequency.value = 125;
    filter.Q.value = 0.7;
    output.gain.value = 0.24;
    oscillator.connect(filter).connect(output).connect(this.buses.tension);
    oscillator.start();
    return { oscillator, filter, output };
  }

  #createPulse() {
    const oscillator = this.context.createOscillator();
    const output = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 52;
    output.gain.value = 0;
    oscillator.connect(output).connect(this.buses.pulse);
    oscillator.start();
    return { oscillator, output };
  }

  #playSoftPiano(time, midiNote, level) {
    const frequency = midiToFrequency(midiNote);
    const output = this.context.createGain();
    const harmonics = this.context.createGain();
    const tone = this.context.createOscillator();
    const overtone = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const duration = 2.6;

    tone.type = "triangle";
    tone.frequency.setValueAtTime(frequency, time);
    overtone.type = "sine";
    overtone.frequency.setValueAtTime(frequency * 2.01, time);
    harmonics.gain.value = 0.22;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, time);
    output.gain.setValueAtTime(0.0001, time);
    output.gain.linearRampToValueAtTime(level, time + 0.028);
    output.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    tone.connect(filter);
    overtone.connect(harmonics).connect(filter);
    filter.connect(output).connect(this.buses.comfort);
    tone.start(time);
    overtone.start(time);
    tone.stop(time + duration + 0.05);
    overtone.stop(time + duration + 0.05);
  }

  #playBird(time, midiNote, level, duration, bend) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(midiToFrequency(midiNote), time);
    oscillator.frequency.exponentialRampToValueAtTime(midiToFrequency(midiNote + bend), time + duration);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2850, time);
    filter.Q.value = 2.1;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(level, time + Math.min(0.035, duration * 0.28));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter).connect(gain).connect(this.buses.nature);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.04);
  }

  #playBirdPhrase(time, phrase, level) {
    phrase.forEach(({ note, offset, duration, bend }, noteIndex) => {
      this.#playBird(time + offset, note, level * (1 - noteIndex * 0.12), duration, bend);
    });
  }

  #scheduleComfortDetails(frame, now) {
    const canPlayPiano = frame.stage.id === "calm" || frame.stage.id === "unease";
    if (canPlayPiano) {
      const interval = frame.stage.id === "calm" ? 1.55 : 2.05;
      while (this.nextPianoAt <= now + 0.12) {
        const note = PIANO_NOTES[this.pianoIndex % PIANO_NOTES.length];
        const level = frame.stage.id === "calm" ? 0.075 : 0.043;
        this.#playSoftPiano(this.nextPianoAt, note, level);
        this.pianoIndex += 1;
        this.nextPianoAt += interval;
      }
    }

    const birdFade = frame.stage.id === "calm"
      ? 1
      : frame.stage.id === "unease"
        ? 1 - frame.stageProgress * frame.stageProgress * (3 - 2 * frame.stageProgress)
        : 0;
    if (birdFade > 0.002) {
      while (this.nextBirdAt <= now + 0.12) {
        const phraseIndex = this.birdIndex % BIRD_PHRASES.length;
        this.#playBirdPhrase(this.nextBirdAt, BIRD_PHRASES[phraseIndex], 0.018 * birdFade);
        this.birdIndex += 1;
        this.nextBirdAt += BIRD_INTERVALS[phraseIndex];
      }
    }
  }

  #setBus(bus, value, now, smoothing = 0.12) {
    bus.gain.setTargetAtTime(value, now, smoothing);
  }

  #mixFor(frame) {
    const progress = frame.stageProgress;
    switch (frame.stage.id) {
      case "calm":
        return { comfort: 0.24, nature: 0.14, tension: 0, pulse: 0, breath: 0, peak: 0 };
      case "unease":
        return {
          comfort: 0.2 - progress * 0.09,
          nature: 0.105 - progress * 0.09,
          tension: 0.018 + progress * 0.028,
          pulse: progress * 0.012,
          breath: 0.004 + progress * 0.008,
          peak: 0,
        };
      case "compression":
        return {
          comfort: 0.08 - progress * 0.07,
          nature: 0.025 - progress * 0.023,
          tension: 0.06 + progress * 0.065,
          pulse: 0.018 + progress * 0.03,
          breath: 0.018 + progress * 0.04,
          peak: progress * 0.012,
        };
      case "acceleration":
        return {
          comfort: 0,
          nature: 0,
          tension: 0.12 + progress * 0.045,
          pulse: 0.06 + progress * 0.065,
          breath: 0.065 + progress * 0.055,
          peak: 0.025 + progress * 0.06,
        };
      case "peak":
        return {
          comfort: 0,
          nature: 0,
          tension: 0.18,
          pulse: 0.135,
          breath: 0.15,
          peak: 0.11,
        };
      case "crawl":
        return {
          comfort: 0,
          nature: 0,
          tension: 0.042 * (1 - progress),
          pulse: 0.022 * (1 - progress),
          breath: 0.03 * (1 - progress),
          peak: 0.008 * (1 - progress),
        };
      default:
        return { comfort: 0, nature: 0, tension: 0, pulse: 0, breath: 0, peak: 0 };
    }
  }

  /** Production hook for authored binaural/spatial ambience. */
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
    if (!this.context || !this.buses) return;
    const now = this.context.currentTime;
    if (frame.isWhiteRoom) {
      this.#enterWhiteRoom(now);
      this.#fadeFlatline(frame.whiteFadeProgress, now);
      return;
    }

    const mix = this.#mixFor(frame);
    this.#scheduleComfortDetails(frame, now);
    Object.entries(mix).forEach(([name, value]) => this.#setBus(this.buses[name], value, now));

    // The low pulse is amplitude-shaped, not a metronome: its rhythm speeds up
    // with the stage while the visitor's physical forward velocity stays fixed.
    const pulseRate = 0.72 + frame.stage.rhythm * 0.72;
    const pulseShape = Math.pow(Math.max(0, Math.sin(frame.elapsed * pulseRate * Math.PI * 2)), 7);
    this.layers.pulse.output.gain.setTargetAtTime(pulseShape * 0.9, now, 0.025);
    this.layers.drone.filter.frequency.setTargetAtTime(110 + frame.stage.rhythm * 95, now, 0.2);
    this.layers.breath.filter.frequency.setTargetAtTime(170 + frame.stage.rhythm * 120, now, 0.18);
    this.spatialLoops.forEach(({ gain }) => gain.gain.setTargetAtTime(mix.tension * 0.45, now, 0.15));
  }

  #enterWhiteRoom(now) {
    if (!this.whiteStarted) {
      Object.values(this.buses).forEach((bus) => bus.gain.setValueAtTime(0, now));
      this.spatialLoops.forEach(({ gain }) => gain.gain.setValueAtTime(0, now));
      this.#startFlatline(now);
      this.whiteStarted = true;
    }
  }

  #startFlatline(now) {
    this.flatline = this.context.createOscillator();
    this.flatlineGain = this.context.createGain();
    this.flatline.type = "sine";
    this.flatline.frequency.value = 1000;
    this.flatlineGain.gain.setValueAtTime(0, now);
    this.flatlineGain.gain.linearRampToValueAtTime(0.075, now + 0.04);
    this.flatline.connect(this.flatlineGain).connect(this.master);
    this.flatline.start(now);
  }

  #fadeFlatline(progress, now) {
    if (!this.flatlineGain) return;
    this.flatlineGain.gain.setTargetAtTime(0.075 * (1 - progress), now, 0.08);
  }
}
