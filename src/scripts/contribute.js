const SUPABASE_URL = "https://mvsfcsodvtojqrmvsjbi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dnRHPIzJ2rVP8sgygNBkHg_dmr0OxBh";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const el = id => document.getElementById(id);

const countrySelect = el("country");
const targetSection = el("target-section");
const metadataSection = el("metadata-section");
const fileSection = el("file-section");
const audioGuidelines = el("audio-guidelines");
const systemLabel = el("system-label");
const systemOptions = el("system-options");
const systemSelect = el("system");
const scopeLabelRow = el("scope-label-row");
const scopeSelect = el("scope");
const lineLabel = el("line-label");
const lineList = el("line");
const lineMultiHint = el("line-multi-hint");
const stationSelect = el("station");
const soundLabel = el("sound-label-row");
const soundPicker = el("sound-picker");
const soundSelect = el("sound");
const soundCategoryDescription = el("sound-category-description");
const soundLabelText = el("sound-label");
const newSoundToggle = el("new-sound-toggle");

const lineGroup = el("line-group");
const stationGroup = el("station-group");

const newStationGroup = el("new-station-group");
const newStationInput = el("new-station");
const newStationOrderInput = el("new-station-order");
const newStationHasOtherLinesInput = el("new-station-has-other-lines");
const newStationOtherLinesGroup = el("new-station-other-lines-group");
const newStationOtherLinesList = el("new-station-other-lines");
const addOtherLineButton = el("add-other-line");

const newSoundInput = el("new-sound");
const newSoundDescriptionInput = el("new-sound-description");

const audioInput = el("audio");
const audioWarning = el("audio-warning");
const audioDropzone = el("audio-dropzone");
const yearCapturedInput = el("year_captured");

const MAX_FILE_SIZE = 1024 * 1024;
const ALLOWED_EXTENSIONS = ["mp3", "wav", "ogg", "flac", "m4a", "aac"];
const FILE_SIZE_ERROR = "File must be 1MB or smaller.";
let lastValidAudioFile = null;
let cachedSystemLines = [];

stationSelect.disabled = true;


/* ---------------- HELPERS ---------------- */

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getSelectedLines() {
    return [...lineList.querySelectorAll('input[name="line"]:checked')]
        .map(i => i.value);
}

function validateAudioFile(file) {

    if (!file) return "Please select an audio file.";

    const extension = file.name.includes(".")
        ? file.name.split(".").pop().toLowerCase()
        : "";

    const isAllowedExtension = ALLOWED_EXTENSIONS.includes(extension);
    const isAudioMime = file.type.startsWith("audio/");

    if (!isAllowedExtension && !isAudioMime)
        return "Only audio files are allowed.";

    if (file.size > MAX_FILE_SIZE)
        return FILE_SIZE_ERROR;

    return "";

}

function validateYearCaptured() {
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
}

function setAudioFile(file) {

    const transfer = new DataTransfer();
    transfer.items.add(file);
    audioInput.files = transfer.files;

}

function setDropzoneFileName(name) {
    audioDropzone.innerHTML = `<p>${name}</p><p>click to change file</p>`;
}

function resetDropzoneText() {
    audioDropzone.innerHTML = `<p>Drag and drop audio</p><p>or click to choose a file</p>`;
}

function showAudioError(message) {
    audioWarning.textContent = message;
    audioWarning.classList.remove("hidden");
    audioInput.setCustomValidity(message);
}

function clearAudioError() {
    audioWarning.textContent = "";
    audioWarning.classList.add("hidden");
    audioInput.setCustomValidity("");
}

function validateCurrentAudioSelection() {

    const file = audioInput.files[0];
    const error = validateAudioFile(file);

    if (error) {
        if (error === FILE_SIZE_ERROR) {
            if (lastValidAudioFile) {
                setAudioFile(lastValidAudioFile);
                setDropzoneFileName(lastValidAudioFile.name);
            } else {
                audioInput.value = "";
                resetDropzoneText();
            }
        } else {
            audioInput.value = "";
            resetDropzoneText();
        }
        showAudioError(error);
        return false;
    }

    lastValidAudioFile = file;
    setDropzoneFileName(file.name);
    clearAudioError();
    return true;

}

function fillSelect(select, data, label = "name") {

    select.innerHTML = `<option value="">Select</option>`;

    data.forEach(row => {
        const o = document.createElement("option");
        o.value = row.id;
        o.textContent = row[label];
        select.append(o);
    });

}

function setFieldVisibility(labelEl, inputEl, visible) {
    labelEl.classList.toggle("hidden", !visible);
    inputEl.classList.toggle("hidden", !visible);
    inputEl.disabled = !visible;
}

