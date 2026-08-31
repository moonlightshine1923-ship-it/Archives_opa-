/**
 * Archives OPA - Application principale (v5.0)
 */

let currentUser = null;
let currentPage = 'dashboard';
let archivesPath = [];

// ===== HELPERS RÔLES =====
function canModify() {
  return currentUser && currentUser.role_niveau >= 80;
}
function isAdmin() {
  return currentUser && currentUser.role_niveau >= 80;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('archives_token');
  if (token) {
    API.token = token;
    try {
      const user = await API.getMe();
      currentUser = user;
      localStorage.setItem('archives_user', JSON.stringify(user));
      showApp();
    } catch { API.clearToken(); showLogin(); }
  } else { showLogin(); }
});

// ===== LOGIN / LOGOUT =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  try {
    const result = await API.login(email, password);
    API.setToken(result.token);
    currentUser = result.user;
    localStorage.setItem('archives_user', JSON.stringify(result.user));
    errEl.style.display = 'none';
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
});

async function logout() {
  try { await API.logout(); } catch {}
  API.clearToken(); showLogin();
}

// ===== AFFICHER / MASQUER LE MOT DE PASSE =====
/**
 * Bascule un champ mot de passe entre masqué (type="password") et visible
 * (type="text"), en gardant le focus et la position du curseur dans le champ.
 * @param {HTMLElement} button - le bouton .password-toggle cliqué
 */
function togglePasswordField(button) {
  const input = button.dataset.target
    ? document.getElementById(button.dataset.target)
    : (button.parentElement && button.parentElement.querySelector('input'));
  if (!input) return;

  const visible = input.type === 'text';
  const caretStart = input.selectionStart;
  const caretEnd = input.selectionEnd;

  input.type = visible ? 'password' : 'text';
  button.classList.toggle('is-visible', !visible);
  button.setAttribute('aria-pressed', String(!visible));

  const libelle = !visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
  button.setAttribute('aria-label', libelle);
  button.title = libelle;

  input.focus();
  if (caretStart !== null && caretEnd !== null) {
    try { input.setSelectionRange(caretStart, caretEnd); } catch { /* type non textuel */ }
  }
}

// Délégation d'événement : fonctionne aussi pour les champs créés dynamiquement
// (modales), sans avoir à réinitialiser quoi que ce soit.
document.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return;
  const button = e.target.closest('.password-toggle');
  if (!button) return;
  e.preventDefault();
  togglePasswordField(button);
});

function showLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appPage').style.display = 'none';
}

function showApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appPage').style.display = 'flex';
  document.getElementById('userName').textContent = `${currentUser.prenom} ${currentUser.nom}`;
  document.getElementById('userRoleName').textContent = currentUser.role_nom;
  document.getElementById('userAvatar').textContent = `${currentUser.prenom[0]}${currentUser.nom[0]}`;
  applySidebarPermissions();
  navigateTo('dashboard');
}

// ===== SIDEBAR PERMISSIONS =====
function applySidebarPermissions() {
  const level = currentUser.role_niveau || 0;
  document.querySelectorAll('.sidebar-nav .nav-item, .sidebar-nav .nav-section').forEach(el => {
    const minLevel = parseInt(el.dataset.minLevel || '0');
    el.style.display = level >= minLevel ? '' : 'none';
  });
}

// ===== NAVIGATION =====
function navigateTo(page, params = {}) {
  // Bloquer l'accès aux pages non autorisées
  const pageMinLevel = {
    dashboard:0, salles:80, armoires:80, dossiers:0, fichiers:0, recherche:0, sommaire:0,
    archives:80, boites:80, organisations:80, categories:80, audit:80, users:80
  };
  const level = currentUser ? currentUser.role_niveau : 0;
  if ((pageMinLevel[page] || 0) > level) {
    showToast('Accès non autorisé', 'error');
    page = 'dashboard';
  }

  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
  const titles = {
    dashboard:'Dashboard', archives:'Explorateur d\'Archives', organisations:'Organisations', salles:'Salles', armoires:'Armoires',
    boites:'Boîtes', dossiers:'Dossiers', fichiers:'Fichiers', sommaire:'Sommaire', categories:'Catégories',
    organisations:'Organisations', recherche:'Recherche Avancée',
    audit:'Journal d\'Audit', users:'Utilisateurs'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const loaders = {
    dashboard:loadDashboard, archives:loadArchives, organisations:loadOrganisations, salles:loadSalles, armoires:loadArmoires,
    boites:loadBoites, dossiers:loadDossiers, fichiers:loadFichiers, sommaire:loadSommaire, categories:loadCategories,
    organisations:loadOrganisations, recherche:loadRecherche,
    audit:loadAudit, users:loadUsers
  };
  if (loaders[page]) loaders[page](params);
}

// ===== TOAST / MODAL =====
function showToast(msg, type='success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${{success:'✅',error:'❌',warning:'⚠️'}[type]||'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t); setTimeout(() => t.remove(), 4000);
}

function openModal(title, bodyHtml, footerHtml='') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml;
  document.getElementById('modalOverlay').classList.add('active');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }
