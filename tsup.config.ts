import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'scale/index': 'src/scale/index.ts',
    'audio/index': 'src/audio/index.ts',
    'board/index': 'src/board/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  minify: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
