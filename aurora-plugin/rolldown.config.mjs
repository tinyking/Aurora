import { defineConfig } from 'rolldown'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  input: resolve(here, 'build/entry.tsx'),
  output: {
    file: resolve(here, 'dist/app.js'),
    format: 'esm',
    sourcemap: false,
    minify: true,
  },
  // The host provides one React instance (18.x) through the module table.
  // Externalizing every React entry keeps the panel on that instance; a bundled
  // jsx-runtime would emit `react.transitional.element`, which React 18 rejects.
  external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
  // Classic JSX: emits React.createElement so no private jsx-runtime is bundled.
  transform: { jsx: 'react' },
})
