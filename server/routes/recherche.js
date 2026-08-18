const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ===== RECHERCHE AVANCÉE =====
router.get('/', auth, async (req, res) => {
  try {
    const { reference, titre, sous_titre, description, mot_cle, categorie_id, sous_categorie_id, organisation_id, salle_id, armoire_id, boite_id, niveau_confidentialite, date_depot } = req.query;

    let query = `
      SELECT d.*, c.nom as categorie_nom, sc.nom as sous_categorie_nom,
        o.nom as organisation_nom, b.code_boite, b.nom as boite_nom,
        a.code_armoire, a.nom as armoire_nom, s.nom as salle_nom,
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

    if (reference) { conditions.push('d.reference LIKE ?'); params.push(`%${reference}%`); }
    if (titre) { conditions.push('d.titre LIKE ?'); params.push(`%${titre}%`); }
    if (sous_titre) { conditions.push('d.sous_titre LIKE ?'); params.push(`%${sous_titre}%`); }
    if (description) { conditions.push('d.description LIKE ?'); params.push(`%${description}%`); }
    if (mot_cle) {
      conditions.push('(d.description LIKE ? OR d.titre LIKE ? OR EXISTS (SELECT 1 FROM fichiers f WHERE f.dossier_id = d.id AND (f.mots_cles LIKE ? OR f.titre LIKE ?)))');
      const m = `%${mot_cle}%`; params.push(m, m, m, m);
    }
    if (categorie_id) { conditions.push('d.categorie_id = ?'); params.push(categorie_id); }
    if (sous_categorie_id) { conditions.push('d.sous_categorie_id = ?'); params.push(sous_categorie_id); }
    if (organisation_id) { conditions.push('d.organisation_id = ?'); params.push(organisation_id); }
    if (salle_id) { conditions.push('s.id = ?'); params.push(salle_id); }
    if (armoire_id) { conditions.push('a.id = ?'); params.push(armoire_id); }
    if (boite_id) { conditions.push('d.boite_id = ?'); params.push(boite_id); }
    if (niveau_confidentialite) { conditions.push('d.niveau_confidentialite = ?'); params.push(niveau_confidentialite); }
    if (date_depot) { conditions.push('DATE(d.date_creation) = ?'); params.push(date_depot); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY d.date_creation DESC LIMIT 200';

    const [results] = await db.query(query, params);
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
    const [fichiers] = await db.query(`SELECT f.id,f.titre AS nom,f.description,f.dossier_id,d.reference FROM fichiers f JOIN dossiers d ON d.id=f.dossier_id WHERE (f.titre LIKE ? OR f.description LIKE ? OR f.mots_cles LIKE ?)${req.user.role_nom !== 'Super Admin' ? ' AND d.organisation_id = ?' : ''}`, [s,s,s,...orgParam]);
    results.push(...fichiers.map(x => ({type:'Fichier', id:x.id, nom:x.nom, description:x.description||'', dossier_id:x.dossier_id, reference:x.reference})));
    const [dossiers] = await db.query(`SELECT d.id,d.titre AS nom,d.description,d.reference FROM dossiers d WHERE (d.titre LIKE ? OR d.reference LIKE ? OR d.description LIKE ?)${req.user.role_nom !== 'Super Admin' ? ' AND d.organisation_id = ?' : ''}`, [s,s,s,...orgParam]);
    results.push(...dossiers.map(x => ({type:'Dossier', id:x.id, nom:x.nom, description:x.description||'', reference:x.reference})));
    res.json(results.slice(0,200));
  } catch (error) { console.error('Erreur recherche globale:', error); res.status(500).json({error:'Erreur serveur.'}); }
});

module.exports = router;
