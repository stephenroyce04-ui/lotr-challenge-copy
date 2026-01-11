/* =========================
   GLOBAL STATE
========================= */

let participants = JSON.parse(localStorage.getItem("participants") || "[]");
let selectedParticipantId = null;

const mapContainer = document.getElementById("map-container");
const routeSVG = document.getElementById("route-svg");
const routePath = document.getElementById("route-path");
// =========================
// GLOBAL STATE
// =========================

const addPlayerModal = document.getElementById("add-player-modal"); // <-- and this
/* =========================
   ROUTE DATA
========================= */

const routeData = [
  { id: 0, from: "Start", to: "Mew", distance: 0 },
  { id: 1, from: "Mew", to: "Nellognall", distance: 22 },
  { id: 2, from: "Nellognall", to: "Alab", distance: 21 },
  { id: 3, from: "Alab", to: "Ualleglod", distance: 18 },
  { id: 5, from: "Ualleglod", to: "Htellnyhcam", distance: 18 },
  { id: 5, from: "Htellnyhcam", to: "Htywtsyreba", distance: 21 },
];

/* =========================
   SAVE / LOAD
========================= */

function saveParticipants() {
  localStorage.setItem("participants", JSON.stringify(participants));
}

/* =========================
   ROUTE POSITIONING
========================= */

function getPointForMiles(miles) {
  const pathLength = routePath.getTotalLength();
  const totalMiles = routeData.reduce((sum, s) => sum + s.distance, 0);

  const ratio = Math.min(miles / totalMiles, 1);
  return routePath.getPointAtLength(pathLength * ratio);
}

function svgToScreen(point) {
  const svgRect = routeSVG.getBoundingClientRect();
  const containerRect = mapContainer.getBoundingClientRect();

  const scaleX = svgRect.width / 1200;
  const scaleY = svgRect.height / 800;

  return {
    x: point.x * scaleX,
    y: point.y * scaleY,
  };
}

/* =========================
   STAGE MARKERS
========================= */

function getStageBreakpoints() {
  let total = 0;
  const breakpoints = [];

  // First visible location is Shire at 0 miles
  breakpoints.push({
    mile: 0,
    label: routeData[0].to, // "Shire"
  });

  // Now add each subsequent "to" location at the end of its segment
  for (let i = 1; i < routeData.length; i++) {
    total += routeData[i].distance;
    breakpoints.push({
      mile: total,
      label: routeData[i].to,
    });
  }

  return breakpoints;
}

function renderStageMarkers() {
  document.querySelectorAll(".stage-marker").forEach((m) => m.remove());

  const breakpoints = getStageBreakpoints();

  breakpoints.forEach((bp) => {
    const point = getPointForMiles(bp.mile);
    if (!point) return;

    const screen = svgToScreen(point);

    const marker = document.createElement("div");
    marker.className = "stage-marker";

    marker.innerHTML = `
      <div class="stage-label">${bp.label}</div>
      <div class="stage-miles">${bp.mile} miles</div>
    `;

    marker.style.left = `${screen.x}px`;
    marker.style.top = `${screen.y}px`;

    mapContainer.appendChild(marker);
  });
}

/* =========================
   PARTICIPANT MARKERS
========================= */

function renderAllParticipantMarkers() {
  document.querySelectorAll(".emoji-marker").forEach((m) => m.remove());

  participants.forEach((p) => {
    const point = getPointForMiles(p.progress);
    if (!point) return;

    const screen = svgToScreen(point);

    const marker = document.createElement("div");
    marker.className = "emoji-marker";
    marker.textContent = p.emoji || "⭐";

    marker.style.left = `${screen.x}px`;
    marker.style.top = `${screen.y}px`;

    mapContainer.appendChild(marker);
  });
}

/* =========================
   UI UPDATES
========================= */

function updateActivityDropdown() {
  const select = document.getElementById("activity-participant-select");
  select.innerHTML = "";

  participants.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
}

function updateTotalsPanel() {
  const panel = document.getElementById("totals-panel");
  panel.innerHTML = "";

  participants.forEach((p) => {
    const row = document.createElement("div");

    row.innerHTML = `
      <span>${p.name}: ${p.progress} miles</span>
      <div class="player-controls">
        <button class="edit-btn" data-id="${p.id}">Edit</button>
        <button class="delete-btn" data-id="${p.id}">Delete</button>
      </div>
    `;

    panel.appendChild(row);
  });

  // Wire up edit buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.onclick = () => openEditModal(btn.dataset.id);
  });

  // Wire up delete buttons
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = () => openDeleteModal(btn.dataset.id);
  });
}

window.addEventListener("resize", () => {
  renderAllParticipantMarkers();
  renderStageMarkers();
});
/* =========================
   ADD PLAYER MODAL
========================= */

