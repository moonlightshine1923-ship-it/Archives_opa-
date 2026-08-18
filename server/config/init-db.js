const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDatabase() {
  let connection;
  try {
    // Connexion sans base pour créer la DB
    const dbPassword = process.env.DB_PASSWORD && process.env.DB_PASSWORD.length > 0 ? process.env.DB_PASSWORD : undefined;
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: dbPassword,
      multipleStatements: true
    });

    console.log('📦 Connexion MySQL établie');

    // Exécuter le schéma
    const schemaPath = path.join(__dirname, '../../sql/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      await connection.query(schemaSql);
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    console.log('✅ Schéma de base de données créé');

    // Exécuter les données de test
    const seedPath = path.join(__dirname, '../../sql/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(seedSql);
    console.log('✅ Données initiales insérées');

    // Hasher et mettre à jour les mots de passe
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.query(
      `UPDATE archives_db.users SET mot_de_passe = ? WHERE email IN (?, ?, ?)`,
      [hashedPassword, 'superadmin@archives.dz', 'admin.opa@archives.dz', 'admin.depeche@archives.dz']
    );
    console.log('✅ Mots de passe initialisés (admin123)');

    console.log('\n🎉 Base de données initialisée avec succès !');
    console.log('📧 Comptes créés :');
    console.log('   - superadmin@archives.dz / admin123 (Super Admin)');
    console.log('   - admin.opa@archives.dz / admin123 (Admin OPA)');
    console.log('   - admin.depeche@archives.dz / admin123 (Admin Dépêche)');

  } catch (error) {
    console.error('❌ Erreur initialisation DB:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initDatabase();
