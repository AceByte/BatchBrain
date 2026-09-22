"use client"

import { useEffect, useState } from "react"

export function OfflineSupport() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined)
    const updateStatus = () => setIsOffline(!navigator.onLine)
    updateStatus()
    window.addEventListener("online", updateStatus)
    window.addEventListener("offline", updateStatus)
    return () => {
      window.removeEventListener("online", updateStatus)
      window.removeEventListener("offline", updateStatus)
    }
  }, [])

  return isOffline ? (
    <div className="offline-banner" role="status">
      Offline mode: cached pages may be stale. Stock changes and production logging require a connection.
    </div>
  ) : null
}
