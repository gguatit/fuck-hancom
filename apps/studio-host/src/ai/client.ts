import type { ServerSession, ServerMessage, ProviderInfo } from './types';

const SERVER_BASE = 'http://127.0.0.1:4096';

export class AiClient {
  private baseUrl = SERVER_BASE;

  async healthCheck(): Promise<boolean> {
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(`${this.baseUrl}/global/health`);
        if (res.ok) {
          const data = await res.json();
          return data.healthy === true;
        }
      } catch {
        // server may still be starting up
      }
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    return false;
  }

  async createSession(title: string): Promise<ServerSession> {
    const res = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`세션 생성 실패: ${res.status}`);
    return res.json();
  }

  async sendMessage(
    sessionId: string,
    options: {
      parts: Array<{ type: string; text?: string; tool_call_id?: string; tool_result?: string }>;
      system?: string;
      tools?: Record<string, { description: string; parameters: Record<string, unknown> }>;
      model?: { providerID: string; modelID: string };
    },
  ): Promise<ServerMessage> {
    const body: Record<string, unknown> = {
      parts: options.parts,
    };
    if (options.system) body.system = options.system;
    if (options.tools) body.tools = options.tools;
    if (options.model) body.model = options.model;

    const res = await fetch(`${this.baseUrl}/session/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`메시지 전송 실패: ${res.status} ${text}`);
    }
    return res.json();
  }

  async getProviderList(): Promise<Array<{ id: string; name: string }>> {
    const res = await fetch(`${this.baseUrl}/provider`);
    if (!res.ok) throw new Error(`제공자 목록 조회 실패: ${res.status}`);
    const data = await res.json();
    const rawList = Array.isArray(data) ? data : (Array.isArray(data?.all) ? data.all : []);
    return rawList
      .filter((p: unknown) => p != null && typeof p === 'object')
      .map((p: Record<string, unknown>) => ({
        id: String(p.id ?? ''),
        name: String(p.name ?? p.id ?? ''),
      }));
  }

  async getConfigProviders(): Promise<ProviderInfo[]> {
    const res = await fetch(`${this.baseUrl}/config/providers`);
    if (!res.ok) throw new Error(`설정 제공자 조회 실패: ${res.status}`);
    const data = await res.json();
    console.log('[AiClient] /config/providers keys:', Object.keys(data));

    const result: ProviderInfo[] = [];
    const rawList = Array.isArray(data.providers) ? data.providers : (Array.isArray(data) ? data : []);
    const defaults = (data.default as Record<string, string>) ?? {};

    for (const item of rawList) {
      if (item == null || typeof item !== 'object') continue;
      const p = item as Record<string, unknown>;
      const entry: ProviderInfo = {
        id: String(p.id ?? ''),
        name: String(p.name ?? p.id ?? ''),
        models: [],
        defaultModel: defaults[String(p.id ?? '')] ?? undefined,
      };

      let modelList: unknown[] | undefined;
      if (Array.isArray(p.models)) modelList = p.models;
      else if (Array.isArray(p.modelList)) modelList = p.modelList;
      else if (Array.isArray(p.model_list)) modelList = p.model_list;
      else if (Array.isArray(p.model)) modelList = p.model;

      if (modelList) {
        for (const m of modelList) {
          if (m != null && typeof m === 'object') {
            const mo = m as Record<string, unknown>;
            entry.models.push({
              id: String(mo.id ?? ''),
              name: String(mo.name ?? mo.id ?? ''),
            });
          }
        }
      }

      console.log(`[AiClient] provider ${entry.id}: ${entry.models.length} models, default: ${entry.defaultModel ?? 'none'}`);
      result.push(entry);
    }

    return result;
  }

  async setAuth(providerId: string, apiKey: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/auth/${providerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'api', key: apiKey }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`인증 설정 실패: ${res.status} ${text}`);
    }
  }
}
