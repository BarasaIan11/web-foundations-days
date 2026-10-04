let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  const searchWord = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(searchWord));
}

function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }

  return longest;
}

function countByCategory() {
  const counts = {};

  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }

  return counts;
}

function getSummary() {
  const counts = countByCategory();
  const noteWord = notes.length === 1 ? "note" : "notes";
  const categories = ["personal", "work", "study"];
  const categorySummary = categories
    .filter((category) => counts[category])
    .map((category) => `${counts[category]} ${category}`)
    .join(", ");

  return `${notes.length} ${noteWord}: ${categorySummary}.`;
}

function isDuplicate(text) {
  const normalisedText = text.trim().toLowerCase();
  return notes.some(
    (note) => note.text.trim().toLowerCase() === normalisedText,
  );
}

function addNote(text, category) {
  const trimmedText = text.trim();
  const validCategories = ["personal", "work", "study"];

  if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log("Note text must be between 1 and 200 characters.");
    return false;
  }

  if (isDuplicate(trimmedText)) {
    console.log("A note with that text already exists.");
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log("Category must be personal, work, or study.");
    return false;
  }

  const nextId = notes.length === 0 ? 1 : Math.max(...notes.map((note) => note.id)) + 1;
  notes.push({ id: nextId, text: trimmedText, category });
  return true;
}

console.log(searchNotes("javascript")); // Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]
console.log(searchNotes("meeting")); // Expected: []

console.log(longestNote()); // Expected: { id: 3, text: "Email the project report to Grace", category: "work" }
const savedNotes = notes;
notes = [];
console.log(longestNote()); // Expected: null
notes = savedNotes;

console.log(countByCategory()); // Expected: { personal: 2, study: 2, work: 1 }
notes = [];
console.log(countByCategory()); // Expected: {}
notes = savedNotes;

console.log(getSummary()); // Expected: "5 notes: 2 personal, 1 work, 2 study."
notes = [notes[0]];
console.log(getSummary()); // Expected: "1 note: 1 personal."
notes = savedNotes;

console.log(isDuplicate("  BUY MILK AND BREAD  ")); // Expected: true
console.log(isDuplicate("Book a dentist appointment")); // Expected: false

console.log(addNote("Book a dentist appointment", "personal")); // Expected: true
console.log(addNote(" buy milk and bread ", "personal")); // Expected: false; logs duplicate reason
