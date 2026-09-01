// Regenerates src/shared/geo/places.txt, the place list that names stops
// dropped on the map (see src/shared/geo/gazetteer.tsx).
//
// Source: the GeoNames dumps, CC BY 4.0 (https://www.geonames.org/). They are a
// few tens of MB, so they are not vendored here — download and unzip them, then
// point this script at the files:
//
//   curl -O https://download.geonames.org/export/dump/NO.zip
//   curl -O https://download.geonames.org/export/dump/SE.zip
//   curl -O https://download.geonames.org/export/dump/admin2Codes.txt
//   unzip -o NO.zip && unzip -o SE.zip
//   node scripts/generate-places.mjs NO.txt SE.txt admin2Codes.txt > src/shared/geo/places.txt
//
// What is kept:
//   - Norway: every populated place (GeoNames feature class P) — towns,
//     villages, hamlets and city districts alike, about 14 000 of them.
//   - Sweden: the same, but only within SWEDEN_BAND_KM of a Norwegian place, so
//     a stop just across the border still gets a name without carrying the
//     whole country.
//   - Names of at least MIN_NAME_LENGTH characters, because the trip form
//     rejects shorter stop names.
//   - One entry per name within DEDUPE_KM: GeoNames often lists the same place
//     several times, and a duplicate can only ever produce the same name.
//
// Each place is written as "<place>, <municipality>", the municipality taken
// from GeoNames' admin2 codes. Without it a name like "Berg" or "Flattum" says
// nothing to anyone who does not already know the area, and the same names
// recur all over both countries. A place whose own name is the municipality's
// (Oslo, Bergen) keeps the bare name, as do the ~1.5 % of entries GeoNames has
// no admin2 code for.

import { readFileSync } from 'node:fs';

const SWEDEN_BAND_KM = 150;
const DEDUPE_KM = 5;
const MIN_NAME_LENGTH = 2;
// Four decimals is about 11 m — far finer than the places themselves are known.
const COORD_DECIMALS = 4;

const [norwayPath, swedenPath, admin2Path] = process.argv.slice(2);
if (!norwayPath || !swedenPath || !admin2Path) {
  console.error('usage: node scripts/generate-places.mjs <NO.txt> <SE.txt> <admin2Codes.txt>');
  process.exit(1);
}

const EARTH_RADIUS_KM = 6371.0088;
const toRadians = degrees => (degrees * Math.PI) / 180;
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

const lines = path => readFileSync(path, 'utf8').split('\n');

// admin2Codes.txt: "<country>.<admin1>.<admin2>\t<name>\t<ascii name>\t<id>".
const municipalities = new Map(
  lines(admin2Path)
    .map(line => line.split('\t'))
    .filter(fields => fields.length > 1)
    .map(fields => [fields[0], fields[1]])
);

// Swedish municipalities are listed as "Eda kommun", Norwegian ones as plain
// "Modum"; drop the word so both read the same in a stop name.
const municipalityName = municipality => municipality.replace(/ kommun$/i, '');

const qualify = (name, municipality) => {
  const suffix = municipality ? municipalityName(municipality) : '';
  return !suffix || suffix.toLowerCase() === name.toLowerCase() ? name : `${name}, ${suffix}`;
};

// GeoNames dump columns: id, name, asciiname, alternatenames, lat, lng,
// feature class, feature code, country, cc2, admin1, admin2, ...
const readPopulatedPlaces = (path, country) =>
  lines(path)
    .map(line => line.split('\t'))
    .filter(fields => fields.length > 11 && fields[6] === 'P')
    .map(fields => ({
      name: qualify(fields[1].trim(), municipalities.get(`${country}.${fields[10]}.${fields[11]}`)),
      lat: Number(fields[4]),
      lng: Number(fields[5]),
    }))
    .filter(
      place =>
        place.name.length >= MIN_NAME_LENGTH &&
        Number.isFinite(place.lat) &&
        Number.isFinite(place.lng) &&
        // The separator, and anything that would need escaping once the file is
        // inlined into the bundle. No real place name contains these, but a
        // silent corruption of the list would be hard to spot.
        !/[|\r\n\`]/.test(place.name)
    );

// Half-degree cells, so a lookup only scans the cells that can hold a place
// within the radius asked for (0.5 degrees of latitude is about 55 km).
const CELL = 2;
const cellKey = (lat, lng) => `${Math.floor(lat * CELL)}:${Math.floor(lng * CELL)}`;

const cellsAround = (lat, lng, radiusKm) => {
  const span = Math.ceil(radiusKm / 55) + 1;
  const keys = [];
  for (let i = Math.floor(lat * CELL) - span; i <= Math.floor(lat * CELL) + span; i++) {
    // A degree of longitude is about a third as long at 70°N as at the equator,
    // so the longitude span has to be wider than the latitude one.
    for (let j = Math.floor(lng * CELL) - span * 3; j <= Math.floor(lng * CELL) + span * 3; j++) {
      keys.push(`${i}:${j}`);
    }
  }
  return keys;
};

const add = (cells, place) => {
  const cell = cells.get(cellKey(place.lat, place.lng));
  if (cell) cell.push(place);
  else cells.set(cellKey(place.lat, place.lng), [place]);
};

const indexOf = places => {
  const cells = new Map();
  for (const place of places) add(cells, place);
  return cells;
};

const within = (cells, lat, lng, radiusKm, matches = () => true) =>
  cellsAround(lat, lng, radiusKm)
    .flatMap(key => cells.get(key) ?? [])
    .some(place => matches(place) && haversineKm(lat, lng, place.lat, place.lng) <= radiusKm);

const norway = readPopulatedPlaces(norwayPath, 'NO');
const norwayCells = indexOf(norway);
const sweden = readPopulatedPlaces(swedenPath, 'SE').filter(place =>
  within(norwayCells, place.lat, place.lng, SWEDEN_BAND_KM)
);

// Drop a place when one of the same name is already listed nearby: it could
// only ever produce the same stop name.
const kept = [];
const keptCells = new Map();
for (const place of [...norway, ...sweden]) {
  if (within(keptCells, place.lat, place.lng, DEDUPE_KM, other => other.name === place.name)) {
    continue;
  }
  kept.push(place);
  add(keptCells, place);
}

const round = value => Number(value.toFixed(COORD_DECIMALS));

process.stdout.write(
  [
    '# Populated places used to name carpool stops. GENERATED FILE — do not edit.',
    '# Regenerate with scripts/generate-places.mjs (see that file for the source data).',
    '#',
    '# Source: GeoNames (https://www.geonames.org/), licensed CC BY 4.0.',
    `# Norway: every populated place. Sweden: those within ${SWEDEN_BAND_KM} km of Norway.`,
    '#',
    '# One place per line: name|latitude|longitude',
    ...kept.map(place => `${place.name}|${round(place.lat)}|${round(place.lng)}`),
    '',
  ].join('\n')
);

console.error(
  `${kept.length} places (${norway.length} from Norway, ${sweden.length} from Sweden before dedupe)`
);
