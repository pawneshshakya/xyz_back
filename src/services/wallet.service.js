const crypto = require('crypto');
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const { encrypt, decrypt } = require('../utils/encryption');
const emailService = require('./email.service');

// Helper to format wallet for response (decrypts fields)
const formatWallet = (wallet) => {
    if (!wallet) return null;
    // Handle both mongoose document and plain object
    const walletObj = wallet.toObject ? wallet.toObject() : wallet;

    // Safely decrypt numeric fields
    const safeDecryptNumber = (val) => {
        const decrypted = decrypt(val);
        return isNaN(Number(decrypted)) ? 0 : Number(decrypted);
    };

    return {
        ...walletObj,
        wallet_account_no: decrypt(walletObj.wallet_account_no),
        available_balance: safeDecryptNumber(walletObj.available_balance),
        locked_balance: safeDecryptNumber(walletObj.locked_balance),
        withdrawable_balance: safeDecryptNumber(walletObj.withdrawable_balance),
    };
};

const createWallet = async (userId, walletPassword) => {
    // Generate unique 10-digit wallet account number
    const randomDigits = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    const walletAccountNo = '1' + randomDigits; // Ensures 10 digits starting with 1

    const salt = await bcrypt.genSalt(10);
    const walletPinHash = await bcrypt.hash(walletPassword, salt);

    // Encrypt initial values
    const encryptedDetails = {
        user_id: userId,
        wallet_account_no: encrypt(walletAccountNo),
        wallet_account_no_hash: crypto.createHash('sha256').update(walletAccountNo).digest('hex'),
        wallet_pin_hash: walletPinHash,
        available_balance: encrypt('0'),
        locked_balance: encrypt('0'),
        withdrawable_balance: encrypt('0')
    };

    const wallet = await Wallet.create(encryptedDetails);

    // Update user's wallet initialization status
    await User.findByIdAndUpdate(userId, { is_wallet_initialized: true });

    return formatWallet(wallet);
};

const getBalance = async (userId) => {
    const wallet = await Wallet.findOne({ user_id: userId });
    return formatWallet(wallet);
};

const lockFunds = async (userId, amount, matchId = null) => {
    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) throw new Error('Wallet not found');

    let currentAvailable = Number(decrypt(wallet.available_balance));
    let currentLocked = Number(decrypt(wallet.locked_balance));

    if (currentAvailable < amount) throw new Error('Insufficient funds');

    currentAvailable -= amount;
    currentLocked += amount;

    wallet.available_balance = encrypt(currentAvailable.toString());
    wallet.locked_balance = encrypt(currentLocked.toString());
    await wallet.save();

    await Transaction.create({
        user_id: userId,
        amount: amount,
        type: 'LOCK',
        category: 'GAME',
        match_id: matchId,
        status: 'SUCCESS',
        description: `Locked entry fee for match join`
    });

    return formatWallet(wallet);
};

const unlockFunds = async (userId, amount, matchId = null, reason = 'Join expired') => {
    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) throw new Error('Wallet not found');

    let currentAvailable = Number(decrypt(wallet.available_balance));
    let currentLocked = Number(decrypt(wallet.locked_balance));

    if (currentLocked < amount) throw new Error('Insufficient locked funds');

    currentLocked -= amount;
    currentAvailable += amount;

    wallet.available_balance = encrypt(currentAvailable.toString());
    wallet.locked_balance = encrypt(currentLocked.toString());
    await wallet.save();

    await Transaction.create({
        user_id: userId,
        amount: amount,
        type: 'UNLOCK',
        category: 'GAME',
        match_id: matchId,
        status: 'SUCCESS',
        description: `Unlock funds: ${reason}`
    });

    return formatWallet(wallet);
};

const deposit = async (userId, amount, orderId = null, paymentId = null) => {
    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) throw new Error('Wallet not found');

    let currentAvailable = Number(decrypt(wallet.available_balance));
    currentAvailable += Number(amount);

    wallet.available_balance = encrypt(currentAvailable.toString());
    await wallet.save();

    await Transaction.create({
        user_id: userId,
        amount: Number(amount),
        type: 'DEPOSIT',
        category: 'WALLET',
        status: 'SUCCESS',
        order_id: orderId,
        payment_id: paymentId,
        description: 'Cash added to wallet'
    });

    return formatWallet(wallet);
};

