/**
 * Places API (New) → INSERT SQL — supabase db query --linked -f tmp_korean_biz_seed.sql
 */
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

config({ path: '.env.local' });

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
if (!apiKey) {
  console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 가 필요합니다.');
  process.exit(1);
}

const REGION_BIAS = {
  bangkok: { lat: 13.7563, lng: 100.5018, radiusM: 50_000 },
  pattaya: { lat: 12.9236, lng: 100.8825, radiusM: 45_000 },
  chiangmai: { lat: 18.7883, lng: 98.9853, radiusM: 55_000 },
};

const TASKS = [
  { query: 'Korean Mart', region: 'bangkok', category: 'mart' },
  { query: 'Korean Grocery', region: 'bangkok', category: 'mart' },
  { query: 'Korean Hospital', region: 'bangkok', category: 'hospital' },
  { query: 'Korean Clinic', region: 'bangkok', category: 'hospital' },
  { query: 'Korean Pharmacy', region: 'bangkok', category: 'pharmacy' },
  { query: 'Korean Mart', region: 'pattaya', category: 'mart' },
  { query: 'Korean Grocery', region: 'pattaya', category: 'mart' },
  { query: 'Korean Hospital', region: 'pattaya', category: 'hospital' },
  { query: 'Korean Clinic', region: 'pattaya', category: 'hospital' },
  { query: 'Korean Pharmacy', region: 'pattaya', category: 'pharmacy' },
  { query: 'Korean Mart', region: 'chiangmai', category: 'mart' },
  { query: 'Korean Grocery', region: 'chiangmai', category: 'mart' },
  { query: 'Korean Hospital', region: 'chiangmai', category: 'hospital' },
  { query: 'Korean Clinic', region: 'chiangmai', category: 'hospital' },
  { query: 'Korean Pharmacy', region: 'chiangmai', category: 'pharmacy' },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escSql(s) {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function normalizeBiz(s) {
  if (!s) return '';
  const u = String(s).toUpperCase();
  return u.includes('OPERATIONAL') ? 'OPERATIONAL' : s;
}

async function searchTextPage({ query, region, pageToken }) {
  const bias = REGION_BIAS[region];
  const body = {
    textQuery: query,
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: { latitude: bias.lat, longitude: bias.lng },
        radius: bias.radiusM,
      },
    },
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `search_${res.status}`);
  return data;
}

async function collectResults(task, maxPages) {
  const out = [];
  let token;
  for (let page = 0; page < maxPages; page += 1) {
    const data = await searchTextPage({
      query: task.query,
      region: task.region,
      pageToken: token,
    });
    for (const p of data.places ?? []) {
      if (p.id) out.push(p);
    }
    token = data.nextPageToken;
    if (!token) break;
    await sleep(1200);
  }
  return out;
}

async function placeDetails(placeId) {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,location,businessStatus',
    },
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok) return null;
  const phone =
    (json.nationalPhoneNumber || '').trim() || (json.internationalPhoneNumber || '').trim() || null;
  const lat = json.location?.latitude ?? null;
  const lng = json.location?.longitude ?? null;
  const biz = normalizeBiz(json.businessStatus);
  return {
    name: json.displayName?.text ?? 'Unknown',
    address: json.formattedAddress ?? null,
    phone,
    latitude: lat,
    longitude: lng,
    is_verified: biz === 'OPERATIONAL' || biz === '',
  };
}

const seen = new Set();
const rows = [];

for (const task of TASKS) {
  let results;
  try {
    results = await collectResults(task, 3);
  } catch (e) {
    console.error(`-- task ${task.region} ${task.query}: ${e.message}`);
    continue;
  }
  for (const p of results) {
    const pid = p.id;
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);

    let detail;
    try {
      detail = await placeDetails(pid);
      if (!detail) continue;
    } catch {
      continue;
    }

    const now = new Date().toISOString();
    rows.push({
      google_place_id: pid,
      name: detail.name,
      category: task.category,
      region: task.region,
      address: detail.address,
      phone: detail.phone,
      latitude: detail.latitude,
      longitude: detail.longitude,
      is_verified: detail.is_verified,
      last_verified_at: now,
    });
  }
}

const sqlLines = [
  '-- generated by scripts/seed-korean-biz-places-sql.mjs (Places API New)',
  'begin;',
];

for (const row of rows) {
  sqlLines.push(`insert into public.korean_businesses (
  google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at
) values (
  ${escSql(row.google_place_id)},
  ${escSql(row.name)},
  ${escSql(row.category)}::public.korean_biz_category,
  ${escSql(row.region)}::public.korean_biz_region,
  ${row.address == null ? 'null' : escSql(row.address)},
  ${row.phone == null ? 'null' : escSql(row.phone)},
  ${row.latitude == null ? 'null' : row.latitude},
  ${row.longitude == null ? 'null' : row.longitude},
  ${row.is_verified},
  ${escSql(row.last_verified_at)}::timestamptz
) on conflict (google_place_id) do nothing;`);
}

sqlLines.push('commit;');

const outPath = process.argv[2] ?? join(process.cwd(), 'tmp_korean_biz_seed.sql');
writeFileSync(outPath, sqlLines.join('\n'), 'utf8');
console.error(`-- wrote ${rows.length} inserts → ${outPath}`);
