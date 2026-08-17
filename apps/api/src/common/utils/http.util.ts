/** Express/Node types most headers (and some route params) as `string | string[] | undefined`. */
export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
