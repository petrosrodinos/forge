import { state } from "./state.js";
import { streamPipeline } from "./api.js";
import { ANIMATION_PRESETS, PIPELINE_STEPS } from "./constants.js";
import { addSystemMessage } from "./chat.js";
import { escapeHtml, scrollToBottom, updateStatus } from "./utils.js";

// ── Public: initialise animation preset buttons ───────────────────────────────

export function initAnimationPresets() {
  const container = document.getElementById("anim-preset-list");
  if (!container) return;

  for (const preset of ANIMATION_PRESETS) {
    const btn = document.createElement("button");
    btn.dataset.animId = preset.id;
    btn.className = activeClass(state.selectedAnimations.has(preset.id));
    btn.textContent = preset.label;
    btn.addEventListener("click", () => togglePreset(preset.id, btn));
    container.appendChild(btn);
  }
}

// ── Public: file selection ────────────────────────────────────────────────────

export function setDropFile(file) {
  if (!file?.type.startsWith("image/")) {
    alert("Please select a PNG or JPEG image.");
    return;
  }
  state.selectedFile = file;
  const nameEl = document.getElementById("drop-filename");
  if (nameEl) {
    nameEl.textContent = `✓ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    nameEl.classList.remove("hidden");
  }
  document.getElementById("animation-options")?.classList.remove("hidden");
}

// ── Public: run the pipeline ──────────────────────────────────────────────────

export async function startPipeline() {
  if (!state.selectedFile) { alert("Please select an image first."); return; }

  const animations = state.selectedAnimations.size
    ? [...state.selectedAnimations]
    : ["preset:idle"];

  // Show the panel
  const panel = document.getElementById("right-panel");
  if (panel) { panel.style.display = "flex"; state.panelVisible = true; }

  resetPipelineUI();

  addSystemMessage(
    `Starting pipeline for "${state.selectedFile.name}" — ${animations.join(", ")}`
  );
  updateStatus("Running pipeline…");
  setStartButtonState(true);

  const stepStatus = {};

  try {
    await streamPipeline(state.selectedFile, animations, "v2.5-20250123", (event, data) => {
      if (event === "progress") {
        const { step, status, ...rest } = data;
        stepStatus[step] = { status, ...rest };
        renderPipelineSteps(stepStatus);
        updateStatus(`${step}: ${status}`);
        scrollToBottom();
      } else if (event === "complete") {
        if (data.glbUrl) showGlbResult(data.glbUrl);
        if (data.error) addSystemMessage(data.error, "error");
      } else if (event === "error") {
        addSystemMessage(`Pipeline error: ${data.message}`, "error");
        updateStatus("Pipeline failed");
      }
    });
  } catch (err) {
    addSystemMessage(`Pipeline failed: ${err.message}`, "error");
  } finally {
    setStartButtonState(false);
    updateStatus("Ready");
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function togglePreset(id, btn) {
  if (state.selectedAnimations.has(id)) {
    state.selectedAnimations.delete(id);
    btn.className = activeClass(false);
  } else {
    state.selectedAnimations.add(id);
    btn.className = activeClass(true);
  }
}

function activeClass(active) {
  return active
    ? "px-2 py-1 text-[11px] font-mono rounded border tag-violet border-violet-600/30 transition-all"
    : "px-2 py-1 text-[11px] font-mono rounded border bg-[#0e0e1a] border-[#1a1a2e] text-slate-500 hover:text-slate-400 transition-all";
}

function resetPipelineUI() {
  renderPipelineSteps({});
  const results = document.getElementById("pipeline-results");
  if (results) { results.classList.add("hidden"); results.innerHTML = ""; }
}

function setStartButtonState(loading) {
  const btn = document.getElementById("pipeline-start-btn");
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? "Forging…" : "⬡ Forge 3D Model";
}

export function renderPipelineSteps(stepStatus) {
  const container = document.getElementById("pipeline-steps");
  if (!container) return;
  container.innerHTML = "";

  PIPELINE_STEPS.forEach((step, idx) => {
    const info = stepStatus[step.id] ?? { status: "idle" };
    const isLast = idx === PIPELINE_STEPS.length - 1;

    const statusStyle = {
      idle:    "border-[#1a1a2e] bg-[#0e0e1a] text-slate-600",
      running: "border-violet-600/50 bg-violet-600/10 text-violet-400",
      queued:  "border-amber-600/50 bg-amber-600/10 text-amber-400",
      success: "border-emerald-600/50 bg-emerald-600/10 text-emerald-400",
      failed:  "border-red-600/50 bg-red-600/10 text-red-400",
    };

    const iconMap = {
      idle: step.icon, running: "○", queued: "◎", success: "✓", failed: "✕",
    };

    const spinnerHtml = `<div class="spinner w-3 h-3 border border-current border-t-transparent rounded-full"></div>`;
    const iconHtml = info.status === "running" ? spinnerHtml : (iconMap[info.status] ?? step.icon);

    const textColor = {
      idle: "text-slate-500", running: "text-violet-300", queued: "text-amber-300",
      success: "text-emerald-400", failed: "text-red-400",
    }[info.status] ?? "text-slate-500";

    const connectorColor = info.status === "success" ? "bg-emerald-600/30" : "bg-[#1a1a2e]";

    const div = document.createElement("div");
    div.className = "flex gap-3 items-start";
    div.innerHTML = `
      <div class="flex flex-col items-center flex-shrink-0">
        <div class="w-8 h-8 rounded border flex items-center justify-center text-sm font-mono transition-all ${statusStyle[info.status] ?? statusStyle.idle}">
          ${iconHtml}
        </div>
        ${!isLast ? `<div class="w-px h-4 ${connectorColor} mt-1"></div>` : ""}
      </div>
      <div class="flex-1 min-w-0 ${isLast ? "" : "pb-3"}">
        <div class="text-xs font-mono ${textColor}">${step.label}</div>
        ${info.taskId ? `<div class="text-[10px] font-mono text-slate-600 truncate" title="${escapeHtml(info.taskId)}">${info.taskId.slice(0, 24)}…</div>` : ""}
        ${info.error ? `<div class="text-[10px] font-mono text-red-400 mt-0.5">${escapeHtml(info.error)}</div>` : ""}
      </div>`;
    container.appendChild(div);
  });
}

export function showGlbResult(glbUrl) {
  // Add to panel
  const results = document.getElementById("pipeline-results");
  if (results) {
    results.classList.remove("hidden");
    results.innerHTML = `
      <div class="text-[11px] font-mono uppercase tracking-widest text-slate-600 mb-2">Result</div>
      <div class="rounded-lg border border-[#1a1a2e] overflow-hidden">
        <model-viewer src="${escapeHtml(glbUrl)}" auto-rotate camera-controls
          style="width:100%;height:240px;background:#0e0e1a;" shadow-intensity="1">
        </model-viewer>
        <div class="p-3 bg-[#0e0e1a] space-y-2">
          <div class="text-[11px] font-mono text-slate-500 truncate" title="${escapeHtml(glbUrl)}">
            ${escapeHtml(glbUrl.split("/").pop() ?? glbUrl)}
          </div>
          <div class="flex gap-2">
            <a href="${escapeHtml(glbUrl)}" download
               class="flex-1 text-center px-2 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-mono rounded transition-colors">
              Download GLB
            </a>
            <button onclick="navigator.clipboard.writeText('${escapeHtml(glbUrl)}')"
                    class="px-2 py-1.5 border border-[#1a1a2e] text-[11px] font-mono text-slate-400 hover:text-slate-200 rounded transition-colors">
              Copy URL
            </button>
          </div>
        </div>
      </div>`;
  }

  // Add completion bubble in chat
  const msgs = document.getElementById("messages");
  if (msgs) {
    const div = document.createElement("div");
    div.className = "msg-appear flex gap-3 max-w-3xl";
    div.innerHTML = `
      <div class="w-7 h-7 rounded bg-emerald-600/20 border border-emerald-600/30 flex-shrink-0 flex items-center justify-center mt-0.5">
        <span class="text-emerald-400 text-xs">✓</span>
      </div>
      <div class="flex-1">
        <div class="text-[11px] font-mono text-slate-500 mb-1">Pipeline Complete</div>
        <div class="bg-[#0e0e1a] border border-emerald-600/20 rounded-lg p-3 space-y-2">
          <div class="text-xs font-mono text-emerald-400">Animated GLB ready</div>
          <div class="flex gap-2">
            <a href="${escapeHtml(glbUrl)}" download
               class="text-[11px] font-mono tag-green px-2 py-1 rounded hover:opacity-80">Download GLB</a>
            <button onclick="navigator.clipboard.writeText('${escapeHtml(glbUrl)}')"
                    class="text-[11px] font-mono tag-violet px-2 py-1 rounded hover:opacity-80">Copy URL</button>
          </div>
        </div>
      </div>`;
    msgs.appendChild(div);
    scrollToBottom();
  }
}
