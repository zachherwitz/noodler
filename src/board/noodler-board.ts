import { generateScale } from '../scale/generator.js';
import type { Note } from '../scale/types.js';
import { Synth } from '../audio/synth.js';
import { createBoardStyles, getNoteColor } from './styles.js';
import type {
  BendEventDetail,
  NoteOffEventDetail,
  NoteOnEventDetail,
  PointerState,
} from './types.js';
import {
  getBendFromX,
  getNoteIndexFromY,
  parseEffectsAttribute,
  parseScaleAttribute,
  triggerHaptic,
  validateNotesCount,
  validateTheme,
  validateWaveform,
} from './utils.js';
import { NoodlerKey, registerNoodlerKey } from './noodler-key.js';

const boardStyles = createBoardStyles();

/**
 * Interactive music board Web Component for touch-based note playing.
 *
 * @element noodler-board
 *
 * @attr {string} scale - Scale configuration (e.g., 'Em', 'A pentatonic-minor', 'G major')
 * @attr {number} notes - Number of notes to display (overrides scale default)
 * @attr {string} waveform - Oscillator type: 'sine' | 'square' | 'sawtooth' | 'triangle'
 * @attr {string} effects - Comma-separated effects: 'delay,vibrato,distortion,filter,reverb'
 * @attr {string} theme - Visual theme: 'dark' | 'light' | 'colorful'
 *
 * @fires noteon - Fired when a note starts playing
 * @fires noteoff - Fired when a note stops playing
 * @fires bend - Fired when pitch bend changes
 *
 * @example
 * ```html
 * <noodler-board
 *   scale="A pentatonic-minor"
 *   waveform="sawtooth"
 *   effects="delay,vibrato"
 *   theme="dark"
 * ></noodler-board>
 * ```
 */
export class NoodlerBoard extends HTMLElement {
  private shadow: ShadowRoot;
  private boardElement: HTMLDivElement;
  private keysContainer: HTMLDivElement;
  private keyElements: NoodlerKey[] = [];
  private synth: Synth | null = null;
  private notes: Note[] = [];
  private activePointers: Map<number, PointerState> = new Map();

  static get observedAttributes(): string[] {
    return ['scale', 'notes', 'waveform', 'effects', 'theme'];
  }

  constructor() {
    super();

    registerNoodlerKey();

    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.adoptedStyleSheets = [boardStyles];

    this.boardElement = document.createElement('div');
    this.boardElement.className = 'board';

    this.keysContainer = document.createElement('div');
    this.keysContainer.className = 'keys-container';

    this.boardElement.appendChild(this.keysContainer);
    this.shadow.appendChild(this.boardElement);

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
  }

  connectedCallback(): void {
    this.setAttribute('role', 'application');
    this.setAttribute('aria-label', 'Music board');

    this.initializeSynth();
    this.buildKeys();
    this.attachPointerListeners();
  }

  disconnectedCallback(): void {
    this.removePointerListeners();
    this.destroySynth();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    switch (name) {
      case 'scale':
      case 'notes':
        this.buildKeys();
        break;
      case 'waveform':
        this.updateWaveform();
        break;
      case 'effects':
        this.updateEffects();
        break;
      case 'theme':
        this.updateTheme();
        break;
    }
  }

  private initializeSynth(): void {
    const waveform = validateWaveform(this.getAttribute('waveform'));
    this.synth = new Synth({ waveform });
    this.updateEffects();
  }

  private destroySynth(): void {
    if (this.synth) {
      this.synth.destroy();
      this.synth = null;
    }
  }

  private buildKeys(): void {
    const scaleAttr = this.getAttribute('scale') || 'A pentatonic-minor';
    const parsedScale = parseScaleAttribute(scaleAttr);

    if (!parsedScale) {
      console.warn(`Invalid scale attribute: "${scaleAttr}". Using default.`);
      this.notes = generateScale({ root: 'A', type: 'pentatonic-minor', octave: 4 }).notes;
    } else {
      const scale = generateScale({
        root: parsedScale.root,
        type: parsedScale.type,
        octave: parsedScale.octave,
      });
      this.notes = scale.notes;
    }

    const notesCount = validateNotesCount(this.getAttribute('notes'), this.notes.length);
    this.notes = this.notes.slice(0, notesCount);

    this.keysContainer.textContent = '';
    this.keyElements = [];

    const theme = validateTheme(this.getAttribute('theme'));

    for (let i = 0; i < this.notes.length; i++) {
      const note = this.notes[i]!;
      const key = document.createElement('noodler-key') as NoodlerKey;
      key.setAttribute('label', note.name);

      if (theme === 'colorful') {
        key.setAttribute('color', getNoteColor(i, this.notes.length));
      }

      this.keysContainer.appendChild(key);
      this.keyElements.push(key);
    }
  }

  private updateWaveform(): void {
    if (this.synth) {
      const waveform = validateWaveform(this.getAttribute('waveform'));
      this.synth.setWaveform(waveform);
    }
  }

