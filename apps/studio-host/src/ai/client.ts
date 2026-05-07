import type { AiSettings } from './types';

const ZEN_BASE = 'https://opencode.ai/zen/v1';
const GO_BASE = 'https://opencode.ai/zen/go/v1';

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface OpenAiTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
}

export class AiClient {
  private apiKey = '';
  private baseUrl = '';

  configure(settings: AiSettings): void {
    this.apiKey = settings.apiKey;
    this.baseUrl = settings.provider === 'go' ? GO_BASE : ZEN_BASE;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(
    messages: OpenAiMessage[],
    tools: OpenAiTool[],
    modelId: string,
  ): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      model: modelId,
      messages,
    };
    if (tools.length > 0) {
      body.tools = tools;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API 오류 (${res.status}): ${text.substring(0, 300)}`);
    }

    return res.json();
  }
}
