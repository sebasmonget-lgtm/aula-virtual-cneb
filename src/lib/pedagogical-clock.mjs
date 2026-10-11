import { AsyncLocalStorage } from "node:async_hooks";

// Request-scoped teaching time. Authentication, leases, billing and audit time stay real.
const scope = new AsyncLocalStorage();
export const withPedagogicalClock = (clock, work) => scope.run(clock ?? null, work);
export const currentPedagogicalClock = () => scope.getStore() ?? null;
export const pedagogicalNow = () => {
  const clock = currentPedagogicalClock();
  return clock ? new Date(`${clock.date}T${clock.time}:00-05:00`) : new Date();
};
export const simulatedObservationInstant = () => currentPedagogicalClock() ? pedagogicalNow().toISOString() : null;
