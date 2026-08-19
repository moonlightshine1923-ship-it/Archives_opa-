const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const orgFilter = req.user.role_nom !== 'Super Admin';
    const orgId = req.user.organisation_id;
    const rows = [];

    const orgSalle = orgFilter ? ' WHERE s.organisation_id = ?' : '';
    const orgDossier = orgFilter ? ' WHERE d.organisation_id = ?' : '';
    const orgParam = orgFilter ? [orgId] : [];

    const [salles] = await db.query(
      `SELECT s.id, s.nom FROM salles s ${orgSalle} ORDER BY s.nom`,
      orgParam
    );
    for (const s of salles) {
      rows.push({
        type: 'Salle',
        id: s.id,
        titre: s.nom,
        emplacement: s.nom
      });
    }

    const [armoires] = await db.query(
      `SELECT a.id, a.nom, s.nom AS salle_nom
       FROM armoires a
       JOIN salles s ON a.salle_id = s.id
       ${orgSalle}
       ORDER BY s.nom, a.nom`,
      orgParam
    );
    for (const a of armoires) {
      rows.push({
        type: 'Armoire',
        id: a.id,
        titre: a.nom,
        emplacement: `${a.salle_nom} › ${a.nom}`
      });
    }

    const [boites] = await db.query(
      `SELECT b.id, b.nom, b.code_boite, a.nom AS armoire_nom, s.nom AS salle_nom
       FROM boites b
       JOIN armoires a ON b.armoire_id = a.id
       JOIN salles s ON a.salle_id = s.id
       ${orgSalle}
       ORDER BY s.nom, a.nom, b.nom`,
      orgParam
    );
    for (const b of boites) {
      const nom = b.nom || b.code_boite;
      rows.push({
        type: 'Boîte',
        id: b.id,
        titre: nom,
        emplacement: `${b.salle_nom} › ${b.armoire_nom} › ${nom}`
      });
    }

    const [dossiers] = await db.query(
      `SELECT d.id, d.titre, s.nom AS salle_nom, a.nom AS armoire_nom,
              b.nom AS boite_nom, b.code_boite
       FROM dossiers d
       JOIN boites b ON d.boite_id = b.id
       JOIN armoires a ON b.armoire_id = a.id
       JOIN salles s ON a.salle_id = s.id
       ${orgDossier}
       ORDER BY s.nom, a.nom, b.nom, d.titre`,
      orgParam
    );
    for (const d of dossiers) {
      const boite = d.boite_nom || d.code_boite;
      rows.push({
        type: 'Dossier',
        id: d.id,
        dossier_id: d.id,
        titre: d.titre,
        emplacement: `${d.salle_nom} › ${d.armoire_nom} › ${boite} › ${d.titre}`
      });
    }

    const [fichiers] = await db.query(
      `SELECT f.id, f.titre, f.nom_original, f.dossier_id, d.titre AS dossier_titre,
              s.nom AS salle_nom, a.nom AS armoire_nom, b.nom AS boite_nom, b.code_boite
       FROM fichiers f
       JOIN dossiers d ON f.dossier_id = d.id
       JOIN boites b ON d.boite_id = b.id
       JOIN armoires a ON b.armoire_id = a.id
       JOIN salles s ON a.salle_id = s.id
       ${orgDossier}
       ORDER BY s.nom, a.nom, b.nom, d.titre, f.titre`,
      orgParam
    );
    for (const f of fichiers) {
      const boite = f.boite_nom || f.code_boite;
      rows.push({
        type: 'Fichier',
        id: f.id,
        dossier_id: f.dossier_id,
        titre: f.titre,
        nom_original: f.nom_original || '',
        emplacement: `${f.salle_nom} › ${f.armoire_nom} › ${boite} › ${f.dossier_titre} › ${f.titre}`
      });
    }

    res.json(rows);
  } catch (error) {
    console.error('Erreur sommaire:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
