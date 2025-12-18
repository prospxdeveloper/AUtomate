import React, { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

let posthogInitialized = false;

function isPostHogConfigured(): boolean {
  return Boolean(import.meta.env.VITE_PUBLIC_POSTHOG_KEY);
}

export function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
  const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;

  useEffect(() => {
    if (!posthogKey) return;
    if (posthogInitialized) return;

    posthog.init(posthogKey, {
      api_host: posthogHost || 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
    });

    posthogInitialized = true;
  }, [posthogKey, posthogHost]);

  if (!isPostHogConfigured()) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
