const db = require('./db');

async function columnExists(name) {
  const [rows] = await db.query(`
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'fichiers'
      AND COLUMN_NAME = ?
  `, [name]);

  return rows.length > 0;
}

async function indexExists(name) {
  const [rows] = await db.query(`
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'fichiers'
      AND INDEX_NAME = ?
  `, [name]);

  return rows.length > 0;
}

async function foreignKeyExists(name) {
  const [rows] = await db.query(`
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'fichiers'
      AND CONSTRAINT_NAME = ?
  `, [name]);

  return rows.length > 0;
}

(async () => {
  try {
    if (!await columnExists('boite_id')) {
      await db.query(
        'ALTER TABLE fichiers ADD COLUMN boite_id INT NULL AFTER dossier_id'
      );
      console.log('✓ Colonne boite_id ajoutée');
    }

    if (!await columnExists('numero_boite')) {
      await db.query(
        'ALTER TABLE fichiers ADD COLUMN numero_boite INT NULL AFTER boite_id'
      );
      console.log('✓ Colonne numero_boite ajoutée');
    }

    await db.query(`
      UPDATE fichiers f
      JOIN dossiers d ON d.id = f.dossier_id
      SET f.boite_id = d.boite_id
      WHERE f.boite_id IS NULL
    `);

    await db.query('SET @ancienne_boite := 0, @numero := 0');

    await db.query(`
      UPDATE fichiers f
      JOIN (
        SELECT
          id,
          boite_id,
          (@numero := IF(@ancienne_boite = boite_id, @numero + 1, 1)) AS nouveau_numero,
          (@ancienne_boite := boite_id) AS _boite
        FROM fichiers
        WHERE boite_id IS NOT NULL
        ORDER BY boite_id, date_upload, id
      ) n ON n.id = f.id
      SET f.numero_boite = n.nouveau_numero
      WHERE f.numero_boite IS NULL
    `);

    await db.query(`
      ALTER TABLE fichiers
      MODIFY boite_id INT NOT NULL,
      MODIFY numero_boite INT NOT NULL
    `);

    if (!await foreignKeyExists('fk_fichiers_boite')) {
      await db.query(`
        ALTER TABLE fichiers
        ADD CONSTRAINT fk_fichiers_boite
        FOREIGN KEY (boite_id) REFERENCES boites(id)
        ON DELETE CASCADE
      `);
    }

    if (!await indexExists('uniq_fichier_numero_boite')) {
      await db.query(`
        ALTER TABLE fichiers
        ADD UNIQUE KEY uniq_fichier_numero_boite (boite_id, numero_boite)
      `);
    }

    console.log('✓ Migration terminée : numérotation par boîte activée.');
  } catch (error) {
    console.error('✗ Échec de la migration :', error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();