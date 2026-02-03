const AppVersionConfig = require('../models/appVersionConfig.model');
const { compareVersions } = require('../utils/semver');

const enforceMinAppVersion = async (req, res, next) => {
  try {
    const appVersion = req.headers['app-version'];
    const platform = req.headers['platform'];

    if (!appVersion || !platform) {
      return next();
    }

    const config = await AppVersionConfig.findOne({ platform: platform.toLowerCase() });
    if (!config) {
      return next();
    }

    const isSupported =
      compareVersions(appVersion, config.minSupportedVersion) >= 0;

    if (!isSupported) {
      return res.status(426).json({
        message: 'Please update the app to continue',
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { enforceMinAppVersion };
