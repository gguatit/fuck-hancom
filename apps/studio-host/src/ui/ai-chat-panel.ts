import { AiService } from '@/ai/service';
import type { ChatMessage } from '@/ai/types';
import { AiSettingsDialog } from './ai-settings-dialog';
import { AiClient } from '@/ai/client';
import type { WasmBridge } from '@/core/wasm-bridge';
import type { EventBus } from '@/core/event-bus';

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
  private statusEl!: HTMLElement;
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
    this.settingsBtn.innerHTML = '&#9881;';
    header.appendChild(this.settingsBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'aic-icon-btn aic-close-btn';
    closeBtn.title = 'AI 패널 닫기';
    closeBtn.innerHTML = '&#10005;';
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

    this.sendBtn = document.createElement('button');
    this.sendBtn.className = 'aic-btn aic-btn-primary';
    this.sendBtn.textContent = '전송';
    this.sendBtn.disabled = true;
    btnRow.appendChild(this.sendBtn);

    inputArea.appendChild(btnRow);
    this.panelInner.appendChild(inputArea);

    closeBtn.addEventListener('click', () => this.hide());
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.sendBtn.addEventListener('click', () => this.send());

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.send();
      }
    });

    this.checkServer();
  }

  private async checkServer(): Promise<void> {
    if (!this.service.isConfigured) {
      this.statusEl.textContent = '⚙ 설정 필요';
      this.statusEl.style.color = '#ff9800';
      this.addSystemMessage('AI Assistant를 사용하려면 ⚙ 버튼을 눌러 opencode Go 또는 Zen API 키를 입력하세요.\nAPI 키는 opencode.ai/auth에서 발급받을 수 있습니다.');
    } else {
      const ready = await this.service.isServerReady();
      if (ready) {
        this.statusEl.textContent = '🟢 API 연결됨';
        this.statusEl.style.color = '#4caf50';
      } else {
        this.statusEl.textContent = '🔴 API 연결 실패';
        this.statusEl.style.color = '#f44336';
        this.addSystemMessage('API 연결에 실패했습니다. API 키가 유효한지 확인하세요.');
      }
    }
    this.updateSendButton();
  }

  private async tryRestoreSettings(): Promise<void> {
    const stored = await this.service.loadStoredSettings();
    if (stored) {
      this.statusEl.textContent = '🟢 설정 불러옴';
      this.statusEl.style.color = '#4caf50';
      this.updateSendButton();
    }
  }

  private updateSendButton(): void {
    this.sendBtn.disabled = this.loading || !this.service.isConfigured;
    if (!this.service.isConfigured) {
      this.sendBtn.title = '먼저 AI 설정(⚙)을 완료하세요';
    } else {
      this.sendBtn.title = '';
    }
  }

  private async openSettings(): Promise<void> {
    const settings = await this.settingsDialog.show();
    if (settings) {
      try {
        this.statusEl.textContent = '⏳ 설정 중...';
        this.statusEl.style.color = '';
        await this.service.configure(settings);
        this.statusEl.textContent = '🟢 설정 완료';
        this.statusEl.style.color = '#4caf50';
        this.addSystemMessage(`설정 완료: ${settings.provider === 'go' ? 'open code Go' : 'open code Zen'} / ${settings.modelId}`);
        this.updateSendButton();
      } catch (err) {
        this.statusEl.textContent = '🔴 설정 실패';
        this.statusEl.style.color = '#f44336';
        this.addSystemMessage(`설정 실패: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  private async send(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text || this.loading) return;

    this.inputEl.value = '';
    this.loading = true;
    this.sendBtn.disabled = true;
    this.sendBtn.textContent = '⏳ 대기 중...';

    this.addMessage({ role: 'user', content: text, timestamp: Date.now() });
    const loadingEl = this.addLoadingIndicator();

    try {
      const responses = await this.service.sendMessage(text);
      for (const msg of responses) {
        if (msg.role === 'assistant' && msg.content) {
          this.addMessage(msg);
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

  private addMessage(msg: ChatMessage): void {
    const el = document.createElement('div');
    el.className = `aic-message aic-msg-${msg.role}`;

    const roleLabel = document.createElement('div');
    roleLabel.className = 'aic-msg-role';
    roleLabel.textContent = msg.role === 'user' ? '나' : 'AI';
    el.appendChild(roleLabel);

    const content = document.createElement('div');
    content.className = 'aic-msg-content';
    content.textContent = msg.content;
    el.appendChild(content);

    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
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
