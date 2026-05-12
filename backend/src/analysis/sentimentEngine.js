'use strict';

/**
 * Market Sentiment Engine
 * 
 * Calculates Fear & Greed Index based on:
 * - Volatility (market-wide standard deviation)
 * - Momentum (% of stocks up vs down)
 * - Volume (average trading volume vs historical average)
 * - News Sentiment (% positive vs negative news)
 * - Sector Breadth (# of gaining sectors)
 */

class SentimentEngine {
  constructor() {
    this.sentimentHistory = [];
    this.MAX_HISTORY = 365; // Keep 1 year of data
  }

  /**
   * Calculate market-wide sentiment
   */
  calculateSentiment(stocks, newsData = [], volatility = {}) {
    if (!stocks || stocks.length === 0) {
      return this._getNeutralSentiment();
    }

    // Calculate metrics
    const metrics = {
      volatility: this._calculateVolatility(stocks, volatility),
      momentum: this._calculateMomentum(stocks),
      volume: this._calculateVolume(stocks),
      newsSentiment: this._calculateNewsSentiment(newsData),
      sectorBreadth: this._calculateSectorBreadth(stocks),
    };

    // Calculate Fear & Greed score (0-100)
    // Lower score = fear, Higher score = greed
    const fearGreedScore = this._calculateFearGreedScore(metrics);

    // Determine sentiment level
    let sentimentLevel = 'Neutral';
    if (fearGreedScore < 25) sentimentLevel = 'Extreme Fear';
    else if (fearGreedScore < 45) sentimentLevel = 'Fear';
    else if (fearGreedScore < 55) sentimentLevel = 'Neutral';
    else if (fearGreedScore < 75) sentimentLevel = 'Greed';
    else sentimentLevel = 'Extreme Greed';

    const sentiment = {
      timestamp: new Date().toISOString(),
      fearGreedScore,
      sentimentLevel,
      metrics,
      interpretation: this._getInterpretation(fearGreedScore),
      recommendations: this._getRecommendations(fearGreedScore),
    };

    this.sentimentHistory.push(sentiment);
    if (this.sentimentHistory.length > this.MAX_HISTORY) {
      this.sentimentHistory.shift();
    }

    return sentiment;
  }

  /**
   * Calculate volatility component (0-100 scale)
   */
  _calculateVolatility(stocks, volatilityData) {
    let totalVolatility = 0;

    for (const stock of stocks) {
      const vol = volatilityData[stock.symbol] || Math.abs(stock.change) || 0;
      totalVolatility += vol;
    }

    const avgVolatility = totalVolatility / stocks.length;

    // Normalize: 0-10% = low, 10-20% = medium, 20%+ = high
    // Scale to fear/greed: High volatility = fear (low score)
    if (avgVolatility < 1) return 75;
    if (avgVolatility < 2) return 60;
    if (avgVolatility < 5) return 45;
    if (avgVolatility < 10) return 30;
    return 15;
  }

  /**
   * Calculate momentum component (% up vs down)
   */
  _calculateMomentum(stocks) {
    const up = stocks.filter((s) => s.change > 0).length;
    const down = stocks.filter((s) => s.change < 0).length;
    const total = stocks.length;

    if (total === 0) return 50;

    const upPercent = (up / total) * 100;

    // Scale to 0-100: 0% up = 0 (fear), 100% up = 100 (greed)
    return upPercent;
  }

  /**
   * Calculate volume component
   */
  _calculateVolume(stocks) {
    let totalVolume = 0;
    let totalAvgVolume = 0;

    for (const stock of stocks) {
      totalVolume += stock.volume || 0;
      totalAvgVolume += stock.avgVolume || stock.volume || 0;
    }

    if (totalAvgVolume === 0) return 50;

    const volumeRatio = totalVolume / totalAvgVolume;

    // High volume = engagement/greed, Low volume = complacency/fear
    if (volumeRatio < 0.5) return 25; // Very low volume = fear
    if (volumeRatio < 0.8) return 40;
    if (volumeRatio < 1.2) return 50; // Normal
    if (volumeRatio < 1.5) return 65;
    return 80; // Very high volume = greed
  }

