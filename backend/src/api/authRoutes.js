'use strict';

const express = require('express');
const { authenticate } = require('../storage/userStore');
const { createSession, destroySession, getSession } = require('../storage/sessionStore');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  try {
    const user = authenticate(username, password);
    const token = createSession(user);
    res.json({ user, token, timestamp: Date.now() });
  } catch (err) {
    const message = err.message === 'Access Denied' ? 'Access Denied' : 'Invalid credentials';
    res.status(401).json({ error: message });
  }
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = getSession(token);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({ user: session.user, timestamp: Date.now() });
});

router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (token) {
    destroySession(token);
  }
  res.json({ success: true });
});

module.exports = router;
