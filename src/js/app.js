const soundList = document.getElementById("sound-list");
const panelTitle = document.getElementById("panel-title");
const panelSubtitle = document.getElementById("panel-subtitle");
const sidePanel = document.getElementById("side-panel");
const closePanelButton = document.getElementById("close-panel");
const countryGrid = document.getElementById("country-grid");
const systemGrid = document.getElementById("system-grid");
const mapContainer = document.getElementById("map-container");
const crumbCountry = document.getElementById("crumb-country");
const crumbSystem = document.getElementById("crumb-system");
const countryTitle = document.getElementById("country-title");
const panelLineIcons = document.getElementById("panel-line-icons");

const state = {
  data: null,
  audioContext: null,
  activeAudio: null,
  view: "home",
  country: null,
  system: null,
  systemSounds: null,
  systemTheme: null,
  viewBox: null,
  baseViewBox: null,
  pointers: new Map(),
  panLast: { x: 0, y: 0 },
  pinchLastDist: 0,
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

const renderList = (content) => {
  panelTitle.textContent = content.title;
  panelSubtitle.textContent = content.subtitle;
  soundList.innerHTML = "";

  content.items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "sound-card";
    card.setAttribute("role", "listitem");

    const title = document.createElement("h3");
    title.textContent = item.title;

    const desc = document.createElement("p");
    desc.textContent = item.description;

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.textContent = "Play";
    playButton.addEventListener("click", () => playSound(item.audio));

    card.append(title, desc, playButton);
    soundList.append(card);
  });
};

const openPanel = () => {
  sidePanel.hidden = false;
};

const closePanel = () => {
  sidePanel.hidden = true;
  stopActiveAudio();
  clearActive();
};

const clearActive = () => {
  document.querySelectorAll(".line.is-active, .station.is-active").forEach((el) => {
    el.classList.remove("is-active");
  });
};

const updatePanelIcons = (lineIds) => {
  panelLineIcons.innerHTML = "";
  lineIds.forEach((id) => {
    const iconUrl = state.systemSounds.lines[id].icon;
    const img = document.createElement("img");
    img.className = "line-icon";
    img.alt = `${id} icon`;
    img.width = 18;
    img.height = 18;
    img.src = iconUrl;
    panelLineIcons.append(img);
  });
  panelLineIcons.hidden = lineIds.length === 0;
};

const setLine = (lineId, element) => {
  clearActive();
  if (element) {
    element.classList.add("is-active");
  }
  const lineData = state.systemSounds.lines[lineId];
  updatePanelIcons([lineId]);
  renderList(lineData);
  openPanel();
};

const setStation = (stationId, element) => {
  clearActive();
  if (element) {
    element.classList.add("is-active");
  }
  const stationData = state.systemSounds.stations[stationId];
  const iconLineIds = stationData.lineIds;
  updatePanelIcons(iconLineIds);
  renderList(stationData);
  openPanel();
};

const findMapTarget = (event) => {
  const path = event.composedPath ? event.composedPath() : [];
  const selector =
    "[data-scope], [data-line], [data-line-id], [data-station], [data-station-id]";
  for (const node of path) {
    if (node && node.matches && node.matches(selector)) return node;
  }
  if (event.target && event.target.closest) {
    return event.target.closest(selector);
  }
  return null;
};

