# Fuck Hancom

Fuck Hancom은 HWP/HWPX 문서를 보고 편집할 수 있는 크로스 플랫폼 데스크탑 애플리케이션입니다. macOS, Windows, Linux를 지원합니다.

문서 파싱과 렌더링은 [rhwp](https://github.com/edwardkim/rhwp) HWP 엔진을 기반으로 하며, Tauri 2 데스크탑 셸을 통해 OS 통합 기능을 제공합니다.

> 이 프로젝트는 [golbin/hop](https://github.com/golbin/hop)에서 포크되었습니다.

## 주요 기능

### 문서 편집

- HWP/HWPX 파일 열기 (메뉴, 드래그 앤 드롭, 파일 연결, CLI 인자)
- HWP 형식으로 저장 및 다른 이름으로 저장
- 텍스트 삽입, 삭제, 찾아바꾸기, 문단 분할/병합
- 표 생성 및 편집 (셀 병합/분할, 행/열 추가/삭제, 셀 속성)
- 그림, 도형, 글상자, 수식 등 개체 삽입 및 편집
- 머리말/꼬리말 편집
- 각주 삽입 및 편집
- 글자 서식 (폰트, 크기, 굵기, 기울임, 밑줄, 색상, 자간, 장평)
- 문단 서식 (정렬, 줄 간격, 여백, 들여쓰기, 문단 번호, 글머리표)
- 스타일 생성/수정/적용
- 누름틀 필드 지원
- 책갈피 지원
- 실행 취소/다시 실행

### 문서 보기

- 페이지별 SVG 렌더링 (가상 스크롤)
- 확대/축소 (50%~300%, 폭 맞춤, 쪽 맞춤)
- 조판 부호 표시/숨기기
- 문단 부호 표시/숨기기
- 다크 모드, 세피아 모드, 고대비 모드
- 눈금자 표시

### 파일 형식

- HWP (.hwp) 읽기 및 저장
- HWPX (.hwpx) 읽기 전용 (저장은 HWP로만 가능)
- PDF 내보내기 (페이지 범위 지정 가능)
- 인쇄 (네이티브 인쇄 다이얼로그)

### AI Assistant (open code 연동)

open code Go 또는 Zen API를 통해 AI 기반 문서 편집을 지원합니다.

**지원하는 AI 기능:**

- 문서의 모든 텍스트 읽기 및 구조 분석
- 텍스트 삽입, 삭제, 찾아바꾸기
- 표 셀 안의 텍스트 읽기 및 수정
- 머리말/꼬리말 내용 확인
- 각주 내용 확인
- 글자 서식 및 문단 서식 확인
- 그림/도형 개체 정보 확인
- 필드(누름틀) 목록 및 값 확인
- 책갈피 목록 확인
- 문서의 전체 구조(표, 개체, 각주, 머리말/꼬리말 등) 요약 분석

**지원하는 LLM 제공자:**

- open code Go (월 $10 구독, DeepSeek V4, Qwen, GLM, Kimi, MiniMax 등)
- open code Zen (종량제, GPT, Claude, Gemini 등)

**추론 레벨:**

- 끔 / 낮음 / 보통 / 높음 / 최고 -- 작업 복잡도에 따라 조절 가능

**사용 방법:**

1. opencode.ai/auth 에서 Go 또는 Zen API 키 발급
2. HOP 실행 후 우측 AI Assistant 패널의 설정 버튼 클릭
3. 제공자(Go/Zen) 선택, API 키 입력, 모델 선택
4. 입력창에 자연어로 문서 편집 요청 (Ctrl+Enter 전송)

### OS 통합

- macOS/Windows/Linux 네이티브 메뉴바
- 다중 창 지원
- 파일 연결 (.hwp, .hwpx)
- 드래그 앤 드롭 파일 열기
- CLI 인자로 파일 열기
- 자동 업데이트 확인

### 기타

- 오픈소스 (MIT 라이선스)
- 개인정보 보호: 문서 데이터는 로컬에서 처리, AI 사용 시에만 API로 전송
- 오프라인 편집 가능 (AI 기능 제외)

## 설치

### 사전 빌드된 바이너리

[Releases](https://github.com/gguatit/fuck-hancom/releases) 페이지에서 Windows 인스톨러(.exe)를 다운로드할 수 있습니다.

### 소스에서 빌드

**필수 도구:**

- Rust (stable toolchain)
- Node.js 24 이상
- pnpm
- Windows: MSYS2 (mingw64) 또는 Visual Studio Build Tools
- open code CLI (AI 기능 사용 시)

**빌드 명령:**

```bash
pnpm install
pnpm --filter hop-desktop tauri build --debug --bundles nsis
```

**빌드 결과:**

```
apps/desktop/src-tauri/target/debug/bundle/nsis/Fuck Hancom_*.exe
```

### 개발 모드

```bash
pnpm --filter @golbin/hop-studio-host dev
pnpm --filter hop-desktop tauri dev
```

## 프로젝트 구조

```
apps/
  desktop/          Tauri 데스크탑 셸 및 Rust 네이티브 코드
  studio-host/      HOP 오버레이 (upstream rhwp-studio 위에 덧씌움)
third_party/
  rhwp/             HWP 파서/렌더러 엔진 (read-only upstream)
assets/              아이콘, 폰트, 스크린샷
docs/                문서
scripts/             유지보수 스크립트
tests/               저장소 레벨 테스트
```

## Credits

- [golbin/hop](https://github.com/golbin/hop) - 원본 HOP 프로젝트
- [edwardkim/rhwp](https://github.com/edwardkim/rhwp) - Rust HWP 엔진

## License

MIT
