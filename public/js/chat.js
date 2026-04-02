import { state } from "./state.js";
import { streamChat } from "./api.js";
import { escapeHtml, renderMarkdown, scrollToBottom, timeNow, updateStatus } from "./utils.js";

// ── Public: send a message ────────────────────────────────────────────────────

export async function sendMessage() {
  const input = /** @type {HTMLTextAreaElement} */ (document.getElementById("chat-input"));
  const text = input.value.trim();
  if (!text || state.isLoading) return;

  input.value = "";
  input.style.height = "auto";
  state.isLoading = true;
  setSendDisabled(true);

  appendUserMessage(text);

  const msgId = `msg-${Date.now()}`;
  appendAiContainer(msgId);
  updateStatus("Thinking…");

  let assistantText = "";

  try {
    await streamChat(text, state.history, (event, data) => {
      switch (event) {
        case "tool_call":
          hideThinking(msgId);
          appendToolCall(getContent(msgId), data);
          updateStatus(`Calling ${data.name}…`);
          break;
        case "tool_result":
          resolveToolCall(data, "success");
          break;
        case "tool_error":
          resolveToolCall(data, "error");
          break;
        case "text":
          hideThinking(msgId);
          assistantText = data.content;
          appendTextBlock(getContent(msgId), data.content);
          break;
        case "error":
          hideThinking(msgId);
          appendErrorBlock(getContent(msgId), data.message);
          break;
      }
      scrollToBottom();
    });
  } catch (err) {
    appendErrorBlock(getContent(msgId), `Connection error: ${err.message}`);
  } finally {
    hideThinking(msgId);
    // Push both turns to history only after the round-trip completes,
    // so the server always receives previous turns only (never the current message twice).
    state.history.push({ role: "user", content: text });
    if (assistantText) state.history.push({ role: "assistant", content: assistantText });
    state.isLoading = false;
    setSendDisabled(false);
    updateStatus("Ready");
    scrollToBottom();
  }
}

// ── Public: add a system / info pill ─────────────────────────────────────────

export function addSystemMessage(text, type = "info") {
  const colorMap = { info: "text-slate-600", error: "text-red-400/70", success: "text-emerald-400/70" };
  const color = colorMap[type] ?? colorMap.info;
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "flex justify-center msg-appear";
  div.innerHTML = `
    <span class="text-[11px] font-mono ${color} px-3 py-1 bg-[#0e0e1a] border border-[#1a1a2e] rounded-full">
      ${escapeHtml(text)}
    </span>`;
  msgs.appendChild(div);
  scrollToBottom();
}

// ── Public: collapse/expand a tool call body (called from HTML) ───────────────

export function toggleToolBody(id) {
  const body = document.getElementById(`${id}-body`);
  const icon = document.getElementById(`${id}-icon`);
  if (!body) return;
  const isOpen = !body.classList.contains("collapsed");
  body.classList.toggle("collapsed", isOpen);
  body.classList.toggle("expanded", !isOpen);
  if (icon) icon.textContent = isOpen ? "▸" : "▾";
}

// ── Private helpers ───────────────────────────────────────────────────────────

function getContent(msgId) {
  return document.getElementById(msgId)?.querySelector(".msg-content");
}

function setSendDisabled(disabled) {
  const btn = document.getElementById("send-btn");
  if (btn) btn.disabled = disabled;
}

function appendUserMessage(text) {
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "msg-appear flex justify-end";
  div.innerHTML = `
    <div class="max-w-lg">
      <div class="text-[11px] font-mono text-slate-600 text-right mb-1">
        You <span class="ml-2 text-slate-700">${timeNow()}</span>
      </div>
      <div class="bg-violet-600/15 border border-violet-600/20 rounded-lg px-4 py-3 text-sm text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
        ${escapeHtml(text)}
      </div>
    </div>`;
  msgs.appendChild(div);
  scrollToBottom();
}

function appendAiContainer(id) {
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.id = id;
  div.className = "msg-appear flex gap-3 max-w-3xl";
  div.innerHTML = `
    <div class="w-7 h-7 rounded bg-violet-600/20 border border-violet-600/30 flex-shrink-0 flex items-center justify-center mt-0.5">
      <svg class="w-3.5 h-3.5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-[11px] font-mono text-slate-500 mb-1">
        The Forge <span class="ml-2 text-slate-700">${timeNow()}</span>
      </div>
      <div class="msg-content space-y-2">
        <div class="thinking-indicator flex items-center gap-1.5 text-slate-500 text-xs font-mono py-1">
          <span class="dot-1 text-xl leading-none">·</span>
          <span class="dot-2 text-xl leading-none">·</span>
          <span class="dot-3 text-xl leading-none">·</span>
          <span class="ml-1">thinking</span>
        </div>
      </div>
    </div>`;
  msgs.appendChild(div);
  scrollToBottom();
}

