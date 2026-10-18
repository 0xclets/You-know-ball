'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authenticatedFetch } from '../../lib/api';

type Wallet = { currency: string; bonusBalanceKobo: string; cashBalanceKobo: string; bonusBalanceNaira: string; cashBalanceNaira: string; realMoneyEnabled: boolean };
export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    authenticatedFetch('/wallet').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Could not load wallet.');
      setWallet(data);
    }).catch(e => setError(e instanceof Error ? e.message : 'Could not load wallet.'));
  }, []);
  return <main className="app-shell"><header className="app-topbar"><Link href="/" className="brand">YKB<span>.</span></Link><nav><Link href="/markets">Markets</Link><Link href="/wallet">Wallet</Link><Link href="/account">Account</Link></nav></header><section className="page-intro"><p className="eyebrow">YOUR FUNDS</p><h1>Wallet</h1><p className="muted">Your virtual testing funds are separate from any future real-money balance.</p></section>{error && <p role="alert" className="status-message">{error}</p>}{wallet ? <div className="wallet-grid"><article className="balance-card bonus"><p>Virtual bonus balance</p><h2>₦{wallet.bonusBalanceNaira}</h2><span>Practice balance · cannot be withdrawn</span></article><article className="balance-card"><p>Cash balance</p><h2>₦{wallet.cashBalanceNaira}</h2><span>Real-money features are disabled</span></article></div> : !error ? <p className="muted">Loading your wallet…</p> : <p><Link href="/login">Sign in again</Link></p>}<p className="small-note">Wallet balances are fetched from the YKB API. They are not sample balances.</p></main>;
}
