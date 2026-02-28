"use client";

import { useEffect } from "react";

export function Settings() {
  useEffect(() => {
    // Redirect to dashboard - settings are disabled
    window.location.href = "/";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="text-center">
        <p className="text-xl text-slate-600">Settings are disabled. Redirecting...</p>
      </div>
    </div>
  );
}