  private updateEffects(): void {
    if (!this.synth) return;

    const effects = parseEffectsAttribute(this.getAttribute('effects'));
    const effectSet = new Set(effects);

    this.synth.toggleDelay(effectSet.has('delay'));
    this.synth.toggleDistortion(effectSet.has('distortion'));
    this.synth.toggleVibrato(effectSet.has('vibrato'));
    this.synth.toggleFilter(effectSet.has('filter'));
    this.synth.toggleReverb(effectSet.has('reverb'));
  }

  private updateTheme(): void {
    const theme = validateTheme(this.getAttribute('theme'));

    for (let i = 0; i < this.keyElements.length; i++) {
      const key = this.keyElements[i]!;
      if (theme === 'colorful') {
        key.setAttribute('color', getNoteColor(i, this.keyElements.length));
      } else {
        key.removeAttribute('color');
      }
    }
  }

  private attachPointerListeners(): void {
    this.addEventListener('pointerdown', this.handlePointerDown);
    this.addEventListener('pointermove', this.handlePointerMove);
    this.addEventListener('pointerup', this.handlePointerUp);
    this.addEventListener('pointercancel', this.handlePointerCancel);
  }

  private removePointerListeners(): void {
    this.removeEventListener('pointerdown', this.handlePointerDown);
    this.removeEventListener('pointermove', this.handlePointerMove);
    this.removeEventListener('pointerup', this.handlePointerUp);
    this.removeEventListener('pointercancel', this.handlePointerCancel);
  }

  private handlePointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.setPointerCapture(event.pointerId);

    const rect = this.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const x = event.clientX - rect.left;

    const noteIndex = getNoteIndexFromY(y, rect.height, this.notes.length);
    const note = this.notes[noteIndex];

    if (!note || !this.synth) return;

    this.activePointers.set(event.pointerId, {
      pointerId: event.pointerId,
      noteIndex,
      startX: x,
    });

    this.synth.noteOn(event.pointerId, note.frequency);
    this.setKeyActive(noteIndex, true);
    triggerHaptic();

    this.dispatchEvent(
      new CustomEvent<NoteOnEventDetail>('noteon', {
        detail: { note, frequency: note.frequency },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handlePointerMove(event: PointerEvent): void {
    const state = this.activePointers.get(event.pointerId);
    if (!state || !this.synth) return;

    const rect = this.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const x = event.clientX - rect.left;

    const newNoteIndex = getNoteIndexFromY(y, rect.height, this.notes.length);

    if (newNoteIndex !== state.noteIndex) {
      const oldNote = this.notes[state.noteIndex];
      const newNote = this.notes[newNoteIndex];

      if (oldNote) {
        this.synth.noteOff(event.pointerId);
        this.setKeyActive(state.noteIndex, false);

        this.dispatchEvent(
          new CustomEvent<NoteOffEventDetail>('noteoff', {
            detail: { note: oldNote },
            bubbles: true,
            composed: true,
          })
        );
      }

      if (newNote) {
        this.synth.noteOn(event.pointerId, newNote.frequency);
        this.setKeyActive(newNoteIndex, true);
        triggerHaptic();

        state.noteIndex = newNoteIndex;
        state.startX = x;

        this.dispatchEvent(
          new CustomEvent<NoteOnEventDetail>('noteon', {
            detail: { note: newNote, frequency: newNote.frequency },
            bubbles: true,
            composed: true,
          })
        );
      }
    } else {
      const cents = getBendFromX(x, rect.width);
      this.synth.bend(event.pointerId, cents);

      const note = this.notes[state.noteIndex];
      if (note && cents !== 0) {
        this.dispatchEvent(
          new CustomEvent<BendEventDetail>('bend', {
            detail: { note, cents },
            bubbles: true,
            composed: true,
          })
        );
      }
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    this.endNote(event.pointerId);
    this.releasePointerCapture(event.pointerId);
  }

  private handlePointerCancel(event: PointerEvent): void {
    this.endNote(event.pointerId);
  }

  private endNote(pointerId: number): void {
    const state = this.activePointers.get(pointerId);
    if (!state) return;

    const note = this.notes[state.noteIndex];

    if (this.synth) {
      this.synth.noteOff(pointerId);
    }

    this.setKeyActive(state.noteIndex, false);
    this.activePointers.delete(pointerId);

    if (note) {
      this.dispatchEvent(
        new CustomEvent<NoteOffEventDetail>('noteoff', {
          detail: { note },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private setKeyActive(index: number, active: boolean): void {
    const key = this.keyElements[index];
    if (key) {
      key.setActive(active);
    }
  }

  /**
   * Gets the current scale notes.
   */
  getNotes(): Note[] {
    return [...this.notes];
  }

  /**
   * Gets the internal Synth instance for advanced control.
   */
  getSynth(): Synth | null {
    return this.synth;
  }

  /**
   * Stops all currently playing notes.
   */
  stopAll(): void {
    for (const [pointerId] of this.activePointers) {
      this.endNote(pointerId);
    }
  }
}

/**
 * Registers the NoodlerBoard custom element if not already defined.
 */
export function registerNoodlerBoard(): void {
  if (!customElements.get('noodler-board')) {
    customElements.define('noodler-board', NoodlerBoard);
  }
}
