const STORAGE_KEY = "english-flashcards-known";
const audioCache = new Map();

let allWords = [];
let filteredWords = [];
let studyQueue = [];
let studyIndex = 0;
let isFlipped = false;
let accent = "us";
let currentView = "grid";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function loadWords() {
  const res = await fetch("./data/words.json");
  if (!res.ok) throw new Error("Không tải được dữ liệu từ vựng");
  allWords = await res.json();
  filteredWords = [...allWords];
  studyQueue = [...filteredWords];
  renderStats();
  renderGrid();
  renderStudyCard();
}

function getKnownSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveKnown(word) {
  const known = getKnownSet();
  known.add(word);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...known]));
  renderStats();
}

function renderStats() {
  const known = getKnownSet().size;
  $("#stats").innerHTML = `
    <span class="stat"><strong>${allWords.length}</strong> từ</span>
    <span class="stat"><strong>${known}</strong> đã thuộc</span>
    <span class="stat"><strong>${filteredWords.length}</strong> đang hiển thị</span>
  `;
}

function getIpa(entry) {
  return accent === "uk" ? entry.ipa_uk || entry.ipa_us : entry.ipa_us || entry.ipa_uk;
}

function cefrClass(level) {
  return level ? `cefr cefr--${level.toLowerCase()}` : "cefr";
}

async function playPronunciation(word) {
  if (audioCache.has(word)) {
    const url = audioCache.get(word);
    if (url) {
      const audio = new Audio(url);
      await audio.play().catch(() => speakFallback(word));
      return;
    }
  }

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (res.ok) {
      const data = await res.json();
      const phonetics = data[0]?.phonetics || [];
      const preferred = phonetics.find((p) => p.audio && p.audio.includes(accent === "uk" ? "uk" : "us"));
      const fallback = phonetics.find((p) => p.audio);
      const audioUrl = preferred?.audio || fallback?.audio || "";
      audioCache.set(word, audioUrl);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        await audio.play();
        return;
      }
    }
  } catch {
    /* network error — fall through */
  }

  audioCache.set(word, null);
  speakFallback(word);
}

function speakFallback(word) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accent === "uk" ? "en-GB" : "en-US";
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

function applyFilters() {
  const query = $("#search").value.trim().toLowerCase();
  const cefr = $("#cefr-filter").value;

  filteredWords = allWords.filter((w) => {
    const matchQuery =
      !query ||
      w.word.includes(query) ||
      w.definition.toLowerCase().includes(query) ||
      (w.definition_vi || "").toLowerCase().includes(query) ||
      (w.meaning_vi || "").toLowerCase().includes(query);
    const matchCefr = !cefr || w.cefr === cefr;
    return matchQuery && matchCefr;
  });

  studyQueue = [...filteredWords];
  studyIndex = 0;
  isFlipped = false;
  renderStats();
  renderGrid();
  renderStudyCard();
  toggleEmptyState();
}

function toggleEmptyState() {
  const empty = filteredWords.length === 0;
  $("#empty-state").classList.toggle("hidden", !empty);
  $("#grid-view").classList.toggle("hidden", empty || currentView !== "grid");
  $("#study-view").classList.toggle("hidden", empty || currentView !== "study");
}

function renderGrid() {
  const known = getKnownSet();
  const html = filteredWords
    .map(
      (entry) => `
    <article class="card ${known.has(entry.word) ? "card--known" : ""}" data-id="${entry.id}">
      <div class="card__top">
        <span class="${cefrClass(entry.cefr)}">${entry.cefr || "—"}</span>
        <button type="button" class="card__play" aria-label="Phát âm ${entry.word}">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg>
        </button>
      </div>
      <h3 class="card__word">${entry.word}</h3>
      <p class="card__ipa">${getIpa(entry)}</p>
      <p class="card__meaning-vi">${entry.meaning_vi || "—"}</p>
      <p class="card__pos">${entry.pos}</p>
    </article>
  `
    )
    .join("");

  $("#grid-view").innerHTML = html;

  $$(".card__play").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = Number(btn.closest(".card").dataset.id);
      const entry = filteredWords.find((w) => w.id === id);
      if (entry) playPronunciation(entry.word);
    });
  });

  $$(".card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const idx = studyQueue.findIndex((w) => w.id === id);
      if (idx >= 0) {
        studyIndex = idx;
        isFlipped = false;
        setView("study");
        renderStudyCard();
      }
    });
  });
}

