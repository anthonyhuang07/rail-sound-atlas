export const createMapLogic = ({
  state,
  mapContainer,
  stationTooltip,
  mapSelector,
  lineVisibleInCurrentMode,
  stationHasVisibleSounds,
  findMapTarget,
  handleMapClick,
}) => {
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

  const getMaxZoom = () => (window.matchMedia("(max-width: 720px)").matches ? 10.0 : 5.0);

  const makeSvgFocusable = (svg) => {
    svg.querySelectorAll(mapSelector).forEach((el) => {
      el.setAttribute("tabindex", "0");
      el.classList.add("is-focusable");
    });
  };

  const bringStationsToFront = (svg) => {
    svg.querySelectorAll(".station").forEach((stationEl) => {
      stationEl.parentNode.appendChild(stationEl);
    });
  };

  const applyMapTheme = (svg, theme) => {
    const lineWidth = theme.lineWidth;
    svg.querySelectorAll(".line, .line path").forEach((el) => {
      if (el.tagName.toLowerCase() === "path" && lineWidth !== undefined) {
        el.style.strokeWidth = `${lineWidth}`;
      }
    });

    svg.querySelectorAll(".line[data-line], .line[data-line-id]").forEach((lineEl) => {
      const key = lineEl.dataset.line || lineEl.dataset.lineId;
      lineEl.style.display = lineVisibleInCurrentMode(key) ? "" : "none";
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

    svg.querySelectorAll(".station").forEach((stationEl) => {
      const classes = stationEl.classList;
      const stationId = stationEl.dataset.stationId || stationEl.getAttribute("data-station-id");
      const hasSounds = stationId ? stationHasVisibleSounds(stationId) : false;
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
        if (stationEl.r && stationEl.r.baseVal) stationEl.r.baseVal.value = value;
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
          if (!stationEl.dataset.baseRadius && Number.isFinite(baseRadius)) stationEl.dataset.baseRadius = String(baseRadius);

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
        if (circle.r && circle.r.baseVal) circle.r.baseVal.value = value;
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
      if (!state.panStartedOnTarget) svg.classList.add("is-panning");
    } else if (pointers.length === 2) {
      const [a, b] = pointers;
      state.pinchLastDist = Math.hypot(a.x - b.x, a.y - b.y);
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
      const next = clampViewBox({ x: vb.x - dx, y: vb.y - dy, width: vb.width, height: vb.height }, base);
      vb.x = next.x;
      vb.y = next.y;
      applyViewBox(svg);
      return;
    }

    if (pointers.length === 2) {
      const vb = state.viewBox;
      const base = state.baseViewBox;
      if (!vb || !base) return;
      state.moved = true;
      const [a, b] = pointers;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!state.pinchLastDist) state.pinchLastDist = dist;

      const center = clientToSvgPoint(svg, (a.x + b.x) / 2, (a.y + b.y) / 2);
      const minWidth = base.width / getMaxZoom();
      const nextWidth = clamp(vb.width * (state.pinchLastDist / dist), minWidth, base.width);
      const ratio = nextWidth / vb.width;
      const next = clampViewBox(
        {
          x: center.x - (center.x - vb.x) * ratio,
          y: center.y - (center.y - vb.y) * ratio,
          width: nextWidth,
          height: vb.height * ratio,
        },
        base,
      );
      state.viewBox = next;
      applyViewBox(svg);
      state.pinchLastDist = dist;
    }
  };

  const handlePointerUp = (event, svg) => {
    if (state.pointers.has(event.pointerId)) state.pointers.delete(event.pointerId);
    const pointers = getPointerList();
    if (pointers.length < 2) state.pinchLastDist = 0;
    if (pointers.length === 1) state.panLast = { x: pointers[0].x, y: pointers[0].y };
    if (!pointers.length) {
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
      if (!response.ok) throw new Error(`Map fetch failed: ${response.status}`);
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
      makeSvgFocusable(svg);
      svg.querySelectorAll(".line, .station").forEach((el) => {
        el.style.cursor = "pointer";
      });

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

      svg.addEventListener("pointerleave", hideStationTooltip);
      svg.addEventListener("pointerdown", (event) => handlePointerDown(event, svg));
      svg.addEventListener("pointermove", (event) => handlePointerMove(event, svg));
      svg.addEventListener("pointerup", (event) => handlePointerUp(event, svg));
      svg.addEventListener("pointercancel", (event) => handlePointerUp(event, svg));
      svg.addEventListener("pointerleave", (event) => handlePointerUp(event, svg));
      return true;
    } catch {
      mapContainer.innerHTML =
        '<p style="color:#9aa0a6;">Failed to load map. If you\'re opening the file directly, run a local server and reload.</p>';
      return false;
    }
  };

  const handleWheel = (event) => {
    if (state.view !== "system") return;
    const svg = mapContainer.querySelector("svg");
    if (!svg) return;
    event.preventDefault();
    const vb = state.viewBox;
    const base = state.baseViewBox;
    if (!vb || !base) return;

    const mouse = clientToSvgPoint(svg, event.clientX, event.clientY);
    const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
    const minWidth = base.width / getMaxZoom();
    const nextWidth = clamp(vb.width * zoomFactor, minWidth, base.width);
    const nextHeight = (nextWidth / vb.width) * vb.height;
    const ratio = nextWidth / vb.width;
    const next = clampViewBox(
      {
        x: mouse.x - (mouse.x - vb.x) * ratio,
        y: mouse.y - (mouse.y - vb.y) * ratio,
        width: nextWidth,
        height: nextHeight,
      },
      base,
    );

    state.viewBox = next;
    applyViewBox(svg);
  };

  return {
    resetInteractions,
    getMaxZoom,
    bringStationsToFront,
    applyMapTheme,
    clientToSvgPoint,
    clampViewBox,
    applyViewBox,
    loadMap,
    handleWheel,
  };
};
