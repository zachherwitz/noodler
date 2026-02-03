# noodler

[![npm version](https://img.shields.io/npm/v/noodler.svg)](https://www.npmjs.com/package/noodler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modular, framework-agnostic music toolkit for web applications. Provides scale generation, Web Audio synthesis, and touch-friendly visual boards via Web Components.

**[Live Demo](https://noodler-demo.vercel.app)**

## Features

- **Scale API** - Generate scales, calculate frequencies, resolve chord progressions
- **Audio API** - Web Audio synthesizer with ADSR envelopes, effects, and backing tracks
- **Board API** - Touch-friendly Web Component for interactive note playing
- **Zero dependencies** - No runtime dependencies, tree-shakeable modules
- **Framework-agnostic** - Works with React, Vue, Svelte, or vanilla JS
- **Mobile-first** - Optimized for touch interaction and mobile speakers

## Installation

```bash
npm install noodler
```

```bash
yarn add noodler
```

```bash
pnpm add noodler
```

## Quick Start

### Scale API

Generate scales and calculate note frequencies:

```typescript
import { generateScale, noteToFrequency } from 'noodler/scale';

// Generate a pentatonic minor scale
const scale = generateScale({ root: 'A', type: 'pentatonic-minor', octave: 4 });
console.log(scale.notes);
// [{ name: 'A4', frequency: 440, index: 0 }, ...]

// Get frequency for any note
const freq = noteToFrequency('C', 4); // 261.626 Hz
```

### Audio API

Create a synthesizer with effects:

```typescript
import { Synth } from 'noodler/audio';

const synth = new Synth({ waveform: 'sawtooth', volume: 0.6 });
synth.toggleDelay(true);
synth.toggleReverb(true);

// Play a note
synth.noteOn(0, 440); // A4

// Stop the note
synth.noteOff(0);

// Clean up when done
synth.destroy();
```

### Board API (Web Component)

Add an interactive music board to your page:

```html
<script type="module">
  import 'noodler/board';
</script>

<noodler-board
  scale="A pentatonic-minor"
  waveform="sawtooth"
  effects="delay,vibrato"
  theme="dark"
  bend-mode="dynamic"
></noodler-board>
```

## API Reference

### Scale Module (`noodler/scale`)

#### `generateScale(config)`

Generates a scale based on the provided configuration.

```typescript
interface ScaleConfig {
  root: NoteName; // 'C' | 'C#' | 'D' | ... | 'B'
  type: ScaleType; // 'pentatonic-major' | 'pentatonic-minor' | 'blues' | 'major' | 'minor' | 'dorian' | 'mixolydian'
  octave?: number; // Starting octave (default: 4)
}

const scale = generateScale({ root: 'G', type: 'major' });
// Returns: { notes: Note[], root, type, noteCount }
```

#### `noteToFrequency(note, octave)`

Converts a note name and octave to frequency in Hz using 12-TET tuning (A4 = 440Hz).

```typescript
noteToFrequency('A', 4); // 440
noteToFrequency('C', 4); // 261.626
noteToFrequency('E', 5); // 659.255
```

#### `resolveChord(chord, key, octave)`

Resolves a roman numeral or chord symbol to a chord in the given key.

```typescript
resolveChord('V', 'A', 4);
// { root: 'E', isMajor: true, symbol: 'E', frequency: 329.63 }

resolveChord('Am', 'C', 4);
// { root: 'A', isMajor: false, symbol: 'Am', frequency: 440 }
```

#### `resolveChordProgression(progression, key, octave)`

Resolves an array of chord symbols or roman numerals.

```typescript
resolveChordProgression(['I', 'IV', 'V', 'I'], 'G');
// [{ root: 'G', ... }, { root: 'C', ... }, { root: 'D', ... }, { root: 'G', ... }]
```

### Audio Module (`noodler/audio`)

#### `Synth`

Web Audio synthesizer with oscillators, ADSR envelopes, and effects.

```typescript
const synth = new Synth({
  waveform: 'sine', // 'sine' | 'square' | 'sawtooth' | 'triangle'
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
  },
  volume: 0.5, // 0-1
});

// Playing notes
synth.noteOn(noteIndex, frequency);
synth.noteOff(noteIndex);
synth.stopAll();

// Pitch bend
synth.bend(noteIndex, cents); // 100 cents = 1 semitone

// Configuration
synth.setWaveform('sawtooth');
synth.setVolume(0.8);
synth.setOctaveShift(1); // -2 to +2 octaves

// Effects
synth.toggleDelay(true);
synth.toggleDistortion(true);
synth.toggleVibrato(true);
synth.toggleFilter(true);
synth.toggleReverb(true);

// Cleanup
synth.destroy();
```

#### `BackingTrack`

Manages backing track playback with chord progressions and rhythm patterns.

```typescript
import { BackingTrack } from 'noodler/audio';

const ctx = new AudioContext();
const backing = new BackingTrack(ctx, {
  tempo: 100,
  style: 'quarter', // 'drone' | 'quarter' | 'eighth' | 'blues' | 'arpeggio'
  instrument: 'bass', // 'bass' | 'pad' | 'pluck' | 'keys'
  chords: ['I', 'IV', 'V', 'I'],
  bars: 1,
  swing: 0, // 0-100
});

backing.play();
backing.stop();
backing.setTempo(120);
backing.setChords(['ii', 'V', 'I'], 'C');
backing.setStyle('blues');
backing.destroy();
```

#### Effect Factories

Create individual effect nodes for custom audio graphs:

```typescript
import {
  createDelay,
  createDistortion,
  createVibrato,
  createFilter,
  createReverb,
} from 'noodler/audio';

const ctx = new AudioContext();
const delay = createDelay(ctx, { time: 0.3, feedback: 0.4, mix: 0.5 });
const distortion = createDistortion(ctx, { amount: 50 });
const reverb = createReverb(ctx, { decay: 2, mix: 0.3 });
```

### Board Module (`noodler/board`)

#### `<noodler-board>` Web Component

Interactive touch-friendly music board.

**Attributes:**

| Attribute   | Type   | Default                | Description                                                             |
| ----------- | ------ | ---------------------- | ----------------------------------------------------------------------- |
| `scale`     | string | `'A pentatonic-minor'` | Scale configuration (e.g., `'Em'`, `'A pentatonic-minor'`, `'G major'`) |
| `notes`     | number | Scale length           | Number of notes to display                                              |
| `waveform`  | string | `'sine'`               | Oscillator type: `'sine'`, `'square'`, `'sawtooth'`, `'triangle'`       |
| `effects`   | string | `''`                   | Comma-separated effects: `'delay,vibrato,distortion,filter,reverb'`     |
| `theme`     | string | `'dark'`               | Visual theme: `'dark'`, `'light'`, `'colorful'`                         |
| `bend-mode` | string | `'dynamic'`            | Pitch bend behavior (see Bend Modes below)                              |

**Events:**

| Event            | Detail                | Description                      |
| ---------------- | --------------------- | -------------------------------- |
| `noteon`         | `{ note, frequency }` | Fired when a note starts playing |
| `noteoff`        | `{ note }`            | Fired when a note stops playing  |
| `bend`           | `{ note, cents }`     | Fired when pitch bend changes    |
| `bendmodechange` | `{ mode }`            | Fired when bend mode changes     |

**Methods:**

```typescript
const board = document.querySelector('noodler-board');

board.getNotes(); // Get current scale notes
board.getSynth(); // Get internal Synth instance
board.stopAll(); // Stop all playing notes
board.getBendMode(); // Get current bend mode
```

#### Bend Modes

The `bend-mode` attribute controls how horizontal finger movement affects pitch:

| Mode      | Behavior                                                                       |
| --------- | ------------------------------------------------------------------------------ |
| `dynamic` | Smooth continuous bend up to 1 octave in either direction                      |
| `stepped` | Snaps to pentatonic scale intervals (-700, -400, -200, 0, 200, 400, 700 cents) |
| `direct`  | 3-state toggle: octave down (left), original (center), octave up (right)       |

```html
<!-- Smooth continuous bending -->
<noodler-board bend-mode="dynamic"></noodler-board>

<!-- Snaps to scale intervals -->
<noodler-board bend-mode="stepped"></noodler-board>

<!-- Octave toggle -->
<noodler-board bend-mode="direct"></noodler-board>
```

#### `xOffsetToCents(xOffset, mode)`

Converts pixel offset to pitch bend in cents. Useful for custom bend implementations.

```typescript
import { xOffsetToCents } from 'noodler/board';

xOffsetToCents(75, 'dynamic'); // 600 cents (half octave)
xOffsetToCents(-150, 'dynamic'); // -1200 cents (octave down)
xOffsetToCents(-60, 'direct'); // -1200 cents (octave down threshold)
xOffsetToCents(30, 'stepped'); // 200 cents (nearest interval)
```

#### SSR/Manual Registration

Components auto-register in browser environments. For SSR or manual control:

```typescript
import { registerBoardComponents } from 'noodler/board';

// Call when ready to register
registerBoardComponents();
```

## Types

All TypeScript types are exported:

```typescript
import type {
  // Scale types
  NoteName,
  ScaleType,
  ScaleConfig,
  Note,
  GeneratedScale,
  RomanNumeral,
  ResolvedChord,
} from 'noodler/scale';

import type {
  // Audio types
  OscillatorType,
  ADSREnvelope,
  SynthConfig,
  EffectType,
  BackingStyle,
  BackingInstrument,
  BackingConfig,
} from 'noodler/audio';

import type {
  // Board types
  BendMode,
  BoardTheme,
  NoteOnEventDetail,
  NoteOffEventDetail,
  BendEventDetail,
} from 'noodler/board';
```

## Browser Support

- Chrome 66+
- Firefox 76+
- Safari 14.1+
- Edge 79+

Requires Web Audio API and Custom Elements v1.

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

MIT
