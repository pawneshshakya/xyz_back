const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/my', protect, walletController.getMyWallet);
router.get('/last-deposit-source', protect, walletController.getLastDepositSource);
router.post('/initialize', protect, walletController.initializeWallet);
router.post('/deposit', protect, walletController.deposit); // Stub
router.post('/withdraw', protect, walletController.withdraw); // Stub
router.post('/request-pin-reset', protect, walletController.requestPinReset);
router.post('/verify-pin-otp', protect, walletController.verifyPinOtp);
router.post('/reset-pin', protect, walletController.resetPin);

// Payment routes
router.post('/add-cash/initiate', protect, walletController.initiateAddCash);
router.post('/add-cash/verify', protect, walletController.verifyAddCash);

// New routes
router.get('/transactions', protect, walletController.getTransactions);
router.post('/transactions/record', protect, walletController.createTransaction);
router.post('/verify-receiver', protect, walletController.verifyReceiver);
router.post('/send-gift', protect, walletController.sendGift);
router.post('/redeem', protect, walletController.redeem);

module.exports = router;
