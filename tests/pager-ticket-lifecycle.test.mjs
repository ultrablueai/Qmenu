import assert from "node:assert/strict";
import test from "node:test";
import { PAGER_STATUS, isPagerStatus, canTransitionPagerTicket, transitionPagerTicket } from "../src/lib/pager-ticket-lifecycle.mjs";

const base = Object.freeze({ id: "ticket-1", status: PAGER_STATUS.WAITING, version: 0, branch_id: "branch-a" });
const ctx = Object.freeze({ actorId: "staff-1", at: "2026-11-04T10:00:00+03:00" });

test("only known statuses are accepted", () => {
  assert.equal(isPagerStatus("waiting"), true);
  assert.equal(isPagerStatus("__proto__"), false);
  assert.equal(isPagerStatus("paid"), false);
});

test("independent pager supports direct ready and normal handoff", () => {
  const ready = transitionPagerTicket(base, "ready", ctx);
  assert.equal(ready.ticket.status, "ready");
  assert.equal(ready.ticket.version, 1);
  assert.equal(ready.ticket.ready_at, "2026-11-04T07:00:00.000Z");
  assert.equal(ready.event.expected_version, 0);
  const done = transitionPagerTicket(ready.ticket, "fulfilled", ctx);
  assert.equal(done.ticket.fulfilled_at, ready.ticket.ready_at);
  assert.equal(done.ticket.version, 2);
  assert.equal(done.event.from_status, "ready");
  assert.equal(base.status, "waiting");
  assert.equal(base.version, 0);
});

test("preparing and cancellation paths are explicit", () => {
  assert.equal(canTransitionPagerTicket("waiting", "preparing"), true);
  assert.equal(canTransitionPagerTicket("preparing", "ready"), true);
  assert.equal(canTransitionPagerTicket("ready", "cancelled"), true);
  assert.equal(canTransitionPagerTicket("cancelled", "ready"), false);
});

test("duplicate ready, fulfilled, and terminal transitions cannot emit another event", () => {
  const ready = transitionPagerTicket(base, "ready", ctx);
  assert.throws(() => transitionPagerTicket(ready.ticket, "ready", ctx), RangeError);
  const done = transitionPagerTicket(ready.ticket, "fulfilled", ctx);
  for (const to of ["fulfilled", "ready", "waiting", "cancelled"]) {
    assert.throws(() => transitionPagerTicket(done.ticket, to, ctx), RangeError);
  }
  const cancelled = transitionPagerTicket(base, "cancelled", ctx);
  assert.throws(() => transitionPagerTicket(cancelled.ticket, "ready", ctx), RangeError);
});

test("rejects invalid actors, timestamps, versions and states", () => {
  assert.throws(() => transitionPagerTicket({ ...base, status: "other" }, "ready", ctx), TypeError);
  assert.throws(() => transitionPagerTicket({ ...base, version: -1 }, "ready", ctx), TypeError);
  assert.throws(() => transitionPagerTicket(base, "ready", { ...ctx, actorId: "" }), TypeError);
  assert.throws(() => transitionPagerTicket(base, "ready", { ...ctx, at: "nonsense" }), TypeError);
  assert.throws(() => transitionPagerTicket(base, "unknown", ctx), RangeError);
});
