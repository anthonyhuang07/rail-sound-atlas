export const dom = {
  countryGrid: document.getElementById("country-grid"),
  systemGrid: document.getElementById("system-grid"),
  viewHome: document.getElementById("view-home"),
  viewCountry: document.getElementById("view-country"),
  viewSystem: document.getElementById("view-system"),
  homeLoading: document.getElementById("home-loading"),
  countryLoading: document.getElementById("country-loading"),
  systemLoading: document.getElementById("system-loading"),
  crumbHome: document.getElementById("crumb-home"),
  crumbCountry: document.getElementById("crumb-country"),
  crumbSystem: document.getElementById("crumb-system"),
  surpriseButton: document.getElementById("surprise-button"),
  historyToggle: document.getElementById("history-toggle"),
  historyActiveButton: document.getElementById("history-active"),
  historyHistoricalButton: document.getElementById("history-historical"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  modalClose: document.getElementById("modal-close"),
  modalBackdrop: document.getElementById("modal-backdrop"),
  modalAction: document.getElementById("modal-action"),
  aboutButton: document.getElementById("about-button"),
  systemContent: document.getElementById("system-content"),
  sepCountry: document.querySelector(".crumb-sep[data-sep=country]"),
  sepSystem: document.querySelector(".crumb-sep[data-sep=system]"),
};

export const DOWNLOAD_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4.01 4a1 1 0 0 1-1.38 0l-4.01-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1zm-7 14a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z\"/></svg>";

export const GITHUB_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M12 .5C5.7.5.7 5.6.7 11.9c0 5 3.2 9.2 7.6 10.7.6.1.8-.3.8-.6v-2.2c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1.1.8 2.6.9.3-.7.4-1.2.7-1.5-2.5-.3-5.2-1.3-5.2-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.3v3.4c0 .3.2.7.8.6 4.4-1.5 7.6-5.7 7.6-10.7C23.3 5.6 18.3.5 12 .5z\"/></svg>";

export const PLAY_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M8 6.5v11a1 1 0 0 0 1.5.86l8.5-5.5a1 1 0 0 0 0-1.72l-8.5-5.5A1 1 0 0 0 8 6.5z\"/></svg>";

export const STOP_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 7h10v10H7z\"/></svg>";

export const LOADING_SPINNER = "<span class=\"play-spinner\" aria-hidden=\"true\"></span>";

export const CHEVRON_DOWN_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M6.7 9.3a1 1 0 0 1 1.4 0L12 13.2l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.7a1 1 0 0 1 0-1.4z\"/></svg>";

export const CHEVRON_UP_ICON =
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M17.3 14.7a1 1 0 0 1-1.4 0L12 10.8l-3.9 3.9a1 1 0 1 1-1.4-1.4l4.6-4.6a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z\"/></svg>";
