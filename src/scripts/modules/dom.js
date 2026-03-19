const sidePanel = document.getElementById("side-panel");

export const dom = {
  soundList: document.getElementById("sound-list"),
  panelTitle: document.getElementById("panel-title"),
  panelSubtitle: document.getElementById("panel-subtitle"),
  sidePanel,
  countryGrid: document.getElementById("country-grid"),
  systemGrid: document.getElementById("system-grid"),
  mapContainer: document.getElementById("map-container"),
  crumbHome: document.getElementById("crumb-home"),
  crumbCountry: document.getElementById("crumb-country"),
  crumbSystem: document.getElementById("crumb-system"),
  panelLineIcons: document.getElementById("panel-line-icons"),
  panelBack: document.getElementById("panel-back"),
  panelSystemIcon: document.getElementById("panel-system-icon"),
  mapPopup: document.getElementById("map-popup"),
  popupTitle: document.getElementById("popup-title"),
  popupSubtitle: document.getElementById("popup-subtitle"),
  popupLineIcons: document.getElementById("popup-line-icons"),
  popupSoundList: document.getElementById("popup-sound-list"),
  popupClose: document.getElementById("popup-close"),
  systemModeToggle: document.getElementById("system-mode-toggle"),
  modeMapButton: document.getElementById("mode-map"),
  modeListButton: document.getElementById("mode-list"),
  historyToggle: document.getElementById("history-toggle"),
  historyActiveButton: document.getElementById("history-active"),
  historyHistoricalButton: document.getElementById("history-historical"),
  infoModal: document.getElementById("info-modal"),
  infoModalBody: document.getElementById("info-modal-body"),
  infoModalClose: document.getElementById("info-modal-close"),
  infoModalBackdrop: document.getElementById("info-modal-backdrop"),
  infoModalDownload: document.getElementById("info-modal-download"),
  systemListView: document.getElementById("system-list-view"),
  viewSystem: document.getElementById("view-system"),
  mapWrap: document.querySelector("#view-system .map-wrap"),
  sidePanelHead: sidePanel ? sidePanel.querySelector(".side-panel-head") : null,
  sepCountry: document.querySelector(".crumb-sep[data-sep=country]"),
  sepSystem: document.querySelector(".crumb-sep[data-sep=system]"),
  mapSelector: "[data-scope], [data-line], [data-line-id], [data-station], [data-station-id]",
};

export const stationTooltip = document.createElement("div");
stationTooltip.className = "station-tooltip";

export const DOWNLOAD_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4.01 4a1 1 0 0 1-1.38 0l-4.01-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1zm-7 14a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z\"/></svg>";

export const PLAY_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M8 6.5v11a1 1 0 0 0 1.5.86l8.5-5.5a1 1 0 0 0 0-1.72l-8.5-5.5A1 1 0 0 0 8 6.5z\"/></svg>";

export const STOP_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 7h10v10H7z\"/></svg>";

export const LOADING_SPINNER = "<span class=\"play-spinner\" aria-hidden=\"true\"></span>";

export const CHEVRON_DOWN_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M6.7 9.3a1 1 0 0 1 1.4 0L12 13.2l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.7a1 1 0 0 1 0-1.4z\"/></svg>";

export const CHEVRON_UP_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M17.3 14.7a1 1 0 0 1-1.4 0L12 10.8l-3.9 3.9a1 1 0 1 1-1.4-1.4l4.6-4.6a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z\"/></svg>";
