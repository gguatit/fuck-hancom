import type { WasmBridge } from '@/core/wasm-bridge';
import type { EventBus } from '@/core/event-bus';
import { AiClient } from './client';
import { executeHwpTool } from './tools';
import type { AiSettings, ChatMessage, ToolCall } from './types';

const MODIFYING_TOOLS = new Set(['insert_text', 'delete_text', 'replace_all', 'split_paragraph', 'merge_paragraph']);

function buildSystemPrompt(reasoning: string): string {
  const guide = reasoning === 'off'
    ? '간결하게 응답하고 꼭 필요할 때만 도구를 호출해.'
    : '단계별로 신중하게 생각하고 모든 관련 도구를 적극 호출해.';

  return `너는 한글 문서(HWP) 편집 에이전트야. 텍스트뿐 아니라 표, 머리말/꼬리말, 각주, 서식, 그림, 필드, 책갈피까지 모두 볼 수 있어.

[사용 가능한 도구]
읽기: read_document_text, get_document_info, get_document_structure, get_caret_position, get_current_page_text, get_table_content, get_header_footer, get_footnotes, get_char_format, get_para_format, get_style_at, get_picture_shapes, get_fields, get_bookmarks
편집: insert_text, delete_text, replace_all, search_text, split_paragraph, merge_paragraph

[도구 호출법]
\`\`\`tool
{"name": "도구명", "args": {...}}
\`\`\`

[정확도 핵심 규칙]
1. 항상 한국어로 응답해.
2. 사용자가 요청한 텍스트를 임의로 요약하거나 변형하지 말고 정확히 삽입/수정해.
3. 수정 전 반드시 read_document_text로 현재 내용을 확인하고, 수정 후 다시 읽어 검증해.
4. replace_all 할 때는 띄어쓰기, 줄바꿈, 특수문자까지 정확히 일치해야 한다. 부분 일치는 안 된다.
5. 표 셀 안의 내용을 수정할 때는 get_table_content로 구조를 먼저 파악해.
6. 사용자가 "써줘", "넣어줘" 하면 현재 커서 위치나 문맥을 확인 후 정확한 위치에 삽입해.
7. ${guide}`;
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
        calls.push({ id: `c${calls.length}_${Date.now()}`, name: parsed.name, arguments: parsed.args });
      }
    } catch { /* skip */ }
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

  async isServerReady(): Promise<boolean> { return this.client.healthCheck(); }

  async configure(settings: AiSettings): Promise<void> {
    this.settings = settings;
    this.client.configure(settings);
  }

  get isConfigured(): boolean { return this.settings !== null; }

  async loadStoredSettings(): Promise<AiSettings | null> {
    const saved = await this.client.loadStoredSettings();
    if (saved) this.settings = saved;
    return saved;
  }

  async sendMessage(userMessage: string, onUpdate?: (msg: ChatMessage) => void): Promise<ChatMessage[]> {
    if (!this.settings) throw new Error('AI 설정이 필요합니다.');

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
      // Yield to event loop before each API call
      await new Promise((r) => setTimeout(r, 0));

      const response = await this.client.chat({
        model: this.settings.modelId,
        messages: apiMessages,
      });

      const choices = response.choices as Array<Record<string, unknown>> | undefined;
      const choice = choices?.[0];
      if (!choice) break;
      const msg = choice.message as Record<string, unknown> | undefined;
      if (!msg) break;

      const responseText = (msg.content as string) || '';
      const toolCalls = msg.tool_calls as Array<Record<string, unknown>> | undefined;
      const { calls: manualCalls, remaining } = parseToolBlocks(responseText);

      const allCalls: ToolCall[] = [
        ...(toolCalls || []).map((tc: Record<string, unknown>) => {
          const fn = tc.function as Record<string, unknown>;
          return { id: tc.id as string, name: fn.name as string, arguments: safeJsonParse(fn.arguments as string) };
        }),
        ...manualCalls,
      ];

      const seen = new Set<string>();
      const uniqueCalls = allCalls.filter((c) => {
        const k = `${c.name}:${JSON.stringify(c.arguments)}`;
        return seen.has(k) ? false : (seen.add(k), true);
      });

      if (uniqueCalls.length > 0) {
        const thinking = responseText.replace(/```tool[\s\S]*?```/g, '').trim();
        if (thinking) {
          const tm: ChatMessage = { role: 'assistant', content: `💭 ${thinking}`, timestamp: Date.now() };
          messages.push(tm);
          onUpdate?.(tm);
          await new Promise((r) => setTimeout(r, 0));
        }

        apiMessages.push({ role: 'assistant', content: responseText });

        let modified = false;
        const toolResults: string[] = [];
        for (const tc of uniqueCalls) {
          const result = executeHwpTool(tc.name, tc.arguments, this.wasm);
          toolResults.push(`[${tc.name}] ${result}`);
          messages.push({ role: 'tool', content: `🔧 ${result}`, toolCallId: tc.id, timestamp: Date.now() });
          if (MODIFYING_TOOLS.has(tc.name)) modified = true;
          // Yield after each tool execution
          await new Promise((r) => setTimeout(r, 0));
        }

        apiMessages.push({
          role: 'user',
          content: `[도구 결과]\n${toolResults.join('\n')}\n\n결과를 바탕으로 계속 진행해. 더 이상 도구가 필요 없으면 최종 응답만 해.`,
        });

        if (modified) {
          this.eventBus.emit('document-changed');
          await new Promise((r) => setTimeout(r, 0));
        }
        continue;
      }

      const clean = remaining || responseText;
      if (clean) {
        const am: ChatMessage = { role: 'assistant', content: clean, timestamp: Date.now() };
        messages.push(am);
        onUpdate?.(am);
      }
      break;
    }
    return messages;
  }
}

function safeJsonParse(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}
