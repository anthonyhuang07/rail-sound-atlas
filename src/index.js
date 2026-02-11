const soundList = document.getElementById("sound-list");
const panelTitle = document.getElementById("panel-title");
const panelSubtitle = document.getElementById("panel-subtitle");
const sidePanel = document.getElementById("side-panel");
const countryGrid = document.getElementById("country-grid");
const systemGrid = document.getElementById("system-grid");
const mapContainer = document.getElementById("map-container");
const crumbCountry = document.getElementById("crumb-country");
const crumbSystem = document.getElementById("crumb-system");
const countryTitle = document.getElementById("country-title");
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
const systemListView = document.getElementById("system-list-view");
const mapSelector = "[data-scope], [data-line], [data-line-id], [data-station], [data-station-id]";

const stationTooltip = document.createElement("div");
stationTooltip.className = "station-tooltip";

const state = {
  activeAudio: null,
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
};

const stopActiveAudio = () => {
  if (state.activeAudio) {
    state.activeAudio.pause();
    state.activeAudio.currentTime = 0;
    state.activeAudio = null;
  }
};

const playSound = async (audioPath) => {
  stopActiveAudio();
  const audio = new Audio(audioPath);
  state.activeAudio = audio;
  await audio.play();
};

const renderSoundCards = (container, items) => {
  container.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "sound-card";
    card.setAttribute("role", "listitem");

    const title = document.createElement("h3");
    title.textContent = item.title;

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.textContent = "Play";
    playButton.addEventListener("click", () => playSound(item.audio));

    const downloadLink = document.createElement("a");
    downloadLink.className = "download-button";
    downloadLink.href = item.audio;
    downloadLink.setAttribute("download", "");
    downloadLink.setAttribute("aria-label", "Download audio");
    downloadLink.innerHTML =
      "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4.01 4a1 1 0 0 1-1.38 0l-4.01-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1zm-7 14a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z\"/></svg>";

    const actions = document.createElement("div");
    actions.className = "sound-actions";
    actions.append(playButton, downloadLink);

    card.append(title);
    if (item.description && item.description.trim() !== "") {
      const desc = document.createElement("p");
      desc.textContent = item.description;
      card.append(desc);
    }
    card.append(actions);
    container.append(card);
  });
};

const renderPanelContent = (titleEl, subtitleEl, listEl, content) => {
  titleEl.textContent = content.title;
  subtitleEl.textContent = content.subtitle;
  renderSoundCards(listEl, content.items);
};

const renderStationPopup = (stationData) => {
  if (!popupSoundList) return;
  popupTitle.textContent = stationData.title;
  popupSubtitle.textContent = stationData.subtitle;
  popupSoundList.innerHTML = "";
  popupSoundList.classList.remove("is-grouped");

  const stationItems = stationData.items || [];
  const lineIds = stationData.lineIds || [];
  if (lineIds.length <= 1) {
    renderSoundCards(popupSoundList, stationItems);
    return;
  }

  let rendered = 0;
  popupSoundList.classList.add("is-grouped");
  lineIds.forEach((lineId) => {
    const lineItems = stationItems.filter((item) => {
      if (!item.lineIds) return false;
      return item.lineIds.includes(lineId);
    });
    if (!lineItems.length) return;
    const block = document.createElement("div");
    block.className = "popup-block";

    const title = document.createElement("h3");
    title.className = "popup-block-title";
    title.textContent = state.systemData.lines[lineId]?.title || "";

    const list = document.createElement("div");
    list.className = "popup-block-list";
    renderSoundCards(list, lineItems);

    block.append(title, list);
    popupSoundList.append(block);
    rendered += lineItems.length;
  });

  if (!rendered) {
    popupSoundList.classList.remove("is-grouped");
    renderSoundCards(popupSoundList, stationItems);
  }
};

const openPanel = () => {
  sidePanel.hidden = false;
};

const closePanel = () => {
  sidePanel.hidden = true;
  stopActiveAudio();
  clearActive();
};

const setPanelMode = (mode) => {
  if (!panelBack) return;
  panelBack.hidden = mode !== "detail";
  if (panelSystemIcon) {
    panelSystemIcon.hidden = mode !== "system";
  }
};

