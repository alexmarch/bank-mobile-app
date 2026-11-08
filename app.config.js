const fs = require('fs');

// FCM config for Android push: an EAS file variable (GOOGLE_SERVICES_JSON) or a local google-services.json.
module.exports = ({ config }) => {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);
  return { ...config, android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) } };
};
