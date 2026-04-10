import { dom, stationTooltip, DOWNLOAD_ICON, PLAY_ICON, STOP_ICON, LOADING_SPINNER, CHEVRON_DOWN_ICON, CHEVRON_UP_ICON } from "./modules/dom.js";
import { getLineSoundIds, fetchSystemData, fetchSoundData, fetchCountries, fetchCountrySystems, getStorageAudioUrl } from "./modules/data.js";
import { parseRouteHash, pushRoute } from "./modules/routing.js";
import { createSoundFilters } from "./modules/filters.js";
import { createMapLogic } from "./modules/map.js";

const {
  soundList,
  panelTitle,
  panelSubtitle,
  sidePanel,
  countryGrid,
  systemGrid,
  mapContainer,
  crumbHome,
  crumbCountry,
  crumbSystem,
  panelLineIcons,
  panelBack,
  panelSystemIcon,
  mapPopup,
  popupTitle,
  popupSubtitle,
  popupLineIcons,
  popupSoundList,
  popupClose,
  systemModeToggle,
  modeMapButton,
  modeListButton,
  historyToggle,
  historyActiveButton,
  historyHistoricalButton,
  infoModal,
  infoModalBody,
  infoModalClose,
  infoModalBackdrop,
  infoModalDownload,
  systemListView,
  viewSystem,
  mapWrap,
  sidePanelHead,
  sepCountry,
  sepSystem,
  mapSelector,
} = dom;

let userSystemMode = null;

const state = {
  audioControllers: new Set(),
  view: "home",
  countries: [],
  countrySystems: {},
  selectedCountryId: null,
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
  historyMode: "active",
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

const {
  normalizeSystemData,
  stationLineIds,
  stationLineOrder,
  getVisibleStationItems,
  stationHasVisibleSounds,
  filterItemsByLine,
  filterSystemItems,
  stationItemsForLine,
  lineVisibleInCurrentMode,
} = createSoundFilters(state);

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
    infoModalDownload.href = getStorageAudioUrl(audioData.src);
    infoModalDownload.innerHTML = DOWNLOAD_ICON;
  }
  infoModal.hidden = false;
};

