const process = require('node:process')
const esbuild = require('esbuild')

const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started')
    })
    build.onEnd((result) => {
      result.errors.forEach((error) => {
        console.error(`[Error] ${error.text}`)
        console.error(`  at ${error.location.file}:${error.location.line}:${error.location.column}`)
      })
      console.log('[watch] build finished')
    })
  },
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    plugins: [esbuildProblemMatcherPlugin],
  })

  if (watch) {
    await ctx.watch()
    return
  }

  await ctx.rebuild()
  await ctx.dispose()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
