"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const STORAGE_KEY = "redsox_volunteer";

interface VolunteerIdentity {
  email: string;
  name: string;
  token: string;
}

interface VolunteerIdentityContextValue {
  identity: VolunteerIdentity | null;
  setIdentity: (id: VolunteerIdentity) => void;
  clearIdentity: () => void;
}

const VolunteerIdentityContext = createContext<VolunteerIdentityContextValue>({
  identity: null,
  setIdentity: () => {},
  clearIdentity: () => {},
});

export function useVolunteerIdentity() {
  return useContext(VolunteerIdentityContext);
}

export function VolunteerIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentityState] = useState<VolunteerIdentity | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as VolunteerIdentity;
        if (parsed.email && parsed.token) {
          setIdentityState(parsed);
        }
      }
    } catch {}
  }, []);

  const setIdentity = useCallback((id: VolunteerIdentity) => {
    setIdentityState(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
    } catch {}
  }, []);

  const clearIdentity = useCallback(() => {
    setIdentityState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return (
    <VolunteerIdentityContext.Provider
      value={{ identity, setIdentity, clearIdentity }}
    >
      {children}
    </VolunteerIdentityContext.Provider>
  );
}
