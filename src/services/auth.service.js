const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const walletService = require('./wallet.service');
const emailService = require('./email.service');

const registerUser = async (userData) => {
  const { username, email, password, wallet_password } = userData;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new Error('User already exists');
  }

  // Create User
  const user = await User.create({
    username,
    email,
    password_hash: password, // Pre-save hook will hash this
  });


  return generateToken(user._id);
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    if (!user.is_verified) {
      throw new Error('Please verify your email first');
    }

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
      role: user.role,
      is_wallet_initialized: user.is_wallet_initialized
    };
  } else {
    throw new Error('Invalid email or password');
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const sendEmailChangeOTP = async (userId, newEmail) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Check if new email is already taken
  const emailExists = await User.findOne({ email: newEmail });
  if (emailExists) throw new Error('Email already in use');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.email_change_otp = otp;
  user.email_change_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  await user.save();

  // console.log(`[EMAIL_MOCK] Sending OTP ${otp} to ${newEmail}`);
  await emailService.sendEmail({
    to: newEmail,
    subject: 'Email Change Verification OTP',
    text: `Your OTP for changing email is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your OTP for changing email is <b>${otp}</b>. It expires in 10 minutes.</p>`
  });
  return { success: true, message: 'OTP sent successfully' };
};

const verifyEmailChangeOTP = async (userId, newEmail, otp) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.email_change_otp !== otp || user.email_change_expires < Date.now()) {
    throw new Error('Invalid or expired OTP');
  }

  user.email = newEmail;
  user.email_change_otp = undefined;
  user.email_change_expires = undefined;
  await user.save();

  return { success: true, message: 'Email updated successfully' };
};

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (token) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};

const loginWithGoogle = async (token) => {
  const payload = await verifyGoogleToken(token);
  const { sub: googleId, email, name, picture } = payload;

  let user = await User.findOne({ email });

  if (user) {
    if (!user.google_id) {
      user.google_id = googleId;
      await user.save();
    }
  } else {
    // Optional: specific logic for new users via Google
    // For Admin Panel, usually we might not auto-register admins, but for general use yes.
    // I'll auto-register as USER.
    user = await User.create({
      username: name.replace(/\s+/g, '').toLowerCase() + Math.random().toString(36).slice(-4),
      email,
      password_hash: await import('bcryptjs').then(b => b.hash(Math.random().toString(36), 10)), // Random password
      google_id: googleId,
      avatar: picture,
      is_verified: true, // Email verified by Google
      verification_source: 'GOOGLE'
    });
  }

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    token: generateToken(user._id),
    role: user.role,
    avatar: user.avatar
  };
};

const loginWithFacebook = async (token) => {
  const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`);
  const data = await response.json();

  if (data.error) throw new Error(data.error.message);

  const { id: facebookId, email, name, picture } = data;
  const avatar = picture?.data?.url;

  // If email is missing (possible with Facebook phone auth), we might need another strategy.
  // For now, require email or use facebookId based dummy email?
  // Let's rely on email if present, else fail or handle distinct logic.
  if (!email) throw new Error('Facebook account must have an email address');

  let user = await User.findOne({ email });

  if (user) {
    if (!user.facebook_id) {
      user.facebook_id = facebookId;
      await user.save();
    }
  } else {
    user = await User.create({
      username: name.replace(/\s+/g, '').toLowerCase() + Math.random().toString(36).slice(-4),
      email,
      password_hash: await import('bcryptjs').then(b => b.hash(Math.random().toString(36), 10)),
      facebook_id: facebookId,
      avatar: avatar,
      is_verified: true,
      verification_source: 'FACEBOOK'
    });
  }

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    token: generateToken(user._id),
    role: user.role,
    avatar: user.avatar
  };
};

const loginWithApple = async (idToken, userObj) => {
  // Ideally verify signature with Apple's public keys
  // For this step, we decode to get email/sub. 
  // Trusted flow: Client sends identityToken.
  const decoded = jwt.decode(idToken);
  if (!decoded) throw new Error('Invalid Apple Token');

  const { sub: appleId, email } = decoded;

  // Apple only sends email on FIRST login. Client should provide it if available or we check db by appleAuthId.
  // If userObj is provided (from client on first login specifically), use that email.

  let userEmail = email;
  if (!userEmail && userObj && userObj.email) {
    userEmail = userObj.email;
  }

  let user = await User.findOne({ apple_id: appleId });

  if (!user) {
    if (userEmail) {
      user = await User.findOne({ email: userEmail });
      if (user) {
        user.apple_id = appleId;
        await user.save();
      }
    }
  }

  if (!user) {
    if (!userEmail) throw new Error('Email required for new Apple Sign-In users');

    // Name from userObj if available
    const name = (userObj && userObj.name) ? (userObj.name.firstName + ' ' + userObj.name.lastName) : 'AppleUser';

    user = await User.create({
      username: name.replace(/\s+/g, '').toLowerCase() + Math.random().toString(36).slice(-4),
      email: userEmail,
      password_hash: await import('bcryptjs').then(b => b.hash(Math.random().toString(36), 10)),
      apple_id: appleId,
      is_verified: true,
      verification_source: 'APPLE'
    });
  }

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    token: generateToken(user._id),
    role: user.role,
    avatar: user.avatar
  };
};

module.exports = {
  registerUser,
  loginUser,
  loginWithGoogle,
  loginWithFacebook,
  loginWithApple,
  sendEmailChangeOTP,
  verifyEmailChangeOTP,
};
