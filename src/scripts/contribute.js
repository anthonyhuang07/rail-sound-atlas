const SUPABASE_URL = "https://mvsfcsodvtojqrmvsjbi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dnRHPIzJ2rVP8sgygNBkHg_dmr0OxBh";
const VERIFY_SUBMISSION_URL = `${SUPABASE_URL}/functions/v1/verify-submission`;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const el = id => document.getElementById(id);

const countrySelect = el("country");
const systemSelect = el("system");
const scopeSelect = el("scope");
const soundActiveSelect = el("sound-active");
const lineList = el("line");
const stationSelect = el("station");
const stationLabel = el("station-label");
const soundSelect = el("sound");
const audioInput = el("audio");
const submitForm = el("submit-form");
const submitButton = submitForm?.querySelector('button[type="submit"]');

const targetSection = el("target-section");
const metadataSection = el("metadata-section");
const fileSection = el("file-section");
const audioGuidelines = el("audio-guidelines");
const systemLabel = el("system-label");
const systemOptions = el("system-options");
const scopeLabelRow = el("scope-label-row");
const soundActiveLabelRow = el("sound-active-label-row");
const soundLabelRow = el("sound-label-row");
const soundPicker = el("sound-picker");
const lineGroup = el("line-group");
const stationGroup = el("station-group");
const lineLabel = el("line-label");
const lineMultiHint = el("line-multi-hint");
const newStationToggle = el("new-station-toggle");
const newStationGroup = el("new-station-group");
const newStationInput = el("new-station");
const newStationOrderInput = el("new-station-order");
const newStationHasOtherLinesInput = el("new-station-has-other-lines");
const newStationOtherLinesGroup = el("new-station-other-lines-group");
const newStationOtherLinesList = el("new-station-other-lines");
const addOtherLineButton = el("add-other-line");
const newSoundToggle = el("new-sound-toggle");
const newSoundInput = el("new-sound");
const newSoundDescriptionInput = el("new-sound-description");
const soundCategoryDescription = el("sound-category-description");
const soundLabelText = el("sound-label");
const titleInput = el("title");
const titleWarning = el("title-warning");
const descriptionInput = el("description");
const descriptionLabel = descriptionInput?.previousElementSibling;
const rollingStockInput = el("rolling_stock");
const sourceInput = el("source");
const audioWarning = el("audio-warning");
const audioDropzone = el("audio-dropzone");
const yearCapturedInput = el("year_captured");

const MAX_FILE_SIZE = 1024 * 1024;
const FILE_SIZE_ERROR = "File must be 1MB or smaller.";
const ALLOWED_EXTENSIONS = ["mp3", "wav", "ogg", "flac", "m4a", "aac"];
const EMPTY_SELECT = `<option value="">Select</option>`;
const SELECT_LINE = `<option>Select Line</option>`;
const SUBMISSION_DRAFT_KEY = "rsa_contribute_submission_draft_v1";

const state = {
  isCreatingNewStation: false,
  lastValidAudioFile: null,
  cachedSystemLines: [],
  cooldownUntil: 0,
  cooldownTimer: null,
  cooldownSubmitted: false,
};

const RECENT_SUBMISSION_FINGERPRINTS_KEY = "rsa_recent_submission_fingerprints";
const COOLDOWN_SECONDS = 10;
const recentSubmissionFingerprints = new Set(
  JSON.parse(sessionStorage.getItem(RECENT_SUBMISSION_FINGERPRINTS_KEY) || "[]")
);

const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeText = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();
const capitalizeFirstWordStart = (value) =>
  value.replace(/^(\s*[^\p{L}]*)\p{Ll}/u, (match, prefix) => prefix + match.slice(prefix.length).toUpperCase());
const TITLE_CASE_MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to", "vs", "via"
]);
const toTitleCase = (value) => {
  const words = value.trim().split(/\s+/);
  return words
    .map((word, index) => {
      const isLast = index === words.length - 1;
      const lower = word.toLowerCase();
      if (index !== 0 && !isLast && TITLE_CASE_MINOR_WORDS.has(lower)) return lower;
      if (word === word.toUpperCase() && /[A-Z]{2,}/.test(word)) return word;
      return lower.replace(/^([^\p{L}]*)\p{L}/u, (m, p) => p + m.slice(p.length).toUpperCase());
    })
    .join(" ");
};
const normalizeWords = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const getSelectedLines = () =>
  [...lineList.querySelectorAll('input[name="line"]:checked')].map(input => input.value);

const setFieldVisibility = (labelEl, inputEl, visible) => {
  labelEl.classList.toggle("hidden", !visible);
  inputEl.classList.toggle("hidden", !visible);
  inputEl.disabled = !visible;
  if (inputEl === soundPicker) {
    soundSelect.disabled = !visible || newSoundToggle.classList.contains("active");
  }
};

const setSystemVisibility = (visible) => {
  systemLabel.classList.toggle("hidden", !visible);
  systemOptions.classList.toggle("hidden", !visible);
  systemSelect.disabled = !visible;
};

const setScopeVisibility = (visible) => {
  scopeLabelRow.classList.toggle("hidden", !visible);
  scopeSelect.classList.toggle("hidden", !visible);
  scopeSelect.disabled = !visible;
  soundActiveLabelRow.classList.toggle("hidden", !visible);
  soundActiveSelect.classList.toggle("hidden", !visible);
  soundActiveSelect.disabled = !visible;
};

const fillSelect = (select, rows, label = "name") => {
  select.innerHTML = EMPTY_SELECT;
  (rows || []).forEach((row) => {
    const option = document.createElement("option");
    option.value = row.id;
    option.textContent = row[label];
    select.append(option);
  });
};

