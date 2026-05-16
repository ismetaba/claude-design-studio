import type { BackendConfig } from '../types/domain';

export function isAbsoluteHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface ConfigValidation {
  ok: boolean;
  errors: Partial<Record<'baseUrl' | 'apiKey' | 'model' | 'format', string>>;
}

export function validateBackendConfig(config: BackendConfig): ConfigValidation {
  const errors: ConfigValidation['errors'] = {};
  switch (config.kind) {
    case 'claude-agent-sdk':
      break;
    case 'custom-api':
      if (!isAbsoluteHttpUrl(config.baseUrl)) errors.baseUrl = 'Enter a full http(s) URL.';
      if (!config.apiKey.trim()) errors.apiKey = 'API key is required.';
      if (!config.model.trim()) errors.model = 'Model name is required.';
      if (config.format !== 'openai' && config.format !== 'anthropic')
        errors.format = 'Select a streaming format.';
      break;
    case 'local-llm':
      if (!isAbsoluteHttpUrl(config.baseUrl)) errors.baseUrl = 'Enter a full http(s) URL.';
      if (!config.model.trim()) errors.model = 'Model name is required.';
      break;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
