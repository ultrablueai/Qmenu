-- Beger G46 stage 1: tenant isolated salon data foundation.
-- No public booking routes, API grants, live data seeding or production changes.
create table if not exists public.salon_staff (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null,
 user_id uuid,
 display_name text not null check(length(trim(display_name)) between 1 and 100),
 kind text not null default 'barber' check(kind in ('barber','stylist','specialist')),
 active boolean not null default true,
 accepts_bookings boolean not null default true,
 start_local time,
 end_local time,
 created_at timestamptz not null default now(),
 unique(business_id,id),
 foreign key (business_id,branch_id) references public.branches(business_id,id),
 constraint salon_staff_shift_valid check(start_local is null or end_local is null or start_local<end_local)
);
create index if not exists salon_staff_branch_idx on public.salon_staff(business_id,branch_id,active);
create index if not exists salon_staff_login_idx on public.salon_staff(business_id,user_id) where user_id is not null;

create table if not exists public.salon_chairs (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null,
 label text not null check(length(trim(label)) between 1 and 60),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(business_id,id),
 unique(business_id,branch_id,label),
 foreign key(business_id,branch_id) references public.branches(business_id,id)
);

create table if not exists public.salon_services (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 120),
 duration_minutes integer not null check(duration_minutes between 5 and 480),
 buffer_minutes integer not null default 0 check(buffer_minutes between 0 and 120),
 price_minor bigint not null check(price_minor>=0),
 currency char(3) not null default 'TRY',
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(business_id,id)
);

create table if not exists public.salon_staff_services (
 business_id uuid not null,
 staff_id uuid not null,
 service_id uuid not null,
 active boolean not null default true,
 primary key(business_id,staff_id,service_id),
 foreign key(business_id,staff_id) references public.salon_staff(business_id,id) on delete cascade,
 foreign key(business_id,service_id) references public.salon_services(business_id,id) on delete cascade
);

create table if not exists public.salon_staff_schedules (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 staff_id uuid not null,
 weekday smallint not null check(weekday between 0 and 6),
 opens_at time not null,
 closes_at time not null,
 gap_minutes integer not null default 0 check(gap_minutes between 0 and 120),
 break_start time,
 break_end time,
 constraint salon_staff_schedule_hours check(opens_at<closes_at),
 constraint salon_staff_schedule_break check((break_start is null and break_end is null) or
     (break_start is not null and break_end is not null and break_start<break_end)),
 unique(business_id,id),
 unique(business_id,staff_id,weekday),
 foreign key(business_id,staff_id) references public.salon_staff(business_id,id) on delete cascade
);

create table if not exists public.salon_staff_contracts (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 staff_id uuid not null,
 model text not null check(model in ('commission','chair_rent','salary_plus_commission','owner')),
 commission_bps integer not null default 0 check(commission_bps between 0 and 10000),
 chair_rent_minor bigint not null default 0 check(chair_rent_minor>=0),
 rent_period text check(rent_period in ('day','week','month')),
 effective_from date not null default current_date,
 created_at timestamptz not null default now(),
 unique(business_id,id),
 unique(business_id,staff_id,effective_from),
 foreign key(business_id,staff_id) references public.salon_staff(business_id,id) on delete cascade,
 constraint salon_contract_rental_period check(model<>'chair_rent' or rent_period is not null)
);

create table if not exists public.salon_bookings (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null,
 customer_name text not null check(length(trim(customer_name)) between 1 and 100),
 customer_user_id uuid,
 status text not null default 'pending' check(status in
  ('pending','confirmed','arrived','in_service','completed','cancelled','no_show')),
 source text not null default 'direct' check(length(source) between 1 and 60),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 currency char(3) not null default 'TRY',
 total_minor bigint not null default 0 check(total_minor>=0),
 collected_minor bigint not null default 0 check(collected_minor>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,id),
 foreign key(business_id,branch_id) references public.branches(business_id,id),
 constraint salon_booking_time check(starts_at<ends_at),
 constraint salon_booking_collected check(collected_minor<=total_minor)
);
create index if not exists salon_booking_calendar on public.salon_bookings(business_id,branch_id,starts_at,status);

create table if not exists public.salon_booking_services (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 booking_id uuid not null,
 service_id uuid not null,
 staff_id uuid not null,
 chair_id uuid,
 line_number integer not null check(line_number>0),
 duration_minutes integer not null check(duration_minutes between 5 and 480),
 buffer_minutes integer not null default 0 check(buffer_minutes between 0 and 120),
 price_minor bigint not null check(price_minor>=0),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 unique(business_id,id),
 unique(business_id,booking_id,line_number),
 foreign key(business_id,booking_id) references public.salon_bookings(business_id,id) on delete cascade,
 foreign key(business_id,service_id) references public.salon_services(business_id,id),
 foreign key(business_id,staff_id) references public.salon_staff(business_id,id),
 foreign key(business_id,chair_id) references public.salon_chairs(business_id,id),
 constraint salon_line_time check(starts_at<ends_at)
);
create index if not exists salon_booking_staff_calendar on public.salon_booking_services(business_id,staff_id,starts_at,ends_at);
create index if not exists salon_booking_chair_calendar on public.salon_booking_services(business_id,chair_id,starts_at,ends_at) where chair_id is not null;

create table if not exists public.salon_booking_events (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 booking_id uuid not null,
 actor_id uuid,
 event_type text not null check(event_type in ('requested','approved','rejected','arrived','started','completed','cancelled','no_show','collected')),
 created_at timestamptz not null default now(),
 unique(business_id,id),
 foreign key(business_id,booking_id) references public.salon_bookings(business_id,id) on delete cascade
);

-- Fail-closed until dedicated authenticated role policies + server RPCs are certified.
alter table public.salon_staff enable row level security;
alter table public.salon_chairs enable row level security;
alter table public.salon_services enable row level security;
alter table public.salon_staff_services enable row level security;
alter table public.salon_staff_schedules enable row level security;
alter table public.salon_staff_contracts enable row level security;
alter table public.salon_bookings enable row level security;
alter table public.salon_booking_services enable row level security;
alter table public.salon_booking_events enable row level security;

revoke all on public.salon_staff,public.salon_chairs,public.salon_services,
 public.salon_staff_services,public.salon_staff_schedules,public.salon_staff_contracts,
 public.salon_bookings,public.salon_booking_services,public.salon_booking_events
 from public,anon,authenticated;
