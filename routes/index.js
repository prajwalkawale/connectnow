const express = require('express');
const router = express.Router();
const { createRoom, joinRoom, renderRoom } = require('../controllers/roomController');

router.get('/', (req, res) => res.render('lobby'));
router.get('/new-meeting', createRoom);
router.post('/join', joinRoom);
router.get('/room/:roomId', renderRoom);

module.exports = router;