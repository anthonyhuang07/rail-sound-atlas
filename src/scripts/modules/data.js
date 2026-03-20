export const SUPABASE_URL = "https://mvsfcsodvtojqrmvsjbi.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_dnRHPIzJ2rVP8sgygNBkHg_dmr0OxBh";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function getLineSoundIds(lineId, soundData) {
  return Object.entries(soundData)
    .filter(([, sound]) => sound.audio.some((a) => (a.lineIds || []).includes(lineId)))
    .map(([soundId]) => soundId);
}

export const fetchSystemData = async (systemId) => {
  const [
    { data: systemRow, error: systemError },
    { data: lines, error: linesError },
    { data: stations, error: stationsError },
    { data: stationLines, error: stationLinesError },
    { data: soundFiles, error: soundFilesError },
  ] = await Promise.all([
    supabaseClient.from("systems").select("*").eq("id", systemId).single(),
    supabaseClient.from("lines").select("*").eq("system_id", systemId),
    supabaseClient.from("stations").select("*").eq("system_id", systemId),
    supabaseClient.from("station_lines").select("*").eq("system_id", systemId),
    supabaseClient.from("sound_files").select("*").eq("system_id", systemId),
  ]);

  if (systemError) throw systemError;
  if (linesError) throw linesError;
  if (stationsError) throw stationsError;
  if (stationLinesError) throw stationLinesError;
  if (soundFilesError) throw soundFilesError;

  const stationLineRowsByStationId = new Map();
  stationLines.forEach((row) => {
    if (!stationLineRowsByStationId.has(row.station_id)) {
      stationLineRowsByStationId.set(row.station_id, []);
    }
    stationLineRowsByStationId.get(row.station_id).push(row);
  });

  const toValidSort = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const sortedLines = [...(lines || [])].sort((a, b) => {
    const aSort = toValidSort(a.sort_order);
    const bSort = toValidSort(b.sort_order);
    const aHasSort = aSort !== null;
    const bHasSort = bSort !== null;
    if (aHasSort && bHasSort) return aSort - bSort;
    if (aHasSort) return -1;
    if (bHasSort) return 1;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  const linesObject = {};
  sortedLines.forEach((line, index) => {
    linesObject[line.id] = {
      title: line.title,
      subtitle: line.subtitle || "",
      icon: line.icon_url,
      otherIcons: Array.isArray(line.other_icons) ? line.other_icons : [],
      soundIds: [],
      sort_order: line.sort_order ?? null,
      sort_index: index,
      active: line.is_active ?? line.active,
    };
  });

  const stationsObject = {};
  stations.forEach((station) => {
    const lineRows = (stationLineRowsByStationId.get(station.id) || []).sort(
      (a, b) => (linesObject[a.line_id]?.sort_index ?? 9999) - (linesObject[b.line_id]?.sort_index ?? 9999),
    );

    stationsObject[station.id] = {
      name: station.name,
      lines: lineRows.map((row) => [row.line_id, row.line_order]),
      soundIds: [],
      active: station.is_active ?? station.active,
    };
  });

  return {
    system: {
      id: systemRow.id,
      name: systemRow.name,
      description: systemRow.description || "",
    },
    theme: systemRow.theme || {},
    lines: linesObject,
    stations: stationsObject,
    mapUrl: systemRow.map_url || null,
  };
};

export const fetchSoundData = async (systemId) => {
  const [{ data: sounds, error: soundsError }, { data: soundFiles, error: soundFilesError }] =
    await Promise.all([
      supabaseClient.from("sounds").select("*").eq("system_id", systemId),
      supabaseClient.from("sound_files").select("*").eq("system_id", systemId),
    ]);

  if (soundsError) throw soundsError;
  if (soundFilesError) throw soundFilesError;

  const filesBySoundId = new Map();

  soundFiles.forEach((file) => {
    const audioEntry = {
      title: file.title || undefined,
      description: file.description || undefined,
      src: file.src,
      lineIds: Array.isArray(file.line_ids) && file.line_ids.length ? file.line_ids : undefined,
      targets: file.station_id ? [{ stationId: file.station_id }] : [],
      active: file.is_active ?? file.active,
      metadata: {
        ...(file.source_url ? { origin: file.source_url } : {}),
        ...(file.year_captured ? { yearCaptured: file.year_captured } : {}),
        ...(file.rolling_stock ? { rollingStock: file.rolling_stock } : {}),
      },
    };

    if (!filesBySoundId.has(file.sound_id)) {
      filesBySoundId.set(file.sound_id, []);
    }

    filesBySoundId.get(file.sound_id).push(audioEntry);
  });

  const soundData = {};
  sounds.forEach((sound) => {
    soundData[sound.id] = {
      title: sound.title,
      description: sound.description || "",
      scope: sound.scope,
      audio: filesBySoundId.get(sound.id) || [],
    };
  });

  return soundData;
};

export const fetchCountries = async () => {
  const { data, error } = await supabaseClient.from("countries").select("id, name, image_url").order("name", {
    ascending: true,
  });

  if (error) throw error;

  return (data || []).map((country) => ({
    id: country.id,
    name: country.name,
    image: country.image_url,
  }));
};

export const fetchCountrySystems = async (countryId) => {
  const { data, error } = await supabaseClient
    .from("systems")
    .select("id, name, logo_url, map_url, region")
    .eq("country_id", countryId)
    .order("region", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  const grouped = {};
  (data || []).forEach((system) => {
    const regionKey = system.region || "Other";

    if (!grouped[regionKey]) {
      grouped[regionKey] = {
        name: regionKey,
        systems: [],
      };
    }

    grouped[regionKey].systems.push({
      id: system.id,
      name: system.name,
      logo: system.logo_url,
      map: system.map_url,
    });
  });

  return Object.values(grouped);
};

export const getStorageAudioUrl = (src) =>
  src && !/^https?:\/\//i.test(src) ? `${SUPABASE_URL}/storage/v1/object/public/audio/${src}` : src || "";
