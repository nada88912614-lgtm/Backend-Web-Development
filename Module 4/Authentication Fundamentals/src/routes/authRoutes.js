const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db/prisma');

const router = express.Router();

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

router.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body || {};
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedName || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || typeof password !== 'string' || password.length === 0 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'A name, valid email, and password of at most 72 bytes are required' },
    });
  }

  try {
    const cost = Number(process.env.BCRYPT_COST || 12);
    if (!Number.isInteger(cost) || cost < 4 || cost > 31) {
      throw new Error('BCRYPT_COST must be an integer between 4 and 31');
    }

    const passwordHash = await bcrypt.hash(password, cost);
    const user = await prisma.user.create({
      data: { name: normalizedName, email: normalizedEmail, passwordHash },
    });
    return res.status(201).json({ user: safeUser(user) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists' } });
    }
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || typeof password !== 'string' || password.length === 0) {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const passwordMatches = user && await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }
    return res.status(200).json({ user: safeUser(user) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
