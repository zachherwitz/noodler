import { createKeyStyles } from './styles.js';

const keyStyles = createKeyStyles();

/**
 * Internal component representing a single key/note zone on the board.
 *
 * @element noodler-key
 *
 * @attr {string} label - The note name to display
 * @attr {boolean} active - Whether this key is currently active
 * @attr {string} color - Optional custom color for colorful theme
 */
export class NoodlerKey extends HTMLElement {
  private shadow: ShadowRoot;
  private labelElement: HTMLSpanElement;

  static get observedAttributes(): string[] {
    return ['label', 'active', 'color'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.adoptedStyleSheets = [keyStyles];

    this.labelElement = document.createElement('span');
    this.labelElement.className = 'key-label';
    this.shadow.appendChild(this.labelElement);
  }

  connectedCallback(): void {
    this.updateLabel();
    this.updateColor();

    const label = this.getAttribute('label') || 'Key';
    this.setAttribute('aria-label', label);
    this.setAttribute('role', 'button');
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue === newValue) return;

    switch (name) {
      case 'label':
        this.updateLabel();
        this.setAttribute('aria-label', newValue || 'Key');
        break;
      case 'color':
        this.updateColor();
        break;
    }
  }

  private updateLabel(): void {
    this.labelElement.textContent = this.getAttribute('label') || '';
  }

  private updateColor(): void {
    const color = this.getAttribute('color');
    if (color) {
      this.style.setProperty('--noodler-key-border', color);
    } else {
      this.style.removeProperty('--noodler-key-border');
    }
  }

  /**
   * Sets the active state of the key.
   */
  setActive(active: boolean): void {
    if (active) {
      this.setAttribute('active', '');
    } else {
      this.removeAttribute('active');
    }
  }

  /**
   * Returns whether the key is currently active.
   */
  isActive(): boolean {
    return this.hasAttribute('active');
  }
}

/**
 * Registers the NoodlerKey custom element if not already defined.
 */
export function registerNoodlerKey(): void {
  if (!customElements.get('noodler-key')) {
    customElements.define('noodler-key', NoodlerKey);
  }
}