const setStationInputsDisabled = (disabled) => {
  stationSelect.disabled = disabled;
  if (newStationToggle) newStationToggle.disabled = disabled;
};

const resetDropzoneText = () => {
  audioDropzone.innerHTML = `<p>Drag and drop audio</p><p>or click to choose a file</p>`;
};

const setDropzoneFileName = (name) => {
  audioDropzone.innerHTML = `<p>${name}</p><p>click to change file</p>`;
};

const showAudioError = (message) => {
  audioWarning.textContent = message;
  audioWarning.classList.remove("hidden");
  audioInput.setCustomValidity(message);
};

const clearAudioError = () => {
  audioWarning.textContent = "";
  audioWarning.classList.add("hidden");
  audioInput.setCustomValidity("");
};

const setAudioFile = (file) => {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  audioInput.files = transfer.files;
};

const forceCapitalizedFirstWord = (input) => {
  if (!input) return;
  input.value = capitalizeFirstWordStart(input.value);
};
const forceTitleCase = (input) => {
  if (!input) return;
  input.value = toTitleCase(input.value);
};

const validateAudioFile = (file) => {
  if (!file) return "Please select an audio file.";

  const extension = file.name.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "";

  const isAllowedExtension = ALLOWED_EXTENSIONS.includes(extension);
  const isAudioMime = file.type.startsWith("audio/");

  if (!isAllowedExtension && !isAudioMime) return "Only audio files are allowed.";
  if (file.size > MAX_FILE_SIZE) return FILE_SIZE_ERROR;
  return "";
};

const validateCurrentAudioSelection = () => {
  const file = audioInput.files[0];
  const error = validateAudioFile(file);

  if (error) {
    if (error === FILE_SIZE_ERROR && state.lastValidAudioFile) {
      setAudioFile(state.lastValidAudioFile);
      setDropzoneFileName(state.lastValidAudioFile.name);
    } else {
      audioInput.value = "";
      resetDropzoneText();
    }
    showAudioError(error);
    return false;
  }

  state.lastValidAudioFile = file;
  setDropzoneFileName(file.name);
  clearAudioError();
  return true;
};

const validateYearCaptured = () => {
  const value = yearCapturedInput.value.trim();
  if (!value) {
    yearCapturedInput.setCustomValidity("");
    return true;
  }
  const year = Number(value);
  const currentYear = new Date().getFullYear();
  const valid = Number.isInteger(year) && year >= 1800 && year <= currentYear;
  yearCapturedInput.setCustomValidity(valid ? "" : `Year must be between 1800 and ${currentYear}.`);
  return valid;
};

const resetNewStationFields = () => {
  newStationInput.value = "";
  newStationOrderInput.value = "";
  newStationHasOtherLinesInput.checked = false;
  newStationOtherLinesGroup.classList.add("hidden");
  newStationOtherLinesList.innerHTML = "";
};

const setNewStationMode = (enabled) => {
  state.isCreatingNewStation = enabled;
  newStationGroup.classList.toggle("hidden", !enabled);
  stationSelect.classList.toggle("hidden", enabled);
  newStationInput.classList.toggle("hidden", !enabled);
  stationSelect.required = !enabled;
  newStationInput.required = enabled;
  if (enabled) stationSelect.value = "";
  if (newStationToggle) {
    newStationToggle.classList.toggle("active", enabled);
    newStationToggle.textContent = "New Station";
  }
  if (stationLabel) stationLabel.textContent = enabled ? "New Station Name" : "Station";
  if (!enabled) resetNewStationFields();
};

const resetSoundSelectionState = () => {
  setFieldVisibility(soundLabelRow, soundPicker, false);
  setNewSoundMode(false);
  newSoundDescriptionInput.value = "";
  soundCategoryDescription.classList.add("hidden");
  soundCategoryDescription.textContent = "";
  soundSelect.innerHTML = EMPTY_SELECT;
};

const resetStationSelectionState = () => {
  stationSelect.innerHTML = SELECT_LINE;
  setStationInputsDisabled(true);
  setNewStationMode(false);
};

const syncSelectedSoundDescription = () => {
  const selected = soundSelect.options[soundSelect.selectedIndex];
  const description = selected?.dataset?.description?.trim();
  const show = !newSoundToggle.classList.contains("active") && !!description;
  soundCategoryDescription.classList.toggle("hidden", !show);
  soundCategoryDescription.textContent = show ? description : "";
};

const getCurrentSoundCategoryTitle = () =>
  newSoundToggle.classList.contains("active")
    ? newSoundInput.value.trim()
    : (soundSelect.options[soundSelect.selectedIndex]?.textContent || "").trim();

const getCurrentStationName = () => {
  if (scopeSelect.value !== "station") return "";
  if (state.isCreatingNewStation) return newStationInput.value.trim();
  return (stationSelect.options[stationSelect.selectedIndex]?.textContent || "").trim();
};

const titleContainsStationName = (title, stationName) => {
  const titleWords = normalizeWords(title);
  const stationWords = normalizeWords(stationName);
  if (!titleWords.length || !stationWords.length) return false;
  if (stationWords.length === 1) return titleWords.includes(stationWords[0]);

  const titleNormalized = titleWords.join(" ");
  const stationNormalized = stationWords.join(" ");
  return titleNormalized.includes(stationNormalized);
};

