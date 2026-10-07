// =========================
// SELECT HTML ELEMENTS
// =========================

const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");


// =========================
// UPDATE COUNTERS
// =========================

function updateCounts() {

    const text = noteText.value;

    // Count characters
    const characters = text.length;

    // Count words
    const words = text.trim() === ""
        ? 0
        : text.trim().split(/\s+/).length;

    // Display character count
    charCount.textContent = `${characters} / 200 characters`;

    // Display word count
    wordCount.textContent = `${words} words`;

    // Remove previous warning classes
    charCount.classList.remove("warning");
    charCount.classList.remove("over");

    // Add warning class after 180 characters
    if (characters > 180 && characters <= 200) {
        charCount.classList.add("warning");
    }

    // Add over class above 200 characters
    if (characters > 200) {
        charCount.classList.add("over");
    }
}


// =========================
// INPUT EVENT
// =========================

noteText.addEventListener("input", function () {

    updateCounts();

    // Save draft
    localStorage.setItem("noteDraft", noteText.value);
});


// =========================
// RESTORE DRAFT AND THEME
// =========================

const savedDraft = localStorage.getItem("noteDraft");

if (savedDraft !== null) {
    noteText.value = savedDraft;
}


const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {

    document.body.classList.add("dark");

    themeToggle.textContent = "Light mode";

} else {

    themeToggle.textContent = "Dark mode";
}


// Update counters after restoring draft
updateCounts();


// =========================
// CLEAR BUTTON
// =========================

clearBtn.addEventListener("click", function () {

    noteText.value = "";

    localStorage.removeItem("noteDraft");

    updateCounts();
});


// =========================
// ESCAPE KEY
// =========================

noteText.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        noteText.value = "";

        localStorage.removeItem("noteDraft");

        updateCounts();
    }
});


// =========================
// THEME TOGGLE
// =========================

themeToggle.addEventListener("click", function () {

    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {

        themeToggle.textContent = "Light mode";

        localStorage.setItem("theme", "dark");

    } else {

        themeToggle.textContent = "Dark mode";

        localStorage.setItem("theme", "light");
    }
});