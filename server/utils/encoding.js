/**
 * Corrige les noms déjà enregistrés avec un décodage Latin-1 incorrect
 * (ex. « hÃ©bergement » -> « hébergement »), sans toucher aux textes normaux.
 */
function fixMojibake(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF])+/g, sequence => {
    const bytes = Array.from(sequence, character => character.charCodeAt(0));
    const decoded = Buffer.from(bytes).toString('utf8');
    return decoded.includes('\uFFFD') ? sequence : decoded;
  });
}

module.exports = fixMojibake;
