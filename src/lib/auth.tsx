import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{
    error: string | null;
    needsConfirmation: boolean;
    alreadyRegistered: boolean;
  }>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return { error: error ? friendlyAuthError(error.message) : null };
      },
      async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName?.trim() || email.split("@")[0] },
          },
        });
        if (error)
          return {
            error: friendlyAuthError(error.message),
            needsConfirmation: false,
            alreadyRegistered: false,
          };
        // When the email already has an account, GoTrue returns 200 with an
        // empty `identities` array and NO session — and crucially sends NO
        // email (anti-enumeration). Don't tell the user to check their inbox.
        const alreadyRegistered =
          !!data.user && data.user.identities?.length === 0;
        return {
          error: null,
          alreadyRegistered,
          needsConfirmation: !alreadyRegistered && !data.session,
        };
      },
      async resendConfirmation(email) {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        return { error: error ? friendlyAuthError(error.message) : null };
      },
      async requestPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        return { error: error ? friendlyAuthError(error.message) : null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password don't match. Please try again.";
  }
  if (m.includes("already registered")) {
    return "An account with this email already exists — sign in instead.";
  }
  if (m.includes("password")) {
    return "Password must be at least 6 characters.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts — please wait a moment and try again.";
  }
  return "We couldn't complete that. Please try again.";
}
