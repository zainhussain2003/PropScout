/**
 * lint-staged configuration — function form so we can pass relative paths to
 * ESLint (required on Windows: lint-staged passes absolute paths, ESLint 8
 * on Windows cannot resolve them as glob patterns).
 *
 * Python tooling uses `python -m black` because `black` is not on PATH here.
 */

const path = require('path')

/** Convert absolute staged file paths to paths relative to the repo root. */
function toRelative(filenames) {
  return filenames.map((f) => path.relative(process.cwd(), f).replace(/\\/g, '/'))
}

module.exports = {
  '**/*.{ts,tsx}': (filenames) => {
    const rel = toRelative(filenames).join(' ')
    return [
      `eslint --fix --max-warnings 0 ${rel}`,
      `prettier --write ${rel}`,
    ]
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
