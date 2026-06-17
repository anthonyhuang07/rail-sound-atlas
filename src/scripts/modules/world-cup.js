export const WORLD_CUP_MODE = true;

const HOST_COUNTRY_IDS = ["canada", "usa", "mexico"];

export const WORLD_CUP_HOSTS = [
  {
    countryId: "canada",
    countryName: "Canada",
    cities: [
      { name: "Toronto", systemIds: ["ttc", "go"] },
      { name: "Vancouver", systemIds: ["skytrain"] },
    ],
  },
  {
    countryId: "usa",
    countryName: "United States",
    cities: [
      { name: "Atlanta", systemIds: ["marta"] },
      { name: "Boston", systemIds: ["mbta"] },
      { name: "Dallas", systemIds: ["dart"] },
      { name: "Houston", systemIds: ["houston-metrorail"] },
      { name: "Kansas City", systemIds: ["ridekc"] },
      { name: "Los Angeles", systemIds: ["la-metro", "metrolink"] },
      { name: "Miami", systemIds: ["miami-metrorail"] },
      { name: "New York/New Jersey", systemIds: ["nyc-subway", "path", "nj-transit"] },
      { name: "Philadelphia", systemIds: ["septa"] },
      { name: "San Francisco Bay Area", systemIds: ["bart", "caltrain", "muni"] },
      { name: "Seattle", systemIds: ["sound-transit", "link"] },
    ],
  },
  {
    countryId: "mexico",
    countryName: "Mexico",
    cities: [
      { name: "Guadalajara", systemIds: ["guadalajara-metro", "siteur"] },
      { name: "Mexico City", systemIds: ["mexico-city-metro", "cdmx-metro"] },
      { name: "Monterrey", systemIds: ["monterrey-metro", "metrorrey"] },
    ],
  },
];

const getCountryRank = (countryId) => {
  const rank = HOST_COUNTRY_IDS.indexOf(countryId);
  return rank === -1 ? Number.POSITIVE_INFINITY : rank;
};

const getSystemRank = (countryId, systemId) => {
  const host = WORLD_CUP_HOSTS.find((entry) => entry.countryId === countryId);
  if (!host) return Number.POSITIVE_INFINITY;
  const ids = host.cities.flatMap((city) => city.systemIds);
  const rank = ids.indexOf(systemId);
  return rank === -1 ? Number.POSITIVE_INFINITY : rank;
};

const keepStableOrder = (rankDelta, fallbackIndexDelta) =>
  Number.isNaN(rankDelta) ? fallbackIndexDelta : rankDelta || fallbackIndexDelta;

export const isWorldCupCountry = (countryId) =>
  WORLD_CUP_MODE && HOST_COUNTRY_IDS.includes(countryId);

export const isWorldCupSystem = (countryId, systemId) =>
  WORLD_CUP_MODE && Number.isFinite(getSystemRank(countryId, systemId));

export const sortWorldCupCountries = (countries) =>
  WORLD_CUP_MODE
    ? countries
        .map((country, index) => ({ country, index }))
        .sort((a, b) => keepStableOrder(getCountryRank(a.country.id) - getCountryRank(b.country.id), a.index - b.index))
        .map(({ country }) => country)
    : countries;

export const sortWorldCupRegions = (regions, countryId) => {
  if (!WORLD_CUP_MODE) return regions;
  return regions
    .map((region, index) => ({
      index,
      region: {
        ...region,
        systems: [...(region.systems || [])]
          .map((system, systemIndex) => ({ system, systemIndex }))
          .sort((a, b) =>
            keepStableOrder(
              getSystemRank(countryId, a.system.id) - getSystemRank(countryId, b.system.id),
              a.systemIndex - b.systemIndex
            )
          )
          .map(({ system }) => system),
      },
    }))
    .sort((a, b) => {
      const aRank = Math.min(...(a.region.systems || []).map((system) => getSystemRank(countryId, system.id)));
      const bRank = Math.min(...(b.region.systems || []).map((system) => getSystemRank(countryId, system.id)));
      return keepStableOrder(aRank - bRank, a.index - b.index);
    })
    .map(({ region }) => region);
};
