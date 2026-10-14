'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { deleteContract } from '../actions';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function DeleteContractButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  const onConfirm = () =>
    startTransition(async () => {
      const res = await deleteContract(id);   // สำเร็จ = redirect, ไม่สำเร็จ = คืนข้อความ
      if (res?.message) toast.error(res.message);
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={pending}>ลบสัญญา</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบสัญญา &ldquo;{name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            ข้อมูลสัญญา ผู้รับแจ้งเตือน และประวัติการแจ้งเตือนทั้งหมดจะถูกลบถาวร กู้คืนไม่ได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>ลบถาวร</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