const validateTitleAgainstCategory = () => {
  const title = titleInput.value.trim();
  const categoryTitle = getCurrentSoundCategoryTitle();
  const sameAsCategory =
    !!title &&
    !!categoryTitle &&
    normalizeText(title) === normalizeText(categoryTitle);
  const stationName = getCurrentStationName();
  const includesStationName =
    !!title &&
    !!stationName &&
    titleContainsStationName(title, stationName);
  const message = sameAsCategory
    ? "Title must not be the same as the sound category title."
    : includesStationName
      ? "For station scope, title must not contain the station name."
      : "";

  if (titleWarning) {
    titleWarning.classList.toggle("hidden", !message);
    titleWarning.textContent = message;
  }
  titleInput.setCustomValidity(message);
};

const setNewSoundMode = (enabled) => {
  newSoundToggle.classList.toggle("active", enabled);
  soundLabelText.textContent = enabled ? "New Sound Category" : "Sound Category";
  soundSelect.classList.toggle("hidden", enabled);
  newSoundInput.classList.toggle("hidden", !enabled);
  newSoundDescriptionInput.classList.toggle("hidden", !enabled);
  soundSelect.disabled = enabled || soundPicker.classList.contains("hidden");
  soundSelect.required = !enabled;
  newSoundInput.required = enabled;
  syncSelectedSoundDescription();
  syncMetadataDescriptionVisibility();
  validateTitleAgainstCategory();
};

const syncMetadataDescriptionVisibility = () => {
  const selectedSound = soundSelect.options[soundSelect.selectedIndex];
  const selectedSoundCategoryDescription = (selectedSound?.dataset?.description || "").trim();
  const hasExistingCategoryDescription =
    !newSoundToggle.classList.contains("active") &&
    !!selectedSoundCategoryDescription;
  const hasNewCategoryDescription =
    newSoundToggle.classList.contains("active") &&
    !!newSoundDescriptionInput.value.trim();
  const hideDescriptionInput = hasExistingCategoryDescription || hasNewCategoryDescription;

  descriptionInput.classList.toggle("hidden", hideDescriptionInput);
  descriptionLabel.classList.toggle("hidden", hideDescriptionInput);
  descriptionInput.disabled = hideDescriptionInput;
};

const syncLineOptionButtons = () => {
  lineList.querySelectorAll(".line-option").forEach((option) => {
    const input = option.querySelector('input[name="line"]');
    option.classList.toggle("active", !!input?.checked);
  });
};

const primaryLineId = () => getSelectedLines()[0] || null;

const getNewStationOtherLines = () =>
  [...newStationOtherLinesList.querySelectorAll(".other-line-row")]
    .map((row) => ({
      lineId: row.querySelector(".other-line-id").value,
      lineOrder: Number(row.querySelector(".other-line-order").value),
    }))
    .filter((row) => row.lineId && Number.isFinite(row.lineOrder) && row.lineOrder > 0);

const refreshOtherLineSelectOptions = () => {
  const primaryId = primaryLineId();
  const rows = [...newStationOtherLinesList.querySelectorAll(".other-line-row")];
  rows.forEach((row) => {
    const select = row.querySelector(".other-line-id");
    const currentValue = select.value;
    const selectedByOthers = new Set(
      rows
        .filter((other) => other !== row)
        .map((other) => other.querySelector(".other-line-id").value)
        .filter(Boolean)
    );
    select.innerHTML = `<option value="">Select Line</option>`;
    state.cachedSystemLines.forEach((line) => {
      if (line.id === primaryId) return;
      if (selectedByOthers.has(line.id) && line.id !== currentValue) return;
      const option = document.createElement("option");
      option.value = line.id;
      option.textContent = line.title;
      select.append(option);
    });
    select.value = currentValue;
  });
};

const createOtherLineRow = (lineId = "", lineOrder = "") => {
  const row = document.createElement("div");
  row.className = "other-line-row";

  const lineSelect = document.createElement("select");
  lineSelect.className = "other-line-id";
  lineSelect.value = lineId;

  const orderInput = document.createElement("input");
  orderInput.className = "other-line-order";
  orderInput.type = "number";
  orderInput.min = "1";
  orderInput.step = "1";
  orderInput.placeholder = "Order";
  orderInput.value = lineOrder;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "secondary-btn";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    row.remove();
    refreshOtherLineSelectOptions();
    syncSectionFlow();
  });

  lineSelect.addEventListener("change", () => {
    refreshOtherLineSelectOptions();
    syncSectionFlow();
  });

  row.append(lineSelect, orderInput, removeButton);
  newStationOtherLinesList.append(row);
  refreshOtherLineSelectOptions();
};

const isContextComplete = () =>
  !!countrySelect.value &&
  !!systemSelect.value &&
  !!scopeSelect.value &&
  !!soundActiveSelect.value;
const isSoundCategoryComplete = () =>
  newSoundToggle.classList.contains("active") ? !!newSoundInput.value.trim() : !!soundSelect.value;

const newStationComplete = () => {
  const name = newStationInput.value.trim();
  const order = Number(newStationOrderInput.value);
  if (!name || !Number.isFinite(order) || order < 1) return false;
  if (!newStationHasOtherLinesInput.checked) return true;
  const rows = [...newStationOtherLinesList.querySelectorAll(".other-line-row")];
  if (!rows.length) return false;
  return rows.every((row) => {
    const lineId = row.querySelector(".other-line-id")?.value;
    const lineOrder = Number(row.querySelector(".other-line-order")?.value);
    return !!lineId && Number.isFinite(lineOrder) && lineOrder > 0;
  });
};

const isTargetComplete = () => {
  if (!isContextComplete()) return false;
  const scope = scopeSelect.value;
  const lines = getSelectedLines();
  const hasSound = isSoundCategoryComplete();
  if (scope === "system") return hasSound;
  if (scope === "line") return lines.length > 0 && hasSound;
  if (scope === "station") {
    if (!lines.length || !hasSound) return false;
    return state.isCreatingNewStation ? newStationComplete() : !!stationSelect.value;
  }
  return false;
};

