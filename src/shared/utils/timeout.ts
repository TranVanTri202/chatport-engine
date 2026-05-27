export function timeout<T = never>(ms: number, message = 'timeout'): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

export function sha1Hex(input: string): string {
  // Imported lazily to keep this util cheap.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('node:crypto') as typeof import('node:crypto');
  return createHash('sha1').update(input).digest('hex');
}