document.getElementById('modalOverlay').addEventListener('click', e => { if(e.target===e.currentTarget) closeModal(); });
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// ===== UTILITY =====
function formatDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '-'; }
function formatDateTime(d) { return d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'; }
function formatSize(b) { if(!b)return '0 B'; const k=1024,s=['B','KB','MB','GB'],i=Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+s[i]; }
function getFileIcon(ext) { return {pdf:'📕',doc:'📘',docx:'📘',xls:'📗',xlsx:'📗',ppt:'📙',pptx:'📙',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',zip:'🗜️'}[ext]||'📄'; }
function getConfidentialiteBadge(l) { return `<span class="badge badge-${l.split(' ')[0]}">${l}</span>`; }
function escapeHtml(t) { const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }

// ===== DASHBOARD =====
async function loadDashboard() {
  const c = document.getElementById('contentArea');
  c.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement...</p></div>';
  try {
    const data = await API.getDashboard();
    const s = data.stats;
    c.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon blue">📂</div><div><div class="stat-value">${s.total_dossiers}</div><div class="stat-label">Dossiers</div></div></div>
        <div class="stat-card"><div class="stat-icon green">📄</div><div><div class="stat-value">${s.total_fichiers}</div><div class="stat-label">Fichiers</div></div></div>
        <div class="stat-card"><div class="stat-icon orange">🗄️</div><div><div class="stat-value">${s.total_armoires}</div><div class="stat-label">Armoires</div></div></div>
        <div class="stat-card"><div class="stat-icon cyan">📦</div><div><div class="stat-value">${s.total_boites}</div><div class="stat-label">Boîtes</div></div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
        <div class="card">
          <div class="card-header"><h3>📊 Dossiers par Catégorie</h3></div>
          <div class="card-body">
            <div class="chart-bars">
              ${data.par_categorie.length ? data.par_categorie.map(cat => `
                <div class="chart-bar-item">
                  <div class="bar-label">${escapeHtml(cat.categorie||'Non classé')}</div>
                  <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,(cat.count/Math.max(...data.par_categorie.map(x=>x.count),1))*100)}%;background:var(--primary)">${cat.count}</div></div>
                  <div class="bar-value">${cat.count}</div>
                </div>`).join('') : '<p style="text-align:center;color:var(--secondary)">Aucune donnée</p>'}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>📈 Dossiers par État</h3></div>
          <div class="card-body">
            <div class="chart-bars">
              ${data.par_etat.length ? data.par_etat.map(e => {
                const colors={Ouvert:'#059669',Fermé:'#64748b',Archivé:'#3b82f6',Emprunté:'#d97706'};
                return `<div class="chart-bar-item">
                  <div class="bar-label">${e.etat}</div>
                  <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,(e.count/Math.max(...data.par_etat.map(x=>x.count),1))*100)}%;background:${colors[e.etat]||'#64748b'}">${e.count}</div></div>
                  <div class="bar-value">${e.count}</div>
                </div>`;
              }).join('') : '<p style="text-align:center;color:var(--secondary)">Aucune donnée</p>'}
            </div>

          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-header"><h3>🏢 Occupation des Salles</h3></div>
          <div class="card-body"><div class="table-container"><table>
            <thead><tr><th>Salle</th><th>Armoires</th><th>Boîtes</th><th>Dossiers</th></tr></thead>
            <tbody>${data.occupation_salles.map(s => `<tr><td><strong>${escapeHtml(s.salle)}</strong></td><td>${s.nb_armoires}</td><td>${s.nb_boites}</td><td>${s.nb_dossiers}</td></tr>`).join('')}</tbody>
          </table></div></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>🕐 Derniers Documents</h3></div>
          <div class="card-body">
            ${data.derniers_documents.length ? data.derniers_documents.map(d => `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="viewDossier(${d.id})">
                <span style="font-size:20px">📂</span>
                <div style="flex:1">
                  <div style="font-weight:600;font-size:13px">${escapeHtml(d.titre)}</div>
                  <div style="font-size:11px;color:var(--secondary)">${formatDate(d.date_creation)}</div>
                </div>
              </div>`).join('') : '<p style="text-align:center;color:var(--secondary)">Aucun document</p>'}
          </div>
        </div>
      </div>`;
  } catch(e) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`; }
}

// ===== ARCHIVES EXPLORER =====
async function loadArchives() {
  const c = document.getElementById('contentArea');
  archivesPath = [];
  try {
    const orgs = await API.getOrganisations();
    c.innerHTML = `
      <div class="location-path" id="archivesBreadcrumb"><span>🏛️</span> <span>Sélectionnez une organisation</span></div>
      <div class="explorer-grid" id="explorerGrid">
        ${orgs.map(o => `<div class="explorer-item" onclick="exploreOrg(${o.id},'${escapeHtml(o.nom)}')">
          <div class="item-icon">🏢</div><div class="item-name">${escapeHtml(o.nom)}</div>
          <div class="item-count">${o.nb_salles||0} salles • ${o.nb_dossiers||0} dossiers</div>
        </div>`).join('')}
      </div>`;
  } catch(e) { c.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`; }
}

async function exploreOrg(id, name) {
  archivesPath=[{type:'org',id,name}];
  const salles=await API.getSalles(); const orgSalles=salles.filter(s=>s.organisation_id===id);
  updateBreadcrumb();
  document.getElementById('explorerGrid').innerHTML = orgSalles.length ? orgSalles.map(s => `
    <div class="explorer-item" onclick="exploreSalle(${s.id},'${escapeHtml(s.nom)}')">
      <div class="item-icon">🏠</div><div class="item-name">${escapeHtml(s.nom)}</div>
      <div class="item-count">${s.nb_armoires||0} armoires</div>
    </div>`).join('') : '<div class="empty-state"><div class="empty-icon">🏠</div><h3>Aucune salle</h3></div>';
}
async function exploreSalle(id,name) {
  archivesPath.push({type:'salle',id,name});
  const armoires=await API.getArmoires(id); updateBreadcrumb();
  document.getElementById('explorerGrid').innerHTML = armoires.length ? armoires.map(a => `
    <div class="explorer-item" onclick="exploreArmoire(${a.id},'${escapeHtml(a.nom)}')">
      <div class="item-icon">🗄️</div><div class="item-name">${escapeHtml(a.nom)}</div>
      <div class="item-count">${a.nb_boites||0} boîtes</div>
    </div>`).join('') : '<div class="empty-state"><div class="empty-icon">🗄️</div><h3>Aucune armoire</h3></div>';
}
async function exploreArmoire(id,code) {
  archivesPath.push({type:'armoire',id,name:code});
  const boites=await API.getArmoireContenu(id); updateBreadcrumb();
  document.getElementById('explorerGrid').innerHTML = boites.length ? boites.map(b => `
    <div class="explorer-item" onclick="exploreBoite(${b.id},'${escapeHtml(b.code_boite)}')">
      <div class="item-icon">📦</div><div class="item-name">${escapeHtml(b.code_boite)} - ${escapeHtml(b.nom)}</div>
      <div class="item-count">${b.nb_dossiers||0} dossiers</div>
    </div>`).join('') : '<div class="empty-state"><div class="empty-icon">📦</div><h3>Aucune boîte</h3></div>';
}
async function exploreBoite(id,code) {
  archivesPath.push({type:'boite',id,name:code});
  const dossiers=await API.getDossiers(`boite_id=${id}`); updateBreadcrumb();
  document.getElementById('explorerGrid').innerHTML = dossiers.length ? dossiers.map(d => `
    <div class="explorer-item" onclick="viewDossier(${d.id})">
      <div class="item-icon">📂</div><div class="item-name">${escapeHtml(d.titre)}</div>
      <div class="item-count">${escapeHtml(d.titre)}</div>
    </div>`).join('') : '<div class="empty-state"><div class="empty-icon">📂</div><h3>Aucun dossier</h3></div>';
}
function updateBreadcrumb() {
  const bc=document.getElementById('archivesBreadcrumb'); if(!bc)return;
  const items=archivesPath.map((p,i)=>{
    if(i<archivesPath.length-1) return `<a href="#" onclick="event.preventDefault();navigateExplorerTo(${i})">${escapeHtml(p.name)}</a>`;
    return `<span class="current">${escapeHtml(p.name)}</span>`;
  });
  bc.innerHTML=`<span>🏛️</span> ${items.join('<span class="separator">›</span>')}`;
}
async function navigateExplorerTo(i) {
  archivesPath=archivesPath.slice(0,i+1); const last=archivesPath[archivesPath.length-1];
  switch(last.type){case 'org':exploreOrg(last.id,last.name);break;case 'salle':exploreSalle(last.id,last.name);break;case 'armoire':exploreArmoire(last.id,last.name);break;case 'boite':exploreBoite(last.id,last.name);break;}
}

// ===== ORGANISATIONS =====
async function loadOrganisations() {
  const c = document.getElementById('contentArea'); c.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try {
    const orgs = await API.getOrganisations();
    c.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div>
        ${canModify()?'<button class="btn btn-primary" onclick="showAddOrgModal()">+ Ajouter une organisation</button>':''}</div>
      <div class="card"><div class="card-body"><div class="table-container"><table>
        <thead><tr><th>Nom</th><th>Code</th><th>Description</th><th>Salles</th><th>Dossiers</th><th>Fichiers</th>${canModify()?'<th>Actions</th>':''}</tr></thead>
        <tbody>${orgs.map(o => `
          <tr>
            <td><strong>${escapeHtml(o.nom)}</strong></td>
            <td>${escapeHtml(o.code)}</td>
            <td>${escapeHtml(o.description||'-')}</td>
            <td>${o.nb_salles||0}</td>
            <td>${o.nb_dossiers||0}</td>
            <td>${o.nb_fichiers||0}</td>
            ${canModify()?`<td class="actions">
              <button class="btn btn-sm btn-outline" onclick="showEditOrgModal(${o.id},'${escapeHtml(o.nom)}','${escapeHtml(o.code)}','${escapeHtml(o.description||'')}')">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="deleteOrg(${o.id},'${escapeHtml(o.nom)}')">🗑️</button>
            </td>`:''}
          </tr>`).join('')}</tbody>
      </table></div></div></div>`;
  } catch(e) { c.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`; }
}
function showAddOrgModal() {
  openModal('Ajouter une organisation', `
    <div class="form-group"><label>Nom *</label><input id="orgNom" placeholder="Nom de l'organisation"></div>
    <div class="form-group"><label>Code *</label><input id="orgCode" placeholder="CODE"></div>
    <div class="form-group"><label>Description</label><textarea id="orgDesc"></textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitAddOrg()">Créer</button>`);
}
async function submitAddOrg() {
  const nom=document.getElementById('orgNom').value.trim();
  const code=document.getElementById('orgCode').value.trim();
  if(!nom||!code){showToast('Nom et code requis','error');return;}
  try { await API.createOrganisation({nom,code,description:document.getElementById('orgDesc').value}); closeModal(); showToast('Organisation créée'); loadOrganisations(); }
  catch(e) { showToast(e.message,'error'); }
}
function showEditOrgModal(id,nom,code,desc) {
  openModal('Modifier l\'organisation', `
    <div class="form-group"><label>Nom *</label><input id="orgNom" value="${escapeHtml(nom)}"></div>
    <div class="form-group"><label>Code *</label><input id="orgCode" value="${escapeHtml(code)}"></div>
    <div class="form-group"><label>Description</label><textarea id="orgDesc">${escapeHtml(desc)}</textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitEditOrg(${id})">Enregistrer</button>`);
}
async function submitEditOrg(id) {
  try { await API.updateOrganisation(id,{nom:document.getElementById('orgNom').value,code:document.getElementById('orgCode').value,description:document.getElementById('orgDesc').value}); closeModal(); showToast('Organisation modifiée'); loadOrganisations(); }
  catch(e) { showToast(e.message,'error'); }
}
async function deleteOrg(id,nom) {
  if(!confirm(`Supprimer l'organisation "${nom}" ? Toutes les données associées seront perdues.`)) return;
  try { await API.deleteOrganisation(id); showToast('Organisation supprimée'); loadOrganisations(); }
  catch(e) { showToast(e.message,'error'); }
}

// ===== ARMOIRES =====
async function loadArmoires() {
  const c = document.getElementById('contentArea'); c.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try {
    const armoires = await API.getArmoires();
    c.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div>
        ${canModify()?'<button class="btn btn-primary" onclick="showAddArmoireModal()">+ Ajouter une armoire</button>':''}</div>
      <div class="card"><div class="card-body"><div class="table-container"><table>
        <thead><tr><th>Nom</th><th>Salle</th><th>Boîtes</th>${canModify()?'<th>Actions</th>':''}</tr></thead>
        <tbody>${armoires.length ? armoires.map(a=>`<tr>
          <td><strong>${escapeHtml(a.nom)}</strong></td><td>${escapeHtml(a.salle_nom)}</td>
          <td>${a.nb_boites||0}</td>
          ${canModify()?`<td class="actions">
            <button class="btn btn-sm btn-outline" onclick="viewArmoireContenu(${a.id})">👁️</button>
            <button class="btn btn-sm btn-outline" onclick="showEditArmoireModal(${a.id})">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteArmoire(${a.id},'${escapeHtml(a.nom)}')">🗑️</button>
          </td>`:`<td><button class="btn btn-sm btn-outline" onclick="viewArmoireContenu(${a.id})">👁️</button></td>`}
        </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:40px">Aucune armoire</td></tr>'}</tbody>
      </table></div></div></div>`;
  } catch(e) { c.innerHTML=`<div class="empty-state"><p>${e.message}</p></div>`; }
}
async function showAddArmoireModal() {
  const salles=await API.getSalles();
  openModal('Ajouter une armoire', `
    <div class="form-group"><label>Salle *</label><select id="armSalle"><option value="">Sélectionner...</option>${salles.map(s=>`<option value="${s.id}">${escapeHtml(s.nom)}</option>`).join('')}</select></div>
    <div class="form-group"><label>Nom *</label><input id="armNom" placeholder="Armoire principale"></div>
    <div class="form-group"><label>Description</label><textarea id="armDesc"></textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitAddArmoire()">Créer</button>`);
}
async function submitAddArmoire() {
  const salle_id=document.getElementById('armSalle').value;
  const nom=document.getElementById('armNom').value.trim();
  if(!salle_id||!nom){showToast('Salle et nom requis','error');return;}
  try { await API.createArmoire({salle_id,nom,description:document.getElementById('armDesc').value}); closeModal(); showToast('Armoire créée'); loadArmoires(); }
  catch(e) { showToast(e.message,'error'); }
}
async function showEditArmoireModal(id) {
  const [armoire,salles]=await Promise.all([API.getArmoire(id),API.getSalles()]);
  openModal('Modifier l\'armoire', `
    <div class="form-group"><label>Salle</label><select id="armSalle">${salles.map(s=>`<option value="${s.id}" ${s.id===armoire.salle_id?'selected':''}>${escapeHtml(s.nom)}</option>`).join('')}</select></div>
    <div class="form-group"><label>Nom</label><input id="armNom" value="${escapeHtml(armoire.nom)}"></div>
    <div class="form-group"><label>Description</label><textarea id="armDesc">${escapeHtml(armoire.description||'')}</textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitEditArmoire(${id})">Enregistrer</button>`);
}
async function submitEditArmoire(id) {
  try { await API.updateArmoire(id,{nom:document.getElementById('armNom').value,description:document.getElementById('armDesc').value}); closeModal(); showToast('Armoire modifiée'); loadArmoires(); }
  catch(e) { showToast(e.message,'error'); }
}
async function deleteArmoire(id,code) {
  if(!confirm(`Supprimer l'armoire "${code}" ? Toutes les boîtes et dossiers contenus seront supprimés.`)) return;
  try { await API.deleteArmoire(id); showToast('Armoire supprimée'); loadArmoires(); }
  catch(e) { showToast(e.message,'error'); }
}
async function viewArmoireContenu(id) {
  navigateTo('boites');
}

// ===== BOÎTES =====
async function loadBoites() {
  const c=document.getElementById('contentArea'); c.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try {
    const boites=await API.getBoites();
    c.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div>
        ${canModify()?'<button class="btn btn-primary" onclick="showAddBoiteModal()">+ Ajouter une boîte</button>':''}</div>
      <div class="card"><div class="card-body"><div class="table-container"><table>
        <thead><tr><th>Code</th><th>Nom</th><th>Armoire</th><th>Salle</th><th>Dossiers</th>${canModify()?'<th>Actions</th>':''}</tr></thead>
        <tbody>${boites.length ? boites.map(b=>`<tr>
          <td><strong>${escapeHtml(b.code_boite)}</strong></td><td>${escapeHtml(b.nom)}</td><td>${escapeHtml(b.armoire_nom||'')}</td>
          <td>${escapeHtml(b.salle_nom)}</td><td>${b.nb_dossiers||0}</td>
          ${canModify()?`<td class="actions">
            <button class="btn btn-sm btn-outline" onclick="viewBoiteDossiers(${b.id})">👁️</button>
            <button class="btn btn-sm btn-outline" onclick="showEditBoiteModal(${b.id})">✏️</button>
            <button class="btn btn-sm btn-info" onclick="showMoveBoiteModal(${b.id})">↗️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteBoite(${b.id},'${escapeHtml(b.code_boite)}')">🗑️</button>
          </td>`:`<td><button class="btn btn-sm btn-outline" onclick="viewBoiteDossiers(${b.id})">👁️</button></td>`}
        </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px">Aucune boîte</td></tr>'}</tbody>
      </table></div></div></div>`;
  } catch(e) { c.innerHTML=`<div class="empty-state"><p>${e.message}</p></div>`; }
}
async function showAddBoiteModal() {
  const armoires=await API.getArmoires();
  openModal('Ajouter une boîte', `
    <div class="form-group"><label>Armoire *</label><select id="boiteArmoire"><option value="">Sélectionner...</option>${armoires.map(a=>`<option value="${a.id}">${escapeHtml(a.salle_nom)} › ${escapeHtml(a.nom)}</option>`).join('')}</select></div>
    <div class="form-group"><label>Code boîte *</label><input id="boiteCode" placeholder="B001"></div>
    <div class="form-group"><label>Nom *</label><input id="boiteNom" placeholder="Boîte B001"></div>
    <div class="form-group"><label>Description</label><textarea id="boiteDesc"></textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitAddBoite()">Créer</button>`);
}
async function submitAddBoite() {
  const armoire_id=document.getElementById('boiteArmoire').value;
  const code_boite=document.getElementById('boiteCode').value.trim();
  const nom=document.getElementById('boiteNom').value.trim();
  if(!armoire_id||!code_boite||!nom){showToast('Armoire, code et nom requis','error');return;}
  try { await API.createBoite({armoire_id,code_boite,nom,description:document.getElementById('boiteDesc').value}); closeModal(); showToast('Boîte créée'); loadBoites(); }
  catch(e) { showToast(e.message,'error'); }
}
async function showEditBoiteModal(id) {
  const boite=await API.getBoite(id);
  openModal('Modifier la boîte', `
    <div class="form-group"><label>Code</label><input id="boiteCode" value="${escapeHtml(boite.code_boite)}"></div>
    <div class="form-group"><label>Nom</label><input id="boiteNom" value="${escapeHtml(boite.nom)}"></div>
    <div class="form-group"><label>Description</label><textarea id="boiteDesc">${escapeHtml(boite.description||'')}</textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitEditBoite(${id})">Enregistrer</button>`);
}
async function submitEditBoite(id) {
  try { await API.updateBoite(id,{code_boite:document.getElementById('boiteCode').value,nom:document.getElementById('boiteNom').value,description:document.getElementById('boiteDesc').value}); closeModal(); showToast('Boîte modifiée'); loadBoites(); }
  catch(e) { showToast(e.message,'error'); }
}
async function showMoveBoiteModal(id) {
  const armoires=await API.getArmoires();
  openModal('Déplacer la boîte', `
    <div class="form-group"><label>Nouvelle armoire</label><select id="moveBoiteArmoire">${armoires.map(a=>`<option value="${a.id}">${escapeHtml(a.nom)} (${escapeHtml(a.salle_nom)})</option>`).join('')}</select></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitMoveBoite(${id})">Déplacer</button>`);
}
async function submitMoveBoite(id) {
  try { await API.moveBoite(id,document.getElementById('moveBoiteArmoire').value); closeModal(); showToast('Boîte déplacée'); loadBoites(); }
  catch(e) { showToast(e.message,'error'); }
}
async function deleteBoite(id,code) {
  if(!confirm(`Supprimer la boîte "${code}" ? Tous les dossiers contenus seront supprimés.`)) return;
  try { await API.deleteBoite(id); showToast('Boîte supprimée'); loadBoites(); }
  catch(e) { showToast(e.message,'error'); }
}
async function viewBoiteDossiers(id) {
  navigateTo('dossiers');
  setTimeout(async()=>{const d=await API.getDossiers(`boite_id=${id}`);renderDossiersList(d);},200);
}

// ===== DOSSIERS =====
async function loadDossiers(params='') {
  const c=document.getElementById('contentArea'); c.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try {
    const [dossiers,categories]=await Promise.all([API.getDossiers(params),API.getCategories()]);
    window._categories=categories;
    c.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div>
        ${canModify()?'<button class="btn btn-primary" onclick="showAddDossierModal()">+ Nouveau dossier</button>':''}</div>
      <div class="filters-bar" id="dossierFilters">
        <div class="filter-item"><label>Recherche</label><input type="text" id="filterSearch" placeholder="Titre..." onkeyup="filterDossiers()"></div>
        <div class="filter-item"><label>Catégorie</label><select id="filterCat" onchange="filterDossiers()"><option value="">Toutes</option>${categories.map(cat=>`<option value="${cat.id}">${escapeHtml(cat.nom)}</option>`).join('')}</select></div>
      </div>
      <div id="dossiersListArea"></div>`;
    renderDossiersList(dossiers);
  } catch(e) { c.innerHTML=`<div class="empty-state"><p>${e.message}</p></div>`; }
}

function renderDossiersList(dossiers) {
  const area=document.getElementById('dossiersListArea'); if(!area)return;
  const actionsHeader = canModify() ? '<th style="width:120px">Actions</th>' : '';
  area.innerHTML=`<div class="card"><div class="card-body"><div class="table-container"><table>
    <thead><tr><th>Titre</th><th>Catégorie</th><th>Localisation</th><th>Date</th>${actionsHeader}</tr></thead>
    <tbody>${dossiers.length ? dossiers.map(d=>`<tr>
      <td>${escapeHtml(d.titre)}</td>
      <td style="white-space:nowrap">${escapeHtml(d.categorie_nom||'-')}</td>
      <td style="white-space:nowrap"><small>${escapeHtml(d.salle_nom)} › ${escapeHtml(d.armoire_nom||'')} › ${escapeHtml(d.boite_nom||d.code_boite)}</small></td>
      <td style="white-space:nowrap">${formatDate(d.date_creation)}</td>
      ${canModify()?`<td style="white-space:nowrap">
        <button class="btn btn-sm btn-outline" onclick="viewDossier(${d.id})" title="Voir">👁️</button>
        <button class="btn btn-sm btn-outline" onclick="showEditDossierModal(${d.id})" title="Modifier">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteDossier(${d.id},'${escapeHtml(d.titre)}')" title="Supprimer">🗑️</button>
      </td>`:`<td><button class="btn btn-sm btn-outline" onclick="viewDossier(${d.id})" title="Voir">👁️</button></td>`}
    </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:40px">Aucun dossier</td></tr>'}</tbody>
  </table></div></div></div>`;
}

async function filterDossiers() {
  const params=[];
  const search=document.getElementById('filterSearch')?.value;
  const cat=document.getElementById('filterCat')?.value;
  if(search) params.push(`search=${encodeURIComponent(search)}`);
  if(cat) params.push(`categorie_id=${cat}`);
  const dossiers=await API.getDossiers(params.join('&'));
  renderDossiersList(dossiers);
}

async function viewDossier(id) {
  const c=document.getElementById('contentArea'); c.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try {
    const dossier=await API.getDossier(id);
    const fichiers=await API.getFichiersDossier(id);
    const editBtns = canModify() ? `
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-outline" onclick="showEditDossierModal(${id})">✏️ Modifier</button>
        <button class="btn btn-sm btn-danger" onclick="deleteDossier(${id},'${escapeHtml(dossier.titre)}')">🗑️ Supprimer</button>
      </div>` : '';
    c.innerHTML = `
      <div class="breadcrumb">
        <a href="#" onclick="event.preventDefault();navigateTo('dossiers')">Dossiers</a>
        <span class="separator">›</span><span class="current">${escapeHtml(dossier.titre)}</span>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px">
        <div>
          <div class="card" style="margin-bottom:20px">
            <div class="card-header">
              <h3>📂 ${escapeHtml(dossier.titre)}</h3>
              ${editBtns}
            </div>
            <div class="card-body">
              ${dossier.description?`<p style="margin-bottom:16px">${escapeHtml(dossier.description)}</p>`:''}
              <div style="display:flex;gap:12px;flex-wrap:wrap">
                <span>📅 ${formatDate(dossier.date_creation)}</span>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h3>📄 Fichiers (${fichiers.length})</h3>
              <a href="#" onclick="event.preventDefault();navigateTo('fichiers')" style="font-size:13px">Voir tous les fichiers →</a>
            </div>
            <div class="card-body">
              ${fichiers.length ? fichiers.map(f=>`
                <div class="file-item">
                  <span class="file-icon">${getFileIcon(f.extension)}</span>
                  <div class="file-info" style="cursor:pointer" onclick="ouvrirDetailsFichier(${f.id})" title="Voir les détails du fichier">
                    <div class="file-name">${escapeHtml(f.titre)} <small style="color:var(--secondary)">v${f.version}</small></div>
                    <div class="file-meta">${escapeHtml(f.nom_original)} • ${formatSize(f.taille)}</div>
                  </div>
                  <div style="display:flex;gap:4px">
                    ${['pdf','jpg','jpeg','png'].includes(f.extension)?`<button class="btn btn-sm btn-outline" onclick="previewFichier(${f.id})" title="Prévisualiser">👁️</button>`:''}
                    <button class="btn btn-sm btn-outline" onclick="downloadFichier(${f.id})" title="Télécharger">⬇️</button>
                    ${canModify()?`<button class="btn btn-sm btn-danger" onclick="deleteFichier(${f.id},${id})" title="Supprimer">🗑️</button>`:''}
                  </div>
                </div>`).join('') : '<div class="empty-state"><div class="empty-icon">📄</div><p>Aucun fichier dans ce dossier</p></div>'}
            </div>
          </div>
        </div>
        <div>
          <div class="card">
            <div class="card-header"><h3>📍 Localisation</h3></div>
            <div class="card-body">
              <div class="location-path" style="margin-bottom:12px">
                <span>${escapeHtml(dossier.salle_nom)}</span>
                <span class="separator">›</span><span>${escapeHtml(dossier.armoire_nom||'')}</span>
                <span class="separator">›</span><span>${escapeHtml(dossier.code_boite)}</span>
                <span class="separator">›</span><span class="current">${escapeHtml(dossier.titre)}</span>
              </div>
              <p style="font-size:12px;color:var(--secondary)">Emplacement complet</p>
              <p style="font-size:13px;font-weight:600">${escapeHtml(dossier.salle_nom)} › ${escapeHtml(dossier.armoire_nom||'')} › ${escapeHtml(dossier.code_boite)} › ${escapeHtml(dossier.titre)}</p>
            </div>
          </div>
        </div>
      </div>`;
  } catch(e) { c.innerHTML=`<div class="empty-state"><p>${e.message}</p></div>`; }
}

// ===== ADD DOSSIER =====
async function showAddDossierModal() {
  const [boites,categories]=await Promise.all([API.getBoites(),API.getCategories()]);
  openModal('Nouveau dossier', `
    <div class="form-group"><label>Boîte *</label><select id="dossBoite">
      <option value="">Sélectionner une boîte</option>
      ${boites.map(b=>`<option value="${b.id}">${escapeHtml(b.salle_nom)} › ${escapeHtml(b.armoire_nom||'')} › ${escapeHtml(b.nom)}</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Titre *</label><input id="dossTitre" placeholder="Dossier rédaction"></div>
    <div class="form-group"><label>Description</label><textarea id="dossDesc"></textarea></div>
    <div class="form-group"><label>Catégorie</label><select id="dossCat">
      <option value="">Aucune</option>
      ${categories.map(cat=>`<option value="${cat.id}">${escapeHtml(cat.nom)}</option>`).join('')}
    </select></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitAddDossier()">Créer</button>`);
}
async function submitAddDossier() {
  const boite_id=document.getElementById('dossBoite').value;
  const titre=document.getElementById('dossTitre').value.trim();
  if(!boite_id){showToast('Boîte requise','error');return;}
  if(!titre){showToast('Titre requis','error');return;}
  try {
    let organisation_id = currentUser && currentUser.organisation_id ? currentUser.organisation_id : null;
    if(!organisation_id){
      const orgs = await API.getOrganisations();
      organisation_id = orgs && orgs[0] ? orgs[0].id : 1;
    }
    const result=await API.createDossier({
      organisation_id:parseInt(organisation_id), boite_id:parseInt(boite_id), titre,
      description:document.getElementById('dossDesc').value,
      categorie_id:document.getElementById('dossCat').value||null
    });
    closeModal(); showToast('Dossier créé'); loadDossiers();
  } catch(e) { showToast(e.message,'error'); }
}
async function showEditDossierModal(id) {
  const [dossier,categories]=await Promise.all([API.getDossier(id),API.getCategories()]);
  openModal('Modifier le dossier', `
    <div class="form-group"><label>Titre</label><input id="dossTitre" value="${escapeHtml(dossier.titre)}"></div>
    <div class="form-group"><label>Description</label><textarea id="dossDesc">${escapeHtml(dossier.description||'')}</textarea></div>
    <div class="form-group"><label>Catégorie</label><select id="dossCat">
      <option value="">Aucune</option>
      ${categories.map(c=>`<option value="${c.id}" ${c.id===dossier.categorie_id?'selected':''}>${escapeHtml(c.nom)}</option>`).join('')}
    </select></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitEditDossier(${id})">Enregistrer</button>`);
}
async function submitEditDossier(id) {
  try { await API.updateDossier(id,{titre:document.getElementById('dossTitre').value,description:document.getElementById('dossDesc').value,categorie_id:document.getElementById('dossCat').value||null}); closeModal(); showToast('Dossier modifié'); viewDossier(id); }
  catch(e) { showToast(e.message,'error'); }
}
async function deleteDossier(id,ref) {
  if(!confirm(`Supprimer le dossier "${ref}" ?`)) return;
  try { await API.deleteDossier(id); showToast('Dossier supprimé'); navigateTo('dossiers'); }
  catch(e) { showToast(e.message,'error'); }
}

// ===== FICHIERS =====
async function loadFichiers() {
  const c=document.getElementById('contentArea'); c.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try {
    const dossiers=await API.getDossiers('limit=200');
    let allFichiers=[];
    const topDossiers=dossiers.slice(0,30);
    for(const d of topDossiers) {
      try {
        const fichiers=await API.getFichiersDossier(d.id);
        fichiers.forEach(f => { f.dossier_titre=d.titre; f.dossier_id=d.id; });
        allFichiers=allFichiers.concat(fichiers);
      } catch{}
    }
    c.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div></div>
        ${canModify()?`<div style="display:flex;gap:8px;align-items:center">
          <select id="uploadDossierSelect" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);font-size:13px;min-width:250px">
            <option value="">-- Sélectionner un dossier --</option>
            ${dossiers.map(d=>`<option value="${d.id}">${escapeHtml(d.salle_nom||'')} › ${escapeHtml(d.armoire_nom||'')} › ${escapeHtml(d.titre)}</option>`).join('')}
          </select>
          <button class="btn btn-primary" onclick="showUploadToDossier()">📤 Ajouter un fichier</button>
          <button class="btn btn-info" onclick="showMultiUploadToDossier()">📎 Multi-upload</button>
        </div>`:''}
      </div>
      <div class="card"><div class="card-header"><h3>📄 Tous les fichiers (${allFichiers.length})</h3></div>
      <div class="card-body">
        ${allFichiers.length ? allFichiers.map(f=>`
          <div class="file-item">
            <span class="file-icon">${getFileIcon(f.extension)}</span>
            <div class="file-info" style="cursor:pointer" onclick="ouvrirDetailsFichier(${f.id})" title="Voir les détails du fichier">
              <div class="file-name">${escapeHtml(f.titre)} <small style="color:var(--secondary)">v${f.version}</small></div>
              <div class="file-meta">
                📂 ${escapeHtml(f.dossier_titre)} •
                ${escapeHtml(f.nom_original)} • ${formatSize(f.taille)}
              </div>
            </div>
            <div style="display:flex;gap:4px">
              ${['pdf','jpg','jpeg','png'].includes(f.extension)?`<button class="btn btn-sm btn-outline" onclick="previewFichier(${f.id})">👁️</button>`:''}
              <button class="btn btn-sm btn-outline" onclick="downloadFichier(${f.id})">⬇️</button>
              ${canModify()?`<button class="btn btn-sm btn-danger" onclick="deleteFichier(${f.id})">🗑️</button>`:''}
            </div>
          </div>`).join('') : '<div class="empty-state"><div class="empty-icon">📄</div><h3>Aucun fichier</h3><p>Cliquez sur "Ajouter un fichier" pour commencer</p></div>'}
      </div></div>`;
  } catch(e) { c.innerHTML=`<div class="empty-state"><p>${e.message}</p></div>`; }
}

function _getSelectedDossierId() {
  const sel = document.getElementById('uploadDossierSelect');
  if (!sel || !sel.value) { showToast('Sélectionnez un dossier d\'abord','error'); return null; }
  return parseInt(sel.value);
}

async function showUploadToDossier() {
  const dossierId = _getSelectedDossierId(); if(!dossierId) return;
  openModal('Upload un fichier', `
    <div class="form-group"><label>Fichier</label><input type="file" id="uploadFile"></div>
    <div class="form-group"><label>Titre</label><input id="uploadTitre" placeholder="Titre du fichier"></div>
    <div class="form-group"><label>Description</label><textarea id="uploadDesc"></textarea></div>
    <div class="form-group"><label>Mots-clés</label><input id="uploadKeywords" placeholder="mot1, mot2, mot3"></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitUpload(${dossierId})">Upload</button>`);
}

async function showMultiUploadToDossier() {
  const dossierId = _getSelectedDossierId(); if(!dossierId) return;
  openModal('Upload multiple', `
    <div class="form-group"><label>Fichiers</label><input type="file" id="multiUploadFiles" multiple></div>
    <p style="font-size:12px;color:var(--secondary)">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG, ZIP</p>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitMultiUpload(${dossierId})">Upload</button>`);
}

async function submitUpload(dossierId) {
  const fileInput=document.getElementById('uploadFile');
  if(!fileInput.files.length){showToast('Sélectionnez un fichier','error');return;}
  const formData=new FormData();
  formData.append('fichier',fileInput.files[0]);
  formData.append('titre',document.getElementById('uploadTitre').value||fileInput.files[0].name);
  formData.append('description',document.getElementById('uploadDesc').value);
  formData.append('mots_cles',document.getElementById('uploadKeywords').value);
  try { await API.uploadFichier(dossierId,formData); closeModal(); showToast('Fichier uploadé'); loadFichiers(); }
  catch(e) { showToast(e.message,'error'); }
}

async function submitMultiUpload(dossierId) {
  const fileInput=document.getElementById('multiUploadFiles');
  if(!fileInput.files.length){showToast('Sélectionnez des fichiers','error');return;}
  const formData=new FormData();
  for(const file of fileInput.files) formData.append('fichiers',file);
  try { await API.uploadMultipleFichiers(dossierId,formData); closeModal(); showToast('Fichiers uploadés'); loadFichiers(); }
  catch(e) { showToast(e.message,'error'); }
}

async function downloadFichier(id) {
  try {
    const response = await fetch(`/api/fichiers/${id}/download`, {
      headers: { 'Authorization': `Bearer ${API.token}` }
    });
    if (!response.ok) throw new Error('Erreur téléchargement');
    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'fichier';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    window.URL.revokeObjectURL(url);
  } catch(e) { showToast('Erreur: ' + e.message, 'error'); }
}

async function previewFichier(id) {
  try {
    const response = await fetch(`/api/fichiers/${id}/preview`, {
      headers: { 'Authorization': `Bearer ${API.token}` }
    });
    if (!response.ok) throw new Error('Erreur prévisualisation');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch(e) { showToast('Erreur: ' + e.message, 'error'); }
}

async function deleteFichier(id,dossierId) {
  if(!confirm('Supprimer ce fichier ?')) return;
  try { await API.deleteFichier(id); showToast('Fichier supprimé'); if(dossierId) viewDossier(dossierId); else navigateTo('fichiers'); }
  catch(e) { showToast(e.message,'error'); }
}

// ===== CATÉGORIES =====
async function loadCategories() {
  const c=document.getElementById('contentArea'); c.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try {
    const categories=await API.getCategories();
    c.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div>
        ${canModify()?'<button class="btn btn-primary" onclick="showAddCategorieModal()">+ Nouvelle catégorie</button>':''}</div>
      <div class="card"><div class="card-body"><div class="table-container"><table>
        <thead><tr><th>Nom</th><th>Sous-catégories</th><th>Dossiers</th>${canModify()?'<th>Actions</th>':''}</tr></thead>
        <tbody>${categories.map(cat=>`<tr>
          <td><strong>${escapeHtml(cat.nom)}</strong></td>
          <td>${cat.nb_sous_categories||0}</td><td>${cat.nb_dossiers||0}</td>
          ${canModify()?`<td class="actions">
            <button class="btn btn-sm btn-outline" onclick="showSousCategories(${cat.id},'${escapeHtml(cat.nom)}')">🏷️</button>
            <button class="btn btn-sm btn-outline" onclick="showEditCategorieModal(${cat.id},'${escapeHtml(cat.nom)}','${escapeHtml(cat.description||'')}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteCategorie(${cat.id})">🗑️</button>
          </td>`:''}
        </tr>`).join('')}</tbody>
      </table></div></div></div>`;
  } catch(e) { c.innerHTML=`<div class="empty-state"><p>${e.message}</p></div>`; }
}
function showAddCategorieModal() {
  const orgId=currentUser.organisation_id;
  openModal('Nouvelle catégorie', `
    <div class="form-group"><label>Nom *</label><input id="catNom" placeholder="Rédaction"></div>
    <div class="form-group"><label>Description</label><textarea id="catDesc"></textarea></div>

  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitAddCategorie()">Créer</button>`);
}
async function submitAddCategorie() {
  const nom=document.getElementById('catNom').value.trim();
  if(!nom){showToast('Nom requis','error');return;}
  try { await API.createCategorie({nom,description:document.getElementById('catDesc').value,organisation_id:1}); closeModal(); showToast('Catégorie créée'); loadCategories(); }
  catch(e) { showToast(e.message,'error'); }
}
function showEditCategorieModal(id,nom,desc) {
  openModal('Modifier la catégorie', `
    <div class="form-group"><label>Nom</label><input id="catNom" value="${escapeHtml(nom)}"></div>
    <div class="form-group"><label>Description</label><textarea id="catDesc">${escapeHtml(desc)}</textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitEditCategorie(${id})">Enregistrer</button>`);
}
async function submitEditCategorie(id) {
  try { await API.updateCategorie(id,{nom:document.getElementById('catNom').value,description:document.getElementById('catDesc').value}); closeModal(); showToast('Catégorie modifiée'); loadCategories(); }
  catch(e) { showToast(e.message,'error'); }
}
async function deleteCategorie(id) {
  if(!confirm('Supprimer cette catégorie ?')) return;
  try { await API.deleteCategorie(id); showToast('Catégorie supprimée'); loadCategories(); }
  catch(e) { showToast(e.message,'error'); }
}
async function showSousCategories(catId,catNom) {
  const souscats=await API.getSousCategories(catId);
  openModal(`Sous-catégories de ${catNom}`, `
    <div id="sousCatList">
      ${souscats.length?souscats.map(sc=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="flex:1">${escapeHtml(sc.nom)}</span>
        ${canModify()?`<button class="btn btn-sm btn-danger" onclick="deleteSousCategorie(${sc.id},${catId})">🗑️</button>`:''}
      </div>`).join(''):'<p style="color:var(--secondary);text-align:center;padding:20px">Aucune sous-catégorie</p>'}
    </div>
    ${canModify()?`<hr style="margin:16px 0">
    <div style="display:flex;gap:8px">
      <input id="newSousCatNom" placeholder="Nouvelle sous-catégorie" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:var(--radius)">
      <button class="btn btn-primary btn-sm" onclick="addSousCategorie(${catId})">Ajouter</button>
    </div>`:''}
  `, `<button class="btn btn-secondary" onclick="closeModal()">Fermer</button>`);
}
async function addSousCategorie(catId) {
  const nom=document.getElementById('newSousCatNom').value.trim();
  if(!nom)return;
  try { await API.createSousCategorie(catId,{nom}); showToast('Sous-catégorie ajoutée'); closeModal(); const cat=await API.getCategories(); const found=cat.find(c=>c.id===catId); showSousCategories(catId,found?.nom||''); }
  catch(e) { showToast(e.message,'error'); }
}
async function deleteSousCategorie(id,catId) {
  if(!confirm('Supprimer ?')) return;
  try { await API.deleteSousCategorie(id); showToast('Sous-catégorie supprimée'); closeModal(); const cat=await API.getCategories(); const found=cat.find(c=>c.id===catId); showSousCategories(catId,found?.nom||''); }
  catch(e) { showToast(e.message,'error'); }
}

// ===== SOMMAIRE =====
async function loadSommaire() {
  const c = document.getElementById('contentArea');
  c.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const rows = await API.getSommaire();
    window._sommaireRows = rows;
    c.innerHTML = `
      <p style="margin-bottom:12px;color:var(--secondary);font-size:13px">Tous les emplacements physiques : salles, armoires, boîtes, dossiers et fichiers.</p>
      <div class="filters-bar" style="margin-bottom:16px">
        <div class="filter-item" style="flex:1">
          <label>Recherche simple</label>
          <input type="text" id="sommaireSearch" placeholder="Tapez un nom… les lignes d'emplacement correspondantes s'affichent" oninput="filtrerSommaire()">
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3 id="sommaireCount">📋 ${rows.length} emplacement(s)</h3></div>
        <div class="card-body"><div class="table-container">
          <table>
            <thead><tr><th style="width:110px">Type</th><th>Emplacement physique</th></tr></thead>
            <tbody id="sommaireBody"></tbody>
          </table>
        </div></div>
      </div>`;
    filtrerSommaire();
  } catch (e) {
    c.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
  }
}
function filtrerSommaire() {
  const q = (document.getElementById('sommaireSearch')?.value || '').trim().toLowerCase();
  const all = window._sommaireRows || [];
  const filtered = q
    ? all.filter(r =>
        (r.titre || '').toLowerCase().includes(q) ||
        (r.emplacement || '').toLowerCase().includes(q) ||
        (r.nom_original || '').toLowerCase().includes(q)
      )
    : all;
  const body = document.getElementById('sommaireBody');
  const count = document.getElementById('sommaireCount');
  if (count) count.textContent = `📋 ${filtered.length} emplacement(s)`;
  if (!body) return;
  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:30px">Aucun emplacement trouvé</td></tr>';
    return;
  }
  body.innerHTML = filtered.map(r => {
    let action = '';
    if (r.type === 'Fichier') action = `ouvrirDetailsFichier(${r.id})`;
    else if (r.type === 'Dossier') action = `viewDossier(${r.dossier_id || r.id})`;
    const click = action ? ` style="cursor:pointer" onclick="${action}"` : '';
    return `<tr${click}>
      <td><span class="badge badge-info">${escapeHtml(r.type)}</span></td>
      <td>${escapeHtml(r.emplacement)}</td>
    </tr>`;
  }).join('');
}

// ===== RECHERCHE AVANCÉE =====
async function loadRecherche() {
  const c=document.getElementById('contentArea');
  const [categories]=await Promise.all([API.getCategories()]);
  c.innerHTML = `
    <div class="card" id="searchCard">
      <div class="card-header">
        <h3>🔍 Recherche Avancée</h3>
        <button class="btn btn-sm btn-outline" onclick="closeSearchCard()">✕ Fermer</button>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px">
          <div class="form-group"><label>Titre / nom de fichier</label><input id="srcTitre" placeholder="Nom du dossier ou du fichier"></div>
          <div class="form-group"><label>Description</label><input id="srcDesc"></div>
          <div class="form-group"><label>Mot-clé</label><input id="srcMotCle"></div>
          <div class="form-group"><label>Catégorie</label><select id="srcCat">
            <option value="">Toutes</option>${categories.map(cat=>`<option value="${cat.id}">${escapeHtml(cat.nom)}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Date de dépôt</label><input type="date" id="srcDateDepot"></div>
        </div>
        <button class="btn btn-primary" onclick="executeRecherche()">🔍 Rechercher</button>
        <button class="btn btn-outline" onclick="clearSearchForm()" style="margin-left:8px">Réinitialiser</button>
      </div>
    </div>
    <div id="rechercheResults" style="margin-top:20px"></div>`;
}
function closeSearchCard() { navigateTo('dashboard'); }
function clearSearchForm() {
  document.querySelectorAll('#searchCard input, #searchCard select').forEach(el=>{
    if(el.type==='text'||el.type==='date') el.value='';
    if(el.tagName==='SELECT') el.selectedIndex=0;
  });
  document.getElementById('rechercheResults').innerHTML='';
}
async function executeRecherche() {
  const params=[];
  const fields={srcTitre:'titre',srcDesc:'description',srcMotCle:'mot_cle',srcCat:'categorie_id',srcDateDepot:'date_depot'};
  for(const[id,param] of Object.entries(fields)){
    const val=document.getElementById(id)?.value;
    if(val) params.push(`${param}=${encodeURIComponent(val)}`);
  }
  try {
    const results=await API.search(params.join('&'));
    const container=document.getElementById('rechercheResults');
    if(results.length) {
      container.innerHTML=`<div class="card"><div class="card-header"><h3>${results.length} résultat(s)</h3>
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('rechercheResults').innerHTML=''">✕ Fermer</button></div>
      <div class="card-body"><div class="table-container"><table>
        <thead><tr><th>Type</th><th>Titre</th><th>Localisation</th><th>Actions</th></tr></thead>
        <tbody>${results.map(d=>`<tr>
          <td><span class="badge badge-info">${escapeHtml(d.type||'Dossier')}</span></td>
          <td>${escapeHtml(d.titre)}</td>
          <td><small>${escapeHtml(d.salle_nom||'')} › ${escapeHtml(d.armoire_nom||'')} › ${escapeHtml(d.boite_nom||d.code_boite||'')}</small></td>
          <td><button class="btn btn-sm btn-outline" onclick="${d.type==='Fichier'?`ouvrirDetailsFichier(${d.id})`:`viewDossier(${d.dossier_id||d.id})`}">👁️</button></td>
        </tr>`).join('')}</tbody>
      </table></div></div></div>`;
    } else {
      container.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><h3>Aucun résultat</h3><p>Essayez avec d\'autres critères</p></div>';
    }
  } catch(e) { showToast(e.message,'error'); }
}
async function handleGlobalSearch(event) {
  if(event.key !== 'Enter') return;
  const q = event.target.value.trim();
  if(q.length < 2) return;
  try {
    const results = await API.quickSearch(q);
    const c = document.getElementById('contentArea');
    c.innerHTML = `<div class="card"><div class="card-header"><h3>Résultats pour « ${escapeHtml(q)} »</h3></div><div class="card-body"><div class="table-container"><table><thead><tr><th>Type</th><th>Nom</th><th>Description</th></tr></thead><tbody>${results.length ? results.map(r => `<tr><td><span class="badge badge-info">${escapeHtml(r.type)}</span></td><td><strong>${escapeHtml(r.nom)}</strong></td><td>${escapeHtml(r.description || '')}</td></tr>`).join('') : '<tr><td colspan="3">Aucun résultat</td></tr>'}</tbody></table></div></div></div>`;
    document.getElementById('pageTitle').textContent = 'Résultats de recherche';
  } catch(e) { showToast(e.message, 'error'); }
}

// ===== JOURNAL D'AUDIT =====
async function loadAudit() {
  const c=document.getElementById('contentArea'); c.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try {
    const entries=await API.getAudit();
    c.innerHTML=`<div class="card"><div class="card-header"><h3>📝 Journal d'Audit</h3></div>
    <div class="card-body"><div class="table-container"><table>
      <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Table</th></tr></thead>
      <tbody>${entries.length?entries.map(e=>`<tr>
        <td>${formatDateTime(e.date_action)}</td>
        <td>${e.user_nom?`${escapeHtml(e.user_prenom)} ${escapeHtml(e.user_nom)}`:'-'}<br><small>${escapeHtml(e.user_email||'')}</small></td>
        <td><span class="badge badge-primary">${escapeHtml(e.action)}</span></td>
        <td>${escapeHtml(e.table_concernee||'-')}</td>
      </tr>`).join(''):'<tr><td colspan="4" style="text-align:center;padding:40px">Aucune entrée</td></tr>'}</tbody>
    </table></div></div></div>`;
  } catch(e) { c.innerHTML=`<div class="empty-state"><p>${e.message}</p></div>`; }
}

// ===== UTILISATEURS =====
async function loadUsers() {
  const c=document.getElementById('contentArea'); c.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try {
    const [users,roles]=await Promise.all([API.getUsers(),API.getRoles()]);
    c.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div>
        ${canModify()?'<button class="btn btn-primary" onclick="showAddUserModal()">+ Nouvel utilisateur</button>':''}</div>
      <div class="card"><div class="card-body"><div class="table-container"><table>
        <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Dernière connexion</th>${canModify()?'<th>Actions</th>':''}</tr></thead>
        <tbody>${users.map(u=>`<tr>
          <td><strong>${escapeHtml(u.prenom)} ${escapeHtml(u.nom)}</strong></td><td>${escapeHtml(u.email)}</td>
          <td><span class="badge badge-primary">${escapeHtml(u.role_nom)}</span></td>
          <td>${u.actif?'<span class="badge badge-success">Actif</span>':'<span class="badge badge-danger">Inactif</span>'}</td>
          <td>${u.derniere_connexion?formatDate(u.derniere_connexion):'-'}</td>
          ${canModify()?`<td class="actions">
            <button class="btn btn-sm btn-outline" onclick="showEditUserModal(${u.id})">✏️</button>
            <button class="btn btn-sm btn-${u.actif?'warning':'success'}" onclick="toggleUser(${u.id},${u.actif?0:1})">${u.actif?'🚫':'✅'}</button>
            <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id},'${escapeHtml(u.prenom)} ${escapeHtml(u.nom)}')">🗑️</button>
          </td>`:''}
        </tr>`).join('')}</tbody>
      </table></div></div></div>`;
  } catch(e) { c.innerHTML=`<div class="empty-state"><p>${e.message}</p></div>`; }
}

async function showAddUserModal() {
  openModal('Nouvel utilisateur', `
    <div class="form-group"><label>Prénom *</label><input id="userPrenom"></div>
    <div class="form-group"><label>Nom *</label><input id="userNom"></div>
    <div class="form-group"><label for="userPassword">Mot de passe *</label><div class="password-field"><input type="password" id="userPassword" autocomplete="new-password"><button type="button" class="password-toggle" data-target="userPassword" aria-label="Afficher le mot de passe" aria-pressed="false" title="Afficher le mot de passe"><svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg><svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button></div></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitAddUser()">Créer</button>`);
}

async function submitAddUser() {
  const prenomEl = document.getElementById('userPrenom');
  const nomEl = document.getElementById('userNom');
  const passwordEl = document.getElementById('userPassword');
  if (!prenomEl || !nomEl || !passwordEl) { showToast('Erreur: formulaire invalide', 'error'); return; }

  const prenom = prenomEl.value.trim();
  const nom = nomEl.value.trim();
  const mot_de_passe = passwordEl.value;

  if (!prenom) { showToast('Prénom requis', 'error'); return; }
  if (!nom) { showToast('Nom requis', 'error'); return; }
  if (!mot_de_passe) { showToast('Mot de passe requis', 'error'); return; }

  try {
    let organisation_id = currentUser && currentUser.organisation_id ? currentUser.organisation_id : 1;
    const result = await API.createUser({ prenom, nom, mot_de_passe, organisation_id });
    closeModal();
    const loginHint = result && result.email ? ` Identifiant : ${result.email}` : '';
    showToast('Utilisateur créé.' + loginHint);
    loadUsers();
  } catch(e) { showToast(e.message || 'Erreur lors de la création', 'error'); }
}

async function showEditUserModal(id) {
  const [user,roles]=await Promise.all([API.getUser(id),API.getRoles()]);
  openModal('Modifier l\'utilisateur', `
    <div class="form-group"><label>Prénom</label><input id="userPrenom" value="${escapeHtml(user.prenom)}"></div>
    <div class="form-group"><label>Nom</label><input id="userNom" value="${escapeHtml(user.nom)}"></div>
    <div class="form-group"><label>Email</label><input type="email" id="userEmail" value="${escapeHtml(user.email)}"></div>
    <div class="form-group"><label>Téléphone</label><input id="userTel" value="${escapeHtml(user.telephone||'')}"></div>
    <div class="form-group"><label>Rôle</label><select id="userRole">${roles.map(r=>`<option value="${r.id}" ${r.id===user.role_id?'selected':''}>${escapeHtml(r.nom)}</option>`).join('')}</select></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitEditUser(${id})">Enregistrer</button>`);
}
async function submitEditUser(id) {
  try { await API.updateUser(id,{prenom:document.getElementById('userPrenom').value,nom:document.getElementById('userNom').value,email:document.getElementById('userEmail').value,telephone:document.getElementById('userTel').value,role_id:parseInt(document.getElementById('userRole').value)}); closeModal(); showToast('Utilisateur modifié'); loadUsers(); }
  catch(e) { showToast(e.message,'error'); }
}
async function toggleUser(id,actif) {
  try { await API.updateUser(id,{actif}); showToast(actif?'Utilisateur activé':'Utilisateur désactivé'); loadUsers(); }
  catch(e) { showToast(e.message,'error'); }
}
async function deleteUser(id,name) {
  if(id === currentUser.id) { showToast('Vous ne pouvez pas supprimer votre propre compte','error'); return; }
  if(!confirm(`Supprimer l'utilisateur "${name}" ? Cette action est irréversible.`)) return;
  try { await API.deleteUser(id); showToast('Utilisateur supprimé'); loadUsers(); }
  catch(e) { showToast(e.message,'error'); }
}


// ===== SALLES =====
async function loadSalles(){
  const c=document.getElementById('contentArea');
  c.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try{
    const salles=await API.getSalles();
    const colCount = canModify() ? 4 : 3;
    c.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div>${canModify()?'<button class="btn btn-primary" onclick="showAddSalleModal()">+ Ajouter une salle</button>':''}</div><div class="card"><div class="card-body"><div class="table-container"><table><thead><tr><th>Salle</th><th>Description</th><th>Armoires</th>${canModify()?'<th>Actions</th>':''}</tr></thead><tbody>${salles.length?salles.map(s=>`<tr><td><strong>${escapeHtml(s.nom)}</strong></td><td>${escapeHtml(s.description||'-')}</td><td>${s.nb_armoires||0}</td>${canModify()?`<td><button class="btn btn-sm btn-danger" onclick="deleteSalle(${s.id})">🗑️ Supprimer</button></td>`:''}</tr>`).join(''):`<tr><td colspan="${colCount}" style="text-align:center;padding:30px">Aucune salle créée</td></tr>`}</tbody></table></div></div></div>`;
  }catch(e){c.innerHTML=`<div class="empty-state"><p>${e.message}</p></div>`;}
}

async function deleteSalle(id){
  if(!confirm('Supprimer cette salle ? Les armoires et données liées peuvent empêcher la suppression.')) return;
  try { await API.deleteSalle(id); showToast('Salle supprimée avec succès.'); loadSalles(); }
  catch(e) { showToast(e.message, 'error'); }
}
async function showAddSalleModal(){
  openModal('Ajouter une salle',`
    <div class="form-group"><label>Nom de la salle *</label><input id="salleNom" placeholder="Ex. Archives centrales"></div>
    <div class="form-group"><label>Description</label><textarea id="salleDescription"></textarea></div>
  `,`<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitAddSalle()">Créer</button>`);
}
async function submitAddSalle(){
  const nom=document.getElementById('salleNom').value.trim();
  const description=document.getElementById('salleDescription').value;
  if(!nom) return showToast('Le nom de la salle est requis.','error');
  try{
    let organisation_id = currentUser && currentUser.organisation_id ? currentUser.organisation_id : null;
    if(!organisation_id){
      const orgs = await API.getOrganisations();
      organisation_id = orgs && orgs[0] ? orgs[0].id : 1;
    }
    await API.createSalle({organisation_id:parseInt(organisation_id),nom,description});
    closeModal();
    showToast('Salle créée avec succès.');
    loadSalles();
  }catch(e){showToast(e.message,'error');}
}
