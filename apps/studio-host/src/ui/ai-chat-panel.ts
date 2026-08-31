import { AiService, THINKING_PREFIX, isVisionModel } from '@/ai/service';
import type { ChatMessage } from '@/ai/types';
import { AiSettingsDialog } from './ai-settings-dialog';
import { AiClient } from '@/ai/client';
import { captureVisiblePages } from '@/ai/screenshot';
import type { WasmBridge } from '@/core/wasm-bridge';
import type { EventBus } from '@/core/event-bus';

const ICON_GEAR = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.98a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>';
const ICON_CAMERA = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/></svg>';

function statusDotSvg(color: string): string {
  return `<svg viewBox="0 0 8 8" width="8" height="8" style="vertical-align:middle"><circle cx="4" cy="4" r="3.4" fill="${color}"/></svg> `;
}

export class AiChatPanel {
  private container: HTMLElement;
  private panelInner: HTMLElement;
  private toggleBtn: HTMLElement;
  private visible = false;
  private service: AiService;
  private settingsDialog: AiSettingsDialog;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private settingsBtn!: HTMLButtonElement;
  private cameraBtn!: HTMLButtonElement;
  private statusEl!: HTMLElement;
  private pendingImages: string[] = [];
  private loading = false;
  private wasm: WasmBridge;
  private eventBus: EventBus;

  constructor(container: HTMLElement, wasm: WasmBridge, eventBus: EventBus) {
    this.container = container;
    this.wasm = wasm;
    this.eventBus = eventBus;
    this.service = new AiService(wasm, eventBus);
    this.settingsDialog = new AiSettingsDialog();

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'aic-toggle-btn';
    this.toggleBtn.title = 'AI Assistant 열기';
    this.toggleBtn.innerHTML = '<span class="aic-toggle-text">AI</span>';
    this.toggleBtn.addEventListener('click', () => this.toggle());

    this.panelInner = document.createElement('div');
    this.panelInner.className = 'aic-panel-inner';

    this.container.appendChild(this.toggleBtn);
    this.container.appendChild(this.panelInner);

    this.build();
    // Load saved settings first, then show
    this.tryRestoreSettings().then(() => this.show());
  }