const syncScopeFieldVisibility = () => {
  const scope = scopeSelect.value;
  const hasSelectedLine = getSelectedLines().length > 0;
  const hasSelectedStation = state.isCreatingNewStation ? newStationComplete() : !!stationSelect.value;

  if (!scope) {
    lineGroup.classList.add("hidden");
    stationGroup.classList.add("hidden");
    setFieldVisibility(soundLabelRow, soundPicker, false);
    return;
  }

  if (scope === "system") {
    lineGroup.classList.add("hidden");
    stationGroup.classList.add("hidden");
    setFieldVisibility(soundLabelRow, soundPicker, true);
    return;
  }

  if (scope === "line") {
    lineGroup.classList.remove("hidden");
    stationGroup.classList.add("hidden");
    setFieldVisibility(soundLabelRow, soundPicker, hasSelectedLine);
    return;
  }

  lineGroup.classList.remove("hidden");
  stationGroup.classList.toggle("hidden", !hasSelectedLine);
  if (!hasSelectedLine) {
    stationSelect.value = "";
    setNewStationMode(false);
  }
  setFieldVisibility(soundLabelRow, soundPicker, hasSelectedLine && hasSelectedStation);
};

const syncSectionFlow = () => {
  syncScopeFieldVisibility();
  targetSection.classList.toggle("hidden", !isContextComplete());
  metadataSection.classList.toggle("hidden", !isTargetComplete());
  const showFile = !metadataSection.classList.contains("hidden");
  fileSection.classList.toggle("hidden", !showFile);
  audioGuidelines.classList.toggle("hidden", !showFile);
};

const renderSystemOptions = (systems) => {
  systemOptions.innerHTML = "";
  (systems || []).forEach((system) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "system-option";
    button.dataset.id = system.id;

    if (system.logo_url) {
      const logo = document.createElement("img");
      logo.src = system.logo_url;
      logo.alt = `${system.name} logo`;
      button.append(logo);
    }

    const title = document.createElement("span");
    title.textContent = system.name;
    button.append(title);

    button.addEventListener("click", () => {
      systemSelect.value = system.id;
      systemOptions.querySelectorAll(".system-option").forEach((el) => el.classList.remove("active"));
      button.classList.add("active");
      systemSelect.dispatchEvent(new Event("change"));
    });

    systemOptions.append(button);
  });
};

const syncSystemOptionSelection = () => {
  const selected = systemSelect.value;
  systemOptions.querySelectorAll(".system-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.id === selected);
  });
};

const loadCountries = async () => {
  const { data } = await supabaseClient.from("countries").select("id,name").order("name");
  fillSelect(countrySelect, data);
};

const loadSystems = async (countryId) => {
  if (!countryId) {
    fillSelect(systemSelect, []);
    systemOptions.innerHTML = "";
    setSystemVisibility(false);
    scopeSelect.value = "";
    setScopeVisibility(false);
    syncSectionFlow();
    return;
  }

  const { data } = await supabaseClient
    .from("systems")
    .select("id,name,logo_url")
    .eq("country_id", countryId)
    .order("name");

  fillSelect(systemSelect, data || []);
  systemSelect.value = "";
  renderSystemOptions(data || []);
  setSystemVisibility(!!data?.length);
  setScopeVisibility(false);
  scopeSelect.value = "";
  soundActiveSelect.value = "";
  syncSectionFlow();
};

const loadLines = async (systemId) => {
  let query = supabaseClient
    .from("lines")
    .select("id,title,icon_url,other_icons,active")
    .eq("system_id", systemId);
  if (soundActiveSelect.value === "true") query = query.eq("active", true);
  const { data } = await query.order("sort_order");

  state.cachedSystemLines = data || [];
  lineList.innerHTML = "";

  state.cachedSystemLines.forEach((line) => {
    const label = document.createElement("label");
    label.className = "line-option";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "line";
    input.value = line.id;

    const main = document.createElement("span");
    main.className = "line-option-main";

    const icons = document.createElement("span");
    icons.className = "line-option-icons";
    [line.icon_url, ...(Array.isArray(line.other_icons) ? line.other_icons : [])]
      .filter(Boolean)
      .forEach((iconUrl, index) => {
        const img = document.createElement("img");
        img.src = iconUrl;
        img.alt = `${line.title} icon ${index + 1}`;
        icons.append(img);
      });

    const text = document.createElement("span");
    text.className = "line-option-text";
    text.textContent = line.title;

    const marker = document.createElement("span");
    marker.className = "line-option-mark";

    main.append(icons, text);
    label.append(input, main, marker);
    lineList.append(label);
  });

  syncLineOptionButtons();
};

