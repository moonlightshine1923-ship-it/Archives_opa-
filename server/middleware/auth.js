const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    // Check Authorization header first, then query param
    let token = req.headers.authorization?.split(' ')[1];
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Token manquant. Veuillez vous connecter.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.organisation_id, u.actif,
              r.nom as role_nom, r.niveau as role_niveau
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (!users.length || !users[0].actif) {
      return res.status(401).json({ error: 'Utilisateur invalide ou désactivé.' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }
    return res.status(401).json({ error: 'Token invalide.' });
  }
};
