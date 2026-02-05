const mongoose = require("mongoose");

const BannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    image_url: { type: String, trim: true },
    image_base64: { type: String },
    image_mime: { type: String },
    image_source: { type: String, enum: ["url", "base64"], default: "url" },
    link_url: { type: String, trim: true },
    is_active: { type: Boolean, default: true },
    display_order: { type: Number, default: 0 },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Banner", BannerSchema);
