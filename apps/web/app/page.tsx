import Link from 'next/link';

export default function Home() {
  return <main className="ykb-shell">
    <header className="topbar"><Link href="/" className="brand">YKB<span>.</span></Link><nav className="landing-nav"><Link href="/markets">Markets</Link><Link href="/portfolio">Portfolio</Link><Link href="/wallet">Wallet</Link><Link href="/login" className="nav-cta">Sign in</Link></nav></header>
    <section className="hero" id="top">
      <p className="eyebrow">FOOTBALL IS MORE THAN THE SCORELINE</p>
      <h1>You know ball.<br/><em>Back your read.</em></h1>
      <p className="intro">A player-stat prediction market built for Nigerian football fans. Study the line, make your call, and track your positions with virtual NGN funds.</p>
      <div className="hero-tags"><Link className="virtual" href="/markets">Explore markets</Link><Link className="notice" href="/login">Create account / sign in</Link></div>
      <p className="small-note">Testing environment · ₦1,000,000 virtual signup bonus planned · no real-money deposits or withdrawals</p>
    </section>
    <section className="markets"><div className="section-head"><div><p className="eyebrow">THE PLATFORM</p><h2>Built around the details</h2></div></div>
      <div className="feature-grid"><article className="market-card"><p className="eyebrow">01 / MARKETS</p><h3>Player-stat lines</h3><p className="muted">Over/Under markets with live prices from the YKB market engine when markets are published.</p><Link href="/markets">Browse markets →</Link></article><article className="market-card"><p className="eyebrow">02 / PORTFOLIO</p><h3>Your positions</h3><p className="muted">See your virtual shares, buy and sell history, and market prices in one place.</p><Link href="/portfolio">View portfolio →</Link></article><article className="market-card"><p className="eyebrow">03 / WALLET</p><h3>Virtual NGN balance</h3><p className="muted">A separate virtual bonus wallet and cash-wallet architecture, with integer-kobo accounting.</p><Link href="/wallet">Open wallet →</Link></article></div>
    </section>
    <footer>YKB is under active development. Markets only appear after they are reviewed and opened. The current test environment uses virtual balances; real-money functionality is disabled.</footer>
  </main>;
}
