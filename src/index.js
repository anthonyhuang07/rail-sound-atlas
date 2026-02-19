const soundList = document.getElementById("sound-list");
const panelTitle = document.getElementById("panel-title");
const panelSubtitle = document.getElementById("panel-subtitle");
const sidePanel = document.getElementById("side-panel");
const countryGrid = document.getElementById("country-grid");
const systemGrid = document.getElementById("system-grid");
const mapContainer = document.getElementById("map-container");
const crumbCountry = document.getElementById("crumb-country");
const crumbSystem = document.getElementById("crumb-system");
const panelLineIcons = document.getElementById("panel-line-icons");
const panelBack = document.getElementById("panel-back");
const panelSystemIcon = document.getElementById("panel-system-icon");
const mapPopup = document.getElementById("map-popup");
const popupTitle = document.getElementById("popup-title");
const popupSubtitle = document.getElementById("popup-subtitle");
const popupLineIcons = document.getElementById("popup-line-icons");
const popupSoundList = document.getElementById("popup-sound-list");
const popupClose = document.getElementById("popup-close");
const systemModeToggle = document.getElementById("system-mode-toggle");
const modeMapButton = document.getElementById("mode-map");
const modeListButton = document.getElementById("mode-list");
const infoModal = document.getElementById("info-modal");
const infoModalBody = document.getElementById("info-modal-body");
const infoModalClose = document.getElementById("info-modal-close");
const infoModalBackdrop = document.getElementById("info-modal-backdrop");
const infoModalDownload = document.getElementById("info-modal-download");
const systemListView = document.getElementById("system-list-view");
const viewSystem = document.getElementById("view-system");
const mapWrap = document.querySelector("#view-system .map-wrap");
const sidePanelHead = sidePanel ? sidePanel.querySelector(".side-panel-head") : null;
const sepCountry = document.querySelector(".crumb-sep[data-sep=country]");
const sepSystem = document.querySelector(".crumb-sep[data-sep=system]");
const mapSelector = "[data-scope], [data-line], [data-line-id], [data-station], [data-station-id]";
let userSystemMode = null;

const stationTooltip = document.createElement("div");
stationTooltip.className = "station-tooltip";
const DOWNLOAD_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4.01 4a1 1 0 0 1-1.38 0l-4.01-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1zm-7 14a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z\"/></svg>";
const PLAY_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M8 6.5v11a1 1 0 0 0 1.5.86l8.5-5.5a1 1 0 0 0 0-1.72l-8.5-5.5A1 1 0 0 0 8 6.5z\"/></svg>";
const STOP_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 7h10v10H7z\"/></svg>";
const CHEVRON_DOWN_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M6.7 9.3a1 1 0 0 1 1.4 0L12 13.2l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.7a1 1 0 0 1 0-1.4z\"/></svg>";
const CHEVRON_UP_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M17.3 14.7a1 1 0 0 1-1.4 0L12 10.8l-3.9 3.9a1 1 0 1 1-1.4-1.4l4.6-4.6a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z\"/></svg>";

const state = {
  audioControllers: new Set(),
  view: "home",
  systemData: null,
  systemInfo: null,
  mapAvailable: false,
  viewBox: null,
  baseViewBox: null,
  pointers: new Map(),
  panLast: { x: 0, y: 0 },
  pinchLastDist: 0,
  moved: false,
  panActive: false,
  suppressClick: false,
  systemMode: "map",
  selectedLineId: null,
  systemLoadToken: 0,
  mobileMenuHeightPx: 0,
  mobileMinMenuPx: 0,
  splitDragActive: false,
  splitDragPointerId: null,
  splitDragType: null,
  panStartedOnTarget: false,
  panStart: { x: 0, y: 0 },
  panDownTarget: null,
};

const stopActiveAudio = () => {
  Array.from(state.audioControllers).forEach((controller) => controller.stop());
};

const closeInfoModal = () => {
  if (!infoModal) return;
  infoModal.hidden = true;
  if (infoModalBody) infoModalBody.innerHTML = "";
  if (infoModalDownload) infoModalDownload.removeAttribute("href");
};

const openInfoModal = (audioData) => {
  if (!infoModal || !infoModalBody) return;
  infoModalBody.innerHTML = "";
  const metadata = [];
  if (audioData.metadata?.rollingStock) {
    metadata.push({ label: "Rolling Stock:", value: audioData.metadata.rollingStock });
  }
  if (audioData.metadata?.origin) metadata.push({ label: "Source:", value: audioData.metadata.origin });
  if (audioData.metadata?.yearCaptured) {
    metadata.push({ label: "Year Captured:", value: String(audioData.metadata.yearCaptured) });
  }
  if (!metadata.length) {
    const row = document.createElement("p");
    row.textContent = "No additional info.";
    infoModalBody.append(row);
  }
  metadata.forEach(({ label, value }) => {
    const row = document.createElement("p");
    row.textContent = `${label} `;
    if (label === "Source:" && /^https?:\/\//i.test(value)) {
      const link = document.createElement("a");
      link.href = value;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = value;
      row.append(link);
    } else {
      row.append(document.createTextNode(value));
    }
    infoModalBody.append(row);
  });
  if (infoModalDownload) {
    infoModalDownload.href = audioData.src;
    infoModalDownload.innerHTML = DOWNLOAD_ICON;
  }
  infoModal.hidden = false;
};

