const Match = require('../models/match.model');
const walletService = require('./wallet.service');
const sseService = require('./sse.service');
const User = require('../models/user.model');
const emailService = require('./email.service');

const createMatch = async (userId, matchData) => {
  const {
    title,
    banner_url,
    game_type,
    mode,
    max_players,
    map,
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
    room_id: providedRoomId,
    room_password
  } = matchData;

  // Validation
  if (parseFloat(entry_fee) < 0) throw new Error('Entry fee cannot be negative');
  if (parseFloat(prize_pool) < 0) throw new Error('Prize pool cannot be negative');

  // Use provided Room ID or generate one
  const room_id = providedRoomId || Math.random().toString(36).substring(2, 8).toUpperCase();

  // Mediator Lookup
  let mediator_user_id = null;
  if (mediator_email) {
    const mediator = await User.findOne({ email: mediator_email.toLowerCase() });
    if (mediator) {
      mediator_user_id = mediator._id;
    }
  }

  // Location Data
  let location = null;
  if (latitude && longitude) {
    location = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)]
    };
  }

  const match = await Match.create({
    created_by: userId,
    title,
    banner_url,
    game_type,
    mode,
    max_players: max_players || (game_type === 'BR' ? 52 : 2),
    map,
    room_id,
    room_password,
    entry_fee: parseFloat(entry_fee) || 0,
    prize_pool: parseFloat(prize_pool) || 0,
    match_date,
    match_time,
    mediator_email,
    mediator_user_id,
    standard_restrictions,
    additional_rules,
    location,
    isPublished: isPublished !== undefined ? isPublished : true
  });

  // Notify Mediator (Only if published?) 
  // Maybe notify only when published. But sticking to existing logic, if created, notify?
  // Let's notify only if isPublished is true.
  if (mediator_email && match.isPublished) {
    await emailService.sendEmail({
      to: mediator_email,
      subject: `You have been selected as a mediator for ${title}`,
      text: `You have been selected as a mediator for the match "${title}" (Room ID: ${room_id}). Please log in to the app to review results when the match concludes.`,
      html: `<p>You have been selected as a mediator for the match <strong>${title}</strong> (Room ID: ${room_id}).</p><p>Please log in to the app to review results when the match concludes.</p>`
    });
  }

  return match;
};

const updateMatch = async (matchId, userId, updateData) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Not authorized');
  }

  if (match.isPublished && !updateData.isPublished) {
    // Trying to unpublish? 
    // For now, allow simple updates.
  }

  // If editing a non-published match, allow full edits.
  // If published, maybe restrict? 
  // User says "if event is not published we can edit".
  // So if match.isPublished is true, we might block updates or allow partial?
  // I will follow instruction: "if event is not published event we can edit".
  // Implies we CANNOT edit if published (or restricted).
  // I'll throw if isPublished is true AND we are not trying to just update specific allowed fields?
  // Simply: Only allow update if !isPublished.
  // Exception: Publishing it (setting isPublished: true).

  if (match.isPublished && !updateData.forceUpdate) {
    // Allow forceUpdate if needed, otherwise block.
    // But wait, user might want to edit "Winner" or something? No that's submitResult.
    throw new Error('Cannot edit published match');
  }

  const updatedMatch = await Match.findByIdAndUpdate(matchId, updateData, { new: true });

  // If becoming published, notify mediator
  if (!match.isPublished && updatedMatch.isPublished && updatedMatch.mediator_email) {
    await emailService.sendEmail({
      to: updatedMatch.mediator_email,
      subject: `You have been selected as a mediator for ${updatedMatch.title}`,
      text: `You have been selected as a mediator for the match "${updatedMatch.title}" (Room ID: ${updatedMatch.room_id}). Please log in to the app to review results when the match concludes.`,
      html: `<p>You have been selected as a mediator for the match <strong>${updatedMatch.title}</strong> (Room ID: ${updatedMatch.room_id}).</p><p>Please log in to the app to review results when the match concludes.</p>`
    });
  }

  return updatedMatch;
};

