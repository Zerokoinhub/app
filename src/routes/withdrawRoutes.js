const express = require('express');
const router = express.Router();
const { withdrawCoins, getWithdrawalHistory, getWithdrawals } = require('../controllers/withdrawController');
const auth = require('../middleware/auth');  

router.post('/withdraw-coins', auth, withdrawCoins);
router.get('/withdrawal-history', auth, getWithdrawalHistory);
router.get('/transactions', getWithdrawals);

module.exports = router;