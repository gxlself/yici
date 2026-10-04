const words = [
  { word: "commute", ipa: "kəˈmjuːt", part: "v.", meaning: "通勤；乘车往返", example: "I spend a lot of time commuting.", highlight: "commuting", translation: "我花很多时间通勤。", source: 9811418 },
  { word: "reluctant", ipa: "rɪˈlʌktənt", part: "adj.", meaning: "不情愿的；勉强的", example: "Tom is reluctant to talk about it.", highlight: "reluctant", translation: "汤姆不太愿意谈这件事。", source: 6258793 },
  { word: "vivid", ipa: "ˈvɪvɪd", part: "adj.", meaning: "生动的；鲜艳的", example: "She has a vivid memory of her first day at school.", highlight: "vivid", translation: "她对上学第一天记忆犹新。", source: null },
  { word: "abandon", ipa: "əˈbændən", part: "v.", meaning: "放弃；抛弃", example: "We have to abandon the plan.", highlight: "abandon", translation: "我们必须放弃这个计划。", source: 610834 },
  { word: "ambiguous", ipa: "æmˈbɪɡjuəs", part: "adj.", meaning: "模棱两可的", example: "His answer was deliberately ambiguous.", highlight: "ambiguous", translation: "他的回答故意含糊其辞。", source: null },
  { word: "procrastinate", ipa: "prəˈkræstɪneɪt", part: "v.", meaning: "拖延", example: "I have to stop procrastinating.", highlight: "procrastinating", translation: "我不能再拖延了。", source: 1650044 },
];

const slots = [
  { time: "07:00", word: 1, label: "第一眼 · 新词", copy: "出门前，先遇见 reluctant。" },
  { time: "09:00", word: 3, label: "再见一面 · 复习", copy: "到办公室，再看一眼 abandon。" },
  { time: "11:00", word: 0, label: "第二个 · 新词", copy: "工作间隙，认识 commute。" },
  { time: "13:00", word: 4, label: "再见一面 · 复习", copy: "午饭后，和 ambiguous 再见。" },
  { time: "15:00", word: 2, label: "第三个 · 新词", copy: "下午这一眼，是 vivid。" },
  { time: "17:00", word: 3, label: "再见一面 · 复习", copy: "收工之前，再复习 abandon。" },
  { time: "19:00", word: 1, label: "又遇见了 · 新词", copy: "晚饭后，reluctant 已经眼熟。" },
  { time: "21:00", word: 4, label: "再见一面 · 复习", copy: "睡前这一眼，留给 ambiguous。" },
  { time: "23:00", word: 1, label: "晚安 · 暂停轮换", copy: "停在第一个新词，明早再见。" },
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
const desktopStory = window.matchMedia("(min-width: 1024px) and (min-height: 740px)");
const clamp = (number, min = 0, max = 1) => Math.max(min, Math.min(max, number));

function markedExample(element, data) {
  const start = data.example.indexOf(data.highlight);
  const mark = document.createElement("mark");
  mark.textContent = data.highlight;
  element.replaceChildren(
    document.createTextNode(data.example.slice(0, start)),
    mark,
    document.createTextNode(data.example.slice(start + data.highlight.length)),
  );
}

function clock() {
  const now = new Date();
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const date = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(now);
  $$(".live-time").forEach((element) => {
    element.textContent = time;
    element.dateTime = now.toISOString();
  });
  $$(".live-date").forEach((element) => { element.textContent = date; });
}
clock();
setInterval(() => { if (!document.hidden) clock(); }, 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) clock(); });

const markerObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      if (!motion.matches) entry.target.classList.add("swipe");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .7 });
$$(".marker").forEach((marker) => markerObserver.observe(marker));

// Only one animation frame is requested for a scroll or pointer update.
let framePending = false;
let heroVisible = true;
let memoryVisible = false;
let pointerX = 0;
let pointerY = 0;
const heroScene = $(".hero-scene");
const story = $("#day");
const memory = $("#memory");
const card = $("#climbing-card");
const intervals = [1, 2, 4, 7, 15, 30, 60];
let currentSlot = 0;
let currentStep = -1;

