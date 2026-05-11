import type { WasmBridge } from '@/core/wasm-bridge';
import type { EventBus } from '@/core/event-bus';
import { AiClient } from './client';
import { executeHwpTool } from './tools';
import type { AiSettings, ChatMessage, ToolCall } from './types';

const MODIFYING_TOOLS = new Set(['insert_text', 'delete_text', 'replace_all', 'split_paragraph', 'merge_paragraph', 'insert_text_in_cell', 'delete_text_in_cell']);

function buildSystemPrompt(reasoning: string): string {
  const guide = reasoning === 'off'
    ? '간결하게 응답하고 꼭 필요할 때만 도구를 호출해.'
    : '단계별로 신중하게 생각하고 모든 관련 도구를 적극 호출해.';

  return `너는 한글 문서(HWP) 편집 에이전트야. 문서의 모든 요소(텍스트, 표, 머리말/꼬리말, 각주, 서식, 그림, 필드, 책갈피)를 읽고 수정할 수 있어.

[사용 가능한 도구]
읽기: read_document_text, get_document_info, get_document_structure, get_caret_position, get_current_page_text, get_table_content, get_header_footer, get_footnotes, get_char_format, get_para_format, get_style_at, get_picture_shapes, get_fields, get_bookmarks, read_cell_text, find_cell_by_label
편집: insert_text, delete_text, replace_all, search_text, split_paragraph, merge_paragraph, insert_text_in_cell, delete_text_in_cell

[도구 호출법]
\`\`\`tool
{"name": "도구명", "args": {...}}
\`\`\`

[핵심 규칙]
1. 항상 한국어로 응답해.
2. 사용자가 요청한 텍스트를 임의로 요약하거나 변형하지 말고 정확히 삽입/수정해.
3. 수정 전 반드시 read_document_text나 get_table_content로 현재 내용을 확인해.
4. replace_all 할 때는 띄어쓰기, 줄바꿈, 특수문자까지 정확히 일치해야 한다.
5. 표 셀에 쓸 때는 반드시 find_cell_by_label로 먼저 정확한 셀 위치를 찾아. 라벨명을 검색하면 옆 빈칸의 정확한 cellIdx를 알려줘.
6. 표 밖 일반 문단에는 insert_text를, 표 셀 안에는 insert_text_in_cell을 사용해.
7. 도구 실행 결과에 "실패"나 "오류"가 포함되면 절대 성공했다고 말하지 마. 다른 방법으로 다시 시도하거나 실패를 솔직히 알려줘.
8. ${guide}`;
}

function parseToolBlocks(text: string): { calls: ToolCall[]; cleanText: string } {
  const calls: ToolCall[] = [];
  let clean = text;

  // Pattern 1: ```tool ... ```
  const mdRegex = /```tool\s*\n\s*(\{[\s\S]*?\})\s*\n\s*```/g;
  let match;
  while ((match = mdRegex.exec(text)) !== null) {
    clean = clean.replace(match[0], '');
    tryParseToolCall(match[1], calls);
  }

  // Pattern 2: <tool_call>...<tool_code>...</tool_code></tool_call>
  const xmlRegex = /<tool_call>\s*\n?\s*<tool_code>\s*\n?\s*(\{[\s\S]*?\})\s*\n?\s*<\/tool_code>\s*\n?\s*<\/tool_call>/g;
  while ((match = xmlRegex.exec(text)) !== null) {
    clean = clean.replace(match[0], '');
    tryParseToolCall(match[1], calls);
  }

  // Pattern 3: <tool_call>...</tool_call> without tool_code wrapper
  const xml2Regex = /<tool_call>\s*\n?\s*(\{[\s\S]*?\})\s*\n?\s*<\/tool_call>/g;
  while ((match = xml2Regex.exec(text)) !== null) {
    clean = clean.replace(match[0], '');
    tryParseToolCall(match[1], calls);
  }

  // Remove leftover tags/whitespace
  clean = clean.replace(/<\/?tool_(?:call|code)>/g, '').trim();

  return { calls, cleanText: clean };
}

