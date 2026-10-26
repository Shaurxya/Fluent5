"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Magic link sent! Check your inbox.");
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-start/8 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-accent-end/8 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
              Fluent<span className="gradient-text">Five</span>
            </span>
          </div>
          <p className="text-foreground-muted">
            Sign in to start your daily practice
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-background-card border border-border p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold font-[family-name:var(--font-outfit)] mb-2">
                Check your email
              </h2>
              <p className="text-foreground-muted text-sm mb-6">
                We sent a magic link to{" "}
                <span className="text-foreground font-medium">{email}</span>
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-accent text-sm hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {/* Google Login */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-border-hover hover:bg-background-card-hover transition-all text-sm font-medium mb-6"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-foreground-subtle text-xs uppercase tracking-wider">
                  or
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email form */}
              <form onSubmit={handleMagicLink}>
                <label className="block text-sm text-foreground-muted mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-border text-foreground placeholder:text-foreground-subtle text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-accent transition-all mb-4"
                />
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 rounded-xl gradient-bg text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {loading ? "Sending..." : "Send Magic Link"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-foreground-subtle text-xs mt-6">
          By signing in, you agree to practice English every day 😄
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return <main className="min-h-screen flex items-center justify-center p-6"><div className="nlp-panel max-w-xl space-y-4"><h1 className="text-2xl font-bold">Configure FluentFive</h1><p>Copy .env.example to .env.local and add your Supabase URL and public key, then restart the app. Apply the database migrations and seed content before signing in.</p><p className="text-sm text-foreground-muted">The public landing page is available. Learning accounts require your own Supabase project.</p><a className="text-accent" href="/fluentfive">Back to FluentFive</a></div></main>;
  return <LoginForm />;
}
