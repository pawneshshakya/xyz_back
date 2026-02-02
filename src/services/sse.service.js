let clients = {}; // { matchId: [res, res, ...] }

const addClient = (matchId, res) => {
  if (!clients[matchId]) {
    clients[matchId] = [];
  }
  clients[matchId].push(res);

  // Remove client on close
  res.on('close', () => {
    clients[matchId] = clients[matchId].filter(c => c !== res);
  });
};

const notifyMatchUpdate = (matchId, data) => {
  if (clients[matchId]) {
    clients[matchId].forEach(res => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
};

module.exports = {
  addClient,
  notifyMatchUpdate,
};
