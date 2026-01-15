const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbwpJoevjQSpKncNNmkf4sHeUaAYZ6mUnCZfKGxTgCMoer5U190uFUMU-G-VysG1M0w/exec";

const form = document.getElementById("rsvpForm");
const statusBox = document.getElementById("statusBox");
const submitBtn = document.getElementById("submitBtn");

function setStatus(type, msg){
  statusBox.className = "status " + type;
  statusBox.textContent = msg;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());

  if (!data.name || !data.mobile || !data.adultPax) {
    setStatus("err", "请填写必填项：姓名 / 手机 / 成人人数");
    return;
  }

  submitBtn.disabled = true;
  setStatus("ok", "提交中...");

  try {
    const res = await fetch(ENDPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submittedAt: new Date().toISOString(),
        name: data.name,
        mobile: data.mobile,
        adultPax: data.adultPax,
        childPax: data.childPax || "0",
        note: data.note || "",
        userAgent: navigator.userAgent
      })
    });

    const result = await res.json();

    if (!result.ok) throw new Error(result.message || "提交失败");

    form.reset();
    setStatus("ok", "✅ 报名成功，期待您的到来！");
  } catch (err) {
    setStatus("err", "❌ 提交失败，请稍后再试");
  } finally {
    submitBtn.disabled = false;
  }
});
