const Banner = require("../models/banner.model");

const listActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ is_active: true }).sort({
      display_order: 1,
      createdAt: -1,
    });
    const data = banners.map((b) => {
      const banner = b.toObject();
      if (!banner.image_url && banner.image_base64) {
        const mime = banner.image_mime || "image/jpeg";
        banner.image_url = `data:${mime};base64,${banner.image_base64}`;
      }
      return banner;
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { listActiveBanners };