const createSoundActions = (audioData) => {
  const audioSrc = audioData.src;
  const playButton = document.createElement("button");
  playButton.type = "button";
  playButton.style.position = "relative";
  playButton.style.overflow = "hidden";
  playButton.style.isolation = "isolate";
  const progressFill = document.createElement("span");
  progressFill.style.position = "absolute";
  progressFill.style.inset = "0";
  progressFill.style.background = "#ffffff";
  progressFill.style.transformOrigin = "left center";
  progressFill.style.transform = "scaleX(0)";
  progressFill.style.zIndex = "0";
  progressFill.style.pointerEvents = "none";
  const label = document.createElement("span");
  label.style.position = "relative";
  label.style.zIndex = "1";
  label.style.mixBlendMode = "difference";
  label.style.color = "#ffffff";
  label.style.display = "inline-flex";
  label.style.alignItems = "center";
  label.style.justifyContent = "center";
  playButton.append(progressFill, label);
  let audio = null;
  let progressFrame = null;

  const setProgress = (value) => {
    progressFill.style.transform = `scaleX(${Math.max(0, Math.min(1, value || 0))})`;
  };

  const clearProgressTimer = () => {
    if (!progressFrame) return;
    cancelAnimationFrame(progressFrame);
    progressFrame = null;
  };

  const setPlaying = (isPlaying) => {
    label.innerHTML = isPlaying ? STOP_ICON : PLAY_ICON;
    const icon = label.querySelector("svg");
    if (icon) {
      icon.style.width = "1.35rem";
      icon.style.height = "1.35rem";
      icon.style.display = "block";
    }
    playButton.setAttribute("aria-label", isPlaying ? "Stop audio" : "Play audio");
  };

  const controller = {
    stop: () => {
      clearProgressTimer();
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio = null;
      state.audioControllers.delete(controller);
      setProgress(0);
      setPlaying(false);
    },
  };

  playButton.addEventListener("click", async () => {
    if (audio) {
      controller.stop();
      return;
    }
    audio = new Audio(audioSrc);
    state.audioControllers.add(controller);
    setProgress(0);
    setPlaying(true);
    audio.addEventListener("ended", controller.stop, { once: true });
    audio.addEventListener("error", controller.stop, { once: true });
    const tickProgress = () => {
      if (!audio) return;
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
      progressFrame = requestAnimationFrame(tickProgress);
    };
    progressFrame = requestAnimationFrame(tickProgress);
    try {
      await audio.play();
    } catch {
      controller.stop();
    }
  });

  const actions = document.createElement("div");
  actions.className = "sound-actions";
  setPlaying(false);
  setProgress(0);
  const hasMetadata = Boolean(
    audioData.metadata &&
      (audioData.metadata.rollingStock || audioData.metadata.origin || audioData.metadata.yearCaptured)
  );
  actions.style.gridTemplateColumns = "1fr 2.25rem";
  if (hasMetadata) {
    const infoButton = document.createElement("button");
    infoButton.type = "button";
    infoButton.className = "info-button";
    infoButton.textContent = "i";
    infoButton.setAttribute("aria-label", "Sound info");
    infoButton.style.width = "2.25rem";
    infoButton.style.padding = "0";
    infoButton.addEventListener("click", () => openInfoModal(audioData));
    actions.append(playButton, infoButton);
  } else {
    const downloadButton = document.createElement("a");
    downloadButton.className = "download-button";
    downloadButton.href = audioSrc;
    downloadButton.setAttribute("download", "");
    downloadButton.setAttribute("aria-label", "Download audio");
    downloadButton.innerHTML = DOWNLOAD_ICON;
    actions.append(playButton, downloadButton);
  }
  return actions;
};

const normalizeSystemData = (raw) => {
  const sounds = raw.sounds || {};
  const resolveSoundIds = (soundIds) =>
    Array.isArray(soundIds) ? soundIds.map((id) => sounds[id]).filter(Boolean) : [];
  const resolveItems = (node) =>
    node ? { ...node, items: Array.isArray(node.soundIds) ? resolveSoundIds(node.soundIds) : node.items || [] } : { items: [] };

  const lines = {};
  Object.entries(raw.lines || {}).forEach(([lineId, line]) => {
    lines[lineId] = resolveItems(line);
  });

  const stations = {};
  Object.entries(raw.stations || {}).forEach(([stationId, station]) => {
    stations[stationId] = { ...resolveItems(station), id: stationId };
  });

  return {
    ...raw,
    system: { ...raw.system, items: resolveSoundIds(raw.system.soundIds) },
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

const filterItemsByLine = (items, lineId, station = null) =>
  (items || [])
    .map((item) => {
      const sourceAudio = item.audio || [];
      const filteredAudio = sourceAudio.filter((audio, _, list) => {
        if (!audioMatchesStation(audio, station, lineId)) return false;
        const hasScopedAudio = list.some(
          (entry) =>
            (Array.isArray(entry.lineIds) && entry.lineIds.length) ||
            (Array.isArray(entry.targets) && entry.targets.some((target) => target.lineId))
        );
        if (hasScopedAudio) {
          return (
            (Array.isArray(audio.lineIds) && audio.lineIds.includes(lineId)) ||
            (Array.isArray(audio.targets) &&
              audio.targets.some((target) => target.lineId === lineId))
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
      audio: (item.audio || []).filter((audio) => !audio.lineIds),
    }))
    .filter((item) => item.audio.length > 0);

const renderSoundCards = (container, items) => {
  container.innerHTML = "";
  if (!Array.isArray(items)) return;
  const mergedItems = [];
  const mergedMap = new Map();
  items.forEach((item) => {
    const key = `${item.title}@@${item.description || ""}`;
    const existing = mergedMap.get(key);
    if (existing) {
      existing.audio.push(...(item.audio || []));
    } else {
      const entry = {
        ...item,
        audio: Array.isArray(item.audio) ? [...item.audio] : [],
      };
      mergedItems.push(entry);
      mergedMap.set(key, entry);
    }
  });

  mergedItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "sound-card";
    card.setAttribute("role", "listitem");
    const singleAudio = item.audio.length === 1 ? item.audio[0] : null;
    if (singleAudio) {
      if (item.forceBoxedSingle) {
        const title = document.createElement("h3");
        title.textContent = item.title;
        card.append(title);

        const variations = document.createElement("div");
        variations.className = "sound-variations";
        const row = document.createElement("div");
        row.className = "sound-variation";
        const singleDescription = singleAudio.description || item.description || "";
        const singleTitle = singleAudio.title ? singleAudio.title.trim() : "";
        if (singleTitle && !item.hideSingleAudioTitle) {
          const label = document.createElement("span");
          label.className = singleDescription ? "sound-variation-label" : "sound-group-title";
          label.textContent = singleTitle;
          row.append(label);
        }
        if (singleDescription && singleDescription.trim() !== "") {
          const description = document.createElement("p");
          description.className = "sound-variation-description";
          description.textContent = singleDescription;
          row.append(description);
        }
        row.append(createSoundActions(singleAudio));
        variations.append(row);
        card.append(variations);
        container.append(card);
        return;
      }

      const title = document.createElement("h3");
      title.textContent = item.title;
      card.append(title);

      const singleTitle = singleAudio.title ? singleAudio.title.trim() : "";
      if (singleTitle && !item.hideSingleAudioTitle) {
        const subTitle = document.createElement("div");
        subTitle.className = "sound-group-title";
        subTitle.textContent = singleTitle;
        card.append(subTitle);
      }
      const singleDescription =
        singleAudio.description || item.description || "";
      if (singleDescription && singleDescription.trim() !== "") {
        const desc = document.createElement("p");
        desc.textContent = singleDescription;
        card.append(desc);
      }
      card.append(createSoundActions(singleAudio));
      container.append(card);
      return;
    }

    card.classList.add("sound-card--collapsible");
    if (item.groupTitle && item.groupTitle.trim() !== "") {
      card.classList.add("sound-card--grouped-multi");
    }

    const header = document.createElement("div");
    header.className = "sound-card-header";
    header.setAttribute("role", "button");
    header.tabIndex = 0;
    header.setAttribute("aria-expanded", "false");

    const textWrap = document.createElement("div");
    textWrap.className = "sound-card-title-wrap";

    const title = document.createElement("h3");
    title.textContent = item.title;
    textWrap.append(title);

    if (item.description && item.description.trim() !== "") {
      const subtitle = document.createElement("p");
      subtitle.className = "sound-card-subtitle";
      subtitle.textContent = item.description;
      textWrap.append(subtitle);
    }

    const chevron = document.createElement("span");
    chevron.className = "sound-card-chevron";
    chevron.innerHTML = CHEVRON_DOWN_ICON;
    header.append(textWrap, chevron);

    const content = document.createElement("div");
    content.className = "sound-card-content";
    content.hidden = true;

    if (item.groupTitle && item.groupTitle.trim() !== "") {
      const groupTitle = document.createElement("div");
      groupTitle.className = "sound-group-title";
      groupTitle.textContent = item.groupTitle;
      content.append(groupTitle);
    }

    const variations = document.createElement("div");
    variations.className = "sound-variations";
    item.audio.forEach((audio) => {
      const row = document.createElement("div");
      row.className = "sound-variation";
      if (audio.title && !item.hideSingleAudioTitle) {
        const label = document.createElement("span");
        label.className = "sound-variation-label";
        label.textContent = audio.title;
        row.append(label);
      }
      if (audio.description) {
        const description = document.createElement("p");
        description.className = "sound-variation-description";
        description.textContent = audio.description;
        row.append(description);
      }
      row.append(createSoundActions(audio));
      variations.append(row);
    });
    content.append(variations);

    const toggleCard = () => {
      const willExpand = content.hidden;
      content.hidden = !willExpand;
      card.classList.toggle("is-expanded", willExpand);
      chevron.innerHTML = willExpand ? CHEVRON_UP_ICON : CHEVRON_DOWN_ICON;
      header.setAttribute("aria-expanded", String(willExpand));
    };

    header.addEventListener("click", toggleCard);
    header.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleCard();
      }
    });

    card.append(header, content);
    container.append(card);
  });
};

