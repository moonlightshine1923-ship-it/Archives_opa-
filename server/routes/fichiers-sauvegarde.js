const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/role');
const uploadMiddleware = require('../middleware/upload');
const { logAudit, ACTIONS } = require('../utils/audit');

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');

// ===== LISTER LES FICHIERS D'UN DOSSIER =====
router.get('/dossier/:dossierId', auth, async (req, res) => {
  try {
    const [fichiers] = await db.query(
      `SELECT f.*, u.nom as upload_nom, u.prenom as upload_prenom
       FROM fichiers f 
       JOIN users u ON f.upload_par = u.id
       WHERE f.dossier_id = ?
       ORDER BY f.numero_boite ASC`,
      [req.params.dossierId]
    );
    res.json(fichiers);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== OBTENIR UN FICHIER =====
('/:id', auth, async (req, res) => {
  try {
    const [fichiers] = await db.query(
      `SELECT f.*, u.nom as upload_nom, u.prenom as upload_prenom
       FROM fichiers f 
       JOIN users u ON f.upload_par = u.id
       WHERE f.id = ?`,
      [req.params.id]
    );
    if (!fichiers.length) return res.status(404).json({ error: 'Fichier non trouvé.' });

    const fichier = fichiers[0];

    // Vérifier que le fichier physique existe
    fichier.existe_physique = fs.existsSync(fichier.chemin);

    await logAudit({
      userId: req.user.id, action: ACTIONS.READ, table: 'fichiers',
      recordId: fichier.id, details: { titre: fichier.titre },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json(fichier);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Réserve le prochain numéro dans la boîte du dossier. Le verrou évite les doublons
// si deux personnes déposent un fichier en même temps.
async function reserveNumeroBoite(connection, dossierId) {
  const [dossiers] = await connection.query('SELECT boite_id FROM dossiers WHERE id = ?', [dossierId]);
  if (!dossiers.length) throw new Error('Dossier introuvable.');
  const boiteId = dossiers[0].boite_id;
  await connection.query('SELECT id FROM boites WHERE id = ? FOR UPDATE', [boiteId]);
  const [rows] = await connection.query('SELECT COALESCE(MAX(numero_boite), 0) + 1 AS numero FROM fichiers WHERE boite_id = ?', [boiteId]);
  return { boiteId, numero: rows[0].numero };
}

// ===== UPLOAD UN FICHIER =====
router.get('/:id', auth, async (req, res) => {
  try {
    const [fichiers] = await db.query(
      `
      SELECT
        f.*,
        u.nom AS upload_nom,
        u.prenom AS upload_prenom,

        d.titre AS dossier_titre,
        d.categorie_id,

        c.nom AS categorie_nom,

        b.code_boite,
        a.code_armoire,
        a.emplacement_physique,
        s.nom AS salle_nom,

        (
          SELECT COUNT(*)
          FROM categories c2
          WHERE c2.id <= c.id
            AND (
              c2.organisation_id = c.organisation_id
              OR (c2.organisation_id IS NULL AND c.organisation_id IS NULL)
            )
        ) AS numero_categorie,

        (
          SELECT COUNT(*)
          FROM dossiers d2
          WHERE d2.categorie_id <=> d.categorie_id
            AND (
              d2.date_creation < d.date_creation
              OR (d2.date_creation = d.date_creation AND d2.id <= d.id)
            )
        ) AS numero_dossier,

        (
          SELECT COUNT(*)
          FROM fichiers f2
          WHERE f2.dossier_id = f.dossier_id
            AND (
              f2.date_upload < f.date_upload
              OR (f2.date_upload = f.date_upload AND f2.id <= f.id)
            )
        ) AS numero_fichier

      FROM fichiers f
      JOIN users u ON f.upload_par = u.id
      JOIN dossiers d ON f.dossier_id = d.id
      LEFT JOIN categories c ON d.categorie_id = c.id
      JOIN boites b ON d.boite_id = b.id
      JOIN armoires a ON b.armoire_id = a.id
      JOIN salles s ON a.salle_id = s.id
      WHERE f.id = ?
      `,
      [req.params.id]
    );

    if (!fichiers.length) {
      return res.status(404).json({ error: 'Fichier non trouvé.' });
    }

    const fichier = fichiers[0];

    fichier.existe_physique = fs.existsSync(fichier.chemin);

    await logAudit({
      userId: req.user.id,
      action: ACTIONS.READ,
      table: 'fichiers',
      recordId: fichier.id,
      details: { titre: fichier.titre },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(fichier);
  } catch (error) {
    console.error('Erreur détail fichier :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== UPLOAD MULTIPLE =====
router.post('/upload-multi', auth, roleCheck(80), uploadMiddleware.array, uploadMiddleware.handleError, async (req, res) => {
  let connection;
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'Aucun fichier uploadé.' });
    const { dossier_id } = req.body;
    if (!dossier_id) { req.files.forEach(f => fs.unlinkSync(f.path)); return res.status(400).json({ error: 'ID dossier requis.' }); }
    connection = await db.getConnection(); await connection.beginTransaction();
    const results = [];
    for (const file of req.files) {
      const { boiteId, numero } = await reserveNumeroBoite(connection, dossier_id);
      const [result] = await connection.query(
        `INSERT INTO fichiers (dossier_id, boite_id, numero_boite, upload_par, titre, nom_original, nom_stockage, chemin, taille, type_mime, extension, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [dossier_id, boiteId, numero, req.user.id, file.originalname, file.originalname, file.filename, file.path, file.size, file.mimetype, path.extname(file.originalname).toLowerCase().replace('.', '')]);
      results.push({ id:result.insertId, nom:file.originalname, numero_boite:numero });
    }
    await connection.commit();
    await logAudit({ userId:req.user.id, action:ACTIONS.UPLOAD, table:'fichiers', details:{nb_fichiers:req.files.length,dossier_id}, ip:req.ip,userAgent:req.get('User-Agent') });
    res.status(201).json({ message:`${req.files.length} fichier(s) uploadé(s) avec succès.`, fichiers:results });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erreur upload multiple:', error);
    if (req.files) req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally { if (connection) connection.release(); }
});

// ===== MODIFIER UN FICHIER =====
router.put('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    const { titre, sous_titre, description, mots_cles, auteur, date_document } = req.body;
    const updates = [];
    const params = [];

    if (titre) { updates.push('titre = ?'); params.push(titre); }
    if (sous_titre !== undefined) { updates.push('sous_titre = ?'); params.push(sous_titre); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (mots_cles !== undefined) { updates.push('mots_cles = ?'); params.push(mots_cles); }
    if (auteur !== undefined) { updates.push('auteur = ?'); params.push(auteur); }
    if (date_document !== undefined) { updates.push('date_document = ?'); params.push(date_document); }

    if (!updates.length) return res.status(400).json({ error: 'Aucune modification.' });

    params.push(req.params.id);
    await db.query(`UPDATE fichiers SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit({
      userId: req.user.id, action: ACTIONS.UPDATE, table: 'fichiers',
      recordId: req.params.id, details: req.body,
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Fichier modifié avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== NOUVELLE VERSION DE FICHIER =====
router.post('/:id/version', auth, roleCheck(80), uploadMiddleware.single, uploadMiddleware.handleError, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier uploadé.' });

    const [anciens] = await db.query('SELECT * FROM fichiers WHERE id = ?', [req.params.id]);
    if (!anciens.length) return res.status(404).json({ error: 'Fichier original non trouvé.' });

    const ancien = anciens[0];
    const nouvelleVersion = ancien.version + 1;

    const [result] = await db.query(
      `INSERT INTO fichiers (dossier_id, upload_par, titre, sous_titre, description, mots_cles, auteur,
        nom_original, nom_stockage, chemin, taille, type_mime, extension, version, fichier_precedent_id, date_document)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ancien.dossier_id, req.user.id, ancien.titre, ancien.sous_titre, ancien.description, ancien.mots_cles,
       ancien.auteur, req.file.originalname, req.file.filename, req.file.path, req.file.size,
       req.file.mimetype, path.extname(req.file.originalname).toLowerCase().replace('.', ''),
       nouvelleVersion, ancien.id, ancien.date_document]
    );

    await logAudit({
      userId: req.user.id, action: ACTIONS.UPLOAD, table: 'fichiers',
      recordId: result.insertId, details: { version: nouvelleVersion, fichier_precedent: ancien.id },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ id: result.insertId, version: nouvelleVersion, message: 'Nouvelle version ajoutée.' });
  } catch (error) {
    console.error('Erreur version fichier:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== TÉLÉCHARGER UN FICHIER =====
router.get('/:id/download', auth, async (req, res) => {
  try {
    const [fichiers] = await db.query('SELECT * FROM fichiers WHERE id = ?', [req.params.id]);
    if (!fichiers.length) return res.status(404).json({ error: 'Fichier non trouvé.' });

    const fichier = fichiers[0];
    if (!fs.existsSync(fichier.chemin)) {
      return res.status(404).json({ error: 'Fichier physique introuvable.' });
    }

    await logAudit({
      userId: req.user.id, action: ACTIONS.DOWNLOAD, table: 'fichiers',
      recordId: fichier.id, details: { nom: fichier.nom_original },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.download(fichier.chemin, fichier.nom_original);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== PRÉVISUALISER UN FICHIER =====
router.get('/:id/preview', auth, async (req, res) => {
  try {
    const [fichiers] = await db.query('SELECT * FROM fichiers WHERE id = ?', [req.params.id]);
    if (!fichiers.length) return res.status(404).json({ error: 'Fichier non trouvé.' });

    const fichier = fichiers[0];
    if (!fs.existsSync(fichier.chemin)) {
      return res.status(404).json({ error: 'Fichier physique introuvable.' });
    }

    res.setHeader('Content-Type', fichier.type_mime);
    if (fichier.extension === 'pdf') {
      res.setHeader('Content-Disposition', `inline; filename="${fichier.nom_original}"`);
    }
    fs.createReadStream(fichier.chemin).pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== SUPPRIMER UN FICHIER =====
router.delete('/:id', auth, roleCheck(80), async (req, res) => {
  try {
    const [fichiers] = await db.query('SELECT * FROM fichiers WHERE id = ?', [req.params.id]);
    if (!fichiers.length) return res.status(404).json({ error: 'Fichier non trouvé.' });

    // Supprimer le fichier physique
    if (fs.existsSync(fichiers[0].chemin)) {
      fs.unlinkSync(fichiers[0].chemin);
    }

    await db.query('DELETE FROM fichiers WHERE id = ?', [req.params.id]);

    await logAudit({
      userId: req.user.id, action: ACTIONS.DELETE, table: 'fichiers',
      recordId: req.params.id, details: { nom: fichiers[0].nom_original },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Fichier supprimé.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
