const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// Routes API
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
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/notifications', require('./routes/notifications'));

// API inconnue : renvoyer du JSON, jamais index.html
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route API introuvable.' });
});

// SPA : uniquement pour les routes de pages
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Erreur
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   📁 ARCHIVES APP - Serveur démarré         ║
  ║   🌐 http://localhost:${PORT}                 ║
  ╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
