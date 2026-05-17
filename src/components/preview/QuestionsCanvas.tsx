import { useEffect, useMemo, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useStreamingGenerate } from '../../hooks/useStreamingGenerate';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';
import type { QuestionGroup } from '../../lib/parseAssistantResponse';

export interface QuestionsCanvasProps {
  /** Stable id from the assistant turn — used to scope local state. */
  turnId: string;
  title: string;
  intro: string;
  groups: QuestionGroup[];
}

interface Answer {
  value: string;
  freeText?: string;
}

function answerLabel(group: QuestionGroup, answer: Answer | undefined): string {
  if (!answer) return '— skipped —';
  if (answer.value === 'other') return answer.freeText?.trim() || '— skipped —';
  const opt = group.options.find((o) => o.value === answer.value);
  return opt?.label ?? answer.value;
}

export function QuestionsCanvas({ turnId, title, intro, groups }: QuestionsCanvasProps) {
  const appendUserTurn = useDesignStore((s) => s.appendUserTurn);
  const isStreaming = useDesignStore((s) => s.isStreaming);
  const { start } = useStreamingGenerate();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitted(false);
    setAnswers({});
  }, [turnId]);

  const pick = (groupId: string, value: string, freeText?: string) => {
    setAnswers((prev) => ({ ...prev, [groupId]: { value, freeText } }));
  };

  const send = async () => {
    if (submitted || isStreaming) return;
    const lines: string[] = ['Here are my answers:', ''];
    for (const g of groups) {
      lines.push(`- **${g.label}** ${answerLabel(g, answers[g.id])}`);
    }
    lines.push('', 'Use these to ship the design now.');
    appendUserTurn(lines.join('\n'));
    setSubmitted(true);
    await start();
  };

  const skipAll = async () => {
    if (submitted || isStreaming) return;
    appendUserTurn('Decide everything for me — surprise me with a strong opinion.');
    setSubmitted(true);
    await start();
  };

  const answered = useMemo(
    () => groups.filter((g) => answers[g.id]?.value).length,
    [groups, answers],
  );

  return (
    <div className="flex h-full w-full items-start justify-center overflow-auto p-3">
      <div className="my-auto w-full max-w-2xl rounded-3xl border border-border bg-bg-elev/70 px-6 py-7 shadow-lift">
        <div className="mb-5 flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="sparkle" size={16} />
          </span>
          <div>
            <h2 className="font-serif text-[22px] font-medium tracking-tight text-fg-strong">
              {title}
            </h2>
            {intro && <p className="mt-1 text-[12px] leading-snug text-muted">{intro}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <fieldset key={g.id} className="flex flex-col gap-2">
              <legend className="text-[13px] font-semibold text-fg-strong">{g.label}</legend>
              {g.hint && <p className="-mt-1 text-[11px] text-muted">{g.hint}</p>}
              <div className="flex flex-wrap gap-1.5">
                {g.options.map((opt) => {
                  const active = answers[g.id]?.value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => pick(g.id, opt.value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-[12px] transition-colors',
                        active
                          ? 'border-accent bg-accent text-white'
                          : 'border-border bg-panel text-fg/85 hover:border-accent/50 hover:bg-hover',
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                {g.allowFreeText && (
                  <FreeTextChip
                    active={answers[g.id]?.value === 'other'}
                    value={answers[g.id]?.value === 'other' ? answers[g.id]?.freeText ?? '' : ''}
                    onChange={(text) => pick(g.id, 'other', text)}
                  />
                )}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => void skipAll()}
            disabled={isStreaming || submitted}
            className="rounded-md px-2 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-fg disabled:opacity-50"
          >
            Decide for me
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted">
              {answered}/{groups.length} answered
            </span>
            <button
              type="button"
              onClick={() => void send()}
              disabled={isStreaming || submitted}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              <Icon name="send" size={12} />
              {submitted ? 'Sent' : 'Send answers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FreeTextChip({
  active,
  value,
  onChange,
}: {
  active: boolean;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => active || onChange('')}
      placeholder={active ? 'Type…' : 'Other…'}
      className={cn(
        'min-w-[110px] rounded-full border px-3 py-1.5 text-[12px] transition-colors focus:outline-none',
        active
          ? 'border-accent bg-panel text-fg-strong'
          : 'border-border bg-panel text-muted placeholder:text-muted hover:border-accent/50',
      )}
    />
  );
}
