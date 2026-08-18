const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/role');
const { logAudit, ACTIONS } = require('../utils/audit');

// ===== LISTER LES SALLES =====
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT s.*, o.nom as organisation_nom,
        (SELECT COUNT(*) FROM armoires WHERE salle_id = s.id AND actif = 1) as nb_armoires
      FROM salles s 
      JOIN organisations o ON s.organisation_id = o.id`;
    const params = [];

    if (req.user.role_nom !== 'Super Admin') {
      query += ' WHERE s.organisation_id = ?';
      params.push(req.user.organisation_id);
    }

    query += ' ORDER BY o.nom, s.nom';
    const [salles] = await db.query(query, params);
    res.json(salles);
  } catch (error) {
    console.error('Erreur liste salles:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== OBTENIR UNE SALLE =====
router.get('/:id', auth, async (req, res) => {
  try {
    const [salles] = await db.query(
      `SELECT s.*, o.nom as organisation_nom,
        (SELECT COUNT(*) FROM armoires WHERE salle_id = s.id AND actif = 1) as nb_armoires
       FROM salles s JOIN organisations o ON s.organisation_id = o.id WHERE s.id = ?`,
      [req.params.id]
    );
    if (!salles.length) return res.status(404).json({ error: 'Salle non trouvée.' });
    res.json(salles[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== CRÉER UNE SALLE =====
router.post('/', auth, roleCheck(80), async (req, res) => {
  try {
    const { organisation_id, nom, description } = req.body;

    if (!organisation_id || !nom) {
      return res.status(400).json({ error: 'Organisation et nom requis.' });
    }

    // Vérifier organisation
    if (req.user.role_nom !== 'Super Admin' && req.user.organisation_id !== parseInt(organisation_id)) {
      return res.status(403).json({ error: 'Organisation non autorisée.' });
    }

    const [result] = await db.query(
      'INSERT INTO salles (organisation_id, nom, description) VALUES (?, ?, ?)',
      [organisation_id, nom, description]
    );

    await logAudit({
      userId: req.user.id, action: ACTIONS.CREATE, table: 'salles',
      recordId: result.insertId, details: { organisation_id, nom },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ id: result.insertId, message: 'Salle créée avec succès.' });
  } catch (error) {
    console.error('Erreur création salle:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== MODIFIER UNE SALLE =====
router.put('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    const { nom, description, actif } = req.body;
    const updates = [];
    const params = [];

    if (nom) { updates.push('nom = ?'); params.push(nom); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (actif !== undefined) { updates.push('actif = ?'); params.push(actif); }

    if (!updates.length) return res.status(400).json({ error: 'Aucune modification.' });

    params.push(req.params.id);
    await db.query(`UPDATE salles SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit({
      userId: req.user.id, action: ACTIONS.UPDATE, table: 'salles',
      recordId: req.params.id, details: req.body,
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Salle modifiée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== DÉSACTIVER UNE SALLE =====
router.patch('/:id/disable', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('UPDATE salles SET actif = 0 WHERE id = ?', [req.params.id]);
    await logAudit({
      userId: req.user.id, action: ACTIONS.DISABLE, table: 'salles',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ message: 'Salle désactivée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== ACTIVER UNE SALLE =====
router.patch('/:id/enable', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('UPDATE salles SET actif = 1 WHERE id = ?', [req.params.id]);
    await logAudit({
      userId: req.user.id, action: ACTIONS.ENABLE, table: 'salles',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ message: 'Salle activée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== SUPPRIMER UNE SALLE =====
router.delete('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    const [salles] = await db.query(
      `SELECT s.id, s.nom, s.organisation_id, o.nom as organisation_nom
       FROM salles s
       JOIN organisations o ON s.organisation_id = o.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (!salles.length) {
      return res.status(404).json({ error: 'Salle non trouvée.' });
    }

    const salle = salles[0];

    if (req.user.role_nom !== 'Super Admin' && req.user.organisation_id !== salle.organisation_id) {
      return res.status(403).json({ error: 'Organisation non autorisée.' });
    }

    await db.query('DELETE FROM salles WHERE id = ?', [req.params.id]);

    await logAudit({
      userId: req.user.id,
      action: ACTIONS.DELETE,
      table: 'salles',
      recordId: req.params.id,
      details: {
        nom: salle.nom,
        organisation_id: salle.organisation_id,
        organisation_nom: salle.organisation_nom
      },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Salle supprimée.' });
  } catch (error) {
    console.error('Erreur suppression salle:', error);
    res.status(500).json({
      error: 'Erreur serveur. Vérifiez que la salle ne contient plus de données.'
    });
  }
});

module.exports = router;
