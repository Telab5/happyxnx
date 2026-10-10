// State
let currentIP = '';
let currentSessionId = null;
let latestIPData = null;
let latestDeviceLocation = null;
let locationWatchId = null;

// DOM Elements
const ipText = document.getElementById('ipText');
const ipSkeleton = document.getElementById('ipSkeleton');
const ipTypeBadge = document.getElementById('ipTypeBadge');
const mongoBadge = document.getElementById('mongoBadge');
const mongoStatusText = document.getElementById('mongoStatusText');
const copyBtn = document.getElementById('copyBtn');
const copyBtnText = document.getElementById('copyBtnText');
const copySuccessMsg = document.getElementById('copySuccessMsg');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = refreshBtn ? refreshBtn.querySelector('.spin-icon') : null;
const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const locateBtn = document.getElementById('locateBtn');

// Location Prompt Banner
const locationPromptBanner = document.getElementById('locationPromptBanner');
const allowLocationBtn = document.getElementById('allowLocationBtn');
const bannerDescText = document.getElementById('bannerDescText');

// Device Location elements
const deviceLatVal = document.getElementById('deviceLatVal');
const deviceLngVal = document.getElementById('deviceLngVal');
const deviceAccVal = document.getElementById('deviceAccVal');
const deviceAddressVal = document.getElementById('deviceAddressVal');
const deviceSourceVal = document.getElementById('deviceSourceVal');
const mapsVal = document.getElementById('mapsVal');

// Network & Geo elements
const locationVal = document.getElementById('locationVal');
const cityVal = document.getElementById('cityVal');
const ispVal = document.getElementById('ispVal');
const asnVal = document.getElementById('asnVal');
const coordsVal = document.getElementById('coordsVal');
const timezoneVal = document.getElementById('timezoneVal');

// Session elements
const sessionTimeVal = document.getElementById('sessionTimeVal');
const osVal = document.getElementById('osVal');
const browserVal = document.getElementById('browserVal');
const screenVal = document.getElementById('screenVal');
const langVal = document.getElementById('langVal');
const uaVal = document.getElementById('uaVal');

/**
 * Initialize client session details
 */
function initSessionDetails() {
  const now = new Date();
  sessionTimeVal.textContent = now.toLocaleTimeString() + ' (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')';
  screenVal.textContent = `${window.screen.width} × ${window.screen.height} (${window.devicePixelRatio}x)`;
  langVal.textContent = navigator.language || 'Unknown';

  const ua = navigator.userAgent;
  uaVal.textContent = ua;
  osVal.textContent = detectOS(ua);
  browserVal.textContent = detectBrowser(ua);
}

function detectOS(ua) {
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('like Mac') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown OS';
}

function detectBrowser(ua) {
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Google Chrome';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Apple Safari';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  return 'Modern Browser';
}

/**
 * Check Browser Geolocation Permissions
 */
async function checkLocationPermissions() {
  if (!navigator.permissions || !navigator.permissions.query) {
    if (locationPromptBanner) locationPromptBanner.classList.remove('hidden');
    return;
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    handlePermissionStatus(result.state);

    result.onchange = () => {
      handlePermissionStatus(result.state);
      if (result.state === 'granted') {
        requestDeviceLocation(false);
      }
    };
  } catch (err) {
    if (locationPromptBanner) locationPromptBanner.classList.remove('hidden');
  }
}

function handlePermissionStatus(state) {
  if (!locationPromptBanner) return;

  if (state === 'granted') {
    locationPromptBanner.classList.add('hidden');
  } else if (state === 'prompt') {
    locationPromptBanner.classList.remove('hidden');
    bannerDescText.textContent = 'Please tap "Allow Location" so your exact coordinates can be saved in MongoDB.';
    allowLocationBtn.textContent = 'Allow Location';
    allowLocationBtn.disabled = false;
  } else if (state === 'denied') {
    locationPromptBanner.classList.remove('hidden');
    bannerDescText.textContent = 'Location is blocked in browser settings. Click the lock/tune icon in the URL bar to enable.';
    allowLocationBtn.textContent = 'Permission Blocked';
    allowLocationBtn.disabled = true;
  }
}