  private build(): void {
    this.panelInner.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'aic-header';

    const title = document.createElement('span');
    title.className = 'aic-title';
    title.textContent = 'AI Assistant';
    header.appendChild(title);

    this.statusEl = document.createElement('span');
    this.statusEl.className = 'aic-header-status';
    this.statusEl.textContent = '연결 확인 중...';
    header.appendChild(this.statusEl);

    this.settingsBtn = document.createElement('button');
    this.settingsBtn.className = 'aic-icon-btn';
    this.settingsBtn.title = 'AI 설정 (API 키, 모델)';
    this.settingsBtn.innerHTML = ICON_GEAR;
    header.appendChild(this.settingsBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'aic-icon-btn aic-close-btn';
    closeBtn.title = 'AI 패널 닫기';
    closeBtn.innerHTML = ICON_CLOSE;
    header.appendChild(closeBtn);

    this.panelInner.appendChild(header);

    this.messagesEl = document.createElement('div');
    this.messagesEl.className = 'aic-messages';
    this.panelInner.appendChild(this.messagesEl);

    const inputArea = document.createElement('div');
    inputArea.className = 'aic-input-area';

    this.inputEl = document.createElement('textarea');
    this.inputEl.className = 'aic-input';
    this.inputEl.placeholder = 'AI에게 문서 편집을 요청하세요... (Ctrl+Enter 전송)';
    this.inputEl.rows = 3;
    inputArea.appendChild(this.inputEl);

    const btnRow = document.createElement('div');
    btnRow.className = 'aic-btn-row';

    this.cameraBtn = document.createElement('button');
    this.cameraBtn.className = 'aic-btn aic-btn-camera';
    this.cameraBtn.title = '화면 캡처 첨부 (다음 요청 1회)';
    this.cameraBtn.innerHTML = ICON_CAMERA;
    btnRow.appendChild(this.cameraBtn);

    this.sendBtn = document.createElement('button');
    this.sendBtn.className = 'aic-btn aic-btn-primary';
    this.sendBtn.textContent = '전송';
    this.sendBtn.disabled = true;
    btnRow.appendChild(this.sendBtn);

    inputArea.appendChild(btnRow);
    this.panelInner.appendChild(inputArea);

    closeBtn.addEventListener('click', () => this.hide());
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.cameraBtn.addEventListener('click', () => this.toggleCapture());
    this.sendBtn.addEventListener('click', () => this.send());

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.send();
      }
    });

    this.checkServer();
  }

  private setStatus(text: string, color?: string): void {
    this.statusEl.innerHTML = color ? statusDotSvg(color) : '';
    this.statusEl.appendChild(document.createTextNode(text));
    this.statusEl.style.color = color ?? '';
  }

  private toggleCapture(): void {
    const settings = this.service.getSettings();
    if (!settings || !isVisionModel(settings.modelId)) {
      this.addSystemMessage('화면 캡처는 비전 모델(예: deepseek-v4-flash-vision-exp)에서만 사용할 수 있습니다. ⚙ 설정에서 모델을 변경하세요.');
      return;
    }
    if (this.pendingImages.length > 0) {
      this.pendingImages = [];
      this.cameraBtn.classList.remove('aic-camera-active');
      this.addSystemMessage('화면 캡처 첨부가 취소되었습니다.');
      return;
    }
    const shots = captureVisiblePages();
    if (shots.length === 0) {
      this.addSystemMessage('캡처할 페이지가 없습니다. 문서를 열어주세요.');
      return;
    }
    this.pendingImages = shots;
    this.cameraBtn.classList.add('aic-camera-active');
    this.addSystemMessage(`화면 ${shots.length}장이 다음 요청에 첨부됩니다. (전송 후 자동 해제)`);
  }

  private async checkServer(): Promise<void> {
    if (!this.service.isConfigured) {
      this.setStatus('설정 필요', '#ff9800');
      this.addSystemMessage('AI Assistant를 사용하려면 설정 버튼을 눌러 opencode Go 또는 Zen API 키를 입력하세요.\nAPI 키는 opencode.ai/auth에서 발급받을 수 있습니다.');
    } else {
      const ready = await this.service.isServerReady();
      if (ready) {
        this.setStatus('API 연결됨', '#4caf50');
      } else {
        this.setStatus('API 연결 실패', '#f44336');
        this.addSystemMessage('API 연결에 실패했습니다. API 키가 유효한지 확인하세요.');
      }
    }
    this.updateSendButton();
  }

  private async tryRestoreSettings(): Promise<void> {
    const stored = await this.service.loadStoredSettings();
    if (stored) {
      this.setStatus('설정 불러옴', '#4caf50');
      this.updateSendButton();
    }
  }

  private updateSendButton(): void {
    this.sendBtn.disabled = this.loading || !this.service.isConfigured;
    const settings = this.service.getSettings();
    this.cameraBtn.disabled = !settings || !isVisionModel(settings.modelId);
    this.cameraBtn.title = settings && !isVisionModel(settings.modelId)
      ? '화면 캡처는 비전 모델에서만 사용 가능'
      : '화면 캡처 첨부 (다음 요청 1회)';
    if (!this.service.isConfigured) {
      this.sendBtn.title = '먼저 AI 설정(⚙)을 완료하세요';
    } else {
      this.sendBtn.title = '';
    }
  }

  private async openSettings(): Promise<void> {
    const current = this.service.getSettings();
    const settings = await this.settingsDialog.show(current ?? undefined);
    if (settings) {
      try {
        this.setStatus('설정 중...');
        await this.service.configure(settings);
        this.setStatus('설정 완료', '#4caf50');
        this.addSystemMessage(`설정 완료: ${settings.provider === 'go' ? 'open code Go' : 'open code Zen'} / ${settings.modelId}`);
        this.updateSendButton();
      } catch (err) {
        this.setStatus('설정 실패', '#f44336');
        this.addSystemMessage(`설정 실패: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  private async send(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text || this.loading) return;

    this.inputEl.value = '';
    const images = this.pendingImages;
    this.pendingImages = [];
    this.cameraBtn.classList.remove('aic-camera-active');
    this.loading = true;
    this.sendBtn.disabled = true;
    this.sendBtn.textContent = '대기 중...';

    this.addMessage({ role: 'user', content: text, timestamp: Date.now() });
    this.addLoadingIndicator();

    try {
      const liveEls = new Map<ChatMessage, HTMLElement>();
      const rendered = new Set<ChatMessage>();
      let pendingMsg: ChatMessage | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const flush = (): void => {
        timer = null;
        const msg = pendingMsg;
        pendingMsg = null;
        if (!msg) return;
        const el = liveEls.get(msg);
        if (!el) return;
        const thinking = msg.content.startsWith(THINKING_PREFIX);
        const content = thinking
          ? el.querySelector('.aic-thinking-body')
          : el.querySelector('.aic-msg-content');
        if (content) {
          content.textContent = thinking ? msg.content.replace(THINKING_PREFIX, '') : msg.content;
        }
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      };
      const onUpdate = (msg: ChatMessage): void => {
        if (rendered.has(msg) || msg.role !== 'assistant' || !msg.content) return;
        if (!liveEls.has(msg)) {
          rendered.add(msg);
          liveEls.set(msg, this.addMessage(msg));
          this.removeLoadingIndicator();
        }
        pendingMsg = msg;
        if (!timer) timer = setTimeout(flush, 40);
      };

      const responses = await this.service.sendMessage(text, images, onUpdate);
      if (timer) {
        clearTimeout(timer);
        flush();
      }
      for (const msg of responses) {
        if (rendered.has(msg)) continue;
        if (msg.role === 'assistant' && msg.content) {
          this.addMessage(msg);
        }
      }
      for (const [msg, el] of liveEls) {
        if (!msg.content.startsWith(THINKING_PREFIX)) {
          const content = el.querySelector('.aic-msg-content') as HTMLElement | null;
          if (content) content.innerHTML = this.formatMarkdown(msg.content);
        }
      }
    } catch (err) {
      this.addMessage({
        role: 'assistant',
        content: `오류: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      });
    } finally {
      this.removeLoadingIndicator();
      this.loading = false;
      this.sendBtn.textContent = '전송';
      this.updateSendButton();
    }
  }

  private loadingEl: HTMLElement | null = null;

  private addLoadingIndicator(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'aic-message aic-msg-loading';
    const content = document.createElement('div');
    content.className = 'aic-msg-content';
    content.innerHTML = '<span class="aic-spinner"></span> AI가 생각 중...';
    el.appendChild(content);
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    this.loadingEl = el;
    return el;
  }

  private removeLoadingIndicator(): void {
    if (this.loadingEl) {
      this.loadingEl.remove();
      this.loadingEl = null;
    }
  }

  private addMessage(msg: ChatMessage): HTMLElement {
    const el = document.createElement('div');

    if (msg.role === 'user') {
      el.className = 'aic-message aic-msg-user';
      const content = document.createElement('div');
      content.className = 'aic-msg-content';
      content.textContent = msg.content;
      el.appendChild(content);
    } else if (msg.role === 'tool') {
      // Compact tool result
      el.className = 'aic-message aic-msg-tool';
      const content = document.createElement('div');
      content.className = 'aic-msg-content';
      content.textContent = msg.content;
      el.appendChild(content);
    } else if (msg.content.startsWith(THINKING_PREFIX)) {
      // AI thinking - collapsible
      el.className = 'aic-message aic-msg-thinking';
      const header = document.createElement('div');
      header.className = 'aic-thinking-header';
      header.textContent = '생각 과정';
      header.addEventListener('click', () => {
        const body = el.querySelector('.aic-thinking-body') as HTMLElement;
        if (body) body.style.display = body.style.display === 'none' ? '' : 'none';
      });
      el.appendChild(header);
      const body = document.createElement('div');
      body.className = 'aic-thinking-body';
      body.style.display = '';
      body.textContent = msg.content.replace(THINKING_PREFIX, '');
      el.appendChild(body);
    } else {
      // Final AI response
      el.className = 'aic-message aic-msg-assistant';
      const content = document.createElement('div');
      content.className = 'aic-msg-content aic-final';
      content.innerHTML = this.formatMarkdown(msg.content);
      el.appendChild(content);
    }

    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return el;
  }

  private formatMarkdown(text: string): string {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Tables: convert | separated lines to simple rows
    html = html.replace(/^\|(.+)\|$/gm, (_, cells: string) => {
      const tds = cells.split('|').map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    });
    // Wrap consecutive <tr> in <table>
    html = html.replace(/((?:<tr>.*?<\/tr>\s*)+)/g, '<table>$1</table>');
    // Newlines
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  private addSystemMessage(text: string): void {
    const el = document.createElement('div');
    el.className = 'aic-message aic-msg-system';
    const content = document.createElement('div');
    content.className = 'aic-msg-content';
    content.textContent = text;
    el.appendChild(content);
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    this.visible = true;
    this.container.classList.add('aic-open');
    this.toggleBtn.title = 'AI 패널 닫기';
    this.toggleBtn.style.display = 'none';
    this.checkServer();
  }

  hide(): void {
    this.visible = false;
    this.container.classList.remove('aic-open');
    this.toggleBtn.title = 'AI Assistant 열기';
    this.toggleBtn.style.display = '';
  }

  get isVisible(): boolean {
    return this.visible;
  }
}
