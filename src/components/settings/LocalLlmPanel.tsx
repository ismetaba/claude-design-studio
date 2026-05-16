import { Field } from '../ui/Field';
import type { LocalLlmConfig } from '../../types/domain';
import { validateBackendConfig } from '../../lib/validate';

export interface LocalLlmPanelProps {
  value: LocalLlmConfig;
  onChange: (next: LocalLlmConfig) => void;
}

export function LocalLlmPanel({ value, onChange }: LocalLlmPanelProps) {
  const { errors } = validateBackendConfig(value);
  return (
    <div className="grid gap-4 rounded-md border border-border bg-panel p-4">
      <Field
        label="Base URL"
        placeholder="http://localhost:11434"
        value={value.baseUrl}
        onChange={(e) => onChange({ ...value, baseUrl: e.target.value })}
        hint="Ollama default port is 11434; LM Studio defaults to 1234."
        error={errors.baseUrl}
      />
      <Field
        label="Model"
        placeholder="llama3"
        value={value.model}
        onChange={(e) => onChange({ ...value, model: e.target.value })}
        error={errors.model}
      />
      <Field
        label="API key (optional)"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value.apiKey ?? ''}
        onChange={(e) => onChange({ ...value, apiKey: e.target.value || undefined })}
      />
    </div>
  );
}
