import type { WasmBridge } from '@/core/wasm-bridge';
import type { EventBus } from '@/core/event-bus';
import { AiClient } from './client';
import { executeHwpTool } from './tools';
import type { AiSettings, ChatMessage, ToolCall } from './types';

const MODIFYING_TOOLS = new Set(['insert_text', 'delete_text', 'replace_all', 'split_paragraph', 'merge_paragraph']);

function buildSystemPrompt(reasoning: string): string {
  const guide = reasoning === 'off'
    ? '답변은 간결하게 하고, 필요한 경우에만 도구를 호출해.'
    : '단계별로 신중하게 생각하고 적극적으로 도구를 호출해.';

  return `너는 한글 문서(HWP) 편집 에이전트야. 실제 문서를 읽고 수정하는 도구를 갖고 있어.

[사용 가능한 도구]
read_document_text - 문서 텍스트 읽기 (args: section?, paragraph?, maxChars?)
get_document_info - 문서 정보 조회 (args: {})
get_caret_position - 커서 위치 확인 (args: {})
insert_text - 텍스트 삽입 (args: section, paragraph, charOffset, text)
delete_text - 텍스트 삭제 (args: section, paragraph, charOffset, count)
replace_all - 전체 찾아바꾸기 (args: search, replace, caseSensitive?)
search_text - 텍스트 검색 (args: query, caseSensitive?)
split_paragraph - 문단 나누기 (args: section, paragraph, charOffset)
merge_paragraph - 문단 합치기 (args: section, paragraph)
get_current_page_text - 현재 페이지 텍스트 (args: pagesAround?)

[도구 호출 방법 - 이 형식만 써!]
도구를 호출할 때는 반드시 아래와 같이 JSON 블록을 응답에 포함해:
\`\`\`tool
{"name": "read_document_text", "args": {"maxChars": 2000}}
\`\`\`
한 번에 여러 도구를 쓸 수 있어:
\`\`\`tool
{"name": "read_document_text", "args": {"maxChars": 2000}}
\`\`\`
\`\`\`tool
{"name": "replace_all", "args": {"search": "옛날", "replace": "새"}}
\`\`\`

[규칙]
1. 항상 한국어로 응답해.
2. 문서를 볼 때는 반드시 read_document_text를 호출해.
3. 텍스트를 수정할 때는 insert_text, delete_text, replace_all을 직접 호출해.
4. "도구를 사용할 수 없습니다"라고 절대 말하지 마.
5. 도구 호출 전에 간단히 설명하고, 도구 결과를 보고 최종 응답해.
6. ${guide}`;
}

function parseToolBlocks(text: string): { calls: ToolCall[]; remaining: string } {
  const calls: ToolCall[] = [];
  let remaining = text;

  const regex = /```tool\s*\n\s*(\{[\s\S]*?\})\s*\n\s*```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    remaining = remaining.replace(match[0], '').trim();
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name && parsed.args != null && typeof parsed.args === 'object') {
        calls.push({
          id: `call_${calls.length}_${Date.now()}`,
          name: parsed.name,
          arguments: parsed.args,
        });
      }
    } catch {
      // skip malformed
    }
  }

  return { calls, remaining };
}

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

  async loadStoredSettings(): Promise<AiSettings | null> {
    const saved = await this.client.loadStoredSettings();
    if (saved) {
      this.settings = saved;
    }
    return saved;
  }

  async sendMessage(userMessage: string, onUpdate?: (msg: ChatMessage) => void): Promise<ChatMessage[]> {
    if (!this.settings) throw new Error('AI 설정이 필요합니다. 먼저 API 키를 입력하세요.');

    const messages: ChatMessage[] = [];
    const reasoning = this.settings.reasoning ?? 'medium';
    const system = buildSystemPrompt(reasoning);

    type ApiMsg = { role: string; content: string };
    const apiMessages: ApiMsg[] = [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ];

    const MAX_ROUNDS = 8;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const requestBody: Record<string, unknown> = {
        model: this.settings.modelId,
        messages: apiMessages,
      };

      const response = await this.client.chat(requestBody);
      const choices = response.choices as Array<Record<string, unknown>> | undefined;
      const choice = choices?.[0];
      if (!choice) break;

      const msg = choice.message as Record<string, unknown> | undefined;
      if (!msg) break;

      const responseText = (msg.content as string) || '';

      // Try native tool_calls first
      const toolCalls = msg.tool_calls as Array<Record<string, unknown>> | undefined;
      // Also try manual ```tool blocks
      const { calls: manualCalls, remaining } = parseToolBlocks(responseText);

      const allCalls = [...(toolCalls || []).map((tc: Record<string, unknown>) => {
        const fn = tc.function as Record<string, unknown>;
        return {
          id: tc.id as string,
          name: fn.name as string,
          arguments: safeJsonParse(fn.arguments as string),
        };
      }), ...manualCalls];

      // Deduplicate by name+args
      const seen = new Set<string>();
      const uniqueCalls: ToolCall[] = [];
      for (const c of allCalls) {
        const key = `${c.name}:${JSON.stringify(c.arguments)}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueCalls.push(c);
        }
      }

      if (uniqueCalls.length > 0) {
        // Show thinking text
        const thinkingText = responseText.replace(/```tool[\s\S]*?```/g, '').trim();
        if (thinkingText) {
          const thinkingMsg: ChatMessage = {
            role: 'assistant', content: `💭 ${thinkingText}`, timestamp: Date.now(),
          };
          messages.push(thinkingMsg);
          onUpdate?.(thinkingMsg);
        }

        // Add assistant response to history
        apiMessages.push({ role: 'assistant', content: responseText });

        let modified = false;
        const toolResults: string[] = [];
        for (const tc of uniqueCalls) {
          const result = executeHwpTool(tc.name, tc.arguments, this.wasm);
          toolResults.push(`[${tc.name}] ${result}`);
          messages.push({
            role: 'tool', content: `🔧 ${tc.name}: ${result}`, toolCallId: tc.id, timestamp: Date.now(),
          });
          if (MODIFYING_TOOLS.has(tc.name)) modified = true;
        }

        // Tool results as plain text to avoid API format issues
        apiMessages.push({
          role: 'user',
          content: `[도구 실행 결과]\n${toolResults.join('\n')}\n\n이 결과를 바탕으로 계속 진행해. 더 이상 도구 호출이 필요 없으면 최종 응답만 해.`,
        });

        if (modified) {
          this.eventBus.emit('document-changed');
          // Yield to event loop so UI can update
          await new Promise((r) => setTimeout(r, 0));
        }
        // Yield between rounds to prevent UI freeze
        await new Promise((r) => setTimeout(r, 0));
        continue;
      }

      // Final response
      const clean = remaining || responseText;
      if (clean) {
        const assistantMsg: ChatMessage = {
          role: 'assistant', content: clean, timestamp: Date.now(),
        };
        messages.push(assistantMsg);
        onUpdate?.(assistantMsg);
      }
      break;
    }

    return messages;
  }
}

function safeJsonParse(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}
