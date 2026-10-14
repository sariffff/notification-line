import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireUser, canEdit } from '@/lib/auth';
import { ContractForm } from '../../contract-form';

export const metadata: Metadata = { title: 'แก้ไขสัญญา' };

export default async function EditContractPage({ params }: PageProps<'/contracts/[id]/edit'>) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  if (!canEdit(profile.role)) redirect(`/contracts/${id}`);

  const [{ data: contract }, { data: recipients }, { data: people }] = await Promise.all([
    supabase.from('contracts').select('*').eq('id', id).maybeSingle(),
    supabase.from('contract_recipients').select('user_id').eq('contract_id', id),
    supabase.from('profiles').select('id, full_name, line_user_id').order('full_name'),
  ]);
  if (!contract) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">แก้ไขสัญญา</h1>
      <ContractForm
        contract={contract}
        recipientIds={(recipients ?? []).map((r) => r.user_id)}
        people={people ?? []}
      />
    </div>
  );
}
