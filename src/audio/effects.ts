import type {
  EffectNode,
  DelayConfig,
  DistortionConfig,
  VibratoConfig,
  FilterConfig,
  ReverbConfig,
} from './types';

const DEFAULT_DELAY_CONFIG: DelayConfig = {
  time: 0.3,
  feedback: 0.4,
  mix: 0.5,
};

const DEFAULT_DISTORTION_CONFIG: DistortionConfig = {
  amount: 50,
};

const DEFAULT_VIBRATO_CONFIG: VibratoConfig = {
  rate: 5,
  depth: 25,
};

const DEFAULT_FILTER_CONFIG: FilterConfig = {
  type: 'lowpass',
  frequency: 1000,
  Q: 5,
  lfoRate: 2,
  lfoDepth: 500,
};

const DEFAULT_REVERB_CONFIG: ReverbConfig = {
  decay: 2,
  mix: 0.3,
};

/**
 * Creates a soft-clip distortion curve for the WaveShaperNode.
 */
function makeDistortionCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const k = amount;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] =
      ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }

  return curve;
}

/**
 * Generates an impulse response buffer for convolution reverb.
 */
function generateImpulseResponse(
  ctx: AudioContext,
  duration: number,
  decay: number
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      channelData[i] =
        (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }

  return buffer;
}

/**
 * Creates a delay effect with feedback.
 *
 * @param ctx - The AudioContext
 * @param config - Delay configuration
 * @returns Effect node with cleanup function
 */
export function createDelay(
  ctx: AudioContext,
  config: Partial<DelayConfig> = {}
): EffectNode {
  const opts = { ...DEFAULT_DELAY_CONFIG, ...config };

  const inputGain = ctx.createGain();
  const outputGain = ctx.createGain();
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const delay = ctx.createDelay(5);
  const feedback = ctx.createGain();

  delay.delayTime.setValueAtTime(opts.time, ctx.currentTime);
  feedback.gain.setValueAtTime(opts.feedback, ctx.currentTime);
  dryGain.gain.setValueAtTime(1 - opts.mix, ctx.currentTime);
  wetGain.gain.setValueAtTime(opts.mix, ctx.currentTime);

  // Dry path
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  // Wet path with feedback loop
  inputGain.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wetGain);
  wetGain.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    cleanup: (): void => {
      inputGain.disconnect();
      outputGain.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      delay.disconnect();
      feedback.disconnect();
    },
  };
}

/**
 * Creates a distortion effect using waveshaping.
 *
 * @param ctx - The AudioContext
 * @param config - Distortion configuration
 * @returns Effect node with cleanup function
 */
export function createDistortion(
  ctx: AudioContext,
  config: Partial<DistortionConfig> = {}
): EffectNode {
  const opts = { ...DEFAULT_DISTORTION_CONFIG, ...config };

  const inputGain = ctx.createGain();
  const outputGain = ctx.createGain();
  const waveshaper = ctx.createWaveShaper();

  waveshaper.curve = makeDistortionCurve(
    opts.amount
  ) as Float32Array<ArrayBuffer>;
  waveshaper.oversample = '4x';

  inputGain.connect(waveshaper);
  waveshaper.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    cleanup: (): void => {
      inputGain.disconnect();
      waveshaper.disconnect();
      outputGain.disconnect();
    },
  };
}

/**
 * Creates a vibrato effect using an LFO modulating pitch.
 *
 * @param ctx - The AudioContext
 * @param config - Vibrato configuration
 * @returns Effect node with cleanup function and access to LFO for per-oscillator connection
 */
export function createVibrato(
  ctx: AudioContext,
  config: Partial<VibratoConfig> = {}
): EffectNode & { lfo: OscillatorNode; lfoGain: GainNode } {
  const opts = { ...DEFAULT_VIBRATO_CONFIG, ...config };

  const inputGain = ctx.createGain();
  const outputGain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(opts.rate, ctx.currentTime);
  lfoGain.gain.setValueAtTime(opts.depth, ctx.currentTime);

  lfo.connect(lfoGain);
  lfo.start();

  // Passthrough for audio signal
  inputGain.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    lfo,
    lfoGain,
    cleanup: (): void => {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      inputGain.disconnect();
      outputGain.disconnect();
    },
  };
}

/**
 * Creates a filter effect with LFO modulation (auto-wah).
 *
 * @param ctx - The AudioContext
 * @param config - Filter configuration
 * @returns Effect node with cleanup function
 */
export function createFilter(
  ctx: AudioContext,
  config: Partial<FilterConfig> = {}
): EffectNode {
  const opts = { ...DEFAULT_FILTER_CONFIG, ...config };

  const inputGain = ctx.createGain();
  const outputGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  filter.type = opts.type;
  filter.frequency.setValueAtTime(opts.frequency, ctx.currentTime);
  filter.Q.setValueAtTime(opts.Q, ctx.currentTime);

  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(opts.lfoRate, ctx.currentTime);
  lfoGain.gain.setValueAtTime(opts.lfoDepth, ctx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  inputGain.connect(filter);
  filter.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    cleanup: (): void => {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      filter.disconnect();
      inputGain.disconnect();
      outputGain.disconnect();
    },
  };
}

/**
 * Creates a reverb effect using convolution.
 *
 * @param ctx - The AudioContext
 * @param config - Reverb configuration
 * @returns Effect node with cleanup function
 */
export function createReverb(
  ctx: AudioContext,
  config: Partial<ReverbConfig> = {}
): EffectNode {
  const opts = { ...DEFAULT_REVERB_CONFIG, ...config };

  const inputGain = ctx.createGain();
  const outputGain = ctx.createGain();
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const convolver = ctx.createConvolver();

  convolver.buffer = generateImpulseResponse(ctx, opts.decay, 2);
  dryGain.gain.setValueAtTime(1 - opts.mix, ctx.currentTime);
  wetGain.gain.setValueAtTime(opts.mix, ctx.currentTime);

  // Dry path
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  // Wet path
  inputGain.connect(convolver);
  convolver.connect(wetGain);
  wetGain.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    cleanup: (): void => {
      inputGain.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      convolver.disconnect();
      outputGain.disconnect();
    },
  };
}
