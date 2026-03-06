import posthog from "posthog-js";

const apiKey = import.meta.env.VITE_POSTHOG_KEY;
const apiHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

export function initPostHog() {
  if (!apiKey) return;
  posthog.init(apiKey, {
    api_host: apiHost,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage",
  });
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!apiKey) return;
  posthog.identify(userId, properties);
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!apiKey) return;
  posthog.capture(event, properties);
}

export function resetPostHog() {
  if (!apiKey) return;
  posthog.reset();
}
