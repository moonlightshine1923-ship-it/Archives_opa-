const QRCode = require('qrcode');

/**
 * Générer un QR Code pour un dossier
 * @param {string} reference - Référence du dossier
 * @returns {Promise<string>} Data URL du QR Code
 */
async function generateQRCode(reference) {
  try {
    const url = `${reference}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 256,
      margin: 2
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Erreur génération QR Code:', error.message);
    throw error;
  }
}

/**
 * Générer un QR Code en buffer pour impression
 */
async function generateQRCodeBuffer(reference) {
  try {
    const buffer = await QRCode.toBuffer(reference, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 512,
      margin: 2
    });
    return buffer;
  } catch (error) {
    console.error('Erreur génération QR Code buffer:', error.message);
    throw error;
  }
}

module.exports = { generateQRCode, generateQRCodeBuffer };
