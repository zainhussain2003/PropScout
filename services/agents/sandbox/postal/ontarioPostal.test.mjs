/**
 * ontarioPostal.test.mjs
 * Inline unit tests for normalizePostalCode() and isOntarioFSA().
 * No external imports — functions are copied verbatim as plain JS.
 * Run: node postal/ontarioPostal.test.mjs
 */

import assert from "node:assert/strict";

// ─── Inlined functions (translated from ontarioPostal.ts) ─────────────────────

function normalizePostalCode(raw) {
  const sanitised = raw.replace(/\s+/g, "").toUpperCase();

  if (sanitised.length !== 6) {
    throw new Error(
      `Invalid postal code "${raw}": expected 6 alphanumeric characters after stripping spaces, got ${sanitised.length}.`
    );
  }

  return `${sanitised.slice(0, 3)} ${sanitised.slice(3)}`;
}

function isOntarioFSA(postal) {
  const ONTARIO_PREFIXES = new Set(["K", "L", "M", "N", "P"]);
  const firstLetter = postal.trim().charAt(0).toUpperCase();
  return ONTARIO_PREFIXES.has(firstLetter);
}

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✅  PASS — ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  FAIL — ${description}`);
    console.error(`       ${err.message}`);
    failed++;
  }
}

// ─── normalizePostalCode — happy path ─────────────────────────────────────────

console.log("\n── normalizePostalCode ──────────────────────────────────────────");

test("lower-case no-space → canonical upper-case with space", () => {
  assert.equal(normalizePostalCode("m5v2t6"), "M5V 2T6");
});

test("lower-case with interior space → canonical", () => {
  assert.equal(normalizePostalCode("m5v 2t6"), "M5V 2T6");
});

test("already upper-case no-space → canonical", () => {
  assert.equal(normalizePostalCode("M5V2T6"), "M5V 2T6");
});

test("already canonical → unchanged", () => {
  assert.equal(normalizePostalCode("M5V 2T6"), "M5V 2T6");
});

test("BC code lower-case → canonical", () => {
  assert.equal(normalizePostalCode("v6b1a1"), "V6B 1A1");
});

test("Eastern Ontario K-prefix → canonical", () => {
  assert.equal(normalizePostalCode("k1a0a6"), "K1A 0A6");
});

test("Northern Ontario P-prefix → canonical", () => {
  assert.equal(normalizePostalCode("P7B5E1"), "P7B 5E1");
});

test("multiple interior spaces are all stripped", () => {
  assert.equal(normalizePostalCode("M5V  2T6"), "M5V 2T6");
});

test("leading/trailing whitespace is stripped", () => {
  assert.equal(normalizePostalCode("  M5V2T6  "), "M5V 2T6");
});

// ─── normalizePostalCode — error path ─────────────────────────────────────────

console.log("\n── normalizePostalCode — error cases ───────────────────────────");

test("too short (5 chars) throws Error", () => {
  assert.throws(
    () => normalizePostalCode("M5V2T"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /Invalid postal code/);
      assert.match(err.message, /got 5/);
      return true;
    }
  );
});

test("too long (7 chars) throws Error", () => {
  assert.throws(
    () => normalizePostalCode("M5V2T6X"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /got 7/);
      return true;
    }
  );
});

test("empty string throws Error", () => {
  assert.throws(
    () => normalizePostalCode(""),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /got 0/);
      return true;
    }
  );
});

test("only spaces throws Error (zero alphanumeric after strip)", () => {
  assert.throws(
    () => normalizePostalCode("      "),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /got 0/);
      return true;
    }
  );
});

// ─── isOntarioFSA ─────────────────────────────────────────────────────────────

console.log("\n── isOntarioFSA ─────────────────────────────────────────────────");

// Ontario prefixes: K, L, M, N, P
test("M-prefix (Metro Toronto) → true", () => {
  assert.equal(isOntarioFSA("M5V 2T6"), true);
});

test("K-prefix (Eastern Ontario) → true", () => {
  assert.equal(isOntarioFSA("K1A 0A6"), true);
});

test("L-prefix (Central Ontario) → true", () => {
  assert.equal(isOntarioFSA("L4W 1S2"), true);
});

test("N-prefix (Southwestern Ontario) → true", () => {
  assert.equal(isOntarioFSA("N2L 3G1"), true);
});

test("P-prefix (Northern Ontario) → true", () => {
  assert.equal(isOntarioFSA("P7B 5E1"), true);
});

test("V-prefix (BC) → false", () => {
  assert.equal(isOntarioFSA("V6B 1A1"), false);
});

test("T-prefix (Alberta) → false", () => {
  assert.equal(isOntarioFSA("T2P 3C3"), false);
});

test("H-prefix (Quebec) → false", () => {
  assert.equal(isOntarioFSA("H3Z 2Y7"), false);
});

test("lower-case ontario prefix accepted (lower m) → true", () => {
  assert.equal(isOntarioFSA("m5v2t6"), true);
});

test("lower-case non-ontario prefix (lower v) → false", () => {
  assert.equal(isOntarioFSA("v6b1a1"), false);
});

test("leading whitespace is trimmed before checking → true", () => {
  assert.equal(isOntarioFSA("  M5V 2T6"), true);
});

test("raw (no-space) ontario code → true", () => {
  assert.equal(isOntarioFSA("M5V2T6"), true);
});

test("raw (no-space) non-ontario code → false", () => {
  assert.equal(isOntarioFSA("V6B1A1"), false);
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\n─────────────────────────────────────────────────────────────────");
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests.\n`);

if (failed > 0) {
  process.exit(1);
}
