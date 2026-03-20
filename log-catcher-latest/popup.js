let allLogs = [];
let currentKind = "すべて";

async function loadLogs() {
  const { logs = [] } = await chrome.storage.local.get("logs");
  allLogs = logs;
  renderLogs();
}

function renderLogs() {
  const container = document.getElementById("logs");

  const filtered = currentKind === "すべて"
    ? allLogs
    : allLogs.filter(x => x.kind === currentKind);

  if (!filtered.length) {
    container.innerHTML = `<p class="empty">まだ記録はありません。</p>`;
    bindActionButtons();
    return;
  }

  const activeLogs = filtered.filter(x => (x.status || "active") !== "done");
  const doneLogs = filtered.filter(x => (x.status || "active") === "done");

  container.innerHTML = `
    ${activeLogs.length ? `
      <div class="section-title">未完了</div>
      ${activeLogs.map(renderLogItem).join("")}
    ` : ""}

    ${doneLogs.length ? `
      <div class="section-title done-title">完了済み</div>
      ${doneLogs.map(renderLogItem).join("")}
    ` : ""}
  `;

  bindActionButtons();
}

function renderLogItem(item) {
  const isDone = (item.status || "active") === "done";

  return `
    <div class="log-item ${isDone ? "done" : ""}">
      <div class="head">
        <span class="kind kind-${escapeClass(item.kind)}">${escapeHtml(item.kind)}</span>
        <span class="date">${escapeHtml(item.dateOnly || "")}</span>
      </div>

      <div class="name">${escapeHtml(item.name || "(名称なし)")}</div>

      ${item.amount ? `<div class="amount">金額: ${escapeHtml(item.amount)}円</div>` : ""}
      ${item.memo ? `<div class="memo">メモ: ${escapeHtml(item.memo)}</div>` : ""}
      <div class="selection">${escapeHtml(item.selectionText || "")}</div>

      <div class="actions">
        <button class="toggle-status-btn" data-id="${escapeHtml(item.id)}">
          ${isDone ? "未完了に戻す" : "完了"}
        </button>
        <button class="delete-btn danger" data-id="${escapeHtml(item.id)}">
          削除
        </button>
      </div>
    </div>
  `;
}

function bindActionButtons() {
  document.querySelectorAll(".toggle-status-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await chrome.runtime.sendMessage({
        type: "TOGGLE_LOG_STATUS",
        payload: { id }
      });
      await loadLogs();
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("このログを削除する？")) return;

      await chrome.runtime.sendMessage({
        type: "DELETE_LOG",
        payload: { id }
      });
      await loadLogs();
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeClass(str) {
  return String(str).replace(/[^\w-]/g, "_");
}

async function pickJsonFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.addEventListener("change", () => {
      resolve(input.files?.[0] || null);
    }, { once: true });

    input.click();
  });
}

function normalizeImportedPayload(parsed) {
  if (Array.isArray(parsed)) {
    return { logs: parsed };
  }

  if (parsed && Array.isArray(parsed.logs)) {
    return { logs: parsed.logs };
  }

  throw new Error("JSON形式が不正です。logs 配列が見つかりません。");
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    currentKind = btn.dataset.kind;
    renderLogs();
  });
});

document.getElementById("reloadBtn").addEventListener("click", loadLogs);

document.getElementById("clearBtn").addEventListener("click", async () => {
  if (!confirm("全部削除する？")) return;
  await chrome.storage.local.set({ logs: [] });
  loadLogs();
});

document.getElementById("exportBtn").addEventListener("click", async () => {
  try {
    const res = await chrome.runtime.sendMessage({
      type: "EXPORT_LOGS"
    });

    if (!res?.ok) {
      alert(`Exportに失敗しました: ${res?.error || "unknown error"}`);
      return;
    }

    alert("Exportしました。");
  } catch (error) {
    console.error(error);
    alert(`Exportに失敗しました: ${String(error)}`);
  }
});

document.getElementById("importBtn").addEventListener("click", async () => {
  try {
    const file = await pickJsonFile();
    if (!file) return;

    const text = await file.text();
    const parsed = JSON.parse(text);
    const payload = normalizeImportedPayload(parsed);

    const res = await chrome.runtime.sendMessage({
      type: "IMPORT_LOGS",
      payload
    });

    if (!res?.ok) {
      alert(`Importに失敗しました: ${res?.error || "unknown error"}`);
      return;
    }

    await loadLogs();
    alert("Importしました。");
  } catch (error) {
    console.error(error);
    alert(`Importに失敗しました: ${String(error)}`);
  }
});

loadLogs();