function setSystemVisibility(visible) {
    systemLabel.classList.toggle("hidden", !visible);
    systemOptions.classList.toggle("hidden", !visible);
    systemSelect.disabled = !visible;
}

function setScopeVisibility(visible) {
    scopeLabelRow.classList.toggle("hidden", !visible);
    scopeSelect.classList.toggle("hidden", !visible);
    scopeSelect.disabled = !visible;
}

function renderSystemOptions(systems) {
    systemOptions.innerHTML = "";
    systems.forEach(system => {
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
            systemOptions.querySelectorAll(".system-option").forEach(el => el.classList.remove("active"));
            button.classList.add("active");
            systemSelect.dispatchEvent(new Event("change"));
        });

        systemOptions.append(button);
    });
}

function isContextComplete() {
    return !!countrySelect.value && !!systemSelect.value && !!scopeSelect.value;
}

function isSoundCategoryComplete() {
    if (newSoundToggle.classList.contains("active")) return !!newSoundInput.value.trim();
    return !!soundSelect.value;
}

function isNewStationComplete() {
    const name = newStationInput.value.trim();
    const order = Number(newStationOrderInput.value);
    if (!name || !Number.isFinite(order) || order < 1) return false;
    if (!newStationHasOtherLinesInput.checked) return true;

    const otherLines = getNewStationOtherLines();
    if (!otherLines.length) return false;
    return otherLines.every(line => line.lineId && Number.isFinite(line.lineOrder) && line.lineOrder > 0);
}

function isTargetComplete() {
    if (!isContextComplete()) return false;
    const scope = scopeSelect.value;
    const selectedLines = getSelectedLines();
    const hasSound = isSoundCategoryComplete();

    if (scope === "system") return hasSound;
    if (scope === "line") return selectedLines.length > 0 && hasSound;
    if (scope === "station") {
        if (!selectedLines.length || !stationSelect.value || !hasSound) return false;
        if (stationSelect.value !== "__new_station__") return true;
        return isNewStationComplete();
    }
    return false;
}

function isMetadataComplete() {
    return true;
}

function syncSectionFlow() {
    targetSection.classList.toggle("hidden", !isContextComplete());
    metadataSection.classList.toggle("hidden", !isTargetComplete());
    const showFile = isMetadataComplete() && !metadataSection.classList.contains("hidden");
    fileSection.classList.toggle("hidden", !showFile);
    audioGuidelines.classList.toggle("hidden", !showFile);
}

function setNewSoundMode(enabled) {
    newSoundToggle.classList.toggle("active", enabled);
    soundLabelText.textContent = enabled ? "New Sound Category" : "Sound Category";
    soundSelect.classList.toggle("hidden", enabled);
    newSoundInput.classList.toggle("hidden", !enabled);
    newSoundDescriptionInput.classList.toggle("hidden", !enabled);
    soundSelect.disabled = enabled || soundPicker.classList.contains("hidden");
    soundSelect.required = !enabled;
    newSoundInput.required = enabled;
    syncSelectedSoundDescription();
}

function syncSelectedSoundDescription() {
    const selected = soundSelect.options[soundSelect.selectedIndex];
    const description = selected?.dataset?.description?.trim();
    const show = !newSoundToggle.classList.contains("active") && !!description;
    soundCategoryDescription.classList.toggle("hidden", !show);
    soundCategoryDescription.textContent = show ? description : "";
}

function syncLineOptionButtons() {
    lineList.querySelectorAll(".line-option").forEach(option => {
        const input = option.querySelector('input[name="line"]');
        option.classList.toggle("active", !!input?.checked);
    });
}

function resetNewStationFields() {
    newStationInput.value = "";
    newStationOrderInput.value = "";
    newStationHasOtherLinesInput.checked = false;
    newStationOtherLinesGroup.classList.add("hidden");
    newStationOtherLinesList.innerHTML = "";
}

function primaryLineId() {
    return getSelectedLines()[0] || null;
}

function createOtherLineRow(lineId = "", lineOrder = "") {
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
}

function getNewStationOtherLines() {
    return [...newStationOtherLinesList.querySelectorAll(".other-line-row")]
        .map(row => ({
            lineId: row.querySelector(".other-line-id").value,
            lineOrder: Number(row.querySelector(".other-line-order").value)
        }))
        .filter(row => row.lineId && Number.isFinite(row.lineOrder) && row.lineOrder > 0);
}

