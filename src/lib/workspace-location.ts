"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { destinationFromHash, hashForDestination } from "./teacher-navigation.mjs";

const changedEvent = "ayni-location-change";
export function readWorkspaceParams(destination: string) {
  if (typeof window === "undefined" || destinationFromHash(window.location.hash) !== destination) return new URLSearchParams();
  return new URLSearchParams(window.location.hash.split("?")[1] ?? "");
}
export function canLeaveWorkspace() {
  return window.dispatchEvent(new Event("ayni-before-navigation", { cancelable: true }));
}
export function writeWorkspaceLocation(destination: string, changes: Record<string, string>, replace = false) {
  const base = hashForDestination(destination);
  if (!base) return;
  const params = readWorkspaceParams(destination);
  for (const [key, value] of Object.entries(changes)) { if (value) params.set(key, value); else params.delete(key); }
  const query = params.toString();
  const hash = `${base}${query ? `?${query}` : ""}`;
  if (window.location.hash === hash) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", hash);
  window.dispatchEvent(new Event(changedEvent));
}
export function useWorkspaceSubview<T extends string | number>(destination: string, key: string, allowed: readonly T[], fallback: T, guard = true) {
  const [value, setValue] = useState<T>(fallback);
  const currentValue = useRef(value);
  useEffect(() => { currentValue.current = value; }, [value]);
  useEffect(() => {
    const sync = () => {
      const raw = readWorkspaceParams(destination).get(key);
      const next = allowed.find((item) => String(item) === raw);
      setValue(next ?? fallback);
      if (raw === null && destinationFromHash(window.location.hash) === destination)
        writeWorkspaceLocation(destination, { [key]: String(fallback) }, true);
    };
    sync();
    for (const event of [changedEvent, "hashchange", "popstate"]) window.addEventListener(event, sync);
    return () => { for (const event of [changedEvent, "hashchange", "popstate"]) window.removeEventListener(event, sync); };
  }, [destination, key, allowed, fallback]);
  const select = useCallback((next: T) => {
    if (next === currentValue.current || guard && !canLeaveWorkspace()) return;
    setValue(next); writeWorkspaceLocation(destination, { [key]: String(next) });
  }, [destination, key, guard]);
  return [value, select] as const;
}