const handleMapClick = (event) => {
  const target = findMapTarget(event);
  if (!target || !mapContainer.contains(target)) return;

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
  state.view = viewId;
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${viewId}`);
  });
  updateBreadcrumb();
  if (viewId !== "system") {
    closePanel();
    stopActiveAudio();
  }
};

const makeSvgFocusable = (svg) => {
  // Make stations/lines keyboard accessible
  svg
    .querySelectorAll("[data-scope], [data-line], [data-line-id], [data-station], [data-station-id]")
    .forEach((el) => {
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

  // Station sizes/styles from mapTheme.station / mapTheme.transfer / mapTheme.terminus
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

const initViewBox = (svg) => {
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

  state.baseViewBox = { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
  state.viewBox = { ...state.baseViewBox };
  applyViewBox(svg);
};

const applyViewBox = (svg) => {
  const vb = state.viewBox;
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
    const scale = vb.width / svg.clientWidth;
    const dx = (event.clientX - state.panLast.x) * scale;
    const dy = (event.clientY - state.panLast.y) * scale;
    state.panLast = { x: event.clientX, y: event.clientY };
    vb.x -= dx;
    vb.y -= dy;
    applyViewBox(svg);
  } else if (pointers.length === 2) {
    const vb = state.viewBox;
    const base = state.baseViewBox;
    if (!vb || !base) return;
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

    const nextX = center.x - (center.x - vb.x) * ratio;
    const nextY = center.y - (center.y - vb.y) * ratio;
    state.viewBox = { x: nextX, y: nextY, width: nextWidth, height: vb.height * ratio };
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

    const svg = mapContainer.querySelector("svg");
    if (!svg) throw new Error("Map SVG missing <svg> root");

    svg.setAttribute("role", "img");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.pointerEvents = "all";

    applyMapTheme(svg, theme);
    bringStationsToFront(svg);
    initViewBox(svg);

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

    svg.addEventListener("pointerdown", (event) => handlePointerDown(event, svg));
    svg.addEventListener("pointermove", (event) => handlePointerMove(event, svg));
    svg.addEventListener("pointerup", (event) => handlePointerUp(event, svg));
    svg.addEventListener("pointercancel", (event) => handlePointerUp(event, svg));
    svg.addEventListener("pointerleave", (event) => handlePointerUp(event, svg));

  } catch (error) {
    mapContainer.innerHTML = `<p style=\"color:#9aa0a6;\">Failed to load map. If you're opening the file directly, run a local server and reload.</p>`;
    console.error(error);
  }
};

const loadSystem = async (system) => {
  const systemData = await fetch(system.sounds).then((res) => res.json());
  state.system = system;
  state.systemSounds = systemData.sounds;
  state.systemTheme = systemData.mapTheme;

  panelTitle.textContent = systemData.system.name;
  panelSubtitle.textContent = "Select a line or station to view sounds.";
  updatePanelIcons([]);
  soundList.innerHTML = "";
  closePanel();

  await loadMap(system.map, state.systemTheme);
  setView("system");
};

const renderCountries = (countries) => {
  countryGrid.innerHTML = "";
  countries.forEach((country) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.dataset.country = country.id;
    const image = country.image;
    button.innerHTML = `
      <span class="card-image">
        <img src="${image}" alt="${country.name} flag" />
      </span>
      <span class="card-title">${country.name}</span>
    `;
    button.addEventListener("click", async () => {
      const data = await fetch(country.data).then((res) => res.json());
      state.country = data;
      crumbCountry.textContent = data.country.name;
      if (countryTitle) {
        countryTitle.textContent = data.country.name;
      }
      renderSystems(data.systems);
      setView("country");
    });
    countryGrid.append(button);
  });
};

const renderSystems = (systems) => {
  systemGrid.innerHTML = "";
  systems.forEach((system) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    const logo = system.logo;
    button.innerHTML = `
      <span class="card-image">
        <img src="${logo}" alt="${system.name} logo" />
      </span>
      <span class="card-title">${system.name}</span>
    `;
    button.addEventListener("click", () => {
      crumbSystem.textContent = system.name;
      loadSystem(system);
    });
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

  closePanelButton.addEventListener("click", closePanel);

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
      const nextX = mouseX - (mouseX - vb.x) * ratio;
      const nextY = mouseY - (mouseY - vb.y) * ratio;

      state.viewBox = { x: nextX, y: nextY, width: nextWidth, height: nextHeight };
      applyViewBox(svg);
    },
    { passive: false }
  );

  setView("home");
};

init();
