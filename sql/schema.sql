-- =====================================================
-- ARCHIVES APP - Schéma de base de données MySQL
-- =====================================================

CREATE DATABASE IF NOT EXISTS archives_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE archives_db;

-- =====================================================
-- TABLES
-- =====================================================

-- Rôles
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nom` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255),
  `niveau` INT NOT NULL DEFAULT 0,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Organisations
DROP TABLE IF EXISTS `organisations`;
CREATE TABLE `organisations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nom` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `description` TEXT,
  `actif` TINYINT(1) DEFAULT 1,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Utilisateurs
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organisation_id` INT,
  `role_id` INT NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `mot_de_passe` VARCHAR(255) NOT NULL,
  `telephone` VARCHAR(20),
  `actif` TINYINT(1) DEFAULT 1,
  `derniere_connexion` DATETIME,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `date_modification` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
) ENGINE=InnoDB;

-- Salles
DROP TABLE IF EXISTS `salles`;
CREATE TABLE `salles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organisation_id` INT NOT NULL,
  `nom` VARCHAR(150) NOT NULL,
  `description` TEXT,
  `actif` TINYINT(1) DEFAULT 1,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Armoires
DROP TABLE IF EXISTS `armoires`;
CREATE TABLE `armoires` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `salle_id` INT NOT NULL,
  `code_armoire` VARCHAR(50) NOT NULL,
  `nom` VARCHAR(150) NOT NULL,
  `description` TEXT,
  `emplacement_physique` VARCHAR(255),
  `capacite` INT DEFAULT 0,
  `actif` TINYINT(1) DEFAULT 1,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`salle_id`) REFERENCES `salles`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_armoire_salle` (`salle_id`, `code_armoire`)
) ENGINE=InnoDB;

-- Boîtes
DROP TABLE IF EXISTS `boites`;
CREATE TABLE `boites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `armoire_id` INT NOT NULL,
  `code_boite` VARCHAR(50) NOT NULL,
  `nom` VARCHAR(150) NOT NULL,
  `description` TEXT,
  `capacite` INT DEFAULT 0,
  `actif` TINYINT(1) DEFAULT 1,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`armoire_id`) REFERENCES `armoires`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_boite_armoire` (`armoire_id`, `code_boite`)
) ENGINE=InnoDB;

-- Catégories
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organisation_id` INT,
  `nom` VARCHAR(150) NOT NULL,
  `description` TEXT,
  `actif` TINYINT(1) DEFAULT 1,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Sous-catégories
DROP TABLE IF EXISTS `sous_categories`;
CREATE TABLE `sous_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `categorie_id` INT NOT NULL,
  `nom` VARCHAR(150) NOT NULL,
  `description` TEXT,
  `actif` TINYINT(1) DEFAULT 1,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`categorie_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Dossiers
DROP TABLE IF EXISTS `dossiers`;
CREATE TABLE `dossiers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `boite_id` INT NOT NULL,
  `categorie_id` INT,
  `sous_categorie_id` INT,
  `organisation_id` INT NOT NULL,
  `reference` VARCHAR(50) NOT NULL UNIQUE,
  `titre` VARCHAR(255) NOT NULL,
  `sous_titre` VARCHAR(255),
  `description` TEXT,
  `niveau_confidentialite` ENUM('Public','Interne','Confidentiel','Secret','Très Secret') DEFAULT 'Interne',
  `etat` ENUM('Ouvert','Fermé','Archivé','Emprunté') DEFAULT 'Ouvert',
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `date_archivage` DATETIME,
  `date_modification` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`boite_id`) REFERENCES `boites`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`categorie_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`sous_categorie_id`) REFERENCES `sous_categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Fichiers
DROP TABLE IF EXISTS `fichiers`;
CREATE TABLE `fichiers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dossier_id` INT NOT NULL,
  `boite_id` INT NOT NULL,
  `numero_boite` INT NOT NULL,
  `upload_par` INT NOT NULL,
  `titre` VARCHAR(255) NOT NULL,
  `sous_titre` VARCHAR(255),
  `description` TEXT,
  `mots_cles` TEXT,
  `auteur` VARCHAR(150),
  `nom_original` VARCHAR(255) NOT NULL,
  `nom_stockage` VARCHAR(255) NOT NULL,
  `chemin` VARCHAR(500) NOT NULL,
  `taille` BIGINT DEFAULT 0,
  `type_mime` VARCHAR(100),
  `extension` VARCHAR(10),
  `version` INT DEFAULT 1,
  `fichier_precedent_id` INT,
  `date_document` DATE,
  `date_upload` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`dossier_id`) REFERENCES `dossiers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`boite_id`) REFERENCES `boites`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`upload_par`) REFERENCES `users`(`id`),
  FOREIGN KEY (`fichier_precedent_id`) REFERENCES `fichiers`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `uniq_fichier_numero_boite` (`boite_id`, `numero_boite`)
) ENGINE=InnoDB;

