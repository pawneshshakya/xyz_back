const AppVersionConfig = require('../models/appVersionConfig.model');
const STATUS_CODES = require('../utils/statusCodes');
const { compareVersions } = require('../utils/semver');

const getVersionStatus = async (req, res) => {
  try {
    const { platform, appVersion } = req.query;

    if (!platform || !appVersion) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: 'platform and appVersion are required' });
    }

    const config = await AppVersionConfig.findOne({ platform: platform.toLowerCase() });
    if (!config) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: 'App version config not found' });
    }

    const isSupported =
      compareVersions(appVersion, config.minSupportedVersion) >= 0;

    if (isSupported) {
      return res.json({
        status: 'OK',
        latestVersion: config.latestVersion,
        message: config.message,
      });
    }

    // Use the last config update time as the start of the grace window.
    const graceDeadline = new Date(config.updatedAt);
    graceDeadline.setDate(graceDeadline.getDate() + config.graceDays);
    const graceActive = Date.now() <= graceDeadline.getTime();

    if (!config.forceUpdate && graceActive) {
      return res.json({
        status: 'WARNING',
        latestVersion: config.latestVersion,
        minSupportedVersion: config.minSupportedVersion,
        graceDays: config.graceDays,
        message: config.message,
        storeUrl: config.storeUrl,
      });
    }

    return res.json({
      status: 'FORCE_UPDATE',
      latestVersion: config.latestVersion,
      minSupportedVersion: config.minSupportedVersion,
      message: config.message,
      storeUrl: config.storeUrl,
    });
  } catch (error) {
    return res
      .status(STATUS_CODES.SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

const upsertVersionConfig = async (req, res) => {
  try {
    const {
      platform,
      latestVersion,
      minSupportedVersion,
      graceDays,
      forceUpdate,
      message,
      storeUrl,
    } = req.body;

    if (!platform || !latestVersion || !minSupportedVersion) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'platform, latestVersion, and minSupportedVersion are required',
      });
    }

    const updatedConfig = await AppVersionConfig.findOneAndUpdate(
      { platform: platform.toLowerCase() },
      {
        platform: platform.toLowerCase(),
        latestVersion,
        minSupportedVersion,
        graceDays,
        forceUpdate,
        message,
        storeUrl,
      },
      { new: true, upsert: true, runValidators: true },
    );

    return res.json({ success: true, data: updatedConfig });
  } catch (error) {
    return res
      .status(STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: error.message });
  }
};

module.exports = {
  getVersionStatus,
  upsertVersionConfig,
};
