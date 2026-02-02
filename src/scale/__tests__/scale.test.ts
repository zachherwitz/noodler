import { describe, it, expect } from 'vitest';

describe('scale module', () => {
  it('should be importable', async () => {
    const scale = await import('../index.js');
    expect(scale).toBeDefined();
  });
});