function setSlot(index) {
  if (index === currentSlot && $("#day-word").textContent === words[slots[index].word].word) return;
  currentSlot = index;
  const slot = slots[index];
  const data = words[slot.word];
  $("#moment-time").textContent = slot.time;
  $("#moment-time").dateTime = slot.time;
  $("#moment-label").textContent = slot.label;
  $("#moment-copy").textContent = slot.copy;
  $("#phone-slot-time").textContent = slot.time;
  $("#phone-slot-time").dateTime = slot.time;
  $("#day-word").textContent = data.word;
  $("#day-ipa").textContent = `/${data.ipa}/`;
  $("#day-meaning").textContent = `${data.part} ${data.meaning}`;
  markedExample($("#day-example"), data);
  $("#day-translation").textContent = data.translation;
  $("#day-phone").classList.toggle("is-night", index === 8);
  $$("[data-slot]").forEach((button) => {
    if (Number(button.dataset.slot) === index) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  if (!motion.matches) {
    $("#day-widget").animate([
      { opacity: .5, transform: "translateY(7px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 300, easing: "cubic-bezier(.2,.75,.2,1)" });
  }
}

function updateScenes() {
  framePending = false;
  if (story.classList.contains("scroll-story")) {
    const rect = story.getBoundingClientRect();
    const distance = rect.height - window.innerHeight + 78;
    const progress = clamp((78 - rect.top) / distance);
    setSlot(Math.min(8, Math.floor(progress * 9)));
  }
  if (memoryVisible || motion.matches) {
    const rect = memory.getBoundingClientRect();
    const progress = motion.matches ? .5 : clamp((window.innerHeight * .88 - rect.top) / (rect.height * .65));
    const position = progress * 6;
    const step = Math.round(position);
    card.setAttribute("transform", `translate(${34 + position * 96} ${167 - position * 27}) rotate(-7)`);
    if (step !== currentStep) {
      currentStep = step;
      $$(".ladder-step").forEach((element, index) => element.classList.toggle("is-active", index <= step));
      $("#ladder-card-level").textContent = `第 ${step + 1} 级 · ${intervals[step]} 天后再见`;
    }
  }
  if (heroVisible && !motion.matches) {
    heroScene.style.setProperty("--px", pointerX);
    heroScene.style.setProperty("--py", pointerY);
  }
}
function scheduleFrame() {
  if (!framePending) {
    framePending = true;
    requestAnimationFrame(updateScenes);
  }
}
function storyLayout() {
  story.classList.toggle("scroll-story", desktopStory.matches && !motion.matches);
  scheduleFrame();
}
storyLayout();
motion.addEventListener("change", () => {
  heroScene.style.setProperty("--px", 0);
  heroScene.style.setProperty("--py", 0);
  storyLayout();
});
desktopStory.addEventListener("change", storyLayout);
window.addEventListener("scroll", scheduleFrame, { passive: true });
window.addEventListener("resize", scheduleFrame, { passive: true });

const sceneObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.target === heroScene) {
      heroVisible = entry.isIntersecting;
      heroScene.querySelectorAll(".float-drift").forEach((element) => {
        element.style.animationPlayState = entry.isIntersecting && !motion.matches ? "running" : "paused";
      });
    }
    if (entry.target === memory) memoryVisible = entry.isIntersecting;
  });
  scheduleFrame();
});
sceneObserver.observe(heroScene);
sceneObserver.observe(memory);
if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  heroScene.addEventListener("pointermove", (event) => {
    const rect = heroScene.getBoundingClientRect();
    pointerX = clamp((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = clamp((event.clientY - rect.top) / rect.height) * 2 - 1;
    scheduleFrame();
  }, { passive: true });
  heroScene.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
    scheduleFrame();
  });
}
// Permission-gated motion sensors are never requested; supported passive sensors add depth.
if ("DeviceOrientationEvent" in window && typeof DeviceOrientationEvent.requestPermission !== "function") {
  window.addEventListener("deviceorientation", (event) => {
    if (!heroVisible || motion.matches || event.gamma === null || event.beta === null) return;
    pointerX = clamp(event.gamma / 25, -1, 1);
    pointerY = clamp((event.beta - 45) / 25, -1, 1);
    scheduleFrame();
  }, { passive: true });
}
$$("[data-slot]").forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.slot);
    setSlot(index);
    if (story.classList.contains("scroll-story")) {
      const top = story.getBoundingClientRect().top + window.scrollY;
      const distance = story.offsetHeight - window.innerHeight + 78;
      window.scrollTo({ top: top - 78 + distance * ((index + .35) / 9), behavior: "instant" });
    }
  });
});

