exports.getLobby = (req, res) => {
    res.render('lobby');
  };
  
  exports.validateMeeting = async (req, res, next) => {
    try {
      const meeting = await Meeting.findOne({ roomId: req.params.roomId });
      if (!meeting) {
        return res.status(404).send('Meeting not found');
      }
      next();
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  };