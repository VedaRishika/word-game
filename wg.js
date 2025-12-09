// wg.js — adapted to your HTML
const ANSWER_LENGTH = 5;
const ROUNDS = 6;
const letters = document.querySelectorAll(".sq-l"); // your tile class
const loadingDiv = document.querySelector(".inf-hidden"); // your loader wrapper

document.addEventListener("DOMContentLoaded", init);

async function init() {
  // state
  let currentRow = 0;
  let currentGuess = "";
  let done = false;
  let isLoading = true;

  // fetch word of the day (with fallback)
  let word = "";
  try {
    const res = await fetch("https://words.dev-apis.com/word-of-the-day");
    const data = await res.json();
    word = (data.word || "PLACE").toUpperCase();
  } catch (e) {
    console.warn("Fetch failed, using fallback word. Error:", e);
    // fallback list — you can extend this
    const fallback = ["APPLE", "BREAD", "CRANE", "PLACE", "GHOST", "TRAIN"];
    word = fallback[Math.floor(Math.random() * fallback.length)];
  }
  const wordParts = word.split("");

  isLoading = false;
  setLoading(isLoading);

  // add a letter to the current guess and update UI
  function addLetter(letter) {
    if (done || isLoading) return;
    if (!isLetter(letter)) return;

    if (currentGuess.length < ANSWER_LENGTH) {
      currentGuess += letter;
    } else {
      // replace last character if row is already full
      currentGuess = currentGuess.substring(0, currentGuess.length - 1) + letter;
    }

    const pos = currentGuess.length - 1; // 0-based position in row
    const cellIndex = currentRow * ANSWER_LENGTH + pos;
    const cell = letters[cellIndex];
    if (cell) cell.innerText = letter;
  }

  // commit the guess: validate & mark tiles
  async function commit() {
    if (done || isLoading) return;
    if (currentGuess.length !== ANSWER_LENGTH) {
      // not enough letters
      return;
    }

    // validate word via API (optional) — gracefully handle failures
    isLoading = true;
    setLoading(isLoading);
    let validWord = true;
    try {
      const res = await fetch("https://words.dev-apis.com/validate-word", {
        method: "POST",
        body: JSON.stringify({ word: currentGuess }),
      });
      const data = await res.json();
      validWord = data.validWord;
    } catch (e) {
      console.warn("Validation request failed; assuming valid. Error:", e);
      validWord = true; // change to false if you want to block offline
    }
    isLoading = false;
    setLoading(isLoading);

    if (!validWord) {
      markInvalidWord();
      return;
    }

    const guessParts = currentGuess.split("");
    const map = makeMap(wordParts);
    let allRight = true;

    // first pass: mark correct letters
    for (let i = 0; i < ANSWER_LENGTH; i++) {
      const idx = currentRow * ANSWER_LENGTH + i;
      const cell = letters[idx];
      if (!cell) continue;
      if (guessParts[i] === wordParts[i]) {
        cell.classList.add("correct");
        map[guessParts[i]]--;
      }
    }

    // second pass: mark close / wrong letters
    for (let i = 0; i < ANSWER_LENGTH; i++) {
      const idx = currentRow * ANSWER_LENGTH + i;
      const cell = letters[idx];
      if (!cell) continue;

      if (guessParts[i] === wordParts[i]) {
        // already handled
        continue;
      } else if (map[guessParts[i]] && map[guessParts[i]] > 0) {
        allRight = false;
        cell.classList.add("close");
        map[guessParts[i]]--;
      } else {
        allRight = false;
        cell.classList.add("wrong");
      }
    }

    // advance
    currentRow++;
    currentGuess = "";

    if (allRight) {
      // win
      alert("You win!");
      const heading = document.querySelector(".heading");
      if (heading) heading.classList.add("winner");
      done = true;
      return;
    }

    if (currentRow === ROUNDS) {
      // lose
      alert(`You lose — the word was ${word}`);
      done = true;
      return;
    }
  }

  // backspace: remove last char and clear UI cell
  function backspace() {
    if (done || isLoading) return;
    if (currentGuess.length === 0) return;

    const removedPos = currentGuess.length - 1;
    currentGuess = currentGuess.substring(0, removedPos);

    const cellIndex = currentRow * ANSWER_LENGTH + removedPos;
    const cell = letters[cellIndex];
    if (cell) cell.innerText = "";
  }

  // show invalid animation on current row
  function markInvalidWord() {
    for (let i = 0; i < ANSWER_LENGTH; i++) {
      const idx = currentRow * ANSWER_LENGTH + i;
      const cell = letters[idx];
      if (!cell) continue;
      // remove then re-add a class so the animation retriggers
      cell.classList.remove("invalid");
      // small delay so browser repaints
      setTimeout(() => cell.classList.add("invalid"), 10);
    }
  }

  // keyboard handling
  document.addEventListener("keydown", function (event) {
    if (done || isLoading) return;
    const action = event.key;

    if (action === "Enter") {
      commit();
    } else if (action === "Backspace") {
      event.preventDefault(); // avoid browser nav in some contexts
      backspace();
    } else if (isLetter(action)) {
      addLetter(action.toUpperCase());
    } else {
      // ignore other keys
    }
  });
}

// helper: letter test
function isLetter(letter) {
  return /^[a-zA-Z]$/.test(letter);
}

// helper: toggle your loader. your HTML uses class "inf-hidden" initially,
// so we add the class when NOT loading and remove it when loading.
function setLoading(isLoading) {
  if (!loadingDiv) return;
  // when not loading -> keep it hidden (add class), when loading -> show (remove class)
  loadingDiv.classList.toggle("inf-hidden", !isLoading);
}

// helper: make frequency map of an array of letters
function makeMap(array) {
  const obj = {};
  for (let i = 0; i < array.length; i++) {
    const ch = array[i];
    if (!ch) continue;
    obj[ch] = obj[ch] ? obj[ch] + 1 : 1;
  }
  return obj;
}
