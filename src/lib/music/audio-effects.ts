// ── Audio Effects Processing Chain ──────────────────────────────────────────

/**
 * Web Audio effects chain that can be applied to any playback:
 * Reverb, Delay, Compression, EQ, and Distortion/Overdrive.
 */

export interface EffectsChain {
  reverb?: ReverbConfig;
  delay?: DelayConfig;
  compression?: CompressionConfig;
  eq?: EQConfig;
  distortion?: DistortionConfig;
}

export interface ReverbConfig {
  enabled: boolean;
  roomSize: number; // 0-1
  damping: number; // 0-1
  wet: number; // 0-1 (mix)
  dry: number; // 0-1
  decay: number; // seconds
}

export interface DelayConfig {
  enabled: boolean;
  time: number; // seconds (tempo-synced)
  feedback: number; // 0-1
  wet: number; // 0-1
  dry: number; // 0-1
  lowPass: number; // Hz (filter on feedback)
}

export interface CompressionConfig {
  enabled: boolean;
  threshold: number; // dB
  ratio: number; // 1-20
  attack: number; // ms
  release: number; // ms
  makeup: number; // dB (makeup gain)
}

export interface EQConfig {
  enabled: boolean;
  low: number; // dB gain
  mid: number; // dB gain
  high: number; // dB gain
  lowFreq: number; // Hz
  midFreq: number; // Hz
  highFreq: number; // Hz
}

export interface DistortionConfig {
  enabled: boolean;
  amount: number; // 0-1
  type: DistortionType;
  wet: number; // 0-1
  dry: number; // 0-1
}

export type DistortionType = "softclip" | "tube" | "fuzz" | "overdrive";

/**
 * Default effect configurations.
 */
export const DEFAULT_EFFECTS: EffectsChain = {
  reverb: {
    enabled: false,
    roomSize: 0.5,
    damping: 0.5,
    wet: 0.3,
    dry: 0.7,
    decay: 2.0,
  },
  delay: {
    enabled: false,
    time: 0.5,
    feedback: 0.3,
    wet: 0.2,
    dry: 0.8,
    lowPass: 5000,
  },
  compression: {
    enabled: false,
    threshold: -24,
    ratio: 4,
    attack: 10,
    release: 100,
    makeup: 6,
  },
  eq: {
    enabled: false,
    low: 0,
    mid: 0,
    high: 0,
    lowFreq: 200,
    midFreq: 1000,
    highFreq: 5000,
  },
  distortion: {
    enabled: false,
    amount: 0.5,
    type: "softclip",
    wet: 0.5,
    dry: 0.5,
  },
};

/**
 * Create a convolution reverb impulse response.
 */
export function createReverbImpulse(
  context: AudioContext,
  config: ReverbConfig
): AudioBuffer {
  const rate = context.sampleRate;
  const length = rate * config.decay;
  const impulse = context.createBuffer(2, length, rate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      // Exponential decay with noise
      const decay = Math.pow(1 - i / length, config.roomSize * 2);
      const damping = 1 - config.damping * (i / length);
      channelData[i] = (Math.random() * 2 - 1) * decay * damping;
    }
  }

  return impulse;
}

/**
 * Create a distortion curve for the WaveShaperNode.
 */
export function createDistortionCurve(
  amount: number,
  type: DistortionType
): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;

    switch (type) {
      case "softclip":
        curve[i] = Math.tanh(x * (1 + amount * 4));
        break;
      case "tube":
        // Smooth tube-like distortion
        const tube = x * (1 + amount * 2);
        curve[i] = tube / (1 + Math.abs(tube));
        break;
      case "fuzz":
        // Hard clipping for fuzz
        const fuzz = x * (1 + amount * 10);
        curve[i] = Math.sign(fuzz) * Math.min(1, Math.abs(fuzz));
        break;
      case "overdrive":
        // Overdrive with harmonic content
        const od = x * (1 + amount * 5);
        curve[i] = od - (od * od * od) / 3 + (od * od * od * od * od) / 5;
        break;
      default:
        curve[i] = x;
    }
  }

  return curve;
}

/**
 * Build an effects chain from a source node.
 * Returns the final output node to connect to destination.
 */
