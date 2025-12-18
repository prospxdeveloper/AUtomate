import type { LLMRequest, LLMResponse, LLMMessage } from '@/types';

/**
 * LLMService - OpenRouter integration for multi-model LLM access
 */
export class LLMService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_OPENROUTER_API_KEY || '';
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://autome.ai',
        'X-Title': 'AUTOME',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1000,
        stream: request.stream ?? false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM request failed: ${error}`);
    }

    const data = await response.json();
    return data as LLMResponse;
  }

  async categorize(prompt: string, context: string): Promise<string> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that categorizes content. Respond only with the category name.',
      },
      {
        role: 'user',
        content: `${prompt}\n\nContext: ${context}`,
      },
    ];

    const response = await this.complete({
      model: 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: 0.3,
      maxTokens: 50,
    });

    return response.choices[0].message.content.trim();
  }

  async suggest(context: string, memories: string[] = []): Promise<string[]> {
    const memoryContext = memories.length > 0
      ? `\n\nRelevant past information:\n${memories.join('\n')}`
      : '';

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a proactive AI assistant. Based on the current context, suggest 1-2 helpful actions the user could take. Be concise and actionable. Respond with a JSON array of suggestion strings.',
      },
      {
        role: 'user',
        content: `Current context: ${context}${memoryContext}`,
      },
    ];

    const response = await this.complete({
      model: 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: 0.7,
      maxTokens: 200,
    });

    try {
      const content = response.choices[0].message.content.trim();
      // Extract JSON array if wrapped in markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch {
      // Fallback: return as single suggestion
      return [response.choices[0].message.content.trim()];
    }
  }

  async extractTags(content: string): Promise<string[]> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'Extract 3-5 relevant keywords/tags from the given content. Respond with a JSON array of strings.',
      },
      {
        role: 'user',
        content,
      },
    ];

    const response = await this.complete({
      model: 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: 0.3,
      maxTokens: 100,
    });

    try {
      const content = response.choices[0].message.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch {
      // Fallback: simple splitting
      return content.split(/[,\n]/).map(tag => tag.trim()).filter(Boolean).slice(0, 5);
    }
  }

  async summarize(content: string, maxLength: number = 200): Promise<string> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `Provide a concise summary of the content in ${maxLength} characters or less.`,
      },
      {
        role: 'user',
        content,
      },
    ];

    const response = await this.complete({
      model: 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: 0.5,
      maxTokens: Math.ceil(maxLength / 3), // Rough token estimate
    });

    return response.choices[0].message.content.trim();
  }
}

export const llmService = new LLMService();