let wordIndex = 0;
let flipAnimation = null;
let flipTimer = null;
let speechTimer = null;
let activeUtterance = null;
const widget = $("#demo-widget");
const quiz = $("#quiz-mode");
const status = $("#demo-status");
const speech = "speechSynthesis" in window ? window.speechSynthesis : null;
let voices = [];
function updateVoices() { voices = speech ? speech.getVoices() : []; }
updateVoices();
if (speech) speech.addEventListener("voiceschanged", updateVoices);

function hideMeaning() {
  const hidden = quiz.checked;
  widget.classList.toggle("quiz-hidden", hidden);
  $("#reveal-word").hidden = !hidden;
  $("#demo-meaning").setAttribute("aria-hidden", String(hidden));
  $("#demo-translation").setAttribute("aria-hidden", String(hidden));
}
function stopSpeech() {
  activeUtterance = null;
  clearTimeout(speechTimer);
  if (speech) speech.cancel();
  widget.classList.remove("speaking");
  $("#speak-word").setAttribute("aria-pressed", "false");
}
function renderWord() {
  const data = words[wordIndex];
  $("#demo-word").textContent = data.word;
  $("#demo-word").parentElement.classList.toggle("is-long", data.word.length > 10);
  $("#demo-ipa").textContent = `/${data.ipa}/`;
  const part = document.createElement("span");
  part.textContent = data.part;
  $("#demo-meaning").replaceChildren(part, document.createTextNode(` ${data.meaning}`));
  markedExample($("#demo-example"), data);
  $("#demo-translation").textContent = data.translation;
  $("#speak-word").setAttribute("aria-label", `朗读单词 ${data.word}`);
  $("#know-word").setAttribute("aria-label", `认识 ${data.word}，换下一个词`);
  const source = $("#demo-source");
  if (data.source) {
    const link = document.createElement("a");
    link.textContent = `Tatoeba #${data.source}`;
    link.href = `https://tatoeba.org/zh-cn/sentences/show/${data.source}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    source.replaceChildren(document.createTextNode("例句："), link);
  } else source.textContent = "例句：Tatoeba 双语例句";
  $$("[data-word]").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.word) === wordIndex));
  });
  hideMeaning();
}

function switchWord(index, known = false) {
  const previous = words[wordIndex].word;
  stopSpeech();
  clearTimeout(flipTimer);
  if (flipAnimation) flipAnimation.cancel();
  wordIndex = index;
  status.textContent = known ? `已认识 ${previous} · 下一张 ${words[index].word}` : `今日新词 · ${words[index].word}`;
  if (motion.matches || !widget.animate) {
    renderWord();
    return;
  }
  // Two phases keep the text swap behind the narrow edge of the card.
  flipAnimation = widget.animate([
    { transform: "rotateX(0deg) translateY(0)", opacity: 1 },
    { transform: "rotateX(-65deg) translateY(-8px)", opacity: .35 },
  ], { duration: 145, easing: "cubic-bezier(.55,0,1,.6)", fill: "forwards" });
  flipTimer = setTimeout(() => {
    flipAnimation.cancel();
    renderWord();
    flipAnimation = widget.animate([
      { transform: "rotateX(65deg) translateY(9px)", opacity: .4 },
      { transform: "rotateX(-5deg) translateY(-2px)", opacity: 1, offset: .7 },
      { transform: "rotateX(0deg) translateY(0)", opacity: 1 },
    ], { duration: 370, easing: "cubic-bezier(.16,.85,.24,1)", fill: "none" });
  }, 145);
}
$("#know-word").addEventListener("click", () => switchWord((wordIndex + 1) % words.length, true));
$$("[data-word]").forEach((button) => button.addEventListener("click", () => switchWord(Number(button.dataset.word))));
$$("[data-theme]").filter((element) => element.tagName === "BUTTON").forEach((button) => {
  button.addEventListener("click", () => {
    widget.dataset.theme = button.dataset.theme;
    $$(".theme-button").forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
  });
});
quiz.addEventListener("change", hideMeaning);
$("#reveal-word").addEventListener("click", () => {
  widget.classList.remove("quiz-hidden");
  $("#reveal-word").hidden = true;
  $("#demo-meaning").setAttribute("aria-hidden", "false");
  $("#demo-translation").setAttribute("aria-hidden", "false");
  status.textContent = `${words[wordIndex].word} · ${words[wordIndex].meaning}`;
  $("#know-word").focus({ preventScroll: true });
});

$("#speak-word").addEventListener("click", () => {
  if (!speech || typeof SpeechSynthesisUtterance === "undefined") {
    status.textContent = "这个浏览器暂不支持发音，音标仍可查看。";
    return;
  }
  if (widget.classList.contains("speaking")) {
    stopSpeech();
    status.textContent = "已停止发音";
    return;
  }
  stopSpeech();
  updateVoices();
  const utterance = new SpeechSynthesisUtterance(words[wordIndex].word);
  utterance.lang = "en-US";
  utterance.rate = .85;
  const voice = voices.find((item) => item.lang.toLowerCase() === "en-us" && item.localService)
    || voices.find((item) => item.lang.toLowerCase() === "en-us")
    || voices.find((item) => item.lang.toLowerCase().startsWith("en"));
  if (voice) utterance.voice = voice;
  const speakingWord = words[wordIndex].word;
  const finish = () => {
    if (activeUtterance !== utterance) return false;
    activeUtterance = null;
    clearTimeout(speechTimer);
    widget.classList.remove("speaking");
    $("#speak-word").setAttribute("aria-pressed", "false");
    return true;
  };
  activeUtterance = utterance;
  utterance.onstart = () => {
    if (activeUtterance !== utterance) return;
    status.textContent = `正在朗读 ${speakingWord}`;
    widget.classList.add("speaking");
    $("#speak-word").setAttribute("aria-pressed", "true");
  };
  utterance.onend = () => {
    if (finish()) status.textContent = `已朗读 ${speakingWord}`;
  };
  utterance.onerror = (event) => {
    if (finish() && event.error !== "canceled" && event.error !== "interrupted") {
      status.textContent = "暂时无法发音，可检查浏览器的英语语音设置。";
    }
  };
  speechTimer = setTimeout(() => {
    if (!finish()) return;
    speech.cancel();
    status.textContent = "暂时无法发音，音标仍可查看。";
  }, 7000);
  try { speech.speak(utterance); }
  catch {
    if (finish()) status.textContent = "暂时无法发音，音标仍可查看。";
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopSpeech();
    heroScene.querySelectorAll(".float-drift").forEach((element) => { element.style.animationPlayState = "paused"; });
  } else {
    if (heroVisible && !motion.matches) heroScene.querySelectorAll(".float-drift").forEach((element) => { element.style.animationPlayState = "running"; });
    scheduleFrame();
  }
});

const countObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    observer.unobserve(entry.target);
    if (motion.matches) return;
    const counters = $$("[data-count]");
    const start = performance.now();
    const duration = 1050;
    function count(now) {
      const progress = motion.matches ? 1 : clamp((now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      counters.forEach((counter) => {
        counter.textContent = Math.round(Number(counter.dataset.count) * eased).toLocaleString("en-US");
      });
      if (progress < 1) requestAnimationFrame(count);
    }
    requestAnimationFrame(count);
  });
}, { threshold: .3 });
countObserver.observe($(".numbers"));

// A local manifest is the only integration point for Lane B's future renders.
async function loadRenders() {
  try {
    const response = await fetch("assets/renders/manifest.json");
    if (!response.ok) return;
    const manifest = await response.json();
    for (const slot of $$(".render-slot")) {
      const item = manifest.renders?.[slot.dataset.render];
      if (!item?.src) continue;
      const url = new URL(item.src, new URL("assets/renders/", document.baseURI));
      if (url.origin !== window.location.origin || !url.pathname.startsWith(new URL("assets/renders/", document.baseURI).pathname)) continue;
      const image = new Image();
      image.alt = item.alt || slot.parentElement.querySelector("h3")?.textContent || "一词小组件";
      image.decoding = "async";
      image.loading = "eager";
      image.onload = () => { slot.replaceChildren(image); };
      image.src = url.href;
    }
  } catch { /* The complete HTML family remains available without a manifest. */ }
}
const renderObserver = new IntersectionObserver((entries, observer) => {
  if (entries.some((entry) => entry.isIntersecting)) {
    observer.disconnect();
    loadRenders();
  }
}, { rootMargin: "500px" });
renderObserver.observe($("#family"));
