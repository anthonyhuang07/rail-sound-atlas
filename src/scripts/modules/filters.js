export const createSoundFilters = (state) => {
  const normalizeSystemData = (raw) => {
    const sounds = raw.sounds || {};
    const resolveSoundIds = (soundIds) =>
      Array.isArray(soundIds) ? soundIds.map((id) => sounds[id]).filter(Boolean) : [];
    const resolveItems = (node) =>
      node
        ? { ...node, items: Array.isArray(node.soundIds) ? resolveSoundIds(node.soundIds) : node.items || [] }
        : { items: [] };

    const lines = {};
    Object.entries(raw.lines || {}).forEach(([lineId, line]) => {
      lines[lineId] = resolveItems(line);
    });

    const stations = {};
    Object.entries(raw.stations || {}).forEach(([stationId, station]) => {
      stations[stationId] = { ...resolveItems(station), id: stationId };
    });

    const systemItems = Object.values(sounds).filter((sound) => sound.scope === "system");

    return {
      ...raw,
      system: { ...raw.system, items: systemItems },
      lines,
      stations,
    };
  };

  const stationLineIds = (station) => station.lines.map(([lineId]) => lineId);

  const stationLineOrder = (station, lineId) => {
    const line = station.lines.find(([id]) => id === lineId);
    return line ? line[1] : undefined;
  };

  const audioMatchesStation = (audio, station, lineId = null) => {
    if (!station || !Array.isArray(audio.targets) || !audio.targets.length) return true;
    return audio.targets.some((target) => {
      if (target.stationId !== station.id) return false;
      if (!lineId) return true;
      return !target.lineId || target.lineId === lineId;
    });
  };

  const isVisibleByHistory = (audio) => {
    const activeFlag = audio.active;
    return state.historyMode === "historical" ? activeFlag === false : activeFlag !== false;
  };

  const getVisibleStationItems = (station) =>
    (station?.items || [])
      .map((item) => ({
        ...item,
        audio: (item.audio || []).filter((audio) => isVisibleByHistory(audio) && audioMatchesStation(audio, station)),
      }))
      .filter((item) => item.audio.length > 0);

  const stationHasVisibleSounds = (stationId) => {
    const station = state.systemData?.stations?.[stationId];
    return !!(station && getVisibleStationItems(station).length);
  };

  const filterItemsByLine = (items, lineId, station = null) =>
    (items || [])
      .map((item) => {
        const sourceAudio = item.audio || [];
        const filteredAudio = sourceAudio.filter((audio, _, list) => {
          if (!isVisibleByHistory(audio)) return false;
          if (!audioMatchesStation(audio, station, lineId)) return false;
          const hasScopedAudio = list.some(
            (entry) =>
              (Array.isArray(entry.lineIds) && entry.lineIds.length) ||
              (Array.isArray(entry.targets) && entry.targets.some((target) => target.lineId)),
          );
          if (hasScopedAudio) {
            return (
              (Array.isArray(audio.lineIds) && audio.lineIds.includes(lineId)) ||
              (Array.isArray(audio.targets) && audio.targets.some((target) => target.lineId === lineId))
            );
          }
          return !audio.lineIds || audio.lineIds.includes(lineId);
        });
        return {
          ...item,
          audio: filteredAudio,
          hideSingleAudioTitle: sourceAudio.length > 1 && filteredAudio.length === 1,
        };
      })
      .filter((item) => item.audio.length > 0);

  const filterSystemItems = (items) =>
    (items || [])
      .map((item) => ({
        ...item,
        audio: (item.audio || []).filter((audio) => isVisibleByHistory(audio) && !audio.lineIds),
      }))
      .filter((item) => item.audio.length > 0);

  const stationItemsForLine = (station, lineId) => {
    if (!station || !lineId) return [];
    if (!stationLineIds(station).includes(lineId)) return [];
    return filterItemsByLine(station.items, lineId, station);
  };

  const lineVisibleInCurrentMode = (lineId) => {
    if (state.historyMode === "historical") return true;
    const line = state.systemData?.lines?.[lineId];
    return line?.active !== false;
  };

  return {
    normalizeSystemData,
    stationLineIds,
    stationLineOrder,
    audioMatchesStation,
    isVisibleByHistory,
    getVisibleStationItems,
    stationHasVisibleSounds,
    filterItemsByLine,
    filterSystemItems,
    stationItemsForLine,
    lineVisibleInCurrentMode,
  };
};
