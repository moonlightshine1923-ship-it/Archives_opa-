/**
 * API Client - Archives App (v2)
 */
const API = {
  baseUrl: '/api',
  token: localStorage.getItem('archives_token'),

  setToken(token) { this.token = token; localStorage.setItem('archives_token', token); },
  clearToken() { this.token = null; localStorage.removeItem('archives_token'); localStorage.removeItem('archives_user'); },

  async request(method, endpoint, data = null, isFile = false) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (!isFile) headers['Content-Type'] = 'application/json';

    const options = { method, headers };
    if (data) options.body = isFile ? data : JSON.stringify(data);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      if (response.status === 401) { this.clearToken(); window.location.reload(); return; }
      if (response.status === 204) return { success: true };

      const responseText = await response.text();

let result = {};

try {
  result = responseText ? JSON.parse(responseText) : {};
} catch {
  result = {
    error: responseText || `Erreur serveur (${response.status})`
  };
}

if (!response.ok) {
  throw new Error(result.error || `Erreur serveur (${response.status})`);
}

return result;

    } catch (error) {
      if (error.message && error.message.includes('fetch')) throw new Error('Impossible de contacter le serveur.');
      throw error;
    }
  },

  // Auth
  login: (email, password) => API.request('POST', '/auth/login', { email, mot_de_passe: password }),
  logout: () => API.request('POST', '/auth/logout'),
  getMe: () => API.request('GET', '/auth/me'),

  // Organisations
  getOrganisations: () => API.request('GET', '/organisations'),
  getOrganisation: (id) => API.request('GET', `/organisations/${id}`),
  createOrganisation: (data) => API.request('POST', '/organisations', data),
  updateOrganisation: (id, data) => API.request('PUT', `/organisations/${id}`, data),
  deleteOrganisation: (id) => API.request('DELETE', `/organisations/${id}`),

  // Salles
  getSalles: () => API.request('GET', '/salles'),
  getSalle: (id) => API.request('GET', `/salles/${id}`),
  createSalle: (data) => API.request('POST', '/salles', data),
  updateSalle: (id, data) => API.request('PUT', `/salles/${id}`, data),
  disableSalle: (id) => API.request('PATCH', `/salles/${id}/disable`),
  enableSalle: (id) => API.request('PATCH', `/salles/${id}/enable`),
  deleteSalle: (id) => API.request('DELETE', `/salles/${id}`),

  // Armoires
  getArmoires: (salleId) => API.request('GET', `/armoires${salleId ? `?salle_id=${salleId}` : ''}`),
  getArmoire: (id) => API.request('GET', `/armoires/${id}`),
  getArmoireContenu: (id) => API.request('GET', `/armoires/${id}/contenu`),
  createArmoire: (data) => API.request('POST', '/armoires', data),
  updateArmoire: (id, data) => API.request('PUT', `/armoires/${id}`, data),
  deleteArmoire: (id) => API.request('DELETE', `/armoires/${id}`),

  // Boîtes
  getBoites: (armoireId) => API.request('GET', `/boites${armoireId ? `?armoire_id=${armoireId}` : ''}`),
  getBoite: (id) => API.request('GET', `/boites/${id}`),
  createBoite: (data) => API.request('POST', '/boites', data),
  updateBoite: (id, data) => API.request('PUT', `/boites/${id}`, data),
  moveBoite: (id, armoireId) => API.request('PATCH', `/boites/${id}/move`, { armoire_id: armoireId }),
  deleteBoite: (id) => API.request('DELETE', `/boites/${id}`),

  // Dossiers
  getDossiers: (params = '') => API.request('GET', `/dossiers${params ? '?' + params : ''}`),
  getDossier: (id) => API.request('GET', `/dossiers/${id}`),
  createDossier: (data) => API.request('POST', '/dossiers', data),
  updateDossier: (id, data) => API.request('PUT', `/dossiers/${id}`, data),
  deleteDossier: (id) => API.request('DELETE', `/dossiers/${id}`),

  // Fichiers
  getFichiersDossier: (dossierId) => API.request('GET', `/fichiers/dossier/${dossierId}`),
  getFichier: (id) => API.request('GET', `/fichiers/${id}`),
  uploadFichier: (dossierId, formData) => { formData.append('dossier_id', dossierId); return API.request('POST', '/fichiers/upload', formData, true); },
  uploadMultipleFichiers: (dossierId, formData) => { formData.append('dossier_id', dossierId); return API.request('POST', '/fichiers/upload-multi', formData, true); },
  updateFichier: (id, data) => API.request('PUT', `/fichiers/${id}`, data),
  downloadFichier: (id) => `${API.baseUrl}/fichiers/${id}/download?token=${API.token}`,
  previewFichier: (id) => `${API.baseUrl}/fichiers/${id}/preview?token=${API.token}`,
  deleteFichier: (id) => API.request('DELETE', `/fichiers/${id}`),

  // Catégories
  getCategories: () => API.request('GET', '/categories'),
  createCategorie: (data) => API.request('POST', '/categories', data),
  updateCategorie: (id, data) => API.request('PUT', `/categories/${id}`, data),
  deleteCategorie: (id) => API.request('DELETE', `/categories/${id}`),
  getSousCategories: (catId) => API.request('GET', `/categories/${catId}/sous-categories`),
  createSousCategorie: (catId, data) => API.request('POST', `/categories/${catId}/sous-categories`, data),
  deleteSousCategorie: (id) => API.request('DELETE', `/categories/sous-categories/${id}`),

  // Recherche
  search: (params) => API.request('GET', `/recherche?${params}`),
  quickSearch: (q) => API.request('GET', `/recherche/quick?q=${encodeURIComponent(q)}`),
  getSommaire: () => API.request('GET', '/sommaire'),

  // Dashboard
  getDashboard: () => API.request('GET', '/dashboard'),

  // Audit
  getAudit: (params = '') => API.request('GET', `/audit${params ? '?' + params : ''}`),

  // Users
  getUsers: () => API.request('GET', '/users'),
  getUser: (id) => API.request('GET', `/users/${id}`),
  createUser: (data) => API.request('POST', '/users', data),
  updateUser: (id, data) => API.request('PUT', `/users/${id}`, data),
  deleteUser: (id) => API.request('DELETE', `/users/${id}`),
  getRoles: () => API.request('GET', '/users/roles/list'),
};
