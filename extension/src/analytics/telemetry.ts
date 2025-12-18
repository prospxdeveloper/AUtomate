import posthog from 'posthog-js';

type Properties = Record<string, unknown>;

function isBrowserContext(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isPostHogConfigured(): boolean {
  return Boolean(import.meta.env.VITE_PUBLIC_POSTHOG_KEY);
}

export function telemetryCapture(event: string, properties?: Properties): void {
  if (!isPostHogConfigured()) return;
  if (!isBrowserContext()) return;

  try {
    posthog.capture(event, properties);
  } catch {
    // best-effort only
  }
}

export function telemetryIdentify(distinctId: string, properties?: Properties): void {
  if (!isPostHogConfigured()) return;
  if (!isBrowserContext()) return;

  try {
    posthog.identify(distinctId, properties);
  } catch {
    // best-effort only
  }
}

export function nowMs(): number {
  const perf = (globalThis as any).performance;
  if (perf && typeof perf.now === 'function') return perf.now();
  return Date.now();
}