const deleteMatch = async (matchId, userId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Not authorized');
  }

  if (match.isPublished) {
    throw new Error('Cannot delete published match');
  }

  await Match.deleteOne({ _id: matchId });
  return { success: true };
};

const joinMatch = async (userId, roomId) => {
  const match = await Match.findOne({ room_id: roomId });
  if (!match) throw new Error('Match not found');

  if (!match.isPublished) throw new Error('Match is not published'); // Ensure drafts cannot be joined
  if (match.status !== 'OPEN') throw new Error('Match is not open');
  if (match.participants.length >= match.max_players) throw new Error('Match is full');

  // Check if already joined
  const isJoined = match.participants.some(p => p.user_id.toString() === userId.toString());
  if (isJoined) throw new Error('Already joined');

  // Lock Funds
  await walletService.lockFunds(userId, match.entry_fee);

  // Add to participants
  match.participants.push({ user_id: userId });
  await match.save();

  // Notify via SSE
  sseService.notifyMatchUpdate(match._id, {
    type: 'PARTICIPANT_UPDATE',
    count: match.participants.length,
    matchId: match._id
  });

  return match;
};

const checkMatchStatus = async (match) => {
  if (!match || match.status !== 'OPEN') return match;

  try {
    // Expected format: "17 Jan 2026" and "14:30" => "17 Jan 2026 14:30"
    const dateStr = `${match.match_date} ${match.match_time}`;

    // Try standard parsing
    let matchTime = Date.parse(dateStr);

    // Fallback matching frontend logic if standard fails or needs manual for specific format
    if (isNaN(matchTime)) {
      const parts = dateStr.match(/(\d+)\s+([a-zA-Z]+)\s+(\d+)\s+(\d+):(\d+)/);
      if (parts) {
        const [_, day, monthStr, year, hour, minute] = parts;
        const monthMap = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
        };
        // Adjust year if needed (e.g. 2-digit). Assuming full year as per frontend.
        matchTime = new Date(year, monthMap[monthStr], day, hour, minute).getTime();
      }
    }

    if (!isNaN(matchTime) && matchTime < Date.now()) {
      match.status = 'ONGOING';
      await match.save();

      // Notify via SSE
      if (sseService && sseService.notifyMatchUpdate) {
        sseService.notifyMatchUpdate(match._id, { type: 'STATUS_UPDATE', status: 'ONGOING' });
      }
    }
  } catch (error) {
    console.error(`Error checking match status for ${match._id}:`, error);
  }
  return match;
};

const getMatch = async (matchId, currentUser = null) => {
  const match = await Match.findById(matchId).populate('created_by', 'username');

  if (match) {
    await checkMatchStatus(match);

    // Visibility Check for Screenshots
    // If not mediator and not creator, hide screenshots
    if (match.results && match.results.screenshot_urls && match.results.screenshot_urls.length > 0) {
      const isCreator = currentUser && currentUser.id === match.created_by._id.toString();
      const isMediator = currentUser && (
        (match.mediator_user_id && currentUser.id === match.mediator_user_id.toString()) ||
        (match.mediator_email && currentUser.email.toLowerCase() === match.mediator_email.toLowerCase())
      );

      if (!isCreator && !isMediator) {
        match.results.screenshot_urls = []; // Mask screenshots
      }
    }
  }
  return match;
};

