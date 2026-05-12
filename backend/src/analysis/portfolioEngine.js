'use strict';

/**
 * Portfolio Tracker Engine
 * 
 * Features:
 * - Add/remove holdings
 * - Calculate P&L
 * - Track sector exposure
 * - Calculate portfolio volatility
 * - Dividend income estimation
 * - Performance tracking
 */

class PortfolioEngine {
  constructor() {
    this.portfolios = new Map(); // userId -> portfolio object
  }

  /**
   * Initialize a portfolio for a user
   */
  initPortfolio(userId) {
    if (!this.portfolios.has(userId)) {
      this.portfolios.set(userId, {
        userId,
        holdings: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return this.portfolios.get(userId);
  }

  /**
   * Get user portfolio
   */
  getPortfolio(userId) {
    if (!this.portfolios.has(userId)) {
      this.initPortfolio(userId);
    }
    return this.portfolios.get(userId);
  }

  /**
   * Add a holding to the portfolio
   */
  addHolding(userId, holding) {
    const { symbol, quantity, buyPrice, sector, companyName } = holding;

    if (!symbol || !quantity || !buyPrice) {
      throw new Error('Missing required fields: symbol, quantity, buyPrice');
    }

    const portfolio = this.getPortfolio(userId);

    const existingIndex = portfolio.holdings.findIndex((h) => h.symbol === symbol);
    if (existingIndex !== -1) {
      throw new Error(`${symbol} already in portfolio. Update instead.`);
    }

    const holdingObj = {
      id: `${symbol}_${Date.now()}`,
      symbol,
      quantity: Number(quantity),
      buyPrice: Number(buyPrice),
      sector: sector || 'Unknown',
      companyName: companyName || symbol,
      addedAt: new Date().toISOString(),
    };

    portfolio.holdings.push(holdingObj);
    portfolio.updatedAt = new Date().toISOString();

    return holdingObj;
  }

  /**
   * Update a holding
   */
  updateHolding(userId, holdingId, updates) {
    const portfolio = this.getPortfolio(userId);
    const holding = portfolio.holdings.find((h) => h.id === holdingId);

    if (!holding) throw new Error('Holding not found');

    Object.assign(holding, updates);
    portfolio.updatedAt = new Date().toISOString();

    return holding;
  }

  /**
   * Remove a holding
   */
  removeHolding(userId, holdingId) {
    const portfolio = this.getPortfolio(userId);
    const index = portfolio.holdings.findIndex((h) => h.id === holdingId);

    if (index === -1) throw new Error('Holding not found');

    const removed = portfolio.holdings.splice(index, 1)[0];
    portfolio.updatedAt = new Date().toISOString();

    return removed;
  }

  /**
   * Calculate portfolio performance
   */
  calculatePerformance(portfolio, currentPrices) {
    // currentPrices: { symbol: price }

    let totalInvestment = 0;
    let totalCurrentValue = 0;
    const holdings = [];

    for (const holding of portfolio.holdings) {
      const currentPrice = currentPrices[holding.symbol] || holding.buyPrice;
      const investmentValue = holding.quantity * holding.buyPrice;
      const currentValue = holding.quantity * currentPrice;
      const unrealizedPL = currentValue - investmentValue;
      const unrealizedPLPercent = (unrealizedPL / investmentValue) * 100;

      totalInvestment += investmentValue;
      totalCurrentValue += currentValue;

      holdings.push({
        ...holding,
        currentPrice,
        investmentValue: Number(investmentValue.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        unrealizedPL: Number(unrealizedPL.toFixed(2)),
        unrealizedPLPercent: Number(unrealizedPLPercent.toFixed(2)),
      });
    }

    const totalUnrealizedPL = totalCurrentValue - totalInvestment;
    const totalUnrealizedPLPercent = totalInvestment > 0 ? (totalUnrealizedPL / totalInvestment) * 100 : 0;

    return {
      holdings,
      summary: {
        totalInvestment: Number(totalInvestment.toFixed(2)),
        totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
        totalUnrealizedPL: Number(totalUnrealizedPL.toFixed(2)),
        totalUnrealizedPLPercent: Number(totalUnrealizedPLPercent.toFixed(2)),
        holdingCount: holdings.length,
      },
    };
  }

  /**
   * Calculate sector exposure
   */
  calculateSectorExposure(portfolio, currentPrices) {
    const sectors = {};

    for (const holding of portfolio.holdings) {
      const currentPrice = currentPrices[holding.symbol] || holding.buyPrice;
      const currentValue = holding.quantity * currentPrice;
      const sector = holding.sector || 'Unknown';

      if (!sectors[sector]) {
        sectors[sector] = {
          sector,
          holdings: [],
          totalValue: 0,
          percentage: 0,
        };
      }

      sectors[sector].holdings.push(holding.symbol);
      sectors[sector].totalValue += currentValue;
    }

    // Calculate percentages
    let grandTotal = 0;
    for (const sector of Object.values(sectors)) {
      grandTotal += sector.totalValue;
    }

    for (const sector of Object.values(sectors)) {
      sector.percentage = grandTotal > 0 ? (sector.totalValue / grandTotal) * 100 : 0;
      sector.percentage = Number(sector.percentage.toFixed(2));
      sector.totalValue = Number(sector.totalValue.toFixed(2));
    }

    return Object.values(sectors).sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * Calculate portfolio volatility
   */
  calculateVolatility(holdings, volatilityData) {
    // volatilityData: { symbol: volatility }

    if (holdings.length === 0) return 0;

    let weightedVolatility = 0;
    let totalValue = 0;

    for (const holding of holdings) {
      const value = holding.investmentValue || holding.quantity * holding.buyPrice;
      const volatility = volatilityData[holding.symbol] || 5;
      weightedVolatility += volatility * value;
      totalValue += value;
    }

    if (totalValue === 0) return 0;
    return Number((weightedVolatility / totalValue).toFixed(2));
  }

  /**
   * Estimate dividend income
   */
  estimateDividendIncome(holdings, dividendData) {
    // dividendData: { symbol: { yield, payout } }

    let totalDividendIncome = 0;

    for (const holding of holdings) {
      const divData = dividendData[holding.symbol];
      if (!divData) continue;

      const currentValue = holding.quantity * (holding.currentPrice || holding.buyPrice);
      const expectedDividend = (currentValue * divData.yield) / 100;
      totalDividendIncome += expectedDividend;
    }

    return Number(totalDividendIncome.toFixed(2));
  }

  /**
   * Get portfolio stats
   */
  getStats(userId) {
    const portfolio = this.getPortfolio(userId);
    return {
      userId,
      holdingCount: portfolio.holdings.length,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
    };
  }
}

// Singleton instance
let instance = null;

function getPortfolioEngine() {
  if (!instance) instance = new PortfolioEngine();
  return instance;
}

module.exports = { PortfolioEngine, getPortfolioEngine };
