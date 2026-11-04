/**
 * Independent Pager ticket lifecycle.
 * This pure domain module has no payment, menu-order, or database side effects.
 * Authorization, atomic writes, and event persistence belong to the service/DB layer.
 */
export const PAGER_STATUS = Object.freeze({
  WAITING: "waiting",
  PREPARING: "preparing",
  READY: "ready",
  FULFILLED: "fulfilled",
  CANCELLED: "cancelled",
});

const NEXT = Object.freeze({
  waiting: Object.freeze(["preparing", "ready", "cancelled"]),
  preparing: Object.freeze(["ready", "cancelled"]),
  ready: Object.freeze(["fulfilled", "cancelled"]),
  fulfilled: Object.freeze([]),
  cancelled: Object.freeze([]),
});

export function isPagerStatus(status) {
  return Object.hasOwn(NEXT, status);
}

export function canTransitionPagerTicket(from, to) {
  return isPagerStatus(from) && isPagerStatus(to) && NEXT[from].includes(to);
}

/**
 * Returns the next snapshot and an append-only event for an authorized caller.
 * The caller must transact against an expected version to avoid lost updates.
 * A repeat transition is rejected (never emits a duplicate notification event).
 */
export function transitionPagerTicket(ticket, to, context) {
  if (!ticket || typeof ticket !== "object" || !isPagerStatus(ticket.status)) {
    throw new TypeError("Invalid pager ticket");
  }
  if (!Number.isSafeInteger(ticket.version) || ticket.version < 0) {
    throw new TypeError("Invalid pager ticket version");
  }
  if (!canTransitionPagerTicket(ticket.status, to)) {
    throw new RangeError("Invalid pager status transition");
  }
  if (!context || typeof context.actorId !== "string" || !context.actorId.trim()) {
    throw new TypeError("An authenticated actor is required");
  }
  if (typeof context.at !== "string" || !Number.isFinite(Date.parse(context.at))) {
    throw new TypeError("An event timestamp is required");
  }
  const at = new Date(context.at).toISOString();
  const next = {
    ...ticket,
    status: to,
    version: ticket.version + 1,
    ...(to === "ready" ? { ready_at: at } : {}),
    ...(to === "fulfilled" ? { fulfilled_at: at } : {}),
    ...(to === "cancelled" ? { cancelled_at: at } : {}),
  };
  const event = {
    ticket_id: ticket.id,
    from_status: ticket.status,
    to_status: to,
    actor_id: context.actorId,
    occurred_at: at,
    expected_version: ticket.version,
    next_version: next.version,
  };
  return { ticket: next, event };
}
