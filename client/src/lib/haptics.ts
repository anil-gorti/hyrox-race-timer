function vibrate(pattern: number[]): void {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export function hapticStart(): void {
  vibrate([50]);
}

export function hapticStop(): void {
  vibrate([30, 50, 30]);
}

export function hapticRaceComplete(): void {
  vibrate([100, 50, 100, 50, 200]);
}

export function hapticButtonPress(): void {
  vibrate([20]);
}
