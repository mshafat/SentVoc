// ... (Keep Language codes and variables from v1.0) ...

// One-Tap Bold Logic
function handleSelection() {
    const input = document.getElementById('note-input');
    const boldTool = document.getElementById('bold-tool');
    const selectedText = input.value.substring(input.selectionStart, input.selectionEnd).trim();
    
    if (selectedText.length > 0) {
        boldTool.classList.remove('hidden');
    } else {
        boldTool.classList.add('hidden');
    }
}

function makeBold() {
    const input = document.getElementById('note-input');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;
    const selectedText = val.substring(start, end);
    
    if (selectedText) {
        const newVal = val.substring(0, start) + `**${selectedText}**` + val.substring(end);
        input.value = newVal;
        document.getElementById('bold-tool').classList.add('hidden');
    }
}

// Improved Flashcard Content Display
function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    
    if (isFlipped) {
        // Back Side: Sentence with larger font
        const words = card.sentence.split(/\s+/);
        content.innerHTML = words.map(w => `<span class="cursor-pointer text-indigo-500 px-0.5" onclick="lookup('${w.replace(/[.,!?]/g, "")}')">${w}</span>`).join(" ");
        content.className = "text-2xl font-semibold text-slate-700 leading-snug"; // Increased from text-xl to text-2xl
    } else {
        // Front Side: Target Word
        content.innerText = card.word;
        content.className = "text-4xl font-black text-slate-800 tracking-tight";
    }
}

// Improved Note Saving Logic (fixes start/end issues)
function saveNote() {
    const input = document.getElementById('note-input');
    const text = input.value.trim();
    if (!text) return;

    // Fixed Regex to capture **word** anywhere
    const regex = /\*\*(.*?)\*\*/g;
    let match;
    const newEntries = [];

    while ((match = regex.exec(text)) !== null) {
        newEntries.push({
            word: match[1],
            sentence: text.replace(/\*\*/g, ""), // Remove all stars for the back card
            date: new Date().toLocaleDateString(),
            id: Date.now() + Math.random()
        });
    }

    if (newEntries.length === 0) return alert("Please select a word to bold!");

    if (!notes[new Date().toLocaleDateString()]) notes[new Date().toLocaleDateString()] = [];
    notes[new Date().toLocaleDateString()].push(...newEntries);
    
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    input.value = "";
    document.getElementById('bold-tool').classList.add('hidden');
    alert("Word Logged!");
}

// ... (Rest of the functions: Delete, Backup, Lookup from v1.0) ...
