import { Field } from '../ui/Field';
import type { CustomApiConfig } from '../../types/domain';
import { validateBackendConfig } from '../../lib/validate';

export interface CustomApiPanelProps {
  value: CustomApiConfig;
  onChange: (next: CustomApiConfig) => void;
}

export function CustomApiPanel({ value, onChange }: CustomApiPanelProps) {
  const { errors } = validateBackendConfig(value);
  return (
    <div className="grid gap-4 rounded-md border border-border bg-panel p-4">
      <Field
        label="Base URL"
        placeholder="https://api.openai.com/v1"
        value={value.baseUrl}
        onChange={(e) => onChange({ ...value, baseUrl: e.target.value })}
        hint="The HTTPS base of the OpenAI-compatible or Anthropic-compatible endpoint."
        error={errors.baseUrl}
      />
      <Field
        label="API key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value.apiKey}
        onChange={(e) => onChange({ ...value, apiKey: e.target.value })}
        error={errors.apiKey}
      />
      <Field
        label="Model"
        placeholder="gpt-4o-mini"
        value={value.model}
        onChange={(e) => onChange({ ...value, model: e.target.value })}
        error={errors.model}
      />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Streaming format</span>
        <select
          value={value.format}
          onChange={(e) =>
            onChange({ ...value, format: e.target.value === 'anthropic' ? 'anthropic' : 'openai' })
          }
          className="h-9 rounded-md border border-border bg-bg px-3 text-sm"
        >
          <option value="openai">OpenAI (chat/completions)</option>
          <option value="anthropic">Anthropic (v1/messages)</option>
        </select>
      </label>
    </div>
  );
}