function openAddPlayerModal() {
  document
    .querySelectorAll("#emoji-picker div")
    .forEach((d) => d.classList.remove("selected"));

  openModal(addPlayerModal);

  const pickerItems = document.querySelectorAll("#emoji-picker div");
  pickerItems.forEach((div) => {
    div.onclick = () => {
      pickerItems.forEach((d) => d.classList.remove("selected"));
      div.classList.add("selected");
      div.dataset.emoji = div.textContent;
    };
  });

  // 🔥 Focus the input once the modal is rendered
  requestAnimationFrame(() => {
    const input = document.getElementById("new-player-name");
    if (input) {
      input.focus();
      input.select();
    }
  });
}

document.getElementById("confirm-add-player").onclick = () => {
  const name = document.getElementById("new-player-name").value.trim();
  const selected = document.querySelector("#emoji-picker .selected");

  if (!name || !selected) {
    alert("Please enter a name and choose an emoji.");
    return;
  }

  participants.push({
    id: crypto.randomUUID(),
    name,
    emoji: selected.dataset.emoji,
    progress: 0, // always start at zero
  });

  saveParticipants();
  closeModal(addPlayerModal);

  // Clear inputs
  document.getElementById("new-player-name").value = "";
  document
    .querySelectorAll("#emoji-picker div")
    .forEach((d) => d.classList.remove("selected"));

  // updateDropdown();
  updateActivityDropdown();
  updateTotalsPanel();
  renderAllParticipantMarkers();
  renderStageMarkers();
};

document.getElementById("cancel-add-player").onclick = () =>
  closeModal(addPlayerModal);

// =========================
// EDIT PLAYER
// =========================

function openEditModal(id) {
  const p = participants.find((x) => x.id === id);
  if (!p) return;

  selectedParticipantId = id;

  document.getElementById("edit-player-name").textContent = p.name;
  document.getElementById("edit-player-miles").value = p.progress;

  openModal(document.getElementById("edit-score-modal"));
}

document.getElementById("cancel-edit-score").onclick = () => {
  closeModal(document.getElementById("edit-score-modal"));
};

document.getElementById("confirm-edit-score").onclick = () => {
  const p = participants.find((x) => x.id === selectedParticipantId);
  if (!p) return;

  const newMiles = parseFloat(
    document.getElementById("edit-player-miles").value
  );
  if (!isNaN(newMiles)) p.progress = newMiles;

  saveParticipants();
  updateTotalsPanel();
  renderAllParticipantMarkers();
  renderStageMarkers();

  closeModal(document.getElementById("edit-score-modal"));
};
// =========================
// DELETE PLAYER
// =========================

function openDeleteModal(id) {
  const p = participants.find((x) => x.id === id);
  if (!p) return;

  selectedParticipantId = id;

  document.getElementById("delete-player-name").textContent = p.name;
  openModal(document.getElementById("delete-player-modal"));
}

document.getElementById("cancel-delete-player").onclick = () => {
  closeModal(document.getElementById("delete-player-modal"));
};

document.getElementById("confirm-delete-player").onclick = () => {
  participants = participants.filter((p) => p.id !== selectedParticipantId);

  saveParticipants();
  // updateDropdown();
  updateActivityDropdown();
  updateTotalsPanel();
  renderAllParticipantMarkers();
  renderStageMarkers();

  closeModal(document.getElementById("delete-player-modal"));
};
/* =========================
   ACTIVITY LOGGING
========================= */

document.getElementById("activity-submit").onclick = () => {
  const id = document.getElementById("activity-participant-select").value;
  const miles = parseFloat(document.getElementById("activity-miles").value);

  if (!id || isNaN(miles)) return;

  const p = participants.find((x) => x.id === id);
  p.progress += miles;

  saveParticipants();
  updateTotalsPanel();
  renderAllParticipantMarkers();
  renderStageMarkers();

  // 🔥 Clear fields after adding activity
  document.getElementById("activity-participant-select").value = "";
  document.getElementById("activity-type").value = "walking"; // optional reset
  document.getElementById("activity-miles").value = "";
};

/* =========================
   MODAL HELPERS
========================= */

function openModal(modal) {
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
}
// =========================
// RESET CHALLENGE
// =========================

document.getElementById("reset-challenge-button").onclick = () => {
  openModal(document.getElementById("reset-challenge-modal"));
};

document.getElementById("cancel-reset-challenge").onclick = () => {
  closeModal(document.getElementById("reset-challenge-modal"));
};

document.getElementById("confirm-reset-challenge").onclick = () => {
  participants.forEach((p) => (p.progress = 0));
  saveParticipants();
  updateTotalsPanel();
  renderAllParticipantMarkers();
  renderStageMarkers();
  closeModal(document.getElementById("reset-challenge-modal"));
};

/* =========================
   INITIAL LOAD
========================= */

// updateDropdown();
updateActivityDropdown();
updateTotalsPanel();
renderAllParticipantMarkers();
renderStageMarkers();
// =========================
// EVENT WIRES
// =========================

document
  .getElementById("add-player-button")
  .addEventListener("click", openAddPlayerModal);
