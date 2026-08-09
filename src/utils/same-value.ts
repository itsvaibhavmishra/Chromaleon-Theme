// Structural, not JSON.stringify: settings off disk carry whatever key order the file had.

export function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (typeof left !== typeof right) return false
  if (left === null || right === null) return false
  if (typeof left !== 'object') return false

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
    return left.every((item, index) => sameValue(item, right[index]))
  }

  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right as object)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      sameValue((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]),
  )
}
