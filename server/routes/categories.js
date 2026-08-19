const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/role');
const { logAudit, ACTIONS } = require('../utils/audit');

// ===== LISTER LES CATÉGORIES =====
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT c.*, o.nom as organisation_nom,
        (SELECT COUNT(*) FROM dossiers WHERE categorie_id = c.id) as nb_dossiers,
        (SELECT COUNT(*) FROM sous_categories WHERE categorie_id = c.id AND actif = 1) as nb_sous_categories
      FROM categories c 
      LEFT JOIN organisations o ON c.organisation_id = o.id`;
    const params = [];

    if (req.user.role_nom !== 'Super Admin') {
      query += ' WHERE c.organisation_id = ? OR c.organisation_id IS NULL';
      params.push(req.user.organisation_id);
    }

    query += ' ORDER BY o.nom, c.nom';
    const [categories] = await db.query(query, params);
    res.json(categories);
  } catch (error) {
    console.error('Erreur liste catégories:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== CRÉER UNE CATÉGORIE =====
router.post('/', auth, roleCheck(80), async (req, res) => {
  try {
    const { organisation_id, nom, description } = req.body;
    if (!nom) return res.status(400).json({ error: 'Nom requis.' });

    const orgId = organisation_id || req.user.organisation_id;

    const [doublons] = await db.query(
      'SELECT id FROM categories WHERE LOWER(TRIM(nom)) = LOWER(TRIM(?))',
      [nom]
    );
    if (doublons.length) {
      return res.status(400).json({ error: 'Une catégorie avec ce nom existe déjà.' });
    }

    const [result] = await db.query(
      'INSERT INTO categories (organisation_id, nom, description) VALUES (?, ?, ?)',
      [orgId, nom, description]
    );

    await logAudit({
      userId: req.user.id, action: ACTIONS.CREATE, table: 'categories',
      recordId: result.insertId, details: { nom },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ id: result.insertId, message: 'Catégorie créée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== MODIFIER UNE CATÉGORIE =====
router.put('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    const { nom, description, actif } = req.body;
    const updates = [];
    const params = [];

    if (nom) {
      const [doublons] = await db.query(
        'SELECT id FROM categories WHERE LOWER(TRIM(nom)) = LOWER(TRIM(?)) AND id <> ?',
        [nom, req.params.id]
      );
      if (doublons.length) {
        return res.status(400).json({ error: 'Une catégorie avec ce nom existe déjà.' });
      }
      updates.push('nom = ?');
      params.push(nom);
    }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (actif !== undefined) { updates.push('actif = ?'); params.push(actif); }

    if (!updates.length) return res.status(400).json({ error: 'Aucune modification.' });

    params.push(req.params.id);
    await db.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit({
      userId: req.user.id, action: ACTIONS.UPDATE, table: 'categories',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Catégorie modifiée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== SUPPRIMER UNE CATÉGORIE =====
router.delete('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    await logAudit({
      userId: req.user.id, action: ACTIONS.DELETE, table: 'categories',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ message: 'Catégorie supprimée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== SOUS-CATÉGORIES =====

// Lister
router.get('/:categorieId/sous-categories', auth, async (req, res) => {
  try {
    const [souscats] = await db.query(
      `SELECT sc.*, c.nom as categorie_nom,
        (SELECT COUNT(*) FROM dossiers WHERE sous_categorie_id = sc.id) as nb_dossiers
       FROM sous_categories sc 
       JOIN categories c ON sc.categorie_id = c.id
       WHERE sc.categorie_id = ? ORDER BY sc.nom`,
      [req.params.categorieId]
    );
    res.json(souscats);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Créer
router.post('/:categorieId/sous-categories', auth, roleCheck(80), async (req, res) => {
  try {
    const { nom, description } = req.body;
    if (!nom) return res.status(400).json({ error: 'Nom requis.' });

    const [result] = await db.query(
      'INSERT INTO sous_categories (categorie_id, nom, description) VALUES (?, ?, ?)',
      [req.params.categorieId, nom, description]
    );

    await logAudit({
      userId: req.user.id, action: ACTIONS.CREATE, table: 'sous_categories',
      recordId: result.insertId, details: { nom },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ id: result.insertId, message: 'Sous-catégorie créée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Modifier
router.put('/sous-categories/:id', auth, roleCheck(80), async (req, res) => {
  try {
    const { nom, description, actif } = req.body;
    const updates = [];
    const params = [];

    if (nom) { updates.push('nom = ?'); params.push(nom); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (actif !== undefined) { updates.push('actif = ?'); params.push(actif); }

    if (!updates.length) return res.status(400).json({ error: 'Aucune modification.' });

    params.push(req.params.id);
    await db.query(`UPDATE sous_categories SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Sous-catégorie modifiée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Supprimer
router.delete('/sous-categories/:id', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('DELETE FROM sous_categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sous-catégorie supprimée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
