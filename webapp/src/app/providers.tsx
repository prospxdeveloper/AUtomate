'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

function isPostHogConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isPostHogConfigured()) return;

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
    });
  }, []);

  if (!isPostHogConfigured()) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider client={posthog}>
      {children}
    </PostHogProvider>
  );
}
