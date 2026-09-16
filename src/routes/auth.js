const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');

const router = express.Router();
const MIN_PASSWORD_LENGTH = 6;

function getSafeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}

function establishSession(req, userId, next, redirectTo) {
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.userId = userId;
    return req.session.save((saveError) => saveError ? next(saveError) : redirectTo());
  });
}

router.get('/register', (req, res) => {
  res.render('register.html', { title: 'Регистрация', errors: [], form: {} });
});

router.post('/register', async (req, res, next) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const errors = [];

  if (!username || !email || !password) errors.push('Заполните все поля.');
  if (password && password.length < MIN_PASSWORD_LENGTH) errors.push('Пароль должен содержать минимум 6 символов.');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push('Введите корректный email.');

  if (errors.length) {
    return res.status(400).render('register.html', { title: 'Регистрация', errors, form: { username, email } });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, passwordHash]);
    return res.redirect('/login?registered=1');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).render('register.html', {
        title: 'Регистрация',
        errors: ['Пользователь с таким логином или email уже существует.'],
        form: { username, email }
      });
    }
    return next(error);
  }
});

router.get('/login', (req, res) => {
  const notice = req.query.registered === '1' ? 'Регистрация прошла успешно. Войдите в аккаунт.' : '';
  res.render('login.html', { title: 'Вход', errors: [], notice, form: { login: '' } });
});

router.post('/login', async (req, res, next) => {
  const login = String(req.body.login || '').trim();
  const password = String(req.body.password || '');
  const [users] = await pool.execute('SELECT id, password_hash FROM users WHERE username = ?', [login]);
  const user = users[0];
  const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!valid) {
    return res.status(401).render('login.html', {
      title: 'Вход',
      errors: ['Неверный логин или пароль'],
      notice: '',
      form: { login }
    });
  }

  const returnTo = getSafeReturnTo(req.session.returnTo);
  delete req.session.returnTo;
  return establishSession(req, user.id, next, () => res.redirect(returnTo));
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('connect.sid');
    return res.redirect('/');
  });
});

module.exports = router;
