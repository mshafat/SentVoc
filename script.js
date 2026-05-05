const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "zh": "Chinese", "ja": "Japanese", "ko": "Korean", "fa": "Persian" };
let notes = JSON.parse(localStorage.getItem('vocab_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('learned_words')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

window.onload = () => {
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    Object.entries(languages).forEach(([c, n]) => { lSel.add(new Option(n, c)); tSel.add(new Option(n, c)); });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
};

// --- NEW SELECTION LOGIC ---
function handleSelection() {
    const selection = window.getSelection();
    const boldTool = document.getElementById('bold-tool');
    if (selection.toString().trim().length > 0) {
        boldTool.classList.remove('hidden');
    } else {
        boldTool.classList.add('hidden');
    }
}

function makeBold() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = "vocab-word text-indigo-600 font-black underline decoration-2 underline-offset-4";
    range.surroundContents(span);
    document.getElementById('bold-tool').classList.add('hidden');
}

function saveNote() {
    const input = document.getElementById('note-input');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = input.innerHTML;
    
    const words = tempDiv.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("Please select a word to highlight!");

    const date = new Date().toLocaleDateString();
    const sentenceRaw = tempDiv.innerText;

    words.forEach(w => {
        const targetWord = w.innerText;
        if (!notes[date]) notes[date] = [];
        notes[date].push({
            word: targetWord,
            sentence: sentenceRaw,
            id: Date.now() + Math.random()
        });
    });

    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    input.innerHTML = "";
    alert("Flashcards Saved!");
}

// --- CARD DISPLAY WITH HIGHLIGHTING ---
function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;

    if (isFlipped) {
        // Highlight the target word in the sentence
        let sentenceHtml = card.sentence;
        const escapedWord = card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedWord})`, 'gi');
        
        // Wrap with a yellow highlight class
        sentenceHtml = sentenceHtml.replace(regex, `<span class="bg-yellow-200 px-1 rounded font-bold text-slate-900">$1</span>`);
        
        // Make other words clickable
        const words = sentenceHtml.split(/\s+/);
        content.innerHTML = words.map(w => {
            if(w.includes('bg-yellow-200')) return w; // Don't wrap the highlighted one again
            return `<span class="cursor-pointer text-indigo-500 hover:underline" onclick="lookup('${w.replace(/[.,!?।]/g, "")}')">${w}</span>`;
        }).join(" ");
        
        content.className = "text-2xl font-semibold text-slate-700 leading-snug";
    } else {
        content.innerText = card.word;
        content.className = "text-4xl font-black text-slate-800 tracking-tight uppercase";
    }
}

// --- REUSE OLD FUNCTIONS (Delete, Prev, Next, Flip, Lookup, Backup) ---
function showSection(s) { document.querySelectorAll('#input-view, #repeat-view, #learned-view, #settings-view').forEach(e => e.classList.add('hidden')); if(s==='learned')renderLearnedList(); document.getElementById(s+'-view').classList.remove('hidden'); }
function toggleSettings() { document.getElementById('settings-view').classList.toggle('hidden'); localStorage.setItem('pref_learn', document.getElementById('learn-lang').value); localStorage.setItem('pref_target', document.getElementById('target-lang').value); }
function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { alert("Done!"); showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }
function deleteCurrentCard() { if(confirm("Delete?")){ const id = currentSessionCards[currentIndex].id; for(let d in notes) notes[d]=notes[d].filter(c=>c.id!==id); localStorage.setItem('vocab_notes', JSON.stringify(notes)); currentSessionCards.splice(currentIndex,1); if(currentSessionCards.length===0)showSection('input'); else{if(currentIndex>=currentSessionCards.length)currentIndex=0;isFlipped=false;showCard();} } }
function markAsLearned() { if(confirm("Mastered?")){ learnedWords.push(currentSessionCards[currentIndex]); localStorage.setItem('learned_words', JSON.stringify(learnedWords)); currentSessionCards.splice(currentIndex, 1); if (currentSessionCards.length === 0) showSection('input'); else { if(currentIndex >= currentSessionCards.length) currentIndex--; isFlipped = false; showCard(); } } }
function renderLearnedList() { const list = document.getElementById('learned-list'); list.innerHTML = learnedWords.length === 0 ? '<p class="text-center py-10 text-slate-400">Empty.</p>' : ''; learnedWords.forEach(lw => { const div = document.createElement('div'); div.className = "bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"; div.innerHTML = `<p class="font-bold text-indigo-600">${lw.word}</p><p class="text-xs text-slate-400">${lw.sentence}</p>`; list.appendChild(div); }); }
async function lookup(word) { event.stopPropagation(); const modal = document.getElementById('dict-modal'); document.getElementById('dict-word').innerText = "Searching..."; modal.classList.replace('hidden', 'flex'); try { const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${document.getElementById('learn-lang').value}&tl=${document.getElementById('target-lang').value}&dt=t&q=${encodeURI(word)}`); const data = await res.json(); document.getElementById('dict-word').innerText = word; document.getElementById('dict-meaning').innerText = data[0][0][0]; } catch (e) { document.getElementById('dict-meaning').innerText = "Error."; } }
function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }
function exportData() { const blob = new Blob([JSON.stringify({notes, learnedWords})], {type: "application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `VocabLog_Backup.json`; a.click(); }
function importData(e) { const f = e.target.files[0]; if(!f)return; const r = new FileReader(); r.onload = (ev) => { const d = JSON.parse(ev.target.result); if(d.notes){localStorage.setItem('vocab_notes', JSON.stringify(d.notes));localStorage.setItem('learned_words', JSON.stringify(d.learnedWords));location.reload();} }; r.readAsText(f); }

function startRepeat(range) {
    currentSessionCards = [];
    Object.values(notes).forEach(dayCards => {
        dayCards.forEach(card => {
            if(!learnedWords.some(lw => lw.id === card.id)) currentSessionCards.push(card);
        });
    });
    if (currentSessionCards.length === 0) return alert("Empty!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false; showCard(); showSection('repeat');
}
