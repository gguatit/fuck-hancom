import type { WasmBridge } from '@/core/wasm-bridge';
import { AiClient } from './client';
import { executeHwpTool } from './tools';
import type { AiSettings, ChatMessage, ToolCall } from './types';

function buildSystemPrompt(): string {
  return `너는 한글 문서(HWP) 편집 도우미야. 사용자가 한글 문서를 편집하는 것을 도와줘.

네가 사용할 수 있는 도구:
1. read_document_text - 문서 텍스트 읽기
   args: { section?: number, paragraph?: number, maxChars?: number }
2. get_document_info - 문서 정보 조회
   args: {}
3. get_caret_position - 현재 커서 위치
   args: {}
4. insert_text - 텍스트 삽입
   args: { section: number, paragraph: number, charOffset: number, text: string }
5. delete_text - 텍스트 삭제
   args: { section: number, paragraph: number, charOffset: number, count: number }
6. replace_all - 전체 찾아바꾸기
   args: { search: string, replace: string, caseSensitive?: boolean }
7. search_text - 텍스트 검색
   args: { query: string, caseSensitive?: boolean }
8. split_paragraph - 문단 나누기
   args: { section: number, paragraph: number, charOffset: number }
9. merge_paragraph - 문단 합치기
   args: { section: number, paragraph: number }
10. get_current_page_text - 현재 페이지 주변 텍스트
    args: { pagesAround?: number }

도구를 사용하려면 반드시 아래 형식으로 응답에 포함해:
\`\`\`tool
{"name": "도구이름", "args": {...}}
\`\`\`

한 번에 여러 도구를 호출할 수 있어. 도구 결과를 받은 후 최종 응답을 해.

규칙:
1. 항상 한국어로 응답해.
2. 문서 내용을 수정하기 전에 반드시 read_document_text로 현재 내용을 확인해.
3. 사용자가 명시적으로 지시할 때만 문서를 수정해.
4. replace_all은 정확히 일치하는 문자열만 바뀐다는 점을 고려해.
5. 응답은 간결하게, 필요한 정보만 제공해.`;
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
    // Remove this tool block from remaining text
    remaining = remaining.replace(match[0], '').trim();
  }

  return { calls, remaining };
}

export class AiService {
  private client = new AiClient();
  private sessionId: string | null = null;
  private wasm: WasmBridge;
  private settings: AiSettings | null = null;

  constructor(wasm: WasmBridge) {
    this.wasm = wasm;
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
    const system = buildSystemPrompt();

    let currentParts: Array<{ type: string; text: string }> = [
      { type: 'text', text: userMessage },
    ];

    const MAX_ROUNDS = 5;
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

      const { calls, remaining } = parseToolCalls(responseText);

      if (calls.length > 0) {
        const toolResults: string[] = [];
        for (const tc of calls) {
          const result = executeHwpTool(tc.name, tc.arguments, this.wasm);
          toolResults.push(result);
          messages.push({
            role: 'tool',
            content: result,
            toolCallId: tc.id,
            timestamp: Date.now(),
          });
        }

        // Send tool results as follow-up message
        const resultsText = toolResults.join('\n');
        currentParts = [
          { type: 'text', text: `[도구 실행 결과]\n${resultsText}\n\n이 결과를 바탕으로 계속 진행해줘.` },
        ];
        continue;
      }

      // No tool calls, this is the final response
      const cleanContent = remaining || responseText;
      if (cleanContent) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: cleanContent,
          timestamp: Date.now(),
        };
        messages.push(assistantMsg);
        onUpdate?.(assistantMsg);
      }
      break;
    }

    return messages;
  }
}
