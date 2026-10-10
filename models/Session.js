const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  ipType: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  accuracy: { type: Number },
  locationSource: { type: String, default: 'unknown' },
  mapsUrl: { type: String },
  ipLatitude: { type: Number },
  ipLongitude: { type: Number },
  address: { type: String },
  country: { type: String },
  city: { type: String },
  isp: { type: String },
  asn: { type: String },
  timezone: { type: String },
  os: { type: String },
  browser: { type: String },
  screenResolution: { type: String },
  language: { type: String },
  userAgent: { type: String },
  sessionTime: { type: String },
  savedAt: { type: Date, default: Date.now }
}, {
  collection: 'sessions',
  timestamps: true
});

module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema);
