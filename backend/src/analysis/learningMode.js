'use strict';

/**
 * Beginner Learning Mode Engine
 * 
 * Provides contextual educational content for new investors:
 * - Term definitions
 * - Concept explanations
 * - Interactive tooltips
 * - Stock education
 * - Risk management tips
 */

const LEARNING_CONTENT = {
  // Market Concepts
  marketCap: {
    term: 'Market Capitalization',
    shortDefinition: 'Total value of all shares',
    explanation:
      'Market cap = Current Stock Price × Total Shares. It shows how much investors believe the company is worth.',
    example: 'If a company has 100M shares at 500 each, its market cap is 50 billion PKR.',
    significance: 'Used to categorize companies by size: Large-cap (stable), Mid-cap (growth), Small-cap (risky).',
  },

  earnings: {
    term: 'Earnings Per Share (EPS)',
    shortDefinition: 'Profit divided by number of shares',
    explanation:
      'EPS = Net Profit ÷ Total Shares. Shows how much profit each share generates.',
    example: 'A company with 1B profit and 100M shares has EPS of 10 PKR per share.',
    significance: 'Higher EPS = More profitable company. Used to compare profitability.',
  },

  peRatio: {
    term: 'Price-to-Earnings Ratio (P/E)',
    shortDefinition: 'Price per unit of earnings',
    explanation: 'P/E = Stock Price ÷ EPS. Shows if a stock is expensive or cheap relative to profits.',
    example: 'Stock at 500 with EPS of 10 has P/E of 50 (you pay 50 rupees for every 1 rupee of earnings).',
    significance:
      'Low P/E = Possibly undervalued. High P/E = Possibly overvalued or high-growth company.',
  },

  dividend: {
    term: 'Dividend',
    shortDefinition: 'Profit share paid to shareholders',
    explanation:
      'Companies distribute portion of profits to shareholders. Can be cash or additional shares.',
    example: 'A company might pay 10 rupees per share as annual dividend.',
    significance: 'Provides regular income. Often paid by mature, profitable companies.',
  },

  volume: {
    term: 'Trading Volume',
    shortDefinition: 'Number of shares traded per day',
    explanation: 'Shows how actively a stock is being bought/sold. Higher volume = more liquidity.',
    example: 'PSO volume of 5M shares means 5 million shares traded today.',
    significance: 'High volume = easier to buy/sell. Low volume = may have difficulty exiting position.',
  },

  // Risk Concepts
  volatility: {
    term: 'Volatility',
    shortDefinition: 'How much stock price swings',
    explanation: 'Measures how dramatically prices change. High volatility = risky but potentially rewarding.',
    example: 'Stock A moves 5% daily. Stock B moves 0.5% daily. A is more volatile.',
    significance: 'High volatility = higher risk. Choose based on risk tolerance.',
  },

  rsi: {
    term: 'RSI (Relative Strength Index)',
    shortDefinition: 'Measures if stock is overbought or oversold',
    explanation: 'Ranges 0-100. Below 30 = oversold (might bounce). Above 70 = overbought (might correct).',
    example: 'RSI of 25 suggests stock may be too weak and could recover soon.',
    significance: 'Used to time entries/exits. Extreme values can signal reversals.',
  },

  supportResistance: {
    term: 'Support & Resistance',
    shortDefinition: 'Price levels where buyers/sellers step in',
    explanation:
      'Support = Price level where stock tends to bounce up. Resistance = Price level where stock tends to pull back.',
    example: 'Stock bounces at 400 multiple times (support). Can\'t break 450 (resistance).',
    significance: 'Helps predict where price might go next. Breakouts signal trend changes.',
  },

  // Strategy Concepts
  diversification: {
    term: 'Diversification',
    shortDefinition: 'Spreading investments across different stocks/sectors',
    explanation: 'Reduces risk by not putting all money in one stock. If one drops, others may hold value.',
    example: 'Instead of buying only Bank stocks, own Energy, Tech, and Pharma too.',
    significance: 'Reduces portfolio volatility. "Don\'t put all eggs in one basket."',
  },

  stopLoss: {
    term: 'Stop Loss',
    shortDefinition: 'Automated order to sell if stock drops too much',
    explanation: 'You set a price level. If stock falls below it, it automatically sells to limit losses.',
    example: 'Buy at 500, set stop loss at 450. If it drops to 450, it auto-sells.',
    significance: 'Protects against catastrophic losses. Essential risk management tool.',
  },

  takeProfits: {
    term: 'Take Profits',
    shortDefinition: 'Selling portion of gains to lock in profits',
    explanation: 'Don\'t be greedy. Sell some shares when they\'ve gained significantly.',
    example: 'Stock was 400, now 600 (+50%). Sell half to lock in 100PKR profit on those shares.',
    significance: 'Prevents losing gains to corrections. Disciplined approach.',
  },

  // Market Phases
  bullMarket: {
    term: 'Bull Market',
    shortDefinition: 'Period when prices are rising',
    explanation: 'Market sentiment is positive. Stocks go up. Business is good.',
    example: '2020-2021 was a bull market in PSX. Stocks kept climbing.',
    significance: 'Good time to invest (but don\'t chase FOMO). Historically average 15% annual returns.',
  },

  bearMarket: {
    term: 'Bear Market',
    shortDefinition: 'Period when prices are falling',
    explanation: 'Market sentiment is negative. Stocks go down. Fear is high.',
    example: '2022 had bearish stretches due to economic challenges.',
    significance:
      'Scary but creates opportunities. Fortunes built by buying during downturns.',
  },

  // Beginner Risk Tips
  riskTips: [
    'Never invest money you can\'t afford to lose.',
    'Start with large-cap (safer) companies before small-cap (riskier).',
    'Diversify across at least 10-15 different stocks.',
    'Keep 3-6 months of expenses as emergency fund before investing.',
    'Use stop losses to limit downside.',
    'Don\'t check prices daily - increases anxiety and poor decisions.',
    'Avoid trading on emotion. Use data and analysis.',
    'Stocks are long-term. Minimum 3-5 year horizon recommended.',
    'If you don\'t understand a company, don\'t buy it.',
    'Past performance doesn\'t guarantee future results.',
  ],

  // Beginner Success Tips
  successTips: [
    'Start small with amounts you\'re comfortable with.',
    'Do your own research (DYOR) before buying.',
    'Follow company earnings reports and news.',
    'Join investment communities to learn from others.',
    'Keep detailed records of purchases/sales.',
    'Review portfolio quarterly, not daily.',
    'Focus on quality companies with strong fundamentals.',
    'Invest consistently over time (rupee cost averaging).',
    'Read financial news and understand macroeconomics.',
    'Learn from mistakes. Every investor makes them.',
  ],
};

