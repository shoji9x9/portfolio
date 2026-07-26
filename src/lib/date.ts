interface TemporalNamespace {
  Now: {
    plainDateISO(): {
      year: number;
    };
  };
}

function getTemporal() {
  return (globalThis as typeof globalThis & { Temporal?: TemporalNamespace }).Temporal;
}

export function getCurrentYear() {
  return getTemporal()?.Now.plainDateISO().year ?? new Date().getFullYear();
}
