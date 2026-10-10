const { connectDB } = require('../lib/mongodb');
const Session = require('../models/Session');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await connectDB();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const sessions = await Session.find().sort({ createdAt: -1 }).limit(limit);
    return res.json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    console.error('Error retrieving sessions:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
