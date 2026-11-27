import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const at = (p) => resolve(here, p)

const app = readFileSync(at('dist/app.js'), 'utf8')
let css = readFileSync(at('build/styles.css'), 'utf8')

// --- CSS guards -------------------------------------------------------------
// Collapse accidental double prefixes until stable.
const cssBefore = css
while (css.includes('.aurora-panel .aurora-panel')) {
  css = css.replaceAll('.aurora-panel .aurora-panel', '.aurora-panel')
}
if (css !== cssBefore) writeFileSync(at('build/styles.css'), css)
if (/\.aurora-panel\s*\.aurora-panel/.test(css)) {
  throw new Error('CSS still contains a double .aurora-panel prefix')
}
// Every rule selector must be scoped, or an at-rule. Match selectors at line
// starts so a declaration body is never mistaken for one.
{
  const re = /(?:^|\n)\s*([^{}\n]+?)\s*\{/g
  let m
  while ((m = re.exec(css))) {
    const sel = m[1].trim()
    if (sel.startsWith('@')) continue
    if (!sel.split(',').every((p) => p.trim().startsWith('.aurora-panel'))) {
      throw new Error(`Unscoped CSS selector: ${JSON.stringify(sel)}`)
    }
  }
}

// --- React externals --------------------------------------------------------
// Rolldown may emit bare `import` statements for these. Rewrite them to the
// factory's `require` so the HOST React (18.x) is used, not a bundled copy.
// A bundled jsx-runtime would emit `react.transitional.element`, which the
// host's React 18 reconciler rejects.
const EXTERNALS = ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client']

function toBindings(named) {
  return named
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(\w+)\s+as\s+(\w+)$/)
      return m ? `${m[1]}: ${m[2]}` : s
    })
    .join(', ')
}

function rewriteExternalImports(code) {
  for (const spec of EXTERNALS) {
    const q = spec.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
    // import * as X from "spec"
    code = code.replace(
      new RegExp(`import\\s*\\*\\s*as\\s+(\\w+)\\s*from\\s*["']${q}["'];?`, 'g'),
      (_, n) => `const ${n} = __req("${spec}");`,
    )
    // import d, { a as b } from "spec"
    code = code.replace(
      new RegExp(`import\\s+(\\w+)\\s*,\\s*\\{([^}]*)\\}\\s*from\\s*["']${q}["'];?`, 'g'),
      (_, d, named) => `const ${d} = __req("${spec}").default ?? __req("${spec}");\nconst {${toBindings(named)}} = __req("${spec}");`,
    )
    // import { a as b } from "spec"
    code = code.replace(
      new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${q}["'];?`, 'g'),
      (_, named) => `const {${toBindings(named)}} = __req("${spec}");`,
    )
    // import d from "spec"
    code = code.replace(
      new RegExp(`import\\s+(\\w+)\\s+from\\s*["']${q}["'];?`, 'g'),
      (_, d) => `const ${d} = __req("${spec}").default ?? __req("${spec}");`,
    )
  }
  return code
}

let cleaned = rewriteExternalImports(app)
cleaned = cleaned.replace(/export\{([^}]*)\};?\s*$/, (_, specifiers) => {
  return specifiers
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(\w+)\s+as\s+(\w+)$/)
      return m && m[2] !== 'React' ? `const ${m[2]} = ${m[1]};` : ''
    })
    .join('\n')
})

for (const forbidden of ['react.transitional.element', 'react-jsx-runtime.production', 'react.production.js']) {
  if (cleaned.includes(forbidden)) {
    throw new Error(`Bundle still embeds a private React runtime (${forbidden}); externalize react/jsx-runtime`)
  }
}
if (/from\s*["']react(\/jsx-runtime|\/client)?["']/.test(cleaned)) {
  throw new Error('Bundle still contains a bare react import')
}

const factory = `window.__ModuleLoader__.load({
  id: '@local/aurora-workbench',
  factory(require) {
    const __req = require
    const React = __req('react')

    ${cleaned}

    const CSS = ${JSON.stringify(css)}
    const __auroraH = React.createElement

    function AuroraIcon({ size }) {
      return __auroraH('svg', {
        width: size, height: size, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
        strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { display: 'block' },
      }, __auroraH('path', { d: 'M12 2.5 14.6 8l6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 8.9l6-.9z' }))
    }

    function Panel() {
      return __auroraH(React.Fragment, null,
        __auroraH('style', null, CSS),
        __auroraH(AuroraPanel))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register('aurora', {
          en: { panel: 'Aurora workbench' },
          zh: { panel: 'Aurora 工作台' },
        }), 'aurora: locale')
        const t = ctx.locale.bind('aurora')

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'aurora',
          order: 20,
          label: () => t('panel'),
        }, AuroraIcon))

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'aurora',
        }, Panel))
      },
    }
  },
});
`

writeFileSync(at('client.js'), factory)
console.log(`client.js written: ${(Buffer.byteLength(factory) / 1024).toFixed(1)} KB`)
