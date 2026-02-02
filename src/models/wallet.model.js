const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  wallet_account_no: {
    type: String,
    required: true,
    unique: true,
  },
  wallet_account_no_hash: {
    type: String,
    unique: true,
    sparse: true // Allow nulls for existing records until migration
  },
  wallet_pin_hash: {
    type: String,
    required: true,
  },
  available_balance: {
    type: String,
    default: '0',
  },
  locked_balance: {
    type: String,
    default: '0',
  },
  withdrawable_balance: {
    type: String,
    default: '0',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Wallet', WalletSchema);
