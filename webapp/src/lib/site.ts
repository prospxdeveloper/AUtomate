export const siteConfig = {
  name: 'AUTOME',
  title: 'AUTOME — AI Browser Assistant',
  description:
    'AUTOME is an AI browser assistant Chrome extension for tab organization, browser memory, proactive suggestions, and a fast command palette.',
  // Set NEXT_PUBLIC_SITE_URL in production (e.g. https://autome.ai)
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  locale: 'en_US',
  keywords: [
    'AI browser assistant',
    'Chrome extension',
    'tab organizer',
    'tab management',
    'browser memory',
    'web highlights',
    'knowledge capture',
    'proactive suggestions',
    'command palette',
    'productivity extension',
    'AI productivity',
    'research assistant',
    'meeting preparation',
    'email assistant',
  ],
} as const;
