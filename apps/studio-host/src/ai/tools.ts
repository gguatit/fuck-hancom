import type { WasmBridge } from '@/core/wasm-bridge';
import type { HwpToolDef } from './types';

export function createHwpTools(wasm: WasmBridge): HwpToolDef[] {
  return [
    {
      name: 'read_document_text',
      description:
        '문서의 특정 섹션/문단의 텍스트를 읽습니다. section과 paragraph를 생략하면 문서 전체 텍스트를 읽습니다. maxChars로 최대 글자 수를 제한할 수 있습니다.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'integer',
            description: '섹션 인덱스 (0부터 시작). 생략 시 모든 섹션을 순회합니다.',
          },
          paragraph: {
            type: 'integer',
            description: '문단 인덱스 (0부터 시작). section과 함께 지정 시 해당 문단만 읽습니다.',
          },
          maxChars: {
            type: 'integer',
            description: '최대 글자 수 제한. 기본값 5000.',
          },
        },
      },
    },
    {
      name: 'get_document_info',
      description: '문서 정보를 조회합니다: 페이지 수, 섹션 수, 각 섹션별 문단 수, 현재 파일명 등.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_caret_position',
      description: '현재 커서 위치를 반환합니다 (섹션, 문단, 글자 오프셋).',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'insert_text',
      description: '지정된 위치에 텍스트를 삽입합니다.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'integer',
            description: '섹션 인덱스 (0부터 시작)',
          },
          paragraph: {
            type: 'integer',
            description: '문단 인덱스 (0부터 시작)',
          },
          charOffset: {
            type: 'integer',
            description: '글자 오프셋 (0부터 시작)',
          },
          text: {
            type: 'string',
            description: '삽입할 텍스트',
          },
        },
        required: ['section', 'paragraph', 'charOffset', 'text'],
      },
    },
    {
      name: 'delete_text',
      description: '지정된 위치의 텍스트를 삭제합니다.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'integer',
            description: '섹션 인덱스 (0부터 시작)',
          },
          paragraph: {
            type: 'integer',
            description: '문단 인덱스 (0부터 시작)',
          },
          charOffset: {
            type: 'integer',
            description: '삭제 시작 글자 오프셋',
          },
          count: {
            type: 'integer',
            description: '삭제할 글자 수',
          },
        },
        required: ['section', 'paragraph', 'charOffset', 'count'],
      },
    },
    {
      name: 'replace_all',
      description: '문서 전체에서 특정 문자열을 찾아 다른 문자열로 모두 바꿉니다. 대소문자 구분 옵션을 지정할 수 있습니다.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: '찾을 문자열',
          },
          replace: {
            type: 'string',
            description: '바꿀 문자열',
          },
          caseSensitive: {
            type: 'boolean',
            description: '대소문자 구분 여부. 기본값 false.',
          },
        },
        required: ['search', 'replace'],
      },
    },
    {
      name: 'search_text',
      description: '문서에서 특정 텍스트를 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 문자열',
          },
          caseSensitive: {
            type: 'boolean',
            description: '대소문자 구분 여부. 기본값 false.',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'split_paragraph',
      description: '지정된 위치에서 문단을 나눕니다.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'integer',
            description: '섹션 인덱스 (0부터 시작)',
          },
          paragraph: {
            type: 'integer',
            description: '문단 인덱스 (0부터 시작)',
          },
          charOffset: {
            type: 'integer',
            description: '나눌 글자 오프셋',
          },
        },
        required: ['section', 'paragraph', 'charOffset'],
      },
    },
    {
      name: 'merge_paragraph',
      description: '지정된 문단을 다음 문단과 합칩니다.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'integer',
            description: '섹션 인덱스 (0부터 시작)',
          },
          paragraph: {
            type: 'integer',
            description: '합칠 문단 인덱스 (0부터 시작)',
          },
        },
        required: ['section', 'paragraph'],
      },
    },
    {
      name: 'get_current_page_text',
      description: '현재 표시 중인 페이지 주변의 텍스트를 읽습니다. 현재 페이지 기준으로 앞뒤 N페이지의 텍스트를 가져옵니다. 문서의 문맥을 파악할 때 사용합니다.',
      parameters: {
        type: 'object',
        properties: {
          pagesAround: {
            type: 'integer',
            description: '현재 페이지 기준 앞뒤로 가져올 페이지 수. 기본값 2.',
          },
        },
      },
    },
  ];
}

