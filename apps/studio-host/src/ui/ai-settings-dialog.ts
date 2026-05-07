import type { AiSettings } from '@/ai/types';

const HARDCODED_MODELS: Record<string, Array<{ id: string; name: string }>> = {
  opencode: [
    { id: 'gpt-5.5', name: 'GPT 5.5' },
    { id: 'gpt-5.4', name: 'GPT 5.4' },
    { id: 'gpt-5.4-mini', name: 'GPT 5.4 Mini' },
    { id: 'gpt-5.4-nano', name: 'GPT 5.4 Nano' },
    { id: 'gpt-5.3-codex', name: 'GPT 5.3 Codex' },
    { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro' },
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
    { id: 'qwen3.6-plus', name: 'Qwen 3.6 Plus' },
    { id: 'qwen3.5-plus', name: 'Qwen 3.5 Plus' },
    { id: 'minimax-m2.7', name: 'MiniMax M2.7' },
    { id: 'minimax-m2.5', name: 'MiniMax M2.5 Free' },
    { id: 'glm-5.1', name: 'GLM 5.1' },
    { id: 'glm-5', name: 'GLM 5' },
    { id: 'kimi-k2.5', name: 'Kimi K2.5' },
    { id: 'kimi-k2.6', name: 'Kimi K2.6' },
    { id: 'big-pickle', name: 'Big Pickle (Free)' },
    { id: 'nemotron-3-super-free', name: 'Nemotron 3 Super (Free)' },
  ],
  'opencode-go': [
    { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
    { id: 'qwen3.6-plus', name: 'Qwen 3.6 Plus' },
    { id: 'qwen3.5-plus', name: 'Qwen 3.5 Plus' },
    { id: 'glm-5.1', name: 'GLM 5.1' },
    { id: 'glm-5', name: 'GLM 5' },
    { id: 'kimi-k2.6', name: 'Kimi K2.6' },
    { id: 'kimi-k2.5', name: 'Kimi K2.5' },
    { id: 'mimo-v2.5', name: 'MiMo V2.5' },
    { id: 'mimo-v2.5-pro', name: 'MiMo V2.5 Pro' },
    { id: 'minimax-m2.7', name: 'MiniMax M2.7' },
    { id: 'minimax-m2.5', name: 'MiniMax M2.5' },
  ],
};

export class AiSettingsDialog {
  private overlay: HTMLElement;
  private dialog: HTMLElement;
  private resolve: ((settings: AiSettings | null) => void) | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.style.display = 'none';

    this.dialog = document.createElement('div');
    this.dialog.className = 'dialog-wrap aic-dialog';

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.resolve?.(null);
        this.hide();
      }
    });
  }

  async show(): Promise<AiSettings | null> {
    this.overlay.style.display = '';
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.buildContent();
    });
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  private async buildContent(): Promise<void> {
    this.dialog.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'dialog-title';
    title.textContent = 'AI Assistant 설정';
    this.dialog.appendChild(title);

    const body = document.createElement('div');
    body.className = 'dialog-body aic-settings-body';
    this.dialog.appendChild(body);

    const desc = document.createElement('p');
    desc.className = 'aic-desc';
    desc.textContent = 'open code Go ($10/월) 또는 Zen (종량제) API 키를 입력하고 모델을 선택하세요. API 키는 opencode.ai/auth에서 발급받을 수 있습니다.';
    body.appendChild(desc);

    const providerRow = document.createElement('div');
    providerRow.className = 'aic-setting-row';
    body.appendChild(providerRow);

    const providerLabel = document.createElement('label');
    providerLabel.textContent = '제공자:';
    providerRow.appendChild(providerLabel);

    const providerSelect = document.createElement('select');
    providerSelect.className = 'aic-select';
    const goOpt = document.createElement('option');
    goOpt.value = 'go';
    goOpt.textContent = 'open code Go ($10/월)';
    const zenOpt = document.createElement('option');
    zenOpt.value = 'zen';
    zenOpt.textContent = 'open code Zen (종량제)';
    providerSelect.appendChild(goOpt);
    providerSelect.appendChild(zenOpt);
    providerRow.appendChild(providerSelect);

    const keyRow = document.createElement('div');
    keyRow.className = 'aic-setting-row';
    body.appendChild(keyRow);

    const keyLabel = document.createElement('label');
    keyLabel.textContent = 'API 키:';
    keyRow.appendChild(keyLabel);

    const keyInput = document.createElement('input');
    keyInput.type = 'password';
    keyInput.className = 'aic-input';
    keyInput.placeholder = 'sk-... 또는 oc-... 형식의 API 키';
    keyRow.appendChild(keyInput);

    const modelRow = document.createElement('div');
    modelRow.className = 'aic-setting-row';
    body.appendChild(modelRow);

    const modelLabel = document.createElement('label');
    modelLabel.textContent = '모델:';
    modelRow.appendChild(modelLabel);

    const modelSelect = document.createElement('select');
    modelSelect.className = 'aic-select';
    modelSelect.innerHTML = '<option value="">제공자와 API 키 입력 후 모델 로드를 누르세요</option>';
    modelRow.appendChild(modelSelect);

    const loadModelsBtn = document.createElement('button');
    loadModelsBtn.className = 'aic-btn aic-btn-small';
    loadModelsBtn.textContent = '모델 로드';
    modelRow.appendChild(loadModelsBtn);

    const reasoningRow = document.createElement('div');
    reasoningRow.className = 'aic-setting-row';
    body.appendChild(reasoningRow);

    const reasoningLabel = document.createElement('label');
    reasoningLabel.textContent = '추론:';
    reasoningRow.appendChild(reasoningLabel);

    const reasoningSelect = document.createElement('select');
    reasoningSelect.className = 'aic-select';
    for (const [val, label] of [['medium', '보통'], ['high', '높음'], ['xhigh', '최고'], ['low', '낮음'], ['off', '끔']]) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      reasoningSelect.appendChild(opt);
    }
    reasoningRow.appendChild(reasoningSelect);

    const statusEl = document.createElement('div');
    statusEl.className = 'aic-status';
    body.appendChild(statusEl);

    loadModelsBtn.addEventListener('click', async () => {
      const apiKey = keyInput.value.trim();
      if (!apiKey) {
        statusEl.textContent = 'API 키를 먼저 입력하세요.';
        statusEl.className = 'aic-status aic-status-error';
        return;
      }

      const provider = providerSelect.value as 'go' | 'zen';
      statusEl.textContent = 'API 확인 및 모델 로딩 중...';
      statusEl.className = 'aic-status aic-status-loading';

      try {
        const baseUrl = provider === 'go'
          ? 'https://opencode.ai/zen/go/v1'
          : 'https://opencode.ai/zen/v1';

        // Try to fetch models dynamically via Tauri proxy
        let models: Array<{ id: string; name: string }> = [];
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const data = await invoke<Record<string, unknown>>('ai_proxy_models', {
            baseUrl,
            apiKey,
          });
          if (Array.isArray((data as Record<string, unknown>).data)) {
            models = ((data as Record<string, unknown>).data as Array<Record<string, unknown>>).map((m: Record<string, unknown>) => ({
              id: String(m.id ?? ''),
              name: String(m.id ?? ''),
            }));
          }
        } catch {
          // fallback to hardcoded
        }

        // Fallback to hardcoded models
        if (models.length === 0) {
          const providerId = provider === 'go' ? 'opencode-go' : 'opencode';
          models = HARDCODED_MODELS[providerId] ?? [];
        }

        if (models.length === 0) {
          statusEl.textContent = '사용 가능한 모델을 찾을 수 없습니다.';
          statusEl.className = 'aic-status aic-status-error';
          return;
        }

        modelSelect.innerHTML = '';
        for (const m of models) {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = m.name;
          modelSelect.appendChild(opt);
        }

        statusEl.textContent = `✅ ${models.length}개 모델 로드 완료`;
        statusEl.className = 'aic-status aic-status-ok';
      } catch (err) {
        statusEl.textContent = `실패: ${err instanceof Error ? err.message : String(err)}`;
        statusEl.className = 'aic-status aic-status-error';
      }
    });

    const footer = document.createElement('div');
    footer.className = 'dialog-footer';
    this.dialog.appendChild(footer);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'aic-btn';
    cancelBtn.textContent = '취소';
    footer.appendChild(cancelBtn);

    const okBtn = document.createElement('button');
    okBtn.className = 'aic-btn aic-btn-primary';
    okBtn.textContent = '설정 저장';
    footer.appendChild(okBtn);

    cancelBtn.addEventListener('click', () => {
      this.resolve?.(null);
      this.hide();
    });

    okBtn.addEventListener('click', () => {
      const provider = providerSelect.value as 'go' | 'zen';
      const apiKey = keyInput.value.trim();
      const modelId = modelSelect.value;

      if (!apiKey) {
        statusEl.textContent = 'API 키를 입력하세요.';
        statusEl.className = 'aic-status aic-status-error';
        return;
      }
      if (!modelId) {
        statusEl.textContent = '모델을 선택하세요. (모델 로드 버튼 클릭)';
        statusEl.className = 'aic-status aic-status-error';
        return;
      }

      this.resolve?.({ provider, apiKey, modelId, reasoning: reasoningSelect.value as AiSettings['reasoning'] });
      this.hide();
    });
  }
}
