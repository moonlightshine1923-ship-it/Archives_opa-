/* Hiérarchie des fichiers :
   I) Catégorie   1) Dossier   a) Fichier
*/

function numeroRomain(nombre) {
  const valeurs = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];

  let resultat = '';

  for (const [valeur, symbole] of valeurs) {
    while (nombre >= valeur) {
      resultat += symbole;
      nombre -= valeur;
    }
  }

  return resultat;
}

function numeroLettre(nombre) {
  let resultat = '';

  while (nombre > 0) {
    nombre--;
    resultat = String.fromCharCode(97 + (nombre % 26)) + resultat;
    nombre = Math.floor(nombre / 26);
  }

  return resultat;
}

function escapeHierarchie(valeur) {
  const div = document.createElement('div');
  div.textContent = valeur || '';
  return div.innerHTML;
}

async function ouvrirDetailsFichier(id) {
  try {
    const fichier = await API.getFichier(id);

    const categorie = fichier.categorie_nom || 'Sans catégorie';
    const numeroCategorie = fichier.numero_categorie || 1;
    const numeroDossier = fichier.numero_dossier || 1;
    const numeroFichier = fichier.numero_fichier || 1;

    const ligneHierarchie = `
      <div class="hierarchie-fichier">
        <div>
          <span class="niveau-categorie">
            ${numeroRomain(numeroCategorie)}) ${escapeHierarchie(categorie)}
          </span>

          <span class="niveau-dossier">
            ${numeroDossier}) ${escapeHierarchie(fichier.dossier_titre || 'Dossier')}
          </span>

          <span class="niveau-fichier">
            ${numeroLettre(numeroFichier)}) ${escapeHierarchie(fichier.titre)}
          </span>
        </div>

        <div class="emplacement-fichier">
          📍 ${escapeHierarchie(fichier.salle_nom || 'Salle non définie')}
          — ${escapeHierarchie(fichier.armoire_nom || fichier.code_armoire || 'Armoire non définie')}
          ${fichier.emplacement_physique ? ' — ' + escapeHierarchie(fichier.emplacement_physique) : ''}
          — Boîte ${escapeHierarchie(fichier.code_boite || 'Non définie')}
          — Dossier ${escapeHtml(fichier.dossier_titre || 'Non défini')}
        </div>
      </div>
    `;

    openModal(
      `Fichier : ${escapeHierarchie(fichier.titre)}`,
      `
        ${ligneHierarchie}

        <div class="details-fichier">
          <p><strong>Nom original :</strong> ${escapeHierarchie(fichier.nom_original)}</p>
          <p><strong>Format :</strong> ${escapeHierarchie((fichier.extension || '').toUpperCase())}</p>
          <p><strong>Taille :</strong> ${formatSize(fichier.taille)}</p>
          <p><strong>Auteur :</strong> ${escapeHierarchie(fichier.auteur || 'Non renseigné')}</p>
          <p><strong>Mots-clés :</strong> ${escapeHierarchie(fichier.mots_cles || 'Non renseignés')}</p>
          <p><strong>Description :</strong><br>${escapeHierarchie(fichier.description || 'Aucune description')}</p>
        </div>
      `,
      `
        <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
        <button class="btn btn-outline" onclick="downloadFichier(${fichier.id})">⬇️ Télécharger</button>
        ${['pdf', 'jpg', 'jpeg', 'png'].includes(fichier.extension)
          ? `<button class="btn btn-info" onclick="previewFichier(${fichier.id})">👁️ Prévisualiser</button>`
          : ''
        }
        ${canModify()
          ? `<button class="btn btn-primary" onclick="modifierFichierHierarchie(${fichier.id})">✏️ Modifier</button>`
          : ''
        }
      `
    );
  } catch (erreur) {
    showToast(erreur.message, 'error');
  }
}

async function modifierFichierHierarchie(id) {
  try {
    const fichier = await API.getFichier(id);

    openModal(
      'Modifier le fichier',
      `
        <div class="form-group">
          <label>Titre *</label>
          <input id="hfTitre" value="${escapeHierarchie(fichier.titre)}">
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea id="hfDescription">${escapeHierarchie(fichier.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label>Mots-clés</label>
          <input id="hfMotsCles" value="${escapeHierarchie(fichier.mots_cles || '')}">
        </div>

        <div class="form-group">
          <label>Auteur</label>
          <input id="hfAuteur" value="${escapeHierarchie(fichier.auteur || '')}">
        </div>
      `,
      `
        <button class="btn btn-secondary" onclick="ouvrirDetailsFichier(${id})">Annuler</button>
        <button class="btn btn-primary" onclick="enregistrerFichierHierarchie(${id})">Enregistrer</button>
      `
    );
  } catch (erreur) {
    showToast(erreur.message, 'error');
  }
}

async function enregistrerFichierHierarchie(id) {
  const titre = document.getElementById('hfTitre').value.trim();

  if (!titre) {
    showToast('Le titre est obligatoire.', 'error');
    return;
  }

  try {
    await API.updateFichier(id, {
      titre,
      description: document.getElementById('hfDescription').value,
      mots_cles: document.getElementById('hfMotsCles').value,
      auteur: document.getElementById('hfAuteur').value
    });

    showToast('Fichier modifié avec succès.');
    closeModal();

    if (typeof loadFichiers === 'function') {
      loadFichiers();
    }
  } catch (erreur) {
    showToast(erreur.message, 'error');
  }
}