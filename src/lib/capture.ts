let captureFn: (() => string | null) | null = null;

export function registerCapture(fn: () => string | null) {
  captureFn = fn;
  return () => {
    if (captureFn === fn) captureFn = null;
  };
}

export function captureCover(): string | null {
  try {
    return captureFn ? captureFn() : null;
  } catch {
    return null;
  }
}