const renderStationPopup = (stationData) => {
  if (!popupSoundList) return;
  popupTitle.textContent = stationData.name;
  popupSubtitle.textContent = stationLineIds(stationData)
    .map((lineId) => state.systemData.lines[lineId].title)
    .join(", ");
  const stationItems = (stationData.items || [])
    .map((item) => ({
      ...item,
      audio: (item.audio || []).filter((audio) => audioMatchesStation(audio, stationData)),
    }))
    .filter((item) => item.audio.length > 0);
  renderSoundCards(popupSoundList, stationItems);
};

const openPanel = () => {
  sidePanel.hidden = false;
};

const closePanel = () => {
  sidePanel.hidden = true;
  stopActiveAudio();
  clearActive();
};

const showSystemPanel = () => {
  if (!state.systemData) return;
  stopActiveAudio();
  hideMapPopup();
  clearActive();
  panelTitle.textContent = state.systemData.system.name;
  panelSubtitle.textContent = state.systemData.system.description;
  updateLineIcons(panelLineIcons, Object.keys(state.systemData.lines));
  if (panelSystemIcon && state.systemInfo) {
    panelSystemIcon.src = state.systemInfo.logo;
    panelSystemIcon.alt = `${state.systemInfo.name} logo`;
    panelSystemIcon.hidden = false;
  }
  if (panelBack) panelBack.hidden = true;
  renderSoundCards(soundList, filterSystemItems(state.systemData.system.items));
  openPanel();
};

const renderListGrid = (container, items, emptyText) => {
  container.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "list-sounds-grid";
  renderSoundCards(grid, items);
  container.append(grid);
};

const renderSystemListView = () => {
  if (!state.systemData || !systemListView) return;
  const lineEntries = Object.entries(state.systemData.lines);
  const hasLines = lineEntries.length > 0;
  const systemItems = filterSystemItems(state.systemData.system.items);
  const noSystemSounds = !systemItems.length;
  if (state.selectedLineId && !state.systemData.lines[state.selectedLineId]) {
    state.selectedLineId = null;
  }
  if (noSystemSounds && !state.selectedLineId) {
    state.selectedLineId = lineEntries[0] ? lineEntries[0][0] : null;
  }
  const selectedLine = state.selectedLineId ? state.systemData.lines[state.selectedLineId] : null;
  const stationItems = Object.values(state.systemData.stations)
    .filter((station) => state.selectedLineId && stationLineIds(station).includes(state.selectedLineId))
    .sort((a, b) => {
      const aOrder = stationLineOrder(a, state.selectedLineId);
      const bOrder = stationLineOrder(b, state.selectedLineId);
      const aHas = Number.isFinite(aOrder);
      const bHas = Number.isFinite(bOrder);
      if (aHas && bHas) return aOrder - bOrder;
      if (aHas) return -1;
      if (bHas) return 1;
      return 0;
    })
    .map((station) => ({
      ...(() => {
        const scopedItems = filterItemsByLine(station.items, state.selectedLineId, station);
        const uniqueTitles = [...new Set(scopedItems.map((item) => item.title))];
        const commonTitle = uniqueTitles.length === 1 ? uniqueTitles[0] : "";
        return {
          title: station.name,
          description: "",
          groupTitle: commonTitle,
          forceBoxedSingle: true,
          audio: scopedItems.flatMap((item) => {
            const keepSubTitle = item.audio.length > 1;
            return item.audio.map((audio) => ({
              ...audio,
              title: keepSubTitle ? audio.title || item.title : item.title,
              description: audio.description || item.description || "",
            }));
          }),
        };
      })(),
    }))
    .filter((item) => item.audio.length > 0);

  systemListView.innerHTML = `
    <div class="list-top${hasLines ? "" : " no-lines"}">
      <div class="list-head">
        <div class="list-head-main">
          <h2 class="list-title">${state.systemData.system.name}</h2>
          <p class="list-subtitle">${state.systemData.system.description}</p>
        </div>
        <img class="list-head-logo" src="${state.systemInfo.logo}" alt="${state.systemInfo.name} logo" />
      </div>
      <div class="line-selector" id="line-selector"></div>
    </div>
    <section class="list-section" id="line-detail-section" ${selectedLine ? "" : "hidden"}>
      <div class="list-block">
        <h3 class="list-section-title">Line-Specific Sounds</h3>
        <p class="list-section-subtitle" id="list-line-subtitle">${selectedLine ? selectedLine.subtitle : ""}</p>
        <div id="line-sounds-wrap"></div>
      </div>
      <div class="list-block" ${stationItems.length ? "" : "hidden"}>
        <h3 class="list-section-title">Stations</h3>
        <div id="station-sounds-wrap"></div>
      </div>
    </section>
    <section class="list-section" id="system-sounds-section" ${selectedLine ? "hidden" : ""}>
      <h3 class="list-section-title">System Sounds</h3>
      <div id="system-sounds-wrap"></div>
    </section>
  `;

  const lineSelector = document.getElementById("line-selector");
  const maxPerRow = window.matchMedia("(max-width: 720px)").matches ? 2 : 5;
  const rows = [];
  for (let i = 0; i < lineEntries.length; i += maxPerRow) {
    rows.push(lineEntries.slice(i, i + maxPerRow));
  }
  rows.forEach((rowEntries) => {
    const row = document.createElement("div");
    row.className = "line-selector-row";
    rowEntries.forEach(([lineId, line]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "line-chip";
    if (lineId === state.selectedLineId) {
      button.classList.add("is-active");
    }
    const iconWrap = document.createElement("span");
    iconWrap.className = "line-chip-icons";

    const icon = document.createElement("img");
    icon.src = line.icon;
    icon.alt = `${line.title} icon`;
    iconWrap.append(icon);

    if (Array.isArray(line.otherIcons)) {
      line.otherIcons.forEach((iconUrl, index) => {
        const extraIcon = document.createElement("img");
        extraIcon.src = iconUrl;
        extraIcon.alt = `${line.title} extra icon ${index + 1}`;
        iconWrap.append(extraIcon);
      });
    }

    const label = document.createElement("span");
    label.textContent = line.title;
    button.append(iconWrap, label);
    button.addEventListener("click", () => {
      if (noSystemSounds && state.selectedLineId === lineId) {
        return;
      }
      stopActiveAudio();
      state.selectedLineId = state.selectedLineId === lineId ? null : lineId;
      renderSystemListView();
    });
      row.append(button);
    });
    lineSelector.append(row);
  });
  if (selectedLine) {
    const selectedLineItems = filterItemsByLine(selectedLine.items, state.selectedLineId);
    renderListGrid(
      document.getElementById("line-sounds-wrap"),
      selectedLineItems,
      "No line sounds."
    );
    if (stationItems.length) {
      renderListGrid(document.getElementById("station-sounds-wrap"), stationItems, "No station sounds.");
    }
  } else {
    renderListGrid(
      document.getElementById("system-sounds-wrap"),
      systemItems,
      "No system sounds."
    );
  }
};

