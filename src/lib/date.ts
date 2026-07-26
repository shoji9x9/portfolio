interface TemporalNamespace {
  Now?: {
    plainDateISO?():
      | {
          year: number;
        }
      | undefined;
  };
}

function getTemporal() {
  return (globalThis as typeof globalThis & { Temporal?: TemporalNamespace }).Temporal;
}

export function getCurrentYear() {
  return getTemporal()?.Now?.plainDateISO?.()?.year ?? new Date().getFullYear();
}
