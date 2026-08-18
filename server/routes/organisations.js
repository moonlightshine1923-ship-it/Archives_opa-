const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit, ACTIONS } = require('../utils/audit');

// ===== LISTER =====
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT o.*,
        (SELECT COUNT(*) FROM salles WHERE organisation_id = o.id AND actif = 1) as nb_salles,
        (SELECT COUNT(*) FROM dossiers WHERE organisation_id = o.id) as nb_dossiers,
        (SELECT COUNT(*) FROM fichiers f JOIN dossiers d ON f.dossier_id = d.id WHERE d.organisation_id = o.id) as nb_fichiers
      FROM organisations o`;
    const params = [];
    if (req.user.role_nom !== 'Super Admin') {
      query += ' WHERE o.id = ?';
      params.push(req.user.organisation_id);
    }
    query += ' ORDER BY o.nom';
    const [orgs] = await db.query(query, params);
    res.json(orgs);
  } catch (error) {
    console.error('Erreur liste organisations:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== OBTENIR =====
router.get('/:id', auth, async (req, res) => {
  try {
    const [orgs] = await db.query('SELECT * FROM organisations WHERE id = ?', [req.params.id]);
    if (!orgs.length) return res.status(404).json({ error: 'Organisation non trouvée.' });
    res.json(orgs[0]);
  } catch (error) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ===== CRÉER =====
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role_niveau < 80) return res.status(403).json({ error: 'Accès refusé.' });
    const { nom, code, description } = req.body;
    if (!nom || !code) return res.status(400).json({ error: 'Nom et code requis.' });

    const [result] = await db.query(
      'INSERT INTO organisations (nom, code, description) VALUES (?, ?, ?)',
      [nom, code, description || null]
    );
    await logAudit({ userId: req.user.id, action: ACTIONS.CREATE, table: 'organisations', recordId: result.insertId, details: { nom, code }, ip: req.ip, userAgent: req.get('User-Agent') });
    res.status(201).json({ id: result.insertId, message: 'Organisation créée.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Nom ou code déjà existant.' });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== MODIFIER =====
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role_niveau < 80) return res.status(403).json({ error: 'Accès refusé.' });
    const { nom, code, description } = req.body;
    const updates = []; const params = [];
    if (nom) { updates.push('nom = ?'); params.push(nom); }
    if (code) { updates.push('code = ?'); params.push(code); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (!updates.length) return res.status(400).json({ error: 'Aucune modification.' });
    params.push(req.params.id);
    await db.query(`UPDATE organisations SET ${updates.join(', ')} WHERE id = ?`, params);
    await logAudit({ userId: req.user.id, action: ACTIONS.UPDATE, table: 'organisations', recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent') });
    res.json({ message: 'Organisation modifiée.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Nom ou code déjà existant.' });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== SUPPRIMER =====
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role_niveau < 100) return res.status(403).json({ error: 'Seul le Super Admin peut supprimer une organisation.' });
    const [orgs] = await db.query('SELECT nom FROM organisations WHERE id = ?', [req.params.id]);
    if (!orgs.length) return res.status(404).json({ error: 'Organisation non trouvée.' });
    await db.query('DELETE FROM organisations WHERE id = ?', [req.params.id]);
    await logAudit({ userId: req.user.id, action: ACTIONS.DELETE, table: 'organisations', recordId: req.params.id, details: { nom: orgs[0].nom }, ip: req.ip, userAgent: req.get('User-Agent') });
    res.json({ message: 'Organisation supprimée.' });
  } catch (error) {
    console.error('Erreur suppression org:', error);
    res.status(500).json({ error: 'Erreur serveur. Vérifiez que l\'organisation ne contient plus de données.' });
  }
});

module.exports = router;