function refreshOtherLineSelectOptions() {
    const primaryId = primaryLineId();
    const rows = [...newStationOtherLinesList.querySelectorAll(".other-line-row")];
    rows.forEach(row => {
        const select = row.querySelector(".other-line-id");
        const currentValue = select.value;
        const selectedByOthers = new Set(
            rows
                .filter(other => other !== row)
                .map(other => other.querySelector(".other-line-id").value)
                .filter(Boolean)
        );
        select.innerHTML = `<option value="">Select Line</option>`;
        cachedSystemLines.forEach(line => {
            if (line.id === primaryId) return;
            if (selectedByOthers.has(line.id) && line.id !== currentValue) return;
            const option = document.createElement("option");
            option.value = line.id;
            option.textContent = line.title;
            select.append(option);
        });
        select.value = currentValue;
    });
}


/* ---------------- LOAD DATA ---------------- */

async function loadCountries() {

    const { data } = await supabaseClient
        .from("countries")
        .select("id,name")
        .order("name");

    fillSelect(countrySelect, data);

}

async function loadSystems(countryId) {

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
    setSystemVisibility(!!(data && data.length));
    setScopeVisibility(false);
    scopeSelect.value = "";
    syncSectionFlow();

}

async function loadLines(systemId) {

    const { data } = await supabaseClient
        .from("lines")
        .select("id,title,icon_url,other_icons")
        .eq("system_id", systemId)
        .order("sort_order");

    cachedSystemLines = data || [];
    lineList.innerHTML = "";

    cachedSystemLines.forEach(l => {

        const label = document.createElement("label");
        label.className = "line-option";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = "line";
        input.value = l.id;

        const main = document.createElement("span");
        main.className = "line-option-main";

        const icons = document.createElement("span");
        icons.className = "line-option-icons";
        const iconUrls = [l.icon_url, ...(Array.isArray(l.other_icons) ? l.other_icons : [])].filter(Boolean);
        iconUrls.forEach((iconUrl, index) => {
            const img = document.createElement("img");
            img.src = iconUrl;
            img.alt = `${l.title} icon ${index + 1}`;
            icons.append(img);
        });

        const text = document.createElement("span");
        text.className = "line-option-text";
        text.textContent = l.title;

        const marker = document.createElement("span");
        marker.className = "line-option-mark";

        main.append(icons, text);
        label.append(input, main, marker);
        lineList.append(label);

    });

    syncLineOptionButtons();

}

async function loadStations(systemId, lineIds = []) {

    let query = supabaseClient
        .from("stations")
        .select(`
id,
name,
station_lines!inner(line_id,line_order)
`)
        .eq("system_id", systemId);

    if (lineIds.length)
        query = query.in("station_lines.line_id", lineIds);

    const { data } = await query;
    const primaryLineId = lineIds[0] || null;

    const sorted = [...(data || [])].sort((a, b) => {
        const aRow = (a.station_lines || []).find(row => row.line_id === primaryLineId);
        const bRow = (b.station_lines || []).find(row => row.line_id === primaryLineId);
        const aOrder = aRow?.line_order ?? Number.MAX_SAFE_INTEGER;
        const bOrder = bRow?.line_order ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
    });

    stationSelect.innerHTML = `<option value="">Select</option>`;

    sorted.forEach(s => {
        const o = document.createElement("option");
        o.value = s.id;
        o.textContent = s.name;
        stationSelect.append(o);
    });

    const newOpt = document.createElement("option");
    newOpt.value = "__new_station__";
    newOpt.textContent = "New Station";
    stationSelect.append(newOpt);

}

async function loadSounds(systemId) {

    const scope = scopeSelect.value;

    if (!scope || !systemId) {
        soundSelect.innerHTML = `<option value="">Select</option>`;
        setFieldVisibility(soundLabel, soundPicker, false);
        setNewSoundMode(false);
        soundCategoryDescription.classList.add("hidden");
        soundCategoryDescription.textContent = "";
        newSoundDescriptionInput.value = "";
        syncSectionFlow();
        return;
    }

    const { data } = await supabaseClient
        .from("sounds")
        .select("id,title,description")
        .eq("system_id", systemId)
        .eq("scope", scope)
        .order("title");

    soundSelect.innerHTML = `<option value="">Select</option>`;

    (data || []).forEach(s => {
        const o = document.createElement("option");
        o.value = s.id;
        o.textContent = s.title;
        o.dataset.description = s.description || "";
        soundSelect.append(o);
    });

    setFieldVisibility(soundLabel, soundPicker, true);
    setNewSoundMode(false);
    syncSelectedSoundDescription();
    newSoundDescriptionInput.value = "";
    syncSectionFlow();

}


/* ---------------- EVENTS ---------------- */