class LearningMode {
  constructor() {
    this.enabled = true;
  }

  /**
   * Get explanation for a term
   */
  getTerm(termKey) {
    return LEARNING_CONTENT[termKey] || null;
  }

  /**
   * Get all learning content
   */
  getAllTerms() {
    return LEARNING_CONTENT;
  }

  /**
   * Get contextual explanations for stock data
   */
  explainStockMetrics(stock) {
    const explanations = [];

    if (stock.change > 5) {
      explanations.push({
        metric: 'Large Daily Change',
        explanation: `${stock.symbol} moved ${stock.change}% today. This is significant movement.`,
        tip: 'Check if there\'s news. Large moves often coincide with news events.',
      });
    }

    if (stock.volume > stock.avgVolume * 2) {
      explanations.push({
        metric: 'High Volume',
        explanation: 'Volume is unusually high - more shares traded than typical.',
        tip: 'High volume on price moves = more conviction from traders. Pay attention.',
      });
    }

    if (stock.pe > 30) {
      explanations.push({
        metric: 'High P/E Ratio',
        explanation: `This stock is trading at a high multiple. You\'re paying a lot for each rupee of earnings.`,
        tip: 'High P/E = High expectations. Risk is if company fails to meet growth forecasts.',
      });
    }

    if (stock.pe < 10 && stock.earnings > 0) {
      explanations.push({
        metric: 'Low P/E Ratio',
        explanation: `This stock looks cheap relative to earnings.`,
        tip: 'Could be undervalued OR there\'s a reason it\'s cheap. Research before assuming it\'s a bargain.',
      });
    }

    if (stock.dividendYield > 5) {
      explanations.push({
        metric: 'High Dividend Yield',
        explanation: `This company pays ${stock.dividendYield}% annual dividend. Good income source.`,
        tip: 'High yield can be attractive but verify dividend sustainability.',
      });
    }

    return explanations;
  }

