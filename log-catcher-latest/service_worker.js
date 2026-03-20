const MENU_ITEMS = [
  { id: "save-money", title: "金額メモに追加", kind: "金額" },
  { id: "save-todo", title: "TODOに追加", kind: "TODO" },
  { id: "save-buy", title: "買うものに追加", kind: "買うもの" },
  { id: "save-note", title: "メモに追加", kind: "メモ" }
];

function formatDateForFilename(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${hh}${mi}${ss}`;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const item of MENU_ITEMS) {
      chrome.contextMenus.create({
        id: item.id,
        title: item.title,
        contexts: ["selection"]
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !info.selectionText) return;

  const clicked = MENU_ITEMS.find(x => x.id === info.menuItemId);
  if (!clicked) return;

  chrome.tabs.sendMessage(tab.id, {
    type: "OPEN_LOG_CATCHER_MODAL",
    payload: {
      kind: clicked.kind,
      selectionText: info.selectionText,
      pageTitle: tab.title || "",
      url: info.pageUrl || tab.url || ""
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SAVE_LOG_CATCHER") {
    (async () => {
      try {
        const { logs = [] } = await chrome.storage.local.get("logs");

        const now = new Date();
        const iso = now.toISOString();

        const record = {
          id: crypto.randomUUID(),
          kind: message.payload.kind || "メモ",
          name: message.payload.name || "",
          memo: message.payload.memo || "",
          amount: message.payload.amount || "",
          selectionText: message.payload.selectionText || "",
          pageTitle: message.payload.pageTitle || "",
          url: message.payload.url || "",
          createdAt: iso,
          dateOnly: iso.slice(0, 10),
          status: "active"
        };

        logs.unshift(record);
        await chrome.storage.local.set({ logs });

        sendResponse({ ok: true, record });
      } catch (error) {
        console.error(error);
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }

  if (message?.type === "TOGGLE_LOG_STATUS") {
    (async () => {
      try {
        const { logs = [] } = await chrome.storage.local.get("logs");
        const nextLogs = logs.map(log => {
          if (log.id !== message.payload.id) return log;
          return {
            ...log,
            status: log.status === "done" ? "active" : "done"
          };
        });

        await chrome.storage.local.set({ logs: nextLogs });
        sendResponse({ ok: true });
      } catch (error) {
        console.error(error);
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }

  if (message?.type === "DELETE_LOG") {
    (async () => {
      try {
        const { logs = [] } = await chrome.storage.local.get("logs");
        const nextLogs = logs.filter(log => log.id !== message.payload.id);

        await chrome.storage.local.set({ logs: nextLogs });
        sendResponse({ ok: true });
      } catch (error) {
        console.error(error);
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }

  if (message?.type === "IMPORT_LOGS") {
    (async () => {
      try {
        const importedLogs = message.payload?.logs;

        if (!Array.isArray(importedLogs)) {
          throw new Error("logs 配列が見つかりません。");
        }

        await chrome.storage.local.set({ logs: importedLogs });

        sendResponse({
          ok: true,
          count: importedLogs.length
        });
      } catch (error) {
        console.error(error);
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }

  if (message?.type === "EXPORT_LOGS") {
    (async () => {
      try {
        const { logs = [] } = await chrome.storage.local.get("logs");

        const exportedAt = new Date();
        const payload = {
          exportedAt: exportedAt.toISOString(),
          count: logs.length,
          logs
        };

        const json = JSON.stringify(payload, null, 2);
        const filename = `log-catcher-${formatDateForFilename(exportedAt)}.json`;
        const url = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

        const downloadId = await chrome.downloads.download({
          url,
          filename,
          saveAs: true
        });

        sendResponse({ ok: true, downloadId });
      } catch (error) {
        console.error(error);
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }
});
