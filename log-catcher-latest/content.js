const MODAL_ID = "log-catcher-modal-root";

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "OPEN_LOG_CATCHER_MODAL") return;
  openLogCatcherModal(message.payload || {});
});

function openLogCatcherModal(payload) {
  removeModal();

  const root = document.createElement("div");
  root.id = MODAL_ID;
  root.innerHTML = `
    <div class="lc-overlay"></div>
    <div class="lc-modal" role="dialog" aria-modal="true">
      <div class="lc-header">
        <div class="lc-title">Log Catcher</div>
        <button type="button" class="lc-close" aria-label="閉じる">×</button>
      </div>
      <div class="lc-body">
        <label class="lc-field">
          <span>種類</span>
          <input type="text" value="${escapeHtmlAttr(payload.kind || "メモ")}" disabled />
        </label>
        <label class="lc-field">
          <span>名称</span>
          <input type="text" class="lc-name" placeholder="タイトルや名称" />
        </label>
        <label class="lc-field lc-amount-wrap ${payload.kind === "金額" ? "" : "hidden"}">
          <span>金額</span>
          <input type="number" class="lc-amount" placeholder="例: 1200" />
        </label>
        <label class="lc-field">
          <span>メモ</span>
          <textarea class="lc-memo" rows="4" placeholder="補足メモ"></textarea>
        </label>
        <label class="lc-field">
          <span>選択テキスト</span>
          <textarea rows="4" disabled>${escapeHtml(payload.selectionText || "")}</textarea>
        </label>
      </div>
      <div class="lc-actions">
        <button type="button" class="lc-cancel">キャンセル</button>
        <button type="button" class="lc-save">保存</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(root);
  injectStyles();

  root.querySelector(".lc-close").addEventListener("click", removeModal);
  root.querySelector(".lc-cancel").addEventListener("click", removeModal);
  root.querySelector(".lc-overlay").addEventListener("click", removeModal);

  root.querySelector(".lc-save").addEventListener("click", async () => {
    const name = root.querySelector(".lc-name").value.trim();
    const memo = root.querySelector(".lc-memo").value.trim();
    const amount = root.querySelector(".lc-amount")?.value?.trim() || "";

    const res = await chrome.runtime.sendMessage({
      type: "SAVE_LOG_CATCHER",
      payload: {
        kind: payload.kind || "メモ",
        name,
        memo,
        amount,
        selectionText: payload.selectionText || "",
        pageTitle: payload.pageTitle || document.title || "",
        url: payload.url || location.href
      }
    });

    if (!res?.ok) {
      alert(`保存に失敗しました: ${res?.error || "unknown error"}`);
      return;
    }

    removeModal();
  });
}

function removeModal() {
  document.getElementById(MODAL_ID)?.remove();
}

function injectStyles() {
  if (document.getElementById("log-catcher-modal-style")) return;
  const style = document.createElement("style");
  style.id = "log-catcher-modal-style";
  style.textContent = `
    #${MODAL_ID} { position: fixed; inset: 0; z-index: 2147483647; }
    #${MODAL_ID} .lc-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.45); }
    #${MODAL_ID} .lc-modal {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: min(92vw, 520px); max-height: 88vh; overflow: auto;
      background: #ffffff; color: #222; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.35);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #${MODAL_ID} .lc-header, #${MODAL_ID} .lc-actions {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px;
      border-bottom: 1px solid #ececec;
    }
    #${MODAL_ID} .lc-actions { border-bottom: 0; border-top: 1px solid #ececec; justify-content: flex-end; }
    #${MODAL_ID} .lc-title { font-size: 18px; font-weight: 700; }
    #${MODAL_ID} .lc-close {
      border: 0; background: transparent; font-size: 24px; line-height: 1; cursor: pointer; color: #666;
    }
    #${MODAL_ID} .lc-body { padding: 16px; display: grid; gap: 12px; }
    #${MODAL_ID} .lc-field { display: grid; gap: 6px; }
    #${MODAL_ID} .lc-field span { font-size: 12px; font-weight: 700; color: #666; }
    #${MODAL_ID} input, #${MODAL_ID} textarea {
      width: 100%; box-sizing: border-box; border: 1px solid #d7d7d7; border-radius: 10px; padding: 10px 12px;
      font: inherit; background: #fff; color: #222;
    }
    #${MODAL_ID} textarea { resize: vertical; }
    #${MODAL_ID} .hidden { display: none; }
    #${MODAL_ID} .lc-cancel, #${MODAL_ID} .lc-save {
      border: 0; border-radius: 10px; padding: 10px 14px; font: inherit; cursor: pointer;
    }
    #${MODAL_ID} .lc-cancel { background: #efefef; color: #333; }
    #${MODAL_ID} .lc-save { background: #111; color: #fff; }
  `;
  document.documentElement.appendChild(style);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(text) {
  return escapeHtml(text);
}
