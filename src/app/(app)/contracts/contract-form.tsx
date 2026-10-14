'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { saveContract } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet,
} from '@/components/ui/field';
import { DEFAULT_OFFSETS, OFFSET_CHOICES, type ActionState } from '@/lib/validations';
import { offsetLabel, RECURRENCE_LABEL } from '@/lib/contracts';
import type { Tables } from '@/types/database';

type Person = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'line_user_id'>;

type Props = {
  contract?: Tables<'contracts'>;
  recipientIds: string[];
  people: Person[];
};

const checkboxClass = 'size-4 shrink-0 accent-primary';
const choiceClass =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50';

export function ContractForm({ contract, recipientIds, people }: Props) {
  const action = saveContract.bind(null, contract?.id ?? null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  // ค่าเริ่มต้น: ค่าที่กรอกล่าสุด (กรณี error) > ค่าในสัญญา > ค่า default
  const v = (state.values ?? {}) as Record<string, string | string[] | undefined>;
  const str = (k: keyof Tables<'contracts'>) =>
    (v[k] as string | undefined) ?? (contract?.[k] == null ? '' : String(contract[k]));
  const offsets: number[] = v.reminder_offsets
    ? (v.reminder_offsets as string[]).map(Number)
    : contract?.reminder_offsets ?? DEFAULT_OFFSETS;
  const recipients: string[] = (v.recipients as string[] | undefined) ?? recipientIds;
  const recurrence = str('recurrence') || 'none';

  const err = (k: string) => state.fieldErrors?.[k]?.map((message) => ({ message }));
  const invalid = (k: string) => !!state.fieldErrors?.[k];

  return (
    <form key={state.ts} action={formAction} noValidate className="space-y-8">
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <FieldSet>
        <FieldLegend>ข้อมูลสัญญา</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={invalid('project_name')} className="sm:col-span-2">
            <FieldLabel htmlFor="project_name">ชื่อโครงการ <span className="text-destructive">*</span></FieldLabel>
            <Input id="project_name" name="project_name" required maxLength={200} className="h-11"
              defaultValue={str('project_name')} aria-invalid={invalid('project_name')} />
            <FieldError errors={err('project_name')} />
          </Field>
          <Field data-invalid={invalid('contract_no')}>
            <FieldLabel htmlFor="contract_no">เลขที่สัญญา</FieldLabel>
            <Input id="contract_no" name="contract_no" maxLength={100} className="h-11"
              defaultValue={str('contract_no')} aria-invalid={invalid('contract_no')} />
            <FieldError errors={err('contract_no')} />
          </Field>
          <Field data-invalid={invalid('client_name')}>
            <FieldLabel htmlFor="client_name">ลูกค้า / คู่สัญญา</FieldLabel>
            <Input id="client_name" name="client_name" maxLength={200} className="h-11"
              defaultValue={str('client_name')} aria-invalid={invalid('client_name')} />
            <FieldError errors={err('client_name')} />
          </Field>
          <Field data-invalid={invalid('start_date')}>
            <FieldLabel htmlFor="start_date">วันเริ่มสัญญา</FieldLabel>
            <Input id="start_date" name="start_date" type="date" className="h-11"
              defaultValue={str('start_date')} aria-invalid={invalid('start_date')} />
            <FieldError errors={err('start_date')} />
          </Field>
          <Field data-invalid={invalid('end_date')}>
            <FieldLabel htmlFor="end_date">วันสิ้นสุด / วันครบกำหนด <span className="text-destructive">*</span></FieldLabel>
            <Input id="end_date" name="end_date" type="date" required className="h-11"
              defaultValue={str('end_date')} aria-invalid={invalid('end_date')} />
            <FieldError errors={err('end_date')} />
          </Field>
          <Field data-invalid={invalid('value')}>
            <FieldLabel htmlFor="value">มูลค่าสัญญา (บาท)</FieldLabel>
            <Input id="value" name="value" inputMode="decimal" placeholder="เช่น 150,000" className="h-11"
              defaultValue={str('value')} aria-invalid={invalid('value')} />
            <FieldError errors={err('value')} />
          </Field>
          <Field data-invalid={invalid('note')} className="sm:col-span-2">
            <FieldLabel htmlFor="note">หมายเหตุ</FieldLabel>
            <Textarea id="note" name="note" rows={3} maxLength={2000}
              defaultValue={str('note')} aria-invalid={invalid('note')} />
            <FieldError errors={err('note')} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>การแจ้งเตือน</FieldLegend>
        <FieldGroup>
          <FieldSet data-invalid={invalid('recurrence')} className="gap-2">
            <FieldLegend variant="label">รูปแบบ</FieldLegend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['none', 'yearly'] as const).map((r) => (
                <label key={r} className={choiceClass}>
                  <input type="radio" name="recurrence" value={r} defaultChecked={recurrence === r} className={checkboxClass} />
                  <span>
                    {RECURRENCE_LABEL[r]}
                    <span className="block text-xs text-muted-foreground">
                      {r === 'none' ? 'แจ้งเตือนรอบเดียวก่อนวันสิ้นสุด' : 'แจ้งเตือนทุกปีในวันที่และเดือนเดียวกัน เช่น ต่ออายุประกัน'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError errors={err('recurrence')} />
          </FieldSet>

          <FieldSet data-invalid={invalid('reminder_offsets')} className="gap-2">
            <FieldLegend variant="label">แจ้งเตือนล่วงหน้า</FieldLegend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OFFSET_CHOICES.map((o) => (
                <label key={o} className={choiceClass}>
                  <input type="checkbox" name="reminder_offsets" value={o} defaultChecked={offsets.includes(o)} className={checkboxClass} />
                  {offsetLabel(o)}
                </label>
              ))}
            </div>
            <FieldError errors={err('reminder_offsets')} />
          </FieldSet>

          <FieldSet data-invalid={invalid('recipients')} className="gap-2">
            <FieldLegend variant="label">ผู้รับแจ้งเตือน <span className="text-destructive">*</span></FieldLegend>
            <FieldDescription>ระบบจะรวมทุกสัญญาที่ถึงรอบในวันเดียวกันเป็น 1 ข้อความต่อคน</FieldDescription>
            <div className="grid gap-2 sm:grid-cols-2">
              {people.map((p) => (
                <label key={p.id} className={choiceClass}>
                  <input type="checkbox" name="recipients" value={p.id} defaultChecked={recipients.includes(p.id)} className={checkboxClass} />
                  <span className="flex-1 truncate">{p.full_name}</span>
                  {!p.line_user_id && (
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      ยังไม่ผูก LINE
                    </span>
                  )}
                </label>
              ))}
            </div>
            <FieldError errors={err('recipients')} />
          </FieldSet>
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" asChild className="h-11">
          <Link href={contract ? `/contracts/${contract.id}` : '/contracts'}>ยกเลิก</Link>
        </Button>
        <Button type="submit" disabled={pending} className="h-11 sm:min-w-32">
          {pending ? 'กำลังบันทึก…' : contract ? 'บันทึกการแก้ไข' : 'บันทึกสัญญา'}
        </Button>
      </div>
    </form>
  );
}
