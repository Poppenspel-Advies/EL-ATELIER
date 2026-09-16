import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Loader2, Sparkles, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { useAuth } from "../lib/auth";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, resendConfirmation, requestPasswordReset, user, loading } =
    useAuth();

  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/studio";

  useEffect(() => {
    if (user && !loading) navigate(from, { replace: true });
  }, [user, loading, navigate, from]);

  // Supabase's implicit flow reports auth failures in the URL fragment
  // (e.g. #error=access_denied&error_code=otp_expired). Surface them as a
  // friendly message instead of a raw error URL.
  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash.includes("error=")) return;

    const params = new URLSearchParams(hash);
    const code = params.get("error_code") ?? "";
    const description = params.get("error_description") ?? "";
    const linkUsedOrExpired =
      code === "otp_expired" || /invalid or has expired/i.test(description);

    setMode("signin");
    setError(
      linkUsedOrExpired
        ? "That confirmation link has already been used or has expired — but your account is ready. Just sign in below."
        : "We couldn't complete that sign-in link. Please try again."
    );
    // Drop the error fragment so a page refresh doesn't show it again.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  }, [location.hash]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    if (mode === "signin") {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
      else navigate(from, { replace: true });
    } else {
      const { error, needsConfirmation, alreadyRegistered } = await signUp(
        email.trim(),
        password,
        fullName
      );
      if (error) {
        setError(error);
      } else if (alreadyRegistered) {
        setMode("signin");
        setNotice(
          "An account with this email already exists — you're all set. Sign in below instead; no confirmation email is needed."
        );
      } else if (needsConfirmation) {
        setNotice(
          "Almost there — we've sent a confirmation link to your inbox. It's single-use: click it once and you'll be signed in automatically. Check spam if it's slow, or use the resend link below."
        );
        setMode("signin");
      } else {
        navigate(from, { replace: true });
      }
    }
    setSubmitting(false);
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError("Enter your email above, then resend the confirmation link.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const { error } = await resendConfirmation(email.trim());
    if (error) {
      setError(error);
    } else {
      setNotice(
        "We've sent a fresh confirmation link to your inbox. It's single-use — click it once and you'll be signed in automatically."
      );
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email above, and we'll send you a reset link.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const { error } = await requestPasswordReset(email.trim());
    if (error) {
      setError(error);
    } else {
      setNotice(
        "If an account exists for that address, we've sent a password reset link to your inbox — it's single-use, so click it once."
      );
    }
    setSubmitting(false);
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-10 h-56 w-56 rounded-full bg-pink/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-56 w-56 rounded-full bg-cyan/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-secondary transition-colors duration-200 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the maison
        </Link>

        <div className="card p-8">
          <h1 className="font-heading text-3xl font-medium text-primary">
            {mode === "signin" ? "Welcome back" : "Enter the studio"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            {mode === "signin"
              ? "Sign in to return to your archive."
              : "Create your account to begin forging couture."}
          </p>

          {/* Mode toggle */}
          <div
            className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                mode === "signin"
                  ? "bg-on-primary text-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
              onClick={() => setMode("signin")}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                mode === "signup"
                  ? "bg-on-primary text-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
              onClick={() => setMode("signup")}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="fullName" className="label">
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  className="input"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@maison.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                className="input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-xl bg-green/10 px-4 py-3 text-sm text-green">
                {notice}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : mode === "signin" ? (
                <LogIn className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>

            {mode === "signin" && (
              <div className="mt-4 flex flex-col items-center gap-1.5 text-sm">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleForgotPassword}
                  className="cursor-pointer text-secondary underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleResendConfirmation}
                  className="cursor-pointer text-xs text-secondary/70 underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Didn&apos;t get a confirmation email? Resend it
                </button>
              </div>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-secondary/80">
          By entering the studio you agree to keep the maison&apos;s secrets —
          your designs stay private to your archive.
        </p>
      </div>
    </div>
  );
}
