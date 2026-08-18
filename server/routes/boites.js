const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/role');
const { logAudit, ACTIONS } = require('../utils/audit');

// ===== LISTER LES BOÎTES =====
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT b.*, a.code_armoire, a.nom as armoire_nom, s.nom as salle_nom, o.id as organisation_id, o.nom as organisation_nom,
        (SELECT COUNT(*) FROM dossiers WHERE boite_id = b.id) as nb_dossiers
      FROM boites b 
      JOIN armoires a ON b.armoire_id = a.id 
      JOIN salles s ON a.salle_id = s.id 
      JOIN organisations o ON s.organisation_id = o.id`;
    const params = [];

    const conditions = [];
    if (req.user.role_nom !== 'Super Admin') {
      conditions.push('o.id = ?');
      params.push(req.user.organisation_id);
    }
    if (req.query.armoire_id) {
      conditions.push('b.armoire_id = ?');
      params.push(req.query.armoire_id);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY o.nom, s.nom, a.code_armoire, b.code_boite';

    const [boites] = await db.query(query, params);
    res.json(boites);
  } catch (error) {
    console.error('Erreur liste boîtes:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== OBTENIR UNE BOÎTE =====
router.get('/:id', auth, async (req, res) => {
  try {
    const [boites] = await db.query(
      `SELECT b.*, a.code_armoire, a.nom as armoire_nom, s.nom as salle_nom, o.id as organisation_id, o.nom as organisation_nom
       FROM boites b 
       JOIN armoires a ON b.armoire_id = a.id 
       JOIN salles s ON a.salle_id = s.id 
       JOIN organisations o ON s.organisation_id = o.id 
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (!boites.length) return res.status(404).json({ error: 'Boîte non trouvée.' });
    res.json(boites[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== CRÉER UNE BOÎTE =====
router.post('/', auth, roleCheck(80), async (req, res) => {
  try {
    const { armoire_id, code_boite, nom, description } = req.body;

    if (!armoire_id || !code_boite || !nom) {
      return res.status(400).json({ error: 'Armoire, code et nom requis.' });
    }

    const [result] = await db.query(
      `INSERT INTO boites (armoire_id, code_boite, nom, description)
       VALUES (?, ?, ?, ?)`,
      [armoire_id, code_boite, nom, description]
    );

    await logAudit({
      userId: req.user.id, action: ACTIONS.CREATE, table: 'boites',
      recordId: result.insertId, details: { code_boite, nom },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ id: result.insertId, message: 'Boîte créée avec succès.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Code boîte déjà existant dans cette armoire.' });
    }
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== MODIFIER UNE BOÎTE =====
router.put('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    const { code_boite, nom, description, actif } = req.body;
    const updates = [];
    const params = [];

    if (code_boite) { updates.push('code_boite = ?'); params.push(code_boite); }
    if (nom) { updates.push('nom = ?'); params.push(nom); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (actif !== undefined) { updates.push('actif = ?'); params.push(actif); }

    if (!updates.length) return res.status(400).json({ error: 'Aucune modification.' });

    params.push(req.params.id);
    await db.query(`UPDATE boites SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit({
      userId: req.user.id, action: ACTIONS.UPDATE, table: 'boites',
      recordId: req.params.id, details: req.body,
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Boîte modifiée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== DÉPLACER UNE BOÎTE =====
router.patch('/:id/move', auth, roleCheck(80), async (req, res) => {
  try {
    const { armoire_id } = req.body;
    if (!armoire_id) return res.status(400).json({ error: 'Nouvelle armoire requise.' });

    await db.query('UPDATE boites SET armoire_id = ? WHERE id = ?', [armoire_id, req.params.id]);

    await logAudit({
      userId: req.user.id, action: ACTIONS.MOVE, table: 'boites',
      recordId: req.params.id, details: { nouveau_armoire_id: armoire_id },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Boîte déplacée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== SUPPRIMER UNE BOÎTE =====
router.delete('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('DELETE FROM boites WHERE id = ?', [req.params.id]);
    await logAudit({
      userId: req.user.id, action: ACTIONS.DELETE, table: 'boites',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ message: 'Boîte supprimée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== DÉSACTIVER UNE BOÎTE =====
router.patch('/:id/disable', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('UPDATE boites SET actif = 0 WHERE id = ?', [req.params.id]);
    await logAudit({
      userId: req.user.id, action: ACTIONS.DISABLE, table: 'boites',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ message: 'Boîte désactivée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== ACTIVER UNE BOÎTE =====
router.patch('/:id/enable', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('UPDATE boites SET actif = 1 WHERE id = ?', [req.params.id]);
    await logAudit({
      userId: req.user.id, action: ACTIONS.ENABLE, table: 'boites',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ message: 'Boîte activée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
