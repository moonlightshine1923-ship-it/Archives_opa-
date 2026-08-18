const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/role');

// ===== LISTER LES ENTRÉES DU JOURNAL =====
router.get('/', auth, roleCheck(80), async (req, res) => {
  try {
    if (req.user.role_niveau < 80) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    let query = `
      SELECT ja.*, u.nom as user_nom, u.prenom as user_prenom, u.email as user_email
      FROM journal_audit ja 
      LEFT JOIN users u ON ja.user_id = u.id`;
    const params = [];
    const conditions = [];

    if (req.query.user_id) {
      conditions.push('ja.user_id = ?');
      params.push(req.query.user_id);
    }
    if (req.query.action) {
      conditions.push('ja.action LIKE ?');
      params.push(`%${req.query.action}%`);
    }
    if (req.query.table) {
      conditions.push('ja.table_concernee = ?');
      params.push(req.query.table);
    }
    if (req.query.date_debut) {
      conditions.push('ja.date_action >= ?');
      params.push(req.query.date_debut);
    }
    if (req.query.date_fin) {
      conditions.push('ja.date_action <= ?');
      params.push(req.query.date_fin);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY ja.date_action DESC LIMIT 500';

    const [entries] = await db.query(query, params);
    res.json(entries);
  } catch (error) {
    console.error('Erreur journal audit:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== STATISTIQUES D'ACTIVITÉ =====
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role_niveau < 80) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const [byAction] = await db.query(
      `SELECT action, COUNT(*) as count FROM journal_audit 
       WHERE date_action >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY action ORDER BY count DESC`
    );

    const [byUser] = await db.query(
      `SELECT u.nom, u.prenom, COUNT(ja.id) as count
       FROM journal_audit ja JOIN users u ON ja.user_id = u.id
       WHERE ja.date_action >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY ja.user_id ORDER BY count DESC LIMIT 10`
    );

    const [byDay] = await db.query(
      `SELECT DATE(date_action) as date, COUNT(*) as count
       FROM journal_audit 
       WHERE date_action >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(date_action) ORDER BY date DESC`
    );

    res.json({ by_action: byAction, by_user: byUser, by_day: byDay });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
