const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAW', 'LOCK', 'UNLOCK', 'GIFT_SENT', 'GIFT_RECEIVED', 'REDEEM', 'ENTRY_FEE', 'PRIZE_WON'],
    required: true,
  },
  category: {
    type: String,
    enum: ['WALLET', 'GAME', 'GIFT', 'REFUND'],
    default: 'WALLET',
  },
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'SUCCESS',
  },
  description: {
    type: String,
  },
  order_id: {
    type: String,
  },
  payment_id: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', TransactionSchema);