const setSystemMode = (mode) => {
  if (mode === "map" && !state.mapAvailable) {
    mode = "list";
  }
  if (state.systemMode !== mode) {
    stopActiveAudio();
  }
  hideMapPopup();
  state.systemMode = mode;
  if (viewSystem) {
    viewSystem.classList.toggle("map-mode", mode === "map");
    viewSystem.classList.toggle("list-mode", mode === "list");
  }
  if (modeMapButton) modeMapButton.classList.toggle("is-active", mode === "map");
  if (modeListButton) modeListButton.classList.toggle("is-active", mode === "list");
  if (mode === "list") {
    clearMobileSplitLayout();
    renderSystemListView();
  } else {
    syncMobileSplitLayout();
  }
};

const resetInteractions = () => {
  state.pointers.clear();
  state.pinchLastDist = 0;
  state.moved = false;
  state.panActive = false;
  state.suppressClick = false;
  state.panStartedOnTarget = false;
  state.panStart = { x: 0, y: 0 };
  state.panDownTarget = null;
  const svg = mapContainer.querySelector("svg");
  if (svg) svg.classList.remove("is-panning");
};

const clearMobileSplitLayout = () => {
  if (sidePanel) {
    sidePanel.style.removeProperty("height");
    sidePanel.style.removeProperty("flex-basis");
  }
  if (mapWrap) {
    mapWrap.style.removeProperty("height");
    mapWrap.style.removeProperty("flex");
    mapWrap.style.removeProperty("flex-basis");
  }
};

const isMobileMapMode = () =>
  window.matchMedia("(max-width: 720px)").matches &&
  state.view === "system" &&
  state.systemMode === "map";

const getMaxZoom = () => (window.matchMedia("(max-width: 720px)").matches ? 10.0 : 5.0);
const getDefaultMobileMenuHeight = () => (viewSystem ? viewSystem.clientHeight * 0.5 : 0);

const refreshMobileMenuMinHeight = () => {
  if (!viewSystem || !sidePanel || !sidePanelHead) return;
  const totalHeight = viewSystem.clientHeight || 0;
  const viewRect = viewSystem.getBoundingClientRect();
  const sideRect = sidePanel.getBoundingClientRect();
  const soundListEl = sidePanel.querySelector(".sound-list");
  const separatorOffset = soundListEl
    ? Math.max(0, soundListEl.getBoundingClientRect().top - sideRect.top)
    : sidePanelHead.getBoundingClientRect().height || 0;
  const vv = window.visualViewport;
  const visibleBottomY = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const overlapUnderUi = Math.max(0, viewRect.bottom - visibleBottomY);
  const minMenuPx = separatorOffset + overlapUnderUi;
  state.mobileMinMenuPx = minMenuPx;
  viewSystem.style.setProperty("--mobile-menu-min", `${minMenuPx}px`);
  return totalHeight;
};

const applyMobileMenuHeight = (heightPx) => {
  if (!viewSystem || !sidePanel || !mapWrap) return;
  if (!isMobileMapMode()) return;
  const totalHeight = refreshMobileMenuMinHeight() || viewSystem.clientHeight || 0;
  if (!totalHeight) return;
  const minMenuPx = state.mobileMinMenuPx || 0;
  const maxMenuPx = totalHeight * 0.75;
  const next = clamp(heightPx, minMenuPx, maxMenuPx);
  const mapHeight = Math.max(0, totalHeight - next);
  state.mobileMenuHeightPx = next;
  sidePanel.style.flexBasis = `${next}px`;
  sidePanel.style.height = `${next}px`;
  mapWrap.style.flex = "0 0 auto";
  mapWrap.style.flexBasis = `${mapHeight}px`;
  mapWrap.style.height = `${mapHeight}px`;
};

const syncMobileSplitLayout = () => {
  if (isMobileMapMode()) {
    applyMobileMenuHeight(state.mobileMenuHeightPx || getDefaultMobileMenuHeight());
  } else {
    clearMobileSplitLayout();
  }
};

const resetMobileMenuRatio = () => {
  if (!viewSystem) return;
  const totalHeight = refreshMobileMenuMinHeight() || viewSystem.clientHeight || 0;
  if (!totalHeight) return;
  applyMobileMenuHeight(totalHeight * 0.5);
};

const beginMobileSplitDrag = (dragType, pointerId) => {
  state.splitDragActive = true;
  state.splitDragPointerId = pointerId;
  state.splitDragType = dragType;
  if (viewSystem) viewSystem.classList.add("is-resizing-split");
};

const updateMobileSplitDrag = (clientY) => {
  if (!viewSystem) return;
  const rect = viewSystem.getBoundingClientRect();
  applyMobileMenuHeight(rect.bottom - clientY);
};

const endMobileSplitDrag = () => {
  state.splitDragActive = false;
  state.splitDragPointerId = null;
  state.splitDragType = null;
  if (viewSystem) viewSystem.classList.remove("is-resizing-split");
  applyMobileMenuHeight(state.mobileMenuHeightPx);
};

const onMobileSplitPointerDown = (event) => {
  if (!isMobileMapMode() || !viewSystem || !sidePanelHead) return;
  if (event.target.closest("button, a")) return;
  event.preventDefault();
  beginMobileSplitDrag("pointer", event.pointerId);
};

const onMobileSplitPointerMove = (event) => {
  if (!state.splitDragActive || state.splitDragType !== "pointer") return;
  if (event.pointerId !== state.splitDragPointerId) return;
  event.preventDefault();
  updateMobileSplitDrag(event.clientY);
};

const onMobileSplitPointerUp = (event) => {
  if (!state.splitDragActive || state.splitDragType !== "pointer") return;
  if (event.pointerId !== state.splitDragPointerId) return;
  endMobileSplitDrag();
};

const onMobileSplitTouchStart = (event) => {
  if (!isMobileMapMode() || !viewSystem || !sidePanelHead) return;
  if (event.target.closest("button, a")) return;
  const touch = event.changedTouches && event.changedTouches[0];
  if (!touch) return;
  event.preventDefault();
  beginMobileSplitDrag("touch", touch.identifier);
};

