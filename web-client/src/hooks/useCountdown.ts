import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Tracks seconds until ISO expires; calls onExpire when it hits zero.
 */
export function useCountdown(iso: string | null, onExpire: () => void) {
  const [left, setLeft] = useState<number | null>(() =>
    iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : null
  );

  useLayoutEffect(() => {
    if (!iso) {
      setLeft(null);
      return;
    }
    const end = new Date(iso).getTime();
    setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
  }, [iso]);

  useEffect(() => {
    if (!iso) return;
    const end = new Date(iso).getTime();
    const tick = () => {
      const sec = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setLeft(sec);
      if (sec === 0) onExpire();
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [iso, onExpire]);

  return left;
}
