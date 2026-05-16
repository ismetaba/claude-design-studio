import type { BackendConfig, TurnRole } from '../../src/types/domain';

export interface AdapterMessage {
  role: TurnRole;
  content: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface StreamOptions {
  signal: AbortSignal;
  onSessionId?: (id: string) => void;
  resumeSdkSessionId?: string;
  /** Optional project title — woven into the system prompt for coherence across turns. */
  projectTitle?: string;
  /** Optional free-form project notes — also woven into the system prompt. */
  projectNotes?: string;
  /** When set, the last user message is wrapped with this HTML as "current state" so the model can refine without losing context. */
  currentHtml?: string;
}

export interface LLMBackend {
  readonly kind: BackendConfig['kind'];
  streamCompletion(messages: AdapterMessage[], options: StreamOptions): AsyncIterable<string>;
  testConnection(signal?: AbortSignal): Promise<ConnectionTestResult>;
}

export class BackendUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}