function hideThinking(msgId) {
  const el = document.getElementById(msgId)?.querySelector(".thinking-indicator");
  if (el) el.style.display = "none";
}

function appendTextBlock(contentEl, text) {
  let el = contentEl?.querySelector(".msg-text-block");
  if (!el) {
    el = document.createElement("div");
    el.className = "msg-text-block bg-[#0e0e1a] border border-[#1a1a2e] rounded-lg p-3 text-sm text-slate-300 leading-relaxed msg-text";
    contentEl?.appendChild(el);
  }
  el.innerHTML = renderMarkdown(text);

  // Auto-render image URLs found in the text
  const urlRegex = /https?:\/\/\S+\.(png|jpe?g|webp|gif)/gi;
  for (const url of (text.match(urlRegex) ?? [])) {
    appendInlineImage(contentEl, url);
  }
}

function appendInlineImage(contentEl, url) {
  const wrap = document.createElement("div");
  wrap.className = "rounded-lg overflow-hidden border border-[#1a1a2e] max-w-sm";
  wrap.innerHTML = `
    <img src="${escapeHtml(url)}" class="max-w-full" loading="lazy" alt="result">
    <div class="px-3 py-1.5 bg-[#0e0e1a] flex justify-end">
      <a href="${escapeHtml(url)}" target="_blank"
         class="text-[11px] font-mono tag-cyan px-2 py-0.5 rounded hover:opacity-80">Open ↗</a>
    </div>`;
  contentEl?.appendChild(wrap);
}

function appendToolCall(contentEl, data) {
  const id = `tc-${data.id}`;
  let args = "{}";
  try { args = JSON.stringify(JSON.parse(data.arguments ?? "{}"), null, 2); } catch {}

  const div = document.createElement("div");
  div.id = id;
  div.className = "border border-[#1a1a2e] rounded-lg overflow-hidden text-xs font-mono";
  div.innerHTML = `
    <div class="flex items-center justify-between px-3 py-2 bg-[#0e0e1a] cursor-pointer hover:bg-[#12121e] transition-colors"
         onclick="window.__toggleToolBody('${id}')">
      <div class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-amber-400 progress-running"></div>
        <span class="tag-amber px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">tool</span>
        <span class="text-slate-300">${escapeHtml(data.name)}</span>
      </div>
      <span id="${id}-icon" class="text-slate-600 text-[11px]">▾</span>
    </div>
    <div id="${id}-body" class="tool-body expanded">
      <pre class="px-3 py-2 text-[11px] text-slate-400 overflow-x-auto bg-[#080810]">${escapeHtml(args)}</pre>
    </div>`;
  contentEl?.appendChild(div);
}

function resolveToolCall({ id, result, error, name }, outcome) {
  const card = document.getElementById(`tc-${id}`);
  if (!card) return;

  const dot = card.querySelector(".w-1\\.5.h-1\\.5");
  const badge = card.querySelector(".tag-amber, .tag-green, .tag-red");

  if (outcome === "success") {
    dot?.classList.replace("bg-amber-400", "bg-emerald-400");
    dot?.classList.remove("progress-running");
    if (badge) { badge.className = "tag-green px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider"; badge.textContent = "done"; }
  } else {
    dot?.classList.replace("bg-amber-400", "bg-red-400");
    dot?.classList.remove("progress-running");
    if (badge) { badge.className = "tag-red px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider"; badge.textContent = "error"; }
  }

  const body = document.getElementById(`tc-${id}-body`);
  if (!body) return;

  const row = document.createElement("div");
  row.className = "border-t border-[#1a1a2e]";

  if (outcome === "success") {
    let display = result ?? "";
    try { display = JSON.stringify(JSON.parse(result), null, 2); } catch {}
    row.innerHTML = `<pre class="px-3 py-2 text-[11px] text-emerald-400/70 overflow-x-auto bg-[#080810] max-h-48">${escapeHtml(display)}</pre>`;
  } else {
    row.innerHTML = `<div class="px-3 py-2 text-[11px] text-red-400 font-mono">${escapeHtml(error)}</div>`;
  }
  body.appendChild(row);
}

function appendErrorBlock(contentEl, message) {
  const div = document.createElement("div");
  div.className = "tag-red border border-red-500/20 rounded-lg p-3 text-xs font-mono";
  div.textContent = `Error: ${message}`;
  contentEl?.appendChild(div);
}
