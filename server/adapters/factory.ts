import type { BackendConfig } from '../../src/types/domain';
import { ClaudeAgentSdkBackend } from './claudeAgentSdk';
import { CustomApiBackend } from './customApi';
import { LocalLlmBackend } from './localLlm';
import type { LLMBackend } from './types';
import { BackendUnavailableError } from './types';

export function resolveBackend(config: BackendConfig): LLMBackend {
  switch (config.kind) {
    case 'claude-agent-sdk':
      return new ClaudeAgentSdkBackend();
    case 'custom-api':
      return new CustomApiBackend(config);
    case 'local-llm':
      return new LocalLlmBackend(config);
    default: {
      const _exhaustive: never = config;
      throw new BackendUnavailableError(`Unknown backend kind: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