/**
 * Reverse Geocode coordinates to friendly neighborhood/city address
 */
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    if (!res.ok) return null;
    const data = await res.json();
    const parts = [
      data.locality,
      data.city,
      data.principalSubdivision,
      data.countryName
    ].filter(Boolean);
    return parts.join(', ');
  } catch (err) {
    console.warn('Reverse geocoding failed:', err);
    return null;
  }
}

/**
 * Request real device GPS / Browser Location via HTML5 Geolocation
 */
function requestDeviceLocation(isManual = false) {
  if (!navigator.geolocation) {
    applyLocationFallback('Geolocation not supported by this browser');
    persistDataToMongo();
    return;
  }

  if (isManual) {
    deviceLatVal.innerHTML = '<span class="skeleton skeleton-text"></span>';
    deviceLngVal.innerHTML = '<span class="skeleton skeleton-text"></span>';
    deviceAccVal.innerHTML = '<span class="skeleton skeleton-text"></span>';
    deviceAddressVal.innerHTML = '<span class="skeleton skeleton-text"></span>';
    deviceSourceVal.textContent = 'Requesting GPS...';
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const acc = position.coords.accuracy;

      latestDeviceLocation = {
        latitude: lat,
        longitude: lng,
        accuracy: Math.round(acc),
        source: 'device'
      };

      deviceLatVal.textContent = lat.toFixed(6);
      deviceLngVal.textContent = lng.toFixed(6);
      deviceAccVal.textContent = `±${Math.round(acc)} meters`;
      deviceSourceVal.innerHTML = '<span style="color:#34d399;font-weight:600;">GPS / Exact Device</span>';
      mapsVal.innerHTML = `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="maps-link">Open in Maps &nearr;</a>`;

      if (locationPromptBanner) {
        locationPromptBanner.classList.add('hidden');
      }

      // Reverse geocode to address
      const address = await reverseGeocode(lat, lng);
      if (address) {
        latestDeviceLocation.address = address;
        deviceAddressVal.textContent = address;
      } else {
        deviceAddressVal.textContent = 'Exact coordinates acquired';
      }

      console.log(`[GEOLOCATION] Device Location acquired: ${lat}, ${lng} (±${Math.round(acc)}m)`);
      persistDataToMongo();
    },
    (error) => {
      let reason = 'Denied by user';
      if (error.code === error.POSITION_UNAVAILABLE) reason = 'GPS unavailable';
      else if (error.code === error.TIMEOUT) reason = 'GPS timeout';

      console.warn(`[GEOLOCATION] Device location failed (${reason}), using IP approximation`);
      applyLocationFallback(reason);
      persistDataToMongo();
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    }
  );
}

/**
 * Fallback to IP coordinates if GPS is unavailable or blocked
 */
function applyLocationFallback(reason) {
  if (latestIPData && latestIPData.latitude != null && latestIPData.longitude != null) {
    const ipLat = Number(latestIPData.latitude);
    const ipLng = Number(latestIPData.longitude);

    deviceLatVal.textContent = `${ipLat.toFixed(4)} (IP approx)`;
    deviceLngVal.textContent = `${ipLng.toFixed(4)} (IP approx)`;
    deviceAccVal.textContent = 'Approximate (City level)';
    deviceAddressVal.textContent = latestIPData.city ? `${latestIPData.city}, ${latestIPData.country}` : 'IP based estimate';
    deviceSourceVal.innerHTML = `<span style="color:#fbbf24;" title="${reason}">IP Geolocation (${reason})</span>`;
    mapsVal.innerHTML = `<a href="https://www.google.com/maps?q=${ipLat},${ipLng}" target="_blank" rel="noopener noreferrer" class="maps-link">Open in Maps &nearr;</a>`;
  } else {
    deviceLatVal.textContent = 'Unavailable';
    deviceLngVal.textContent = 'Unavailable';
    deviceAccVal.textContent = 'N/A';
    deviceAddressVal.textContent = 'N/A';
    deviceSourceVal.textContent = reason;
    mapsVal.textContent = 'N/A';
  }
}

/**
 * Persist combined Session, IP, and Location data to MongoDB
 */
