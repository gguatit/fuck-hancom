import type { AiSettings } from './types';

const ZEN_BASE = 'https://opencode.ai/zen/v1';
const GO_BASE = 'https://opencode.ai/zen/go/v1';
const STORE_KEY = 'ai_settings';
const STORE_PATH = 'ai-settings.json';

export class AiClient {
  private apiKey = '';
  private baseUrl = '';
  private settings: AiSettings | null = null;

  configure(settings: AiSettings): void {
    this.apiKey = settings.apiKey;
    this.baseUrl = settings.provider === 'go' ? GO_BASE : ZEN_BASE;
    this.settings = settings;
    this.saveSettings(settings);
  }

  async loadStoredSettings(): Promise<AiSettings | null> {
    try {
      const { load } = await import('@tauri-apps/plugin-store');
      const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
      const saved = await store.get<AiSettings>(STORE_KEY);
      if (saved?.apiKey) {
        this.configure(saved);
        return saved;
      }
    } catch {
      // store not available (browser mode)
    }
    return null;
  }

  private async saveSettings(settings: AiSettings): Promise<void> {
    try {
      const { load } = await import('@tauri-apps/plugin-store');
      const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
      await store.set(STORE_KEY, settings);
      await store.save();
    } catch {
      // store not available
    }
  }

  get configuredSettings(): AiSettings | null {
    return this.settings;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey || !this.baseUrl) return false;
    try {
      await this.invoke('ai_proxy_models', {
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
      });
      return true;
    } catch {
      return false;
    }
  }

  async chat(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.invoke('ai_proxy_request', {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      body,
    });
  }

  async fetchModels(): Promise<Array<{ id: string; name: string }>> {
    const data = await this.invoke<Record<string, unknown>>('ai_proxy_models', {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
    });
    if (Array.isArray(data.data)) {
      return data.data.map((m: Record<string, unknown>) => ({
        id: String(m.id ?? ''),
        name: String(m.id ?? ''),
      }));
    }
    return [];
  }

  private async invoke<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(command, args);
  }
}
