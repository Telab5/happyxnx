# Public IP & Session Inspector with MongoDB Storage

A web application built with HTML, CSS, JavaScript, and Node.js (Express + Mongoose) that detects the user's public IP address, geographic coordinates (`latitude` and `longitude`), network details, and client session properties, and saves them directly into MongoDB Atlas.

## Database Configuration
- **Database**: `3rs`
- **Collection**: `sessions`
- **Connection URI**: Configured in [`.env`](file:///C:/Users/Telb/Desktop/New%20folder%20%287%29/.env)

### Saved Data Schema
Each session entry stored in MongoDB contains:
- `ip`: Public IP address (IPv4 / IPv6)
- `ipType`: IP protocol version (`IPv4` or `IPv6`)
- `latitude`: High-precision latitude (from device GPS/browser if granted, or IP fallback)
- `longitude`: High-precision longitude (from device GPS/browser if granted, or IP fallback)
- `accuracy`: Location accuracy radius in meters (`±m`)
- `locationSource`: Source of coordinates (`device` for GPS or `ip` for ISP fallback)
- `mapsUrl`: Direct Google Maps link (`https://www.google.com/maps?q={lat},{lng}`)
- `ipLatitude`: Approximate IP-based latitude
- `ipLongitude`: Approximate IP-based longitude
- `country`: Country name with flag
- `city`: City and postal code
- `isp`: Internet Service Provider
- `asn`: Autonomous System Number and Organization
- `timezone`: Timezone identifier and UTC offset
- `os`: Operating System (Windows, macOS, Linux, Android, iOS)
- `browser`: Browser name (Chrome, Edge, Firefox, Safari, etc.)
- `screenResolution`: Screen dimensions and device pixel ratio
- `language`: Browser language setting
- `userAgent`: Complete browser user agent string
- `sessionTime`: ISO timestamp of the session
- `savedAt`: MongoDB creation timestamp

---

## Quick Start

1. **Install dependencies** (already installed in workspace):
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Open the application**:
   Visit [http://localhost:3000](http://localhost:3000) in your web browser.

---

## API Endpoints

- `POST /api/save-session`: Saves session data payload into MongoDB.
- `GET /api/sessions?limit=20`: Retrieves the latest saved session documents for inspection.