async function persistDataToMongo() {
  if (!latestIPData && !currentIP) return;
  if (!mongoBadge || !mongoStatusText) return;

  mongoBadge.className = 'badge badge-mongo saving';
  mongoStatusText.textContent = 'MongoDB: Saving...';

  // Prefer exact device GPS over IP approximation
  const isDevice = latestDeviceLocation != null;
  const activeLat = isDevice ? latestDeviceLocation.latitude : (latestIPData ? latestIPData.latitude : null);
  const activeLng = isDevice ? latestDeviceLocation.longitude : (latestIPData ? latestIPData.longitude : null);
  const activeAccuracy = isDevice ? latestDeviceLocation.accuracy : null;
  const activeSource = isDevice ? 'device' : 'ip';
  const activeAddress = isDevice ? latestDeviceLocation.address : (latestIPData ? `${latestIPData.city || ''}, ${latestIPData.country || ''}` : null);

  const apiEndpoint = window.location.protocol === 'file:' 
    ? 'http://localhost:3000/api/save-session' 
    : '/api/save-session';

  const payload = {
    sessionId: currentSessionId,
    ip: currentIP,
    ipType: latestIPData ? latestIPData.type : (currentIP.includes(':') ? 'IPv6' : 'IPv4'),
    latitude: activeLat != null ? Number(activeLat) : null,
    longitude: activeLng != null ? Number(activeLng) : null,
    accuracy: activeAccuracy,
    locationSource: activeSource,
    mapsUrl: (activeLat != null && activeLng != null) ? `https://www.google.com/maps?q=${activeLat},${activeLng}` : null,
    address: activeAddress,
    ipLatitude: latestIPData ? Number(latestIPData.latitude) : null,
    ipLongitude: latestIPData ? Number(latestIPData.longitude) : null,
    country: latestIPData ? latestIPData.country : 'N/A',
    city: latestIPData ? latestIPData.city : 'N/A',
    isp: latestIPData ? latestIPData.isp : 'N/A',
    asn: latestIPData ? latestIPData.asn : 'N/A',
    timezone: latestIPData ? latestIPData.timezone : 'N/A',
    os: osVal.textContent || detectOS(navigator.userAgent),
    browser: browserVal.textContent || detectBrowser(navigator.userAgent),
    screenResolution: screenVal.textContent || `${window.screen.width} × ${window.screen.height}`,
    language: navigator.language || 'Unknown',
    userAgent: navigator.userAgent,
    sessionTime: new Date().toISOString()
  };

  try {
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (res.ok && result.success) {
      currentSessionId = result.id;
      mongoBadge.className = 'badge badge-mongo';
      mongoStatusText.textContent = `MongoDB: Saved ✓ (${activeSource.toUpperCase()})`;
      console.log(`MongoDB ${result.isUpdate ? 'updated' : 'saved'} successfully, ID:`, result.id);
    } else {
      throw new Error(result.error || 'Server error saving session');
    }
  } catch (err) {
    console.error('Failed to save to MongoDB:', err);
    mongoBadge.className = 'badge badge-mongo error';
    mongoStatusText.textContent = 'MongoDB: Offline / Error';
  }
}

/**
 * Fetch Public IP using robust fallback mechanism
 */