export function buildEffectsChain(
  context: AudioContext,
  source: AudioNode,
  effects: EffectsChain
): AudioNode {
  let currentNode: AudioNode = source;

  // 1. EQ (parametric 3-band)
  if (effects.eq?.enabled) {
    const lowShelf = context.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = effects.eq.lowFreq;
    lowShelf.gain.value = effects.eq.low;

    const peaking = context.createBiquadFilter();
    peaking.type = "peaking";
    peaking.frequency.value = effects.eq.midFreq;
    peaking.Q.value = 0.5;
    peaking.gain.value = effects.eq.mid;

    const highShelf = context.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = effects.eq.highFreq;
    highShelf.gain.value = effects.eq.high;

    currentNode.connect(lowShelf);
    lowShelf.connect(peaking);
    peaking.connect(highShelf);
    currentNode = highShelf;
  }

  // 2. Distortion
  if (effects.distortion?.enabled) {
    const waveshaper = context.createWaveShaper();
    (waveshaper as any).curve = createDistortionCurve(
      effects.distortion.amount,
      effects.distortion.type
    );
    waveshaper.oversample = "4x";

    // Wet/dry mix
    const wetGain = context.createGain();
    wetGain.gain.value = effects.distortion.wet;
    const dryGain = context.createGain();
    dryGain.gain.value = effects.distortion.dry;
    const merger = context.createGain();

    currentNode.connect(waveshaper);
    waveshaper.connect(wetGain);
    wetGain.connect(merger);
    currentNode.connect(dryGain);
    dryGain.connect(merger);
    currentNode = merger;
  }

  // 3. Compression
  if (effects.compression?.enabled) {
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = effects.compression.threshold;
    compressor.ratio.value = effects.compression.ratio;
    compressor.attack.value = effects.compression.attack / 1000;
    compressor.release.value = effects.compression.release / 1000;

    const makeupGain = context.createGain();
    makeupGain.gain.value = Math.pow(10, effects.compression.makeup / 20);

    currentNode.connect(compressor);
    compressor.connect(makeupGain);
    currentNode = makeupGain;
  }

  // 4. Delay
  if (effects.delay?.enabled) {
    const delayNode = context.createDelay();
    delayNode.delayTime.value = effects.delay.time;

    const feedbackGain = context.createGain();
    feedbackGain.gain.value = effects.delay.feedback;

    const wetGain = context.createGain();
    wetGain.gain.value = effects.delay.wet;
    const dryGain = context.createGain();
    dryGain.gain.value = effects.delay.dry;
    const merger = context.createGain();

    // Low-pass filter on feedback
    const lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = effects.delay.lowPass;

    currentNode.connect(delayNode);
    delayNode.connect(lowPass);
    lowPass.connect(feedbackGain);
    feedbackGain.connect(delayNode); // feedback loop
    delayNode.connect(wetGain);
    wetGain.connect(merger);
    currentNode.connect(dryGain);
    dryGain.connect(merger);
    currentNode = merger;
  }

  // 5. Reverb
  if (effects.reverb?.enabled) {
    const convolver = context.createConvolver();
    convolver.buffer = createReverbImpulse(context, effects.reverb);

    const wetGain = context.createGain();
    wetGain.gain.value = effects.reverb.wet;
    const dryGain = context.createGain();
    dryGain.gain.value = effects.reverb.dry;
    const merger = context.createGain();

    currentNode.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(merger);
    currentNode.connect(dryGain);
    dryGain.connect(merger);
    currentNode = merger;
  }

  return currentNode;
}

/**
 * Update effect parameters in real-time.
 */
export function updateEffectParameters(
  effects: EffectsChain,
  updates: Partial<EffectsChain>
): EffectsChain {
  return {
    ...effects,
    reverb: updates.reverb ? { ...effects.reverb, ...updates.reverb } : effects.reverb,
    delay: updates.delay ? { ...effects.delay, ...updates.delay } : effects.delay,
    compression: updates.compression ? { ...effects.compression, ...updates.compression } : effects.compression,
    eq: updates.eq ? { ...effects.eq, ...updates.eq } : effects.eq,
    distortion: updates.distortion ? { ...effects.distortion, ...updates.distortion } : effects.distortion,
  };
}

/**
 * Get a preset effects chain.
 */
export function getEffectsPreset(name: string): EffectsChain {
  const presets: Record<string, EffectsChain> = {
    "none": { ...DEFAULT_EFFECTS },
    "small room": {
      ...DEFAULT_EFFECTS,
      reverb: { ...DEFAULT_EFFECTS.reverb!, enabled: true, roomSize: 0.2, decay: 0.8, wet: 0.2, damping: 0.5, dry: 0.8 },
    },
    "large hall": {
      ...DEFAULT_EFFECTS,
      reverb: { ...DEFAULT_EFFECTS.reverb!, enabled: true, roomSize: 0.8, decay: 4.0, wet: 0.4, damping: 0.5, dry: 0.6 },
    },
    "slap delay": {
      ...DEFAULT_EFFECTS,
      delay: { ...DEFAULT_EFFECTS.delay!, enabled: true, time: 0.3, feedback: 0.2, wet: 0.3, dry: 0.7, lowPass: 5000 },
    },
    "tape echo": {
      ...DEFAULT_EFFECTS,
      delay: { ...DEFAULT_EFFECTS.delay!, enabled: true, time: 0.4, feedback: 0.5, wet: 0.3, dry: 0.7, lowPass: 3000 },
    },
    "compressed": {
      ...DEFAULT_EFFECTS,
      compression: { ...DEFAULT_EFFECTS.compression!, enabled: true, threshold: -18, ratio: 6, attack: 10, release: 100, makeup: 6 },
    },
    "boost": {
      ...DEFAULT_EFFECTS,
      eq: { ...DEFAULT_EFFECTS.eq!, enabled: true, low: 3, mid: -2, high: 4, lowFreq: 200, midFreq: 1000, highFreq: 5000 },
    },
    "warm": {
      ...DEFAULT_EFFECTS,
      eq: { ...DEFAULT_EFFECTS.eq!, enabled: true, low: 2, mid: 1, high: -3, lowFreq: 200, midFreq: 1000, highFreq: 5000 },
    },
    "overdrive": {
      ...DEFAULT_EFFECTS,
      distortion: { ...DEFAULT_EFFECTS.distortion!, enabled: true, amount: 0.6, type: "overdrive", wet: 0.5, dry: 0.5 },
    },
    "fuzz": {
      ...DEFAULT_EFFECTS,
      distortion: { ...DEFAULT_EFFECTS.distortion!, enabled: true, amount: 0.8, type: "fuzz", wet: 0.5, dry: 0.5 },
    },
  };

  return presets[name.toLowerCase()] || { ...DEFAULT_EFFECTS };
}
