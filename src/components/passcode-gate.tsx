"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

const PASSCODE = "1712";
const STORAGE_KEY = "batchbrain.passcodeVerified";

type PasscodeGateProps = {
  children: ReactNode;
};

export function PasscodeGate({ children }: PasscodeGateProps) {
  const [isReady, setIsReady] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const alreadyUnlocked = window.localStorage.getItem(STORAGE_KEY) === "true";
    setIsUnlocked(alreadyUnlocked);
    setIsReady(true);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inputValue.trim() === PASSCODE) {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setIsUnlocked(true);
      setError(null);
      return;
    }

    setError("Incorrect passcode");
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center px-4 text-slate-300">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-3 text-sm font-semibold shadow-xl ring-1 ring-slate-700/70 backdrop-blur-xl">
          Checking access...
        </div>
      </div>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/65 p-7 shadow-2xl ring-1 ring-slate-600/70 backdrop-blur-xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">BatchBrain Access</h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter your passcode to unlock this device.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400" htmlFor="device-passcode">
            Device Passcode
          </label>
          <input
            id="device-passcode"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            className="w-full rounded-xl border border-slate-600 bg-slate-800/90 px-4 py-2.5 text-sm text-slate-100 shadow-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
            placeholder="Passcode"
          />

          {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-lg ring-1 ring-emerald-400/40 transition-all hover:bg-emerald-500"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
