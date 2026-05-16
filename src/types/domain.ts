export type BackendKind = 'claude-agent-sdk' | 'custom-api' | 'local-llm';

export type ClaudeAgentSdkConfig = { kind: 'claude-agent-sdk' };

export type CustomApiConfig = {
  kind: 'custom-api';
  baseUrl: string;
  apiKey: string;
  model: string;
  format: 'openai' | 'anthropic';
};

export type LocalLlmConfig = {
  kind: 'local-llm';
  baseUrl: string;
  model: string;
  apiKey?: string;
};

export type BackendConfig = ClaudeAgentSdkConfig | CustomApiConfig | LocalLlmConfig;

export type TurnRole = 'user' | 'assistant';

export interface Turn {
  id: string;
  role: TurnRole;
  content: string;
  createdAt: number;
}

export type AnnotationStatus = 'open' | 'sent';

export interface CommentAnnotation {
  id: string;
  /** Normalised 0..1 coordinates inside the preview viewport. */
  x: number;
  y: number;
  text: string;
  status: AnnotationStatus;
  createdAt: number;
}

export interface DrawStroke {
  id: string;
  /** Normalised 0..1 points. */
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  createdAt: number;
}

export interface DrawAnnotation {
  id: string;
  note: string;
  strokes: DrawStroke[];
  status: AnnotationStatus;
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  /** Optional project notes shown in the studio sidebar — like Claude Design's design brief markdown. */
  notes?: string;
  turns: Turn[];
  currentHtml: string;
  sdkSessionId?: string;
  comments?: CommentAnnotation[];
  drawings?: DrawAnnotation[];
  createdAt: number;
  updatedAt: number;
}

export interface GenerateRequestBody {
  backend: BackendConfig;
  messages: Array<{ role: TurnRole; content: string }>;
  resumeSdkSessionId?: string;
  /** Optional project metadata for the system prompt. */
  projectTitle?: string;
  projectNotes?: string;
  /** The current HTML on disk for this project, included verbatim in the last user message so the model can refine it without losing state. */
  currentHtml?: string;
}

export type SSEEvent =
  | { type: 'delta'; text: string }
  | { type: 'session'; sdkSessionId: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export type Theme = 'light' | 'dark';
