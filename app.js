"use strict";

const STORAGE_KEY = "participants";
const ROUTE_WIDTH = 1200;
const ROUTE_HEIGHT = 800;

const routeData = [
  { from: "Start", to: "The Shire", distance: 0 },
  { from: "The Shire", to: "Bree", distance: 22 },
  { from: "Bree", to: "Weathertop", distance: 21 },
  { from: "Weathertop", to: "Rivendell", distance: 18 },
  { from: "Rivendell", to: "Moria", distance: 18 },
  { from: "Moria", to: "Lothlorien", distance: 21 },
];

const markerChoices = [
  { label: "Blue", value: "🔵" },
  { label: "Gold", value: "🟡" },
  { label: "Red", value: "🔴" },
  { label: "Green", value: "🟢" },
  { label: "Purple", value: "🟣" },
  { label: "Orange", value: "🟠" },
  { label: "Dragon", value: "🐉" },
  { label: "Wizard", value: "🧙" },
  { label: "Elf", value: "🧝" },
  { label: "Ring", value: "💍" },
  { label: "Fire", value: "🔥" },
  { label: "Star", value: "⭐" },
];

const totalMiles = routeData.reduce((sum, stage) => sum + stage.distance, 0);

let participants = loadParticipants();
let selectedParticipantId = null;
let activeModal = null;
let lastFocusedElement = null;

const els = {
  mapContainer: document.getElementById("map-container"),
  routeSVG: document.getElementById("route-svg"),
  routePath: document.getElementById("route-path"),
  routeSummary: document.getElementById("route-summary"),
  activityForm: document.getElementById("activity-form"),
  activityMessage: document.getElementById("activity-message"),
  activityParticipantSelect: document.getElementById("activity-participant-select"),
  activityType: document.getElementById("activity-type"),
  activityMiles: document.getElementById("activity-miles"),
  totalsPanel: document.getElementById("totals-panel"),
  addPlayerButton: document.getElementById("add-player-button"),
  resetChallengeButton: document.getElementById("reset-challenge-button"),
  addPlayerModal: document.getElementById("add-player-modal"),
  addPlayerMessage: document.getElementById("add-player-message"),
  newPlayerName: document.getElementById("new-player-name"),
  emojiPicker: document.getElementById("emoji-picker"),
  confirmAddPlayer: document.getElementById("confirm-add-player"),
  cancelAddPlayer: document.getElementById("cancel-add-player"),
  editScoreModal: document.getElementById("edit-score-modal"),
  editScoreMessage: document.getElementById("edit-score-message"),
  editPlayerName: document.getElementById("edit-player-name"),
  editPlayerMiles: document.getElementById("edit-player-miles"),
  confirmEditScore: document.getElementById("confirm-edit-score"),
  cancelEditScore: document.getElementById("cancel-edit-score"),
  deletePlayerModal: document.getElementById("delete-player-modal"),
  deletePlayerName: document.getElementById("delete-player-name"),
  confirmDeletePlayer: document.getElementById("confirm-delete-player"),
  cancelDeletePlayer: document.getElementById("cancel-delete-player"),
  resetChallengeModal: document.getElementById("reset-challenge-modal"),
  confirmResetChallenge: document.getElementById("confirm-reset-challenge"),
  cancelResetChallenge: document.getElementById("cancel-reset-challenge"),
};

function loadParticipants() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];

    return saved
      .filter((player) => player && typeof player.name === "string")
      .map((player) => ({
        id: player.id || crypto.randomUUID(),
        name: player.name.trim(),
        emoji: player.emoji || "⭐",
        progress: clampMiles(Number(player.progress) || 0),
      }))
      .filter((player) => player.name);
  } catch {
    return [];
  }
}

function saveParticipants() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
}

function clampMiles(value) {
  return Math.max(0, Math.round(value * 10) / 10);
}

