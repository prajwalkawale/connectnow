const generateId = () => {
  const segment = () => Math.random().toString(36).slice(2, 6); // Generate a 4-letter segment
  return `${segment()}-${segment()}-${segment()}`;
};

exports.createRoom = (req, res) => {
  const roomId = generateId();
  res.redirect(`/room/${roomId}`);
};

exports.joinRoom = (req, res) => {
  const { code } = req.body;
  res.redirect(`/room/${code}`);
};

exports.renderRoom = (req, res) => {
  const { roomId } = req.params;
  res.render('conference', { roomId });
};