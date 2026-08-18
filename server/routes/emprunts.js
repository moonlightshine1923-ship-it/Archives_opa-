const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit, ACTIONS } = require('../utils/audit');

// ===== LISTER LES EMPRUNTS =====
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT e.*, d.reference, d.titre as dossier_titre, d.niveau_confidentialite,
        u.nom as emprunte_nom, u.prenom as emprunte_prenom,
        o.nom as organisation_nom
      FROM emprunts e
      JOIN dossiers d ON e.dossier_id = d.id
      JOIN users u ON e.emprunte_par = u.id
      JOIN organisations o ON d.organisation_id = o.id`;
    const params = [];

    const conditions = [];
    if (req.user.role_nom !== 'Super Admin') {
      conditions.push('d.organisation_id = ?');
      params.push(req.user.organisation_id);
    }
    if (req.query.etat) {
      conditions.push('e.etat = ?');
      params.push(req.query.etat);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY e.date_emprunt DESC';

    const [emprunts] = await db.query(query, params);
    res.json(emprunts);
  } catch (error) {
    console.error('Erreur liste emprunts:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== CRÉER UN EMPRUNT =====
router.post('/', auth, async (req, res) => {
  try {
    const { dossier_id, date_retour_prevue, motif } = req.body;

    if (!dossier_id || !date_retour_prevue) {
      return res.status(400).json({ error: 'Dossier et date de retour requis.' });
    }

    // Vérifier que le dossier n'est pas déjà emprunté
    const [existing] = await db.query(
      "SELECT id FROM emprunts WHERE dossier_id = ? AND etat = 'En cours'",
      [dossier_id]
    );
    if (existing.length) {
      return res.status(400).json({ error: 'Ce dossier est déjà emprunté.' });
    }

    const [result] = await db.query(
      `INSERT INTO emprunts (dossier_id, emprunte_par, date_retour_prevue, motif)
       VALUES (?, ?, ?, ?)`,
      [dossier_id, req.user.id, date_retour_prevue, motif]
    );

    // Mettre à jour l'état du dossier
    await db.query("UPDATE dossiers SET etat = 'Emprunté' WHERE id = ?", [dossier_id]);

    await logAudit({
      userId: req.user.id, action: ACTIONS.BORROW, table: 'emprunts',
      recordId: result.insertId, details: { dossier_id, date_retour_prevue },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ id: result.insertId, message: 'Emprunt enregistré.' });
  } catch (error) {
    console.error('Erreur création emprunt:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== RETOURNER UN EMPRUNT =====
router.patch('/:id/return', auth, async (req, res) => {
  try {
    const [emprunts] = await db.query('SELECT * FROM emprunts WHERE id = ?', [req.params.id]);
    if (!emprunts.length) return res.status(404).json({ error: 'Emprunt non trouvé.' });

    await db.query(
      "UPDATE emprunts SET etat = 'Retourné', date_retour_effective = NOW() WHERE id = ?",
      [req.params.id]
    );

    // Remettre le dossier à l'état Ouvert
    await db.query("UPDATE dossiers SET etat = 'Ouvert' WHERE id = ?", [emprunts[0].dossier_id]);

    await logAudit({
      userId: req.user.id, action: ACTIONS.RETURN, table: 'emprunts',
      recordId: req.params.id, details: { dossier_id: emprunts[0].dossier_id },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Retour enregistré.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== VÉRIFIER LES RETARDS =====
router.get('/retards', auth, async (req, res) => {
  try {
    let query = `
      SELECT e.*, d.reference, d.titre as dossier_titre,
        u.nom as emprunte_nom, u.prenom as emprunte_prenom,
        DATEDIFF(NOW(), e.date_retour_prevue) as jours_retard
      FROM emprunts e
      JOIN dossiers d ON e.dossier_id = d.id
      JOIN users u ON e.emprunte_par = u.id
      WHERE e.etat = 'En cours' AND e.date_retour_prevue < NOW()`;
    const params = [];

    if (req.user.role_nom !== 'Super Admin') {
      query += ' AND d.organisation_id = ?';
      params.push(req.user.organisation_id);
    }
    query += ' ORDER BY e.date_retour_prevue ASC';

    const [retards] = await db.query(query, params);
    res.json(retards);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
