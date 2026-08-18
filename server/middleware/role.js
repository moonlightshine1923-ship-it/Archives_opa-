/**
 * Middleware de vérification des rôles
 * @param {number} minNiveau - Niveau minimum requis
 * @param {string[]} roles - Rôles autorisés (optionnel)
 */
module.exports = (minNiveau = 0, roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const userNiveau = req.user.role_niveau || 0;

    if (userNiveau < minNiveau) {
      return res.status(403).json({ error: 'Accès refusé. Niveau insuffisant.' });
    }

    if (roles.length && !roles.includes(req.user.role_nom)) {
      // Super Admin a toujours accès
      if (req.user.role_nom !== 'Super Admin') {
        return res.status(403).json({ error: 'Accès refusé. Rôle non autorisé.' });
      }
    }

    next();
  };
};

/**
 * Middleware pour vérifier que l'utilisateur appartient à la bonne organisation
 */
module.exports.checkOrganisation = (req, res, next) => {
  const orgId = parseInt(req.params.orgId || req.body.organisation_id);
  
  if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
  
  // Super Admin a accès à tout
  if (req.user.role_nom === 'Super Admin') return next();
  
  // Vérifier l'organisation de l'utilisateur
  if (orgId && req.user.organisation_id !== orgId) {
    return res.status(403).json({ error: 'Accès refusé. Organisation non autorisée.' });
  }
  
  next();
};