function tryParseToolCall(json: string, calls: ToolCall[]): void {
  try {
    const parsed = JSON.parse(json.trim());
    if (parsed.name && parsed.args != null && typeof parsed.args === 'object') {
      calls.push({ id: `c${calls.length}_${Date.now()}`, name: parsed.name, arguments: parsed.args });
    }
  } catch { /* skip */ }
}

function getReasoningParams(reasoning: string): Record<string, number> {
  switch (reasoning) {
    case 'off':     return { temperature: 0.1, top_p: 0.9 };
    case 'low':     return { temperature: 0.3, top_p: 0.9 };
    case 'medium':  return { temperature: 0.5, top_p: 0.95 };
    case 'high':    return { temperature: 0.7, top_p: 0.95 };
    case 'xhigh':   return { temperature: 0.9, top_p: 0.98 };
    default:        return { temperature: 0.5, top_p: 0.95 };
  }
}

export class AiService {
  private client = new AiClient();
  private sessionId: string | null = null;
  private wasm: WasmBridge;
  private eventBus: EventBus;
  private settings: AiSettings | null = null;
  private conversationHistory: Array<{ role: string; content: string }> = [];

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

    // Build API messages from conversation history + current user message
    const apiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: system },
      ...this.conversationHistory,
      { role: 'user', content: userMessage },
    ];
    // Keep history manageable (last 20 messages + system)
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: userMessage });

    const MAX_ROUNDS = 8;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      // Yield to event loop before each API call
      await new Promise((r) => setTimeout(r, 0));

      const response = await this.client.chat({
        model: this.settings.modelId,
        messages: apiMessages,
        ...getReasoningParams(this.settings.reasoning ?? 'medium'),
      });

      const choices = response.choices as Array<Record<string, unknown>> | undefined;
      const choice = choices?.[0];
      if (!choice) break;
      const msg = choice.message as Record<string, unknown> | undefined;
      if (!msg) break;

      const responseText = (msg.content as string) || '';
      const toolCalls = msg.tool_calls as Array<Record<string, unknown>> | undefined;
      const { calls: manualCalls, cleanText } = parseToolBlocks(responseText);

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
        this.conversationHistory.push({ role: 'assistant', content: responseText });

        let modified = false;
        let hasFailure = false;
        const toolResults: string[] = [];
        for (const tc of uniqueCalls) {
          const result = executeHwpTool(tc.name, tc.arguments, this.wasm);
          toolResults.push(`[${tc.name}] ${result}`);
          messages.push({ role: 'tool', content: `🔧 ${result}`, toolCallId: tc.id, timestamp: Date.now() });
          if (MODIFYING_TOOLS.has(tc.name)) modified = true;
          if (result.includes('실패') || result.includes('오류')) hasFailure = true;
          await new Promise((r) => setTimeout(r, 0));
        }

        let toolResultMsg = `[도구 결과]\n${toolResults.join('\n')}`;
        if (hasFailure) {
          toolResultMsg += '\n\n일부 도구가 실패했습니다. 실패 원인을 분석하고 다른 방법(다른 도구, 다른 인자값)으로 다시 시도하거나, 실패 사실을 사용자에게 솔직히 알려주세요.';
        } else {
          toolResultMsg += '\n\n결과를 바탕으로 계속 진행해. 더 이상 도구가 필요 없으면 최종 응답만 해.';
        }
        apiMessages.push({ role: 'user', content: toolResultMsg });

        if (modified) {
          this.eventBus.emit('document-changed');
          await new Promise((r) => setTimeout(r, 0));
        }
        continue;
      }

      const clean = cleanText || responseText;
      if (clean) {
        const am: ChatMessage = { role: 'assistant', content: clean, timestamp: Date.now() };
        messages.push(am);
        onUpdate?.(am);
        this.conversationHistory.push({ role: 'assistant', content: clean });
      }
      break;
    }
    return messages;
  }
}

function safeJsonParse(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}
