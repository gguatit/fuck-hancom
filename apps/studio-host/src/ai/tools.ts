import type { WasmBridge } from '@/core/wasm-bridge';
import type { HwpToolDef } from './types';

export function createHwpTools(wasm: WasmBridge): HwpToolDef[] {
  return [
    {
      name: 'read_document_text',
      description: '문서 텍스트 읽기. section/paragraph 생략 시 전체. maxChars 제한 가능.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer', description: '섹션 인덱스 (0부터)' },
          paragraph: { type: 'integer', description: '문단 인덱스 (0부터)' },
          maxChars: { type: 'integer', description: '최대 글자 수. 기본 8000.' },
        },
      },
    },
    {
      name: 'get_document_info',
      description: '문서 기본 정보: 페이지 수, 섹션 수, 문단 수, 파일명.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_document_structure',
      description: '전체 문서 구조: 표/그림/각주/머리말/필드/책갈피 개수와 요약.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_caret_position',
      description: '현재 커서 위치 (섹션, 문단, 오프셋).',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_current_page_text',
      description: '문서 텍스트 최대 4000자까지 읽기.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_table_content',
      description: '문서의 모든 표 구조(행/열)와 셀 텍스트 읽기.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_header_footer',
      description: '문서의 모든 머리말/꼬리말 내용 읽기.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_footnotes',
      description: '문서의 모든 각주 번호와 텍스트 읽기.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_char_format',
      description: '특정 위치 글자 서식(폰트, 크기, 굵기, 색상 등) 읽기.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer' },
          paragraph: { type: 'integer' },
          charOffset: { type: 'integer' },
        },
        required: ['section', 'paragraph', 'charOffset'],
      },
    },
    {
      name: 'get_para_format',
      description: '특정 문단 서식(정렬, 줄간격, 여백 등) 읽기.',
      parameters: {
        type: 'object',
        properties: { section: { type: 'integer' }, paragraph: { type: 'integer' } },
        required: ['section', 'paragraph'],
      },
    },
    {
      name: 'get_style_at',
      description: '특정 문단의 스타일 정보 읽기.',
      parameters: {
        type: 'object',
        properties: { section: { type: 'integer' }, paragraph: { type: 'integer' } },
        required: ['section', 'paragraph'],
      },
    },
    {
      name: 'get_picture_shapes',
      description: '문서의 모든 그림/도형/개체 종류와 위치 읽기.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_fields',
      description: '문서의 모든 필드/누름틀 목록과 값 읽기.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_bookmarks',
      description: '문서의 모든 책갈피 목록 읽기.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'insert_text',
      description: '지정 위치에 텍스트 삽입.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer' },
          paragraph: { type: 'integer' },
          charOffset: { type: 'integer' },
          text: { type: 'string', description: '삽입할 텍스트' },
        },
        required: ['section', 'paragraph', 'charOffset', 'text'],
      },
    },
    {
      name: 'delete_text',
      description: '지정 위치 텍스트 삭제.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer' },
          paragraph: { type: 'integer' },
          charOffset: { type: 'integer' },
          count: { type: 'integer' },
        },
        required: ['section', 'paragraph', 'charOffset', 'count'],
      },
    },
    {
      name: 'replace_all',
      description: '문서 전체 찾아바꾸기.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          replace: { type: 'string' },
          caseSensitive: { type: 'boolean' },
        },
        required: ['search', 'replace'],
      },
    },
    {
      name: 'search_text',
      description: '텍스트 검색.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' }, caseSensitive: { type: 'boolean' } },
        required: ['query'],
      },
    },
    {
      name: 'split_paragraph',
      description: '문단 나누기.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer' },
          paragraph: { type: 'integer' },
          charOffset: { type: 'integer' },
        },
        required: ['section', 'paragraph', 'charOffset'],
      },
    },
    {
      name: 'insert_text_in_cell',
      description: '표 셀 안에 텍스트를 삽입합니다. cellIdx = row * cols + col.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer', description: '표가 있는 섹션' },
          paragraph: { type: 'integer', description: '표가 있는 문단' },
          controlIdx: { type: 'integer', description: '표 컨트롤 인덱스 (보통 0)' },
          cellIdx: { type: 'integer', description: '셀 인덱스 = 행번호 × 열개수 + 열번호' },
          cellParagraph: { type: 'integer', description: '셀 내 문단 인덱스 (보통 0)' },
          charOffset: { type: 'integer', description: '글자 오프셋 (0=처음, 큰값=끝)' },
          text: { type: 'string', description: '삽입할 텍스트' },
        },
        required: ['section', 'paragraph', 'controlIdx', 'cellIdx', 'cellParagraph', 'charOffset', 'text'],
      },
    },
    {
      name: 'delete_text_in_cell',
      description: '표 셀 안의 텍스트를 삭제합니다.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer' },
          paragraph: { type: 'integer' },
          controlIdx: { type: 'integer' },
          cellIdx: { type: 'integer' },
          cellParagraph: { type: 'integer' },
          charOffset: { type: 'integer' },
          count: { type: 'integer' },
        },
        required: ['section', 'paragraph', 'controlIdx', 'cellIdx', 'cellParagraph', 'charOffset', 'count'],
      },
    },
    {
      name: 'read_cell_text',
      description: '표 셀 안의 텍스트를 읽습니다.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer' },
          paragraph: { type: 'integer' },
          controlIdx: { type: 'integer' },
          cellIdx: { type: 'integer' },
          cellParagraph: { type: 'integer' },
        },
        required: ['section', 'paragraph', 'controlIdx', 'cellIdx', 'cellParagraph'],
      },
    },
    {
      name: 'find_cell_by_label',
      description: '표 안에서 라벨명(예: "성명", "연락처", "이메일")을 검색하여, 해당 라벨이 있는 행/열과 그 옆 빈 입력 셀의 정확한 cellIdx를 반환합니다. 라벨명은 부분 일치합니다.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer', description: '표가 있는 섹션' },
          paragraph: { type: 'integer', description: '표가 있는 문단' },
          controlIdx: { type: 'integer', description: '표 컨트롤 인덱스 (보통 0)' },
          label: { type: 'string', description: '찾을 라벨명 (예: "성명", "연락처", "이메일")' },
        },
        required: ['section', 'paragraph', 'controlIdx', 'label'],
      },
    },
    {
      name: 'set_char_format',
      description: '글자 서식 설정. 굵게/기울임/밑줄/취소선/글자크기/글꼴/글자색/음영색 등을 지정.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer' },
          paragraph: { type: 'integer' },
          startOffset: { type: 'integer', description: '적용 시작 (전체면 0)' },
          endOffset: { type: 'integer', description: '적용 끝 (전체면 -1)' },
          bold: { type: 'boolean', description: '굵게' },
          italic: { type: 'boolean', description: '기울임' },
          underline: { type: 'boolean', description: '밑줄' },
          strikethrough: { type: 'boolean', description: '취소선' },
          baseSize: { type: 'number', description: '글자 크기 (pt*100. 12pt=1200)' },
          fontId: { type: 'number', description: '글꼴 ID. findOrCreateFontId로 얻음' },
          textColor: { type: 'integer', description: '글자색 ARGB (검정=4278190080)' },
          shadeColor: { type: 'integer', description: '음영색 ARGB (노랑=4294967040)' },
        },
        required: ['section', 'paragraph', 'startOffset', 'endOffset'],
      },
    },
    {
      name: 'set_para_format',
      description: '문단 서식 설정. 정렬/줄간격/여백/들여쓰기 지정.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer' },
          paragraph: { type: 'integer' },
          alignment: { type: 'string', enum: ['left', 'right', 'center', 'justify', 'distribute', 'divide'], description: '정렬 방식' },
          lineSpacing: { type: 'number', description: '줄간격 (%. 130=130%)' },
          lineSpacingType: { type: 'integer', description: '줄간격 종류 (0=% 1=pt 2=fixed 3=minimum)' },
          marginLeft: { type: 'number', description: '왼쪽 여백 (HWPUNIT)' },
          marginRight: { type: 'number', description: '오른쪽 여백 (HWPUNIT)' },
          indent: { type: 'number', description: '들여쓰기 (양수=들여, 음수=내어)' },
          spacingBefore: { type: 'number', description: '문단 앞 여백 (HWPUNIT)' },
          spacingAfter: { type: 'number', description: '문단 뒤 여백 (HWPUNIT)' },
        },
        required: ['section', 'paragraph'],
      },
    },
    {
      name: 'apply_style',
      description: '문단에 스타일 적용 (예: 제목, 본문). list_styles로 사용 가능한 스타일 먼저 확인.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer' },
          paragraph: { type: 'integer' },
          styleId: { type: 'integer', description: '스타일 ID (list_styles 결과에서 확인)' },
        },
        required: ['section', 'paragraph', 'styleId'],
      },
    },
    {
      name: 'list_styles',
      description: '문서에서 사용 가능한 모든 스타일 목록을 반환합니다.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'set_page_margins',
      description: '페이지 여백 설정. 이력서 등 좁은 여백이 필요할 때 사용.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer', description: '섹션 인덱스 (보통 0)' },
          width: { type: 'number', description: '용지 너비 HWPUNIT (A4=59528)' },
          height: { type: 'number', description: '용지 높이 HWPUNIT (A4=84188)' },
          marginLeft: { type: 'number', description: '왼쪽 여백 (좁게=4252, 기본=8504)' },
          marginRight: { type: 'number', description: '오른쪽 여백' },
          marginTop: { type: 'number', description: '위쪽 여백' },
          marginBottom: { type: 'number', description: '아래쪽 여백' },
          landscape: { type: 'boolean', description: '가로 방향' },
        },
        required: ['section', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom'],
      },
    },
    {
      name: 'create_table',
      description: '표 생성. 행×열 표를 만들고 paraIdx/controlIdx 반환.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'integer' },
          paragraph: { type: 'integer' },
          charOffset: { type: 'integer', description: '표를 넣을 위치 (0=문단 처음)' },
          rows: { type: 'integer', description: '행 수' },
          cols: { type: 'integer', description: '열 수' },
        },
        required: ['section', 'paragraph', 'charOffset', 'rows', 'cols'],
      },
    },
  ];
}

