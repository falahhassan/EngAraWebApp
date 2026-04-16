let dictionaryData = {};
let _entries = null; // cached entries for performance

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
}

function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD") // decompose accented chars
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks (café → cafe)
    .trim();
}

function getMeaning(val) {
  // handle string, array, or { meaning: "..." } shaped JSON values
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.join(" · ");
  if (val?.meaning) return String(val.meaning);
  return String(val);
}

function getEntries() {
  if (!_entries) _entries = Object.entries(dictionaryData);
  return _entries;
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escapedText.replace(
    new RegExp(`(${escapedQuery})`, "gi"),
    "<mark>$1</mark>",
  );
}

function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Dictionary loader ──────────────────────────────────────────────────────

async function loadDictionary() {
  try {
    const response = await fetch("../data/dictionary.json");
    if (!response.ok) throw new Error("File not found");
    dictionaryData = await response.json();
    _entries = null; // reset cache after load
    document.getElementById("stats").innerHTML =
      `✅ ${Object.keys(dictionaryData).length} entries loaded`;
    document.getElementById("results").innerHTML =
      '<div class="no-results">✨ Type a word to search</div>';
  } catch (err) {
    document.getElementById("stats").innerHTML =
      "❌ Failed to load dictionary.json";
    document.getElementById("results").innerHTML = `<div class="error">
      Start a local server: <code>python3 -m http.server 8000</code><br>
      Then open <strong>http://localhost:8000</strong><br>
      Ensure dictionary.json is in the <strong>data/</strong> folder.
    </div>`;
  }
}

// ── Search ─────────────────────────────────────────────────────────────────

function _search() {
  const raw = document.getElementById("searchInput").value;
  const query = normalize(raw);

  const statsDiv = document.getElementById("stats");
  const resultsDiv = document.getElementById("results");
  const total = Object.keys(dictionaryData).length;

  if (!query) {
    resultsDiv.innerHTML =
      '<div class="no-results">🔎 Type a word to search</div>';
    statsDiv.innerHTML = `📖 ${total} entries ready`;
    return;
  }

  // Rank results: exact → prefix → word contains → found in meaning
  const exact = [];
  const prefix = [];
  const inWord = [];
  const inMeaning = [];

  for (const [word, val] of getEntries()) {
    const nWord = normalize(word);
    const meaning = getMeaning(val);
    const nMeaning = normalize(meaning);

    if (nWord === query) exact.push([word, meaning, "exact"]);
    else if (nWord.startsWith(query)) prefix.push([word, meaning, "prefix"]);
    else if (nWord.includes(query)) inWord.push([word, meaning, "word"]);
    else if (nMeaning.includes(query))
      inMeaning.push([word, meaning, "meaning"]);
  }

  const matches = [...exact, ...prefix, ...inWord, ...inMeaning];

  statsDiv.innerHTML = matches.length
    ? `🔍 ${matches.length} result(s) for "${escapeHtml(raw)}" · ${total} entries`
    : `😕 No results for "${escapeHtml(raw)}" · ${total} entries`;

  if (!matches.length) {
    resultsDiv.innerHTML = `<div class="no-results">No matches for "${escapeHtml(raw)}". Try a shorter or different word.</div>`;
    return;
  }

  resultsDiv.innerHTML = matches
    .map(
      ([word, meaning, type]) => `
    <div class="entry" data-match-type="${type}">
      <strong>📘 ${highlight(word, raw)}</strong>
      <div class="meaning">${type === "meaning" ? highlight(meaning, raw) : escapeHtml(meaning)}</div>
    </div>
  `,
    )
    .join("");
}

const search = debounce(_search, 250);

// ── Event listeners ────────────────────────────────────────────────────────

document.getElementById("searchBtn").addEventListener("click", search);
//document.getElementById("searchInput").addEventListener("input", search);
document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") search();
});

loadDictionary();
