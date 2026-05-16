import type { BackendKind } from '../../types/domain';

const KINDS: Array<{ id: BackendKind; label: string; description: string }> = [
  {
    id: 'claude-agent-sdk',
    label: 'Claude Agent SDK',
    description: 'Use the local Claude Code authentication — zero configuration.',
  },
  {
    id: 'custom-api',
    label: 'Custom API',
    description: 'OpenAI-compatible or Anthropic-compatible HTTPS endpoint.',
  },
  {
    id: 'local-llm',
    label: 'Local LLM',
    description: 'Ollama, LM Studio, vLLM, etc. running on this machine.',
  },
];

export interface BackendPickerProps {
  value: BackendKind;
  onChange: (next: BackendKind) => void;
}

export function BackendPicker({ value, onChange }: BackendPickerProps) {
  return (
    <fieldset className="grid gap-3" aria-label="Choose a backend">
      <legend className="sr-only">Backend</legend>
      {KINDS.map((k) => {
        const selected = value === k.id;
        return (
          <label
            key={k.id}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              selected ? 'border-coral bg-coral/5' : 'border-border bg-panel hover:border-coral'
            }`}
          >
            <input
              type="radio"
              name="backend"
              value={k.id}
              checked={selected}
              onChange={() => onChange(k.id)}
              className="mt-1 h-4 w-4 accent-coral"
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold">{k.label}</span>
              <span className="text-xs text-muted">{k.description}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
