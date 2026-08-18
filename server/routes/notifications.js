const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ===== LISTER LES NOTIFICATIONS =====
router.get('/', auth, async (req, res) => {
  try {
    const [notifs] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY date_creation DESC LIMIT 50',
      [req.user.id]
    );
    res.json(notifs);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== MARQUER COMME LUE =====
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET lu = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Notification lue.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== MARQUER TOUTES COMME LUES =====
router.patch('/read-all', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET lu = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Toutes les notifications lues.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== COMPTEUR NON LUES =====
router.get('/unread-count', auth, async (req, res) => {
  try {
    const [[result]] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND lu = 0',
      [req.user.id]
    );
    res.json({ count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
