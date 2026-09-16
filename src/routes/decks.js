const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function findDeckForUser(deckId, userId) {
  const [rows] = await pool.execute(`
    SELECT d.*, u.username,
      (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS card_count
    FROM decks d JOIN users u ON u.id = d.user_id
    WHERE d.id = ? AND d.user_id = ?
  `, [deckId, userId]);
  return rows[0];
}

async function deckAccess(req, res, next) {
  try {
    const [rows] = await pool.execute('SELECT id, user_id FROM decks WHERE id = ?', [req.params.id]);
    const deck = rows[0];
    if (!deck) return res.status(404).render('error.html', { title: 'Не найдено', status: 404, message: 'Колода не найдена.' });
    if (deck.user_id !== req.session.userId) return res.status(403).render('error.html', { title: 'Доступ запрещен', status: 403, message: 'У вас нет доступа к этой колоде.' });
    req.deck = deck;
    return next();
  } catch (error) {
    return next(error);
  }
}

router.use(requireAuth);

router.get('/dashboard', async (req, res, next) => {
  try {
    const [decks] = await pool.execute(`
      SELECT d.id, d.title, d.description, d.created_at, COUNT(c.id) AS card_count
      FROM decks d LEFT JOIN cards c ON c.deck_id = d.id
      WHERE d.user_id = ? GROUP BY d.id ORDER BY d.created_at DESC
    `, [req.session.userId]);
    res.render('dashboard.html', { title: 'Мои колоды', decks, errors: [], form: {} });
  } catch (error) {
    next(error);
  }
});

router.post('/decks', async (req, res, next) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  if (!title) {
    const [decks] = await pool.execute(
      'SELECT d.*, COUNT(c.id) AS card_count FROM decks d LEFT JOIN cards c ON c.deck_id = d.id WHERE d.user_id = ? GROUP BY d.id ORDER BY d.created_at DESC',
      [req.session.userId]
    );
    return res.status(400).render('dashboard.html', { title: 'Мои колоды', decks, errors: ['Название колоды обязательно.'], form: { title, description } });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO decks (user_id, title, description) VALUES (?, ?, ?)',
      [req.session.userId, title, description]
    );
    return res.redirect(`/decks/${result.insertId}`);
  } catch (error) {
    return next(error);
  }
});

router.get('/decks/:id', deckAccess, async (req, res, next) => {
  try {
    const deck = await findDeckForUser(req.params.id, req.session.userId);
    const [cards] = await pool.execute('SELECT id, question, answer FROM cards WHERE deck_id = ? ORDER BY id', [req.params.id]);
    res.render('deck.html', { title: deck.title, deck, cards, errors: [] });
  } catch (error) {
    next(error);
  }
});

router.post('/decks/:id/cards', deckAccess, async (req, res, next) => {
  const question = String(req.body.question || '').trim();
  const answer = String(req.body.answer || '').trim();
  if (!question || !answer) {
    const deck = await findDeckForUser(req.params.id, req.session.userId);
    const [cards] = await pool.execute('SELECT id, question, answer FROM cards WHERE deck_id = ? ORDER BY id', [req.params.id]);
    return res.status(400).render('deck.html', { title: deck.title, deck, cards, errors: ['Вопрос и ответ обязательны.'] });
  }
  try {
    await pool.execute('INSERT INTO cards (deck_id, question, answer) VALUES (?, ?, ?)', [req.params.id, question, answer]);
    return res.redirect(`/decks/${req.params.id}`);
  } catch (error) {
    return next(error);
  }
});

router.post('/decks/:id/cards/:cardId/delete', deckAccess, async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM cards WHERE id = ? AND deck_id = ?', [req.params.cardId, req.params.id]);
    return res.redirect(`/decks/${req.params.id}`);
  } catch (error) {
    return next(error);
  }
});

router.get('/decks/:id/study', deckAccess, async (req, res, next) => {
  try {
    const deck = await findDeckForUser(req.params.id, req.session.userId);
    const [cards] = await pool.execute('SELECT id, question, answer FROM cards WHERE deck_id = ? ORDER BY id', [req.params.id]);
    res.render('study.html', { title: `Изучение: ${deck.title}`, deck, cards });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