  /**
   * Calculate news sentiment component
   */
  _calculateNewsSentiment(newsData) {
    if (!newsData || newsData.length === 0) return 50;

    const positive = newsData.filter((n) => n.sentiment === 'positive' || n.sentiment === 'bullish').length;
    const negative = newsData.filter((n) => n.sentiment === 'negative' || n.sentiment === 'bearish').length;

    if (positive + negative === 0) return 50;

    return (positive / (positive + negative)) * 100;
  }

  /**
   * Calculate sector breadth (% of sectors up)
   */
  _calculateSectorBreadth(stocks) {
    const sectors = {};

    for (const stock of stocks) {
      const sector = stock.sector || 'Other';
      if (!sectors[sector]) {
        sectors[sector] = { up: 0, total: 0 };
      }
      sectors[sector].total++;
      if (stock.change > 0) sectors[sector].up++;
    }

    let totalUp = 0;
    let totalSectors = 0;

    for (const sector of Object.values(sectors)) {
      totalUp += sector.up;
      totalSectors += sector.total;
    }

    if (totalSectors === 0) return 50;
    return (totalUp / totalSectors) * 100;
  }

  /**
   * Calculate Fear & Greed Score (weighted average)
   */
  _calculateFearGreedScore(metrics) {
    const weights = {
      volatility: 0.25,
      momentum: 0.35,
      volume: 0.20,
      newsSentiment: 0.15,
      sectorBreadth: 0.05,
    };

    let score =
      metrics.volatility * weights.volatility +
      metrics.momentum * weights.momentum +
      metrics.volume * weights.volume +
      metrics.newsSentiment * weights.newsSentiment +
      metrics.sectorBreadth * weights.sectorBreadth;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get human-readable interpretation
   */
  _getInterpretation(score) {
    if (score < 25) {
      return 'Extreme fear is prevalent. Markets are heavily oversold. This may present buying opportunities for contrarian investors.';
    }
    if (score < 45) {
      return 'Fear sentiment dominates. Investors are cautious. Potential volatility expected.';
    }
    if (score < 55) {
      return 'Market sentiment is balanced. No clear directional bias. Normal market conditions.';
    }
    if (score < 75) {
      return 'Greed sentiment is building. Investors are optimistic. Consider risk management.';
    }
    return 'Extreme greed detected. Market may be overheated. Caution advised for risk-averse investors.';
  }

  /**
   * Get personalized recommendations
   */
  _getRecommendations(score) {
    const recommendations = [];

    if (score < 30) {
      recommendations.push('Consider value investing during this fear period.');
      recommendations.push('Look for oversold quality stocks.');
      recommendations.push('Build cash reserves for opportunities.');
    } else if (score < 50) {
      recommendations.push('Reduce speculative positions.');
      recommendations.push('Focus on defensive sectors.');
      recommendations.push('Rebalance portfolio towards safety.');
    } else if (score < 70) {
      recommendations.push('Maintain balanced allocation.');
      recommendations.push('Monitor for overbought conditions.');
      recommendations.push('Consider taking partial profits.');
    } else {
      recommendations.push('Reduce leverage and exposure.');
      recommendations.push('Trim positions with excessive gains.');
      recommendations.push('Increase defensive holdings.');
    }

    return recommendations;
  }

  /**
   * Get neutral sentiment (fallback)
   */
  _getNeutralSentiment() {
    return {
      timestamp: new Date().toISOString(),
      fearGreedScore: 50,
      sentimentLevel: 'Neutral',
      metrics: {
        volatility: 50,
        momentum: 50,
        volume: 50,
        newsSentiment: 50,
        sectorBreadth: 50,
      },
      interpretation: 'Insufficient data. Market sentiment neutral.',
      recommendations: ['Monitor market developments'],
    };
  }

  /**
   * Get historical sentiment data
   */
  getHistory(days = 30) {
    return this.sentimentHistory.slice(-days);
  }

  /**
   * Get sentiment trend
   */
  getTrend(days = 7) {
    const recentData = this.sentimentHistory.slice(-days);
    if (recentData.length < 2) return 'neutral';

    const firstScore = recentData[0].fearGreedScore;
    const lastScore = recentData[recentData.length - 1].fearGreedScore;

    if (lastScore > firstScore + 5) return 'improving';
    if (lastScore < firstScore - 5) return 'deteriorating';
    return 'stable';
  }
}

// Singleton instance
let instance = null;

function getSentimentEngine() {
  if (!instance) instance = new SentimentEngine();
  return instance;
}

module.exports = { SentimentEngine, getSentimentEngine };