-- Emprunts
DROP TABLE IF EXISTS `emprunts`;
CREATE TABLE `emprunts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dossier_id` INT NOT NULL,
  `emprunte_par` INT NOT NULL,
  `date_emprunt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `date_retour_prevue` DATETIME NOT NULL,
  `date_retour_effective` DATETIME,
  `motif` TEXT,
  `etat` ENUM('En cours','Retourné','En retard') DEFAULT 'En cours',
  FOREIGN KEY (`dossier_id`) REFERENCES `dossiers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`emprunte_par`) REFERENCES `users`(`id`)
) ENGINE=InnoDB;

-- Journal d'audit
DROP TABLE IF EXISTS `journal_audit`;
CREATE TABLE `journal_audit` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `action` VARCHAR(100) NOT NULL,
  `table_concernee` VARCHAR(100),
  `enregistrement_id` INT,
  `details` JSON,
  `adresse_ip` VARCHAR(45),
  `user_agent` VARCHAR(500),
  `date_action` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Notifications
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `titre` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) DEFAULT 'info',
  `lu` TINYINT(1) DEFAULT 0,
  `lien` VARCHAR(500),
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- INDEX
-- =====================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organisation_id);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_salles_org ON salles(organisation_id);
CREATE INDEX idx_armoires_salle ON armoires(salle_id);
CREATE INDEX idx_boites_armoire ON boites(armoire_id);
CREATE INDEX idx_dossiers_boite ON dossiers(boite_id);
CREATE INDEX idx_dossiers_ref ON dossiers(reference);
CREATE INDEX idx_dossiers_org ON dossiers(organisation_id);
CREATE INDEX idx_dossiers_cat ON dossiers(categorie_id);
CREATE INDEX idx_dossiers_etat ON dossiers(etat);
CREATE INDEX idx_dossiers_conf ON dossiers(niveau_confidentialite);
CREATE INDEX idx_fichiers_dossier ON fichiers(dossier_id);
CREATE INDEX idx_emprunts_dossier ON emprunts(dossier_id);
CREATE INDEX idx_emprunts_user ON emprunts(emprunte_par);
CREATE INDEX idx_emprunts_etat ON emprunts(etat);
CREATE INDEX idx_audit_user ON journal_audit(user_id);
CREATE INDEX idx_audit_action ON journal_audit(action);
CREATE INDEX idx_audit_date ON journal_audit(date_action);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_lu ON notifications(lu);
CREATE INDEX idx_categories_org ON categories(organisation_id);
CREATE INDEX idx_souscat_cat ON sous_categories(categorie_id);

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Rôles
INSERT INTO `roles` (`nom`, `description`, `niveau`) VALUES
('Super Admin', 'Accès total au système', 100),
('Admin OPA', 'Administrateur organisation OPA', 80),
('Admin Dépêche', 'Administrateur organisation Dépêche', 80),
('Archiviste', 'Gestion des archives et fichiers', 50),
('Consultation', 'Lecture uniquement', 20);

-- Organisations
INSERT INTO `organisations` (`nom`, `code`, `description`) VALUES
('OPA', 'OPA', 'Organisation OPA'),
('Dépêche', 'DEPECHE', 'Organisation Dépêche');
