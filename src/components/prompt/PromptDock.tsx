import { PromptInput } from './PromptInput';

export interface PromptDockProps {
  onSubmit?: (text: string) => void;
  onStop?: () => void;
}

/**
 * The dock is purposefully minimal: a single prompt input.
 * Each project is a self-contained creation — no chat thread, no turn history surfaced in the UI.
 * Refinement turns are still sent to the model as context, but they are never displayed.
 */
export function PromptDock({ onSubmit, onStop }: PromptDockProps) {
  return (
    <div className="w-full">
      <PromptInput onSubmit={onSubmit} onStop={onStop} />
    </div>
  );
}
