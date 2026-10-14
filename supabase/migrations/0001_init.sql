-- ========== profiles ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin','staff','viewer')),
  line_user_id text unique,                     -- เขียนได้เฉพาะ service role (webhook)
  created_at timestamptz not null default now()
);

-- สร้าง profile อัตโนมัติเมื่อมี user ใหม่
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== รหัสผูก LINE (แยกตาราง ไม่ให้ใครอ่านได้นอกจาก service role) ==========
create table public.line_link_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null
);

-- ========== contracts ==========
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  contract_no text,
  client_name text,
  start_date date,
  end_date date not null,                       -- วันหมดสัญญา / วันครบรอบ
  recurrence text not null default 'none' check (recurrence in ('none','yearly')),
  reminder_offsets int[] not null default '{30,7,1,0}'
    check (cardinality(reminder_offsets) between 1 and 10 and 0 <= all(reminder_offsets)),
  value numeric(14,2),
  status text not null default 'active' check (status in ('active','renewed','closed')),
  note text,
  file_path text,                               -- path ใน Supabase Storage
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or start_date <= end_date)
);
create index contracts_end_date_idx on public.contracts (end_date) where status = 'active';

-- ========== ผู้รับแจ้งเตือนของแต่ละสัญญา ==========
create table public.contract_recipients (
  contract_id uuid references public.contracts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (contract_id, user_id)
);
create index contract_recipients_user_idx on public.contract_recipients (user_id);

-- ========== log การแจ้งเตือน (กันส่งซ้ำ + ประวัติ) ==========
create table public.notification_logs (
  id bigint generated always as identity primary key,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  due_date date not null,          -- วันครบกำหนดของรอบนั้น (สำคัญกับรายการรายปี)
  offset_days int not null,        -- 30 / 7 / 1 / 0
  channel text not null default 'line',
  status text not null check (status in ('pending','sent','failed','skipped')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (contract_id, user_id, due_date, offset_days, channel)
);
create index notification_logs_due_idx on public.notification_logs (due_date);

-- ========== ประวัติการรัน cron (ไว้ดูว่า cron ยังทำงานอยู่) ==========
create table public.cron_runs (
  id bigint generated always as identity primary key,
  run_date date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  stats jsonb,
  error text
);

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.line_link_codes enable row level security;   -- ไม่มี policy = เข้าถึงได้เฉพาะ service role
alter table public.contracts enable row level security;
alter table public.contract_recipients enable row level security;
alter table public.notification_logs enable row level security;
alter table public.cron_runs enable row level security;

create function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- profiles: ผู้ใช้แก้ได้แค่ full_name ของตัวเอง, admin แก้ role ได้
revoke update on public.profiles from anon, authenticated;
grant update (full_name, role) on public.profiles to authenticated;

create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select public.my_role()));   -- เปลี่ยน role ตัวเองไม่ได้
create policy "admin update profiles" on public.profiles for update to authenticated
  using ((select public.my_role()) = 'admin');

-- contracts
create policy "read contracts" on public.contracts for select to authenticated using (true);
create policy "staff write contracts" on public.contracts for all to authenticated
  using ((select public.my_role()) in ('admin','staff'))
  with check ((select public.my_role()) in ('admin','staff'));

-- recipients
create policy "read recipients" on public.contract_recipients for select to authenticated using (true);
create policy "staff write recipients" on public.contract_recipients for all to authenticated
  using ((select public.my_role()) in ('admin','staff'))
  with check ((select public.my_role()) in ('admin','staff'));

-- logs: อ่านได้อย่างเดียว (เขียนโดย service role ใน cron)
create policy "read logs" on public.notification_logs for select to authenticated using (true);

-- cron_runs: admin อ่านได้
create policy "admin read cron runs" on public.cron_runs for select to authenticated
  using ((select public.my_role()) = 'admin');

-- updated_at
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger contracts_touch before update on public.contracts
  for each row execute function public.touch_updated_at();

-- ========== Storage: bucket ไฟล์สัญญา (private, PDF ≤ 20 MB) ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contracts', 'contracts', false, 20971520, array['application/pdf']);

create policy "read contract files" on storage.objects for select to authenticated
  using (bucket_id = 'contracts');
create policy "staff upload contract files" on storage.objects for insert to authenticated
  with check (bucket_id = 'contracts' and (select public.my_role()) in ('admin','staff'));
create policy "staff delete contract files" on storage.objects for delete to authenticated
  using (bucket_id = 'contracts' and (select public.my_role()) in ('admin','staff'));

-- ========== บันทึกสัญญา + ผู้รับ ในธุรกรรมเดียว ==========
-- security invoker → RLS ของผู้เรียกยังมีผล (viewer บันทึกไม่ได้)
create function public.save_contract(p_id uuid, p_data jsonb, p_recipients uuid[])
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if p_id is null then
    insert into public.contracts
      (project_name, contract_no, client_name, start_date, end_date, recurrence, reminder_offsets, value, note)
    select project_name, contract_no, client_name, start_date, end_date, recurrence, reminder_offsets, value, note
    from jsonb_populate_record(null::public.contracts, p_data)
    returning id into v_id;
  else
    update public.contracts c set
      project_name = r.project_name, contract_no = r.contract_no, client_name = r.client_name,
      start_date = r.start_date, end_date = r.end_date, recurrence = r.recurrence,
      reminder_offsets = r.reminder_offsets, value = r.value, note = r.note
    from jsonb_populate_record(null::public.contracts, p_data) r
    where c.id = p_id
    returning c.id into v_id;
    if v_id is null then raise exception 'ไม่พบสัญญา หรือไม่มีสิทธิ์แก้ไข'; end if;
  end if;

  delete from public.contract_recipients
  where contract_id = v_id and not (user_id = any(p_recipients));
  insert into public.contract_recipients (contract_id, user_id)
  select v_id, unnest(p_recipients)
  on conflict do nothing;

  return v_id;
end; $$;
