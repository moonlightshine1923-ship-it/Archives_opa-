const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit, ACTIONS } = require('../utils/audit');

// ===== LISTER LES RÔLES ===== (doit être AVANT /:id)
router.get('/roles/list', auth, async (req, res) => {
  try {
    const [roles] = await db.query('SELECT * FROM roles ORDER BY niveau DESC');
    res.json(roles);
  } catch (error) {
    console.error('Erreur liste rôles:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== LISTER LES UTILISATEURS =====
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.organisation_id, u.actif,
             u.derniere_connexion, u.date_creation,
             r.nom as role_nom, r.niveau as role_niveau,
             o.nom as organisation_nom
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      LEFT JOIN organisations o ON u.organisation_id = o.id`;

    const params = [];
    
    // Filtrer par organisation sauf Super Admin
    if (req.user.role_nom !== 'Super Admin') {
      query += ' WHERE u.organisation_id = ?';
      params.push(req.user.organisation_id);
    }

    query += ' ORDER BY u.nom, u.prenom';

    const [users] = await db.query(query, params);
    res.json(users);
  } catch (error) {
    console.error('Erreur liste utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== OBTENIR UN UTILISATEUR =====
router.get('/:id', auth, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.organisation_id, u.actif,
              u.derniere_connexion, u.date_creation,
              r.nom as role_nom, r.id as role_id, r.niveau as role_niveau,
              o.nom as organisation_nom
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       LEFT JOIN organisations o ON u.organisation_id = o.id
       WHERE u.id = ?`,
      [req.params.id]
    );
    if (!users.length) return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== CRÉER UN UTILISATEUR =====
router.post('/', auth, async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe, telephone, role_id, organisation_id } = req.body;

    // Validation avec parseInt robuste
    if (!prenom || !String(prenom).trim()) return res.status(400).json({ error: 'Prénom requis.' });
    if (!nom || !String(nom).trim()) return res.status(400).json({ error: 'Nom requis.' });
    if (!email || !String(email).trim()) return res.status(400).json({ error: 'Email requis.' });
    if (!mot_de_passe || !String(mot_de_passe).trim()) return res.status(400).json({ error: 'Mot de passe requis.' });
    
    const parsedRoleId = parseInt(role_id);
    if (!parsedRoleId || isNaN(parsedRoleId)) return res.status(400).json({ error: 'Rôle requis.' });

    // Calculer organisation_id
    let orgId = null;
    if (organisation_id !== undefined && organisation_id !== null && organisation_id !== '') {
      orgId = parseInt(organisation_id) || null;
    }
    if (!orgId && req.user.organisation_id) {
      orgId = req.user.organisation_id;
    }

    // Vérifier email unique
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [String(email).trim()]);
    if (existing.length) return res.status(400).json({ error: 'Email déjà utilisé.' });

    const hash = await bcrypt.hash(String(mot_de_passe), 10);

    const [result] = await db.query(
      `INSERT INTO users (organisation_id, role_id, nom, prenom, email, mot_de_passe, telephone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orgId, parsedRoleId, String(nom).trim(), String(prenom).trim(), String(email).trim(), hash, telephone || null]
    );

    await logAudit({
      userId: req.user.id, action: ACTIONS.CREATE, table: 'users',
      recordId: result.insertId, details: { nom, prenom, email },
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ id: result.insertId, message: 'Utilisateur créé avec succès.' });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== MODIFIER UN UTILISATEUR =====
router.put('/:id', auth, async (req, res) => {
  try {
    const { nom, prenom, email, telephone, role_id, organisation_id, actif } = req.body;
    
    const updates = [];
    const params = [];
    
    if (nom) { updates.push('nom = ?'); params.push(nom); }
    if (prenom) { updates.push('prenom = ?'); params.push(prenom); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (telephone !== undefined) { updates.push('telephone = ?'); params.push(telephone); }
    if (role_id) { updates.push('role_id = ?'); params.push(parseInt(role_id)); }
    if (organisation_id !== undefined && organisation_id !== null && organisation_id !== '') { updates.push('organisation_id = ?'); params.push(parseInt(organisation_id)); }
    if (actif !== undefined) { updates.push('actif = ?'); params.push(actif); }

    if (!updates.length) return res.status(400).json({ error: 'Aucune modification.' });

    params.push(req.params.id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit({
      userId: req.user.id, action: ACTIONS.UPDATE, table: 'users',
      recordId: req.params.id, details: req.body,
      ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Utilisateur modifié avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== SUPPRIMER UN UTILISATEUR =====
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role_niveau < 80) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);

    await logAudit({
      userId: req.user.id, action: ACTIONS.DELETE, table: 'users',
      recordId: req.params.id, ip: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