const onMobileSplitTouchMove = (event) => {
  if (!state.splitDragActive || state.splitDragType !== "touch") return;
  const touch = Array.from(event.touches || []).find((t) => t.identifier === state.splitDragPointerId);
  if (!touch) return;
  event.preventDefault();
  updateMobileSplitDrag(touch.clientY);
};

const onMobileSplitTouchEnd = (event) => {
  if (!state.splitDragActive || state.splitDragType !== "touch") return;
  const ended = Array.from(event.changedTouches || []).some(
    (t) => t.identifier === state.splitDragPointerId
  );
  if (!ended) return;
  endMobileSplitDrag();
};

const clearActive = () => {
  document.querySelectorAll(".line.is-active, .station.is-active").forEach((el) => {
    el.classList.remove("is-active");
  });
};

const updateLineIcons = (container, lineIds) => {
  container.innerHTML = "";
  lineIds.forEach((id) => {
    const iconUrl = state.systemData.lines[id].icon;
    const img = document.createElement("img");
    img.className = "line-icon";
    img.alt = `${id} icon`;
    img.src = iconUrl;
    container.append(img);
  });
  container.hidden = lineIds.length === 0;
};

const createMenuCard = ({ image, alt, title, onClick, countryId }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "card";
  if (countryId) button.dataset.country = countryId;

  const imageWrap = document.createElement("span");
  imageWrap.className = "card-image";
  const img = document.createElement("img");
  img.src = image;
  img.alt = alt;
  imageWrap.append(img);

  const titleEl = document.createElement("span");
  titleEl.className = "card-title";
  titleEl.textContent = title;
  button.append(imageWrap, titleEl);
  if (onClick) button.addEventListener("click", onClick);
  return button;
};

const hideMapPopup = () => {
  if (!mapPopup) return;
  mapPopup.hidden = true;
  clearActive();
  stopActiveAudio();
};

const openMapPopup = (content, lineIds) => {
  if (!mapPopup) return;
  popupTitle.textContent = content.title;
  popupSubtitle.textContent = content.subtitle;
  renderSoundCards(popupSoundList, content.items);
  updateLineIcons(popupLineIcons, lineIds);
  mapPopup.hidden = false;
};

const setLine = (lineId, element) => {
  stopActiveAudio();
  clearActive();
  if (element) {
    element.classList.add("is-active");
  }
  const lineData = state.systemData.lines[lineId];
  const lineContent = {
    ...lineData,
    items: filterItemsByLine(lineData.items, lineId),
  };
  openMapPopup(lineContent, [lineId]);
};

const setStation = (stationId, element) => {
  stopActiveAudio();
  clearActive();
  if (element) {
    element.classList.add("is-active");
  }
  const stationData = state.systemData.stations[stationId];
  const iconLineIds = stationLineIds(stationData);
  renderStationPopup(stationData);
  updateLineIcons(popupLineIcons, iconLineIds);
  mapPopup.hidden = false;
};

const findMapTarget = (event) => {
  const path = event.composedPath ? event.composedPath() : [];
  for (const node of path) {
    if (node && node.matches && node.matches(mapSelector)) return node;
  }
  if (event.target && event.target.closest) {
    return event.target.closest(mapSelector);
  }
  return null;
};

const handleMapClick = (event) => {
  if (state.suppressClick) {
    state.suppressClick = false;
    state.panDownTarget = null;
    return;
  }
  if (state.panActive || state.moved) return;
  const target = findMapTarget(event) || state.panDownTarget;
  state.panDownTarget = null;
  if (!target || !mapContainer.contains(target)) {
    if (state.view === "system") {
      clearActive();
      hideMapPopup();
      showSystemPanel();
    }
    return;
  }

  const scope = target.dataset.scope;
  const lineId = target.dataset.line || target.dataset.lineId;
  const stationId = target.dataset.station || target.dataset.stationId;

  if (scope === "line" || lineId) {
    setLine(lineId, target);
  } else if (scope === "station" || stationId) {
    setStation(stationId, target);
  }
};

const updateBreadcrumb = () => {
  if (state.view === "home") {
    crumbCountry.classList.add("is-hidden");
    crumbSystem.classList.add("is-hidden");
    sepCountry.classList.add("is-hidden");
    sepSystem.classList.add("is-hidden");
  } else if (state.view === "country") {
    crumbCountry.classList.remove("is-hidden");
    crumbSystem.classList.add("is-hidden");
    sepCountry.classList.remove("is-hidden");
    sepSystem.classList.add("is-hidden");
  } else {
    crumbCountry.classList.remove("is-hidden");
    crumbSystem.classList.remove("is-hidden");
    sepCountry.classList.remove("is-hidden");
    sepSystem.classList.remove("is-hidden");
  }

  document.querySelectorAll(".crumb").forEach((crumb) => {
    crumb.classList.toggle("is-active", crumb.dataset.view === state.view);
  });
};

