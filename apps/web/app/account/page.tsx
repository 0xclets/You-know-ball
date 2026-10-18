'use client';

import Link from 'next/link';
export default function AccountPage() {
  function signOut() { sessionStorage.removeItem('ykbAccessToken'); sessionStorage.removeItem('ykbRefreshToken'); window.location.href = '/login'; }
  return <main className="app-shell"><header className="app-topbar"><Link href="/" className="brand">YKB<span>.</span></Link><nav><Link href="/markets">Markets</Link><Link href="/wallet">Wallet</Link><Link href="/account">Account</Link></nav></header><section className="page-intro"><p className="eyebrow">ACCOUNT</p><h1>Your YKB account</h1><p className="muted">Manage your local testing session.</p></section><article className="panel"><h2>Security</h2><p className="muted">Phone verification is handled by the API. Signing out clears this browser session.</p><button onClick={signOut}>Sign out</button></article><p className="small-note">Do not use real financial information during the testing phase.</p></main>;
}
