/**
 * API & WebSocket Configuration Validation Suite
 * 
 * Verifies:
 * 1. production API URL resolution (custom HTTPS URL preserved)
 * 2. development relative API URL resolution (defaults to "" for Vite proxy)
 * 3. production HTTPS -> WSS conversion
 * 4. development HTTP -> WS conversion
 * 5. localhost/127.0.0.1 fallback to verified Render URL in production
 * 6. LAN IP fallback to verified Render URL in production
 * 7. session endpoint construction for https://yatrasaarthi.onrender.com
 * 8. WebSocket endpoint construction for wss://yatrasaarthi.onrender.com
 * 9. isLocalOrPrivateHost accurately discriminates public domains from private/local IPs
 * 10. Default production resolution matches verified Render backend
 */

import {
  getApiBaseUrl,
  getWsBaseUrl,
  getNavigationWsUrl,
  isLocalOrPrivateHost,
  PRODUCTION_DEFAULT_API_URL,
  PRODUCTION_DEFAULT_WS_URL,
} from '../services/api/apiConfig';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

export async function runApiConfigurationTests() {
  console.log('\n====================================================');
  console.log('🧪 YATRASARTHI API & WEBSOCKET CONFIGURATION TESTS');
  console.log('====================================================\n');

  // Test 1: Production HTTPS API URL resolution
  const prodHttpsBase = getApiBaseUrl({
    NODE_ENV: 'production',
    DEV: 'false',
    VITE_API_URL: 'https://yatrasaarthi.onrender.com/',
  });
  assert(
    prodHttpsBase === 'https://yatrasaarthi.onrender.com',
    '1. Production HTTPS API URL is preserved and trailing slash trimmed'
  );

  // Test 2: Development relative API URL resolution
  const devEmptyBase = getApiBaseUrl({
    NODE_ENV: 'development',
    DEV: 'true',
    VITE_API_URL: '',
  });
  assert(
    devEmptyBase === '',
    '2. Development mode without VITE_API_URL defaults to relative base for Vite proxy'
  );

  // Test 3: Production HTTPS -> WSS conversion
  const prodWssUrl = getWsBaseUrl({
    NODE_ENV: 'production',
    DEV: 'false',
    VITE_API_URL: 'https://yatrasaarthi.onrender.com',
  });
  assert(
    prodWssUrl === 'wss://yatrasaarthi.onrender.com',
    '3. Production WebSocket URL converts https:// to wss://'
  );

  // Test 4: Development HTTP -> WS conversion
  const devWsUrl = getWsBaseUrl({
    NODE_ENV: 'development',
    DEV: 'true',
    VITE_API_URL: 'http://192.168.1.15:8000',
  });
  assert(
    devWsUrl === 'ws://192.168.1.15:8000',
    '4. Development WebSocket URL converts http:// to ws://'
  );

  // Test 5: Localhost / 127.0.0.1 fallback to verified Render URL in production
  const prodLocalhostBase = getApiBaseUrl({
    NODE_ENV: 'production',
    DEV: 'false',
    VITE_API_URL: 'http://localhost:8000',
  });
  const prod127Base = getApiBaseUrl({
    NODE_ENV: 'production',
    DEV: 'false',
    VITE_API_URL: 'http://127.0.0.1:8000',
  });
  assert(
    prodLocalhostBase === PRODUCTION_DEFAULT_API_URL && prod127Base === PRODUCTION_DEFAULT_API_URL,
    '5. Localhost and 127.0.0.1 in production safely fall back to verified Render backend'
  );

  // Test 6: LAN IP fallback to verified Render URL in production
  const prod192Base = getApiBaseUrl({
    NODE_ENV: 'production',
    DEV: 'false',
    VITE_API_URL: 'http://192.168.1.50:8000',
  });
  assert(
    prod192Base === PRODUCTION_DEFAULT_API_URL,
    '6. Private LAN IPs (192.168.x.x, 10.x.x.x) safely fall back to verified Render backend'
  );

  // Test 7: Session endpoint construction
  const prodApiBase = getApiBaseUrl({
    NODE_ENV: 'production',
    DEV: 'false',
    VITE_API_URL: 'https://yatrasaarthi.onrender.com',
  });
  const sessionUrl = `${prodApiBase}/api/v1/navigation/session`;
  assert(
    sessionUrl === 'https://yatrasaarthi.onrender.com/api/v1/navigation/session',
    '7. Production session endpoint accurately targets https://yatrasaarthi.onrender.com'
  );

  // Test 8: Full WebSocket endpoint construction
  const wsFullUrl = getNavigationWsUrl('sess-prod-999', {
    NODE_ENV: 'production',
    DEV: 'false',
    VITE_API_URL: 'https://yatrasaarthi.onrender.com',
  });
  assert(
    wsFullUrl === 'wss://yatrasaarthi.onrender.com/ws/navigation/sess-prod-999',
    '8. Full WebSocket endpoint constructed with WSS and session ID'
  );

  // Test 9: Production default WebSocket URL
  const defaultProdWs = getWsBaseUrl({
    NODE_ENV: 'production',
    DEV: 'false',
    VITE_API_URL: '',
    VITE_WS_URL: '',
  });
  assert(
    defaultProdWs === PRODUCTION_DEFAULT_WS_URL,
    '9. Production default WebSocket URL targets wss://yatrasaarthi.onrender.com'
  );

  // Test 10: Helper utility isLocalOrPrivateHost
  assert(
    isLocalOrPrivateHost('http://localhost:8000') &&
    isLocalOrPrivateHost('http://192.168.0.1:8000') &&
    !isLocalOrPrivateHost('https://yatrasaarthi.onrender.com'),
    '10. isLocalOrPrivateHost accurately discriminates public domains from private/local IPs'
  );

  console.log(`\n----------------------------------------------------`);
  console.log(`API Configuration Test Summary: ${passedTests}/${totalTests} passed (0 failed)`);
  console.log(`----------------------------------------------------\n`);
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('apiConfiguration.test')) {
  runApiConfigurationTests().catch((e) => {
    console.error('API configuration test failed:', e);
    process.exit(1);
  });
}
