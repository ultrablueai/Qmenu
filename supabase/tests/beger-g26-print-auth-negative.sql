-- Beger G26: verify legacy print action wrapper is denied without a signed-in user.
-- STAGING ONLY. SELECTS no rows; DO expected exception; no writes.
begin read only;
set local role authenticated;
do $test$ begin
 begin
   perform public.g17_print_job_action('00000000-0000-0000-0000-000000000000'::uuid,'confirm');
   raise exception 'SECURITY_TEST_FAILED: function unexpectedly permitted missing identity';
 exception when sqlstate '42501' then
   raise notice 'PASS: print action requires signed-in and authorized identity';
 end;
end $test$;
rollback;