function formatMiles(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getProgressPercent(miles) {
  return Math.min(Math.round((miles / totalMiles) * 100), 100);
}

function getPointForMiles(miles) {
  const pathLength = els.routePath.getTotalLength();
  const ratio = Math.min(clampMiles(miles) / totalMiles, 1);
  return els.routePath.getPointAtLength(pathLength * ratio);
}

function svgToScreen(point) {
  const svgRect = els.routeSVG.getBoundingClientRect();
  return {
    x: point.x * (svgRect.width / ROUTE_WIDTH),
    y: point.y * (svgRect.height / ROUTE_HEIGHT),
  };
}

function getStageBreakpoints() {
  let total = 0;

  return routeData.map((stage, index) => {
    if (index > 0) total += stage.distance;
    return {
      mile: total,
      label: stage.to,
    };
  });
}

function renderStageMarkers() {
  els.mapContainer.querySelectorAll(".stage-marker").forEach((marker) => marker.remove());

  getStageBreakpoints().forEach((breakpoint, index) => {
    const point = getPointForMiles(breakpoint.mile);
    const screen = svgToScreen(point);
    const marker = document.createElement("div");

    marker.className = "stage-marker";
    marker.style.left = `${screen.x}px`;
    marker.style.top = `${screen.y}px`;
    marker.style.setProperty("--stage-offset", index % 2 === 0 ? "-105%" : "18%");

    const label = document.createElement("span");
    label.className = "stage-label";
    label.textContent = breakpoint.label;

    const miles = document.createElement("span");
    miles.className = "stage-miles";
    miles.textContent = `${breakpoint.mile} mi`;

    marker.append(label, miles);
    els.mapContainer.appendChild(marker);
  });
}

function renderParticipantMarkers() {
  els.mapContainer.querySelectorAll(".emoji-marker").forEach((marker) => marker.remove());

  const grouped = new Map();
  participants.forEach((player) => {
    const key = formatMiles(clampMiles(player.progress));
    grouped.set(key, [...(grouped.get(key) || []), player]);
  });

  grouped.forEach((players) => {
    players.forEach((player, index) => {
      const point = getPointForMiles(player.progress);
      const screen = svgToScreen(point);
      const offset = getMarkerOffset(index, players.length);
      const marker = document.createElement("div");

      marker.className = "emoji-marker";
      marker.textContent = player.emoji || "⭐";
      marker.title = `${player.name}: ${formatMiles(player.progress)} miles`;
      marker.setAttribute("aria-label", marker.title);
      marker.style.left = `${screen.x}px`;
      marker.style.top = `${screen.y}px`;
      marker.style.setProperty("--marker-x", `${offset.x}px`);
      marker.style.setProperty("--marker-y", `${offset.y}px`);

      els.mapContainer.appendChild(marker);
    });
  });
}

function getMarkerOffset(index, total) {
  if (total === 1) return { x: 0, y: 0 };

  const radius = 18;
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function updateActivityDropdown() {
  const previousValue = els.activityParticipantSelect.value;
  els.activityParticipantSelect.replaceChildren();

  if (!participants.length) {
    const option = new Option("Add a player first", "");
    els.activityParticipantSelect.append(option);
    els.activityParticipantSelect.disabled = true;
    els.activityMiles.disabled = true;
    return;
  }

  els.activityParticipantSelect.disabled = false;
  els.activityMiles.disabled = false;
  els.activityParticipantSelect.append(new Option("Choose a player", ""));

  participants.forEach((player) => {
    els.activityParticipantSelect.append(new Option(player.name, player.id));
  });

  if (participants.some((player) => player.id === previousValue)) {
    els.activityParticipantSelect.value = previousValue;
  }
}

function updateLeaderboard() {
  els.totalsPanel.replaceChildren();

  if (!participants.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "Add your first player to begin the journey.";
    els.totalsPanel.append(emptyState);
    return;
  }

  const sortedParticipants = [...participants].sort((a, b) => b.progress - a.progress);

  sortedParticipants.forEach((player) => {
    const row = document.createElement("article");
    row.className = "leaderboard-row";

    const marker = document.createElement("div");
    marker.className = "player-marker";
    marker.textContent = player.emoji || "⭐";

    const details = document.createElement("div");
    details.className = "player-details";

    const topLine = document.createElement("div");
    topLine.className = "player-line";

    const name = document.createElement("strong");
    name.textContent = player.name;

    const miles = document.createElement("span");
    miles.textContent = `${formatMiles(player.progress)} mi`;

    topLine.append(name, miles);

    const progressTrack = document.createElement("div");
    progressTrack.className = "progress-track";
    progressTrack.setAttribute("aria-label", `${getProgressPercent(player.progress)} percent complete`);

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    progressBar.style.width = `${getProgressPercent(player.progress)}%`;
    progressTrack.append(progressBar);

    const meta = document.createElement("p");
    meta.textContent = `${getProgressPercent(player.progress)}% of ${totalMiles} miles`;

    details.append(topLine, progressTrack, meta);

    const controls = document.createElement("div");
    controls.className = "player-controls";

    const edit = document.createElement("button");
    edit.className = "icon-button edit-btn";
    edit.type = "button";
    edit.dataset.id = player.id;
    edit.textContent = "Edit";
    edit.setAttribute("aria-label", `Edit ${player.name}`);

    const remove = document.createElement("button");
    remove.className = "icon-button delete-btn";
    remove.type = "button";
    remove.dataset.id = player.id;
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${player.name}`);

    controls.append(edit, remove);
    row.append(marker, details, controls);
    els.totalsPanel.append(row);
  });
}

function renderApp(message) {
  els.routeSummary.textContent = `${totalMiles} miles total`;
  updateActivityDropdown();
  updateLeaderboard();
  renderStageMarkers();
  renderParticipantMarkers();

  if (message) {
    showMessage(els.activityMessage, message, "success");
  }
}

function showMessage(element, message, type = "error") {
  element.textContent = message;
  element.dataset.type = type;
}

function clearMessage(element) {
  element.textContent = "";
  delete element.dataset.type;
}

function addPlayer() {
  const name = els.newPlayerName.value.trim().replace(/\s+/g, " ");
  const selected = els.emojiPicker.querySelector(".selected");

  if (!name) {
    showMessage(els.addPlayerMessage, "Enter a player name.");
    els.newPlayerName.focus();
    return;
  }

  if (!selected) {
    showMessage(els.addPlayerMessage, "Choose a marker.");
    return;
  }

  if (participants.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
    showMessage(els.addPlayerMessage, "That player is already in the challenge.");
    els.newPlayerName.focus();
    return;
  }

  participants.push({
    id: crypto.randomUUID(),
    name,
    emoji: selected.dataset.emoji,
    progress: 0,
  });

  saveParticipants();
  closeModal();
  renderApp(`${name} joined the party.`);
}

function logActivity(event) {
  event.preventDefault();
  clearMessage(els.activityMessage);

  const id = els.activityParticipantSelect.value;
  const miles = Number.parseFloat(els.activityMiles.value);
  const player = participants.find((candidate) => candidate.id === id);

  if (!player) {
    showMessage(els.activityMessage, "Choose a player first.");
    els.activityParticipantSelect.focus();
    return;
  }

  if (!Number.isFinite(miles) || miles <= 0) {
    showMessage(els.activityMessage, "Enter miles greater than zero.");
    els.activityMiles.focus();
    return;
  }

  const addedMiles = clampMiles(miles);
  player.progress = clampMiles(player.progress + addedMiles);

  saveParticipants();
  els.activityMiles.value = "";
  els.activityType.value = "walking";
  renderApp(`${formatMiles(addedMiles)} miles added for ${player.name}.`);
}

function openEditModal(id) {
  const player = participants.find((candidate) => candidate.id === id);
  if (!player) return;

  selectedParticipantId = id;
  els.editPlayerName.textContent = player.name;
  els.editPlayerMiles.value = player.progress;
  clearMessage(els.editScoreMessage);
  openModal(els.editScoreModal, els.editPlayerMiles);
}

function saveEditedScore() {
  const player = participants.find((candidate) => candidate.id === selectedParticipantId);
  if (!player) return;

  const newMiles = Number.parseFloat(els.editPlayerMiles.value);
  if (!Number.isFinite(newMiles) || newMiles < 0) {
    showMessage(els.editScoreMessage, "Enter zero or more miles.");
    els.editPlayerMiles.focus();
    return;
  }

  player.progress = clampMiles(newMiles);
  saveParticipants();
  closeModal();
  renderApp(`${player.name}'s score was updated.`);
}

function openDeleteModal(id) {
  const player = participants.find((candidate) => candidate.id === id);
  if (!player) return;

  selectedParticipantId = id;
  els.deletePlayerName.textContent = player.name;
  openModal(els.deletePlayerModal, els.confirmDeletePlayer);
}

function deletePlayer() {
  const player = participants.find((candidate) => candidate.id === selectedParticipantId);
  participants = participants.filter((candidate) => candidate.id !== selectedParticipantId);

  saveParticipants();
  closeModal();
  renderApp(player ? `${player.name} was removed.` : undefined);
}

function resetChallenge() {
  participants = participants.map((player) => ({ ...player, progress: 0 }));
  saveParticipants();
  closeModal();
  renderApp("The challenge has been reset.");
}

function openAddPlayerModal() {
  els.newPlayerName.value = "";
  clearMessage(els.addPlayerMessage);
  els.emojiPicker.querySelectorAll("button").forEach((button) => {
    button.classList.remove("selected");
    button.setAttribute("aria-checked", "false");
  });
  openModal(els.addPlayerModal, els.newPlayerName);
}

function openModal(modal, focusTarget) {
  lastFocusedElement = document.activeElement;
  activeModal = modal;
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
    (focusTarget || getFocusableElements(modal)[0])?.focus();
  });
}

function closeModal() {
  if (!activeModal) return;

  activeModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  selectedParticipantId = null;
  activeModal = null;

  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
}

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.disabled && element.offsetParent !== null);
}