const setView = (viewId) => {
  if (state.view !== viewId) {
    stopActiveAudio();
  }
  if (viewId !== "system") {
    state.systemLoadToken += 1;
  }
  hideMapPopup();
  state.view = viewId;
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${viewId}`);
  });
  document.body.classList.toggle("is-system", viewId === "system");
  if (systemModeToggle) {
    systemModeToggle.hidden = viewId !== "system" || !state.systemData || !state.mapAvailable;
  }
  updateBreadcrumb();
  if (viewId !== "system") {
    closePanel();
    viewSystem.classList.remove("map-mode", "list-mode");
  }
};

const makeSvgFocusable = (svg) => {
  svg.querySelectorAll(mapSelector).forEach((el) => {
    el.setAttribute("tabindex", "0");
    el.classList.add("is-focusable");
  });
};

const bringStationsToFront = (svg) => {
  // SVG draw order is DOM order; appending stations moves them above lines.
  svg.querySelectorAll(".station").forEach((stationEl) => {
    stationEl.parentNode.appendChild(stationEl);
  });
};

const applyMapTheme = (svg, theme) => {
  const lineWidth = theme.lineWidth;
  svg.querySelectorAll(".line, .line path").forEach((el) => {
    if (el.tagName.toLowerCase() === "path") {
      if (lineWidth !== undefined) el.style.strokeWidth = `${lineWidth}`;
    }
  });

  svg.querySelectorAll(".line[data-line], .line[data-line-id]").forEach((lineEl) => {
    const key = lineEl.dataset.line || lineEl.dataset.lineId;
    if (theme.lineColors && theme.lineColors[key]) {
      if (lineEl.tagName.toLowerCase() === "path") {
        lineEl.setAttribute("stroke", theme.lineColors[key]);
      } else {
        lineEl.querySelectorAll("path").forEach((path) => {
          path.setAttribute("stroke", theme.lineColors[key]);
        });
      }
    }
  });

  if (theme.station.fill !== undefined) {
    svg.querySelectorAll(".station, .station circle").forEach((el) => {
      if (el.tagName.toLowerCase() === "circle") {
        el.style.fill = `${theme.station.fill}`;
      } else if (el.tagName.toLowerCase() === "g") {
        el.querySelectorAll("circle").forEach((circle) => {
          circle.style.fill = `${theme.station.fill}`;
        });
      }
    });
  }

  if (theme.station.stroke !== undefined) {
    svg.querySelectorAll(".station, .station circle").forEach((el) => {
      if (el.tagName.toLowerCase() === "circle") {
        el.style.stroke = `${theme.station.stroke}`;
      } else if (el.tagName.toLowerCase() === "g") {
        el.querySelectorAll("circle").forEach((circle) => {
          circle.style.stroke = `${theme.station.stroke}`;
        });
      }
    });
  }

  if (theme.station.strokeWidth !== undefined) {
    svg.querySelectorAll(".station, .station circle").forEach((el) => {
      if (el.tagName.toLowerCase() === "circle") {
        el.style.strokeWidth = `${theme.station.strokeWidth}`;
        if (Number(theme.station.strokeWidth) === 0) el.style.stroke = "none";
      } else if (el.tagName.toLowerCase() === "g") {
        el.querySelectorAll("circle").forEach((circle) => {
          circle.style.strokeWidth = `${theme.station.strokeWidth}`;
          if (Number(theme.station.strokeWidth) === 0) circle.style.stroke = "none";
        });
      }
    });
  }

  if (theme.labels.color !== undefined || theme.labels.fontSize !== undefined) {
    svg.querySelectorAll("text").forEach((label) => {
      if (theme.labels.color !== undefined) {
        label.setAttribute("fill", theme.labels.color);
      }
      if (theme.labels.fontSize !== undefined) {
        label.setAttribute("font-size", theme.labels.fontSize);
      }
    });
  }

  // Station sizes/styles from theme.station / theme.transfer / theme.terminus
  svg.querySelectorAll(".station").forEach((stationEl) => {
    const classes = stationEl.classList;
    const stationId = stationEl.dataset.stationId || stationEl.getAttribute("data-station-id");
    const stationData = stationId ? state.systemData?.stations?.[stationId] : null;
    const hasSounds = !!(stationData && Array.isArray(stationData.items) && stationData.items.length);
    const variant = classes.contains("transfer")
      ? theme.transfer
      : classes.contains("terminus")
        ? theme.terminus
        : theme.station;
    const strokeWidthValue = Number(variant.strokeWidth);
    const isStroked = Number.isFinite(strokeWidthValue) && strokeWidthValue > 0;
    const forcedFill = !hasSounds && !isStroked ? "#222222" : undefined;
    const forcedStroke = !hasSounds && isStroked ? "#555555" : undefined;
    const radius = variant.radius;

    if (stationEl.tagName.toLowerCase() === "circle") {
      const value = Number(radius);
      stationEl.setAttribute("r", String(value));
      if (stationEl.r && stationEl.r.baseVal) {
        stationEl.r.baseVal.value = value;
      }
      if (forcedFill !== undefined) {
        stationEl.style.fill = forcedFill;
      } else if (variant.fill !== undefined) {
        stationEl.style.fill = `${variant.fill}`;
      }
      if (forcedStroke !== undefined) {
        stationEl.style.stroke = forcedStroke;
      } else if (variant.stroke !== undefined) {
        stationEl.style.stroke = `${variant.stroke}`;
      }
      if (variant.strokeWidth !== undefined) {
        stationEl.style.strokeWidth = `${variant.strokeWidth}`;
        if (Number(variant.strokeWidth) === 0) stationEl.style.stroke = "none";
      }
      return;
    }

    if (stationEl.tagName.toLowerCase() === "rect") {
      const radiusValue = Number(variant.radius);
      if (Number.isFinite(radiusValue) && radiusValue > 0) {
        const baseX = Number(stationEl.dataset.baseX ?? stationEl.getAttribute("x"));
        const baseY = Number(stationEl.dataset.baseY ?? stationEl.getAttribute("y"));
        const baseWidth = Number(stationEl.dataset.baseWidth ?? stationEl.getAttribute("width"));
        const baseHeight = Number(stationEl.dataset.baseHeight ?? stationEl.getAttribute("height"));
        const baseRx = Number(stationEl.dataset.baseRx ?? stationEl.getAttribute("rx"));
        const baseRy = Number(stationEl.dataset.baseRy ?? stationEl.getAttribute("ry") ?? baseRx);
        const baseRadius = Number(stationEl.dataset.baseRadius ?? baseRx);

        if (!stationEl.dataset.baseX && Number.isFinite(baseX)) stationEl.dataset.baseX = String(baseX);
        if (!stationEl.dataset.baseY && Number.isFinite(baseY)) stationEl.dataset.baseY = String(baseY);
        if (!stationEl.dataset.baseWidth && Number.isFinite(baseWidth)) stationEl.dataset.baseWidth = String(baseWidth);
        if (!stationEl.dataset.baseHeight && Number.isFinite(baseHeight)) stationEl.dataset.baseHeight = String(baseHeight);
        if (!stationEl.dataset.baseRx && Number.isFinite(baseRx)) stationEl.dataset.baseRx = String(baseRx);
        if (!stationEl.dataset.baseRy && Number.isFinite(baseRy)) stationEl.dataset.baseRy = String(baseRy);
        if (!stationEl.dataset.baseRadius && Number.isFinite(baseRadius)) {
          stationEl.dataset.baseRadius = String(baseRadius);
        }

        if (
          Number.isFinite(baseX) &&
          Number.isFinite(baseY) &&
          Number.isFinite(baseWidth) &&
          Number.isFinite(baseHeight) &&
          Number.isFinite(baseRadius) &&
          baseRadius > 0
        ) {
          const scale = radiusValue / baseRadius;
          const nextWidth = baseWidth * scale;
          const nextHeight = baseHeight * scale;
          const centerX = baseX + baseWidth / 2;
          const centerY = baseY + baseHeight / 2;
          stationEl.setAttribute("width", String(nextWidth));
          stationEl.setAttribute("height", String(nextHeight));
          stationEl.setAttribute("x", String(centerX - nextWidth / 2));
          stationEl.setAttribute("y", String(centerY - nextHeight / 2));
          if (Number.isFinite(baseRx)) stationEl.setAttribute("rx", String(baseRx * scale));
          if (Number.isFinite(baseRy)) stationEl.setAttribute("ry", String(baseRy * scale));
        }
      }

      if (forcedFill !== undefined) {
        stationEl.style.fill = forcedFill;
      } else if (variant.fill !== undefined) {
        stationEl.style.fill = `${variant.fill}`;
      }
      if (forcedStroke !== undefined) {
        stationEl.style.stroke = forcedStroke;
      } else if (variant.stroke !== undefined) {
        stationEl.style.stroke = `${variant.stroke}`;
      }
      if (variant.strokeWidth !== undefined) {
        stationEl.style.strokeWidth = `${variant.strokeWidth}`;
        if (Number(variant.strokeWidth) === 0) stationEl.style.stroke = "none";
      }
      return;
    }

    stationEl.querySelectorAll("circle").forEach((circle) => {
      const value = Number(radius);
      circle.setAttribute("r", String(value));
      if (circle.r && circle.r.baseVal) {
        circle.r.baseVal.value = value;
      }
      if (forcedFill !== undefined) {
        circle.style.fill = forcedFill;
      } else if (variant.fill !== undefined) {
        circle.style.fill = `${variant.fill}`;
      }
      if (forcedStroke !== undefined) {
        circle.style.stroke = forcedStroke;
      } else if (variant.stroke !== undefined) {
        circle.style.stroke = `${variant.stroke}`;
      }
      if (variant.strokeWidth !== undefined) {
        circle.style.strokeWidth = `${variant.strokeWidth}`;
        if (Number(variant.strokeWidth) === 0) circle.style.stroke = "none";
      }
    });
  });
};

const initViewBox = (svg, scaleValue) => {
  let vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
  if (!vb || vb.width === 0 || vb.height === 0) {
    const raw = svg.getAttribute("viewBox");
    if (raw) {
      const parts = raw.split(/\s+|,/).map((v) => Number(v));
      vb = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    } else {
      const bbox = svg.getBBox();
      vb = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
    }
  }

  const parsedScale = Number(scaleValue);
  const scale = Number.isFinite(parsedScale) && parsedScale > 1 ? parsedScale : 1;
  const width = vb.width / scale;
  const height = vb.height / scale;
  state.baseViewBox = {
    x: vb.x + (vb.width - width) / 2,
    y: vb.y + (vb.height - height) / 2,
    width,
    height,
  };
  state.viewBox = { ...state.baseViewBox };
  applyViewBox(svg);
};

const applyViewBox = (svg) => {
  const vb = state.viewBox;
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const clampViewBox = (vb, base) => {
  if (vb.width >= base.width || vb.height >= base.height) {
    return {
      x: base.x - (vb.width - base.width) / 2,
      y: base.y - (vb.height - base.height) / 2,
      width: vb.width,
      height: vb.height,
    };
  }
  const maxX = base.x + base.width - vb.width;
  const maxY = base.y + base.height - vb.height;
  return {
    x: clamp(vb.x, base.x, maxX),
    y: clamp(vb.y, base.y, maxY),
    width: vb.width,
    height: vb.height,
  };
};

const clientToSvgPoint = (svg, clientX, clientY) => {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
};

const getPointerList = () => Array.from(state.pointers.values());

const handlePointerDown = (event, svg) => {
  if (event.button !== 0 && event.pointerType !== "touch") return;
  const target = findMapTarget(event);
  state.moved = false;
  state.panActive = true;
  state.panStartedOnTarget = !!target;
  state.panStart = { x: event.clientX, y: event.clientY };
  state.panDownTarget = target || null;
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  svg.setPointerCapture(event.pointerId);

  const pointers = getPointerList();
  if (pointers.length === 1) {
    state.panLast = { x: event.clientX, y: event.clientY };
    if (!state.panStartedOnTarget) {
      svg.classList.add("is-panning");
    }
  } else if (pointers.length === 2) {
    const [a, b] = pointers;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    state.pinchLastDist = Math.hypot(dx, dy);
  }
};

const handlePointerMove = (event, svg) => {
  if (!state.pointers.has(event.pointerId)) return;
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const pointers = getPointerList();
  if (pointers.length === 1) {
    const vb = state.viewBox;
    const base = state.baseViewBox;
    if (!vb || !base) return;
    if (!state.moved) {
      const dx0 = event.clientX - state.panStart.x;
      const dy0 = event.clientY - state.panStart.y;
      if (Math.hypot(dx0, dy0) < 6) {
        state.panLast = { x: event.clientX, y: event.clientY };
        return;
      }
      state.moved = true;
    }
    const scale = vb.width / svg.clientWidth;
    const dx = (event.clientX - state.panLast.x) * scale;
    const dy = (event.clientY - state.panLast.y) * scale;
    state.panLast = { x: event.clientX, y: event.clientY };
    const next = clampViewBox(
      { x: vb.x - dx, y: vb.y - dy, width: vb.width, height: vb.height },
      base
    );
    vb.x = next.x;
    vb.y = next.y;
    applyViewBox(svg);
  } else if (pointers.length === 2) {
    const vb = state.viewBox;
    const base = state.baseViewBox;
    if (!vb || !base) return;
    state.moved = true;
    const [a, b] = pointers;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.hypot(dx, dy);
    if (!state.pinchLastDist) state.pinchLastDist = dist;

    const centerClientX = (a.x + b.x) / 2;
    const centerClientY = (a.y + b.y) / 2;
    const center = clientToSvgPoint(svg, centerClientX, centerClientY);

    const minZoom = 1.0;
    const maxZoom = getMaxZoom();
    const minWidth = base.width / maxZoom;
    const maxWidth = base.width / minZoom;
    const scaleFactor = state.pinchLastDist / dist;
    const nextWidth = clamp(vb.width * scaleFactor, minWidth, maxWidth);
    const ratio = nextWidth / vb.width;

    const next = clampViewBox(
      {
        x: center.x - (center.x - vb.x) * ratio,
        y: center.y - (center.y - vb.y) * ratio,
        width: nextWidth,
        height: vb.height * ratio,
      },
      base
    );
    state.viewBox = next;
    applyViewBox(svg);
    state.pinchLastDist = dist;
  }
};

const handlePointerUp = (event, svg) => {
  if (state.pointers.has(event.pointerId)) {
    state.pointers.delete(event.pointerId);
  }
  const pointers = getPointerList();
  if (pointers.length < 2) {
    state.pinchLastDist = 0;
  }
  if (pointers.length === 1) {
    state.panLast = { x: pointers[0].x, y: pointers[0].y };
  }
  if (pointers.length === 0) {
    svg.classList.remove("is-panning");
    state.suppressClick = state.moved;
    state.moved = false;
    state.panActive = false;
    state.panStartedOnTarget = false;
    state.panStart = { x: 0, y: 0 };
  }
};

const loadMap = async (mapPath, theme) => {
  mapContainer.innerHTML = "";
  try {
    const response = await fetch(mapPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Map fetch failed: ${response.status}`);
    }
    mapContainer.innerHTML = await response.text();
    mapContainer.append(stationTooltip);

    const svg = mapContainer.querySelector("svg");
    if (!svg) throw new Error("Map SVG missing <svg> root");

    svg.setAttribute("role", "img");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.pointerEvents = "all";

    applyMapTheme(svg, theme);
    bringStationsToFront(svg);
    initViewBox(svg, theme.scale);

    // Make elements tabbable + keyboard “Enter” works
    makeSvgFocusable(svg);

    // Ensure clickable cursor
    svg.querySelectorAll(".line, .station").forEach((el) => {
      el.style.cursor = "pointer";
    });

    // IMPORTANT: One event listener (delegation)
    svg.addEventListener("click", handleMapClick);
    svg.addEventListener("keydown", (event) => {
      if (event.key === "Enter") handleMapClick(event);
    });

    const showStationTooltip = (event, target) => {
      if (!target || !target.classList.contains("station")) return;
      const stationId = target.dataset.stationId || target.getAttribute("data-station-id");
      const name = state.systemData.stations[stationId].name;
      if (!name) return;
      stationTooltip.textContent = name;
      stationTooltip.classList.add("is-visible");
      moveStationTooltip(event);
    };

    const hideStationTooltip = () => {
      stationTooltip.classList.remove("is-visible");
    };

    const moveStationTooltip = (event) => {
      const rect = mapContainer.getBoundingClientRect();
      stationTooltip.style.left = `${event.clientX - rect.left}px`;
      stationTooltip.style.top = `${event.clientY - rect.top}px`;
    };

    svg.addEventListener("pointermove", (event) => {
      const target = findMapTarget(event);
      if (target && target.classList.contains("station")) {
        showStationTooltip(event, target);
      } else {
        hideStationTooltip();
      }
    });

    svg.addEventListener("pointerleave", () => {
      hideStationTooltip();
    });

    svg.addEventListener("pointerdown", (event) => handlePointerDown(event, svg));
    svg.addEventListener("pointermove", (event) => handlePointerMove(event, svg));
    svg.addEventListener("pointerup", (event) => handlePointerUp(event, svg));
    svg.addEventListener("pointercancel", (event) => handlePointerUp(event, svg));
    svg.addEventListener("pointerleave", (event) => handlePointerUp(event, svg));
    return true;
  } catch (error) {
    mapContainer.innerHTML = `<p style=\"color:#9aa0a6;\">Failed to load map. If you're opening the file directly, run a local server and reload.</p>`;
    return false;
  }
};

