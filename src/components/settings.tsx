"use client";

import { useEffect } from "react";

export function Settings() {
  useEffect(() => {
    // Redirect to dashboard - settings are disabled
    window.location.href = "/";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-xl text-foreground">Settings are disabled. Redirecting...</p>
      </div>
    </div>
  );
}
