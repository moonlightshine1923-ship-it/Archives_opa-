const db = require('../config/db');

/**
 * Enregistrer une action dans le journal d'audit
 */
async function logAudit({ userId, action, table, recordId, details, ip, userAgent }) {
  try {
    await db.query(
      `INSERT INTO journal_audit (user_id, action, table_concernee, enregistrement_id, details, adresse_ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        action,
        table || null,
        recordId || null,
        details ? JSON.stringify(details) : null,
        ip || null,
        userAgent || null
      ]
    );
  } catch (error) {
    console.error('Erreur audit log:', error.message);
  }
}

// Actions prédéfinies
const ACTIONS = {
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  CREATE: 'Ajout',
  UPDATE: 'Modification',
  READ: 'Consultation',
  DOWNLOAD: 'Téléchargement',
  MOVE: 'Déplacement',
  BORROW: 'Emprunt',
  RETURN: 'Retour',
  DELETE: 'Suppression',
  DISABLE: 'Désactivation',
  ENABLE: 'Activation',
  UPLOAD: 'Upload',
  PRINT_QR: 'Impression QR Code'
};

module.exports = { logAudit, ACTIONS };