const loadSystem = async (system) => {
  const loadToken = ++state.systemLoadToken;
  stopActiveAudio();
  const [systemDataRaw, soundDataRaw] = await Promise.all([
    fetch(system.data).then((res) => res.json()),
    fetch(system.soundData).then((res) => res.json()),
  ]);
  if (loadToken !== state.systemLoadToken) return;
  state.systemInfo = system;
  state.systemData = normalizeSystemData({ ...systemDataRaw, sounds: soundDataRaw });
  state.selectedLineId = null;
  let mapAvailable = false;
  if (system.map) {
    mapAvailable = await loadMap(system.map, state.systemData.theme);
    if (loadToken !== state.systemLoadToken) return;
  } else {
    mapContainer.innerHTML = "";
  }
  state.mapAvailable = mapAvailable;
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const defaultMode = isMobile ? "list" : "map";
  const preferredMode = userSystemMode || defaultMode;
  setSystemMode(state.mapAvailable ? preferredMode : "list");
  showSystemPanel();
  setView("system");
  if (state.mapAvailable && !isMobile) {
    resetMobileMenuRatio();
  }
  if (state.view !== "system") {
    if (systemModeToggle) systemModeToggle.hidden = true;
    return;
  }
  if (systemModeToggle) {
    systemModeToggle.hidden = !state.mapAvailable || state.view !== "system";
  }
};

