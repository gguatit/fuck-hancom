export interface AiSettings {
  provider: 'go' | 'zen';
  apiKey: string;
  modelId: string;
  reasoning?: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  timestamp: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface HwpToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfo[];
  defaultModel?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface ServerSession {
  id: string;
  title?: string;
}

export interface ServerMessage {
  info: { id: string; role: string };
  parts: ServerPart[];
}

export interface ServerPart {
  type: 'text' | 'tool_call' | 'tool_result';
  text?: string;
  tool_call?: {
    id: string;
    function: { name: string; arguments: string };
  };
  tool_use?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
}
