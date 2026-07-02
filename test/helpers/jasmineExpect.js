// Minimal jasmine-style expect() over node:assert for the ported
// orbpro-integration harness specs (WS12.2). Matchers limited to what the
// specs use: toBe, toEqual, toContain, toBeTrue, toBeGreaterThan,
// toThrowError, plus jasmine.objectContaining.
import assert from "node:assert/strict";

class ObjectContaining {
  constructor(props) {
    this.props = props;
  }
}

export const jasmine = {
  objectContaining(props) {
    return new ObjectContaining(props);
  },
};

function matches(actual, expected) {
  if (expected instanceof ObjectContaining) {
    if (actual === null || typeof actual !== "object") return false;
    return Object.entries(expected.props).every(([k, v]) => matches(actual[k], v));
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    return expected.every((v, i) => matches(actual[i], v));
  }
  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object") return false;
    const ek = Object.keys(expected);
    const ak = Object.keys(actual);
    if (ek.length !== ak.length) return false;
    return ek.every((k) => matches(actual[k], expected[k]));
  }
  return Object.is(actual, expected);
}

export function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      assert.ok(
        matches(actual, expected),
        `expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`,
      );
    },
    toContain(expected) {
      if (typeof actual === "string") {
        assert.ok(actual.includes(expected), `expected string to contain ${JSON.stringify(expected)}`);
        return;
      }
      const items = Array.from(actual ?? []);
      assert.ok(
        items.some((item) => matches(item, expected)),
        `expected ${JSON.stringify(items)} to contain ${JSON.stringify(expected)}`,
      );
    },
    toBeTrue() {
      assert.strictEqual(actual, true);
    },
    toBeGreaterThan(expected) {
      assert.ok(actual > expected, `expected ${actual} > ${expected}`);
    },
    toThrowError(matcher) {
      assert.throws(actual, (err) => {
        if (matcher instanceof RegExp) {
          return matcher.test(err?.message ?? String(err));
        }
        return true;
      });
    },
  };
}
