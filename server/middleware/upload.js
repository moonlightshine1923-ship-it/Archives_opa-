const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');

// Créer le dossier d'upload s'il n'existe pas
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = (process.env.ALLOWED_EXTENSIONS || 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,zip').split(',');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orgDir = path.join(UPLOAD_DIR, req.user?.organisation_id?.toString() || 'shared');
    if (!fs.existsSync(orgDir)) {
      fs.mkdirSync(orgDir, { recursive: true });
    }
    cb(null, orgDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// Filtre des extensions
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: .${ext}. Extensions autorisées: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Upload single
module.exports.single = upload.single('fichier');

// Upload multiple
module.exports.array = upload.array('fichiers', 20);

// Middleware de gestion d'erreur upload
module.exports.handleError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux.' });
    }
    return res.status(400).json({ error: `Erreur upload: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};
