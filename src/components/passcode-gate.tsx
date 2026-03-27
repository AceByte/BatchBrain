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
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center text-zinc-600">
        Checking access...
      </div>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-zinc-900">BatchBrain Access</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter your passcode to unlock this device.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
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
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
            placeholder="Passcode"
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-800"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
