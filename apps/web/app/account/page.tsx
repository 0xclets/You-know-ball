'use client';

import Link from 'next/link';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export default function AccountPage() {
  async function signOut() {
    const refreshToken = sessionStorage.getItem('ykbRefreshToken');
    try {
      if (refreshToken) await fetch(API + '/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
    } finally {
      sessionStorage.removeItem('ykbAccessToken');
      sessionStorage.removeItem('ykbRefreshToken');
      window.location.href = '/login';
    }
  }
  return <main className="app-shell"><header className="app-topbar"><Link href="/" className="brand">YKB<span>.</span></Link><nav><Link href="/markets">Markets</Link><Link href="/portfolio">Portfolio</Link><Link href="/wallet">Wallet</Link><Link href="/account">Account</Link></nav></header><section className="page-intro"><p className="eyebrow">ACCOUNT</p><h1>Your YKB account</h1><p className="muted">Manage your testing session.</p></section><article className="panel"><h2>Security</h2><p className="muted">Phone verification is handled by the API. Signing out revokes the active refresh-token family and clears this browser session.</p><button onClick={signOut}>Sign out</button></article><p className="small-note">Do not use real financial information during the testing phase.</p></main>;
}
