import { siteConfig } from '@/lib/site';

export default function Home() {
  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Chrome',
    description: siteConfig.description,
    url: siteConfig.url,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is AUTOME?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AUTOME is an AI browser assistant Chrome extension that helps organize tabs, save highlights as searchable memory, and suggest next actions based on what you are viewing.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does AUTOME help with productivity?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AUTOME groups tabs by topic, lets you capture key highlights, and provides proactive suggestions and quick actions through a command palette.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does AUTOME store my data?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AUTOME stores saved highlights and generated notes locally in your browser by default, with optional backend sync depending on your configuration.',
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-brand-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center justify-between gap-4 mb-10">
            <a href="/" className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-600" />
              <span className="font-semibold text-gray-900 dark:text-white">{siteConfig.name}</span>
            </a>
            <div className="flex items-center gap-2">
              <a className="btn btn-secondary" href="#features">Features</a>
              <a className="btn btn-primary" href="/dashboard">Dashboard</a>
            </div>
          </nav>

          <header className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand-600" />
              <span className="text-sm text-gray-700 dark:text-gray-200">AI browser assistant • Chrome extension</span>
            </div>
            <h1 className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              {siteConfig.name}
            </h1>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              Tab organization, browser memory, proactive suggestions, and fast actions — built for research and productivity.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a className="btn btn-primary" href="/dashboard">Open dashboard</a>
              <a className="btn btn-secondary" href="#features">View features</a>
            </div>
          </header>

          <section className="card mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Backend status</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/30 p-4">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                <span className="text-gray-800 dark:text-gray-200">API server ready</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/30 p-4">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                <span className="text-gray-800 dark:text-gray-200">Database connected</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/30 p-4">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                <span className="text-gray-800 dark:text-gray-200">Extension endpoints active</span>
              </div>
            </div>
          </section>

          <section id="features" className="card mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Features</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/30 p-5">
                <div className="text-brand-700 dark:text-brand-300 font-semibold">AI tab organization</div>
                <p className="mt-2 text-gray-700 dark:text-gray-300">Automatically categorize tabs into topic groups to reduce clutter and keep focus.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/30 p-5">
                <div className="text-brand-700 dark:text-brand-300 font-semibold">Browser memory</div>
                <p className="mt-2 text-gray-700 dark:text-gray-300">Save highlights and notes as searchable memories, tied back to the source URL.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/30 p-5">
                <div className="text-brand-700 dark:text-brand-300 font-semibold">Proactive suggestions</div>
                <p className="mt-2 text-gray-700 dark:text-gray-300">Get a small, non-intrusive suggestion widget based on your current page context.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/30 p-5">
                <div className="text-brand-700 dark:text-brand-300 font-semibold">Command palette</div>
                <p className="mt-2 text-gray-700 dark:text-gray-300">Press Alt+J to search actions, suggestions, memories, and use cases with fuzzy matching.</p>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
              Keywords: AI browser assistant, Chrome extension, tab manager, browser memory, highlights, productivity, research assistant.
            </div>
          </section>

          <section id="api" className="card">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">API endpoints</h2>
            <div className="space-y-2 font-mono text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">POST</span>
                <code>/api/extension/categorize-tabs</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">POST</span>
                <code>/api/extension/get-suggestions</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">POST</span>
                <code>/api/memories/save</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">POST</span>
                <code>/api/memories/search</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">POST</span>
                <code>/api/memories/delete</code>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
