'use strict';

const { getSession } = require('../storage/sessionStore');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = getSession(token);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.authToken = token;
  req.user = session.user;
  next();
}

module.exports = {
  requireAuth,
};
