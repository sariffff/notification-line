import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser, canEdit } from '@/lib/auth';
import { ContractForm } from '../contract-form';

export const metadata: Metadata = { title: 'เพิ่มสัญญา' };

export default async function NewContractPage() {
  const { supabase, profile } = await requireUser();
  if (!canEdit(profile.role)) redirect('/contracts');

  const { data: people } = await supabase.from('profiles').select('id, full_name, line_user_id').order('full_name');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">เพิ่มสัญญา</h1>
      <ContractForm recipientIds={[profile.id]} people={people ?? []} />
    </div>
  );
}
