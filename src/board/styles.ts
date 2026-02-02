/**
 * Creates a CSSStyleSheet for NoodlerBoard.
 */
export function createBoardStyles(): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    :host {
      --noodler-bg: #1a1a2e;
      --noodler-key-bg: #16213e;
      --noodler-key-active: #0f3460;
      --noodler-key-border: #e94560;
      --noodler-text: #ffffff;
      --noodler-text-muted: #94a3b8;

      display: block;
      width: 100%;
      height: 100%;
      min-height: 200px;
      background: var(--noodler-bg);
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      overflow: hidden;
    }

    :host([theme="light"]) {
      --noodler-bg: #f8fafc;
      --noodler-key-bg: #e2e8f0;
      --noodler-key-active: #cbd5e1;
      --noodler-key-border: #3b82f6;
      --noodler-text: #1e293b;
      --noodler-text-muted: #64748b;
    }

    :host([theme="colorful"]) {
      --noodler-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --noodler-key-bg: rgba(255, 255, 255, 0.1);
      --noodler-key-active: rgba(255, 255, 255, 0.25);
      --noodler-key-border: #fbbf24;
      --noodler-text: #ffffff;
      --noodler-text-muted: rgba(255, 255, 255, 0.7);
    }

    .board {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: var(--noodler-bg);
    }

    .keys-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 2px;
      padding: 4px;
    }
  `);
  return sheet;
}

/**
 * Creates a CSSStyleSheet for NoodlerKey.
 */
export function createKeyStyles(): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 40px;
      background: var(--noodler-key-bg, #16213e);
      border-left: 4px solid transparent;
      border-radius: 4px;
      transition: background-color 0.1s ease, border-color 0.1s ease;
      cursor: pointer;
    }

    :host([active]) {
      background: var(--noodler-key-active, #0f3460);
      border-left-color: var(--noodler-key-border, #e94560);
    }

    .key-label {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: var(--noodler-text, #ffffff);
      pointer-events: none;
    }

    :host([active]) .key-label {
      font-weight: 600;
    }
  `);
  return sheet;
}

/**
 * Array of colors for colorful theme gradient per note.
 */
export const NOTE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
];

/**
 * Gets a color for a note index in colorful theme.
 */
export function getNoteColor(index: number, total: number): string {
  const hue = (index / total) * 360;
  return `hsl(${hue}, 70%, 50%)`;
}
