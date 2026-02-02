const User = require("../models/user.model");
const Match = require("../models/match.model");
const Wallet = require("../models/wallet.model");

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMatches = await Match.countDocuments();
    const activeMatches = await Match.countDocuments({
      status: { $in: ["OPEN", "ONGOING"] },
    });

    // Calculate total wallet balance in system
    const wallets = await Wallet.find();
    const totalWalletBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalMatches,
        activeMatches,
        totalWalletBalance,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password_hash")
      .sort("-created_at");
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSponsoredEvent = async (req, res) => {
  try {
    const {
      title,
      banner_url,
      game_type,
      mode,
      max_players,
      map,
      room_password,
      entry_fee,
      prize_pool,
      match_date,
      match_time,
      mediator_email,
      standard_restrictions,
      additional_rules,
      sponsor_details,
      latitude,
      longitude,
      isPublished,
    } = req.body;

    const eventData = {
      created_by: req.user._id,
      title,
      banner_url,
      game_type,
      mode,
      max_players,
      map,
      room_password,
      entry_fee: parseFloat(entry_fee) || 0,
      prize_pool: parseFloat(prize_pool) || 0,
      match_date,
      match_time,
      mediator_email,
      standard_restrictions: {
        no_grenades: standard_restrictions?.no_grenades ?? true,
        sniper_only: standard_restrictions?.sniper_only ?? false,
        no_vehicles: standard_restrictions?.no_vehicles ?? true,
        skills_off: standard_restrictions?.skills_off ?? false,
        disqualified_on_hack:
          standard_restrictions?.disqualified_on_hack ?? true,
        non_refundable: standard_restrictions?.non_refundable ?? true,
      },
      additional_rules,
      is_sponsored: true,
      sponsor_details,
      isPublished: isPublished !== undefined ? isPublished : true,
    };

    if (latitude && longitude) {
      eventData.location = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    const newEvent = new Match(eventData);
    await newEvent.save();

    res.json({
      success: true,
      message: "Sponsored event created successfully",
      data: newEvent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPremiumEvent = async (req, res) => {
  try {
    const {
      title,
      banner_url,
      game_type,
      mode,
      max_players,
      map,
      room_password,
      entry_fee,
      prize_pool,
      match_date,
      match_time,
      mediator_email,
      standard_restrictions,
      additional_rules,
      latitude,
      longitude,
      isPublished,
    } = req.body;

    const eventData = {
      created_by: req.user._id,
      title,
      banner_url,
      game_type,
      mode,
      max_players,
      map,
      room_password,
      entry_fee: parseFloat(entry_fee) || 0,
      prize_pool: parseFloat(prize_pool) || 0,
      match_date,
      match_time,
      mediator_email,
      standard_restrictions: {
        no_grenades: standard_restrictions?.no_grenades ?? true,
        sniper_only: standard_restrictions?.sniper_only ?? false,
        no_vehicles: standard_restrictions?.no_vehicles ?? true,
        skills_off: standard_restrictions?.skills_off ?? false,
        disqualified_on_hack:
          standard_restrictions?.disqualified_on_hack ?? true,
        non_refundable: standard_restrictions?.non_refundable ?? true,
      },
      additional_rules,
      is_sponsored: false,
      is_premium: true,
      isPublished: isPublished !== undefined ? isPublished : true,
    };

    if (latitude && longitude) {
      eventData.location = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    const newEvent = new Match(eventData);
    await newEvent.save();

    res.json({
      success: true,
      message: "Premium event created successfully",
      data: newEvent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate("created_by", "username")
      .sort("-createdAt");
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const match = await Match.findById(id);
    if (!match)
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    if (match.isPublished)
      return res
        .status(400)
        .json({ success: false, message: "Cannot edit published match" });
    const updatedMatch = await Match.findByIdAndUpdate(id, updates, {
      new: true,
    });
    res.json({ success: true, data: updatedMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);
    if (!match)
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    if (match.isPublished)
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete published match" });
    await Match.findByIdAndDelete(id);
    res.json({ success: true, message: "Match deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStats,
  getUsers,
  getMatches,
  createSponsoredEvent,
  createPremiumEvent,
  updateUser,
  deleteUser,
  updateMatch,
  deleteMatch,
};
