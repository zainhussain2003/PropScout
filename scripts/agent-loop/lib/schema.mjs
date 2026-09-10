/**
 * A small JSON Schema validator covering exactly the keywords the agent-loop
 * schemas use: type, enum, required, properties, additionalProperties, items,
 * minItems, minLength, minimum, pattern.
 *
 * ## Why not a library
 *
 * The coordinator has no dependencies by design — it owns commits and
 * promotion, so every package it pulls in is code that runs with that
 * authority. The schemas are small and fixed; a full Draft 2020-12
 * implementation would be more surface than the problem warrants.
 *
 * ## Why not the hand-rolled checks it replaces
 *
 * The previous validator checked the fields it knew about and nothing else.
 * `additionalProperties: false` was in the schema and never enforced, so a
 * reviewer could attach arbitrary extra keys and pass. A validator that reads
 * the schema cannot drift from it.
 *
 * Returns a list of human-readable errors; an empty list means valid. Every
 * error names the JSON path so a failure in the third finding's second
 * citation is locatable.
 */

function typeOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (Number.isInteger(value)) return 'integer'
  return typeof value
}

function matchesType(value, expected) {
  const actual = typeOf(value)
  if (expected === 'number') return actual === 'number' || actual === 'integer'
  return actual === expected
}

function validate(value, schema, jsonPath, errors) {
  if (schema.type !== undefined) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!allowed.some((t) => matchesType(value, t))) {
      errors.push(`${jsonPath}: expected type ${allowed.join('|')}, got ${typeOf(value)}`)
      return
    }
  }

  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push(
      `${jsonPath}: value ${JSON.stringify(value)} is not in enum [${schema.enum.join(', ')}]`
    )
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${jsonPath}: minLength ${schema.minLength} not met (length ${value.length})`)
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${jsonPath}: does not match pattern ${schema.pattern}`)
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${jsonPath}: minimum ${schema.minimum} not met (value ${value})`)
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${jsonPath}: minItems ${schema.minItems} not met (length ${value.length})`)
    }
    if (schema.items !== undefined) {
      value.forEach((item, index) => validate(item, schema.items, `${jsonPath}[${index}]`, errors))
    }
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const properties = schema.properties ?? {}
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${jsonPath}: missing required property "${key}"`)
    }
    for (const [key, child] of Object.entries(value)) {
      if (key in properties) {
        validate(child, properties[key], `${jsonPath}.${key}`, errors)
      } else if (schema.additionalProperties === false) {
        errors.push(`${jsonPath}: additional property "${key}" is not allowed`)
      }
    }
  }
}

export function validateAgainstSchema(value, schema) {
  const errors = []
  validate(value, schema, '$', errors)
  return errors
}

/** Throw with every error listed, so one round-trip reports the whole problem. */
export function assertMatchesSchema(value, schema, label = 'value') {
  const errors = validateAgainstSchema(value, schema)
  if (errors.length) {
    throw new Error(`${label} does not match its schema:\n  ${errors.join('\n  ')}`)
  }
  return value
}
