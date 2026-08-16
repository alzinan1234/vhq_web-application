"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useStore } from "@/store/useStore";
import { MdEmail, MdLock, MdPerson, MdMusicNote, MdKey, MdVisibility, MdVisibilityOff } from "react-icons/md";

type AuthMode = "login" | "signup" | "verify" | "forgot" | "reset";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "", otp: "" });
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();
  const { login, register, verifyEmail, resendOtp, forgotPassword, resetPassword,
    authLoading, authError, clearAuthError, pendingVerifyEmail, isLoggedIn } = useStore();

  useEffect(() => {
    if (isLoggedIn) router.push("/");
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (pendingVerifyEmail) setMode("verify");
  }, [pendingVerifyEmail]);

  useEffect(() => { clearAuthError(); }, [mode]);

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleLogin = async () => {
    if (!form.email || !form.password) return;
    const ok = await login(form.email, form.password);
    if (ok) router.push("/");
  };

  const handleRegister = async () => {
    if (!form.email || !form.username || !form.password) return;
    if (form.password !== form.confirm) { useStore.setState({ authError: "Passwords don't match" }); return; }
    await register(form.email, form.username, form.password);
    // mode will switch to "verify" via effect
  };

  const handleVerify = async () => {
    const email = pendingVerifyEmail || form.email;
    if (!email || !form.otp) return;
    const ok = await verifyEmail(email, form.otp);
    if (ok) { setMode("login"); useStore.setState({ authError: null }); }
  };

  const handleForgot = async () => {
    if (!form.email) return;
    const ok = await forgotPassword(form.email);
    if (ok) setMode("reset");
  };

  const handleReset = async () => {
    if (!form.email || !form.otp || !form.password) return;
    const ok = await resetPassword(form.email, form.otp, form.password);
    if (ok) setMode("login");
  };

  return (
    <AppLayout>
      <div className="max-w-sm mx-auto py-10 w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,rgba(255,0,110,0.15),rgba(123,47,255,0.15))", border: "1px solid rgba(255,0,110,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MdMusicNote size={32} style={{ color: "var(--pk)" }} />
            </div>
          </div>
          <div className="font-bebas text-4xl g1 mb-1">Welcome to VHQ</div>
          <div className="text-sm" style={{ color: "var(--tx2)" }}>The Vinyl Headquarters</div>
        </div>

        <div className="card-static p-6">
          {/* Mode tabs */}
          {(mode === "login" || mode === "signup") && (
            <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: "var(--surf)" }}>
              {(["login", "signup"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); clearAuthError(); }}
                  className="flex-1 py-2.5 rounded-md text-sm font-syne font-bold uppercase tracking-wider transition-all"
                  style={{ background: mode === m ? "var(--pk)" : "transparent", color: mode === m ? "#fff" : "var(--tx3)" }}>
                  {m === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {/* SIGNUP */}
            {mode === "signup" && (
              <Field label="Username" icon={<MdPerson size={16} />}>
                <input className="inp" style={{ paddingLeft: 36 }} placeholder="vinylhead" value={form.username} onChange={f("username")} />
              </Field>
            )}

            {/* EMAIL — all modes except verify */}
            {mode !== "verify" && (
              <Field label="Email" icon={<MdEmail size={16} />}>
                <input className="inp" style={{ paddingLeft: 36 }} type="email" placeholder="you@example.com" value={form.email} onChange={f("email")} />
              </Field>
            )}

            {/* OTP — verify + reset */}
            {(mode === "verify" || mode === "reset") && (
              <Field label="6-digit OTP from your email" icon={<MdKey size={16} />}>
                <input className="inp" style={{ paddingLeft: 36 }} placeholder="123456" maxLength={6} value={form.otp} onChange={f("otp")} />
              </Field>
            )}

            {/* PASSWORD — login + signup + reset */}
            {(mode === "login" || mode === "signup" || mode === "reset") && (
              <Field label="Password" icon={<MdLock size={16} />} right={
                <button onClick={() => setShowPass(v => !v)} type="button" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--tx3)", background: "none", border: "none", cursor: "pointer" }}>
                  {showPass ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                </button>
              }>
                <input className="inp" style={{ paddingLeft: 36, paddingRight: 36 }} type={showPass ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={f("password")} onKeyDown={e => e.key === "Enter" && mode === "login" && handleLogin()} />
              </Field>
            )}

            {/* CONFIRM PASSWORD */}
            {mode === "signup" && (
              <Field label="Confirm Password" icon={<MdLock size={16} />}>
                <input className="inp" style={{ paddingLeft: 36 }} type="password" placeholder="••••••••" value={form.confirm} onChange={f("confirm")} />
              </Field>
            )}

            {/* Error */}
            {authError && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,0,110,0.1)", color: "var(--pk)", border: "1px solid rgba(255,0,110,0.2)" }}>{authError}</div>
            )}

            {/* Verify info */}
            {mode === "verify" && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(0,245,255,0.08)", color: "var(--cy)", border: "1px solid rgba(0,245,255,0.2)" }}>
                Check your email <strong>{pendingVerifyEmail || form.email}</strong> for a 6-digit OTP.
              </div>
            )}

            {/* CTA Button */}
            <button className="btn btn-pk btn-md w-full" disabled={authLoading} onClick={
              mode === "login" ? handleLogin :
              mode === "signup" ? handleRegister :
              mode === "verify" ? handleVerify :
              mode === "forgot" ? handleForgot :
              handleReset
            }>
              {authLoading ? "Please wait…" :
                mode === "login" ? "Log In" :
                mode === "signup" ? "Create Account" :
                mode === "verify" ? "Verify Email" :
                mode === "forgot" ? "Send Reset OTP" :
                "Reset Password"}
            </button>

            {/* Resend OTP */}
            {mode === "verify" && (
              <button className="btn btn-ghost btn-sm w-full" onClick={() => resendOtp(pendingVerifyEmail || form.email)}>
                Resend OTP
              </button>
            )}
          </div>

          {/* Footer links */}
          {mode === "login" && (
            <div className="mt-5 text-center space-y-3">
              <div className="sep" />
              <button className="text-xs" style={{ color: "var(--tx3)", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setMode("forgot")}>
                Forgot password?
              </button>
              <div>
                <p className="text-xs mb-3" style={{ color: "var(--tx3)" }}>New to VHQ? It's free.</p>
                <button className="btn btn-cy btn-sm w-full" onClick={() => setMode("signup")}>Create Free Account</button>
              </div>
            </div>
          )}

          {(mode === "forgot" || mode === "reset" || mode === "verify") && (
            <div className="mt-4 text-center">
              <button className="btn btn-ghost btn-sm" onClick={() => setMode("login")}>← Back to Login</button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, icon, children, right }: { label: string; icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div>
      <label className="lbl text-[10px] block mb-1.5">{label}</label>
      <div className="relative">
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--tx3)" }}>{icon}</div>
        {children}
        {right}
      </div>
    </div>
  );
}
