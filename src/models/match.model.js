const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema(
  {
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    banner_url: {
      type: String,
    },
    game_type: {
      type: String,
      enum: ["CS", "BR"],
      required: true,
    },
    mode: {
      type: String, // '1v1', '2v2', etc.
    },
    max_players: {
      type: Number,
      required: true,
    },
    map: {
      type: String,
      required: true,
    },
    room_id: {
      type: String,
      sparse: true,
      required: false,
    },
    room_password: {
      type: String,
    },
    entry_fee: {
      type: Number,
      required: true,
    },
    prize_pool: {
      type: Number,
      required: true,
    },
    match_date: {
      type: String,
      required: true,
    },
    match_time: {
      type: String,
      required: true,
    },
    participants: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        team_no: { type: Number },
        joined_at: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["OPEN", "ONGOING", "PENDING_MEDIATOR_REVIEW", "COMPLETED"],
      default: "OPEN",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere" }, // [longitude, latitude]
    },
    mediator_email: {
      type: String,
    },
    mediator_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    standard_restrictions: {
      no_grenades: { type: Boolean, default: true },
      sniper_only: { type: Boolean, default: false },
      no_vehicles: { type: Boolean, default: true },
      skills_off: { type: Boolean, default: false },
      disqualified_on_hack: { type: Boolean, default: true },
      non_refundable: { type: Boolean, default: true },
    },
    additional_rules: {
      type: String,
    },
    is_sponsored: {
      type: Boolean,
      default: false,
    },
    is_premium: {
      type: Boolean,
      default: false,
    },
    sponsor_details: {
      sponsor_name: String,
      sponsor_logo: String,
      sponsor_website: String,
      sponsor_description: String,
    },
    results: {
      submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      kills: Number,
      damage: Number,
      screenshot_urls: [String],
      submitted_at: Date,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Match", MatchSchema);
