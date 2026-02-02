export { NoodlerBoard, registerNoodlerBoard } from './noodler-board.js';
export { NoodlerKey, registerNoodlerKey } from './noodler-key.js';
export type {
  BendMode,
  BendModeChangeEventDetail,
  BoardConfig,
  BoardTheme,
  BendEventDetail,
  EffectName,
  NoteOffEventDetail,
  NoteOnEventDetail,
  ParsedScaleConfig,
  PointerState,
} from './types.js';
export {
  parseScaleAttribute,
  validateWaveform,
  validateTheme,
  parseEffectsAttribute,
  validateNotesCount,
  getNoteIndexFromY,
  getBendFromX,
  triggerHaptic,
} from './utils.js';
export {
  xOffsetToCents,
  PIXELS_PER_OCTAVE,
  CENTS_PER_OCTAVE,
  MAX_OCTAVE_OFFSET,
  DIRECT_THRESHOLD_PX,
  STEPPED_INTERVALS,
} from './bend.js';

import { registerNoodlerBoard } from './noodler-board.js';
import { registerNoodlerKey } from './noodler-key.js';

/**
 * Registers all board Web Components.
 * Call this manually in SSR contexts where auto-registration should be deferred.
 */
export function registerBoardComponents(): void {
  registerNoodlerKey();
  registerNoodlerBoard();
}

// Auto-register components when this module is imported in browser context
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  registerBoardComponents();
}