export function executeHwpTool(
  toolName: string,
  args: Record<string, unknown>,
  wasm: WasmBridge,
): string {
  switch (toolName) {
    case 'read_document_text': {
      const maxChars = (args.maxChars as number) ?? 5000;
      const targetSec = args.section as number | undefined;
      const targetPara = args.paragraph as number | undefined;

      if (targetSec !== undefined && targetPara !== undefined) {
        const len = wasm.getParagraphLength(targetSec, targetPara);
        const limitedLen = Math.min(len, maxChars);
        return wasm.getTextRange(targetSec, targetPara, 0, limitedLen);
      }

      let result = '';
      let totalSections = 1;
      try {
        totalSections = wasm.getParagraphCount(-1); // heuristic
      } catch {
        totalSections = 1;
      }

      for (let s = 0; s < totalSections && result.length < maxChars; s++) {
        let paraCount = 0;
        try {
          paraCount = wasm.getParagraphCount(s);
        } catch {
          break;
        }
        for (let p = 0; p < paraCount && result.length < maxChars; p++) {
          const len = wasm.getParagraphLength(s, p);
          if (len > 0) {
            const remaining = maxChars - result.length;
            result += wasm.getTextRange(s, p, 0, Math.min(len, remaining));
            if (p < paraCount - 1) result += '\n';
          }
        }
        if (s < totalSections - 1) result += '\n--- 다음 섹션 ---\n';
      }

      if (result.length >= maxChars) {
        result += '\n...(문서가 너무 길어 잘렸습니다)';
      }
      return result;
    }

    case 'get_document_info': {
      const info: string[] = [];
      info.push(`페이지 수: ${wasm.pageCount}`);
      info.push(`파일명: ${wasm.fileName}`);
      let totalSections = 1;
      try {
        totalSections = wasm.getParagraphCount(-1);
      } catch { /* fallback */ }
      info.push(`섹션 수: ${totalSections}`);
      let totalParas = 0;
      for (let s = 0; s < totalSections; s++) {
        try {
          totalParas += wasm.getParagraphCount(s);
        } catch { break; }
      }
      info.push(`총 문단 수: ${totalParas}`);
      return info.join('\n');
    }

    case 'get_caret_position': {
      const pos = wasm.getCaretPosition();
      if (!pos) return '커서 위치를 알 수 없습니다. 문서가 로드되지 않았을 수 있습니다.';
      return `섹션: ${pos.sectionIndex}, 문단: ${pos.paragraphIndex}, 글자 오프셋: ${pos.charOffset}`;
    }

    case 'insert_text': {
      const sec = args.section as number;
      const para = args.paragraph as number;
      const off = args.charOffset as number;
      const text = args.text as string;
      wasm.insertText(sec, para, off, text);
      return `텍스트 삽입 완료: 섹션=${sec}, 문단=${para}, 오프셋=${off}, 글자 수=${text.length}`;
    }

    case 'delete_text': {
      const sec = args.section as number;
      const para = args.paragraph as number;
      const off = args.charOffset as number;
      const count = args.count as number;
      wasm.deleteText(sec, para, off, count);
      return `텍스트 삭제 완료: 섹션=${sec}, 문단=${para}, 오프셋=${off}, 삭제 글자 수=${count}`;
    }

    case 'replace_all': {
      const search = args.search as string;
      const replace = args.replace as string;
      const caseSensitive = (args.caseSensitive as boolean) ?? false;
      const result = wasm.replaceAll(search, replace, caseSensitive);
      if (result.ok) {
        return `찾아바꾸기 완료: "${search}" → "${replace}", ${result.count ?? '?'}건 변경됨`;
      }
      return `찾아바꾸기 실패`;
    }

    case 'search_text': {
      const query = args.query as string;
      const caseSensitive = (args.caseSensitive as boolean) ?? false;
      const result = wasm.searchText(query, 0, 0, 0, true, caseSensitive);
      if (result.found) {
        return `검색 결과 찾음: 섹션=${result.sec}, 문단=${result.para}, 오프셋=${result.charOffset}`;
      }
      return `"${query}" 를 찾을 수 없습니다.`;
    }

    case 'split_paragraph': {
      const sec = args.section as number;
      const para = args.paragraph as number;
      const off = args.charOffset as number;
      wasm.splitParagraph(sec, para, off);
      return `문단 나누기 완료: 섹션=${sec}, 문단=${para}, 오프셋=${off}`;
    }

    case 'merge_paragraph': {
      const sec = args.section as number;
      const para = args.paragraph as number;
      wasm.mergeParagraph(sec, para);
      return `문단 합치기 완료: 섹션=${sec}, 문단=${para}`;
    }

    case 'get_current_page_text': {
      const pagesAround = (args.pagesAround as number) ?? 2;
      const totalSections = wasm.getParagraphCount(-1) || 1;
      let result = '';

      for (let s = 0; s < totalSections; s++) {
        let paraCount = 0;
        try {
          paraCount = wasm.getParagraphCount(s);
        } catch {
          break;
        }
        for (let p = 0; p < paraCount; p++) {
          const len = wasm.getParagraphLength(s, p);
          if (len > 0) {
            result += wasm.getTextRange(s, p, 0, len);
            if (p < paraCount - 1) result += '\n';
          }
        }
        if (result.length > 3000) break;
      }

      if (result.length > 3000) {
        result = result.substring(0, 3000) + '\n...(주변 텍스트가 잘렸습니다)';
      }
      return result || '(문서에 텍스트가 없습니다)';
    }

    default:
      return `알 수 없는 도구: ${toolName}`;
  }
}