const renderCountries = (countries) => {
  countryGrid.innerHTML = "";
  countries.forEach((country) => {
    const button = createMenuCard({
      image: country.image,
      alt: `${country.name} flag`,
      title: country.name,
      countryId: country.id,
      onClick: async () => {
        const data = await fetch(country.data).then((res) => res.json());
        crumbCountry.textContent = country.name;
        renderSystems(Object.values(data));
        setView("country");
      },
    });
    countryGrid.append(button);
  });
};

const renderSystems = (regions) => {
  systemGrid.innerHTML = "";
  regions.forEach((region) => {
    const group = document.createElement("section");
    group.className = "region-group";

    const title = document.createElement("h3");
    title.className = "region-title";
    title.textContent = region.name;

    const grid = document.createElement("div");
    grid.className = "card-grid region-grid";

    region.systems.forEach((system) => {
      const button = createMenuCard({
        image: system.logo,
        alt: `${system.name} logo`,
        title: system.name,
        onClick: () => {
          crumbSystem.textContent = system.name;
          loadSystem(system);
        },
      });
      grid.append(button);
    });

    group.append(title, grid);
    systemGrid.append(group);
  });
};

const init = async () => {
  const response = await fetch("data/countries.json");
  const data = await response.json();
  renderCountries(data.countries);
  crumbCountry.textContent = "";
  crumbSystem.textContent = "";

  document.querySelectorAll(".crumb").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  if (panelBack) {
    panelBack.addEventListener("click", () => {
      showSystemPanel();
    });
  }
  if (popupClose) {
    popupClose.addEventListener("click", () => {
      clearActive();
      hideMapPopup();
      showSystemPanel();
    });
  }
  if (modeMapButton) {
    modeMapButton.addEventListener("click", () => {
      userSystemMode = "map";
      setSystemMode("map");
    });
  }
  if (modeListButton) {
    modeListButton.addEventListener("click", () => {
      userSystemMode = "list";
      setSystemMode("list");
    });
  }
  if (infoModalClose) infoModalClose.addEventListener("click", closeInfoModal);
  if (infoModalBackdrop) infoModalBackdrop.addEventListener("click", closeInfoModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeInfoModal();
  });
  if (sidePanelHead) {
    sidePanelHead.addEventListener("pointerdown", onMobileSplitPointerDown);
    sidePanelHead.addEventListener("touchstart", onMobileSplitTouchStart, { passive: false });
  }
  window.addEventListener("pointermove", onMobileSplitPointerMove);
  window.addEventListener("pointerup", onMobileSplitPointerUp);
  window.addEventListener("pointercancel", onMobileSplitPointerUp);
  window.addEventListener("touchmove", onMobileSplitTouchMove, { passive: false });
  window.addEventListener("touchend", onMobileSplitTouchEnd, { passive: false });
  window.addEventListener("touchcancel", onMobileSplitTouchEnd, { passive: false });
  window.addEventListener("resize", syncMobileSplitLayout);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncMobileSplitLayout);
    window.visualViewport.addEventListener("scroll", syncMobileSplitLayout);
  }
  // List mode line reset is handled by clicking the active line chip again.
  window.addEventListener("blur", resetInteractions);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetInteractions();
  });

  mapContainer.addEventListener(
    "wheel",
    (event) => {
      if (state.view !== "system") return;
      const svg = mapContainer.querySelector("svg");
      if (!svg) return;
      event.preventDefault();
      const vb = state.viewBox;
      const base = state.baseViewBox;
      if (!vb || !base) return;

      const mouse = clientToSvgPoint(svg, event.clientX, event.clientY);

      const minZoom = 1.0;
      const maxZoom = getMaxZoom();
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
      const minWidth = base.width / maxZoom;
      const maxWidth = base.width / minZoom;
      const nextWidth = clamp(vb.width * zoomFactor, minWidth, maxWidth);
      const nextHeight = (nextWidth / vb.width) * vb.height;

      const ratio = nextWidth / vb.width;
      const next = clampViewBox(
        {
          x: mouse.x - (mouse.x - vb.x) * ratio,
          y: mouse.y - (mouse.y - vb.y) * ratio,
          width: nextWidth,
          height: nextHeight,
        },
        base
      );

      state.viewBox = next;
      applyViewBox(svg);
    },
    { passive: false }
  );

  resetMobileMenuRatio();
  setView("home");
};

init();
