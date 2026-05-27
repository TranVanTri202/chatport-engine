/**
 * Patch BigInt globally so `JSON.stringify(somethingWithBigInt)` doesn't
 * throw `TypeError: Do not know how to serialize a BigInt`.
 *
 * We serialize as string — Number would silently lose precision past 2^53.
 * Call this once at bootstrap.
 */
export function installBigIntJsonSerializer(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BigInt.prototype as any).toJSON = function toJSON(): string {
    return this.toString();
  };
}
