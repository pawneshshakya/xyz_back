const User = require("../models/user.model");
const Match = require("../models/match.model");
const Wallet = require("../models/wallet.model");
const Transaction = require("../models/transaction.model");
const Banner = require("../models/banner.model");
const { decrypt, encrypt } = require("../utils/encryption");
const notificationService = require("../services/notification.service");

const safeDecryptNumber = (val) => {
  const decrypted = decrypt(val);
  const num = Number(decrypted);
  return Number.isNaN(num) ? 0 : num;
};

const formatWalletForAdmin = async (wallet) => {
  const walletObj = wallet.toObject ? wallet.toObject() : wallet;
  const user = await User.findById(walletObj.user_id).select(
    "username email role is_verified ads_disabled created_at",
  );
  return {
    ...walletObj,
    wallet_account_no: decrypt(walletObj.wallet_account_no),
    available_balance: safeDecryptNumber(walletObj.available_balance),
    locked_balance: safeDecryptNumber(walletObj.locked_balance),
    withdrawable_balance: safeDecryptNumber(walletObj.withdrawable_balance),
    user,
  };
};

const getLast7DaysRange = () => {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  return { start, end };
};

const getPrev7DaysRange = () => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() - 7);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start, end };
};

const buildLabels = (start) => {
  const labels = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    labels.push(d.toISOString().slice(0, 10));
  }
  return labels;
};

const seriesFromRows = (labels, rows) => {
  const map = new Map(rows.map((r) => [r._id, r.total]));
  return labels.map((d) => map.get(d) || 0);
};

