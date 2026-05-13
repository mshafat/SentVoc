// ভার্সন কোড নেম: SentVoc v4.1 - Text Sanitizer & Learned List Restore
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

window.onload = () => {
    applyTheme();
    setupLanguages();
    handleIncomingShare();

    const inputArea = document.getElementById('note-input');
    if(inputArea) inputArea.addEventListener('dblclick', handleSmartHighlight);
};

// --- স্মার্ট টেক্সট ক্লিনার (ডাবল টেক্সট ও কোটেশন ফিক্স) ---
function handleIncomingShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    
    if (sharedText || sharedTitle) {
        let rawContent = (sharedText || "") + " " + (sharedTitle || "");
        
        // ১. সব ধরণের কোটেশন মার্ক এবং বাড়তি স্পেস মুছে ফেলা
        let cleanText = decodeURIComponent(rawContent)
            .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') // URL রিমুভ
            .replace(/["'“”]/g, '') // সব ধরণের কোটেশন রিমুভ
            .replace(/\+/g, ' ')
            .trim();

        // ২. ডুপ্লিকেট টেক্সট রিমুভ লজিক (বাক্যটি দুইবার থাকলে অর্ধেক করে ফেলা)
        const words = cleanText.split(/\s+/);
        const mid = Math.floor(words.length / 2);
        const firstHalf = words.slice(0, mid).join(" ");
        const secondHalf = words.slice(mid).join(" ");

        if (firstHalf === secondHalf || cleanText.includes(firstHalf + " " + firstHalf)) {
            cleanText = words.slice(0, mid).join(" ");
        }
        
        // ৩. ওভারল্যাপিং টেক্সট ফিক্স (আপনার উদাহরণের মতো সমস্যা হলে)
        const sentences = cleanText.split(". ");
        if(sentences.length > 1 && sentences[0].includes(sentences[1])) {
            cleanText = sentences[0];
        }

        setTimeout(() => {
            const inputArea = document.getElementById('note-input');
            if (inputArea) {
                inputArea.innerText = cleanText;
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 500);
    }
}

// --- ডাটা ইমপোর্ট ফিক্স ---
function importData(e) { 
    const file = e.target.files[0]; 
    if(!file) return; 
    const reader = new FileReader(); 
    reader.onload = (event) => { 
        try {
            const data = JSON.parse(event.target.result); 
            if(data.notes) notes = data.notes;
            if(data.learnedWords) learnedWords = data.learnedWords;
            localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
            localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
            alert("Success!"); location.reload(); 
        } catch (err) { alert("Invalid File"); }
    }; 
    reader.readAsText(file); 
}

// --- লার্নড সেকশন এবং রিভিউ (v2.2 স্টাইল) ---
function showLearned() {
    const container = document.getElementById('learned-list');
    if(!container) return;
    
    container.innerHTML = "";
    if (learnedWords.length === 0) {
        container.innerHTML = '<div class="text-center p-10 opacity-50">কোন শব্দ এখনো মাস্টার করা হয়নি।</div>';
    } else {
        learnedWords.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = "p-4 mb-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border-l-4 border-green-500 animate-slide-in";
            div.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-lg text-slate-800 dark:text-white uppercase">${item.word}</h4>
                        <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">${item.sentence}</p>
                    </div>
                    <button onclick="removeFromLearned(${idx})" class="text-red-400 hover:text-red-600">✕</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    showSection('learned');
}

function removeFromLearned(index) {
    if(confirm("এটি কি আবার লার্নিং লিস্টে পাঠাতে চান?")) {
        learnedWords.splice(index, 1);
        localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
        showLearned();
    }
}

function startLearnedReview() {
    if (learnedWords.length === 0) return alert("রিভিউ করার জন্য কোন শব্দ নেই!");
    currentSessionCards = [...learnedWords];
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    showCard();
    showSection('repeat');
}

// --- কার্ড লজিক ও অন্যান্য ---
function markAsLearned() {
    const card = currentSessionCards[currentIndex];
    if (!learnedWords.some(w => w.id === card.id)) {
        learnedWords.push(card);
        localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
        alert("Mastered! Moved to Learned List.");
        nextCard();
    }
}

async function exportData() {
    const data = JSON.stringify({notes, learnedWords}, null, 2);
    const fileName = `SentVoc_Backup_${new Date().toISOString().slice(0,10)}.json`;
    try {
        const blob = new Blob([data], { type: 'application/json' });
        const file = new File([blob], fileName, { type: 'application/json' });
        if (navigator.share) {
            await navigator.share({ files: [file], title: 'SentVoc Backup' });
        } else { downloadFile(data, fileName); }
    } catch (err) { downloadFile(data, fileName); }
}

function downloadFile(content, name) {
    const blob = new Blob([content], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    
    content.style.padding = "2px 5px";
    if (isFlipped) {
        const style = getDynamicFontSize(card.sentence, 'sentence');
        content.style.fontSize = style.size;
        content.style.lineHeight = style.lh;
        const regex = new RegExp(`(${card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        content.innerHTML = card.sentence.replace(regex, "___MARK___$1___END___").split(/\s+/).map(p => {
            const clean = p.replace("___MARK___", "").replace("___END___", "").replace(/[.,!?।]/g, "");
            if (p.includes("___MARK___")) return `<mark class="bg-yellow-200 dark:bg-yellow-500/50 px-1 rounded font-bold italic cursor-pointer" onclick="lookup('${clean}')">${p.replace("___MARK___", "").replace("___END___", "")}</mark>`;
            return `<span class="cursor-pointer text-indigo-500 hover:underline" onclick="lookup('${clean}')">${p}</span>`;
        }).join(" ");
    } else {
        content.innerText = card.word;
        content.style.fontSize = getDynamicFontSize(card.word, 'word');
    }
}

function getDynamicFontSize(text, type) {
    const wordCount = text.split(/\s+/).length;
    if (type === 'word') return text.length > 12 ? "2rem" : "3rem";
    return { size: wordCount > 35 ? "1.2rem" : "1.5rem", lh: "1.4" };
}

function saveNote() {
    const input = document.getElementById('note-input');
    const words = input.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("শব্দটি হাইলাইট করুন!");
    const date = new Date().toLocaleDateString();
    words.forEach(w => {
        if (!notes[date]) notes[date] = [];
        notes[date].push({ word: w.innerText.trim(), sentence: input.innerText.trim(), id: Date.now() + Math.random(), timestamp: Date.now() });
    });
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("Saved!");
}

function startRepeat(mode) {
    currentSessionCards = [];
    const now = Date.now();
    Object.values(notes).forEach(day => {
        day.forEach(c => {
            if(learnedWords.some(l => l.id === c.id)) return;
            const age = now - (c.timestamp || 0);
            if (mode === 'today' && age <= 86400000) currentSessionCards.push(c);
            else if (mode === 'week' && age <= 604800000) currentSessionCards.push(c);
            else if (mode === 'all') currentSessionCards.push(c);
        });
    });
    if (currentSessionCards.length === 0) return alert("No cards!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    showCard(); showSection('repeat');
}

function showSection(s) {
    document.querySelectorAll('#input-view, #repeat-view, #learned-view').forEach(e => e.classList.add('hidden'));
    document.getElementById(s+'-view').classList.remove('hidden');
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function setupLanguages() {
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    if(!lSel) return;
    Object.entries(languages).forEach(([c, n]) => { 
        lSel.add(new Option(n, c)); 
        tSel.add(new Option(n, c)); 
    });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
}

function applyTheme() {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
}

function toggleSettings() { document.getElementById('settings-modal').classList.toggle('hidden'); }

function handleSmartHighlight(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.toString().trim() === "") return;
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = "vocab-word text-indigo-600 dark:text-indigo-400 font-black underline underline-offset-4";
    span.innerText = selection.toString().trim();
    range.deleteContents();
    range.insertNode(span);
    window.getSelection().removeAllRanges();
}

async function lookup(word) {
    const modal = document.getElementById('dict-modal');
    modal.classList.replace('hidden', 'flex');
    const sl = document.getElementById('learn-lang').value, tl = document.getElementById('target-lang').value;
    try {
        const wRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(word)}`);
        const wData = await wRes.json();
        document.getElementById('dict-word').innerText = word;
        document.getElementById('dict-meaning').innerText = wData[0][0][0];
    } catch (e) { console.error(e); }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }
