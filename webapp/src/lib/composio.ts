import { Composio } from '@composio/core';

export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

export function getComposioClient(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error('COMPOSIO_API_KEY is not configured');
  }

  return new Composio({
    apiKey,
  });
}
