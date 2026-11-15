/**
 * Beger barber appointment domain V1. Pure, side-effect-free operations.
 * Integration layer must authorize actor, scope tenant, persist atomically,
 * recheck overlaps in transaction, and publish notification outbox events.
 */
export const STATUS = Object.freeze({
  REQUESTED: "requested", CONFIRMED: "confirmed", ARRIVED: "arrived",
  IN_SERVICE: "in_service", COMPLETED: "completed", CANCELLED: "cancelled",
  NO_SHOW: "no_show"
});
const transitions = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["arrived", "cancelled", "no_show"],
  arrived: ["in_service", "cancelled"],
  in_service: ["completed"],
  completed: [], cancelled: [], no_show: []
};
const isValidIso = (s) => typeof s === "string" && Number.isFinite(Date.parse(s)) && /(?:Z|[+-]\d\d:\d\d)$/.test(s);
const ms = (s) => Date.parse(s);
export function assertInterval(startAt, endAt) {
  if (!isValidIso(startAt) || !isValidIso(endAt) || ms(startAt) >= ms(endAt))
    throw new Error("invalid_interval");
}
export function conflicts(a, b) {
  assertInterval(a.startAt, a.endAt);
  assertInterval(b.startAt, b.endAt);
  return a.staffId === b.staffId && a.tenantId === b.tenantId &&
    !["cancelled", "no_show"].includes(a.status) &&
    !["cancelled", "no_show"].includes(b.status) &&
    ms(a.startAt) < ms(b.endAt) && ms(b.startAt) < ms(a.endAt);
}
export function ensureSlot(candidate, existing) {
  assertInterval(candidate.startAt, candidate.endAt);
  if (!candidate.tenantId || !candidate.staffId) throw new Error("missing_scope");
  if (existing.some(x => x.id !== candidate.id && conflicts(candidate, x)))
    throw new Error("slot_conflict");
  return candidate;
}
export function changeStatus(appointment, next, actor) {
  if (!transitions[appointment.status]?.includes(next)) throw new Error("invalid_transition");
  if (next === "confirmed" && actor !== "staff" && actor !== "owner") throw new Error("staff_approval_required");
  if (["no_show", "arrived", "in_service", "completed"].includes(next) && !["staff", "owner"].includes(actor))
    throw new Error("staff_action_required");
  return { ...appointment, status: next };
}
export function reschedule(appointment, startAt, endAt, existing, actor) {
  if (!["requested", "confirmed", "arrived"].includes(appointment.status))
    throw new Error("reschedule_unavailable");
  if (!["staff", "owner"].includes(actor)) throw new Error("staff_action_required");
  const next = { ...appointment, startAt, endAt, status: "requested" };
  return ensureSlot(next, existing);
}
export function earlyOffer(appointment, proposedStartAt, now, existing, durationMinutes) {
  if (appointment.status !== "confirmed") throw new Error("offer_requires_confirmation");
  if (!isValidIso(now) || !isValidIso(proposedStartAt) || !Number.isInteger(durationMinutes) || durationMinutes < 1)
    throw new Error("invalid_offer");
  const endAt = new Date(ms(proposedStartAt) + durationMinutes * 60000).toISOString();
  if (ms(proposedStartAt) < ms(now) || ms(proposedStartAt) >= ms(appointment.startAt))
    throw new Error("not_earlier");
  const proposal = { ...appointment, startAt: proposedStartAt, endAt };
  ensureSlot(proposal, existing);
  // Offer is only a proposal: original booking remains intact until the customer accepts.
  return { appointmentId: appointment.id, proposedStartAt, proposedEndAt: endAt, status: "pending_acceptance" };
}
export function publicPrice(service, businessSettings) {
  return businessSettings.showPrices === true && service.showPrice !== false
    ? { id: service.id, name: service.name, price: service.basePrice ?? null }
    : { id: service.id, name: service.name };
}
