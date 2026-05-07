import type { WasmBridge } from '@/core/wasm-bridge';
import type { EventBus } from '@/core/event-bus';
import { AiClient } from './client';
import { executeHwpTool, createHwpTools } from './tools';
import type { AiSettings, ChatMessage, ToolCall } from './types';

const MODIFYING_TOOLS = new Set(['insert_text', 'delete_text', 'replace_all', 'split_paragraph', 'merge_paragraph']);

const SYSTEM_PROMPT = `너는 한글 문서(HWP) 편집 도우미야. 사용자가 한글 문서를 편집하는 것을 도와줘.

규칙:
1. 항상 한국어로 응답해.
2. 문서 내용을 수정하기 전에 반드시 read_document_text로 현재 내용을 확인해.
3. 사용자가 명시적으로 지시할 때만 문서를 수정해.
4. replace_all은 정확히 일치하는 문자열만 바뀐다는 점을 고려해.
5. 응답은 간결하게, 필요한 정보만 제공해.`;

export class AiService {
  private client = new AiClient();
  private wasm: WasmBridge;
  private eventBus: EventBus;
  private settings: AiSettings | null = null;

  constructor(wasm: WasmBridge, eventBus: EventBus) {
    this.wasm = wasm;
    this.eventBus = eventBus;
  }

  async isServerReady(): Promise<boolean> {
    return this.client.healthCheck();
  }

  async configure(settings: AiSettings): Promise<void> {
    this.settings = settings;
    this.client.configure(settings);
  }

  get isConfigured(): boolean {
    return this.settings !== null;
  }

  async sendMessage(userMessage: string, onUpdate?: (msg: ChatMessage) => void): Promise<ChatMessage[]> {
    if (!this.settings) throw new Error('AI 설정이 필요합니다. 먼저 API 키를 입력하세요.');

    const messages: ChatMessage[] = [];
    const tools = createHwpTools(this.wasm);

    const apiMessages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool';
      content: string | null;
      tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
      tool_call_id?: string;
    }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    const MAX_ROUNDS = 10;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await this.client.chat(
        apiMessages,
        tools.map((t) => ({
          type: 'function' as const,
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
        this.settings.modelId,
      );

      const choice = response.choices?.[0];
      if (!choice) break;

      const msg = choice.message;

      // Handle tool calls
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Show thinking content if any
        if (msg.content) {
          const thinkingMsg: ChatMessage = {
            role: 'assistant',
            content: `💭 ${msg.content}`,
            timestamp: Date.now(),
          };
          messages.push(thinkingMsg);
          onUpdate?.(thinkingMsg);
        }

        // Add assistant message with tool calls to history
        apiMessages.push({
          role: 'assistant',
          content: msg.content,
          tool_calls: msg.tool_calls,
        });

        let modified = false;
        for (const tc of msg.tool_calls) {
          const fn = tc.function;
          const args = safeJsonParse(fn.arguments);
          const result = executeHwpTool(fn.name, args, this.wasm);

          messages.push({
            role: 'tool',
            content: `🔧 ${fn.name}: ${result}`,
            toolCallId: tc.id,
            timestamp: Date.now(),
          });

          // Add tool result to API history
          apiMessages.push({
            role: 'tool',
            content: result,
            tool_call_id: tc.id,
          });

          if (MODIFYING_TOOLS.has(fn.name)) {
            modified = true;
          }
        }

        if (modified) {
          this.eventBus.emit('document-changed');
          this.markDirty();
        }
        continue;
      }

      // Final text response
      if (msg.content) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: msg.content,
          timestamp: Date.now(),
        };
        messages.push(assistantMsg);
        onUpdate?.(assistantMsg);
      }
      break;
    }

    return messages;
  }

  private markDirty(): void {
    const bridge = this.wasm as { markDocumentDirty?: () => void };
    bridge.markDocumentDirty?.();
  }
}

function safeJsonParse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