const createSoundActions = (audioData) => {
  const audioSrc = getStorageAudioUrl(audioData.src);
  const actions = document.createElement("div");
  actions.className = "sound-actions";
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
  let isLoading = false;
  let isScrubbing = false;
  let pendingSeekRatio = null;
  let pointerDown = false;
  let pointerMoved = false;
  let pointerId = null;
  let pointerStartX = 0;
  let suppressClick = false;

  const setProgress = (value) => {
    const clamped = Math.max(0, Math.min(1, value || 0));
    progressFill.style.transform = `scaleX(${clamped})`;
  };

  const clearProgressTimer = () => {
    if (!progressFrame) return;
    cancelAnimationFrame(progressFrame);
    progressFrame = null;
  };

  const setButtonVisual = (mode) => {
    label.innerHTML = mode === "loading" ? LOADING_SPINNER : mode === "playing" ? STOP_ICON : PLAY_ICON;
    const icon = label.querySelector("svg");
    if (icon) {
      icon.style.width = "1.35rem";
      icon.style.height = "1.35rem";
      icon.style.display = "block";
    }
    playButton.setAttribute(
      "aria-label",
      mode === "loading" ? "Loading audio" : mode === "playing" ? "Stop audio" : "Play audio"
    );
  };

  const setLoading = (loading) => {
    isLoading = loading;
    playButton.disabled = loading;
    setButtonVisual(loading ? "loading" : audio ? "playing" : "idle");
  };

  const tickProgress = () => {
    if (!audio) return;
    if (!isScrubbing) setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    progressFrame = requestAnimationFrame(tickProgress);
  };

  const ratioFromClientX = (clientX) => {
    const rect = playButton.getBoundingClientRect();
    if (!rect.width) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const seekToRatio = (ratio) => {
    const clamped = Math.max(0, Math.min(1, ratio || 0));
    setProgress(clamped);
    if (!audio) return;
    if (audio.duration && Number.isFinite(audio.duration)) {
      audio.currentTime = audio.duration * clamped;
    } else {
      pendingSeekRatio = clamped;
    }
  };

  const controller = {
    stop: () => {
      clearProgressTimer();
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio = null;
      isLoading = false;
      pendingSeekRatio = null;
      state.audioControllers.delete(controller);
      setProgress(0);
      playButton.disabled = false;
      setButtonVisual("idle");
    },
  };

  const togglePlayback = async () => {
    if (isLoading) return;
    if (audio) {
      controller.stop();
      return;
    }
    audio = new Audio(audioSrc);
    audio.preload = "none";
    state.audioControllers.add(controller);
    setProgress(0);
    setLoading(true);
    audio.addEventListener("ended", controller.stop, { once: true });
    audio.addEventListener("error", controller.stop, { once: true });
    audio.addEventListener("loadedmetadata", () => {
      if (pendingSeekRatio === null || !audio || !audio.duration) return;
      audio.currentTime = audio.duration * pendingSeekRatio;
      pendingSeekRatio = null;
    }, { once: true });
    try {
      await audio.play();
      setLoading(false);
      setButtonVisual("playing");
      clearProgressTimer();
      progressFrame = requestAnimationFrame(tickProgress);
    } catch {
      controller.stop();
    }
  };

  playButton.addEventListener("pointerdown", (event) => {
    if (isLoading) return;
    pointerDown = true;
    pointerMoved = false;
    pointerId = event.pointerId;
    pointerStartX = event.clientX;
    if (audio) {
      isScrubbing = true;
      playButton.setPointerCapture(pointerId);
    }
    event.stopPropagation();
  });

  playButton.addEventListener("pointermove", (event) => {
    if (!pointerDown || event.pointerId !== pointerId || !audio) return;
    if (Math.abs(event.clientX - pointerStartX) > 4) pointerMoved = true;
    if (pointerMoved) seekToRatio(ratioFromClientX(event.clientX));
    event.stopPropagation();
  });

  const finishPointer = (event) => {
    if (!pointerDown || event.pointerId !== pointerId) return;
    if (audio && pointerMoved) {
      seekToRatio(ratioFromClientX(event.clientX));
      suppressClick = true;
    }
    if (playButton.hasPointerCapture(pointerId)) {
      playButton.releasePointerCapture(pointerId);
    }
    pointerDown = false;
    pointerMoved = false;
    pointerId = null;
    isScrubbing = false;
    event.stopPropagation();
  };

  playButton.addEventListener("pointerup", finishPointer);
  playButton.addEventListener("pointercancel", finishPointer);

  playButton.addEventListener("click", async (event) => {
    if (suppressClick) {
      suppressClick = false;
      event.stopPropagation();
      return;
    }
    await togglePlayback();
    event.stopPropagation();
  });

  setButtonVisual("idle");
  setProgress(0);
  actions.style.gridTemplateColumns = "1fr 2.25rem";
  const hasMetadata = Boolean(
    audioData.metadata &&
    (audioData.metadata.rollingStock || audioData.metadata.origin || audioData.metadata.yearCaptured)
  );
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
    .filter((lineId) => lineVisibleInCurrentMode(lineId))
    .map((lineId) => state.systemData.lines[lineId].title)
    .join(", ");
  const stationItems = getVisibleStationItems(stationData);
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
  updateLineIcons(
    panelLineIcons,
    Object.keys(state.systemData.lines).filter((lineId) => lineVisibleInCurrentMode(lineId))
  );
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
  const lineEntries = Object.entries(state.systemData.lines).filter(([lineId]) =>
    lineVisibleInCurrentMode(lineId)
  );
  const hasLines = lineEntries.length > 0;
  const systemItems = filterSystemItems(state.systemData.system.items);
  const noSystemSounds = !systemItems.length;
  const requireLineSelection = noSystemSounds && lineEntries.length === 1;
  if (state.selectedLineId && !state.systemData.lines[state.selectedLineId]) {
    state.selectedLineId = null;
  }
  if (requireLineSelection && !state.selectedLineId) {
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
        const scopedItems = stationItemsForLine(station, state.selectedLineId);
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
      const iconUrls = [line.icon, ...(Array.isArray(line.otherIcons) ? line.otherIcons : [])].filter(Boolean);
      iconUrls.forEach((iconUrl, index) => {
        const icon = document.createElement("img");
        icon.src = iconUrl;
        icon.alt = `${line.title} icon ${index + 1}`;
        iconWrap.append(icon);
      });

      const label = document.createElement("span");
      label.textContent = line.title;
      if (iconUrls.length) button.append(iconWrap);
      button.append(label);
      button.addEventListener("click", () => {
        if (requireLineSelection && state.selectedLineId === lineId) {
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
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
    if (!iconUrl) return;
    const img = document.createElement("img");
    img.className = "line-icon";
    img.alt = `${id} icon`;
    img.src = iconUrl;
    container.append(img);
  });
  container.hidden = container.children.length === 0;
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
  if (!lineVisibleInCurrentMode(lineId)) return;
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
  const iconLineIds = stationLineIds(stationData).filter((lineId) => lineVisibleInCurrentMode(lineId));
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
  const isMobile = window.matchMedia("(max-width: 720px)").matches;

  crumbHome.classList.remove("is-hidden");

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

    if (isMobile) {
      crumbHome.classList.add("is-hidden");
      sepCountry.classList.add("is-hidden");
    }
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
  if (historyToggle) {
    historyToggle.hidden = viewId !== "system";
  }
  updateBreadcrumb();
  if (viewId !== "system") {
    closePanel();
    viewSystem.classList.remove("map-mode", "list-mode");
  }
};

const setHistoryMode = (mode) => {
  state.historyMode = mode === "historical" ? "historical" : "active";
  historyActiveButton?.classList.toggle("is-active", state.historyMode === "active");
  historyHistoricalButton?.classList.toggle("is-active", state.historyMode === "historical");
  if (state.view === "system" && state.systemData) {
    stopActiveAudio();
    hideMapPopup();
    state.selectedLineId = null;
    clearActive();
    const svg = mapContainer.querySelector("svg");
    if (svg) {
      applyMapTheme(svg, state.systemData.theme);
      bringStationsToFront(svg);
    }
    if (state.systemMode === "list") {
      renderSystemListView();
    } else {
      showSystemPanel();
    }
  }
};

const {
  resetInteractions,
  bringStationsToFront,
  applyMapTheme,
  loadMap,
  handleWheel,
} = createMapLogic({
  state,
  mapContainer,
  stationTooltip,
  mapSelector,
  lineVisibleInCurrentMode,
  stationHasVisibleSounds,
  findMapTarget,
  handleMapClick,
});

const loadSystem = async (system) => {
  const loadToken = ++state.systemLoadToken;
  state.historyMode = "active";
  historyActiveButton?.classList.add("is-active");
  historyHistoricalButton?.classList.remove("is-active");
  stopActiveAudio();
  const [systemDataRaw, soundDataRaw] = await Promise.all([
    fetchSystemData(system.id),
    fetchSoundData(system.id),
  ]);
  if (loadToken !== state.systemLoadToken) return;
  state.systemInfo = system;
  state.systemData = normalizeSystemData({ ...systemDataRaw, sounds: soundDataRaw });
  Object.entries(state.systemData.lines).forEach(([lineId, line]) => {
    line.items = Object.values(state.systemData.sounds || {})
      .map(sound => ({
        ...sound,
        audio: (sound.audio || []).filter(
          a => (a.lineIds || []).includes(lineId) && !a.targets?.length
        )
      }))
      .filter(sound => sound.audio.length);
  });
  Object.entries(state.systemData.stations).forEach(([stationId, station]) => {
  station.items = Object.values(state.systemData.sounds || {})
    .map(sound => ({
      ...sound,
      audio: (sound.audio || []).filter(
        a => a.targets?.some(t => t.stationId === stationId)
      )
    }))
    .filter(sound => sound.audio.length);
  });
  state.selectedLineId = null;
  let mapAvailable = false;
  const mapPath = systemDataRaw.mapUrl

  if (mapPath) {
    mapAvailable = await loadMap(mapPath, state.systemData.theme);
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

const findCountryById = (countryId) => state.countries.find((country) => country.id === countryId) || null;

const ensureCountrySystems = async (countryId) => {
  if (!state.countrySystems[countryId]) {
    state.countrySystems[countryId] = await fetchCountrySystems(countryId);
  }
  return state.countrySystems[countryId];
};

const findSystemInRegions = (regions, systemId) => {
  for (const region of regions || []) {
    const system = (region.systems || []).find((entry) => entry.id === systemId);
    if (system) return system;
  }
  return null;
};

const openHomeView = () => {
  state.selectedCountryId = null;
  crumbCountry.textContent = "";
  crumbSystem.textContent = "";
  setView("home");
};

const openCountryView = async (countryId) => {
  const country = findCountryById(countryId);
  if (!country) {
    openHomeView();
    return;
  }
  const regions = await ensureCountrySystems(countryId);
  state.selectedCountryId = countryId;
  crumbCountry.textContent = country.name;
  crumbSystem.textContent = "";
  renderSystems(regions);
  setView("country");
};

const openSystemView = async (countryId, systemId) => {
  const country = findCountryById(countryId);
  if (!country) {
    openHomeView();
    return;
  }
  const regions = await ensureCountrySystems(countryId);
  const system = findSystemInRegions(regions, systemId);
  if (!system) {
    await openCountryView(countryId);
    return;
  }
  state.selectedCountryId = countryId;
  crumbCountry.textContent = country.name;
  crumbSystem.textContent = system.name;
  renderSystems(regions);
  await loadSystem(system);
};

const navigateTo = async (route, push = true) => {
  if (route.view === "home") {
    openHomeView();
  } else if (route.view === "country") {
    await openCountryView(route.countryId);
  } else if (route.view === "system") {
    await openSystemView(route.countryId, route.systemId);
  }
  if (push) pushRoute(route);
};

const renderCountries = (countries) => {
  countryGrid.innerHTML = "";
  countries.forEach((country) => {
    const button = createMenuCard({
      image: country.image,
      alt: `${country.name} flag`,
      title: country.name,
      countryId: country.id,
      onClick: () => navigateTo({ view: "country", countryId: country.id }, true),
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
        onClick: () => navigateTo({ view: "system", countryId: state.selectedCountryId, systemId: system.id }, true),
      });
      grid.append(button);
    });

    group.append(title, grid);
    systemGrid.append(group);
  });
};

const init = async () => {
  const countries = await fetchCountries();
  state.countries = countries;
  renderCountries(countries);
  crumbCountry.textContent = "";
  crumbSystem.textContent = "";

  crumbHome.addEventListener("click", () => navigateTo({ view: "home" }, true));
  crumbCountry.addEventListener("click", () => {
    if (state.selectedCountryId) {
      navigateTo({ view: "country", countryId: state.selectedCountryId }, true);
    } else {
      navigateTo({ view: "home" }, true);
    }
  });
  crumbSystem.addEventListener("click", () => {
    if (state.selectedCountryId && state.systemInfo?.id) {
      navigateTo({ view: "system", countryId: state.selectedCountryId, systemId: state.systemInfo.id }, true);
    }
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
  if (historyActiveButton) {
    historyActiveButton.addEventListener("click", () => {
      setHistoryMode("active");
    });
  }
  if (historyHistoricalButton) {
    historyHistoricalButton.addEventListener("click", () => {
      setHistoryMode("historical");
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
  window.addEventListener("resize", () => {
    syncMobileSplitLayout();
    updateBreadcrumb();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncMobileSplitLayout);
    window.visualViewport.addEventListener("scroll", syncMobileSplitLayout);
  }
  window.addEventListener("popstate", async (event) => {
    const route = event.state || parseRouteHash();
    await navigateTo(route, false);
  });
  // List mode line reset is handled by clicking the active line chip again.
  window.addEventListener("blur", resetInteractions);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetInteractions();
  });

  mapContainer.addEventListener(
    "wheel",
    handleWheel,
    { passive: false }
  );

  resetMobileMenuRatio();
  setHistoryMode("active");
  const initialRoute = parseRouteHash();
  await navigateTo(initialRoute, false);
  pushRoute(initialRoute, true);
};

init();
