const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ===== RECHERCHE AVANCÉE (dossiers + fichiers) =====
router.get('/', auth, async (req, res) => {
  try {
    const { titre, description, mot_cle, categorie_id, date_depot } = req.query;
    const results = [];
    const orgFilter = req.user.role_nom !== 'Super Admin';
    const orgId = req.user.organisation_id;

    // --- Dossiers ---
    let dossierQuery = `
      SELECT d.id, d.titre, d.description, d.reference, d.categorie_id,
        c.nom as categorie_nom,
        b.code_boite, a.code_armoire, a.nom as armoire_nom, s.nom as salle_nom
      FROM dossiers d
      LEFT JOIN categories c ON d.categorie_id = c.id
      JOIN boites b ON d.boite_id = b.id
      JOIN armoires a ON b.armoire_id = a.id
      JOIN salles s ON a.salle_id = s.id`;
    const dParams = [];
    const dCond = [];
    if (orgFilter) { dCond.push('d.organisation_id = ?'); dParams.push(orgId); }
    if (titre) { dCond.push('d.titre LIKE ?'); dParams.push(`%${titre}%`); }
    if (description) { dCond.push('d.description LIKE ?'); dParams.push(`%${description}%`); }
    if (mot_cle) {
      dCond.push('(d.titre LIKE ? OR d.description LIKE ?)');
      dParams.push(`%${mot_cle}%`, `%${mot_cle}%`);
    }
    if (categorie_id) { dCond.push('d.categorie_id = ?'); dParams.push(categorie_id); }
    if (date_depot) { dCond.push('DATE(d.date_creation) = ?'); dParams.push(date_depot); }
    if (dCond.length) dossierQuery += ' WHERE ' + dCond.join(' AND ');
    dossierQuery += ' ORDER BY d.date_creation DESC LIMIT 150';
    const [dossiers] = await db.query(dossierQuery, dParams);
    results.push(...dossiers.map(d => ({
      type: 'Dossier',
      id: d.id,
      titre: d.titre,
      description: d.description || '',
      categorie_nom: d.categorie_nom,
      salle_nom: d.salle_nom,
      armoire_nom: d.armoire_nom,
      code_armoire: d.code_armoire,
      code_boite: d.code_boite,
      dossier_id: d.id
    })));

    // --- Fichiers (titre, nom original, mots-clés, description) ---
    let fileQuery = `
      SELECT f.id, f.titre, f.nom_original, f.description, f.dossier_id,
        d.titre as dossier_titre, c.nom as categorie_nom,
        b.code_boite, a.code_armoire, a.nom as armoire_nom, s.nom as salle_nom
      FROM fichiers f
      JOIN dossiers d ON f.dossier_id = d.id
      LEFT JOIN categories c ON d.categorie_id = c.id
      JOIN boites b ON d.boite_id = b.id
      JOIN armoires a ON b.armoire_id = a.id
      JOIN salles s ON a.salle_id = s.id`;
    const fParams = [];
    const fCond = [];
    if (orgFilter) { fCond.push('d.organisation_id = ?'); fParams.push(orgId); }
    if (titre) {
      fCond.push('(f.titre LIKE ? OR f.nom_original LIKE ?)');
      fParams.push(`%${titre}%`, `%${titre}%`);
    }
    if (description) { fCond.push('f.description LIKE ?'); fParams.push(`%${description}%`); }
    if (mot_cle) {
      fCond.push('(f.titre LIKE ? OR f.nom_original LIKE ? OR f.mots_cles LIKE ? OR f.description LIKE ?)');
      const m = `%${mot_cle}%`;
      fParams.push(m, m, m, m);
    }
    if (categorie_id) { fCond.push('d.categorie_id = ?'); fParams.push(categorie_id); }
    if (date_depot) { fCond.push('DATE(f.date_upload) = ?'); fParams.push(date_depot); }
    if (fCond.length) fileQuery += ' WHERE ' + fCond.join(' AND ');
    fileQuery += ' ORDER BY f.date_upload DESC LIMIT 150';
    const [fichiers] = await db.query(fileQuery, fParams);
    results.push(...fichiers.map(f => ({
      type: 'Fichier',
      id: f.id,
      titre: f.titre,
      description: f.nom_original || f.description || '',
      categorie_nom: f.categorie_nom,
      salle_nom: f.salle_nom,
      armoire_nom: f.armoire_nom,
      code_armoire: f.code_armoire,
      code_boite: f.code_boite,
      dossier_id: f.dossier_id
    })));

    res.json(results);
  } catch (error) {
    console.error('Erreur recherche:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== RECHERCHE GLOBALE =====
router.get('/quick', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const s = `%${q}%`;
    const org = req.user.role_nom !== 'Super Admin' ? ' AND organisation_id = ?' : '';
    const orgParam = req.user.role_nom !== 'Super Admin' ? [req.user.organisation_id] : [];
    const results = [];
    const [categories] = await db.query(`SELECT id, nom, description FROM categories WHERE (nom LIKE ? OR description LIKE ?)${org}`, [s,s,...orgParam]);
    results.push(...categories.map(x => ({type:'Catégorie', id:x.id, nom:x.nom, description:x.description||''})));
    const [boites] = await db.query(`SELECT b.id,b.code_boite,b.nom,b.description,a.nom AS armoire_nom FROM boites b JOIN armoires a ON a.id=b.armoire_id JOIN salles sa ON sa.id=a.salle_id JOIN organisations o ON o.id=sa.organisation_id WHERE (b.nom LIKE ? OR b.code_boite LIKE ? OR b.description LIKE ?)${req.user.role_nom !== 'Super Admin' ? ' AND o.id = ?' : ''}`, [s,s,s,...orgParam]);
    results.push(...boites.map(x => ({type:'Boîte', id:x.id, nom:x.nom, code:x.code_boite, description:x.description||'', emplacement:x.armoire_nom||''})));
    const [fichiers] = await db.query(`SELECT f.id,f.titre AS nom,f.nom_original,f.description,f.dossier_id FROM fichiers f JOIN dossiers d ON d.id=f.dossier_id WHERE (f.titre LIKE ? OR f.nom_original LIKE ? OR f.description LIKE ? OR f.mots_cles LIKE ?)${req.user.role_nom !== 'Super Admin' ? ' AND d.organisation_id = ?' : ''}`, [s,s,s,s,...orgParam]);
    results.push(...fichiers.map(x => ({type:'Fichier', id:x.id, nom:x.nom, description:x.nom_original || x.description||'', dossier_id:x.dossier_id})));
    const [dossiers] = await db.query(`SELECT d.id,d.titre AS nom,d.description FROM dossiers d WHERE (d.titre LIKE ? OR d.description LIKE ?)${req.user.role_nom !== 'Super Admin' ? ' AND d.organisation_id = ?' : ''}`, [s,s,...orgParam]);
    results.push(...dossiers.map(x => ({type:'Dossier', id:x.id, nom:x.nom, description:x.description||''})));
    res.json(results.slice(0,200));
  } catch (error) { console.error('Erreur recherche globale:', error); res.status(500).json({error:'Erreur serveur.'}); }
});

module.exports = router;