function renderStudyCard() {
  const total = studyQueue.length;
  if (total === 0) {
    $("#study-counter").textContent = "0 / 0";
    $("#study-progress-fill").style.width = "0%";
    return;
  }

  const entry = studyQueue[studyIndex];
  const progress = ((studyIndex + 1) / total) * 100;

  $("#study-counter").textContent = `${studyIndex + 1} / ${total}`;
  $("#study-progress-fill").style.width = `${progress}%`;

  $("#card-cefr").textContent = entry.cefr || "—";
  $("#card-cefr").className = cefrClass(entry.cefr);
  $("#card-word").textContent = entry.word;
  $("#card-ipa").textContent = getIpa(entry);
  $("#card-pos").textContent = entry.pos;
  $("#card-meaning-vi").textContent = entry.meaning_vi || "—";
  $("#card-definition-vi").textContent = entry.definition_vi || "";
  $("#card-definition").textContent = entry.definition;
  $("#card-example").textContent = entry.example ? `"${entry.example}"` : "";

  const card = $("#flashcard");
  card.classList.toggle("flipped", isFlipped);
  updateFlipButton();

  const known = getKnownSet();
  $("#btn-known").textContent = known.has(entry.word) ? "Đã thuộc ✓" : "Đánh dấu đã thuộc";
  $("#btn-known").classList.toggle("btn--success", known.has(entry.word));
}

function flipCard() {
  isFlipped = !isFlipped;
  $("#flashcard").classList.toggle("flipped", isFlipped);
  updateFlipButton();
}

function updateFlipButton() {
  const btn = $("#btn-flip");
  if (btn) btn.textContent = isFlipped ? "↩ Lật lại" : "↻ Lật thẻ";
}

function nextCard() {
  if (studyQueue.length === 0) return;
  studyIndex = (studyIndex + 1) % studyQueue.length;
  isFlipped = false;
  renderStudyCard();
}

function prevCard() {
  if (studyQueue.length === 0) return;
  studyIndex = (studyIndex - 1 + studyQueue.length) % studyQueue.length;
  isFlipped = false;
  renderStudyCard();
}

function shuffleQueue() {
  for (let i = studyQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [studyQueue[i], studyQueue[j]] = [studyQueue[j], studyQueue[i]];
  }
  studyIndex = 0;
  isFlipped = false;
  renderStudyCard();
}

function setView(view) {
  currentView = view;
  $$(".view-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  $("#grid-view").classList.toggle("hidden", view !== "grid");
  $("#study-view").classList.toggle("hidden", view !== "study");
  toggleEmptyState();
}

function bindEvents() {
  $("#search").addEventListener("input", applyFilters);
  $("#cefr-filter").addEventListener("change", applyFilters);

  $$(".accent-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      accent = btn.dataset.accent;
      $$(".accent-btn").forEach((b) => b.classList.toggle("active", b === btn));
      renderGrid();
      renderStudyCard();
    });
  });

  $$(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });

  $("#flashcard .flashcard__front").addEventListener("click", (e) => {
    if (e.target.closest("#card-play")) return;
    if (!isFlipped) flipCard();
  });

  $("#flashcard .flashcard__back").addEventListener("click", (e) => {
    if (e.target.closest("#btn-flip-back")) return;
    if (isFlipped) flipCard();
  });

  $("#btn-flip-back").addEventListener("click", (e) => {
    e.stopPropagation();
    if (isFlipped) flipCard();
  });

  $("#btn-flip").addEventListener("click", flipCard);

  $("#flashcard").addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      flipCard();
    }
  });

  $("#card-play").addEventListener("click", (e) => {
    e.stopPropagation();
    if (studyQueue[studyIndex]) playPronunciation(studyQueue[studyIndex].word);
  });

  $("#btn-next").addEventListener("click", nextCard);
  $("#btn-prev").addEventListener("click", prevCard);
  $("#btn-shuffle").addEventListener("click", shuffleQueue);
  $("#btn-known").addEventListener("click", () => {
    if (studyQueue[studyIndex]) {
      saveKnown(studyQueue[studyIndex].word);
      renderStudyCard();
      renderGrid();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (currentView !== "study") return;
    if (e.target.matches("input, select, textarea")) return;
    if (e.key === "ArrowRight") nextCard();
    if (e.key === "ArrowLeft") prevCard();
    if (e.key === " ") {
      e.preventDefault();
      flipCard();
    }
  });
}

loadWords().then(bindEvents).catch((err) => {
  $("#app").innerHTML = `<p class="error">${err.message}</p>`;
});