countrySelect.addEventListener("change", async () => {

    await loadSystems(countrySelect.value);
    systemSelect.value = "";
    scopeSelect.value = "";
    setScopeVisibility(false);
    setFieldVisibility(soundLabel, soundPicker, false);
    setNewSoundMode(false);
    newSoundDescriptionInput.value = "";
    soundCategoryDescription.classList.add("hidden");
    soundCategoryDescription.textContent = "";
    systemSelect.dispatchEvent(new Event("change"));
    syncSectionFlow();

});

systemSelect.addEventListener("change", async () => {

    const id = systemSelect.value;
    if (!id) {
        scopeSelect.value = "";
        setScopeVisibility(false);
        setFieldVisibility(soundLabel, soundPicker, false);
        setNewSoundMode(false);
        newSoundDescriptionInput.value = "";
        soundCategoryDescription.classList.add("hidden");
        soundCategoryDescription.textContent = "";
        soundSelect.innerHTML = `<option value="">Select</option>`;
        syncSectionFlow();
        return;
    }

    setScopeVisibility(true);
    stationSelect.innerHTML = `<option>Select Line</option>`;
    resetNewStationFields();
    await loadLines(id);
    await loadSounds(id);
    syncSectionFlow();

});

scopeSelect.addEventListener("change", async () => {

    lineGroup.classList.add("hidden");
    stationGroup.classList.add("hidden");
    newStationGroup.classList.add("hidden");
    resetNewStationFields();

    if (scopeSelect.value === "line")
        lineGroup.classList.remove("hidden");

    if (scopeSelect.value === "station") {
        lineGroup.classList.remove("hidden");
        stationGroup.classList.remove("hidden");
        lineList.classList.add("station-mode");
        lineList.classList.remove("line-mode");
        lineMultiHint.classList.add("hidden");
        lineLabel.textContent = "Line";
        stationSelect.required = true;
    } else {
        lineList.classList.remove("station-mode");
        lineList.classList.toggle("line-mode", scopeSelect.value === "line");
        lineMultiHint.classList.toggle("hidden", scopeSelect.value !== "line");
        lineLabel.textContent = "Line(s)";
        stationSelect.required = false;
    }

    syncLineOptionButtons();
    await loadSounds(systemSelect.value);
    syncSectionFlow();

});

lineList.addEventListener("change", async e => {
    const changed = e?.target;
    if (scopeSelect.value === "station" && changed?.name === "line" && changed.checked) {
        lineList.querySelectorAll('input[name="line"]').forEach(input => {
            if (input !== changed) input.checked = false;
        });
    }
    syncLineOptionButtons();

    if (scopeSelect.value !== "station") {
        syncSectionFlow();
        return;
    }

    const lines = getSelectedLines();
    refreshOtherLineSelectOptions();

    if (!lines.length) {
        stationSelect.innerHTML = `<option>Select Line</option>`;
        stationSelect.disabled = true;
        syncSectionFlow();
        return;
    }

    stationSelect.disabled = false;
    await loadStations(systemSelect.value, lines);
    syncSectionFlow();

});

stationSelect.addEventListener("change", () => {

    if (stationSelect.value === "__new_station__") {
        newStationGroup.classList.remove("hidden");
    } else {
        newStationGroup.classList.add("hidden");
        resetNewStationFields();
    }
    syncSectionFlow();

});

newStationHasOtherLinesInput.addEventListener("change", () => {
    if (newStationHasOtherLinesInput.checked) {
        newStationOtherLinesGroup.classList.remove("hidden");
        if (!newStationOtherLinesList.children.length) createOtherLineRow();
        refreshOtherLineSelectOptions();
        syncSectionFlow();
        return;
    }
    newStationOtherLinesGroup.classList.add("hidden");
    newStationOtherLinesList.innerHTML = "";
    syncSectionFlow();
});

addOtherLineButton.addEventListener("click", () => {
    createOtherLineRow();
    syncSectionFlow();
});

window.addEventListener("pageshow", () => {
    scopeSelect.value = "";
    syncSectionFlow();
});

soundSelect.addEventListener("change", syncSectionFlow);
soundSelect.addEventListener("change", syncSelectedSoundDescription);

newSoundToggle.addEventListener("click", () => {
    setNewSoundMode(!newSoundToggle.classList.contains("active"));
    syncSectionFlow();
});

audioInput.addEventListener("change", () => {
    validateCurrentAudioSelection();
});

