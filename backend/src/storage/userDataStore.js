'use strict';

const path = require('path');
const { readJson, writeJson, ensureDirectory } = require('./fileStore');

const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'user-data.json');

const DEFAULT_TEMPLATE = {
  portfolio: {
    userId: 'faizan',
    holdings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  chatHistory: [],
  transactions: [],
  aiInsights: [],
  watchlists: [],
};

let store = null;

function loadStore() {
  ensureDirectory(DATA_DIR);
  const data = readJson(DATA_FILE, {});
  store = data;
}

function saveStore() {
  if (!store) return;
  writeJson(DATA_FILE, store);
}

function ensureUserData(userId) {
  if (!store) loadStore();
  if (!store[userId]) {
    store[userId] = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE));
    store[userId].portfolio.userId = userId;
    store[userId].portfolio.createdAt = new Date().toISOString();
    store[userId].portfolio.updatedAt = new Date().toISOString();
    saveStore();
  }
  return store[userId];
}

function getUserData(userId) {
  return ensureUserData(userId);
}

function savePortfolio(userId, portfolio) {
  const userData = ensureUserData(userId);
  userData.portfolio = {
    ...userData.portfolio,
    ...portfolio,
    userId,
    updatedAt: new Date().toISOString(),
  };
  saveStore();
  return userData.portfolio;
}

function appendChatEntry(userId, entry) {
  const userData = ensureUserData(userId);
  userData.chatHistory.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...entry,
    createdAt: new Date().toISOString(),
  });
  saveStore();
  return userData.chatHistory;
}

function appendTransaction(userId, transaction) {
  const userData = ensureUserData(userId);
  userData.transactions.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...transaction,
    createdAt: new Date().toISOString(),
  });
  saveStore();
  return userData.transactions;
}

function appendAiInsight(userId, insight) {
  const userData = ensureUserData(userId);
  userData.aiInsights.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...insight,
    createdAt: new Date().toISOString(),
  });
  saveStore();
  return userData.aiInsights;
}

function saveWatchlists(userId, watchlists) {
  const userData = ensureUserData(userId);
  userData.watchlists = watchlists;
  saveStore();
  return userData.watchlists;
}

function getUserSummary(userId) {
  const data = ensureUserData(userId);
  return {
    portfolio: data.portfolio,
    chatHistory: data.chatHistory,
    transactions: data.transactions,
    aiInsights: data.aiInsights,
    watchlists: data.watchlists,
  };
}

loadStore();

module.exports = {
  getUserData,
  savePortfolio,
  appendChatEntry,
  appendTransaction,
  appendAiInsight,
  saveWatchlists,
  getUserSummary,
};
