// Starting notes data
let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];


// ==========================================
// 1. searchNotes()
// ==========================================

function searchNotes(word) {
    return notes.filter(note =>
        note.text.toLowerCase().includes(word.toLowerCase())
    );
}

console.log(searchNotes("javascript"));
// Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]

console.log(searchNotes("pizza"));
// Expected: []



// ==========================================
// 2. longestNote()
// ==========================================

function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    let longest = notes[0];

    for (let note of notes) {
        if (note.text.length > longest.text.length) {
            longest = note;
        }
    }

    return longest;
}

console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

let savedNotes = notes;
notes = [];

console.log(longestNote());
// Expected: null

notes = savedNotes;



// ==========================================
// 3. countByCategory()
// ==========================================

function countByCategory() {
    let counts = {};

    for (let note of notes) {
        if (counts[note.category]) {
            counts[note.category]++;
        } else {
            counts[note.category] = 1;
        }
    }

    return counts;
}

console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

let originalNotes = notes;
notes = [];

console.log(countByCategory());
// Expected: {}

notes = originalNotes;



// ==========================================
// 4. getSummary()
// ==========================================

function getSummary() {
    let counts = countByCategory();
    let total = notes.length;

    let noteWord = total === 1 ? "note" : "notes";

    return `${total} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

console.log(getSummary());
// Expected: 5 notes: 2 personal, 1 work, 2 study.

let savedNotesForSummary = notes;
notes = [savedNotesForSummary[0]];

console.log(getSummary());
// Expected: 1 note: 1 personal, 0 work, 0 study.

notes = savedNotesForSummary;



// ==========================================
// 5. isDuplicate()
// ==========================================

function isDuplicate(text) {
    return notes.some(note =>
        note.text.trim().toLowerCase() === text.trim().toLowerCase()
    );
}

console.log(isDuplicate("  BUY MILK AND BREAD  "));
// Expected: true

console.log(isDuplicate("Buy eggs"));
// Expected: false



// ==========================================
// 6. addNote()
// ==========================================

function addNote(text, category) {

    // Check text length
    if (text.length < 1 || text.length > 200) {
        console.log("Note not added: text must be 1-200 characters.");
        return false;
    }

    // Check for duplicate
    if (isDuplicate(text)) {
        console.log("Note not added: duplicate note.");
        return false;
    }

    // Check category
    if (!["personal", "work", "study"].includes(category)) {
        console.log("Note not added: invalid category.");
        return false;
    }

    // Generate a new ID
    let newId = notes.length > 0
        ? Math.max(...notes.map(note => note.id)) + 1
        : 1;

    notes.push({
        id: newId,
        text: text.trim(),
        category: category
    });

    console.log("Note added successfully.");
    return true;
}

console.log(addNote("Prepare for the JavaScript test", "study"));
// Expected: true

console.log(addNote("  Buy milk and bread  ", "personal"));
// Expected: false, with "Note not added: duplicate note."



// ==========================================
// Additional addNote edge-case tests
// ==========================================

console.log(addNote("", "personal"));
// Expected: false, with "Note not added: text must be 1-200 characters."

console.log(addNote("This category does not exist", "shopping"));
// Expected: false, with "Note not added: invalid category."



// ==========================================
// Final notes check
// ==========================================

console.log(notes);
// Expected: original 5 notes + "Prepare for the JavaScript test"