const getAllMatches = async (coordinates) => {
  // Query for OPEN or ONGOING to allow seeing them update?
  // Usually getAllMatches filters by OPEN. 
  // If we want to move them to ONGOING, we should fetch OPEN matches, check them, and if they turn ONGOING, maybe exclude them?
  // Or just return the list. If the UI only shows OPEN, then they will naturally disappear from the list if the query filters them.
  // But here query starts as { status: 'OPEN' }. we fetch them. then check status.

  let query = { status: 'OPEN', isPublished: { $ne: false } };

  if (coordinates && coordinates.latitude && coordinates.longitude) {
    query.location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(coordinates.longitude), parseFloat(coordinates.latitude)]
        },
        $maxDistance: 50000 // 50km
      }
    };
  }

  // Filter for Featured Events (Admin Created / Premium / Sponsored)
  if (coordinates && coordinates.featured === 'true') {
    query.$or = [{ is_premium: true }, { is_sponsored: true }];
  }

  const matches = await Match.find(query).sort('-createdAt');

  // Check statuses asynchronously
  const updatedMatches = await Promise.all(matches.map(async (m) => {
    await checkMatchStatus(m);
    // If status changed to ONGOING, should it still be returned?
    // Depending on requirements. Usually "Find Matches" implies finding OPEN matches to join.
    // If it is now ONGOING, it's not joinable.
    // For now, I will filter them out if they are no longer OPEN.
    return m.status === 'OPEN' ? m : null;
  }));

  return updatedMatches.filter(m => m !== null);
};

const getJoinedMatches = async (userId) => {
  const matches = await Match.find({
    'participants.user_id': userId
  }).sort('-createdAt');

  // Check statuses asynchronously
  await Promise.all(matches.map(async (m) => {
    await checkMatchStatus(m);
  }));

  return matches;
};

const getCreatedMatches = async (userId) => {
  const matches = await Match.find({ created_by: userId }).sort('-createdAt');
  await Promise.all(matches.map(async (m) => {
    await checkMatchStatus(m);
  }));
  return matches;
};

const submitResult = async (matchId, userId, resultData) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Only creator can submit results');
  }

  // Ensure status is checked before submitting? 
  // If it was OPEN but time passed, it should be ONGOING.
  await checkMatchStatus(match);

  if (match.status !== 'ONGOING' && match.status !== 'OPEN') {
    // Strict check can be enabled. 
  }

  match.results = {
    submitted_by: userId,
    kills: resultData.kills,
    damage: resultData.damage,
    screenshot_urls: resultData.screenshot_urls,
    submitted_at: Date.now()
  };
  match.status = 'PENDING_MEDIATOR_REVIEW';
  await match.save();

  // Notify
  sseService.notifyMatchUpdate(match._id, { type: 'STATUS_UPDATE', status: match.status });

  return match;
};

const approveResult = async (matchId, mediatorId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  if (match.status !== 'PENDING_MEDIATOR_REVIEW') throw new Error('Match not pending review');

  // Distribute Winnings Logic (Simplified)
  // Credit Creator as placeholder
  const winnerId = match.results.submitted_by;
  const prize = match.prize_pool;

  // Using wallet service
  const wallet = await walletService.deposit(winnerId, prize);

  match.status = 'COMPLETED';
  await match.save();

  sseService.notifyMatchUpdate(match._id, { type: 'STATUS_UPDATE', status: match.status });

  return match;
};

const checkMediatorStatus = async (user) => {
  const isMediator = await Match.exists({
    $or: [
      { mediator_email: user.email.toLowerCase() },
      { mediator_user_id: user.id }
    ]
  });
  return !!isMediator;
};

const getMediatorMatches = async (user) => {
  const matches = await Match.find({
    $or: [
      { mediator_email: user.email.toLowerCase() },
      { mediator_user_id: user.id }
    ]
  }).sort('-createdAt');

  // Check statuses
  await Promise.all(matches.map(async (m) => {
    await checkMatchStatus(m);
  }));

  return matches;
};

module.exports = {
  createMatch,
  joinMatch,
  getMatch,
  getAllMatches,
  getJoinedMatches,
  getCreatedMatches,
  submitResult,
  approveResult,
  checkMediatorStatus,
  getMediatorMatches,
  updateMatch,
  deleteMatch
};