const loadStations = async (systemId, lineIds = []) => {
  let query = supabaseClient
    .from("stations")
    .select("id,name,station_lines!inner(line_id,line_order)")
    .eq("system_id", systemId);

  if (lineIds.length) query = query.in("station_lines.line_id", lineIds);

  const { data } = await query;
  const primaryLine = lineIds[0];
  const sorted = [...(data || [])].sort((a, b) => {
    const aOrder = (a.station_lines || []).find((row) => row.line_id === primaryLine)?.line_order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = (b.station_lines || []).find((row) => row.line_id === primaryLine)?.line_order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  stationSelect.innerHTML = EMPTY_SELECT;
  sorted.forEach((station) => {
    const option = document.createElement("option");
    option.value = station.id;
    option.textContent = station.name;
    stationSelect.append(option);
  });
};

const loadSounds = async (systemId) => {
  if (!scopeSelect.value || !systemId) {
    resetSoundSelectionState();
    syncSectionFlow();
    return;
  }

  const { data } = await supabaseClient
    .from("sounds")
    .select("id,title,description")
    .eq("system_id", systemId)
    .eq("scope", scopeSelect.value)
    .order("title");

  soundSelect.innerHTML = EMPTY_SELECT;
  (data || []).forEach((sound) => {
    const option = document.createElement("option");
    option.value = sound.id;
    option.textContent = sound.title;
    option.dataset.description = sound.description || "";
    soundSelect.append(option);
  });

  setNewSoundMode(false);
  newSoundDescriptionInput.value = "";
  syncSelectedSoundDescription();
  syncSectionFlow();
};

const enforceStationSingleLineSelection = () => {
  let seenChecked = false;
  lineList.querySelectorAll('input[name="line"]').forEach((input) => {
    if (input.checked && !seenChecked) {
      seenChecked = true;
      return;
    }
    input.checked = false;
  });
};

const applyScopeLayout = () => {
  const scope = scopeSelect.value;

  setNewStationMode(false);

  if (scope === "station") {
    enforceStationSingleLineSelection();
    lineList.classList.add("station-mode");
    lineList.classList.remove("line-mode");
    lineMultiHint.classList.add("hidden");
    lineLabel.textContent = "Line";
    stationSelect.required = true;
    if (newStationToggle) newStationToggle.disabled = !getSelectedLines().length;
    return;
  }

  lineList.classList.remove("station-mode");
  stationSelect.required = false;
  if (newStationToggle) newStationToggle.disabled = true;

  if (scope === "line") {
    lineList.classList.add("line-mode");
    lineMultiHint.classList.remove("hidden");
    lineLabel.textContent = "Line(s)";
    return;
  }

  lineList.classList.remove("line-mode");
  lineMultiHint.classList.add("hidden");
  lineLabel.textContent = "Line(s)";
};

const setSubmitting = (submitting) => {
  if (!submitButton) return;
  submitButton.disabled = submitting;
  submitButton.classList.toggle("is-loading", submitting);
  submitButton.innerHTML = submitting ? `<span class="submit-spinner" aria-hidden="true"></span>` : "Submit";
};

const getCooldownSecondsRemaining = () =>
  Math.max(0, Math.ceil((state.cooldownUntil - Date.now()) / 1000));

const updateCooldownButtonState = () => {
  if (!submitButton || submitButton.classList.contains("is-loading")) return;
  const remaining = getCooldownSecondsRemaining();
  if (remaining > 0) {
    submitButton.disabled = true;
    submitButton.textContent = state.cooldownSubmitted ? `Submitted! (${remaining}s)` : `Submit (${remaining}s)`;
    return;
  }
  submitButton.disabled = false;
  submitButton.textContent = "Submit";
  state.cooldownSubmitted = false;
  if (state.cooldownTimer) {
    clearInterval(state.cooldownTimer);
    state.cooldownTimer = null;
  }
};

const startSubmitCooldown = () => {
  state.cooldownUntil = Date.now() + COOLDOWN_SECONDS * 1000;
  if (state.cooldownTimer) clearInterval(state.cooldownTimer);
  updateCooldownButtonState();
  state.cooldownTimer = setInterval(updateCooldownButtonState, 250);
};

const getSubmissionFingerprint = (payload, file) =>
  JSON.stringify({
    payload: {
      system_id: payload.system_id,
      station_id: payload.station_id,
      sound_id: payload.sound_id,
      new_sound_category: payload.new_sound_category,
      new_sound_category_title: payload.new_sound_category_title,
      new_sound_category_description: payload.new_sound_category_description,
      new_sound_category_scope: payload.new_sound_category_scope,
      new_station: payload.new_station,
      new_station_name: payload.new_station_name,
      new_station_primary_line_id: payload.new_station_primary_line_id,
      new_station_primary_line_order: payload.new_station_primary_line_order,
      new_station_other_lines: [...payload.new_station_other_lines].sort((a, b) =>
        a.lineId.localeCompare(b.lineId) || a.lineOrder - b.lineOrder
      ),
      title: payload.title,
      description: payload.description,
      rolling_stock: payload.rolling_stock,
      year_captured: payload.year_captured,
      source: payload.source,
      line_ids: [...payload.line_ids].sort(),
    },
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    },
  });

const rememberSubmissionFingerprint = (fingerprint) => {
  recentSubmissionFingerprints.add(fingerprint);
  sessionStorage.setItem(
    RECENT_SUBMISSION_FINGERPRINTS_KEY,
    JSON.stringify([...recentSubmissionFingerprints])
  );
};

const getDraft = () => {
  try {
    const raw = localStorage.getItem(SUBMISSION_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveDraft = () => {
  const otherLines = [...newStationOtherLinesList.querySelectorAll(".other-line-row")].map((row) => ({
    lineId: row.querySelector(".other-line-id")?.value || "",
    lineOrder: row.querySelector(".other-line-order")?.value || "",
  }));

  const draft = {
    countryId: countrySelect.value,
    systemId: systemSelect.value,
    scope: scopeSelect.value,
    soundActive: soundActiveSelect.value,
    lineIds: getSelectedLines(),
    stationId: stationSelect.value,
    isCreatingNewStation: state.isCreatingNewStation,
    newStationName: newStationInput.value,
    newStationOrder: newStationOrderInput.value,
    newStationHasOtherLines: newStationHasOtherLinesInput.checked,
    newStationOtherLines: otherLines,
    isNewSoundCategory: newSoundToggle.classList.contains("active"),
    soundId: soundSelect.value,
    newSoundTitle: newSoundInput.value,
    newSoundDescription: newSoundDescriptionInput.value,
    title: titleInput.value,
    description: descriptionInput.value,
    rollingStock: rollingStockInput.value,
    yearCaptured: yearCapturedInput.value,
    source: sourceInput.value,
  };

  localStorage.setItem(SUBMISSION_DRAFT_KEY, JSON.stringify(draft));
};

const restoreDraft = async () => {
  const draft = getDraft();
  if (!draft) return;

  countrySelect.value = draft.countryId || "";
  if (countrySelect.value) await loadSystems(countrySelect.value);

  systemSelect.value = draft.systemId || "";
  if (systemSelect.value) {
    syncSystemOptionSelection();
    setScopeVisibility(true);
    soundActiveSelect.value = draft.soundActive || "";
    await loadLines(systemSelect.value);
  }

  scopeSelect.value = draft.scope || "";
  applyScopePlaceholders();
  applyScopeLayout();

  if (scopeSelect.value && systemSelect.value) await loadSounds(systemSelect.value);

  const requestedLines = Array.isArray(draft.lineIds) ? draft.lineIds : [];
  lineList.querySelectorAll('input[name="line"]').forEach((input) => {
    input.checked = requestedLines.includes(input.value);
  });
  if (scopeSelect.value === "station") enforceStationSingleLineSelection();
  syncLineOptionButtons();

  if (scopeSelect.value === "station" && getSelectedLines().length) {
    setStationInputsDisabled(false);
    await loadStations(systemSelect.value, getSelectedLines());
  }

  setNewStationMode(!!draft.isCreatingNewStation);
  newStationInput.value = draft.newStationName || "";
  newStationOrderInput.value = draft.newStationOrder || "";
  newStationHasOtherLinesInput.checked = !!draft.newStationHasOtherLines;
  newStationOtherLinesList.innerHTML = "";
  if (newStationHasOtherLinesInput.checked) {
    newStationOtherLinesGroup.classList.remove("hidden");
    const rows = Array.isArray(draft.newStationOtherLines) ? draft.newStationOtherLines : [];
    if (rows.length) {
      rows.forEach((row) => createOtherLineRow(row.lineId || "", row.lineOrder || ""));
    } else {
      createOtherLineRow();
    }
  } else {
    newStationOtherLinesGroup.classList.add("hidden");
  }

  stationSelect.value = draft.stationId || "";

  setNewSoundMode(!!draft.isNewSoundCategory);
  newSoundInput.value = draft.newSoundTitle || "";
  newSoundDescriptionInput.value = draft.newSoundDescription || "";
  if (!draft.isNewSoundCategory) soundSelect.value = draft.soundId || "";
  syncSelectedSoundDescription();

  titleInput.value = draft.title || "";
  descriptionInput.value = draft.description || "";
  rollingStockInput.value = draft.rollingStock || "";
  yearCapturedInput.value = draft.yearCaptured || "";
  sourceInput.value = draft.source || "";

  syncMetadataDescriptionVisibility();
  validateTitleAgainstCategory();
  syncSectionFlow();
};

const applyScopePlaceholders = () => {
  const byScope = {
    system: {
      title: "e.g. (blank)",
      description: 'e.g. (blank)',
      rollingStock: "e.g. (blank)",
      source: "e.g. https://youtube.com/watch?v=...",
      newStation: "",
      newStationOrder: "",
      newSound: "e.g. Station Announcement",
      newSoundDescription: 'e.g. (blank)',
      yearCaptured: "e.g. 2025",
    },
    line: {
      title: "e.g. Towards Vaughan",
      description: "e.g. Line 1 towards Vaughan.",
      rollingStock: "e.g. Toronto Rocket",
      source: "e.g. https://youtube.com/watch?v=...",
      newStation: "",
      newStationOrder: "",
      newSound: "e.g. Doors Opening",
      newSoundDescription: "e.g. (blank)",
      yearCaptured: "e.g. 2025",
    },
    station: {
      title: "e.g. Ligne Orange",
      description: "e.g. Prochaine station: Lionel-Groulx. Correspondance avec la ligne verte.",
      rollingStock: "e.g. AZUR",
      source: "e.g. https://youtube.com/watch?v=...",
      newStation: "e.g. Lionel-Groulx",
      newStationOrder: "e.g. 8",
      newSound: "e.g. Next Station",
      newSoundDescription: "e.g. (blank)",
      yearCaptured: "e.g. 2025",
    }
  };
  const set = byScope[scopeSelect.value];
  if (!set) return;
  titleInput.placeholder = set.title;
  descriptionInput.placeholder = set.description;
  rollingStockInput.placeholder = set.rollingStock;
  sourceInput.placeholder = set.source;
  newStationInput.placeholder = set.newStation;
  newStationOrderInput.placeholder = set.newStationOrder;
  newSoundInput.placeholder = set.newSound;
  newSoundDescriptionInput.placeholder = set.newSoundDescription;
  yearCapturedInput.placeholder = set.yearCaptured;
};

countrySelect.addEventListener("change", async () => {
  await loadSystems(countrySelect.value);
  systemSelect.value = "";
  syncSystemOptionSelection();
  scopeSelect.value = "";
  soundActiveSelect.value = "";
  applyScopePlaceholders();
  setScopeVisibility(false);
  resetSoundSelectionState();
  systemSelect.dispatchEvent(new Event("change"));
  syncSectionFlow();
});

systemSelect.addEventListener("change", async () => {
  syncSystemOptionSelection();
  const systemId = systemSelect.value;
  if (!systemId) {
    scopeSelect.value = "";
    soundActiveSelect.value = "";
    applyScopePlaceholders();
    setScopeVisibility(false);
    resetSoundSelectionState();
    resetStationSelectionState();
    syncSectionFlow();
    return;
  }

  setScopeVisibility(true);
  resetStationSelectionState();
  await loadLines(systemId);
  await loadSounds(systemId);
  syncSectionFlow();
});

scopeSelect.addEventListener("change", async () => {
  applyScopePlaceholders();
  applyScopeLayout();
  syncLineOptionButtons();

  if (scopeSelect.value === "station" && getSelectedLines().length) {
    setStationInputsDisabled(false);
    await loadStations(systemSelect.value, getSelectedLines());
  }

  await loadSounds(systemSelect.value);
  validateTitleAgainstCategory();
  syncSectionFlow();
});

soundActiveSelect.addEventListener("change", async () => {
  const systemId = systemSelect.value;
  if (!systemId) {
    syncSectionFlow();
    return;
  }

  const selectedBefore = new Set(getSelectedLines());
  await loadLines(systemId);
  lineList.querySelectorAll('input[name="line"]').forEach((input) => {
    input.checked = selectedBefore.has(input.value);
  });
  if (scopeSelect.value === "station") enforceStationSingleLineSelection();
  syncLineOptionButtons();

  if (scopeSelect.value === "station") {
    const lines = getSelectedLines();
    if (!lines.length) {
      stationSelect.innerHTML = SELECT_LINE;
      setStationInputsDisabled(true);
      setNewStationMode(false);
    } else {
      setStationInputsDisabled(false);
      await loadStations(systemId, lines);
    }
  }

  syncSectionFlow();
});

lineList.addEventListener("change", async (event) => {
  const changed = event?.target;
  if (scopeSelect.value === "station" && changed?.name === "line" && changed.checked) {
    lineList.querySelectorAll('input[name="line"]').forEach((input) => {
      if (input !== changed) input.checked = false;
    });
  }

  syncLineOptionButtons();
  refreshOtherLineSelectOptions();

  if (scopeSelect.value !== "station") {
    syncSectionFlow();
    return;
  }

  const lines = getSelectedLines();
  if (!lines.length) {
    stationSelect.innerHTML = SELECT_LINE;
    setStationInputsDisabled(true);
    setNewStationMode(false);
    syncSectionFlow();
    return;
  }

  setStationInputsDisabled(false);
  await loadStations(systemSelect.value, lines);
  syncSectionFlow();
});

stationSelect.addEventListener("change", () => {
  if (stationSelect.value) setNewStationMode(false);
  validateTitleAgainstCategory();
  syncSectionFlow();
});

newStationToggle?.addEventListener("click", () => {
  setNewStationMode(!state.isCreatingNewStation);
  validateTitleAgainstCategory();
  syncSectionFlow();
});

newStationHasOtherLinesInput.addEventListener("change", () => {
  if (newStationHasOtherLinesInput.checked) {
    newStationOtherLinesGroup.classList.remove("hidden");
    if (!newStationOtherLinesList.children.length) createOtherLineRow();
    refreshOtherLineSelectOptions();
  } else {
    newStationOtherLinesGroup.classList.add("hidden");
    newStationOtherLinesList.innerHTML = "";
  }
  syncSectionFlow();
});

addOtherLineButton.addEventListener("click", () => {
  createOtherLineRow();
  syncSectionFlow();
});

window.addEventListener("pageshow", () => {
  scopeSelect.value = "";
  soundActiveSelect.value = "";
  applyScopePlaceholders();
  syncSectionFlow();
});

soundSelect.addEventListener("change", () => {
  syncSelectedSoundDescription();
  syncMetadataDescriptionVisibility();
  validateTitleAgainstCategory();
  syncSectionFlow();
});

newSoundToggle.addEventListener("click", () => {
  setNewSoundMode(!newSoundToggle.classList.contains("active"));
  syncSectionFlow();
});

audioInput.addEventListener("change", validateCurrentAudioSelection);
newSoundInput.addEventListener("input", syncSectionFlow);
newSoundInput.addEventListener("input", validateTitleAgainstCategory);
titleInput.addEventListener("input", validateTitleAgainstCategory);
newSoundDescriptionInput.addEventListener("input", () => {
  syncMetadataDescriptionVisibility();
  syncSectionFlow();
});
[
  titleInput,
  descriptionInput,
  newSoundInput,
  newSoundDescriptionInput,
].forEach((input) => {
  input?.addEventListener("blur", () => forceCapitalizedFirstWord(input));
});
[
  titleInput,
  newSoundInput,
].forEach((input) => {
  input?.addEventListener("blur", () => forceTitleCase(input));
});
newStationInput.addEventListener("input", syncSectionFlow);
newStationInput.addEventListener("input", validateTitleAgainstCategory);
newStationOrderInput.addEventListener("input", syncSectionFlow);
newStationOtherLinesList.addEventListener("input", syncSectionFlow);
el("source").addEventListener("input", syncSectionFlow);
yearCapturedInput.addEventListener("input", validateYearCaptured);

["dragenter", "dragover"].forEach((eventName) => {
  audioDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    audioDropzone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  audioDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    audioDropzone.classList.remove("drag-over");
  });
});

audioDropzone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files || [];
  const error = validateAudioFile(file);

  if (error) {
    if (error === FILE_SIZE_ERROR && state.lastValidAudioFile) {
      setAudioFile(state.lastValidAudioFile);
      setDropzoneFileName(state.lastValidAudioFile.name);
    } else {
      audioInput.value = "";
      resetDropzoneText();
    }
    showAudioError(error);
    return;
  }

  setAudioFile(file);
  validateCurrentAudioSelection();
});

submitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  [titleInput, newSoundInput].forEach(forceTitleCase);
  [titleInput, descriptionInput, newSoundInput, newSoundDescriptionInput]
    .forEach(forceCapitalizedFirstWord);
  saveDraft();
  if (submitButton?.classList.contains("is-loading")) return;
  if (getCooldownSecondsRemaining() > 0) return;

  try {
    setSubmitting(true);

    const captchaToken = turnstile.getResponse();
    if (!captchaToken) {
      alert("Please complete the captcha.");
      return;
    }

    if (!validateYearCaptured()) {
      yearCapturedInput.reportValidity();
      return;
    }

    const file = audioInput.files[0];
    const fileError = validateAudioFile(file);
    if (fileError) {
      showAudioError(fileError);
      audioInput.reportValidity();
      return;
    }
    clearAudioError();

    const submissionId = crypto.randomUUID();
    
    const safeName = file.name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

    const filePath = `${submissionId}/${safeName}`;

    const useNewSoundCategory = newSoundToggle.classList.contains("active");
    const soundCategoryTitle = newSoundInput.value.trim();
    let soundId = soundSelect.value;

    if (useNewSoundCategory) {
      if (!soundCategoryTitle) {
        alert("Please enter a new sound category.");
        return;
      }
      soundId = slugify(soundCategoryTitle);
      if (!soundId) {
        alert("New sound category must contain at least one letter or number.");
        return;
      }
    } else if (!soundId) {
      alert("Please select a sound category.");
      return;
    }

    let stationId = null;
    let newStation = false;
    let newStationName = null;
    let newStationPrimaryLineId = null;
    let newStationPrimaryLineOrder = null;
    let newStationOtherLines = [];

    if (scopeSelect.value === "station") {
      stationId = stationSelect.value;
      const typedNewStationName = newStationInput.value.trim();
      const shouldUseNewStation = state.isCreatingNewStation || !!typedNewStationName;

      if (shouldUseNewStation) {
        const name = typedNewStationName;
        const lineId = primaryLineId();
        const order = Number(newStationOrderInput.value);
        if (!name || !lineId || !Number.isFinite(order) || order < 1) {
          alert("For a new station, provide name, primary line, and primary line order.");
          return;
        }

        const otherLines = getNewStationOtherLines();
        if (otherLines.some((line) => line.lineId === lineId)) {
          alert("Other lines cannot include the primary line.");
          return;
        }

        stationId = slugify(name);
        if (!stationId) {
          alert("New station name must contain at least one letter or number.");
          return;
        }

        newStation = true;
        newStationName = name;
        newStationPrimaryLineId = lineId;
        newStationPrimaryLineOrder = order;
        newStationOtherLines = otherLines;
      }
    }

    const lineIds =
      scopeSelect.value === "line"
        ? getSelectedLines()
        : scopeSelect.value === "station" && primaryLineId()
          ? [primaryLineId()]
          : [];

    const payload = {
      id: submissionId,
      system_id: systemSelect.value,
      station_id: stationId,
      sound_id: soundId,
      new_sound_category: useNewSoundCategory,
      new_sound_category_title: useNewSoundCategory ? soundCategoryTitle : null,
      new_sound_category_description: useNewSoundCategory ? newSoundDescriptionInput.value.trim() || null : null,
      new_sound_category_scope: useNewSoundCategory ? scopeSelect.value : null,
      new_station: newStation,
      new_station_name: newStationName,
      new_station_primary_line_id: newStationPrimaryLineId,
      new_station_primary_line_order: newStationPrimaryLineOrder,
      new_station_other_lines: newStationOtherLines,
      title: el("title").value,
      description: descriptionInput.disabled ? "" : el("description").value,
      rolling_stock: el("rolling_stock").value,
      year_captured: yearCapturedInput.value || null,
      source: el("source").value,
      line_ids: lineIds,
      active: soundActiveSelect.value !== "false",
      audio_storage_path: filePath,
    };

    const fingerprint = getSubmissionFingerprint(payload, file);
    if (recentSubmissionFingerprints.has(fingerprint)) {
      alert("Duplicate submission blocked: exact same fields and audio were already submitted.");
      turnstile.reset();
      return;
    }

    const formData = new FormData();
    formData.append("captcha", captchaToken);
    formData.append("data", JSON.stringify(payload));
    formData.append("file", file);

    const response = await fetch(VERIFY_SUBMISSION_URL, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY },
      body: formData,
    });

    const text = await response.text();
    console.log("SERVER RESPONSE:", text);

    if (!response.ok) {
      alert("Submission failed.");
      turnstile.reset();
      return;
    }

    turnstile.reset();
    rememberSubmissionFingerprint(fingerprint);
    state.cooldownSubmitted = true;
    startSubmitCooldown();

    alert("Submission Complete!");
  } finally {
    setSubmitting(false);
    updateCooldownButtonState();
  }
});

const initForm = async () => {
  scopeSelect.value = "";
  soundActiveSelect.value = "";
  applyScopePlaceholders();
  yearCapturedInput.max = String(new Date().getFullYear());
  setSystemVisibility(false);
  setScopeVisibility(false);
  resetSoundSelectionState();
  resetStationSelectionState();
  syncMetadataDescriptionVisibility();
  syncSectionFlow();
  await loadCountries();
  await restoreDraft();
  validateTitleAgainstCategory();
  updateCooldownButtonState();
};

initForm();
