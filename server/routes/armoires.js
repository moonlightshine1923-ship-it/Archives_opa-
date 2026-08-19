const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/role');
const { logAudit, ACTIONS } = require('../utils/audit');

// ===== LISTER LES ARMOIRES =====
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT a.*, s.nom as salle_nom, o.nom as organisation_nom, o.id as organisation_id,
        (SELECT COUNT(*) FROM boites WHERE armoire_id = a.id AND actif = 1) as nb_boites
      FROM armoires a 
      JOIN salles s ON a.salle_id = s.id 
      JOIN organisations o ON s.organisation_id = o.id`;
    const params = [];

    const conditions = [];
    if (req.user.role_nom !== 'Super Admin') {
      conditions.push('o.id = ?');
      params.push(req.user.organisation_id);
    }
    if (req.query.salle_id) {
      conditions.push('a.salle_id = ?');
      params.push(req.query.salle_id);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY o.nom, s.nom, a.code_armoire';

    const [armoires] = await db.query(query, params);
    res.json(armoires);
  } catch (error) {
    console.error('Erreur liste armoires:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== OBTENIR UNE ARMOIRE =====
router.get('/:id', auth, async (req, res) => {
  try {
    const [armoires] = await db.query(
      `SELECT a.*, s.nom as salle_nom, o.nom as organisation_nom
       FROM armoires a 
       JOIN salles s ON a.salle_id = s.id 
       JOIN organisations o ON s.organisation_id = o.id 
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (!armoires.length) return res.status(404).json({ error: 'Armoire non trouvée.' });
    res.json(armoires[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== CRÉER UNE ARMOIRE =====
router.post('/', auth, roleCheck(80), async (req, res) => {
  try {
    const { salle_id, nom, description } = req.body;

    if (!salle_id || !nom) {
      return res.status(400).json({ error: 'Salle et nom requis.' });
    }

    const code_armoire = `ARM-${Date.now()}`;

    const [result] = await db.query(
      `INSERT INTO armoires (salle_id, code_armoire, nom, description)
       VALUES (?, ?, ?, ?)`,
      [salle_id, code_armoire, nom, description || null]
    );

    await logAudit({
      userId: req.user.id, action: ACTIONS.CREATE, table: 'armoires',
      recordId: result.insertId, details: { code_armoire, nom },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ id: result.insertId, message: 'Armoire créée avec succès.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Code armoire déjà existant dans cette salle.' });
    }
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== MODIFIER UNE ARMOIRE =====
router.put('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    const { code_armoire, nom, description, emplacement_physique, actif } = req.body;
    const updates = [];
    const params = [];

    if (code_armoire) { updates.push('code_armoire = ?'); params.push(code_armoire); }
    if (nom) { updates.push('nom = ?'); params.push(nom); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (emplacement_physique !== undefined) { updates.push('emplacement_physique = ?'); params.push(emplacement_physique); }
    if (actif !== undefined) { updates.push('actif = ?'); params.push(actif); }

    if (!updates.length) return res.status(400).json({ error: 'Aucune modification.' });

    params.push(req.params.id);
    await db.query(`UPDATE armoires SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit({
      userId: req.user.id, action: ACTIONS.UPDATE, table: 'armoires',
      recordId: req.params.id, details: req.body,
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Armoire modifiée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== DÉSACTIVER UNE ARMOIRE =====
router.patch('/:id/disable', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('UPDATE armoires SET actif = 0 WHERE id = ?', [req.params.id]);
    await logAudit({
      userId: req.user.id, action: ACTIONS.DISABLE, table: 'armoires',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ message: 'Armoire désactivée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== ACTIVER UNE ARMOIRE =====
router.patch('/:id/enable', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('UPDATE armoires SET actif = 1 WHERE id = ?', [req.params.id]);
    await logAudit({
      userId: req.user.id, action: ACTIONS.ENABLE, table: 'armoires',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ message: 'Armoire activée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== SUPPRIMER UNE ARMOIRE =====
router.delete('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('DELETE FROM armoires WHERE id = ?', [req.params.id]);
    await logAudit({
      userId: req.user.id, action: ACTIONS.DELETE, table: 'armoires',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ message: 'Armoire supprimée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== CONTENU D'UNE ARMOIRE =====
router.get('/:id/contenu', auth, async (req, res) => {
  try {
    const [boites] = await db.query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM dossiers WHERE boite_id = b.id) as nb_dossiers
       FROM boites b WHERE b.armoire_id = ? AND b.actif = 1 ORDER BY b.code_boite`,
      [req.params.id]
    );
    res.json(boites);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
