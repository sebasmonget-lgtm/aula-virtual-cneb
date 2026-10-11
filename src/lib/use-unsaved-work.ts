"use client";

import { useCallback, useEffect } from "react";

/** Protect private work in memory; never copy pupil data into browser storage. */
export function useUnsavedWork(dirty: boolean, busy = false, message = "Hay cambios sin guardar. ¿Quieres descartarlos y salir?") {
  const allowLeave = useCallback(() => !busy && (!dirty || window.confirm(message)), [busy, dirty, message]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigation = (event: Event) => {
      if (!event.defaultPrevented && !allowLeave()) event.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("ayni-before-navigation", navigation);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("ayni-before-navigation", navigation);
    };
  }, [dirty, busy, allowLeave]);
  return allowLeave;
}
