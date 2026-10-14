import { cn } from '@/lib/utils';
import { daysLeftLabel, STATUS_LABEL, urgencyOf, type Urgency } from '@/lib/contracts';
import type { Tables } from '@/types/database';

const STYLES: Record<Urgency, string> = {
  expired: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  soon: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  inactive: 'bg-muted text-muted-foreground',
};

/** Badge วันคงเหลือ — มีข้อความกำกับเสมอ ไม่ใช้สีอย่างเดียว */
export function DaysBadge({
  daysLeft, status = 'active', className,
}: { daysLeft: number; status?: Tables<'contracts'>['status']; className?: string }) {
  const u = urgencyOf(daysLeft, status);
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        STYLES[u],
        className,
      )}
    >
      {u === 'inactive' ? STATUS_LABEL[status] : daysLeftLabel(daysLeft)}
    </span>
  );
}
