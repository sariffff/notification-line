'use client';

import { useActionState } from 'react';
import { signIn } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { ActionState } from '@/lib/validations';

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, {});
  const err = (k: string) => state.fieldErrors?.[k]?.map((message) => ({ message }));

  return (
    <Card>
      <CardContent>
        <form action={action} noValidate>
          <FieldGroup>
            {state.message && (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!err('email')}>
              <FieldLabel htmlFor="email">อีเมล</FieldLabel>
              <Input
                id="email" name="email" type="email" autoComplete="email" required className="h-11"
                defaultValue={String(state.values?.email ?? '')} aria-invalid={!!err('email')}
              />
              <FieldError errors={err('email')} />
            </Field>
            <Field data-invalid={!!err('password')}>
              <FieldLabel htmlFor="password">รหัสผ่าน</FieldLabel>
              <Input
                id="password" name="password" type="password" autoComplete="current-password" required
                className="h-11" aria-invalid={!!err('password')}
              />
              <FieldError errors={err('password')} />
            </Field>
            <Button type="submit" className="h-11 w-full" disabled={pending}>
              {pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
