const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit, ACTIONS } = require('../utils/audit');

// ===== CONNEXION =====
router.post('/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const [users] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.mot_de_passe, u.organisation_id, u.actif,
              r.nom as role_nom, r.niveau as role_niveau
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ?`,
      [email]
    );

    if (!users.length) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const user = users[0];

    if (!user.actif) {
      return res.status(401).json({ error: 'Compte désactivé.' });
    }

    const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role_nom },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Mettre à jour dernière connexion
    await db.query('UPDATE users SET derniere_connexion = NOW() WHERE id = ?', [user.id]);

    // Audit
    await logAudit({
      userId: user.id,
      action: ACTIONS.LOGIN,
      table: 'users',
      recordId: user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role_nom: user.role_nom,
        role_niveau: user.role_niveau,
        organisation_id: user.organisation_id
      }
    });
  } catch (error) {
    console.error('❌ Erreur login détaillée:', error.message, error.stack);
    res.status(500).json({ error: `Erreur serveur: ${error.message}` });
  }
});

// ===== DÉCONNEXION =====
router.post('/logout', auth, async (req, res) => {
  try {
    await logAudit({
      userId: req.user.id,
      action: ACTIONS.LOGOUT,
      table: 'users',
      recordId: req.user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.json({ message: 'Déconnexion réussie.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== PROFIL =====
router.get('/me', auth, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.organisation_id, u.actif,
              u.derniere_connexion, u.date_creation,
              r.nom as role_nom, r.niveau as role_niveau,
              o.nom as organisation_nom
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       LEFT JOIN organisations o ON u.organisation_id = o.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (!users.length) return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ===== CHANGER MOT DE PASSE =====
router.put('/change-password', auth, async (req, res) => {
  try {
    const { ancien_mdp, nouveau_mdp } = req.body;
    if (!ancien_mdp || !nouveau_mdp) {
      return res.status(400).json({ error: 'Ancien et nouveau mot de passe requis.' });
    }

    const [users] = await db.query('SELECT mot_de_passe FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(ancien_mdp, users[0].mot_de_passe);
    if (!valid) return res.status(401).json({ error: 'Ancien mot de passe incorrect.' });

    const hash = await bcrypt.hash(nouveau_mdp, 10);
    await db.query('UPDATE users SET mot_de_passe = ? WHERE id = ?', [hash, req.user.id]);

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
