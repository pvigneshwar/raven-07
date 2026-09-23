import { defineConfig } from 'vite';

// ACT-014: Vite chunking optimization.
// Phaser is a large, rarely-changing dependency (~1.2MB minified on its
// own), so splitting it into its own vendor chunk lets browsers cache it
// separately from game code that changes every build. This also silences
// Vite's default 500kB chunk-size warning, which the single bundled output
// was tripping (1,306.97 kB minified / 346.72 kB gzip per state.json).
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown expects manualChunks as a function, not an object
        // map. Split Phaser into its own vendor chunk so browsers can cache
        // the large (~1.2MB) phaser module separately from game code.
        manualChunks: (id: string) => {
          if (id.includes('node_modules/phaser')) {
            return 'vendor-phaser';
          }
          return undefined;
        },
      },
    },
  },
});
