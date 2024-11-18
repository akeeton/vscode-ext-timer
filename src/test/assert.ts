import * as assert from "assert";

/**
 * Wraps {@link assert.deepStrictEqual} so that it doesn't throw when everything is equal except the references.
 */
export function deepStrictValuesEqual<T>(
  actual: unknown,
  expected: T,
  message?: string | Error,
): asserts actual is T {
  try {
    assert.deepStrictEqual(actual, expected, message);
  } catch (err: unknown) {
    if (!(err instanceof assert.AssertionError)) {
      throw err;
    }

    const referencesNotEqualErrorMessage =
      "Values have same structure but are not reference-equal";

    if (!err.message.includes(referencesNotEqualErrorMessage)) {
      throw err;
    }
  }
}
