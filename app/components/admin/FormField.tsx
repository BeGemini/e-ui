'use client';

import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OptionItem } from './admin-client';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string[];
  hint?: ReactNode;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}

export function FormField({ id, label, required, error, hint, children }: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error?.length ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true" className="text-destructive">*</span>}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error?.length), 'aria-describedby': describedBy })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error?.length ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

interface OptionSelectProps {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: OptionItem[];
  placeholder: string;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export function OptionSelect({ id, value, onChange, options, placeholder, disabled, ...aria }: OptionSelectProps) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(v) => onChange((v as string | null) ?? null)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full" {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
