'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authenticatedFetch } from '../../lib/api';

type Position = { id: string; outcome: string; shares: string; market: { id: string; playerName: string; statLabel: string; lineValue: string; teamName: string; opponentName: string } };
type Trade = { id: string; outcome: string; side: string; shares: string; grossAmountKobo: string; feeKobo: string; netAmountKobo: string; createdAt: string; market: { id: string; playerName: string; statLabel: string; lineValue: string } };
export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([authenticatedFetch('/markets/me/positions'), authenticatedFetch('/markets/me/trades')]).then(async responses => {
      const [p, t] = await Promise.all(responses.map(r => r.json()));
      if (!responses[0].ok) throw new Error(p.message ?? 'Could not load positions.');
      if (!responses[1].ok) throw new Error(t.message ?? 'Could not load trade history.');
      setPositions(p.positions ?? []); setTrades(t.trades ?? []);
    }).catch(e => setError(e instanceof Error ? e.message : 'Could not load portfolio.'));
  }, []);
  return <main className="app-shell"><header className="app-topbar"><Link href="/" className="brand">YKB<span>.</span></Link><nav><Link href="/markets">Markets</Link><Link href="/portfolio">Portfolio</Link><Link href="/wallet">Wallet</Link><Link href="/account">Account</Link></nav></header><section className="page-intro"><p className="eyebrow">YOUR ACTIVITY</p><h1>Portfolio</h1><p className="muted">Your open virtual positions and trade history.</p></section>{error && <p role="alert" className="status-message">{error}</p>}<section><h2>Open positions</h2>{positions.length ? <div className="market-grid">{positions.map(p => <article className="market-card" key={p.id}><p className="club">{p.market.teamName} vs {p.market.opponentName}</p><h3>{p.market.playerName}</h3><p className="stat">{p.market.statLabel} · line {p.market.lineValue}</p><strong>{p.outcome} · {p.shares} shares</strong><p><Link href={'/markets/' + p.market.id}>Open market →</Link></p></article>)}</div> : <p className="muted">No open positions yet.</p>}</section><section className="history"><h2>Recent trades</h2>{trades.length ? <div className="history-list">{trades.map(t => <article className="history-row" key={t.id}><div><strong>{t.market.playerName}</strong><p className="muted">{t.side} {t.outcome} · {t.shares} shares</p></div><div className="history-amount"><strong>₦{(Number(t.grossAmountKobo) / 100).toFixed(2)}</strong><p className="muted">Fee ₦{(Number(t.feeKobo) / 100).toFixed(2)}</p></div></article>)}</div> : <p className="muted">No trades recorded yet.</p>}</section><p className="small-note">Positions and history are loaded from the API and database.</p></main>;
}
