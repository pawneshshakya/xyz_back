const walletService = require('../services/wallet.service');
const paymentService = require('../services/payment.service');
const STATUS_CODES = require('../utils/statusCodes');

const getMyWallet = async (req, res) => {
    try {
        const wallet = await walletService.getBalance(req.user.id);
        res.json({ success: true, data: wallet });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const initiateAddCash = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount < 1) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid amount' });
        }

        const orderData = await paymentService.createOrder(
            req.user.id,
            amount,
            req.user.mobile, // Assuming user model has mobile
            req.user.email
        );

        res.json({ success: true, data: orderData });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const verifyAddCash = async (req, res) => {
    try {
        const { orderId } = req.body;
        const verification = await paymentService.verifyOrder(orderId);

        if (verification.success) {
            // Credit the wallet
            const wallet = await walletService.deposit(req.user.id, verification.amount);
            res.json({ success: true, message: 'Payment successful', data: wallet });
        } else {
            res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const deposit = async (req, res) => {
    try {
        const { amount } = req.body;
        const wallet = await walletService.deposit(req.user.id, amount);
        res.json({ success: true, data: wallet });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const withdraw = async (req, res) => {
    try {
        const { amount, method, details } = req.body;
        if (!amount || amount < 1) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid amount' });
        }
        if (!method || !details) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Missing payment method or details' });
        }
        const wallet = await walletService.withdraw(req.user.id, amount, method, details);
        res.json({ success: true, data: wallet });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const requestPinReset = async (req, res) => {
    try {
        const result = await walletService.requestPinReset(req.user.id);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const verifyPinOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const result = await walletService.verifyPinOtp(req.user.id, otp);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const resetPin = async (req, res) => {
    try {
        const { otp, newPin } = req.body;
        const result = await walletService.resetPin(req.user.id, otp, newPin);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};


const initializeWallet = async (req, res) => {
    try {
        const { pin, confirmPin } = req.body;

        // Validate PIN format
        if (!pin || !confirmPin) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'PIN and Confirm PIN are required' });
        }

        if (pin !== confirmPin) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'PINs do not match' });
        }

        if (pin.length !== 6 || !/^\d+$/.test(pin)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'PIN must be exactly 6 digits' });
        }

        // Check if wallet already exists
        const existingWallet = await walletService.getBalance(req.user.id);
        if (existingWallet) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Wallet already initialized' });
        }

        const wallet = await walletService.createWallet(req.user.id, pin);
        res.status(STATUS_CODES.CREATED).json({
            success: true,
            data: {
                wallet_account_no: wallet.wallet_account_no,
                available_balance: wallet.available_balance
            }
        });
    } catch (error) {
        console.error('Wallet initialization error:', error);
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const getTransactions = async (req, res) => {
    try {
        const transactions = await walletService.getTransactionHistory(req.user.id);
        res.json({ success: true, data: transactions });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const getLastDepositSource = async (req, res) => {
    try {
        const source = await walletService.getLastDepositSource(req.user.id);
        res.json({ success: true, data: source });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const verifyReceiver = async (req, res) => {
    try {
        const { accountNo } = req.body;
        if (!accountNo) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Account number is required' });
        }

        const owner = await walletService.getWalletOwner(accountNo);
        if (!owner) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Wallet not found' });
        }
        res.json({ success: true, data: owner });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const sendGift = async (req, res) => {
    try {
        const { receiverAccountNo, amount, pin } = req.body;
        if (!receiverAccountNo || !amount || !pin) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Missing required fields' });
        }
        const wallet = await walletService.sendGift(req.user.id, receiverAccountNo, amount, pin);
        res.json({ success: true, message: 'Gift sent successfully!', data: wallet });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const redeem = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount < 1) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid amount' });
        }
        const wallet = await walletService.redeem(req.user.id, amount);
        res.json({ success: true, message: 'Redeemed successfully!', data: wallet });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

const createTransaction = async (req, res) => {
    try {
        const transaction = await walletService.recordTransaction({
            ...req.body,
            user_id: req.user.id
        });
        res.status(STATUS_CODES.CREATED).json({ success: true, data: transaction });
    } catch (error) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

module.exports = {
    getMyWallet,
    initiateAddCash,
    verifyAddCash,
    requestPinReset,
    verifyPinOtp,
    resetPin,
    initializeWallet,
    getTransactions,
    sendGift,
    redeem,
    deposit,
    withdraw,
    createTransaction,
    getLastDepositSource,
    verifyReceiver
};
