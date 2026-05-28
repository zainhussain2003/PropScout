/**
 * lint-staged configuration — function form so we can pass relative paths to
 * ESLint (required on Windows: lint-staged passes absolute paths, ESLint 8
 * on Windows cannot resolve them as glob patterns).
 *
 * Python tooling uses `python -m black` because `black` is not on PATH here.
 *
 * Notes:
 * - Paths are quoted to handle directories with spaces (e.g. "Week3-4 Front end/")
 * - ESLint only runs on files inside apps/ and services/ — the Week3-4 test/doc
 *   directory has no ESLint config ancestor and is not production source code
 */

const path = require('path')

/** Convert absolute staged file paths to paths relative to the repo root, quoted for spaces. */
function toRelative(filenames) {
  return filenames.map((f) => `"${path.relative(process.cwd(), f).replace(/\\/g, '/')}"`)
}

/**
 * Returns true if the file is inside a directory that has an ESLint config
 * (apps/ or services/). Files in Week3-4 Front end/ have no eslint config.
 */
function hasEslintConfig(filename) {
  const rel = path.relative(process.cwd(), filename).replace(/\\/g, '/')
  return rel.startsWith('apps/') || rel.startsWith('services/')
}

module.exports = {
  '**/*.{ts,tsx}': (filenames) => {
    const allRel = toRelative(filenames).join(' ')
    const eslintFiles = filenames.filter(hasEslintConfig)
    const eslintRel = toRelative(eslintFiles).join(' ')
    const commands = [`prettier --write ${allRel}`]
    if (eslintFiles.length > 0) {
      commands.unshift(`eslint --fix --max-warnings 0 ${eslintRel}`)
    }
    return commands
  },

  '**/*.{js,json,md,css}': (filenames) => {
    const rel = toRelative(filenames).join(' ')
    return [`prettier --write ${rel}`]
  },

  '**/*.py': (filenames) => {
    const rel = toRelative(filenames).join(' ')
    return [
      `python -m black ${rel}`,
      `python -m flake8 ${rel}`,
    ]
  },
}
