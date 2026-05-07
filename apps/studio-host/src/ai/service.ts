import type { WasmBridge } from '@/core/wasm-bridge';
import type { EventBus } from '@/core/event-bus';
import { AiClient } from './client';
import { executeHwpTool } from './tools';
import type { AiSettings, ChatMessage, ToolCall } from './types';

const MODIFYING_TOOLS = new Set(['insert_text', 'delete_text', 'replace_all', 'split_paragraph', 'merge_paragraph']);

function buildSystemPrompt(reasoning: string): string {
  const thinking = reasoning === 'off' ? '\n답변은 간결하게, 필요한 도구만 호출해.' : '\n단계별로 신중하게 추론하고 필요한 도구를 적극 호출해.';
  return `너는 HWP 한글 문서를 직접 편집하는 AI 에이전트야. 너에게는 실제 문서를 읽고 수정할 수 있는 도구들이 주어져 있어.

[도구]
read_document_text, get_document_info, get_caret_position, insert_text, delete_text, replace_all, search_text, split_paragraph, merge_paragraph, get_current_page_text

[도구 호출 방법]
응답에 아래 JSON 블록을 반드시 포함해:
\`\`\`tool
{"name": "read_document_text", "args": {"maxChars": 2000}}
\`\`\`
여러 도구를 한 번에 호출하려면 여러 블록을 넣어:
\`\`\`tool
{"name": "read_document_text", "args": {"maxChars": 1000}}
\`\`\`
\`\`\`tool
{"name": "replace_all", "args": {"search": "옛날말", "replace": "새말"}}
\`\`\`

[필수 규칙]
1. 문서 내용을 확인할 때는 반드시 read_document_text 도구를 호출해.
2. 텍스트 수정이 필요하면 insert_text, delete_text, replace_all 도구를 호출해.
3. 도구 호출 없이 "도구를 사용할 수 없습니다"라고 말하지 마. 도구는 항상 사용 가능해.
4. 사용자가 문서 편집을 요청하면 즉시 도구를 호출해.
5. 한국어로 응답해.${thinking}`;
}

function parseToolCalls(text: string): { calls: ToolCall[]; remaining: string } {
  const calls: ToolCall[] = [];
  let remaining = text;

  const regex = /```tool\s*\n([\s\S]*?)\n```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name && parsed.args != null) {
        calls.push({
          id: `call_${calls.length}_${Date.now()}`,
          name: parsed.name,
          arguments: parsed.args,
        });
      }
    } catch {
      // skip malformed tool calls
    }
    remaining = remaining.replace(match[0], '').trim();
  }

  return { calls, remaining };
}

export class AiService {
  private client = new AiClient();
  private sessionId: string | null = null;
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
    const providerId = settings.provider === 'go' ? 'opencode-go' : 'opencode';
    await this.client.setAuth(providerId, settings.apiKey);
  }

  get isConfigured(): boolean {
    return this.settings !== null;
  }

  private async ensureSession(): Promise<string> {
    if (!this.sessionId) {
      const session = await this.client.createSession('HOP AI 문서 편집');
      this.sessionId = session.id;
    }
    return this.sessionId;
  }

  async sendMessage(userMessage: string, onUpdate?: (msg: ChatMessage) => void): Promise<ChatMessage[]> {
    if (!this.settings) throw new Error('AI 설정이 필요합니다. 먼저 API 키를 입력하세요.');

    const sessionId = await this.ensureSession();
    const messages: ChatMessage[] = [];
    const providerId = this.settings.provider === 'go' ? 'opencode-go' : 'opencode';
    const reasoning = this.settings.reasoning ?? 'medium';
    const system = buildSystemPrompt(reasoning);

    let currentParts: Array<{ type: string; text: string }> = [
      { type: 'text', text: userMessage },
    ];

    const MAX_ROUNDS = 10;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await this.client.sendMessage(sessionId, {
        parts: currentParts,
        system,
        model: { providerID: providerId, modelID: this.settings.modelId },
      });

      let responseText = '';
      for (const part of response.parts) {
        if (part.type === 'text' && part.text) {
          responseText += part.text;
        }
      }

      if (!responseText) break;

      const { calls, remaining } = parseToolCalls(responseText);

      if (calls.length > 0) {
        // Notify UI about tool execution (thinking step)
        const thinkingText = remaining.replace(/```tool[\s\S]*?```/g, '').trim();
        if (thinkingText) {
          const thinkingMsg: ChatMessage = {
            role: 'assistant',
            content: `💭 ${thinkingText}`,
            timestamp: Date.now(),
          };
          messages.push(thinkingMsg);
          onUpdate?.(thinkingMsg);
        }

        let modified = false;
        const toolResults: string[] = [];
        for (const tc of calls) {
          const result = executeHwpTool(tc.name, tc.arguments, this.wasm);
          toolResults.push(`[${tc.name}] ${result}`);
          messages.push({
            role: 'tool',
            content: `🔧 ${tc.name}: ${result}`,
            toolCallId: tc.id,
            timestamp: Date.now(),
          });

          if (MODIFYING_TOOLS.has(tc.name)) {
            modified = true;
          }
        }

        // Trigger canvas re-render if document was modified
        if (modified) {
          this.eventBus.emit('document-changed');
          this.markDirty();
        }

        currentParts = [
          { type: 'text', text: `[도구 실행 결과]\n${toolResults.join('\n')}\n\n이 결과를 바탕으로 계속 진행해줘. 최종 결과만 응답하고 더 이상 도구 호출이 필요 없으면 일반 텍스트로만 응답해.` },
        ];
        continue;
      }

      // No tool calls, this is the final response
      if (remaining || responseText) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: remaining || responseText,
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
