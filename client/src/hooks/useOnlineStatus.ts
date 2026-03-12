import { useState, useEffect } from "react";
import { drainQueue } from "@/lib/offlineQueue";
import { refreshAthleteCache } from "@/lib/athleteCache";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Drain offline queue and refresh cache when coming back online
      drainQueue().catch(() => {});
      refreshAthleteCache().catch(() => {});
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
