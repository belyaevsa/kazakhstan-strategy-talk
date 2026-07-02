import { useEffect, useRef } from "react";

/**
 * Calls `callback` every `intervalMs`, but pauses while the tab is hidden and
 * fires once immediately when it becomes visible again. Avoids wasting requests
 * (and battery) polling in background tabs.
 */
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let id: number | undefined;

    const start = () => {
      if (id === undefined) {
        id = window.setInterval(() => {
          if (!document.hidden) savedCallback.current();
        }, intervalMs);
      }
    };

    const stop = () => {
      if (id !== undefined) {
        clearInterval(id);
        id = undefined;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        savedCallback.current();
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
