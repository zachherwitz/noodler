import { generateScale } from '../src/scale';
import type { NoteName, ScaleType, Note } from '../src/scale';
import { Synth, BackingTrack } from '../src/audio';
import type {
  OscillatorType,
  BackingStyle,
  BackingInstrument,
} from '../src/audio';
import { registerBoardComponents } from '../src/board';
import type { NoodlerBoard } from '../src/board';

registerBoardComponents();

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function initBoardDemo(): void {
  const board = $('main-board') as NoodlerBoard | null;
  if (!board) return;

  const scaleSelect = $('scale-select') as HTMLSelectElement | null;
  const waveformSelect = $('waveform-select') as HTMLSelectElement | null;
  const themeSelect = $('theme-select') as HTMLSelectElement | null;
  const bendModeSelect = $('bend-mode-select') as HTMLSelectElement | null;
  const bendValue = $('bend-value');

  scaleSelect?.addEventListener('change', () => {
    board.setAttribute('scale', scaleSelect.value);
  });

  waveformSelect?.addEventListener('change', () => {
    board.setAttribute('waveform', waveformSelect.value);
  });

  themeSelect?.addEventListener('change', () => {
    board.setAttribute('theme', themeSelect.value);
  });

  bendModeSelect?.addEventListener('change', () => {
    board.setAttribute('bend-mode', bendModeSelect.value);
  });

  board.addEventListener('bend', ((event: CustomEvent) => {
    if (bendValue) {
      bendValue.textContent = String(event.detail.cents);
    }
  }) as EventListener);

  board.addEventListener('noteoff', () => {
    if (bendValue) {
      bendValue.textContent = '0';
    }
  });

  const effectIds = ['delay', 'vibrato', 'distortion', 'reverb', 'filter'];

  function updateEffects(): void {
    const active = effectIds.filter((id) => {
      const checkbox = $(`effect-${id}`) as HTMLInputElement | null;
      return checkbox?.checked;
    });
    board.setAttribute('effects', active.join(','));
  }

  effectIds.forEach((id) => {
    $(`effect-${id}`)?.addEventListener('change', updateEffects);
  });
}

function createNoteItem(note: Note): HTMLElement {
  const item = document.createElement('div');
  item.className = 'note-item';

  const nameEl = document.createElement('div');
  nameEl.className = 'name';
  nameEl.textContent = note.name;

  const freqEl = document.createElement('div');
  freqEl.className = 'freq';
  freqEl.textContent = `${note.frequency.toFixed(2)} Hz`;

  item.appendChild(nameEl);
  item.appendChild(freqEl);

  return item;
}

function initScaleDemo(): void {
  const rootSelect = $('scale-root') as HTMLSelectElement | null;
  const typeSelect = $('scale-type') as HTMLSelectElement | null;
  const octaveSelect = $('scale-octave') as HTMLSelectElement | null;
  const outputPanel = $('scale-output');
  const notesGrid = outputPanel?.querySelector('.notes-grid');

  if (!rootSelect || !typeSelect || !octaveSelect || !notesGrid) return;

  function updateScale(): void {
    const root = rootSelect.value as NoteName;
    const type = typeSelect.value as ScaleType;
    const octave = parseInt(octaveSelect.value, 10);

    const scale = generateScale({ root, type, octave });

    notesGrid.textContent = '';

    scale.notes.forEach((note: Note) => {
      notesGrid.appendChild(createNoteItem(note));
    });
  }

  rootSelect.addEventListener('change', updateScale);
  typeSelect.addEventListener('change', updateScale);
  octaveSelect.addEventListener('change', updateScale);

  updateScale();
}

function initSynthDemo(): void {
  const keysContainer = $('synth-keys');
  const waveformSelect = $('synth-waveform') as HTMLSelectElement | null;
  const octaveSelect = $('synth-octave') as HTMLSelectElement | null;

  if (!keysContainer || !waveformSelect || !octaveSelect) return;

  const synth = new Synth({ waveform: 'sine' });
  const notes = generateScale({ root: 'C', type: 'major', octave: 4 }).notes;

  waveformSelect.addEventListener('change', () => {
    synth.setWaveform(waveformSelect.value as OscillatorType);
  });

  octaveSelect.addEventListener('change', () => {
    synth.setOctaveShift(parseInt(octaveSelect.value, 10));
  });

  const keys = keysContainer.querySelectorAll<HTMLButtonElement>('.piano-key');

  keys.forEach((key) => {
    const noteIndex = parseInt(key.dataset.note ?? '0', 10);
    const note = notes[noteIndex % notes.length];
    if (!note) return;

    const octaveOffset = Math.floor(noteIndex / notes.length);
    const frequency = note.frequency * Math.pow(2, octaveOffset);

    const handleStart = (e: Event) => {
      e.preventDefault();
      key.classList.add('active');
      synth.noteOn(noteIndex, frequency);
    };

    const handleEnd = () => {
      key.classList.remove('active');
      synth.noteOff(noteIndex);
    };

    key.addEventListener('pointerdown', handleStart);
    key.addEventListener('pointerup', handleEnd);
    key.addEventListener('pointerleave', handleEnd);
    key.addEventListener('pointercancel', handleEnd);
  });
}

function initBackingDemo(): void {
  const tempoSlider = $('backing-tempo') as HTMLInputElement | null;
  const tempoValue = $('tempo-value');
  const styleSelect = $('backing-style') as HTMLSelectElement | null;
  const instrumentSelect = $('backing-instrument') as HTMLSelectElement | null;
  const chordsSelect = $('backing-chords') as HTMLSelectElement | null;
  const playBtn = $('backing-play') as HTMLButtonElement | null;
  const stopBtn = $('backing-stop') as HTMLButtonElement | null;

  if (
    !tempoSlider ||
    !styleSelect ||
    !instrumentSelect ||
    !chordsSelect ||
    !playBtn ||
    !stopBtn
  ) {
    return;
  }

  let audioContext: AudioContext | null = null;
  let backingTrack: BackingTrack | null = null;

  function getOrCreateContext(): AudioContext {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    return audioContext;
  }

  function createBackingTrack(): BackingTrack {
    const ctx = getOrCreateContext();
    const chords = chordsSelect.value.split(',');
    return new BackingTrack(ctx, {
      tempo: parseInt(tempoSlider.value, 10),
      style: styleSelect.value as BackingStyle,
      instrument: instrumentSelect.value as BackingInstrument,
      chords,
    });
  }

  tempoSlider.addEventListener('input', () => {
    if (tempoValue) {
      tempoValue.textContent = tempoSlider.value;
    }
    backingTrack?.setTempo(parseInt(tempoSlider.value, 10));
  });

  styleSelect.addEventListener('change', () => {
    backingTrack?.setStyle(styleSelect.value as BackingStyle);
  });

  instrumentSelect.addEventListener('change', () => {
    backingTrack?.setInstrument(instrumentSelect.value as BackingInstrument);
  });

  chordsSelect.addEventListener('change', () => {
    backingTrack?.setChords(chordsSelect.value.split(','));
  });

  playBtn.addEventListener('click', () => {
    if (!backingTrack) {
      backingTrack = createBackingTrack();
    }
    backingTrack.play();
    playBtn.disabled = true;
    stopBtn.disabled = false;
  });

  stopBtn.addEventListener('click', () => {
    backingTrack?.stop();
    playBtn.disabled = false;
    stopBtn.disabled = true;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initBoardDemo();
  initScaleDemo();
  initSynthDemo();
  initBackingDemo();
});
