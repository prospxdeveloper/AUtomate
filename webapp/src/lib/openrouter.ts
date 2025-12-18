type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  // OpenRouter supports OpenAI-style multimodal messages for vision-capable models.
  // Keep this flexible: existing callers use a plain string.
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
};

type OpenRouterChatInput = {
  apiKey: string;
  model: string;
  /**
   * Optional secondary model to try if the primary model is unavailable for this API key/provider.
   * If omitted, will use process.env.OPENROUTER_FALLBACK_MODEL.
   */
  fallbackModel?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

type OpenRouterChatResponse = {
  choices: Array<{ message: { role: string; content: string } }>;
};

export async function openRouterChat(input: OpenRouterChatInput): Promise<OpenRouterChatResponse> {
  const fallbackModel = input.fallbackModel ?? process.env.OPENROUTER_FALLBACK_MODEL;

  async function doRequest(model: string): Promise<Response> {
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.2,
        max_tokens: input.maxTokens ?? 800,
      }),
    });
  }

  function shouldRetryWithFallback(status: number, bodyText: string): boolean {
    if (!fallbackModel) return false;
    if (fallbackModel === input.model) return false;

    // Common OpenRouter error when a model isn't allowed for the current key/provider setup.
    if (status === 404 && /No allowed providers are available/i.test(bodyText)) return true;
    return false;
  }

  const res = await doRequest(input.model);
  if (res.ok) return (await res.json()) as OpenRouterChatResponse;

  const text = await res.text().catch(() => '');
  if (shouldRetryWithFallback(res.status, text)) {
    const fallbackRes = await doRequest(fallbackModel!);
    if (fallbackRes.ok) return (await fallbackRes.json()) as OpenRouterChatResponse;

    const fallbackText = await fallbackRes.text().catch(() => '');
    throw new Error(
      `OpenRouter request failed (${res.status}) for model '${input.model}', and failed again (${fallbackRes.status}) for fallback model '${fallbackModel}': ${fallbackText || fallbackRes.statusText}`,
    );
  }

  throw new Error(`OpenRouter request failed (${res.status}): ${text || res.statusText}`);
}

export function extractJsonFromContent(content: string): unknown {
  const fencedJson = content.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedJson?.[1]) {
    return JSON.parse(fencedJson[1]);
  }

  const fenced = content.match(/```\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]);
  }

  return JSON.parse(content);
}

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
