/**
 * Checks that an object contains all of its keys.
 */
export function hasKeysOfItsType<T extends object>(
  obj: T,
  objKeys: (keyof T)[],
): boolean {
  for (const key of objKeys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }

  return true;
}