  /**
   * Get beginner-friendly risk assessment
   */
  assessRisk(stock) {
    let riskScore = 0;
    const factors = [];

    if (stock.change > 10 || stock.change < -10) {
      riskScore += 2;
      factors.push('High daily volatility');
    }

    if (stock.volume < stock.avgVolume * 0.5) {
      riskScore += 1;
      factors.push('Low trading volume (hard to exit)');
    }

    if (stock.marketCap < 10000000000) {
      riskScore += 2;
      factors.push('Small company (higher risk)');
    }

    if (stock.pe > 40) {
      riskScore += 1;
      factors.push('High valuation (expensive)');
    }

    let riskLevel = 'Low Risk';
    if (riskScore <= 2) riskLevel = 'Low Risk';
    else if (riskScore <= 4) riskLevel = 'Medium Risk';
    else if (riskScore <= 6) riskLevel = 'High Risk';
    else riskLevel = 'Very High Risk';

    return {
      riskLevel,
      riskScore,
      factors,
      recommendation:
        riskScore > 6
          ? 'Consider this a speculative play. Only invest amount you can afford to lose.'
          : riskScore > 4
            ? 'Medium risk. Good for experienced investors.'
            : 'Lower risk. Suitable for most portfolios.',
    };
  }

  /**
   * Get tips based on market condition
   */
  getTips(condition) {
    const tips = {
      bullMarket: [
        'Don\'t get FOMO. Bull markets can create overconfidence.',
        'Take some profits at highs to lock in gains.',
        'Don\'t forget about diversification.',
        'Quality matters less in bull markets, but it still matters.',
        'Prepare for eventual corrections.',
      ],
      bearMarket: [
        'Bear markets are temporary. History shows markets always recover.',
        'Consider buying quality stocks at discounted prices.',
        'Don\'t panic sell. Stick to your plan.',
        'Use downturns to learn and research.',
        'Patient investors build wealth in bear markets.',
      ],
      highVolatility: [
        'Volatility creates opportunities for disciplined investors.',
        'Use limit orders instead of market orders.',
        'Avoid making emotional decisions.',
        'This is not the time to go all-in.',
        'Having cash ready helps you buy dips.',
      ],
      lowVolatility: [
        'Boring markets are often the safest for new investors.',
        'Use this time to build positions slowly.',
        'Research companies thoroughly.',
        'Dollar-cost averaging works well here.',
        'This is educational time, not action time.',
      ],
    };

    return tips[condition] || [];
  }

  /**
   * Explain portfolio concept
   */
   getPortfolioGuidance() {
    return {
      allocation: {
        beginner: {
          stocks: 50,
          cash: 30,
          bonds: 20,
          description: 'Conservative approach for learning phase',
        },
        intermediate: {
          stocks: 70,
          cash: 10,
          bonds: 20,
          description: 'Balanced growth and income',
        },
        aggressive: {
          stocks: 85,
          cash: 5,
          bonds: 10,
          description: 'Growth-focused for long-term investors',
        },
      },
      sectorGuidance: {
        description: 'Diversify across different sectors to reduce risk',
        example: 'Instead of all banks, own: Banks 20%, Energy 20%, Pharma 20%, Tech 20%, Other 20%',
      },
      sizing: {
        maxPosition: 'Never put more than 5-10% of portfolio in one stock (unless very large-cap)',
        example: 'If portfolio is 1M PKR, max position should be 50K-100K',
      },
    };
  }
}

// Singleton instance
let instance = null;

function getLearningMode() {
  if (!instance) instance = new LearningMode();
  return instance;
}

module.exports = { LearningMode, getLearningMode, LEARNING_CONTENT };
