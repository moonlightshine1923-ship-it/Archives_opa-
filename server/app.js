const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1. Static en premier
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// 2. Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/organisations', require('./routes/organisations'));
app.use('/api/salles', require('./routes/salles'));
app.use('/api/armoires', require('./routes/armoires'));
app.use('/api/boites', require('./routes/boites'));
app.use('/api/dossiers', require('./routes/dossiers'));
app.use('/api/fichiers', require('./routes/fichiers'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/recherche', require('./routes/recherche'));
app.use('/api/sommaire', require('./routes/sommaire'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/notifications', require('./routes/notifications'));

// 3. Ignore les requêtes Cloudflare parasites qui polluent la console
app.use('/cdn-cgi', (req, res) => res.status(204).end());

// 3b. API inconnue : JSON, jamais HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route API introuvable: ' + req.originalUrl });
});

// 4. SPA : uniquement pour les routes sans extension
app.get('*', (req, res) => {
  // Si l'URL contient un point (ex: .js, .css, .png), c'est un fichier manquant -> 404
  if (req.path.includes('.') && !req.path.endsWith('/')) {
    return res.status(404).send(`Fichier non trouvé: ${req.path}`);
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Erreur globale
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║ 📁 ARCHIVES APP - Serveur démarré          ║
║ 🌐 http://localhost:${PORT}                 ║
╚══════════════════════════════════════════════╝
`);
});

module.exports = app;
