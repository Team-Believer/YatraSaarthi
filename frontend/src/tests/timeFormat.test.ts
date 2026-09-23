/**
 * YatraSaarthi - Time and Date IST Conversion Tests
 */

import {
  parseToDate,
  formatISTTime,
  formatISTDate,
  formatISTDateTime,
  getISTDateBucket,
  formatTripDateTime,
  IST_TIMEZONE,
  IST_OFFSET_MS,
} from '../utils/timeFormat';

export function runTimeFormatTests(): { passed: number; failed: number; errors: string[] } {
  const results = { passed: 0, failed: 0, errors: [] as string[] };

  function assert(condition: boolean, testName: string, actual?: any, expected?: any) {
    if (condition) {
      results.passed++;
    } else {
      results.failed++;
      const err = `[FAIL] ${testName} | Expected: ${JSON.stringify(expected)} | Actual: ${JSON.stringify(actual)}`;
      results.errors.push(err);
      console.error(err);
    }
  }

  console.log('🧪 Starting YatraSaarthi IST Time Format Validation Suite...');

  // Test 1: Specified UTC timestamp 2026-09-23T11:45:00Z -> 5:15 PM IST
  const utc1 = '2026-09-23T11:45:00Z';
  const time1 = formatISTTime(utc1);
  assert(
    time1.replace(/\s+/g, ' ').toUpperCase() === '5:15 PM' || time1.replace(/\s+/g, ' ') === '5:15 pm',
    'UTC 11:45:00Z converts to 5:15 PM IST',
    time1,
    '5:15 PM'
  );

  // Test 2: Specified UTC timestamp 2026-09-23T18:45:00Z -> Sep 24, 2026, 12:15 AM IST (crosses midnight)
  const utc2 = '2026-09-23T18:45:00Z';
  const time2 = formatISTTime(utc2);
  const date2 = formatISTDate(utc2, 'medium');
  assert(
    time2.replace(/\s+/g, ' ').toUpperCase() === '12:15 AM' || time2.replace(/\s+/g, ' ') === '12:15 am',
    'UTC 18:45:00Z converts to 12:15 AM IST',
    time2,
    '12:15 AM'
  );
  assert(
    date2.includes('24') && date2.includes('Sep'),
    'UTC 18:45:00Z rolls over to Sep 24 in IST',
    date2,
    '24 Sep 2026'
  );

  // Test 3: Date grouping across midnight in IST
  // Reference time: Sep 24, 2026 02:00:00 IST (UTC: Sep 23, 2026 20:30:00Z)
  const refNow = new Date('2026-09-23T20:30:00Z');
  
  // Trip A: Sep 24, 2026 00:30:00 IST (UTC: Sep 23, 2026 19:00:00Z) -> should be 'Today' in IST
  const tripToday = '2026-09-23T19:00:00Z';
  const bucketToday = getISTDateBucket(tripToday, refNow);
  assert(bucketToday === 'Today', '19:00 UTC on 23rd is Today on 24th IST', bucketToday, 'Today');

  // Trip B: Sep 23, 2026 23:00:00 IST (UTC: Sep 23, 2026 17:30:00Z) -> should be 'Yesterday' in IST
  const tripYesterday = '2026-09-23T17:30:00Z';
  const bucketYesterday = getISTDateBucket(tripYesterday, refNow);
  assert(bucketYesterday === 'Yesterday', '17:30 UTC on 23rd is Yesterday on 24th IST', bucketYesterday, 'Yesterday');

  // Test 4: Epoch seconds normalization
  const epochSec = 1790163900; // 2026-09-23T11:45:00Z in seconds
  const timeEpoch = formatISTTime(epochSec);
  assert(
    timeEpoch.replace(/\s+/g, ' ').toUpperCase() === '5:15 PM' || timeEpoch.replace(/\s+/g, ' ') === '5:15 pm',
    'Epoch seconds normalized correctly to IST',
    timeEpoch,
    '5:15 PM'
  );

  // Test 5: SQLite formatted timestamp string without Z ("2026-09-23 11:45:00")
  const sqliteTs = '2026-09-23 11:45:00';
  const timeSqlite = formatISTTime(sqliteTs);
  assert(
    timeSqlite.replace(/\s+/g, ' ').toUpperCase() === '5:15 PM' || timeSqlite.replace(/\s+/g, ' ') === '5:15 pm',
    'SQLite UTC timestamp normalized correctly to IST',
    timeSqlite,
    '5:15 PM'
  );

  // Test 6: Comprehensive Trip Formatter
  const tripFormat = formatTripDateTime(utc1, refNow);
  assert(
    tripFormat.fullDate.includes('2026') && tripFormat.fullDate.includes('Sep'),
    'formatTripDateTime generates full date with year and month in IST',
    tripFormat.fullDate
  );

  // Test 7: formatISTDateTime
  const dtStr = formatISTDateTime(utc1);
  assert(
    dtStr.includes('5:15') && (dtStr.includes('PM') || dtStr.includes('pm')),
    'formatISTDateTime formats full date and time string in IST',
    dtStr
  );

  // Test 8: parseToDate edge cases
  const parsed = parseToDate(1790163900);
  assert(parsed !== null && !isNaN(parsed.getTime()), 'parseToDate parses numeric seconds epoch');

  // Test 9: Constants
  assert(IST_TIMEZONE === 'Asia/Kolkata', 'IST_TIMEZONE constant is Asia/Kolkata');
  assert(IST_OFFSET_MS === 19800000, 'IST_OFFSET_MS constant is 5.5 hours in ms');

  console.log(`✅ Validation Complete: ${results.passed} passed, ${results.failed} failed.`);
  return results;
}
