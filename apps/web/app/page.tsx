const markets = [
  { player: 'Mohamed Salah', club: 'Liverpool', stat: 'Shots on target', line: 'Over 1.5', odds: 'Demo market' },
  { player: 'Victor Osimhen', club: 'Galatasaray', stat: 'Total shots', line: 'Under 3.5', odds: 'Demo market' },
  { player: 'Bukayo Saka', club: 'Arsenal', stat: 'Chances created', line: 'Over 2.5', odds: 'Demo market' },
];

export default function Home() {
  return <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 22px 70px' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderBottom: '1px solid #26382f', paddingBottom: 20 }}>
      <div style={{ fontWeight: 900, letterSpacing: 2, fontSize: 25 }}>YKB<span style={{ color: '#a3f56a' }}>.</span></div>
      <span style={{ color: '#a3f56a', border: '1px solid #426b3b', borderRadius: 999, padding: '7px 12px', fontSize: 12 }}>PHASE 1 · FOUNDATION</span>
    </header>
    <section style={{ padding: '66px 0 42px', maxWidth: 760 }}>
      <p style={{ color: '#a3f56a', fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>FOOTBALL IS MORE THAN THE SCORELINE</p>
      <h1 style={{ fontSize: 'clamp(42px, 8vw, 76px)', lineHeight: 1.02, margin: '14px 0 20px', letterSpacing: -3 }}>You know ball.<br/><span style={{ color: '#a3f56a' }}>Back your read.</span></h1>
      <p style={{ color: '#b6c7bd', fontSize: 18, lineHeight: 1.7, maxWidth: 620 }}>A player-stat prediction experience designed for Nigerian football fans. Pick a line, study the match, and test your football knowledge.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}><span style={{ background: '#a3f56a', color: '#102014', padding: '12px 18px', borderRadius: 10, fontWeight: 800 }}>Virtual NGN testing planned</span><span style={{ border: '1px solid #34483c', padding: '12px 18px', borderRadius: 10, color: '#d4e0d8' }}>No real-money trading in Phase 1</span></div>
    </section>
    <section><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 16 }}><div><p style={{ color: '#a3f56a', fontSize: 12, letterSpacing: 2 }}>MARKET PREVIEW</p><h2 style={{ fontSize: 27, margin: '8px 0' }}>Player lines</h2></div><span style={{ color: '#9eb0a7', fontSize: 13 }}>Illustrative UI only</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>{markets.map(m => <article key={m.player} style={{ background: '#111d19', border: '1px solid #2a3d32', borderRadius: 16, padding: 20 }}><p style={{ color: '#9eb0a7', marginTop: 0, fontSize: 13 }}>{m.club}</p><h3 style={{ fontSize: 21, margin: '7px 0 18px' }}>{m.player}</h3><p style={{ color: '#b6c7bd', marginBottom: 7 }}>{m.stat}</p><strong style={{ fontSize: 19, color: '#a3f56a' }}>{m.line}</strong><div style={{ marginTop: 18, borderTop: '1px solid #2a3d32', paddingTop: 13, color: '#9eb0a7', fontSize: 12 }}>{m.odds} · not connected to live data</div></article>)}</div>
    </section>
    <footer style={{ color: '#75877d', borderTop: '1px solid #26382f', marginTop: 50, paddingTop: 20, fontSize: 12 }}>YKB is under development. Market cards are examples, not live offers. No deposits or real-money trading are enabled.</footer>
  </main>;
}
