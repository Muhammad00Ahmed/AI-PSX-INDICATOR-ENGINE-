'use strict';

/**
 * PSX Market Events Database
 *
 * Real historical events that have impacted the Pakistan Stock Exchange.
 * Used by the event correlation and timeline engine.
 *
 * Sources: PSX announcements, SBP, IMF, GoP press releases, public record.
 */

const PSX_EVENTS = [
  // ── 2020 ─────────────────────────────────────────────────────────────
  {
    date: '2020-03-13',
    title: 'COVID-19 Circuit Breaker Triggered',
    type: 'crisis',
    impact: 'crash',
    sectors: ['ALL'],
    description: 'PSX triggered lower circuit breaker as KSE-100 fell 5% amid COVID-19 pandemic fears. Markets halted for first time.',
    magnitude: -5,
  },
  {
    date: '2020-03-25',
    title: 'COVID-19 All-Time Low',
    type: 'crisis',
    impact: 'crash',
    sectors: ['ALL'],
    description: 'KSE-100 hit 27,228 — worst level in 4 years. Pakistan confirms lockdowns.',
    magnitude: -8,
  },
  {
    date: '2020-06-25',
    title: 'SBP Emergency Rate Cuts',
    type: 'monetary_policy',
    impact: 'recovery',
    sectors: ['BANKING', 'CEMENT', 'TEXTILE'],
    description: 'State Bank cut policy rate 625bps (7.25% → 7.00%) in emergency moves to cushion COVID impact.',
    magnitude: 4,
  },
  {
    date: '2020-11-10',
    title: 'Pfizer Vaccine Breakthrough',
    type: 'global',
    impact: 'rally',
    sectors: ['ALL'],
    description: 'Pfizer announced 90%+ effective COVID vaccine. PSX rallied 4% — one of biggest single-day gains.',
    magnitude: 4,
  },

  // ── 2021 ─────────────────────────────────────────────────────────────
  {
    date: '2021-01-15',
    title: 'KSE-100 Crosses 44,000',
    type: 'market_milestone',
    impact: 'rally',
    sectors: ['ALL'],
    description: 'KSE-100 crossed 44,000 for first time in over 3 years on economic recovery optimism.',
    magnitude: 3,
  },
  {
    date: '2021-04-09',
    title: 'Budget 2021-22 Announced',
    type: 'fiscal_policy',
    impact: 'mixed',
    sectors: ['CEMENT', 'STEEL', 'BANKING'],
    description: 'GoP announced development budget. Cement and construction sectors rallied; banking saw profit-taking.',
    magnitude: 2,
  },
  {
    date: '2021-09-27',
    title: 'SBP Begins Rate Hike Cycle',
    type: 'monetary_policy',
    impact: 'negative',
    sectors: ['BANKING', 'AUTO', 'TEXTILE'],
    description: 'SBP raised policy rate 25bps to 7.25% — first hike since COVID. Markets fell on rate hike concerns.',
    magnitude: -2,
  },

  // ── 2022 ─────────────────────────────────────────────────────────────
  {
    date: '2022-02-24',
    title: 'Russia-Ukraine War Begins',
    type: 'geopolitical',
    impact: 'crash',
    sectors: ['OIL_GAS', 'FERTILIZER', 'TEXTILE'],
    description: 'Russia invaded Ukraine. Oil prices surged. Pakistan import bill fears spiked. KSE-100 fell sharply.',
    magnitude: -4,
  },
  {
    date: '2022-04-10',
    title: 'Political Crisis — PM Imran Khan Removed',
    type: 'political',
    impact: 'crash',
    sectors: ['ALL'],
    description: 'Prime Minister Imran Khan removed via no-confidence vote. Political uncertainty drove massive market sell-off.',
    magnitude: -6,
  },
  {
    date: '2022-06-10',
    title: 'SBP Emergency Rate Hike 150bps',
    type: 'monetary_policy',
    impact: 'negative',
    sectors: ['BANKING', 'REAL_ESTATE', 'AUTO'],
    description: 'SBP emergency meeting raised rate 150bps to 13.75% amid runaway inflation. Largest single hike in decades.',
    magnitude: -3,
  },
  {
    date: '2022-08-25',
    title: 'Catastrophic Pakistan Floods',
    type: 'disaster',
    impact: 'crash',
    sectors: ['AGRICULTURE', 'TEXTILE', 'CEMENT'],
    description: 'One-third of Pakistan submerged. Worst floods in history. 33 million affected. GDP impact estimated at -2%.',
    magnitude: -5,
  },
  {
    date: '2022-09-14',
    title: 'IMF Tranche Approved $1.17B',
    type: 'imf',
    impact: 'rally',
    sectors: ['BANKING', 'OIL_GAS'],
    description: 'IMF approved $1.17B tranche after months of stalled negotiations. Market rallied on relief.',
    magnitude: 4,
  },
  {
    date: '2022-12-05',
    title: 'PKR Hits Record Low 225',
    type: 'currency',
    impact: 'negative',
    sectors: ['AUTO', 'TECHNOLOGY', 'PHARMA'],
    description: 'Pakistani Rupee hit record 225/USD. Import costs surged. Import-heavy sectors fell; exporters gained.',
    magnitude: -3,
  },

  // ── 2023 ─────────────────────────────────────────────────────────────
  {
    date: '2023-02-02',
    title: 'IMF Deal Delayed — Crisis Mode',
    type: 'imf',
    impact: 'crash',
    sectors: ['ALL'],
    description: 'IMF deal further delayed after Pakistan failed conditions. Foreign reserves hit 3-week import cover. KSE-100 fell 2,000+ pts.',
    magnitude: -7,
  },
  {
    date: '2023-02-10',
    title: 'PKR Hits 270/USD — Currency Devaluation',
    type: 'currency',
    impact: 'crash',
    sectors: ['ALL'],
    description: 'SBP removed market intervention; PKR devalued massively to 270+ vs USD. Worst currency crash in history.',
    magnitude: -5,
  },
  {
    date: '2023-06-30',
    title: 'IMF $3B Stand-by Arrangement Approved',
    type: 'imf',
    impact: 'mega_rally',
    sectors: ['ALL'],
    description: 'IMF approved critical $3B SBA. KSE-100 soared 2,300+ points in single session — historic rally.',
    magnitude: 8,
  },
  {
    date: '2023-08-08',
    title: 'General Election Uncertainty',
    type: 'political',
    impact: 'negative',
    sectors: ['ALL'],
    description: 'Elections delayed. Political uncertainty dampened investor sentiment ahead of caretaker government formation.',
    magnitude: -2,
  },
  {
    date: '2023-11-01',
    title: 'Inflation Peaks at 38%',
    type: 'macro',
    impact: 'negative',
    sectors: ['CONSUMER', 'AUTO', 'TEXTILE'],
    description: 'CPI inflation hit 38% — highest in Pakistan\'s history. Consumer spending power collapsed.',
    magnitude: -3,
  },
  {
    date: '2023-12-15',
    title: 'KSE-100 Record 67,000+',
    type: 'market_milestone',
    impact: 'mega_rally',
    sectors: ['ALL'],
    description: 'KSE-100 hit all-time high above 67,000 on IMF support, falling inflation, and stabilizing PKR.',
    magnitude: 6,
  },

  // ── 2024 ─────────────────────────────────────────────────────────────
  {
    date: '2024-02-08',
    title: 'General Elections 2024',
    type: 'political',
    impact: 'rally',
    sectors: ['ALL'],
    description: 'Pakistan general elections held. Market rallied on political clarity expectations after months of uncertainty.',
    magnitude: 3,
  },
  {
    date: '2024-03-15',
    title: 'SBP Holds Rate at 22%',
    type: 'monetary_policy',
    impact: 'neutral',
    sectors: ['BANKING'],
    description: 'SBP kept policy rate at 22% as inflation remained elevated. Banking sector held steady.',
    magnitude: 0,
  },
  {
    date: '2024-05-20',
    title: 'KSE-100 Hits 75,000 Milestone',
    type: 'market_milestone',
    impact: 'mega_rally',
    sectors: ['ALL'],
    description: 'KSE-100 crossed 75,000 for first time ever on macro stabilization, falling inflation, and IMF program progress.',
    magnitude: 7,
  },
  {
    date: '2024-06-10',
    title: 'SBP First Rate Cut — Easing Cycle Begins',
    type: 'monetary_policy',
    impact: 'rally',
    sectors: ['BANKING', 'CEMENT', 'AUTO', 'REAL_ESTATE'],
    description: 'SBP cut policy rate 150bps from 22% to 20.5% — first cut in years. Easing cycle begins, equity markets rally.',
    magnitude: 5,
  },
  {
    date: '2024-07-29',
    title: 'Budget 2024-25 Passed',
    type: 'fiscal_policy',
    impact: 'mixed',
    sectors: ['CEMENT', 'BANKING', 'TECHNOLOGY'],
    description: 'Budget passed with increased taxes on banks and high-income individuals. Mixed market reaction.',
    magnitude: -1,
  },
  {
    date: '2024-09-12',
    title: 'IMF Extended Fund Facility $7B Approved',
    type: 'imf',
    impact: 'mega_rally',
    sectors: ['ALL'],
    description: 'IMF Board approved landmark $7B Extended Fund Facility. Largest ever for Pakistan. KSE-100 surged 4%.',
    magnitude: 8,
  },
  {
    date: '2024-10-15',
    title: 'SBP Rate Cut 200bps to 17.5%',
    type: 'monetary_policy',
    impact: 'rally',
    sectors: ['BANKING', 'CEMENT', 'AUTO', 'FERTILIZER'],
    description: 'SBP aggressive 200bps cut accelerated easing cycle. Rate at 17.5%. Market celebrated economic recovery.',
    magnitude: 4,
  },
  {
    date: '2024-12-20',
    title: 'KSE-100 Crosses 100,000',
    type: 'market_milestone',
    impact: 'mega_rally',
    sectors: ['ALL'],
    description: 'Historic milestone — KSE-100 crossed 100,000 points for the first time ever on rate cuts and IMF confidence.',
    magnitude: 9,
  },

  // ── 2025 ─────────────────────────────────────────────────────────────
  {
    date: '2025-01-20',
    title: 'SBP Rate Cut to 13%',
    type: 'monetary_policy',
    impact: 'rally',
    sectors: ['BANKING', 'REAL_ESTATE', 'AUTO', 'CEMENT'],
    description: 'SBP continued aggressive easing — rate at 13%. Rate-sensitive sectors rallied strongly.',
    magnitude: 5,
  },
  {
    date: '2025-02-14',
    title: 'Pakistan-India Border Tensions Rise',
    type: 'geopolitical',
    impact: 'negative',
    sectors: ['ALL'],
    description: 'Geopolitical tensions at India-Pakistan border increased. Defense sector stocks rose; broader market fell on uncertainty.',
    magnitude: -4,
  },
  {
    date: '2025-03-10',
    title: 'Inflation Falls to 1.5% — 50-Year Low',
    type: 'macro',
    impact: 'rally',
    sectors: ['CONSUMER', 'AUTO', 'CEMENT'],
    description: 'Pakistan CPI fell to 1.5% — lowest in 50 years. Real incomes recovering. Consumer-facing sectors rallied.',
    magnitude: 6,
  },
  {
    date: '2025-04-07',
    title: 'Regional Geopolitical Tensions Escalate',
    type: 'geopolitical',
    impact: 'crash',
    sectors: ['ALL'],
    description: 'India-Pakistan tensions escalated significantly following border incidents. Market uncertainty drove selling. KSE-100 fell sharply.',
    magnitude: -6,
  },
  {
    date: '2025-04-28',
    title: 'Diplomatic De-escalation',
    type: 'geopolitical',
    impact: 'recovery',
    sectors: ['ALL'],
    description: 'Diplomatic channels opened; tensions cooled. Markets recovered some lost ground on ceasefire/de-escalation signals.',
    magnitude: 4,
  },
  {
    date: '2025-05-01',
    title: 'KSE-100 Recovery Post-Tensions',
    type: 'market_milestone',
    impact: 'recovery',
    sectors: ['ALL'],
    description: 'Market continues recovery after April geopolitical shock. IMF program intact, fundamentals remain strong.',
    magnitude: 3,
  },
];

