const matchService = require('../services/match.service');
const sseService = require('../services/sse.service');
const STATUS_CODES = require('../utils/statusCodes');

const notificationService = require('../services/notification.service');

const create = async (req, res) => {
  try {
    const match = await matchService.createMatch(req.user.id, req.body);

    // Send notification if event is published
    if (match.isPublished) {
      await notificationService.sendNotification(
        req.user.id,
        "Event Published",
        `Your event "${match.title}" has been successfully created and published.`,
        { matchId: match._id.toString() }
      );
    }

    res.status(STATUS_CODES.CREATED).json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const join = async (req, res) => {
  try {
    const { roomId } = req.body;
    const match = await matchService.joinMatch(req.user.id, roomId);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getMatch = async (req, res) => {
  try {
    const match = await matchService.getMatch(req.params.id, req.user); // Pass user for visibility checks
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Match not found' });
  }
};

const getMatches = async (req, res) => {
  try {
    const { latitude, longitude, featured } = req.query;
    const matches = await matchService.getAllMatches({ latitude, longitude, featured });
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getJoinedMatches = async (req, res) => {
  try {
    const matches = await matchService.getJoinedMatches(req.user.id);
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getCreatedMatches = async (req, res) => {
  try {
    const matches = await matchService.getCreatedMatches(req.user.id);
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const sseStream = (req, res) => {
  const { matchId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseService.addClient(matchId, res);
};

const submitResult = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await matchService.submitResult(id, req.user.id, req.body);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const approveResult = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await matchService.approveResult(id, req.user.id);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const checkMediatorStatus = async (req, res) => {
  try {
    const isMediator = await matchService.checkMediatorStatus(req.user);
    res.json({ success: true, isMediator });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getMediatorMatches = async (req, res) => {
  try {
    const matches = await matchService.getMediatorMatches(req.user);
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const match = await matchService.updateMatch(req.params.id, req.user._id, req.body);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    await matchService.deleteMatch(req.params.id, req.user._id);
    res.json({ success: true, message: 'Match deleted' });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

module.exports = {
  create,
  join,
  getMatch,
  getMatches,
  getJoinedMatches,
  getCreatedMatches,
  sseStream,
  submitResult,
  approveResult,
  checkMediatorStatus,
  getMediatorMatches,
  update,
  remove
};
