-- =====================================================
-- DONNÉES DE TEST
-- =====================================================

USE archives_db;

-- Super Admin (mot de passe: admin123)
INSERT INTO `users` (`organisation_id`, `role_id`, `nom`, `prenom`, `email`, `mot_de_passe`) VALUES
(NULL, 1, 'Super', 'Admin', 'superadmin@archives.dz', '$2a$10$YourHashHere');

-- Admin OPA (mot de passe: admin123)
INSERT INTO `users` (`organisation_id`, `role_id`, `nom`, `prenom`, `email`, `mot_de_passe`) VALUES
(1, 2, 'Admin', 'OPA', 'admin.opa@archives.dz', '$2a$10$YourHashHere');

-- Admin Dépêche (mot de passe: admin123)
INSERT INTO `users` (`organisation_id`, `role_id`, `nom`, `prenom`, `email`, `mot_de_passe`) VALUES
(2, 3, 'Admin', 'Dépêche', 'admin.depeche@archives.dz', '$2a$10$YourHashHere');

-- Catégories OPA
INSERT INTO `categories` (`organisation_id`, `nom`, `description`) VALUES
(1, 'Notariat', 'Documents notariaux'),
(1, 'Secrétariat', 'Documents du secrétariat'),
(1, 'Juridique', 'Documents juridiques'),
(1, 'Finances', 'Documents financiers'),
(1, 'Comptabilité', 'Documents comptables'),
(1, 'Adhérents', 'Dossiers des adhérents'),
(1, 'Conseillers', 'Dossiers des conseillers'),
(1, 'Membres Actifs', 'Dossiers des membres actifs'),
(1, 'Ressources Humaines', 'Documents RH'),
(1, 'Contrats', 'Contrats et conventions'),
(1, 'Conventions', 'Conventions internationales'),
(1, 'Partenariats', 'Documents de partenariat'),
(1, 'Courriers Entrants', 'Courriers reçus'),
(1, 'Courriers Sortants', 'Courriers envoyés'),
(1, 'Séminaires', 'Documents de séminaires'),
(1, 'B2B', 'Documents B2B');

-- Catégories Dépêche
INSERT INTO `categories` (`organisation_id`, `nom`, `description`) VALUES
(2, 'Rédaction', 'Documents de rédaction'),
(2, 'Publicité', 'Documents publicitaires'),
(2, 'Administration', 'Documents administratifs'),
(2, 'Courriers Entrants', 'Courriers reçus'),
(2, 'Courriers Sortants', 'Courriers envoyés'),
(2, 'Juridique', 'Documents juridiques'),
(2, 'Finances', 'Documents financiers'),
(2, 'Ressources Humaines', 'Documents RH');

-- Salles
INSERT INTO `salles` (`organisation_id`, `nom`, `description`) VALUES
(1, 'Salle Principale', 'Salle principale d\'archives OPA'),
(1, 'Salle Annexe', 'Salle annexe OPA'),
(2, 'Salle Archives', 'Salle principale d\'archives Dépêche'),
(2, 'Salle Réserve', 'Salle de réserve Dépêche');

-- Armoires
INSERT INTO `armoires` (`salle_id`, `code_armoire`, `nom`, `description`, `emplacement_physique`, `capacite`) VALUES
(1, 'A01', 'Armoire A01', 'Première armoire salle principale', 'Mur nord', 50),
(1, 'A02', 'Armoire A02', 'Deuxième armoire salle principale', 'Mur nord', 50),
(1, 'A03', 'Armoire A03', 'Troisième armoire salle principale', 'Mur est', 50),
(2, 'A04', 'Armoire A04', 'Première armoire salle annexe', 'Mur ouest', 40),
(3, 'D01', 'Armoire D01', 'Première armoire salle archives', 'Mur nord', 50),
(3, 'D02', 'Armoire D02', 'Deuxième armoire salle archives', 'Mur est', 50),
(3, 'D05', 'Armoire D05', 'Cinquième armoire salle archives', 'Mur sud', 50),
(4, 'D06', 'Armoire D06', 'Première armoire salle réserve', 'Mur ouest', 40);

-- Boîtes
INSERT INTO `boites` (`armoire_id`, `code_boite`, `nom`, `description`, `capacite`) VALUES
(1, 'B001', 'Boîte B001', 'Boîte contrats', 30),
(1, 'B002', 'Boîte B002', 'Boîte conventions', 30),
(2, 'B003', 'Boîte B003', 'Boîte courriers', 30),
(2, 'B004', 'Boîte B004', 'Boîte RH', 30),
(3, 'B015', 'Boîte B015', 'Boîte contrats 2026', 30),
(5, 'B005', 'Boîte B005', 'Boîte rédaction', 30),
(6, 'B006', 'Boîte B006', 'Boîte publicité', 30),
(7, 'B010', 'Boîte B010', 'Boîte courriers', 30);