newSoundInput.addEventListener("input", syncSectionFlow);
newStationInput.addEventListener("input", syncSectionFlow);
newStationOrderInput.addEventListener("input", syncSectionFlow);
newStationOtherLinesList.addEventListener("input", syncSectionFlow);
el("source").addEventListener("input", syncSectionFlow);
yearCapturedInput.addEventListener("input", validateYearCaptured);

["dragenter", "dragover"].forEach(evt => {
    audioDropzone.addEventListener(evt, e => {
        e.preventDefault();
        audioDropzone.classList.add("drag-over");
    });
});

["dragleave", "drop"].forEach(evt => {
    audioDropzone.addEventListener(evt, e => {
        e.preventDefault();
        audioDropzone.classList.remove("drag-over");
    });
});

audioDropzone.addEventListener("drop", e => {
    const [file] = e.dataTransfer.files || [];
    const error = validateAudioFile(file);

    if (error) {
        if (error === FILE_SIZE_ERROR) {
            if (lastValidAudioFile) {
                setAudioFile(lastValidAudioFile);
                setDropzoneFileName(lastValidAudioFile.name);
            } else {
                audioInput.value = "";
                resetDropzoneText();
            }
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

/* ---------------- SUBMIT ---------------- */

el("submit-form").addEventListener("submit", async e => {

    e.preventDefault();

    const captchaToken = document.querySelector('[name="cf-turnstile-response"]').value;

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
    const filePath = `${submissionId}/${file.name}`;


    /* SOUND CATEGORY */

    let soundId = soundSelect.value;
    const useNewSoundCategory = newSoundToggle.classList.contains("active");

    if (useNewSoundCategory) {

        const title = newSoundInput.value.trim();
        if (!title) {
            alert("Please enter a new sound category.");
            return;
        }
        const id = slugify(title);

        await supabaseClient
            .from("sounds")
            .insert({
                id,
                title,
                description: newSoundDescriptionInput.value.trim() || null,
                system_id: systemSelect.value,
                scope: scopeSelect.value
            });

        soundId = id;

    }


    /* LINES */

    let lineIds = [];

    if (scopeSelect.value === "line")
        lineIds = getSelectedLines();
    if (scopeSelect.value === "station" && primaryLineId())
        lineIds = [primaryLineId()];


    /* STATION */

    let stationId = null;
    let isNewStation = false;
    let newStationName = null;
    let newStationPrimaryLineId = null;
    let newStationPrimaryLineOrder = null;
    let newStationOtherLines = [];

    if (scopeSelect.value === "station") {

        stationId = stationSelect.value;

        if (stationId === "__new_station__") {
            const name = newStationInput.value.trim();
            const order = Number(newStationOrderInput.value);
            const lineId = primaryLineId();

            if (!name || !lineId || !Number.isFinite(order) || order < 1) {
                alert("For a new station, provide name, primary line, and primary line order.");
                return;
            }

            const otherLines = getNewStationOtherLines();
            const duplicateOther = otherLines.some(line => line.lineId === lineId);
            if (duplicateOther) {
                alert("Other lines cannot include the primary line.");
                return;
            }

            isNewStation = true;
            stationId = null;
            newStationName = name;
            newStationPrimaryLineId = lineId;
            newStationPrimaryLineOrder = order;
            newStationOtherLines = otherLines;

        }

    }


    /* PAYLOAD */

    const payload = {

        id: submissionId,
        system_id: systemSelect.value,
        station_id: stationId,
        sound_id: soundId,
        is_new_station: isNewStation,
        new_station_name: newStationName,
        new_station_primary_line_id: newStationPrimaryLineId,
        new_station_primary_line_order: newStationPrimaryLineOrder,
        new_station_other_lines: newStationOtherLines,

        title: el("title").value,
        description: el("description").value,
        rolling_stock: el("rolling_stock").value,

        year_captured: el("year_captured").value || null,
        source: el("source").value,

        line_ids: lineIds,
        audio_storage_path: filePath

    };


    /* SEND TO EDGE FUNCTION */

    const formData = new FormData();

    formData.append("captcha", captchaToken);
    formData.append("file", file);
    formData.append("data", JSON.stringify(payload));

    const res = await fetch(
        "https://mvsfcsodvtojqrmvsjbi.supabase.co/functions/v1/verify-submission",
        {
            method: "POST",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: formData
        }
    );

    if (!res.ok) {
        alert("Submission failed");
        return;
    }

    alert("Submission sent!");

});


/* ---------------- INIT ---------------- */

scopeSelect.value = "";
yearCapturedInput.max = String(new Date().getFullYear());
setSystemVisibility(false);
setScopeVisibility(false);
setFieldVisibility(soundLabel, soundPicker, false);
setNewSoundMode(false);
syncSectionFlow();
loadCountries();
