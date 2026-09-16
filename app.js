const path = require('path');
const express = require('express');
const ejs = require('ejs');
const session = require('express-session');
const { port, sessionSecret, isProduction } = require('./src/config');
const { pool, initializeDatabase } = require('./src/db');
const indexRoutes = require('./src/routes/index');
const authRoutes = require('./src/routes/auth');
const deckRoutes = require('./src/routes/decks');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.engine('html', ejs.renderFile);
app.locals.siteName = 'Flashwise';
app.locals.escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use(async (req, res, next) => {
  try {
    const [users] = req.session.userId
      ? await pool.execute('SELECT id, username, email, created_at FROM users WHERE id = ?', [req.session.userId])
      : [[]];
    res.locals.currentUser = users[0] || null;
    next();
  } catch (error) {
    next(error);
  }
});
app.get('/api/session', (req, res) => {
  res.json({
    authenticated: Boolean(req.session.userId),
    userId: req.session.userId || null
  });
});
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', deckRoutes);
app.use((req, res) => res.status(404).render('error.html', { title: 'Не найдено', status: 404, message: 'Страница не найдена.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).render('error.html', { title: 'Ошибка сервера', status: 500, message: 'Что-то пошло не так. Попробуйте еще раз.' });
});

if (require.main === module) {
  initializeDatabase()
    .then(() => app.listen(port, () => console.log(`Flashwise listening on http://localhost:${port}`)))
    .catch((error) => {
      console.error('MySQL connection failed:', error.message);
      process.exitCode = 1;
    });
}

module.exports = app;
