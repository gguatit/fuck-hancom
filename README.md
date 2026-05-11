# Fuck Hancom

Fuck Hancom은 HWP/HWPX 문서를 보고 편집할 수 있는 크로스 플랫폼 데스크탑 애플리케이션입니다. macOS, Windows, Linux를 지원하며, Tauri 2를 기반으로 구축되었습니다.

문서 파싱과 렌더링은 [rhwp](https://github.com/edwardkim/rhwp) HWP 엔진을 기반으로 하며, rhwp가 제공하는 기능 위에 데스크탑 셸, 파일 I/O, PDF 내보내기, 인쇄, OS 메뉴바, 파일 연결 등의 OS 통합 기능을 추가로 제공합니다.

> 이 프로젝트는 [golbin/hop](https://github.com/golbin/hop)에서 포크되었습니다. 원본 HOP의 모든 기능을 포함하며, 추가 기능과 버그 수정이 적용되어 있습니다.

## 상태

### AI Assistant (개발 중)

AI Assistant 기능은 현재 개발 중이며, 다음과 같은 제한 사항이 있습니다:

- 텍스트 읽기/찾아바꾸기 등 기본 편집은 동작하지만, 표 안 셀 편집, 복잡한 구조의 문서 편집은 불안정할 수 있습니다.
- 사용하는 LLM 모델에 따라 응답 정확도가 크게 달라집니다.
- 긴 문서의 경우 컨텍스트 길이 제한으로 인해 전체 내용을 한 번에 처리하지 못할 수 있습니다.
- 문서 편집 결과가 의도와 다를 수 있으므로, 중요한 문서는 백업 후 사용을 권장합니다.

## 주요 기능

### 문서 열기 및 저장

| 기능 | 설명 |
|------|------|
| HWP 파일 열기 | 메뉴(파일 > 열기), Ctrl+O, 드래그 앤 드롭, CLI 인자, 파일 더블클릭 |
| HWPX 파일 열기 | HWP와 동일한 방법으로 열기 가능 |
| HWP 저장 | Ctrl+S 또는 메뉴(파일 > 저장) |
| 다른 이름으로 저장 | Ctrl+Shift+S, 항상 HWP 형식으로 저장 |
| 새로운 문서 만들기 | Alt+N 또는 메뉴(파일 > 새로 만들기) |
| 새 창으로 문서 열기 | Ctrl+Shift+N |
| PDF 내보내기 | Ctrl+E, 페이지 범위 지정 가능, 진행률 표시 |
| 인쇄 | Ctrl+P, 네이티브 인쇄 다이얼로그 |

### 텍스트 편집

| 기능 | 단축키/설명 |
|------|------------|
| 텍스트 삽입 | 키보드 입력 |
| 텍스트 삭제 | Delete, Backspace |
| 오려두기 / 복사하기 / 붙이기 | Ctrl+X / Ctrl+C / Ctrl+V |
| 되돌리기 / 다시 실행 | Ctrl+Z / Ctrl+Shift+Z |
| 찾기 / 찾아 바꾸기 | Ctrl+F / Ctrl+F2 |
| 찾아가기 | Alt+G |
| 모두 선택 | Ctrl+A |
| 쪽 나누기 / 단 나누기 | Ctrl+Enter / Ctrl+Shift+Enter |
| 문단 나누기 / 합치기 | Enter / Backspace |

### 글자 서식

글자 모양 대화상자(Alt+L) 또는 서식 도구 모음에서 설정:

| 속성 | 설명 |
|------|------|
| 글꼴 | 한글/영문/한자/일어/외국어/기호/사용자 언어별 지정 |
| 크기 | 포인트(pt) 단위 |
| 굵기 | Ctrl+B |
| 기울임 | Ctrl+I |
| 밑줄 | Ctrl+U, 실선/점선/굵은선 등 종류와 색상 지정 |
| 취소선 | 실선/점선 등 종류와 색상 지정 |
| 글자 색 | 팔레트 또는 직접 입력 |
| 형광펜 | 배경 강조 색상 |
| 외곽선, 양각, 음각 | 글자 효과 |
| 위 첨자, 아래 첨자 | |
| 자간 | 글자 간격 조정 |
| 장평 | 글자 너비 비율 |
| 언어별 상대 크기 | |

### 문단 서식

문단 모양 대화상자(Alt+T)에서 설정:

| 속성 | 설명 |
|------|------|
| 정렬 | 왼쪽, 가운데, 오른쪽, 양쪽, 배분, 나눔 정렬 |
| 줄 간격 | 백분율(%) 또는 고정값(pt), 최소/공백만 등 모드 선택 |
| 여백 | 왼쪽, 오른쪽, 들여쓰기, 첫 줄 들여쓰기 |
| 문단 간격 | 문단 앞, 문단 뒤 여백 |
| 문단 번호 | 번호 수준, 시작 번호, 서식 지정 |
| 글머리표 | 글머리 기호 및 수준 |
| 탭 설정 | 왼쪽/오른쪽/가운데/소수점 탭, 채움선 |
| 간격 자동 조절 | 한글-영문, 한글-숫자 사이 자동 띄어쓰기 |

### 표 편집

| 기능 | 설명 |
|------|------|
| 표 만들기 | 행/열 수 지정하여 생성 |
| 셀 선택 모드 | F5, 이후 화살표/Shift로 범위 선택 |
| 행/열 추가 | 위/아래 줄, 왼쪽/오른쪽 칸 |
| 행/열 삭제 | 선택된 줄/칸 삭제 |
| 셀 합치기 | M 키 |
| 셀 나누기 | S 키 |
| 표/셀 속성 | 여백, 테두리, 배경색, 세로 정렬, 셀 크기 |
| 셀 테두리/배경 | 개별 셀 또는 그룹 단위 적용 |
| 블록 계산식 | 합계, 평균, 곱 |
| 자릿점 | 천 단위 쉼표 추가/제거 |

### 개체

| 개체 | 설명 |
|------|------|
| 그림 | 이미지 파일 삽입, 크기/위치/회전/대칭 조정 |
| 도형 | 사각형, 원, 선, 다각형 등 |
| 글상자 | 텍스트 박스 삽입 |
| 수식 | 수식 편집기로 수식 입력 |
| 문자표 | Alt+F10, 특수문자 삽입 |

### 페이지

| 기능 | 설명 |
|------|------|
| 편집 용지 | F7, 용지 크기 및 방향 |
| 머리말/꼬리말 | 양쪽/홀수/짝수 쪽별 템플릿, 편집 |
| 쪽 번호 | 머리말/꼬리말에 삽입 |
| 구역 설정 | 구역별 편집 용지 |
| 단 설정 | 1~3단, 단 사이 간격 |

### 스타일

| 기능 | 설명 |
|------|------|
| 스타일 목록 | F6, 기본 제공 및 사용자 정의 스타일 |
| 스타일 생성/수정/삭제 | 글자+문단 서식을 하나의 스타일로 관리 |
| 스타일 적용 | 서식 도구 모음에서 선택 |

### 누름틀

| 기능 | 설명 |
|------|------|
| 필드 인식 | HWP 문서 내 누름틀 필드 자동 감지 |
| 필드 값 읽기/수정 | 입력 가능한 필드에 값 입력 |
| 안내 문자 | 필드별 안내 문구 표시 |

### 문서 보기

| 기능 | 설명 |
|------|------|
| 확대/축소 | 하단 상태바 버튼 또는 Ctrl+휠 |
| 배율 | 50%, 75%, 100%, 125%, 150%, 200%, 300% |
| 폭 맞춤 | 문서 너비에 맞게 확대/축소 |
| 쪽 맞춤 | 페이지 전체가 보이도록 확대/축소 |
| 조판 부호 | Ctrl+G,C -- 개체 마커, 쪽 나누기 등 표시 |
| 문단 부호 | Ctrl+G,T -- 줄바꿈, 문단 끝 기호 표시 |
| 투명 선 | Alt+V,T -- 표 테두리 등 숨겨진 선 표시 |
| 눈금자 | 가로/세로 눈금자 |
| 테마 | 도구 > 환경 설정 > 밝게/어둡게/세피아/고대비 |

### OS 통합

| 기능 | 설명 |
|------|------|
| 네이티브 메뉴바 | macOS/Windows/Linux 각 플랫폼 기본 메뉴 |
| 다중 창 | 새 창(Ctrl+Shift+N)으로 여러 문서 동시 편집 |
| 파일 연결 | .hwp 및 .hwpx 확장자 연결 |
| 드래그 앤 드롭 | 파일을 창에 드롭하여 열기 |
| CLI 인자 | `hop-desktop.exe document.hwp` |
| 자동 업데이트 | 시작 시 새 버전 확인 및 알림 |

## AI Assistant (개발 중)

open code Go 또는 Zen API를 통해 LLM 기반 문서 편집을 지원합니다. 이 기능은 현재 개발 중이며 불안정할 수 있습니다.

### 현재 동작하는 기능

- 문서 텍스트 읽기 (`read_document_text`): 전체 또는 특정 섹션/문단의 텍스트 조회
- 문서 정보 조회 (`get_document_info`): 페이지 수, 섹션/문단 수, 파일명
- 텍스트 삽입 (`insert_text`): 일반 문단에 텍스트 삽입
- 텍스트 삭제 (`delete_text`): 특정 위치 텍스트 삭제
- 찾아바꾸기 (`replace_all`): 문서 전체에서 문자열 치환
- 텍스트 검색 (`search_text`): 특정 문자열 위치 찾기
- 문단 분할/병합 (`split_paragraph`, `merge_paragraph`)
- 표 구조 읽기 (`get_table_content`): 문서 내 표의 행/열/셀 내용 분석
- 표 셀 편집 (`insert_text_in_cell`, `delete_text_in_cell`, `read_cell_text`): 불안정
- 문서 구조 분석 (`get_document_structure`): 표, 개체, 각주, 머리말/꼬리말 개수
- 서식 조회 (`get_char_format`, `get_para_format`, `get_style_at`)
- 머리말/꼬리말, 각주, 그림/도형, 필드, 책갈피 읽기
- 커서 위치 확인 (`get_caret_position`)

### 현재 제한 사항

- 표 셀 위치 계산이 부정확할 수 있음 -- AI가 라벨 셀과 빈 셀을 혼동할 수 있음
- 긴 문서의 경우 토큰 한도로 인해 일부만 컨텍스트로 제공됨
- 복잡한 표(셀 병합이 많은 경우) 편집은 미지원
- 멀티턴 대화에서 컨텍스트 유지가 불완전할 수 있음
- 특정 LLM 모델은 function calling을 지원하지 않아 500 오류 발생 가능

### 지원하는 LLM 제공자

**open code Go (월 $10 구독):**

| 모델 | 특징 |
|------|------|
| DeepSeek V4 Pro | 최대 컨텍스트, 높은 정확도 |
| DeepSeek V4 Flash | 빠른 응답 속도 |
| Qwen 3.5 Plus | 한국어 성능 우수 |
| Qwen 3.6 Plus | 최신 버전 |
| GLM 5.1 | 아시아 언어 최적화 |
| Kimi K2.5 / K2.6 | 경쟁력 있는 가격 |
| MiniMax M2.5 / M2.7 | |
| MiMo V2.5 / Pro | |

**open code Zen (종량제, 더 많은 모델):**

| 모델 | 특징 |
|------|------|
| GPT 5.5 / 5.4 / 5.4 Mini | 지시 이행 정확도 최상 |
| Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5 | 긴 문서, 구조적 편집에 강함 |
| Gemini 3.1 Pro / 3 Flash | 무료 티어 있음 (MiniMax M2.5 Free, Big Pickle 등) |

### 추론 레벨

| 레벨 | 설명 |
|------|------|
| 끄기 | 최소한의 추론, 빠른 응답 |
| 낮음 | 간단한 작업에 적합 |
| 보통 | 기본값, 일반적인 편집 작업 |
| 높음 | 복잡한 편집, 신중한 응답 |
| 최고 | 가장 깊은 추론, 긴 응답 시간 |

### 설정 방법

1. [opencode.ai/auth](https://opencode.ai/auth)에서 Go 구독 또는 Zen 크레딧 등록
2. API 키 발급 (sk-... 또는 oc-... 형식)
3. HOP에서 우측 AI Assistant 패널 열기 (메뉴: 보기 > AI Assistant, Ctrl+Shift+A)
4. 패널 상단 설정 버튼 클릭
5. 제공자 선택 (Go 또는 Zen), API 키 입력
6. 모델 목록 로드 버튼 클릭
7. 원하는 모델과 추론 레벨 선택 후 저장

## 설치

### 사전 빌드된 바이너리

[Releases](https://github.com/gguatit/fuck-hancom/releases) 페이지에서 Windows NSIS 인스톨러를 다운로드할 수 있습니다.

설치 프로그램 실행 시 자동으로 WebView2 런타임이 설치되며, 바탕 화면과 시작 메뉴에 바로 가기가 생성됩니다.

### 소스에서 빌드

**필수 소프트웨어:**

| 도구 | 버전 | 용도 |
|------|------|------|
| Rust | stable | 백엔드 컴파일 |
| Node.js | 24 이상 | 프론트엔드 번들링 |
| pnpm | 최신 | 패키지 관리 |
| MSYS2 (Windows) | mingw64 | GNU 링커 도구 |
| NSIS | 3.x | Windows 인스톨러 생성 |

**빌드 순서:**

```bash
# 1. 의존성 설치
pnpm install

# 2. Windows 인스톨러 빌드 (MSYS2 PATH 필요)
$env:PATH = "C:\msys64\mingw64\bin;$env:PATH"
pnpm --filter hop-desktop tauri build --debug --bundles nsis
```

**빌드 결과물:**

```
apps/desktop/src-tauri/
  target/debug/
    hop-desktop.exe              실행 파일
    WebView2Loader.dll           WebView2 로더
    bundle/nsis/
      Fuck Hancom_*.exe          NSIS 인스톨러
```

**테스트 실행:**

```bash
pnpm test                # 전체 테스트
pnpm run test:studio     # TypeScript/Vitest
pnpm run test:desktop    # Rust 테스트
pnpm run clippy:desktop  # Rust 린트
```

## 프로젝트 구조

```
fuck-hancom/
  apps/
    desktop/
      src-tauri/
        src/
          main.rs            진입점
          lib.rs             앱 빌더, 명령 등록
          commands.rs        Tauri 명령 (문서 I/O)
          state.rs           문서 세션 관리자
          ai_commands.rs     AI API 프록시
          ai_server.rs       open code 서버 생명주기
          menu.rs            네이티브 메뉴바
          pdf_export.rs      PDF 변환
          windows.rs         다중 창 관리
          app_quit.rs        종료 처리
          font_catalog.rs    시스템 폰트
          updates.rs         자동 업데이트
        tauri.conf.json      Tauri 설정
        Cargo.toml           Rust 의존성
    studio-host/
      src/
        main.ts              앱 진입점
        core/
          wasm-bridge.ts     WASM 문서 엔진 인터페이스
          tauri-bridge.ts    Tauri 네이티브 브릿지
          event-bus.ts       이벤트 시스템
          font-loader.ts     웹 폰트 로딩
        ai/
          client.ts           AI API 클라이언트
          service.ts          AI 서비스 (대화 루프)
          tools.ts            HWP 문서 도구 정의
          types.ts            타입 정의
        command/             명령 시스템
        engine/              입력 처리
        view/                캔버스 렌더링
        ui/                  UI 컴포넌트
          ai-chat-panel.ts   AI 채팅 패널
          ai-settings-dialog.ts AI 설정 다이얼로그
      hop-overrides.ts       upstream 오버레이 맵
      vite.config.ts         Vite 번들러 설정
  third_party/
    rhwp/                   HWP 엔진 (읽기 전용)
      src/
        document_core/      문서 모델 및 API
        parser/             HWP/HWPX 파서
        renderer/           레이아웃 엔진
        serializer/         HWP 바이너리 라이터
        wasm_api/           WebAssembly 바인딩
      rhwp-studio/
        src/
          core/wasm-bridge.ts  TypeScript WASM API
```

## 알려진 이슈

- Windows에서 GNU 툴체인 빌드 시 `dlltool.exe` 필요 (MSYS2 mingw64/bin)
- HWP 문서의 표/셀 편집 시 특정 셀 인덱스 계산이 불안정할 수 있음
- AI Assistant: 모델에 따라 function calling 미지원으로 500 에러 발생 가능
- 매우 큰 문서(100페이지 이상)에서 메모리 사용량 증가

## Credits

- [golbin/hop](https://github.com/golbin/hop) - 원본 HOP 프로젝트 및 Tauri 데스크탑 셸
- [edwardkim/rhwp](https://github.com/edwardkim/rhwp) - Rust 기반 HWP 문서 파서/렌더러 엔진

## License

MIT License -- 자세한 내용은 [LICENSE](LICENSE) 파일 참조
