/**
 * app.js — Entry point.
 * Imports all modules, wires DOM events, initialises the UI.
 * No business logic lives here; this file is pure wiring.
 */

import { state } from "./state.js";
import { IMAGE_MODELS } from "./constants.js";
import { generateImage } from "./api.js";
import { sendMessage, addSystemMessage, toggleToolBody } from "./chat.js";
import {
  initAnimationPresets,
  setDropFile,
  startPipeline,
  renderPipelineSteps,
  showGlbResult,
} from "./pipeline.js";
import { initSidebar, toggleToolList, checkBalance } from "./sidebar.js";
import { scrollToBottom, updateStatus } from "./utils.js";
import { escapeHtml } from "./utils.js";

// ── Expose helpers that are called from inline HTML attributes ────────────────
// (e.g. onclick on dynamically-created tool-call cards)
window.__toggleToolBody = toggleToolBody;

// ── Bootstrap ─────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initAnimationPresets();
  populateImageModels();
  wireEvents();
  setMode("chat");
  renderPipelineSteps({});
});

// ── Mode management ───────────────────────────────────────────────────────────

function setMode(mode) {
  state.mode = mode;

  const dropZone      = document.getElementById("drop-zone");
  const imageForm     = document.getElementById("image-form");
  const chatSection   = document.getElementById("chat-input-section");
  const modeLabel     = document.getElementById("mode-label");
  const modeButtons   = document.querySelectorAll("[data-mode-btn]");

  dropZone?.classList.add("hidden");
  imageForm?.classList.add("hidden");
  chatSection?.classList.remove("hidden");

  // Reset all mode button highlights
  modeButtons.forEach((b) => b.classList.remove("active-mode-btn"));

  const activeBtn = document.querySelector(`[data-mode-btn="${mode}"]`);
  activeBtn?.classList.add("active-mode-btn");

  const modeInfo = {
    chat:     { label: "CHAT",        tagClass: "tag-cyan" },
    pipeline: { label: "3D PIPELINE", tagClass: "tag-violet" },
    image:    { label: "IMAGE GEN",   tagClass: "tag-green" },
  };
  const info = modeInfo[mode] ?? modeInfo.chat;
  if (modeLabel) {
    modeLabel.innerHTML = `<span class="${info.tagClass} px-2 py-0.5 rounded font-mono text-[11px]">${info.label}</span>`;
  }

  if (mode === "pipeline") {
    dropZone?.classList.remove("hidden");
    chatSection?.classList.add("hidden");
  } else if (mode === "image") {
    imageForm?.classList.remove("hidden");
    chatSection?.classList.add("hidden");
    document.getElementById("image-prompt")?.focus();
  } else {
    document.getElementById("chat-input")?.focus();
  }
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function wireEvents() {
  // Sidebar actions
  on("btn-set-mode-pipeline", "click", () => setMode("pipeline"));
  on("btn-set-mode-chat",     "click", () => setMode("chat"));
  on("btn-set-mode-image",    "click", () => setMode("image"));
  on("btn-check-balance",     "click", checkBalance);
  on("btn-toggle-tools",      "click", toggleToolList);

  // Top bar
  on("btn-clear-chat",  "click", clearChat);
  on("btn-toggle-panel","click", togglePanel);

  // Chat input
  on("send-btn",    "click", sendMessage);
  on("chat-input",  "keydown", handleInputKeydown);
  on("chat-input",  "input",  handleInputResize);

  // File drop zone
  on("drop-target",  "dragover",   (e) => { e.preventDefault(); e.currentTarget.classList.add("drop-active"); });
  on("drop-target",  "dragleave",  (e) => e.currentTarget.classList.remove("drop-active"));
  on("drop-target",  "drop",       handleDrop);
  on("drop-target",  "click",      () => document.getElementById("file-input")?.click());
  on("file-input",   "change",     (e) => { const f = e.target.files?.[0]; if (f) setDropFile(f); });

  // Pipeline start
  on("pipeline-start-btn", "click", startPipeline);

  // Image generation
  on("btn-generate-image", "click", handleGenerateImage);
  on("image-prompt", "keydown", (e) => { if (e.key === "Enter") handleGenerateImage(); });
}

// ── Event handlers ────────────────────────────────────────────────────────────

function handleInputKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function handleInputResize(e) {
  const el = e.target;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  const counter = document.getElementById("char-count");
  if (counter) counter.textContent = `${el.value.length} chars`;
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drop-active");
  const file = e.dataTransfer?.files[0];
  if (file) setDropFile(file);
}

async function handleGenerateImage() {
  const prompt = /** @type {HTMLInputElement} */ (document.getElementById("image-prompt"))?.value.trim();
  const model = /** @type {HTMLSelectElement} */ (document.getElementById("image-model"))?.value ?? "flux/schnell";
  if (!prompt) return;

  addSystemMessage(`Generating image: "${prompt}" with ${model}`);
  updateStatus("Generating image…");

  try {
    const data = await generateImage(prompt, model);
    if (data.error) {
      addSystemMessage(`Image error: ${data.error}`, "error");
      return;
    }
    const first = data.data?.[0];
    if (first) {
      const url = first.url ?? (first.b64_json ? `data:image/png;base64,${first.b64_json}` : null);
      if (url) showImageResult(url, prompt, model);
    }
  } catch (err) {
    addSystemMessage(`Image failed: ${err.message}`, "error");
  } finally {
    updateStatus("Ready");
  }
}

function showImageResult(url, prompt, model) {
  const msgs = document.getElementById("messages");
  if (!msgs) return;
  const div = document.createElement("div");
  div.className = "msg-appear flex gap-3 max-w-2xl";
  div.innerHTML = `
    <div class="w-7 h-7 rounded bg-emerald-600/20 border border-emerald-600/30 flex-shrink-0 flex items-center justify-center mt-0.5">
      <span class="text-emerald-400 text-xs">◉</span>
    </div>
    <div class="flex-1">
      <div class="text-[11px] font-mono text-slate-500 mb-1">${escapeHtml(model)}</div>
      <div class="rounded-lg overflow-hidden border border-[#1a1a2e]">
        <img src="${escapeHtml(url)}" class="max-w-full" loading="lazy" alt="Generated image">
        <div class="px-3 py-2 bg-[#0e0e1a] flex justify-between items-center">
          <span class="text-[11px] font-mono text-slate-600 truncate max-w-xs">${escapeHtml(prompt)}</span>
          <a href="${escapeHtml(url)}" target="_blank"
             class="text-[11px] font-mono tag-cyan px-2 py-0.5 rounded hover:opacity-80 flex-shrink-0 ml-2">Open ↗</a>
        </div>
      </div>
    </div>`;
  msgs.appendChild(div);

  // Also add to the results panel
  const panel = document.getElementById("pipeline-results");
  if (panel) {
    panel.classList.remove("hidden");
    const entry = document.createElement("div");
    entry.innerHTML = `
      <div class="text-[11px] font-mono uppercase tracking-widest text-slate-600 mb-1">Generated Image</div>
      <div class="rounded border border-[#1a1a2e] overflow-hidden">
        <img src="${escapeHtml(url)}" class="w-full" loading="lazy" alt="Generated">
      </div>`;
    panel.appendChild(entry);
  }

  scrollToBottom();
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function clearChat() {
  const msgs = document.getElementById("messages");
  if (msgs) msgs.innerHTML = "";
  state.history = [];
  addSystemMessage("Chat cleared");
}

function togglePanel() {
  const panel = document.getElementById("right-panel");
  if (!panel) return;
  state.panelVisible = !state.panelVisible;
  panel.style.display = state.panelVisible ? "flex" : "none";
}

async function populateImageModels() {
  const sel = document.getElementById("image-model");
  if (!sel) return;
  try {
    const models = await fetch("/api/aiml/models").then((r) => r.json());
    if (Array.isArray(models) && models.length > 0) {
      sel.innerHTML = models.map((m) => `<option value="${m.id}">${m.id}</option>`).join("");
      sel.value = pickBestModel(models.map((m) => m.id));
      return;
    }
  } catch { /* fall through to built-in list */ }
  sel.innerHTML = IMAGE_MODELS.map((m) => `<option value="${m.id}">${m.label}</option>`).join("");
  sel.value = pickBestModel(IMAGE_MODELS.map((m) => m.id));
}

const IMAGE_MODEL_PREFERENCE = [
  "flux-pro/v1.1-ultra",
  "flux-pro/v1.1",
  "blackforestlabs/flux-2-max",
  "blackforestlabs/flux-2-pro",
  "flux-pro",
  "flux/dev",
  "flux/schnell",
];

function pickBestModel(ids) {
  return IMAGE_MODEL_PREFERENCE.find((p) => ids.includes(p)) ?? ids[0];
}

/** Shorthand for getElementById + addEventListener. */
function on(id, event, handler) {
  document.getElementById(id)?.addEventListener(event, handler);
}