function handleModalKeydown(event) {
  if (!activeModal) return;

  if (event.key === "Escape") {
    closeModal();
    return;
  }

  if (event.key !== "Tab") return;

  const focusable = getFocusableElements(activeModal);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!first || !last) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function populateEmojiPicker() {
  const buttons = Array.from(els.emojiPicker.querySelectorAll("button"));

  buttons.forEach((button, index) => {
    const choice = markerChoices[index];
    if (!choice) return;

    button.textContent = choice.value;
    button.dataset.emoji = choice.value;
    button.title = choice.label;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", "false");

    button.addEventListener("click", () => {
      buttons.forEach((item) => {
        item.classList.remove("selected");
        item.setAttribute("aria-checked", "false");
      });

      button.classList.add("selected");
      button.setAttribute("aria-checked", "true");
      clearMessage(els.addPlayerMessage);
    });
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // The app still works online if registration is unavailable.
    });
  });
}

function bindEvents() {
  els.addPlayerButton.addEventListener("click", openAddPlayerModal);
  els.resetChallengeButton.addEventListener("click", () =>
    openModal(els.resetChallengeModal, els.confirmResetChallenge)
  );
  els.activityForm.addEventListener("submit", logActivity);
  els.confirmAddPlayer.addEventListener("click", addPlayer);
  els.cancelAddPlayer.addEventListener("click", closeModal);
  els.confirmEditScore.addEventListener("click", saveEditedScore);
  els.cancelEditScore.addEventListener("click", closeModal);
  els.confirmDeletePlayer.addEventListener("click", deletePlayer);
  els.cancelDeletePlayer.addEventListener("click", closeModal);
  els.confirmResetChallenge.addEventListener("click", resetChallenge);
  els.cancelResetChallenge.addEventListener("click", closeModal);

  els.totalsPanel.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;

    if (button.classList.contains("edit-btn")) {
      openEditModal(button.dataset.id);
    } else if (button.classList.contains("delete-btn")) {
      openDeleteModal(button.dataset.id);
    }
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  });

  document.addEventListener("keydown", handleModalKeydown);
  window.addEventListener("resize", () => {
    renderStageMarkers();
    renderParticipantMarkers();
  });
}

populateEmojiPicker();
bindEvents();
renderApp();
registerServiceWorker();
