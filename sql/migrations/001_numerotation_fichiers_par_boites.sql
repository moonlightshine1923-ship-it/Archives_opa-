-- À exécuter UNE SEULE FOIS sur une base Archives App déjà existante.
-- Chaque fichier reçoit un numéro séquentiel propre à sa boîte : 01, 02, 03...
ALTER TABLE fichiers ADD COLUMN boite_id INT NULL AFTER dossier_id;
ALTER TABLE fichiers ADD COLUMN numero_boite INT NULL AFTER boite_id;

UPDATE fichiers f
JOIN dossiers d ON d.id = f.dossier_id
SET f.boite_id = d.boite_id;

-- Numérotation des anciens fichiers par boîte, selon leur date d'ajout.
SET @ancienne_boite := 0;
SET @numero := 0;
UPDATE fichiers f
JOIN (
  SELECT id, boite_id,
         (@numero := IF(@ancienne_boite = boite_id, @numero + 1, 1)) AS nouveau_numero,
         (@ancienne_boite := boite_id) AS _boite
  FROM fichiers
  ORDER BY boite_id, date_upload, id
) n ON n.id = f.id
SET f.numero_boite = n.nouveau_numero;

ALTER TABLE fichiers MODIFY boite_id INT NOT NULL;
ALTER TABLE fichiers MODIFY numero_boite INT NOT NULL;
ALTER TABLE fichiers ADD CONSTRAINT fk_fichiers_boite FOREIGN KEY (boite_id) REFERENCES boites(id) ON DELETE CASCADE;
ALTER TABLE fichiers ADD UNIQUE KEY uniq_fichier_numero_boite (boite_id, numero_boite);
