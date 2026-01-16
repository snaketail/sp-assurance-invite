/***********************
 * CONFIG
 ***********************/
const TOTAL_PAGES = 4;

// Paste your Apps Script Web App URL here:
const ENDPOINT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

/***********************
 * Paging
 ***********************/
const deck = document.getElementById("deck");
const pager = document.getElementById("pager");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");

let current = 0;
let isAnimating = false;

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function updateNavUI(){
  pager.textContent = `${current + 1} / ${TOTAL_PAGES}`;
  prevBtn.style.visibility = current === 0 ? "hidden" : "visible";
  nextBtn.style.visibility = current === TOTAL_PAGES - 1 ? "hidden" : "visible";
}

function goTo(index){
  const target = clamp(index, 0, TOTAL_PAGES - 1);
  if (target === current || isAnimating) return;

  isAnimating = true;
  current = target;
  deck.style.transform = `translateY(-${current * 100}vh)`;
  updateNavUI();

  // trigger page-specific animations after transition
  window.setTimeout(() => {
    runPageEnterAnimations(current);
    isAnimating = false;
  }, 560);
}

function next(){ goTo(current + 1); }
function prev(){ goTo(current - 1); }

nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);

// Wheel navigation (debounced)
let wheelLock = 0;
window.addEventListener("wheel", (e) => {
  const now = Date.now();
  if (now - wheelLock < 700) return;
  wheelLock = now;

  if (Math.abs(e.deltaY) < 8) return;
  e.deltaY > 0 ? next() : prev();
}, { passive: true });

// Keyboard navigation
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "PageDown") next();
  if (e.key === "ArrowUp" || e.key === "PageUp") prev();
});

// Touch swipe navigation
let touchStartY = null;
window.addEventListener("touchstart", (e) => {
  if (!e.touches || !e.touches[0]) return;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener("touchend", (e) => {
  if (touchStartY === null) return;
  const endY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : null;
  if (endY === null) return;

  const delta = endY - touchStartY;
  touchStartY = null;

  // prevent accidental tiny swipes
  if (Math.abs(delta) < 45) return;

  delta < 0 ? next() : prev();
}, { passive: true });

/***********************
 * Page Animations
 ***********************/
function resetPage2(){
  const card = document.querySelector('.page--message .message-card');
  if (!card) return;

  card.classList.remove('is-visible');
  card.dataset.animated = "";

  const lines = card.querySelectorAll('.message-line');
  lines.forEach(el => el.classList.remove('is-visible'));
}

function animatePage2(){
  const card = document.querySelector('.page--message .message-card');
  if (!card) return;

  // Prevent accidental double trigger
  if (card.dataset.animated === '1') return;
  card.dataset.animated = '1';

  // 1) Card enters first
  card.classList.add('is-visible');

  // 2) Then lines enter
  const lines = card.querySelectorAll('.message-line');
  setTimeout(() => {
    lines.forEach((el, i) => {
      setTimeout(() => el.classList.add('is-visible'), i * 240);
    });
  }, 420);
}

function animatePage3(){
  const group = document.querySelector('[data-page="2"] .cards--group');
  if (!group) return;

  // reset each time
  group.style.transition = "none";
  group.style.opacity = "0";
  group.style.transform = "translateY(12px)";
  void group.offsetHeight;

  group.style.transition = "opacity 720ms ease-out, transform 720ms ease-out";
  window.setTimeout(() => {
    group.style.opacity = "1";
    group.style.transform = "translateY(0)";
  }, 60);
}

function animatePage3Sequential() {
  const page = document.querySelector('.page--info');
  if (!page) return;

  const cards = page.querySelectorAll('.infoBlock');
  if (!cards.length) return;

  // 1) Reset: make sure entering page 3 starts empty
  cards.forEach(c => c.classList.remove('is-in'));

  // 2) Force reflow so the browser applies the hidden state BEFORE animating
  void page.offsetHeight;

  // 3) Fly in one by one
  cards.forEach((c, i) => {
    setTimeout(() => c.classList.add('is-in'), 140 * i);
  });
}


function runPageEnterAnimations(pageIndex){
  // Page 2
  if (pageIndex === 1) {
    resetPage2();
    // small delay so the browser applies initial state before animating
    requestAnimationFrame(() => {
      requestAnimationFrame(() => animatePage2());
    });
    return;
  }

  // Page 3
  if (pageIndex === 2) {
    animatePage3Sequential();
  } else {
    // leaving page 3: reset so next time it starts empty again
    const page3 = document.querySelector('.page--info');
    if (page3) {
      page3.querySelectorAll('.infoBlock').forEach(c => c.classList.remove('is-in'));
    }
  }
}

/***********************
 * Form Submission (Apps Script, no CORS preflight)
 ***********************/
const form = document.getElementById("rsvpForm");
const statusBox = document.getElementById("statusBox");
const submitBtn = document.getElementById("submitBtn");
const successBox = document.getElementById("successBox");

function setStatus(type, msg){
  statusBox.className = "status " + type;
  statusBox.textContent = msg;
}

function isConfigured(){
  return ENDPOINT_URL && !ENDPOINT_URL.includes("PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!isConfigured()){
    setStatus("err", "Backend endpoint is not configured. Please paste your Apps Script /exec URL in app.js.");
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());

  const payload = {
    submittedAt: new Date().toISOString(),
    agentName: (data.agentName || "").trim(),
    name: (data.name || "").trim(),
    mobile: (data.mobile || "").trim(),
    adultPax: data.adultPax || "",
    childPax: data.childPax || "0",
    note: (data.note || "").trim()
  };

  if (!payload.agentName || !payload.name || !payload.mobile || !payload.adultPax){
    setStatus("err", "Please fill in the required fields: Agent Name, Name, Mobile Number, Adult Pax.");
    return;
  }

  submitBtn.disabled = true;
  setStatus("ok", "Submitting...");

  try {
    const res = await fetch(ENDPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoid preflight
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let result = {};
    try { result = JSON.parse(text); } catch { result = { ok:false, message:text }; }

    if (!res.ok || result.ok !== true){
      throw new Error(result.message || "Submission failed.");
    }

    // success: swap view
    form.hidden = true;
    successBox.hidden = false;
  } catch (err) {
    setStatus("err", "Submission was not successful. Please refresh and try again, or contact the organiser.");
  } finally {
    submitBtn.disabled = false;
  }
});

/***********************
 * Music (Manual)
 ***********************/
const musicBtn = document.getElementById("musicBtn");
const bgm = document.getElementById("bgm");
let musicOn = false;

musicBtn.addEventListener("click", async () => {
  if (!bgm) return;

  try {
    if (!musicOn){
      await bgm.play();
      musicOn = true;
      musicBtn.classList.add("isOn");
    } else {
      bgm.pause();
      musicOn = false;
      musicBtn.classList.remove("isOn");
    }
  } catch {
    // iOS may block if not initiated; button click should be ok
  }
});

/***********************
 * Init
 ***********************/
updateNavUI();
runPageEnterAnimations(0);
