const db = require('../config/db');

/**
 * Générer une référence unique pour un dossier
 * Format: ARC-YYYY-NNNNNN
 */
async function generateReference() {
  const year = new Date().getFullYear();
  
  const [rows] = await db.query(
    `SELECT reference FROM dossiers WHERE reference LIKE ? ORDER BY id DESC LIMIT 1`,
    [`ARC-${year}-%`]
  );

  let nextNum = 1;
  if (rows.length > 0) {
    const lastRef = rows[0].reference;
    const lastNum = parseInt(lastRef.split('-')[2]);
    nextNum = lastNum + 1;
  }

  return `ARC-${year}-${String(nextNum).padStart(6, '0')}`;
}

/**
 * Obtenir le chemin complet de localisation d'un dossier
 */
async function getDossierLocation(dossierId) {
  const [rows] = await db.query(
    `SELECT 
      d.id, d.reference, d.titre,
      o.nom as organisation_nom,
      s.nom as salle_nom,
      a.code_armoire, a.nom as armoire_nom,
      b.code_boite, b.nom as boite_nom
    FROM dossiers d
    JOIN boites b ON d.boite_id = b.id
    JOIN armoires a ON b.armoire_id = a.id
    JOIN salles s ON a.salle_id = s.id
    JOIN organisations o ON s.organisation_id = o.id
    WHERE d.id = ?`,
    [dossierId]
  );

  if (!rows.length) return null;

  const r = rows[0];
  return {
    organisation: r.organisation_nom,
    salle: r.salle_nom,
    armoire: r.code_armoire,
    boite: r.code_boite,
    dossier: r.titre,
    chemin_complet: `${r.salle_nom} > ${r.armoire_nom || r.code_armoire} > ${r.code_boite} > ${r.titre}`,
    reference: r.reference
  };
}

module.exports = { generateReference, getDossierLocation };
