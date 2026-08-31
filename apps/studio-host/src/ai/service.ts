import type { WasmBridge } from '@/core/wasm-bridge';
import type { EventBus } from '@/core/event-bus';
import { AiClient } from './client';
import { executeHwpTool } from './tools';
import type { AiSettings, ChatMessage, ToolCall } from './types';

const MODIFYING_TOOLS = new Set(['insert_text', 'delete_text', 'replace_all', 'split_paragraph', 'merge_paragraph', 'insert_text_in_cell', 'delete_text_in_cell', 'set_char_format', 'set_para_format', 'apply_style', 'set_page_margins', 'create_table']);

export const THINKING_PREFIX = '[생각] ';

export function isVisionModel(modelId: string): boolean {
  return modelId.toLowerCase().includes('vision');
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail: string } };

export function buildUserContent(message: string, images: string[]): string | ContentBlock[] {
  if (images.length === 0) return message;
  return [
    { type: 'text', text: message },
    ...images.map((url): ContentBlock => ({ type: 'image_url', image_url: { url, detail: 'high' } })),
  ];
}

function buildSystemPrompt(reasoning: string): string {
  const guide = reasoning === 'off'
    ? '간결하게 응답하고 꼭 필요할 때만 도구를 호출해.'
    : '단계별로 신중하게 생각하고 모든 관련 도구를 적극 호출해.';

  return `너는 한글 문서(HWP) 편집 에이전트야. 문서의 모든 요소(텍스트, 표, 머리말/꼬리말, 각주, 서식, 그림, 필드, 책갈피)를 읽고 수정할 수 있어.

[사용 가능한 도구]
읽기: read_document_text, get_document_info, get_document_structure, get_caret_position, get_current_page_text, get_table_content, get_header_footer, get_footnotes, get_char_format, get_para_format, get_style_at, get_picture_shapes, get_fields, get_bookmarks, read_cell_text, find_cell_by_label, list_styles
편집: insert_text, delete_text, replace_all, search_text, split_paragraph, merge_paragraph, insert_text_in_cell, delete_text_in_cell
서식: set_char_format(굵게/기울임/밑줄/글자크기/글꼴/글자색/음영색), set_para_format(정렬/줄간격/여백/들여쓰기), apply_style(스타일적용), set_page_margins(좁은여백)
표: create_table(행×열 표 생성. insert_text_in_cell/read_cell_text와 함께 사용)
도형/글상자: list_shapes(페이지별 개체 위치와 sec/para/ci 인덱스 조회. 글상자는 [글상자]로 표시되고 내용 포함), insert_textbox(빈 공간에 새 글상자 생성: section/text 필수, xPercent/yPercent/widthPercent/heightPercent는 콘텐츠 영역(여백 제외) 기준), replace_textbox_text(기존 글상자 내용 교체), modify_shape(개체 이동/크기 변경), delete_shape(개체 삭제)

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

[위치 지정 — 가장 중요]
8. "여기 옆에 써줘" 같은 위치 요청은 절대 추측하지 마. 먼저 search_text(또는 read_document_text)로 대상 문구의 정확한 section/paragraph/charOffset을 찾고, 그 결과의 offset을 그대로 사용해.
9. 문단 중간에 끼워 넣을 때는 검색된 offset에 삽입 지점까지의 글자 수를 더한 값을 charOffset으로 써. 기존 글자와 겹치거나 떨어지게 쓰지 마.
10. 문단 끝에 추가할 때는 해당 문단의 전체 글자 수를 charOffset으로 사용해.
11. 이미 내용이 있는 표 셀에 값을 넣을 때는 먼저 delete_text_in_cell로 기존 내용을 지우고 insert_text_in_cell로 넣어. 절대 기존 내용 위에 겹쳐 쓰지 마.
12. 글자 크기/서식: 삽입한 텍스트는 주변 텍스트와 같은 크기로 써. set_char_format의 baseSize는 pt×100 단위(12pt=1200)야. 크기를 바꿀 때는 get_char_format으로 현재 크기를 먼저 읽고, 적용 범위(startOffset~endOffset)는 방금 삽입한 부분으로만 한정해. 사용자가 크기를 지정하지 않았으면 서식을 바꾸지 마.
13. 화면 이미지가 첨부된 경우: 이미지에서 사용자가 말한 위치(예: "이름 옆에")를 시각적으로 확인해 대략적인 문단을 특정해. 단, 실제 삽입 좌표(paragraph/charOffset)는 이미지에서 읽지 말고 반드시 search_text/read_document_text로 검증해서 사용해. 이미지는 위치 가이드일 뿐이다.
14. 학과/학번/이름 같은 양식 입력란이 안 보이면: get_document_structure에 표가 있는지 확인하고, 있으면 get_table_content로 셀 내용을 읽어. read_document_text는 표 셀 텍스트를 못 읽는다. 표 안 필드에는 find_cell_by_label → insert_text_in_cell 순서로 입력해.
15. 문서가 표가 아니라 도형/글상자로 만든 양식이면(예: 스캔 양식, 개체형 입력란): read_document_text가 빈 내용을 주고 get_document_structure에 표가 없다고 나오면 list_shapes로 개체 목록을 확인해. [글상자] 항목이 입력란이야. 빈 글상자에는 replace_textbox_text로 내용을 넣고, 빈칸이 개체로 없으면 insert_textbox로 새 글상자를 만들어 채워. 글상자 안에는 insert_text/insert_text_in_cell이 통하지 않으니 반드시 이 도구들을 사용해.
16. ${guide}`;
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

  getSettings(): AiSettings | null { return this.settings; }

  async loadStoredSettings(): Promise<AiSettings | null> {
    const saved = await this.client.loadStoredSettings();
    if (saved) this.settings = saved;
    return saved;
  }

  async sendMessage(userMessage: string, images: string[] = [], onUpdate?: (msg: ChatMessage) => void): Promise<ChatMessage[]> {
    if (!this.settings) throw new Error('AI 설정이 필요합니다.');
    if (images.length > 0 && !isVisionModel(this.settings.modelId)) {
      throw new Error('선택한 모델은 이미지를 지원하지 않습니다. deepseek-v4-flash-vision-exp 모델을 선택하세요.');
    }

    const messages: ChatMessage[] = [];
    const reasoning = this.settings.reasoning ?? 'medium';
    const system = buildSystemPrompt(reasoning);

    // Build API messages from conversation history + current user message
    const apiMessages: Array<{ role: string; content: string | ContentBlock[] }> = [
      { role: 'system', content: system },
      ...this.conversationHistory,
      { role: 'user', content: buildUserContent(userMessage, images) },
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

      let liveThinking: ChatMessage | null = null;
      let liveContent: ChatMessage | null = null;
      const response = await this.client.chat({
        model: this.settings.modelId,
        messages: apiMessages,
        ...getReasoningParams(this.settings.reasoning ?? 'medium'),
      }, onUpdate ? (chunk) => {
        if (!chunk.text) return;
        if (chunk.type === 'reasoning') {
          if (!liveThinking) {
            liveThinking = { role: 'assistant', content: `${THINKING_PREFIX}${chunk.text}`, timestamp: Date.now() };
            messages.push(liveThinking);
            onUpdate(liveThinking);
          } else {
            liveThinking.content += chunk.text;
            onUpdate(liveThinking);
          }
        } else if (chunk.type === 'content') {
          if (!liveContent) {
            liveContent = { role: 'assistant', content: chunk.text, timestamp: Date.now() };
            messages.push(liveContent);
            onUpdate(liveContent);
          } else {
            liveContent.content += chunk.text;
            onUpdate(liveContent);
          }
        }
      } : undefined);

      const choices = response.choices as Array<Record<string, unknown>> | undefined;
      const choice = choices?.[0];
      if (!choice) {
        throw new Error(`AI 응답을 해석할 수 없습니다. 응답: ${JSON.stringify(response).slice(0, 200)}`);
      }
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
        if (thinking && !liveThinking && !liveContent) {
          const tm: ChatMessage = { role: 'assistant', content: `${THINKING_PREFIX}${thinking}`, timestamp: Date.now() };
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
          let result: string;
          try {
            result = executeHwpTool(tc.name, tc.arguments, this.wasm);
          } catch (err) {
            result = `실패: ${err instanceof Error ? err.message : String(err)}`;
          }
          toolResults.push(`[${tc.name}] ${result}`);
          messages.push({ role: 'tool', content: `[도구] ${result}`, toolCallId: tc.id, timestamp: Date.now() });
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
      if (clean && !liveContent) {
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
