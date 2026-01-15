// ==============================
// RSVP H5 - script.js (stable for GitHub Pages)
// Fields: submittedAt, name, mobile, adultPax, childPax, note
// IMPORTANT: Use text/plain to avoid CORS preflight (OPTIONS)
// ==============================

const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbyAlDDrAFjGAGjB9LI1_1AIKKAeT16fVSIuP4JTeoZA2Fo8bNWZONwlM2XQi16dSE4/exec"; 
// e.g. https://script.google.com/macros/s/XXXX/exec

const form = document.getElementById("rsvpForm");
const statusBox = document.getElementById("statusBox");
const submitBtn = document.getElementById("submitBtn");

function setStatus(type, msg) {
  // type: "ok" | "err"
  statusBox.className = "status " + type;
  statusBox.textContent = msg;
}

function normalizeNumber(val, fallback = "0") {
  if (val === undefined || val === null) return fallback;
  const s = String(val).trim();
  if (s === "") return fallback;
  // keep digits only if needed; here just basic
  return s;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Endpoint check
  if (!ENDPOINT_URL || ENDPOINT_URL.includes("PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE")) {
    setStatus("err", "后台接口未配置：请先部署 Google Apps Script Web App，并把 /exec URL 粘贴到 script.js");
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());

  // Required fields
  const name = (data.name || "").trim();
  const mobile = (data.mobile || "").trim();
  const adultPax = normalizeNumber(data.adultPax, "");
  const childPax = normalizeNumber(data.childPax, "0");
  const note = (data.note || "").trim();

  if (!name || !mobile || !adultPax) {
    setStatus("err", "请填写必填项：姓名 / 手机 / 成人人数");
    return;
  }

  // Build payload (keep exact keys)
  const payload = {
    submittedAt: new Date().toISOString(),
    name,
    mobile,
    adultPax,
    childPax,
    note
  };

  submitBtn.disabled = true;
  setStatus("ok", "提交中... Submitting...");

  try {
    // Use text/plain to avoid preflight CORS issue
    const res = await fetch(ENDPOINT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    // Apps Script returns JSON text
    const text = await res.text();
    let result = {};
    try {
      result = JSON.parse(text);
    } catch {
      // If not JSON, still show raw for debugging
      throw new Error("后台返回格式异常：" + text);
    }

    if (!res.ok || result.ok !== true) {
      throw new Error(result.message || "提交失败（后台拒绝或权限设置问题）");
    }

    form.reset();
    setStatus("ok", "✅ 报名成功！我们已收到信息。Success!");
  } catch (err) {
    // More business-friendly message
    setStatus("err", "❌ 提交未成功（网络或权限限制）。请刷新后重试，或联系活动负责人代登记。");
    // If you want debugging:
    // console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
});
