const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ===== TABLEAU DE BORD =====
router.get('/', auth, async (req, res) => {
  try {
    const orgFilter = req.user.role_nom !== 'Super Admin' ? `AND d.organisation_id = ${req.user.organisation_id}` : '';
    const orgFilter2 = req.user.role_nom !== 'Super Admin' ? `AND d.organisation_id = ${req.user.organisation_id}` : '';
    const orgFilterGeneral = req.user.role_nom !== 'Super Admin' ? `WHERE s.organisation_id = ${req.user.organisation_id}` : '';

    const [[dossiersCount]] = await db.query(`SELECT COUNT(*) as count FROM dossiers d WHERE 1=1 ${orgFilter}`);
    const [[fichiersCount]] = await db.query(`SELECT COUNT(*) as count FROM fichiers f JOIN dossiers d ON f.dossier_id = d.id WHERE 1=1 ${orgFilter2}`);
    const [[armoiresCount]] = await db.query(`SELECT COUNT(*) as count FROM armoires a JOIN salles s ON a.salle_id = s.id ${orgFilterGeneral}`);
    const [[boitesCount]] = await db.query(`SELECT COUNT(*) as count FROM boites b JOIN armoires a ON b.armoire_id = a.id JOIN salles s ON a.salle_id = s.id ${orgFilterGeneral}`);

    const [parCategorie] = await db.query(
      `SELECT c.nom as categorie, COUNT(d.id) as count FROM dossiers d LEFT JOIN categories c ON d.categorie_id = c.id WHERE 1=1 ${orgFilter} GROUP BY c.nom ORDER BY count DESC LIMIT 15`
    );
    const [parEtat] = await db.query(`SELECT etat, COUNT(*) as count FROM dossiers d WHERE 1=1 ${orgFilter} GROUP BY etat`);
    const [parConfidentialite] = await db.query(`SELECT niveau_confidentialite, COUNT(*) as count FROM dossiers d WHERE 1=1 ${orgFilter} GROUP BY niveau_confidentialite`);

    const [occupationSalles] = await db.query(
      `SELECT s.nom as salle, s.id as salle_id, COUNT(DISTINCT a.id) as nb_armoires, COUNT(DISTINCT b.id) as nb_boites, COUNT(d.id) as nb_dossiers
       FROM salles s LEFT JOIN armoires a ON a.salle_id = s.id AND a.actif = 1
       LEFT JOIN boites b ON b.armoire_id = a.id AND b.actif = 1
       LEFT JOIN dossiers d ON d.boite_id = b.id
       ${orgFilterGeneral} GROUP BY s.id ORDER BY s.nom`
    );

    const [derniersDocuments] = await db.query(
      `SELECT d.id, d.reference, d.titre, d.niveau_confidentialite, d.date_creation, o.nom as organisation_nom, c.nom as categorie_nom
       FROM dossiers d LEFT JOIN categories c ON d.categorie_id = c.id JOIN organisations o ON d.organisation_id = o.id
       WHERE 1=1 ${orgFilter} ORDER BY d.date_creation DESC LIMIT 10`
    );

    res.json({
      stats: { total_dossiers: dossiersCount.count, total_fichiers: fichiersCount.count, total_armoires: armoiresCount.count, total_boites: boitesCount.count },
      par_categorie: parCategorie, par_etat: parEtat, par_confidentialite: parConfidentialite,
      occupation_salles: occupationSalles, derniers_documents: derniersDocuments
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
