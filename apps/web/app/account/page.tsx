'use client';

import Link from 'next/link';
import { API_BASE } from '../../lib/api';
export default function AccountPage() {
  async function signOut() {
    try {
      await fetch(API_BASE + '/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      sessionStorage.removeItem('ykbAccessToken');
      window.location.href = '/login';
    }
  }
  return <main className="app-shell"><header className="app-topbar"><Link href="/" className="brand">YKB<span>.</span></Link><nav><Link href="/markets">Markets</Link><Link href="/portfolio">Portfolio</Link><Link href="/wallet">Wallet</Link><Link href="/account">Account</Link></nav></header><section className="page-intro"><p className="eyebrow">ACCOUNT</p><h1>Your YKB account</h1><p className="muted">Manage your testing session.</p></section><article className="panel"><h2>Security</h2><p className="muted">Phone verification is handled by the API. Signing out revokes the active refresh-token family and clears this browser session.</p><button onClick={signOut}>Sign out</button></article><p className="small-note">Do not use real financial information during the testing phase.</p></main>;
}
