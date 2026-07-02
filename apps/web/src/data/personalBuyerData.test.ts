/**
 * Unit tests for computeHomeScore risk-flag input + personal severe-gate
 * ceilings (1 severe → cap 34, 2 → 20, 3+ → 10, floor 5).
 *
 * Ceilings are approved design values, flagged unsourced in NIGHT_NOTES —
 * these tests lock the mechanism, not a data claim.
 */

import { describe, it, expect } from 'vitest'
import { PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, computeHomeScore } from './personalBuyerData'
import type { RiskFlag } from '../types/analysis'

const LIGHT = 76

function mkFlag(id: string, severity: 'red' | 'amber'): RiskFlag {
  return { id, severity, label: id, evidence: null, confidence: 90 }
}

/** No-flag baseline — all deltas below are relative to this. */
const BASE = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, LIGHT)

describe('computeHomeScore — flag input', () => {
  it('omitting flags keeps the no-major-flags baseline (riskPts 10)', () => {
    expect(BASE.components.riskPts).toBe(10)
    expect(BASE.total).toBeGreaterThan(34) // gate tests below rely on this
  })

  it('amber flags never deduct or gate', () => {
    const score = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, LIGHT, [
      mkFlag('tenant_occupied', 'amber'),
      mkFlag('verify_history', 'amber'),
    ])
    expect(score.total).toBe(BASE.total)
    expect(score.components.riskPts).toBe(10)
  })

  it('one standard red flag deducts 5 risk points', () => {
    const score = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, LIGHT, [
      mkFlag('needs_work', 'red'),
    ])
    expect(score.components.riskPts).toBe(5)
    expect(score.total).toBe(BASE.total - 5)
  })

  it('risk points floor at 0 — three standard reds cannot go negative', () => {
    const score = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, LIGHT, [
      mkFlag('needs_work', 'red'),
      mkFlag('condo_fee_high', 'red'),
      mkFlag('str_dependent', 'red'),
    ])
    expect(score.components.riskPts).toBe(0)
    expect(score.total).toBe(BASE.total - 10)
  })
})

describe('computeHomeScore — severe-gate ceilings (34/20/10, floor 5)', () => {
  it('one severe flag caps the total at 34 ("Probably not")', () => {
    const score = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, LIGHT, [
      mkFlag('grow_op_history', 'red'),
    ])
    expect(score.total).toBe(34)
    expect(score.verdict.label).toBe('Probably not')
    expect(score.verdict.tone).toBe('fail')
  })

  it('severe flags gate — they do not also deduct risk points', () => {
    const score = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, LIGHT, [
      mkFlag('flooding_history', 'red'),
    ])
    expect(score.components.riskPts).toBe(10)
  })

  it('two severe flags cap at 20', () => {
    const score = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, LIGHT, [
      mkFlag('grow_op_history', 'red'),
      mkFlag('flooding_history', 'red'),
    ])
    expect(score.total).toBe(20)
  })

  it('three or more severe flags cap at 10', () => {
    const three = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, LIGHT, [
      mkFlag('grow_op_history', 'red'),
      mkFlag('flooding_history', 'red'),
      mkFlag('illegal_unit_risk', 'red'),
    ])
    const four = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, LIGHT, [
      mkFlag('grow_op_history', 'red'),
      mkFlag('flooding_history', 'red'),
      mkFlag('illegal_unit_risk', 'red'),
      mkFlag('special_assessment_risk', 'red'),
    ])
    expect(three.total).toBe(10)
    expect(four.total).toBe(10)
  })

  it('severe + standard compose: deduct first, then gate, never below floor 5', () => {
    const score = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, LIGHT, [
      mkFlag('grow_op_history', 'red'),
      mkFlag('needs_work', 'red'),
    ])
    expect(score.components.riskPts).toBe(5) // only the standard red deducts
    expect(score.total).toBe(34) // gate is the binding constraint
    expect(score.total).toBeGreaterThanOrEqual(5)
  })
})
