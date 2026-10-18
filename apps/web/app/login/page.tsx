'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [purpose, setPurpose] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_UP');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function requestCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(`${API}/auth/otp/request`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, purpose }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Could not request a code.');
      if (data.developmentCode) setMessage(`Development code: ${data.developmentCode}`);
      setStage('code');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not connect to the YKB API.'); }
    finally { setBusy(false); }
  }
  async function verifyCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(`${API}/auth/otp/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, purpose, code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Code verification failed.');
      sessionStorage.setItem('ykbAccessToken', data.accessToken);
      sessionStorage.setItem('ykbRefreshToken', data.refreshToken);
      window.location.href = '/wallet';
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not verify the code.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><Link href="/" className="brand">YKB<span>.</span></Link><section className="auth-card"><p className="eyebrow">YOUR FOOTBALL KNOWLEDGE, YOUR CALL</p><h1>{stage === 'phone' ? 'Get in the game.' : 'Check your phone.'}</h1><p className="muted">{stage === 'phone' ? 'Use your Nigerian mobile number to create an account or sign in.' : `Enter the six-digit code sent to ${phone}.`}</p>{stage === 'phone' ? <form onSubmit={requestCode} className="auth-form"><label>Account action<select value={purpose} onChange={e => setPurpose(e.target.value as 'SIGN_IN' | 'SIGN_UP')}><option value="SIGN_UP">Create account</option><option value="SIGN_IN">Sign in</option></select></label><label>Mobile number<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0803 123 4567" autoComplete="tel" required /></label><button disabled={busy}>{busy ? 'Sending…' : 'Send verification code'}</button></form> : <form onSubmit={verifyCode} className="auth-form"><label>Six-digit code<input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></label><button disabled={busy}>{busy ? 'Verifying…' : 'Verify and continue'}</button><button type="button" className="secondary" onClick={() => { setStage('phone'); setMessage(''); }}>Change number</button></form>}{message && <p role="status" className="status-message">{message}</p>}<p className="small-note">Virtual-funds testing only. Real-money deposits and trading are not enabled.</p></section></main>;
}