export function executeHwpTool(
  toolName: string,
  args: Record<string, unknown>,
  wasm: WasmBridge,
): string {
  // Shared helpers
  function readAllText(maxChars: number): string {
    let result = '';
    let sections = 1;
    try { sections = wasm.getParagraphCount(-1); } catch { /* */ }
    for (let s = 0; s < sections && result.length < maxChars; s++) {
      let pc = 0;
      try { pc = wasm.getParagraphCount(s); } catch { break; }
      for (let p = 0; p < pc && result.length < maxChars; p++) {
        const len = wasm.getParagraphLength(s, p);
        if (len > 0) {
          result += wasm.getTextRange(s, p, 0, Math.min(len, maxChars - result.length));
          if (p < pc - 1) result += '\n';
        }
      }
      if (s < sections - 1) result += '\n---\n';
    }
    if (result.length >= maxChars) result += '\n...(잘림)';
    return result;
  }

  switch (toolName) {
    case 'read_document_text': {
      const maxChars = (args.maxChars as number) ?? 8000;
      const ts = args.section as number | undefined;
      const tp = args.paragraph as number | undefined;
      if (ts !== undefined && tp !== undefined) {
        const len = wasm.getParagraphLength(ts, tp);
        return wasm.getTextRange(ts, tp, 0, Math.min(len, maxChars));
      }
      return readAllText(maxChars);
    }

    case 'get_document_info': {
      const info: string[] = [];
      info.push(`페이지: ${wasm.pageCount}`);
      info.push(`파일명: ${wasm.fileName}`);
      let sections = 1, totalParas = 0;
      try { sections = wasm.getParagraphCount(-1); } catch { /* */ }
      for (let s = 0; s < sections; s++) {
        try { totalParas += wasm.getParagraphCount(s); } catch { break; }
      }
      info.push(`섹션: ${sections}, 문단: ${totalParas}`);
      return info.join('\n');
    }

    case 'get_document_structure': {
      const out: string[] = [];
      let sections = 1;
      try { sections = wasm.getParagraphCount(-1); } catch { /* */ }

      let totalPics = 0, totalFns = 0, hfCount = 0;
      const allBookmarks: string[] = [];
      try {
        const bms = wasm.getBookmarks();
        for (const b of bms) {
          allBookmarks.push(`${b.name} (s${b.sec}p${b.para})`);
        }
      } catch { /* */ }

      try {
        const fields = wasm.getFieldList();
        const fInfo = fields.map((f) =>
          `${f.guide || f.name || f.fieldId} (id:${f.fieldId})`
        );
        if (fInfo.length > 0) out.push(`필드: ${fInfo.join(', ')}`);
      } catch { /* */ }

      try {
        for (let pg = 0; pg < wasm.pageCount; pg++) {
          try {
            const layout = wasm.getPageControlLayout(pg);
            if (layout?.controls) totalPics += layout.controls.length;
          } catch { /* */ }
        }
      } catch { /* */ }

      try {
        const list = wasm.getHeaderFooterList(0, true, 0);
        if (list?.ok && list.items?.length) hfCount = list.items.length;
      } catch { /* */ }

      try {
        for (let pg = 0; pg < wasm.pageCount; pg++) {
          for (let fi = 0; fi < 50; fi++) {
            try {
              const info = wasm.getPageFootnoteInfo(pg, fi);
              if (info?.ok) totalFns++; else break;
            } catch { break; }
          }
        }
      } catch { /* */ }

      out.unshift(`전체 구조: ${sections}섹션, ${wasm.pageCount}페이지`);
      if (totalPics > 0) out.push(`그림/개체: ${totalPics}개`);
      if (totalFns > 0) out.push(`각주: ${totalFns}개`);
      if (hfCount > 0) out.push(`머리말/꼬리말: ${hfCount}개`);
      if (allBookmarks.length > 0) out.push(`책갈피: ${allBookmarks.join('; ')}`);

      return out.join('\n') || '문서 구조를 파악할 수 없습니다.';
    }

    case 'get_caret_position': {
      const pos = wasm.getCaretPosition();
      if (!pos) return '커서 위치를 알 수 없습니다.';
      return `섹션=${pos.sectionIndex}, 문단=${pos.paragraphIndex}, 오프셋=${pos.charOffset}`;
    }

    case 'get_current_page_text':
      return readAllText(4000);

    case 'get_table_content': {
      const out: string[] = [];
      let sections = 1, tableIdx = 0;
      try { sections = wasm.getParagraphCount(-1); } catch { /* */ }
      for (let s = 0; s < sections; s++) {
        let pc = 0;
        try { pc = wasm.getParagraphCount(s); } catch { break; }
        for (let p = 0; p < pc; p++) {
          for (let ci = 0; ci < 5; ci++) {
            try {
              const dims = wasm.getTableDimensions(s, p, ci);
              if (!dims?.rowCount) continue;
              tableIdx++;
              const rows = dims.rowCount, cols = dims.colCount;
              out.push(`[표${tableIdx}] ${rows}행x${cols}열 (호출값: section=${s}, paragraph=${p}, controlIdx=${ci})`);
            for (let r = 0; r < Math.min(rows, 20); r++) {
              const rowTexts: string[] = [];
              for (let c = 0; c < cols; c++) {
                const cellIdx = r * cols + c;
                try {
                  let ct = '';
                  let cellParas = 0;
                  try { cellParas = wasm.getCellParagraphCount(s, p, ci, cellIdx); } catch { /* */ }
                  for (let cp = 0; cp < cellParas; cp++) {
                    const txt = wasm.getTextInCell(s, p, ci, cellIdx, cp, 0, 500);
                    if (txt) ct += txt;
                  }
                  rowTexts.push(ct || '-');
                } catch { rowTexts.push('?'); }
              }
              out.push(`  행${r} (cellIdx=${r*cols}~${r*cols+cols-1}): ${rowTexts.join(' | ')}`);
            }
            if (rows > 20) out.push(`  ...(${rows - 20}행 생략)`);
          } catch { /* */ }
        }
      }
    }
    return out.join('\n') || '표가 없습니다.';
  }

  case 'get_header_footer': {
      const out: string[] = [];
      let sections = 1;
      try { sections = wasm.getParagraphCount(-1); } catch { /* */ }
      for (let s = 0; s < sections; s++) {
        for (const isHeader of [true, false]) {
          for (const applyTo of [0, 1, 2]) {
            try {
              const c = wasm.getHeaderFooter(s, isHeader, applyTo);
              if (c) {
                const t = (isHeader ? '머리말' : '꼬리말') + (applyTo === 1 ? '(짝수)' : applyTo === 2 ? '(홀수)' : '(양쪽)');
                out.push(`[s${s} ${t}] ${c.substring(0, 500)}`);
              }
            } catch { /* */ }
          }
        }
      }
      try {
        const list = wasm.getHeaderFooterList(0, true, 0);
        if (list?.ok && list.items?.length) {
          out.push(`\n전체 ${list.items.length}개: ${list.items.map((it: Record<string, unknown>) => it.label).join(', ')}`);
        }
      } catch { /* */ }
      return out.join('\n') || '머리말/꼬리말이 없습니다.';
    }

    case 'get_footnotes': {
      const out: string[] = [];
      let totalFns = 0;
      for (let pg = 0; pg < wasm.pageCount; pg++) {
        for (let fi = 0; fi < 100; fi++) {
          try {
            const info = wasm.getPageFootnoteInfo(pg, fi);
            if (!info?.ok) break;
            totalFns++;
            const fnInfo = wasm.getFootnoteInfo(info.sectionIdx, info.paraIdx, info.controlIdx);
            if (fnInfo?.ok) {
              out.push(`[각주${fnInfo.number}] s${info.sectionIdx}p${info.paraIdx}: ${(fnInfo.texts || []).join('').substring(0, 300)}`);
            }
          } catch { break; }
        }
      }
      return out.join('\n') || `각주: ${totalFns > 0 ? `${totalFns}개` : '없음'}`;
    }

    case 'get_char_format': {
      const s = args.section as number;
      const p = args.paragraph as number;
      const o = args.charOffset as number;
      try {
        const cp = wasm.getCharPropertiesAt(s, p, o);
        return [
          `폰트: ${cp.fontFamily ?? '?'} ${cp.fontSize ?? '?'}pt`,
          `굵기:${cp.bold ? 'Y' : 'N'} 기울임:${cp.italic ? 'Y' : 'N'} 밑줄:${cp.underline ? 'Y' : 'N'}`,
          `색:${cp.textColor ?? '?'}`,
        ].join('\n');
      } catch { return '서식 읽기 실패'; }
    }

    case 'get_para_format': {
      const s = args.section as number;
      const p = args.paragraph as number;
      try {
        const pp = wasm.getParaPropertiesAt(s, p);
        return [
          `정렬: ${pp.alignment ?? '?'}`,
          `줄간격: ${pp.lineSpacing ?? '?'} 전여백:${pp.spacingBefore ?? 0} 후여백:${pp.spacingAfter ?? 0}`,
          `왼여백:${pp.marginLeft ?? 0} 오른여백:${pp.marginRight ?? 0} 들여쓰기:${pp.indent ?? 0}`,
        ].join('\n');
      } catch { return '문단 서식 읽기 실패'; }
    }

    case 'get_picture_shapes': {
      const out: string[] = [];
      let total = 0;
      for (let pg = 0; pg < wasm.pageCount; pg++) {
        try {
          const layout = wasm.getPageControlLayout(pg);
          if (layout?.controls?.length) {
            for (const ctrl of layout.controls) {
              total++;
              out.push(`[${ctrl.type || '개체'}] p${pg} s${ctrl.secIdx}p${ctrl.paraIdx}`);
              if (out.length > 50) break;
            }
          }
        } catch { /* */ }
        if (out.length > 50) { out.push('...(50개 초과 생략)'); break; }
      }
      return out.join('\n') || `그림/개체: ${total > 0 ? `${total}개` : '없음'}`;
    }

    case 'get_fields': {
      try {
        const fields = wasm.getFieldList();
        if (!fields?.length) return '필드 없음';
        const out: string[] = [];
        for (const f of fields) {
          let v = '';
          try {
            const fv = wasm.getFieldValue(f.fieldId);
            if (fv?.ok) v = `="${fv.value}"`;
          } catch { /* */ }
          out.push(`[id:${f.fieldId}] ${f.guide || f.name || '?'} ${v}`);
        }
        return `${fields.length}개 필드:\n${out.join('\n')}`;
      } catch { return '필드 읽기 실패'; }
    }

    case 'get_bookmarks': {
      try {
        const bms = wasm.getBookmarks();
        if (!bms?.length) return '책갈피 없음';
        return bms.map((b) =>
          `${b.name}: s${b.sec}p${b.para}@${b.charPos}`
        ).join('\n');
      } catch { return '책갈피 읽기 실패'; }
    }

    // ── 편집 ──
    case 'insert_text': {
      try {
        const s = args.section as number;
        const p = args.paragraph as number;
        const o = args.charOffset as number;
        const t = args.text as string;
        wasm.insertText(s, p, o, t);
        return `삽입 완료: s${s}p${p}@${o} +${t.length}글자`;
      } catch (e) { return `삽입 실패: ${e}`; }
    }

    case 'delete_text': {
      try {
        const s = args.section as number;
        const p = args.paragraph as number;
        const o = args.charOffset as number;
        const c = args.count as number;
        wasm.deleteText(s, p, o, c);
        return `삭제 완료: s${s}p${p}@${o} -${c}글자`;
      } catch (e) { return `삭제 실패: ${e}`; }
    }

    case 'replace_all': {
      try {
        const search = args.search as string;
        const replace = args.replace as string;
        const cs = (args.caseSensitive as boolean) ?? false;
        const r = wasm.replaceAll(search, replace, cs);
        return r.ok ? `"${search}"→"${replace}" ${r.count ?? '?'}건` : '찾아바꾸기 실패: 결과 없음';
      } catch (e) { return `찾아바꾸기 실패: ${e}`; }
    }

    case 'search_text': {
      try {
        const q = args.query as string;
        const cs = (args.caseSensitive as boolean) ?? false;
        const r = wasm.searchText(q, 0, 0, 0, true, cs);
        return r.found ? `찾음: s${r.sec}p${r.para}@${r.charOffset}` : `"${q}" 없음`;
      } catch (e) { return `검색 실패: ${e}`; }
    }

    case 'split_paragraph': {
      try {
        const s = args.section as number;
        const p = args.paragraph as number;
        const o = args.charOffset as number;
        wasm.splitParagraph(s, p, o);
        return `문단 분할: s${s}p${p}@${o}`;
      } catch (e) { return `분할 실패: ${e}`; }
    }

    case 'merge_paragraph': {
      try {
        const s = args.section as number;
        const p = args.paragraph as number;
        wasm.mergeParagraph(s, p);
        return `문단 병합: s${s}p${p}`;
      } catch (e) { return `병합 실패: ${e}`; }
    }

    case 'insert_text_in_cell': {
      try {
        const s = args.section as number;
        const p = args.paragraph as number;
        const ci = args.controlIdx as number;
        const cellIdx = args.cellIdx as number;
        const cp = args.cellParagraph as number;
        const off = args.charOffset as number;
        const text = args.text as string;
        try {
          const dims = wasm.getTableDimensions(s, p, ci);
          if (!dims?.rowCount) return '셀 삽입 실패: 표 없음. insert_text 사용.';
        } catch { return '셀 삽입 실패: 표 없음. insert_text 사용.'; }
        // Check if cell already has content (likely a label)
        let existing = '';
        try { existing = wasm.getTextInCell(s, p, ci, cellIdx, cp, 0, 100); } catch { /* */ }
        if (existing.trim() && off === 0 && !text.startsWith(existing.trim())) {
          // Cell has content - warn but still allow
          wasm.insertTextInCell(s, p, ci, cellIdx, cp, off, text);
          return `⚠️ cellIdx=${cellIdx} 기존내용 "${existing.trim().substring(0, 30)}" 위에 덮어쓰기. 의도적이면 문제없음.`;
        }
        wasm.insertTextInCell(s, p, ci, cellIdx, cp, off, text);
        return `✅ 셀 삽입 완료: cellIdx=${cellIdx} +${text.length}글자`;
      } catch (e) { return `셀 삽입 실패: ${e}`; }
    }

    case 'delete_text_in_cell': {
      try {
        const s = args.section as number;
        const p = args.paragraph as number;
        const ci = args.controlIdx as number;
        const cellIdx = args.cellIdx as number;
        const cp = args.cellParagraph as number;
        const off = args.charOffset as number;
        const count = args.count as number;
        try {
          const dims = wasm.getTableDimensions(s, p, ci);
          if (!dims?.rowCount) return '셀 삭제 실패: 해당 위치에 표가 없습니다. delete_text를 대신 사용하세요.';
        } catch { return '셀 삭제 실패: 표를 찾을 수 없습니다. delete_text를 대신 사용하세요.'; }
        wasm.deleteTextInCell(s, p, ci, cellIdx, cp, off, count);
        return `셀 삭제 완료: s${s}p${p}ci${ci} cell${cellIdx} cp${cp}@${off} -${count}글자`;
      } catch (e) { return `셀 삭제 실패: ${e}`; }
    }

    case 'read_cell_text': {
      const s = args.section as number;
      const p = args.paragraph as number;
      const ci = args.controlIdx as number;
      const cellIdx = args.cellIdx as number;
      const cp = args.cellParagraph as number;
      const len = wasm.getCellParagraphLength(s, p, ci, cellIdx, cp);
      const text = wasm.getTextInCell(s, p, ci, cellIdx, cp, 0, Math.min(len, 500));
      return text || '(빈 셀)';
    }

    case 'find_cell_by_label': {
      const s = args.section as number;
      const p = args.paragraph as number;
      const ci = args.controlIdx as number;
      const label = (args.label as string).toLowerCase();
      try {
        const dims = wasm.getTableDimensions(s, p, ci);
        if (!dims?.rowCount) return '표를 찾을 수 없습니다.';
        const rows = dims.rowCount, cols = dims.colCount;

        const found: string[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            try {
              let txt = '';
              const cpc = wasm.getCellParagraphCount(s, p, ci, idx);
              for (let cp = 0; cp < cpc; cp++) {
                const t = wasm.getTextInCell(s, p, ci, idx, cp, 0, 200);
                if (t) txt += t;
              }
              if (txt.toLowerCase().includes(label)) {
                // Find adjacent empty cells
                const adjacent: { cellIdx: number; row: number; col: number; content: string }[] = [];
                for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0], [0, 2], [0, -2]]) {
                  const ar = r + dr;
                  const ac = c + dc;
                  if (ar >= 0 && ar < rows && ac >= 0 && ac < cols) {
                    const ai = ar * cols + ac;
                    try {
                      let atxt = '';
                      const apc = wasm.getCellParagraphCount(s, p, ci, ai);
                      for (let cp = 0; cp < apc; cp++) {
                        const t = wasm.getTextInCell(s, p, ci, ai, cp, 0, 200);
                        if (t) atxt += t;
                      }
                      adjacent.push({ cellIdx: ai, row: ar, col: ac, content: atxt.trim() || '(빈칸)' });
                    } catch { /* */ }
                  }
                }
                const empty = adjacent.filter((a) => !a.content || a.content === '(빈칸)');
                const nonEmpty = adjacent.filter((a) => a.content && a.content !== '(빈칸)');
                found.push(
                  `[${txt.trim()}] 위치: 행${r}열${c} (cellIdx=${idx})` +
                  (empty.length > 0 ? `\n  입력 가능한 빈칸: ${empty.map((a) => `cellIdx=${a.cellIdx} (행${a.row}열${a.col})`).join(', ')}` : '') +
                  (nonEmpty.length > 0 ? `\n  주변 다른 내용: ${nonEmpty.map((a) => `cellIdx=${a.cellIdx}: "${a.content}"`).join(', ')}` : '')
                );
              }
            } catch { /* */ }
          }
        }
        return found.length > 0
          ? `검색 결과:\n${found.join('\n\n')}\n\n이 중에서 입력할 빈칸 cellIdx를 선택해 insert_text_in_cell을 호출하세요.`
          : `"${args.label}" 라벨을 찾을 수 없습니다. get_table_content로 전체 표를 먼저 확인하세요.`;
      } catch (e) { return `검색 실패: ${e}`; }
    }

    case 'set_char_format': {
      const s = args.section as number;
      const p = args.paragraph as number;
      const so = args.startOffset as number;
      const eo = args.endOffset as number;
      try {
        const props: Record<string, unknown> = {};
        if (args.bold !== undefined) props.bold = args.bold;
        if (args.italic !== undefined) props.italic = args.italic;
        if (args.underline !== undefined) props.underline = args.underline;
        if (args.strikethrough !== undefined) props.strikethrough = args.strikethrough;
        if (args.baseSize !== undefined) props.baseSize = args.baseSize;
        if (args.fontId !== undefined) props.fontId = args.fontId;
        if (args.textColor !== undefined) props.textColor = args.textColor;
        if (args.shadeColor !== undefined) props.shadeColor = args.shadeColor;
        wasm.applyCharFormat(s, p, so, eo, JSON.stringify(props));
        const applied = Object.keys(props).join(', ');
        return `글자 서식 적용 완료: s${s}p${p} [${so}~${eo}] ${applied}`;
      } catch (e) { return `글자 서식 적용 실패: ${e}`; }
    }

    case 'set_para_format': {
      const s = args.section as number;
      const p = args.paragraph as number;
      try {
        const props: Record<string, unknown> = {};
        if (args.alignment !== undefined) props.alignment = args.alignment;
        if (args.lineSpacing !== undefined) props.lineSpacing = args.lineSpacing;
        if (args.lineSpacingType !== undefined) props.lineSpacingType = args.lineSpacingType;
        if (args.marginLeft !== undefined) props.marginLeft = args.marginLeft;
        if (args.marginRight !== undefined) props.marginRight = args.marginRight;
        if (args.indent !== undefined) props.indent = args.indent;
        if (args.spacingBefore !== undefined) props.spacingBefore = args.spacingBefore;
        if (args.spacingAfter !== undefined) props.spacingAfter = args.spacingAfter;
        wasm.applyParaFormat(s, p, JSON.stringify(props));
        const applied = Object.keys(props).join(', ');
        return `문단 서식 적용 완료: s${s}p${p} ${applied}`;
      } catch (e) { return `문단 서식 적용 실패: ${e}`; }
    }

    case 'apply_style': {
      const s = args.section as number;
      const p = args.paragraph as number;
      const sid = args.styleId as number;
      try {
        const r = wasm.applyStyle(s, p, sid);
        return r.ok ? `스타일 적용 완료: s${s}p${p} styleId=${sid}` : `스타일 적용 실패: styleId=${sid}`;
      } catch (e) { return `스타일 적용 실패: ${e}`; }
    }

    case 'list_styles': {
      try {
        const styles = wasm.getStyleList();
        if (!styles?.length) return '사용 가능한 스타일이 없습니다.';
        return styles.map((st) =>
          `[${st.type === 1 ? '문단' : '글자'}] id=${st.id} "${st.name}"${st.englishName ? ` (${st.englishName})` : ''}`
        ).join('\n');
      } catch (e) { return `스타일 목록 읽기 실패: ${e}`; }
    }

    case 'set_page_margins': {
      const s = args.section as number;
      try {
        const current = wasm.getPageDef(s);
        const pageDef = {
          width: args.width as number ?? current.width,
          height: args.height as number ?? current.height,
          marginLeft: args.marginLeft as number,
          marginRight: args.marginRight as number,
          marginTop: args.marginTop as number,
          marginBottom: args.marginBottom as number,
          marginHeader: current.marginHeader,
          marginFooter: current.marginFooter,
          marginGutter: current.marginGutter,
          landscape: (args.landscape as boolean) ?? current.landscape,
          binding: current.binding,
        };
        const r = wasm.setPageDef(s, pageDef);
        return r.ok
          ? `페이지 여백 적용 완료: 섹션${s} L=${args.marginLeft} R=${args.marginRight} T=${args.marginTop} B=${args.marginBottom} (페이지=${r.pageCount})`
          : '페이지 여백 적용 실패';
      } catch (e) { return `페이지 여백 적용 실패: ${e}`; }
    }

    case 'create_table': {
      const s = args.section as number;
      const p = args.paragraph as number;
      const off = args.charOffset as number;
      const rows = args.rows as number;
      const cols = args.cols as number;
      try {
        const r = wasm.createTable(s, p, off, rows, cols);
        return r.ok
          ? `표 생성 완료: ${rows}행×${cols}열 (section=${s}, paraIdx=${r.paraIdx ?? p}, controlIdx=${r.controlIdx ?? 0})`
          : '표 생성 실패';
      } catch (e) { return `표 생성 실패: ${e}`; }
    }

    default:
      return `알 수 없는 도구: ${toolName}`;
  }
}