const showSystemPanel = () => {
  if (!state.systemData) return;
  stopActiveAudio();
  hideMapPopup();
  clearActive();
  panelTitle.textContent = state.systemData.system.name;
  panelSubtitle.textContent = state.systemData.systemSounds.subtitle;
  updateLineIcons(panelLineIcons, Object.keys(state.systemData.lines));
  if (panelSystemIcon && state.systemInfo) {
    panelSystemIcon.src = state.systemInfo.logo;
    panelSystemIcon.alt = `${state.systemInfo.name} logo`;
  }
  renderSoundCards(soundList, state.systemData.systemSounds.items);
  setPanelMode("system");
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
  const noSystemSounds = !state.systemData.systemSounds.items.length;
  if (state.selectedLineId && !state.systemData.lines[state.selectedLineId]) {
    state.selectedLineId = null;
  }
  if (noSystemSounds && !state.selectedLineId) {
    state.selectedLineId = lineEntries[0] ? lineEntries[0][0] : null;
  }
  const selectedLine = state.selectedLineId ? state.systemData.lines[state.selectedLineId] : null;
  const stationItems = Object.values(state.systemData.stations)
    .filter((station) => state.selectedLineId && station.lineIds.includes(state.selectedLineId))
    .sort((a, b) => {
      const aOrder = a.lineOrder ? a.lineOrder[state.selectedLineId] : undefined;
      const bOrder = b.lineOrder ? b.lineOrder[state.selectedLineId] : undefined;
      const aHas = Number.isFinite(aOrder);
      const bHas = Number.isFinite(bOrder);
      if (aHas && bHas) return aOrder - bOrder;
      if (aHas) return -1;
      if (bHas) return 1;
      return 0;
    })
    .flatMap((station) =>
      station.items
        .filter((item) => {
          if (!item.lineIds) return true;
          return item.lineIds.includes(state.selectedLineId);
        })
        .map((item) => ({
          title: `${station.title} - ${item.title}`,
          description: item.description,
          audio: item.audio,
        }))
    );

  systemListView.innerHTML = `
    <div class="list-top">
      <div class="list-head">
        <div class="list-head-main">
          <h2 class="list-title">${state.systemData.system.name}</h2>
          <p class="list-subtitle">${state.systemData.systemSounds.subtitle}</p>
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
  lineEntries.forEach(([lineId, line]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "line-chip";
    if (lineId === state.selectedLineId) {
      button.classList.add("is-active");
    }
    const icon = document.createElement("img");
    icon.src = line.icon;
    icon.alt = `${line.title} icon`;
    const label = document.createElement("span");
    label.textContent = line.title;
    button.append(icon, label);
    button.addEventListener("click", () => {
      stopActiveAudio();
      if (noSystemSounds && state.selectedLineId === lineId) {
        return;
      }
      state.selectedLineId = state.selectedLineId === lineId ? null : lineId;
      renderSystemListView();
    });
    lineSelector.append(button);
  });
  if (selectedLine) {
    renderListGrid(
      document.getElementById("line-sounds-wrap"),
      selectedLine.items,
      "No line sounds."
    );
    if (stationItems.length) {
      renderListGrid(document.getElementById("station-sounds-wrap"), stationItems, "No station sounds.");
    }
  } else {
    renderListGrid(
      document.getElementById("system-sounds-wrap"),
      state.systemData.systemSounds.items,
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
  const viewSystem = document.getElementById("view-system");
  viewSystem.classList.toggle("map-mode", mode === "map");
  viewSystem.classList.toggle("list-mode", mode === "list");
  if (modeMapButton) modeMapButton.classList.toggle("is-active", mode === "map");
  if (modeListButton) modeListButton.classList.toggle("is-active", mode === "list");
  if (mode === "list") {
    renderSystemListView();
  }
};

const resetInteractions = () => {
  state.pointers.clear();
  state.pinchLastDist = 0;
  state.moved = false;
  state.panActive = false;
  state.suppressClick = false;
  const svg = mapContainer.querySelector("svg");
  if (svg) svg.classList.remove("is-panning");
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
    img.width = 18;
    img.height = 18;
    img.src = iconUrl;
    container.append(img);
  });
  container.hidden = lineIds.length === 0;
};

const hideMapPopup = () => {
  if (!mapPopup) return;
  mapPopup.hidden = true;
  clearActive();
  stopActiveAudio();
};

const openMapPopup = (content, lineIds, event, element) => {
  if (!mapPopup) return;
  popupSoundList.classList.remove("is-grouped");
  renderPanelContent(popupTitle, popupSubtitle, popupSoundList, content);
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
  openMapPopup(lineData, [lineId]);
};

const setStation = (stationId, element) => {
  stopActiveAudio();
  clearActive();
  if (element) {
    element.classList.add("is-active");
  }
  const stationData = state.systemData.stations[stationId];
  const iconLineIds = stationData.lineIds;
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
    return;
  }
  if (state.panActive || state.moved) return;
  const target = findMapTarget(event);
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
  const sepCountry = document.querySelector(".crumb-sep[data-sep=country]");
  const sepSystem = document.querySelector(".crumb-sep[data-sep=system]");

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
    const viewSystem = document.getElementById("view-system");
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
    const variant = classes.contains("transfer")
      ? theme.transfer
      : classes.contains("terminus")
        ? theme.terminus
        : theme.station;
    const radius = variant.radius;

    if (stationEl.tagName.toLowerCase() === "circle") {
      const value = Number(radius);
      stationEl.setAttribute("r", String(value));
      if (stationEl.r && stationEl.r.baseVal) {
        stationEl.r.baseVal.value = value;
      }
      if (variant.fill !== undefined) stationEl.style.fill = `${variant.fill}`;
      if (variant.stroke !== undefined) stationEl.style.stroke = `${variant.stroke}`;
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
      if (variant.fill !== undefined) circle.style.fill = `${variant.fill}`;
      if (variant.stroke !== undefined) circle.style.stroke = `${variant.stroke}`;
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
  if (target) return;
  state.moved = false;
  state.panActive = true;
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  svg.setPointerCapture(event.pointerId);

  const pointers = getPointerList();
  if (pointers.length === 1) {
    state.panLast = { x: event.clientX, y: event.clientY };
    svg.classList.add("is-panning");
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
    state.moved = true;
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
    const maxZoom = 5.0;
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
    state.suppressClick = state.panActive && state.moved;
    state.moved = false;
    state.panActive = false;
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
      const name = target.dataset.name || target.getAttribute("data-name");
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
  const systemData = await fetch(system.sounds).then((res) => res.json());
  if (loadToken !== state.systemLoadToken) return;
  state.systemInfo = system;
  state.systemData = systemData;
  state.selectedLineId = null;
  let mapAvailable = false;
  if (system.map) {
    mapAvailable = await loadMap(system.map, systemData.theme);
    if (loadToken !== state.systemLoadToken) return;
  } else {
    mapContainer.innerHTML = "";
  }
  state.mapAvailable = mapAvailable;
  setSystemMode(state.mapAvailable ? "map" : "list");
  showSystemPanel();
  setView("system");
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.dataset.country = country.id;
    if (country.comingSoon === true) {
      button.dataset.comingSoon = "true";
      button.disabled = true;
    }
    const imageWrap = document.createElement("span");
    imageWrap.className = "card-image";
    const img = document.createElement("img");
    img.src = country.image;
    img.alt = `${country.name} flag`;
    imageWrap.append(img);
    if (country.comingSoon === true) {
      const overlay = document.createElement("span");
      overlay.className = "coming-soon";
      overlay.textContent = "COMING SOON";
      imageWrap.append(overlay);
    }
    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = country.name;
    button.append(imageWrap, title);
    if (!button.disabled) {
      button.addEventListener("click", async () => {
        const data = await fetch(country.data).then((res) => res.json());
        crumbCountry.textContent = data.country.name;
        if (countryTitle) {
          countryTitle.textContent = data.country.name;
        }
        renderSystems(data.systems);
        setView("country");
      });
    }
    countryGrid.append(button);
  });
};

const renderSystems = (systems) => {
  systemGrid.innerHTML = "";
  systems.forEach((system) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    if (system.comingSoon === true) {
      button.dataset.comingSoon = "true";
      button.disabled = true;
    }
    const imageWrap = document.createElement("span");
    imageWrap.className = "card-image";
    const img = document.createElement("img");
    img.src = system.logo;
    img.alt = `${system.name} logo`;
    imageWrap.append(img);
    if (system.comingSoon === true) {
      const overlay = document.createElement("span");
      overlay.className = "coming-soon";
      overlay.textContent = "COMING SOON";
      imageWrap.append(overlay);
    }
    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = system.name;
    button.append(imageWrap, title);
    if (!button.disabled) {
      button.addEventListener("click", () => {
        crumbSystem.textContent = system.name;
        loadSystem(system);
      });
    }
    systemGrid.append(button);
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
    modeMapButton.addEventListener("click", () => setSystemMode("map"));
  }
  if (modeListButton) {
    modeListButton.addEventListener("click", () => setSystemMode("list"));
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

      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());
      const mouseX = svgPoint.x;
      const mouseY = svgPoint.y;

      const minZoom = 1.0;
      const maxZoom = 5.0;
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
      const minWidth = base.width / maxZoom;
      const maxWidth = base.width / minZoom;
      const nextWidth = clamp(vb.width * zoomFactor, minWidth, maxWidth);
      const nextHeight = (nextWidth / vb.width) * vb.height;

      const ratio = nextWidth / vb.width;
      const next = clampViewBox(
        {
          x: mouseX - (mouseX - vb.x) * ratio,
          y: mouseY - (mouseY - vb.y) * ratio,
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

  setView("home");
};

init();
