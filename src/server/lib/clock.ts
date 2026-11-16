import "server-only";

// The settable clock (architecture §8.2.2). Domain code calls now(), never new Date().
let source: () => Date = () => new Date();

export function now(): Date {
  return source();
}

/** Tests fix the time with this; production never calls it. */
export function setClock(next: () => Date): void {
  source = next;
}

export function resetClock(): void {
  source = () => new Date();
}
