'use client';

import { useState } from 'react';
import { z } from 'zod';
import { adminFetch, toFieldErrors, type FieldErrors } from './admin-client';

/**
 * Client-side validation with the shared zod schema, then POST to an admin endpoint.
 * Returns true on 201.
 */
export function useCreateSubmit(schema: z.ZodType, path: string) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (payload: Record<string, unknown>): Promise<boolean> => {
    setFormError('');
    const check = schema.safeParse(payload);
    if (!check.success) {
      setFieldErrors(z.flattenError(check.error).fieldErrors as FieldErrors);
      return false;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const res = await adminFetch<{ error?: string; field?: string; fieldErrors?: FieldErrors }>(path, {
        method: 'POST',
        body: payload,
      });
      if (res.status === 201) return true;
      const errors = toFieldErrors(res.data);
      setFieldErrors(errors);
      if (Object.keys(errors).length === 0) setFormError(res.data.error ?? 'Request failed');
      return false;
    } catch {
      setFormError('Network error. Please retry.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { fieldErrors, formError, saving, submit };
}