const withdraw = async (userId, amount, method, details) => {
    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) throw new Error('Wallet not found');

    let currentWithdrawable = Number(decrypt(wallet.withdrawable_balance));
    let currentAvailable = Number(decrypt(wallet.available_balance));

    if (currentWithdrawable < amount) throw new Error('Insufficient withdrawable funds');

    currentWithdrawable -= Number(amount);
    currentAvailable -= Number(amount); // Withdrawal must reduce total available as well

    wallet.withdrawable_balance = encrypt(currentWithdrawable.toString());
    wallet.available_balance = encrypt(currentAvailable.toString());

    await wallet.save();

    await Transaction.create({
        user_id: userId,
        amount: Number(amount),
        type: 'WITHDRAW',
        category: 'WALLET',
        status: 'PENDING', // Usually pending until payout success
        description: `Withdrawal request via ${method}`,
        metadata: {
            method,
            details
        }
    });

    return formatWallet(wallet);
};

const deductEntryFee = async (userId, amount, matchId) => {
    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) throw new Error('Wallet not found');

    let currentLocked = Number(decrypt(wallet.locked_balance));
    if (currentLocked < amount) throw new Error('Insufficient locked funds for entry fee');

    currentLocked -= Number(amount);
    wallet.locked_balance = encrypt(currentLocked.toString());
    await wallet.save();

    await Transaction.create({
        user_id: userId,
        amount: Number(amount),
        type: 'ENTRY_FEE',
        category: 'GAME',
        match_id: matchId,
        status: 'SUCCESS',
        description: 'Match entry fee confirmed'
    });

    return formatWallet(wallet);
};

const awardPrize = async (userId, amount, matchId) => {
    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) throw new Error('Wallet not found');

    let currentWithdrawable = Number(decrypt(wallet.withdrawable_balance));
    let currentAvailable = Number(decrypt(wallet.available_balance));

    currentWithdrawable += Number(amount);
    currentAvailable += Number(amount);

    wallet.withdrawable_balance = encrypt(currentWithdrawable.toString());
    wallet.available_balance = encrypt(currentAvailable.toString());
    await wallet.save();

    await Transaction.create({
        user_id: userId,
        amount: Number(amount),
        type: 'PRIZE_WON',
        category: 'GAME',
        match_id: matchId,
        status: 'SUCCESS',
        description: 'Prize won for match'
    });

    return formatWallet(wallet);
};

const requestPinReset = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    user.reset_pin_otp = otp;
    user.reset_pin_expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // console.log(`[EMAIL MOCK] Sending OTP ${otp} to ${user.email}`);
    await emailService.sendEmail({
        to: user.email,
        subject: 'Wallet PIN Reset OTP',
        text: `Your OTP for resetting your wallet PIN is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your OTP for resetting your wallet PIN is <b>${otp}</b>. It expires in 10 minutes.</p>`
    });
    return { message: 'OTP sent to registered email' };
};

const verifyPinOtp = async (userId, otp) => {
    const user = await User.findById(userId);
    // Verify OTP with trimming and string conversion
    const normalizedOtp = String(otp).trim();
    const storedOtp = String(user.reset_pin_otp).trim();

    if (!user || !user.reset_pin_otp || storedOtp !== normalizedOtp) {
        throw new Error('Invalid OTP');
    }

    if (user.reset_pin_expires < Date.now()) {
        throw new Error('OTP has expired');
    }

    return { success: true };
};

const resetPin = async (userId, otp, newPin) => {
    await verifyPinOtp(userId, otp);

    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) throw new Error('Wallet not found');

    const salt = await bcrypt.genSalt(10);
    const walletPinHash = await bcrypt.hash(newPin, salt);

    wallet.wallet_pin_hash = walletPinHash;
    await wallet.save();

    // Clear OTP
    const user = await User.findById(userId);
    user.reset_pin_otp = undefined;
    user.reset_pin_expires = undefined;
    await user.save();

    return { success: true, message: 'Wallet PIN reset successfully' };
};

const recordTransaction = async (data) => {
    return await Transaction.create(data);
};

