const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;

const sanitizeText = (input = '') => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(SCRIPT_TAG_REGEX, '')
    .replace(CONTROL_CHARS_REGEX, '')
    .trim();
};

module.exports = { sanitizeText };
