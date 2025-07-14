const Withdrawal = require('../models/withdraw');
const User = require('../models/User');

exports.withdrawCoins = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const { amount, walletAddress } = req.body;

    if (!amount || !walletAddress) {
      return res.status(400).json({ message: 'Amount and wallet address required' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < 4000) {
      return res.status(400).json({ message: 'You must have at least 4000 balance to withdraw.' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    user.balance -= amount;
    await user.save();

    const withdrawal = await Withdrawal.create({
      user: user._id,
      amount,
      walletAddress,
      status: 'pending'
    });

    res.status(201).json({ message: 'Withdrawal requested', withdrawal });
  } catch (error) {
    console.error('Withdraw coins error:', error.message);
    res.status(500).json({ message: 'Error processing withdrawal', error: error.message });
  }
};

exports.getWithdrawalHistory = async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? {} : { user: req.user._id };
  const history = await Withdrawal.find(filter).populate('user', 'email');
  res.json(history);
};

exports.getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({})
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({
      transactions: withdrawals.map(w => ({
        date: w.createdAt.toISOString().split('T')[0],
        amount: w.amount,
        userName: w.user ? w.user.name : null,
        status: w.status
      }))
    });
  } catch (error) {
    console.error('Get withdrawals error:', error.message);
    res.status(500).json({ message: 'Error fetching withdrawals', error: error.message });
  }
};