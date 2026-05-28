'use strict';

const { randomBytes } = require('crypto');

const sessions = new Map();

function createSession(user) {
  const token = randomBytes(24).toString('hex');
  sessions.set(token, {
    token,
    user,
    createdAt: new Date().toISOString(),
  });
  return token;
}

function getSession(token) {
  if (!token || typeof token !== 'string') return null;
  return sessions.get(token) || null;
}

function destroySession(token) {
  if (!token || typeof token !== 'string') return false;
  return sessions.delete(token);
}

module.exports = {
  createSession,
  getSession,
  destroySession,
};