const sendGift = async (senderId, receiverAccountNo, amount, pin) => {
    const sender = await Wallet.findOne({ user_id: senderId });
    if (!sender) throw new Error('Sender wallet not found');

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, sender.wallet_pin_hash);
    if (!isPinValid) throw new Error('Invalid Wallet PIN');

    const receiverHash = crypto.createHash('sha256').update(String(receiverAccountNo)).digest('hex');
    const receiver = await Wallet.findOne({ wallet_account_no_hash: receiverHash });
    if (!receiver) throw new Error('Receiver wallet not found');

    if (senderId.toString() === receiver.user_id.toString()) {
        throw new Error('Cannot send gift to your own wallet');
    }

    // Decrypt and Update Sender
    let senderAvailable = Number(decrypt(sender.available_balance));
    if (senderAvailable < amount) throw new Error('Insufficient funds');

    senderAvailable -= Number(amount);
    sender.available_balance = encrypt(senderAvailable.toString());

    // Decrypt and Update Receiver
    let receiverAvailable = Number(decrypt(receiver.available_balance));
    receiverAvailable += Number(amount);
    receiver.available_balance = encrypt(receiverAvailable.toString());

    await sender.save();
    await receiver.save();

    // Record Transactions
    await Transaction.create([
        {
            user_id: senderId,
            amount: Number(amount),
            type: 'GIFT_SENT',
            category: 'GIFT',
            status: 'SUCCESS',
            description: `Sent gift to ${receiverAccountNo}`
        },
        {
            user_id: receiver.user_id,
            amount: Number(amount),
            type: 'GIFT_RECEIVED',
            category: 'GIFT',
            status: 'SUCCESS',
            description: `Received gift from sender`
        }
    ]);

    return formatWallet(sender);
};

const redeem = async (userId, amount) => {
    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) throw new Error('Wallet not found');

    let currentAvailable = Number(decrypt(wallet.available_balance));
    if (currentAvailable < amount) throw new Error('Insufficient funds for redemption');

    currentAvailable -= Number(amount);
    wallet.available_balance = encrypt(currentAvailable.toString());
    await wallet.save();

    // Record Transaction
    await Transaction.create({
        user_id: userId,
        amount: Number(amount),
        type: 'REDEEM',
        category: 'WALLET',
        status: 'SUCCESS',
        description: 'Redeemed wallet balance'
    });

    return formatWallet(wallet);
};

const getTransactionHistory = async (userId) => {
    return await Transaction.find({ user_id: userId }).sort({ createdAt: -1 });
};

const getLastDepositSource = async (userId) => {
    const lastDeposit = await Transaction.findOne({
        user_id: userId,
        type: 'DEPOSIT',
        status: 'SUCCESS'
    }).sort({ createdAt: -1 });

    // Mock data if no payment method recorded, or extract from metadata
    // For MVP, we'll try to guess based on 'order_id' or return a generic "Source Account"
    if (lastDeposit) {
        return {
            source: 'Original Payment Method',
            details: lastDeposit.payment_id ? `Ref: ${lastDeposit.payment_id.slice(-4)}` : 'Linked Account'
        };
    }
    return null;
};

const getWalletOwner = async (accountNo) => {
    const accountHash = crypto.createHash('sha256').update(String(accountNo)).digest('hex');

    // First try finding by hash
    let wallet = await Wallet.findOne({ wallet_account_no_hash: accountHash });

    // Fallback: If not found, it might be an old record without hash. 
    // Triggers self-healing migration for ALL wallets to ensure consistency.
    if (!wallet) {
        await migrateWalletHashes();
        wallet = await Wallet.findOne({ wallet_account_no_hash: accountHash });
    }

    if (!wallet) return null;

    const user = await User.findById(wallet.user_id);
    if (!user) return null;

    return {
        username: user.username,
        is_verified: true
    };
};

const migrateWalletHashes = async () => {
    const wallets = await Wallet.find({ wallet_account_no_hash: { $exists: false } });
    for (const w of wallets) {
        try {
            const decalaredAccountNo = decrypt(w.wallet_account_no);
            if (decalaredAccountNo) {
                w.wallet_account_no_hash = crypto.createHash('sha256').update(String(decalaredAccountNo)).digest('hex');
                await w.save();
            }
        } catch (e) {
            console.error('Failed to migrate wallet', w._id, e);
        }
    }
};

module.exports = {
    createWallet,
    getBalance,
    lockFunds,
    unlockFunds,
    deposit,
    withdraw,
    deductEntryFee,
    awardPrize,
    requestPinReset,
    verifyPinOtp,
    resetPin,
    sendGift,
    redeem,
    getTransactionHistory,
    getLastDepositSource,
    recordTransaction,
    getWalletOwner,
    migrateWalletHashes
};
