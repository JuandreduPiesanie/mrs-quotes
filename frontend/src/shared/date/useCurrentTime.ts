import { useEffect, useState } from 'react';

export function useCurrentTime(refreshIntervalMs = 30_000) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [refreshIntervalMs]);

  return currentTime;
}
