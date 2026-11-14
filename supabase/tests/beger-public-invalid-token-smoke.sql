-- Beger isolated Staging: anonymous token-guess negative-path smoke test.
-- Repeatable and non-mutating. Uses a sentinel UUID which must never be issued.
-- It tests invalid-token privacy only; NOT entropy, rate limits, active-token privacy or E2E.
begin read only;
set local role anon;
select
 public.g3_public_order_status('00000000-0000-0000-0000-000000000000'::uuid) is null
   as order_token_denied,
 public.g6_pager_public_status('00000000-0000-0000-0000-000000000000'::uuid) is null
   as pager_token_denied,
 public.g6_pager_display_status('00000000-0000-0000-0000-000000000000'::uuid) is null
   as display_token_denied,
 public.g5_order_rating_state('00000000-0000-0000-0000-000000000000'::uuid) is null
   as rating_token_denied;
rollback;
