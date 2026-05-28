'use strict';

const path = require('path');
const { randomBytes, scryptSync, timingSafeEqual } = require('crypto');
const { readJson, writeJson, ensureDirectory } = require('./fileStore');

const DATA_DIR = path.resolve(__dirname, '../data');
const USER_FILE = path.join(DATA_DIR, 'users.json');
const DEFAULT_USERNAME = 'faizan';
const DEFAULT_PASSWORD = '123';

function hashPassword(password, salt = null) {
  const safeSalt = salt || randomBytes(16).toString('hex');
  const derived = scryptSync(String(password), safeSalt, 64);
  return `${safeSalt}$${derived.toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const derived = scryptSync(String(password), salt, 64);
  return timingSafeEqual(Buffer.from(hash, 'hex'), derived);
}

function buildDefaultUser() {
  return {
    id: DEFAULT_USERNAME,
    username: DEFAULT_USERNAME,
    role: 'admin',
    accountType: 'single_user',
    passwordHash: hashPassword(DEFAULT_PASSWORD),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadUsers() {
  ensureDirectory(DATA_DIR);
  const data = readJson(USER_FILE, {});
  if (!data || typeof data !== 'object' || !data.users || !data.users[DEFAULT_USERNAME]) {
    const seed = buildDefaultUser();
    const users = { [DEFAULT_USERNAME]: seed };
    writeJson(USER_FILE, { users });
    return users;
  }
  return data.users;
}

const users = loadUsers();

function getUserByUsername(username) {
  if (!username || typeof username !== 'string') return null;
  return users[username.toLowerCase()] || null;
}

function getUserById(id) {
  if (!id || typeof id !== 'string') return null;
  return users[id] || null;
}

function authenticate(username, password) {
  if (!username || String(username).toLowerCase() !== DEFAULT_USERNAME) {
    throw new Error('Access Denied');
  }
  const user = getUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid credentials');
  }
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    accountType: user.accountType,
  };
}

module.exports = {
  authenticate,
  getUserByUsername,
  getUserById,
};
