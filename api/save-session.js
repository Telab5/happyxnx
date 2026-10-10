const { connectDB } = require('../lib/mongodb');
const Session = require('../models/Session');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const {
      ip,
      ipType,
      latitude,
      longitude,
      accuracy,
      locationSource,
      mapsUrl,
      ipLatitude,
      ipLongitude,
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
    } = req.body;

    if (!ip) {
      return res.status(400).json({ success: false, error: 'IP address is required.' });
    }

    const lat = latitude != null && !isNaN(Number(latitude)) ? Number(latitude) : null;
    const lng = longitude != null && !isNaN(Number(longitude)) ? Number(longitude) : null;
    const computedMapsUrl = mapsUrl || (lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null);

    const newSession = new Session({
      ip,
      ipType,
      latitude: lat,
      longitude: lng,
      accuracy: accuracy != null && !isNaN(Number(accuracy)) ? Number(accuracy) : null,
      locationSource: locationSource || 'ip',
      mapsUrl: computedMapsUrl,
      ipLatitude: ipLatitude != null && !isNaN(Number(ipLatitude)) ? Number(ipLatitude) : null,
      ipLongitude: ipLongitude != null && !isNaN(Number(ipLongitude)) ? Number(ipLongitude) : null,
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
    });

    const savedDoc = await newSession.save();
    console.log(`[SAVED] Session for IP: ${ip} | Location: (${lat}, ${lng}) (ID: ${savedDoc._id})`);

    return res.status(201).json({
      success: true,
      message: 'Session data successfully saved to MongoDB',
      id: savedDoc._id,
      savedAt: savedDoc.savedAt
    });
  } catch (error) {
    console.error('Error saving session:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
