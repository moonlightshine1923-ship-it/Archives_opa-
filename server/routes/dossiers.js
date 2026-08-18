const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/role');
const { logAudit, ACTIONS } = require('../utils/audit');
const { generateReference, getDossierLocation } = require('../utils/reference');

// ===== LISTER =====
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT d.*, c.nom as categorie_nom, sc.nom as sous_categorie_nom,
        o.nom as organisation_nom, b.code_boite, b.nom as boite_nom,
        a.code_armoire, a.nom as armoire_nom, a.emplacement_physique, s.nom as salle_nom,
        (SELECT COUNT(*) FROM fichiers WHERE dossier_id = d.id) as nb_fichiers
      FROM dossiers d 
      LEFT JOIN categories c ON d.categorie_id = c.id
      LEFT JOIN sous_categories sc ON d.sous_categorie_id = sc.id
      JOIN organisations o ON d.organisation_id = o.id
      JOIN boites b ON d.boite_id = b.id
      JOIN armoires a ON b.armoire_id = a.id
      JOIN salles s ON a.salle_id = s.id`;
    const params = [];
    const conditions = [];

    if (req.user.role_nom !== 'Super Admin') {
      conditions.push('d.organisation_id = ?');
      params.push(req.user.organisation_id);
    }

    if (req.query.boite_id) { conditions.push('d.boite_id = ?'); params.push(req.query.boite_id); }
    if (req.query.categorie_id) { conditions.push('d.categorie_id = ?'); params.push(req.query.categorie_id); }
    if (req.query.etat) { conditions.push('d.etat = ?'); params.push(req.query.etat); }
    if (req.query.niveau_confidentialite) { conditions.push('d.niveau_confidentialite = ?'); params.push(req.query.niveau_confidentialite); }
    if (req.query.organisation_id) { conditions.push('d.organisation_id = ?'); params.push(req.query.organisation_id); }
    if (req.query.search) {
      conditions.push('(d.reference LIKE ? OR d.titre LIKE ? OR d.sous_titre LIKE ? OR d.description LIKE ?)');
      const s = `%${req.query.search}%`; params.push(s, s, s, s);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY d.date_creation DESC';

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [dossiers] = await db.query(query, params);
    res.json(dossiers);
  } catch (error) {
    console.error('Erreur liste dossiers:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== OBTENIR =====
router.get('/:id', auth, async (req, res) => {
  try {
    const [dossiers] = await db.query(
      `SELECT d.*, c.nom as categorie_nom, sc.nom as sous_categorie_nom,
        o.nom as organisation_nom, b.code_boite, b.nom as boite_nom,
        a.code_armoire, a.nom as armoire_nom, a.emplacement_physique, s.nom as salle_nom
      FROM dossiers d 
      LEFT JOIN categories c ON d.categorie_id = c.id
      LEFT JOIN sous_categories sc ON d.sous_categorie_id = sc.id
      JOIN organisations o ON d.organisation_id = o.id
      JOIN boites b ON d.boite_id = b.id
      JOIN armoires a ON b.armoire_id = a.id
      JOIN salles s ON a.salle_id = s.id
      WHERE d.id = ?`, [req.params.id]
    );
    if (!dossiers.length) return res.status(404).json({ error: 'Dossier non trouvé.' });
    const dossier = dossiers[0];
    dossier.localisation = await getDossierLocation(dossier.id);

    const niveaux = ['Public', 'Interne', 'Confidentiel', 'Secret', 'Très Secret'];
    const niveauRequis = niveaux.indexOf(dossier.niveau_confidentialite);
    if (req.user.role_niveau < 50 && niveauRequis >= 2) {
      return res.status(403).json({ error: 'Accès refusé. Niveau de confidentialité insuffisant.' });
    }

    await logAudit({ userId: req.user.id, action: ACTIONS.READ, table: 'dossiers', recordId: dossier.id, details: { reference: dossier.reference }, ip: req.ip, userAgent: req.get('User-Agent') });
    res.json(dossier);
  } catch (error) {
    console.error('Erreur détail dossier:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== CRÉER =====
router.post('/', auth, roleCheck(80), async (req, res) => {
  try {
    const { boite_id, titre, sous_titre, description, categorie_id, sous_categorie_id, niveau_confidentialite, organisation_id } = req.body;
    if (!boite_id || !titre || !organisation_id) return res.status(400).json({ error: 'Boîte, titre et organisation requis.' });
    if (req.user.role_nom !== 'Super Admin' && req.user.organisation_id !== organisation_id) return res.status(403).json({ error: 'Organisation non autorisée.' });

    const reference = await generateReference();
    const [result] = await db.query(
      `INSERT INTO dossiers (boite_id, categorie_id, sous_categorie_id, organisation_id, reference, titre, sous_titre, description, niveau_confidentialite, etat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ouvert')`,
      [boite_id, categorie_id || null, sous_categorie_id || null, organisation_id, reference, titre, sous_titre, description, niveau_confidentialite || 'Interne']
    );
    await logAudit({ userId: req.user.id, action: ACTIONS.CREATE, table: 'dossiers', recordId: result.insertId, details: { reference, titre }, ip: req.ip, userAgent: req.get('User-Agent') });
    res.status(201).json({ id: result.insertId, reference, message: 'Dossier créé avec succès.' });
  } catch (error) { console.error('Erreur création dossier:', error); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ===== MODIFIER =====
router.put('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    const { titre, sous_titre, description, categorie_id, sous_categorie_id, niveau_confidentialite, boite_id } = req.body;
    const updates = []; const params = [];
    if (titre) { updates.push('titre = ?'); params.push(titre); }
    if (sous_titre !== undefined) { updates.push('sous_titre = ?'); params.push(sous_titre); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (categorie_id !== undefined) { updates.push('categorie_id = ?'); params.push(categorie_id); }
    if (sous_categorie_id !== undefined) { updates.push('sous_categorie_id = ?'); params.push(sous_categorie_id); }
    if (niveau_confidentialite) { updates.push('niveau_confidentialite = ?'); params.push(niveau_confidentialite); }
    if (boite_id) { updates.push('boite_id = ?'); params.push(boite_id); }
    if (!updates.length) return res.status(400).json({ error: 'Aucune modification.' });
    params.push(req.params.id);
    await db.query(`UPDATE dossiers SET ${updates.join(', ')} WHERE id = ?`, params);
    await logAudit({ userId: req.user.id, action: ACTIONS.UPDATE, table: 'dossiers', recordId: req.params.id, details: req.body, ip: req.ip, userAgent: req.get('User-Agent') });
    res.json({ message: 'Dossier modifié avec succès.' });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ===== DÉPLACER =====
router.patch('/:id/move', auth, roleCheck(80), async (req, res) => {
  try {
    const { boite_id } = req.body;
    if (!boite_id) return res.status(400).json({ error: 'Nouvelle boîte requise.' });
    await db.query('UPDATE dossiers SET boite_id = ? WHERE id = ?', [boite_id, req.params.id]);
    await logAudit({ userId: req.user.id, action: ACTIONS.MOVE, table: 'dossiers', recordId: req.params.id, details: { nouveau_boite_id: boite_id }, ip: req.ip, userAgent: req.get('User-Agent') });
    res.json({ message: 'Dossier déplacé avec succès.' });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ===== SUPPRIMER =====
router.delete('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    await db.query('DELETE FROM dossiers WHERE id = ?', [req.params.id]);
    await logAudit({ userId: req.user.id, action: ACTIONS.DELETE, table: 'dossiers', recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent') });
    res.json({ message: 'Dossier supprimé.' });
  } catch (error) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

module.exports = router;
