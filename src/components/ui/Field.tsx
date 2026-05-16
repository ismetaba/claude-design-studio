import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fid = id ?? autoId;
  const describedBy = error ? `${fid}-error` : hint ? `${fid}-hint` : undefined;
  return (
    <label htmlFor={fid} className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-fg">{label}</span>
      <input
        ref={ref}
        id={fid}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-9 rounded-md border bg-bg px-3 text-sm transition-colors',
          error ? 'border-red-500' : 'border-border focus:border-coral',
          className,
        )}
        {...rest}
      />
      {hint && !error ? (
        <span id={`${fid}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${fid}-error`} className="text-xs text-red-500">
          {error}
        </span>
      ) : null}
    </label>
  );
});