async function fetchPublicIP() {
  setLoadingState(true);
  hideError();

  try {
    const res = await fetch('https://ipwho.is/', { cache: 'no-cache' });
    if (!res.ok) throw new Error('ipwho.is failed');
    const data = await res.json();

    if (data.success === false) {
      throw new Error(data.message || 'Lookup unsuccessful');
    }

    latestIPData = {
      ip: data.ip,
      type: data.type || (data.ip.includes(':') ? 'IPv6' : 'IPv4'),
      country: `${data.country} ${data.flag ? data.flag.emoji : ''}`.trim(),
      city: `${data.city || 'N/A'}${data.postal ? ` (${data.postal})` : ''}`,
      isp: data.connection ? data.connection.isp : 'N/A',
      asn: data.connection ? `AS${data.connection.asn} ${data.connection.org || ''}`.trim() : 'N/A',
      latitude: data.latitude,
      longitude: data.longitude,
      coords: (data.latitude != null && data.longitude != null) ? `${data.latitude}, ${data.longitude}` : 'N/A',
      timezone: data.timezone ? `${data.timezone.id} (${data.timezone.utc})` : 'N/A'
    };

    displayRichData(latestIPData);
    if (!latestDeviceLocation) {
      applyLocationFallback('Waiting for device GPS...');
    }
    persistDataToMongo();
    return;
  } catch (err1) {
    console.warn('Primary IP service failed, attempting fallback 1...', err1);
  }

  try {
    const res = await fetch('https://freeipapi.com/api/json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('freeipapi failed');
    const data = await res.json();

    latestIPData = {
      ip: data.ipAddress,
      type: data.ipVersion ? `IPv${data.ipVersion}` : (data.ipAddress.includes(':') ? 'IPv6' : 'IPv4'),
      country: data.countryName || 'N/A',
      city: `${data.cityName || 'N/A'}${data.zipCode ? ` (${data.zipCode})` : ''}`,
      isp: 'N/A',
      asn: 'N/A',
      latitude: data.latitude,
      longitude: data.longitude,
      coords: (data.latitude != null && data.longitude != null) ? `${data.latitude}, ${data.longitude}` : 'N/A',
      timezone: data.timeZone || 'N/A'
    };

    displayRichData(latestIPData);
    if (!latestDeviceLocation) {
      applyLocationFallback('Waiting for device GPS...');
    }
    persistDataToMongo();
    return;
  } catch (err2) {
    console.warn('Fallback 1 failed, attempting fallback 2 (ipify)...', err2);
  }

  try {
    const res = await fetch('https://api64.ipify.org?format=json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('ipify failed');
    const data = await res.json();

    latestIPData = {
      ip: data.ip,
      type: data.ip.includes(':') ? 'IPv6' : 'IPv4',
      country: 'Data unavailable',
      city: 'Data unavailable',
      isp: 'Data unavailable',
      asn: 'Data unavailable',
      latitude: null,
      longitude: null,
      coords: 'Data unavailable',
      timezone: 'Data unavailable'
    };

    displayRichData(latestIPData);
    persistDataToMongo();
  } catch (finalErr) {
    console.error('All IP discovery services failed:', finalErr);
    showError('Unable to detect public IP. Please check your internet connection or ad blocker.');
    setLoadingState(false);
  }
}

function displayRichData(info) {
  currentIP = info.ip;
  ipText.textContent = info.ip;
  ipTypeBadge.textContent = info.type || (info.ip.includes(':') ? 'IPv6' : 'IPv4');

  locationVal.textContent = info.country;
  cityVal.textContent = info.city;
  ispVal.textContent = info.isp;
  asnVal.textContent = info.asn;
  coordsVal.textContent = info.coords;
  timezoneVal.textContent = info.timezone;

  setLoadingState(false);
  copyBtn.disabled = false;
}

function setLoadingState(isLoading) {
  if (isLoading) {
    ipSkeleton.classList.remove('hidden');
    ipText.classList.add('hidden');
    if (refreshIcon) refreshIcon.classList.add('spinning');
    ipTypeBadge.textContent = 'Detecting...';
    copyBtn.disabled = true;

    const skeletons = [locationVal, cityVal, ispVal, asnVal, coordsVal, timezoneVal];
    skeletons.forEach(el => {
      el.innerHTML = '<span class="skeleton skeleton-text"></span>';
    });
  } else {
    ipSkeleton.classList.add('hidden');
    ipText.classList.remove('hidden');
    if (refreshIcon) refreshIcon.classList.remove('spinning');
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove('hidden');
  ipTypeBadge.textContent = 'Failed';
  ipText.textContent = 'Unavailable';
}

function hideError() {
  errorBanner.classList.add('hidden');
}

/**
 * Clipboard copy functionality
 */
async function copyIPToClipboard() {
  if (!currentIP) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(currentIP);
    } else {
      const tempInput = document.createElement('input');
      tempInput.value = currentIP;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }

    copySuccessMsg.classList.remove('hidden');
    copyBtnText.textContent = 'Copied!';
    
    setTimeout(() => {
      copySuccessMsg.classList.add('hidden');
      copyBtnText.textContent = 'Copy IP Address';
    }, 2500);
  } catch (err) {
    console.error('Failed to copy IP: ', err);
  }
}

// Event Listeners
if (allowLocationBtn) {
  allowLocationBtn.addEventListener('click', () => {
    requestDeviceLocation(true);
  });
}

if (locateBtn) {
  locateBtn.addEventListener('click', () => {
    requestDeviceLocation(true);
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    fetchPublicIP();
    requestDeviceLocation(true);
  });
}

if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    fetchPublicIP();
    requestDeviceLocation(true);
  });
}

copyBtn.addEventListener('click', copyIPToClipboard);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initSessionDetails();
  checkLocationPermissions();
  fetchPublicIP();
  requestDeviceLocation();
});
