# 📁 Archives App - Application de Gestion d'Archives

Application web professionnelle de gestion d'archives physiques et numériques pour les organisations **OPA** et **Dépêche**.

## 🏗️ Architecture

```
Organisation → Salle → Armoire → Boîte → Dossier → Fichier
```

## 🛠️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js + Express |
| Base de données | MySQL (MariaDB) |
| Authentification | JWT + bcrypt |
| Upload | Multer |
| QR Codes | qrcode |
| Frontend | HTML + CSS + JavaScript (Vanilla) |

## 📦 Installation

### Prérequis
- Node.js 18+
- MySQL / MariaDB

### 1. Installer les dépendances
```bash
cd archives-app
npm install
```

### 2. Configurer la base de données
Éditez le fichier `.env` si nécessaire :
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=archives_db
```

### 3. Initialiser la base de données
```bash
npm run init-db
```

### 4. Démarrer le serveur
```bash
npm start
```

L'application est accessible sur : **http://localhost:3000**

## 🔐 Comptes par défaut

| Email | Mot de passe | Rôle | Organisation |
|-------|-------------|------|-------------|
| superadmin@archives.dz | admin123 | Super Admin | Toutes |
| admin.opa@archives.dz | admin123 | Admin OPA | OPA |
| admin.depeche@archives.dz | admin123 | Admin Dépêche | Dépêche |

## 📋 Fonctionnalités

### 🏛️ Gestion des Archives
- **Organisations** : OPA et Dépêche
- **Salles** : Créer, modifier, désactiver, voir capacité
- **Armoires** : Gérer avec code unique, emplacement physique
- **Boîtes** : Organiser et déplacer entre armoires
- **Dossiers** : Référence auto (ARC-2026-XXXXXX), catégories, niveaux de confidentialité
- **Fichiers** : Upload, multi-upload, versioning, prévisualisation, téléchargement

### 🔍 Recherche
- Recherche rapide (référence, titre)
- Recherche avancée (14 critères)
- Filtres par organisation, catégorie, état, confidentialité

### 📱 QR Codes
- Génération automatique par dossier
- Impression avec étiquettes
- Scan pour accès direct au dossier

### 📋 Emprunts
- Enregistrement d'emprunts
- Suivi des retours
- Alerte de retard

### 🔒 Sécurité
- Authentification JWT
- 5 niveaux de rôles (Super Admin → Consultation)
- 5 niveaux de confidentialité (Public → Très Secret)
- Isolation par organisation
- Journal d'audit complet

### 📊 Dashboard
- Statistiques en temps réel
- Graphiques par catégorie, état, confidentialité
- Occupation des salles
- Derniers documents ajoutés

## 🗂️ Structure du Projet

```
archives-app/
├── sql/
│   ├── schema.sql          # Schéma BDD complet
│   └── seed.sql            # Données initiales
├── server/
│   ├── app.js              # Application Express
│   ├── config/
│   │   ├── db.js           # Connexion MySQL
│   │   └── init-db.js      # Script d'initialisation
│   ├── middleware/
│   │   ├── auth.js         # Authentification JWT
│   │   ├── role.js         # Contrôle des rôles
│   │   └── upload.js       # Upload de fichiers
│   ├── routes/
│   │   ├── auth.js         # Authentification
│   │   ├── users.js        # Gestion utilisateurs
│   │   ├── organisations.js
│   │   ├── salles.js
│   │   ├── armoires.js
│   │   ├── boites.js
│   │   ├── dossiers.js
│   │   ├── fichiers.js
│   │   ├── categories.js
│   │   ├── emprunts.js
│   │   ├── recherche.js
│   │   ├── dashboard.js
│   │   ├── qrcodes.js
│   │   ├── audit.js
│   │   └── notifications.js
│   └── utils/
│       ├── audit.js        # Journal d'audit
│       ├── qrcode.js       # Génération QR
│       └── reference.js    # Génération références
├── public/
│   ├── index.html          # SPA principale
│   ├── css/
│   │   └── style.css       # Styles CSS
│   └── js/
│       ├── api.js          # Client API
│       └── app.js          # Application frontend
├── .env                    # Configuration
└── package.json
```

## 🗄️ Base de Données

### Tables principales
- `roles` - Rôles utilisateurs
- `organisations` - OPA, Dépêche
- `users` - Utilisateurs
- `salles` - Salles d'archives
- `armoires` - Armoires (A01, A02...)
- `boites` - Boîtes (B001, B002...)
- `categories` - Catégories de documents
- `sous_categories` - Sous-catégories
- `dossiers` - Dossiers archivés
- `fichiers` - Fichiers numériques
- `emprunts` - Suivi des emprunts
- `journal_audit` - Journal d'audit
- `notifications` - Notifications

### Formats autorisés
PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG, ZIP

### Niveaux de confidentialité
Public → Interne → Confidentiel → Secret → Très Secret

## 🚀 Démarrage rapide

```bash
# Installation complète
cd archives-app
npm install
npm run init-db
npm start

# Ouvrir http://localhost:3000
# Se connecter avec superadmin@archives.dz / admin123
```