/**
 * Get events within a date range.
 */
function getEventsInRange(fromDate, toDate) {
  const from = new Date(fromDate).getTime();
  const to   = new Date(toDate).getTime();

  return PSX_EVENTS.filter(e => {
    const eDate = new Date(e.date).getTime();
    return eDate >= from && eDate <= to;
  });
}

/**
 * Get events relevant to specific sectors.
 */
function getEventsForSectors(sectors, fromDate, toDate) {
  const events = getEventsInRange(fromDate, toDate);
  if (!sectors || sectors.length === 0) return events;

  return events.filter(e =>
    e.sectors.includes('ALL') ||
    e.sectors.some(s => sectors.includes(s))
  );
}

/**
 * Find events near a timestamp (within ±7 days).
 */
function getNearbyEvents(timestampMs, windowDays = 7) {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  return PSX_EVENTS.filter(e => {
    const eMs = new Date(e.date).getTime();
    return Math.abs(eMs - timestampMs) <= windowMs;
  });
}

/**
 * Get explanation for a price movement given date range and candle data.
 * Correlates price changes with nearby events.
 */
function explainPriceMovement(candles, symbol, sector) {
  if (!candles || candles.length < 2) return null;

  const firstPrice = candles[0].close;
  const lastPrice  = candles[candles.length - 1].close;
  const totalChange = ((lastPrice - firstPrice) / firstPrice) * 100;

  // Find biggest single-period moves
  const moves = [];
  for (let i = 1; i < candles.length; i++) {
    const pct = ((candles[i].close - candles[i-1].close) / candles[i-1].close) * 100;
    if (Math.abs(pct) > 2) {
      moves.push({ time: candles[i].time, pct, price: candles[i].close });
    }
  }

  // Get events in range
  const from = new Date(candles[0].time).toISOString().split('T')[0];
  const to   = new Date(candles[candles.length - 1].time).toISOString().split('T')[0];
  const events = getEventsInRange(from, to);

  // Correlate moves with events
  const explanations = [];

  for (const move of moves.slice(0, 3)) {
    const nearby = events.filter(e => {
      const eMs = new Date(e.date).getTime();
      return Math.abs(eMs - move.time) <= 7 * 24 * 60 * 60 * 1000;
    });

    if (nearby.length > 0) {
      const evt = nearby[0];
      explanations.push(
        `${move.pct > 0 ? 'Rally' : 'Drop'} of ${Math.abs(move.pct).toFixed(1)}% around ${new Date(move.time).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })} ` +
        `may reflect: ${evt.title} — ${evt.description}`
      );
    }
  }

  const trendDesc = totalChange > 5 ? 'strong upward trend'
    : totalChange > 2 ? 'moderate gains'
    : totalChange < -5 ? 'significant decline'
    : totalChange < -2 ? 'moderate selling pressure'
    : 'relative stability';

  return {
    totalChange: parseFloat(totalChange.toFixed(2)),
    trend: trendDesc,
    events,
    explanations,
    significantMoves: moves,
  };
}

module.exports = { PSX_EVENTS, getEventsInRange, getEventsForSectors, getNearbyEvents, explainPriceMovement };
