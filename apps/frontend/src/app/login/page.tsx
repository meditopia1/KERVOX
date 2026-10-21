'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, Users } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  
  // Staff login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPin, setMemberPin] = useState('');
  
  // Common state
  const [error, setError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [loading, setLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);

  // Prevent caching of this page
  useEffect(() => {
    // Clear any cached authentication state
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.href);
    }
  }, []);


  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      
      // Force a hard navigation to clear any cached state
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setMemberLoading(true);

    try {
      const response = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail, pin: memberPin }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMemberError(data.error || 'Login failed. Please check your credentials.');
        return;
      }

      localStorage.setItem('member_session', data.session_token || data.member?.id || '');
      localStorage.setItem('member_data', JSON.stringify(data.member));

      window.location.href = '/member/dashboard';
    } catch (err: any) {
      console.error('Member login error:', err);
      setMemberError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setMemberLoading(false);
    }
  };

  return (
    <main className="premium-login relative min-h-screen overflow-hidden bg-[#f7f5f0] text-[#2b2926]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#fffdfa_0%,#f7f5f0_58%)]" />
        <div className="absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" style={{ backgroundImage: 'linear-gradient(#dacfc3 1px, transparent 1px), linear-gradient(90deg, #dacfc3 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[#f1ded0]/40 blur-3xl sm:h-[32rem] sm:w-[32rem]" />
        <svg viewBox="0 0 400 700" fill="none" className="absolute left-0 top-1/2 hidden h-[650px] w-[360px] -translate-y-1/2 text-[#c79179]/20 lg:block">
          <g stroke="currentColor" strokeWidth="2"><path d="M0 150h120l70 70h120M0 280h90l65-65M0 450h110l80-80h110M0 570h145l75-75h100" /><circle cx="120" cy="150" r="5" /><circle cx="190" cy="220" r="5" /><circle cx="110" cy="450" r="5" /><circle cx="220" cy="495" r="5" /></g>
        </svg>
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-[1200px] flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between py-7 sm:py-9">
          <Link href="/" aria-label="KERVOX home" className="inline-flex items-center"><Image src="/kervox-logo.svg" alt="KERVOX" width={162} height={33} className="h-[33px] w-auto" /></Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#6d675f] transition hover:text-[#a64c34]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center pb-16 pt-8 sm:pb-24">
          <div className="mx-auto mb-9 max-w-xl text-center sm:mb-12">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#a64c34]">Your connected workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#2b2926] sm:text-4xl">Welcome back</h1>
            <p className="mt-3 text-sm leading-6 text-[#6d675f] sm:text-base">Choose how you would like to sign in to KERVOX.</p>
          </div>

          <div className="mx-auto grid w-full max-w-[1100px] items-stretch gap-5 md:grid-cols-2 md:gap-20 lg:gap-32">
            <section aria-labelledby="staff-heading" className="premium-login-card rounded-xl border border-[#e6e0d7] bg-[#fffefa] p-6 shadow-[0_8px_30px_rgba(49,37,28,0.06)] sm:p-8">
              <div className="mb-7 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5e6dd] text-[#a64c34]"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
                <div><h2 id="staff-heading" className="text-xl font-semibold tracking-tight">Staff login</h2><p className="mt-1 text-sm leading-5 text-[#6d675f]">Access your department dashboard.</p></div>
              </div>
              <form onSubmit={handleStaffLogin} className="space-y-5">
                {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-[#39352f]">Email address</label>
                  <input id="email" type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className="h-12 w-full rounded-lg border border-[#d8cec2] bg-[#fffefa] px-4 text-sm text-[#2b2926] outline-none transition placeholder:text-[#81796e] focus:border-[#a64c34] focus:ring-4 focus:ring-[#f5e6dd] disabled:opacity-60" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-[#39352f]">Password</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className="h-12 w-full rounded-lg border border-[#d8cec2] bg-[#fffefa] px-4 pr-12 text-sm text-[#2b2926] outline-none transition placeholder:text-[#81796e] focus:border-[#a64c34] focus:ring-4 focus:ring-[#f5e6dd] disabled:opacity-60" />
                    <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#81796e] hover:text-[#39352f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a64c34]">{showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#a64c34] px-4 text-sm font-semibold text-white transition hover:bg-[#873b29] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34] disabled:opacity-60">{loading ? 'Signing in...' : 'Sign in as staff'}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></button>
              </form>
            </section>

            <section aria-labelledby="member-heading" className="premium-login-card rounded-xl border border-[#e6e0d7] bg-[#fffefa] p-6 shadow-[0_8px_30px_rgba(49,37,28,0.06)] sm:p-8">
              <div className="mb-7 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eee9e1] text-[#5c554d]"><Users className="h-5 w-5" aria-hidden="true" /></div>
                <div><h2 id="member-heading" className="text-xl font-semibold tracking-tight">Member login</h2><p className="mt-1 text-sm leading-5 text-[#6d675f]">Access your member portal.</p></div>
              </div>
              <form onSubmit={handleMemberLogin} className="space-y-5">
                {memberError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{memberError}</div>}
                <div className="space-y-2">
                  <label htmlFor="member-email" className="text-sm font-medium text-[#39352f]">Email address</label>
                  <input id="member-email" type="email" autoComplete="username" placeholder="you@example.com" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} required disabled={memberLoading} className="h-12 w-full rounded-lg border border-[#d8cec2] bg-[#fffefa] px-4 text-sm text-[#2b2926] outline-none transition placeholder:text-[#81796e] focus:border-[#a64c34] focus:ring-4 focus:ring-[#f5e6dd] disabled:opacity-60" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="member-pin" className="text-sm font-medium text-[#39352f]">PIN</label>
                  <input id="member-pin" type="password" inputMode="numeric" autoComplete="off" placeholder="Enter your PIN" value={memberPin} onChange={(e) => setMemberPin(e.target.value)} required disabled={memberLoading} maxLength={6} className="h-12 w-full rounded-lg border border-[#d8cec2] bg-[#fffefa] px-4 text-sm text-[#2b2926] outline-none transition placeholder:text-[#81796e] focus:border-[#a64c34] focus:ring-4 focus:ring-[#f5e6dd] disabled:opacity-60" />
                </div>
                <button type="submit" disabled={memberLoading} className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#d8cec2] bg-[#fffefa] px-4 text-sm font-semibold text-[#2b2926] transition hover:border-[#c9b4a5] hover:bg-[#f7eae3] hover:text-[#873b29] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34] disabled:opacity-60">{memberLoading ? 'Signing in...' : 'Sign in as member'}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></button>
              </form>
              <p className="mt-5 text-xs leading-5 text-[#6d675f]">Sign in with your email address and member PIN.</p>
            </section>
          </div>
          <p className="mt-8 text-center text-xs text-black">A simpler way to stay connected.</p>
        </div>
      </div>
    </main>
  );
}
