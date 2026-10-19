# 📁 Archives App — Application de gestion d'archives

Application web professionnelle de gestion d'archives physiques et numériques pour l' **OPA** .
Elle permet de structurer et suivre l'arborescence complète (`Organisation → Salle → Armoire → Boîte → Dossier → Fichier`) et d'assurer une traçabilité rigoureuse.

Le projet est une application full-stack Node.js / Express / MySQL avec un frontend en HTML, CSS et JavaScript vanilla.

## 🔑 Identifiants de connexion par défaut

| Rôle | Email | Mot de passe |Rôle | Organisation |
| :--- | :--- | :--- |
| **Administrateur** | `superadmin@archives.dz` | `admin123` |`Super Admin` | `Toutes` |

*(Vous pourrez modifier ces mots de passe dans l'onglet Paramètres une fois connecté).*

## 📋 Fonctionnalités principales

### 🏛️ Gestion des Archives (Physiques & Numériques)
* **Hiérarchie complète :** Gestion des organisations, salles d'archives, armoires, boîtes, dossiers et fichiers.
* **Dossiers & Références :** catégorisation et gestion des niveaux de confidentialité (de Public à Très Secret).
* **Fichiers :** Upload, multi-upload, versioning, prévisualisation et téléchargement (formats supportés : PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG, ZIP).

### 🔍 Recherche & QR Codes
* **Recherche avancée :** Recherche rapide par référence/titre ou recherche multicritères (14 filtres disponibles).

### 📋 Emprunts & Suivi
* Enregistrement des emprunts physiques, suivi des retours et alertes en cas de retard.

### 🔒 Sécurité & Journal d'audit
* Authentification par JWT et hachage des mots de passe (`bcrypt`).
* Contrôle d'accès basé sur les rôles (isolation stricte par organisation).
* Traçabilité complète via un journal d'audit (logs).

### 📊 Dashboard & Statistiques
* Tableaux de bord en temps réel, graphiques par catégorie/état/confidentialité et suivi de l'occupation des salles.

## 🛠️ Stack technique

* **Backend & API :** Node.js, Express (API REST et serveur web)
* **Base de données :** MySQL / MariaDB (via `mysql2`)
* **Sécurité & Authentification :** JWT, `bcrypt`
* **Gestion des fichiers & QR :** `Multer` (upload), `qrcode` (génération)
* **Frontend :** HTML, CSS et JavaScript vanilla (SPA)

## ⚙️ Installation et lancement

1. **Prérequis :** Installer Node.js (v18+) et s'assurer que MySQL/MariaDB est actif.
2. **Installer les dépendances :**
   ```bash
   cd archives-app
   npm install

## 📝 Guide de développement et bonnes pratiques

### Méthode recommandée pour les modifications
1. **Sauvegarder :** Toujours faire une sauvegarde de la base de données avant toute modification majeure.
2. **Méthode itérative :** Modifier un seul composant à la fois (frontend, routes API, backend ou base de données) et tester.
3. **Actualisation :**
   * Backend : Redémarrer le serveur (`Ctrl + C` puis `npm start`).
   * Frontend : Vider le cache du navigateur (`Ctrl + F5`).
4. **Validation :** Tester les cas nominaux et d'erreur, et vérifier systématiquement la console (`F12`) ainsi que les logs du terminal.

### Architecture des vues frontend (`public/js/app.js` & `api.js`)
* `dashboard()` : Tableaux de bord et statistiques
* `organisationsList()` : Gestion des entités (OPA / Dépêche)
* `sallesList()` / `armoiresList()` / `boitesList()` : Gestion de l'infrastructure physique
* `dossiersList()` / `dossierDetail()` : Gestion des dossiers d'archives
* `rechercheSearch()` : Module de recherche avancée
* `empruntsList()` : Suivi des emprunts
* `auditList()` : Journal d'audit et de sécurité