const trendPct = (currentSum, previousSum) => {
  if (previousSum === 0) return currentSum > 0 ? 100 : 0;
  return Math.round(((currentSum - previousSum) / previousSum) * 1000) / 10;
};

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMatches = await Match.countDocuments();
    const activeMatches = await Match.countDocuments({
      status: { $in: ["OPEN", "ONGOING"] },
    });

    // Calculate total wallet balance in system (available + locked + withdrawable)
    const wallets = await Wallet.find();
    const totalWalletBalance = wallets.reduce((acc, w) => {
      const available = safeDecryptNumber(w.available_balance);
      const locked = safeDecryptNumber(w.locked_balance);
      const withdrawable = safeDecryptNumber(w.withdrawable_balance);
      return acc + available + locked + withdrawable;
    }, 0);

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
    const { q } = req.query;
    const query = {};
    if (q) {
      query.$or = [
        { username: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
      ];
    }
    const users = await User.find(query)
      .select("-password_hash")
      .sort("-created_at");
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password_hash");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
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

    // Broadcast Notification
    const notifTitle = `New Sponsored Tournament: ${title}`;
    const notifBody = "A new Sponsored tournament has been created. Check it out!";
    await notificationService.sendBroadcast(notifTitle, notifBody, { matchId: newEvent._id.toString() });

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

    // Broadcast Notification
    const notifTitle = `New Premium Tournament: ${title}`;
    const notifBody = "A new Premium tournament has been created. Don't miss out!";
    await notificationService.sendBroadcast(notifTitle, notifBody, { matchId: newEvent._id.toString() });

    res.json({
      success: true,
      message: "Premium event created successfully",
      data: newEvent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createStandardEvent = async (req, res) => {
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
      is_premium: false,
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

    // Broadcast Notification
    const notifTitle = `New Standard Tournament: ${title}`;
    const notifBody = "A new Standard tournament has been created. Register now!";
    await notificationService.sendBroadcast(notifTitle, notifBody, { matchId: newEvent._id.toString() });

    res.json({
      success: true,
      message: "Standard event created successfully",
      data: newEvent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMatches = async (req, res) => {
  try {
    // 1. Find all users who are ADMINs
    const admins = await User.find({ role: 'ADMIN' }).select('_id');
    const adminIds = admins.map(u => u._id);

    // 2. Only fetch matches created by these admins
    const matches = await Match.find({ created_by: { $in: adminIds } })
      .populate("created_by", "username")
      .sort("-createdAt");

    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate(
      "created_by",
      "username email",
    );
    if (!match)
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    res.json({ success: true, data: match });
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
    if (match.isPublished && !updates.forceUpdate)
      return res
        .status(400)
        .json({ success: false, message: "Cannot edit published match without forceUpdate" });
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
    const { force } = req.query;
    const match = await Match.findById(id);
    if (!match)
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    if (match.isPublished && String(force) !== "true")
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete published match without force=true" });
    await Match.findByIdAndDelete(id);
    res.json({ success: true, message: "Match deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { userId, type, status } = req.query;
    const query = {};
    if (userId) query.user_id = userId;
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .populate("user_id", "username email")
      .sort("-createdAt");

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWeeklyPerformance = async (req, res) => {
  try {
    const { start, end } = getLast7DaysRange();
    const labels = buildLabels(start);
    const { start: prevStart, end: prevEnd } = getPrev7DaysRange();

    const [revenueRows, userRows, matchRows, revenuePrev, userPrev, matchPrev] =
      await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
              type: "DEPOSIT",
              status: "SUCCESS",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              total: { $sum: "$amount" },
            },
          },
        ]),
        User.aggregate([
          {
            $match: {
              created_at: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$created_at" },
              },
              total: { $sum: 1 },
            },
          },
        ]),
        Match.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              total: { $sum: 1 },
            },
          },
        ]),
        Transaction.aggregate([
          {
            $match: {
              createdAt: { $gte: prevStart, $lte: prevEnd },
              type: "DEPOSIT",
              status: "SUCCESS",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        User.aggregate([
          {
            $match: {
              created_at: { $gte: prevStart, $lte: prevEnd },
            },
          },
          { $group: { _id: null, total: { $sum: 1 } } },
        ]),
        Match.aggregate([
          {
            $match: {
              createdAt: { $gte: prevStart, $lte: prevEnd },
            },
          },
          { $group: { _id: null, total: { $sum: 1 } } },
        ]),
      ]);

    const revenueSeries = seriesFromRows(labels, revenueRows);
    const userSeries = seriesFromRows(labels, userRows);
    const participationSeries = seriesFromRows(labels, matchRows);

    const revenueSum = revenueSeries.reduce((a, b) => a + b, 0);
    const userSum = userSeries.reduce((a, b) => a + b, 0);
    const participationSum = participationSeries.reduce((a, b) => a + b, 0);

    const prevRevenueSum = revenuePrev[0]?.total || 0;
    const prevUserSum = userPrev[0]?.total || 0;
    const prevParticipationSum = matchPrev[0]?.total || 0;

    res.json({
      success: true,
      data: {
        labels,
        series: {
          revenue: revenueSeries,
          userGrowth: userSeries,
          participation: participationSeries,
        },
        totals: {
          revenue: revenueSum,
          userGrowth: userSum,
          participation: participationSum,
        },
        trends: {
          revenuePct: trendPct(revenueSum, prevRevenueSum),
          userGrowthPct: trendPct(userSum, prevUserSum),
          participationPct: trendPct(participationSum, prevParticipationSum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id).populate(
      "user_id",
      "username email",
    );
    if (!tx)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    res.json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWallets = async (req, res) => {
  try {
    const { q } = req.query;
    let wallets;

    if (q) {
      const users = await User.find({
        $or: [{ username: new RegExp(q, "i") }, { email: new RegExp(q, "i") }],
      }).select("_id");
      const userIds = users.map((u) => u._id);
      wallets = await Wallet.find({ user_id: { $in: userIds } }).sort(
        "-createdAt",
      );
    } else {
      wallets = await Wallet.find().sort("-createdAt");
    }

    const formatted = [];
    for (const w of wallets) {
      formatted.push(await formatWalletForAdmin(w));
    }
    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWalletById = async (req, res) => {
  try {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet)
      return res
        .status(404)
        .json({ success: false, message: "Wallet not found" });
    const formatted = await formatWalletForAdmin(wallet);
    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adjustWalletBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, reason } = req.body;

    if (!amount || typeof amount !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "amount must be a number" });
    }

    if (!["CREDIT", "DEBIT"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "type must be CREDIT or DEBIT" });
    }

    const wallet = await Wallet.findById(id);
    if (!wallet)
      return res
        .status(404)
        .json({ success: false, message: "Wallet not found" });

    let available = safeDecryptNumber(wallet.available_balance);
    let withdrawable = safeDecryptNumber(wallet.withdrawable_balance);
    const delta = Number(amount);

    if (type === "DEBIT" && available < delta) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient available balance" });
    }
    if (type === "DEBIT" && withdrawable < delta) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient withdrawable balance" });
    }

    available = type === "CREDIT" ? available + delta : available - delta;
    withdrawable =
      type === "CREDIT" ? withdrawable + delta : withdrawable - delta;

    wallet.available_balance = encrypt(String(available));
    wallet.withdrawable_balance = encrypt(String(withdrawable));
    await wallet.save();

    await Transaction.create({
      user_id: wallet.user_id,
      amount: delta,
      type: type === "CREDIT" ? "DEPOSIT" : "WITHDRAW",
      category: "WALLET",
      status: "SUCCESS",
      description: reason || "Admin adjustment",
      metadata: { admin_user_id: req.user._id, admin_adjustment: true },
    });

    const formatted = await formatWalletForAdmin(wallet);
    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStats,
  getUsers,
  getUserById,
  getMatches,
  getMatchById,
  createStandardEvent,
  createSponsoredEvent,
  createPremiumEvent,
  updateUser,
  deleteUser,
  updateMatch,
  deleteMatch,
  getTransactions,
  getTransactionById,
  getWeeklyPerformance,
  getWallets,
  getWalletById,
  adjustWalletBalance,
  getBanners: async (req, res) => {
    try {
      const banners = await Banner.find().sort({ display_order: 1, createdAt: -1 });
      res.json({ success: true, data: banners });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  createBanner: async (req, res) => {
    try {
      const {
        title,
        description,
        image_url,
        image_base64,
        image_mime,
        link_url,
        is_active,
        display_order,
      } = req.body;
      if (!title || !description || (!image_url && !image_base64)) {
        return res.status(400).json({ success: false, message: "title, description, and image (url or base64) are required" });
      }
      const source = image_base64 ? "base64" : "url";
      const banner = await Banner.create({
        title,
        description,
        image_url,
        image_base64,
        image_mime: image_mime || (image_base64 ? "image/jpeg" : undefined),
        image_source: source,
        link_url,
        is_active: is_active !== undefined ? is_active : true,
        display_order: display_order || 0,
        created_by: req.user._id,
      });
      res.json({ success: true, data: banner });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  updateBanner: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      if (updates.image_base64) {
        updates.image_source = "base64";
        updates.image_mime = updates.image_mime || "image/jpeg";
      }
      if (updates.image_url) {
        updates.image_source = "url";
      }
      const banner = await Banner.findByIdAndUpdate(id, updates, { new: true });
      if (!banner) {
        return res.status(404).json({ success: false, message: "Banner not found" });
      }
      res.json({ success: true, data: banner });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  deleteBanner: async (req, res) => {
    try {
      const { id } = req.params;
      const banner = await Banner.findByIdAndDelete(id);
      if (!banner) {
        return res.status(404).json({ success: false, message: "Banner not found" });
      }
      res.json({ success: true, message: "Banner deleted" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
