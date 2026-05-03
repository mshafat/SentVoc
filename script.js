let notes = JSON.parse(localStorage.getItem('vocab_notes')) || {};
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

function toggleSettings() {
    const settings = document.getElementById('settings-view');
    settings.classList.toggle('hidden');
}

function saveNote() {
    const input = document.getElementById('note-input');
    const text = input.value.trim();
    if (!text) return;

    const date = new Date().toLocaleDateString();
    const boldWords = text.match(/\*\*(.*?)\*\*/g);

    if (!boldWords) return alert("দয়া করে শব্দটিকে **বোল্ড** করুন!");

    const newEntries = boldWords.map(bw => ({
        word: bw.replace(/\*\*/g, ""),
        sentence: text.replace(/\*\*/g, ""),
        date: date
    }));

    if (!notes[date]) notes[date] = [];
    notes[date].push(...newEntries);
    
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    input.value = "";
    alert("VocabLog-এ সেভ হয়েছে!");
}

function startRepeat(range) {
    currentSessionCards = [];
    Object.values(notes).forEach(dayCards => currentSessionCards.push(...dayCards));

    if (currentSessionCards.length === 0) return alert("কোনো ডাটা নেই!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    
    currentIndex = 0;
    isFlipped = false;
    showCard();
    document.getElementById('input-view').classList.add('hidden');
    document.getElementById('repeat-view').classList.remove('hidden');
}

function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    
    if (isFlipped) {
        const words = card.sentence.split(" ");
        content.innerHTML = words.map(w => `<span class="cursor-pointer text-indigo-500 hover:underline" onclick="lookup('${w.replace(/[.,]/g, "")}')">${w}</span>`).join(" ");
    } else {
        content.innerText = card.word;
    }
}

function flipCard() {
    isFlipped = !isFlipped;
    showCard();
}

function nextCard() {
    if (currentIndex < currentSessionCards.length - 1) {
        currentIndex++;
        isFlipped = false;
        showCard();
    } else {
        alert("সেশন শেষ!");
        exitRepeat();
    }
}

function exitRepeat() {
    document.getElementById('input-view').classList.remove('hidden');
    document.getElementById('repeat-view').classList.add('hidden');
}

// বহুমুখী ডিকশনারি এবং ট্রান্সলেশন ফাংশন
async function lookup(word) {
    event.stopPropagation();
    const modal = document.getElementById('dict-modal');
    const wordEl = document.getElementById('dict-word');
    const meaningEl = document.getElementById('dict-meaning');
    
    const sourceLang = document.getElementById('learn-lang').value;
    const targetLang = document.getElementById('target-lang').value;

    wordEl.innerText = "খুঁজছি...";
    meaningEl.innerText = "";
    modal.classList.replace('hidden', 'flex');

    try {
        // গুগল ট্রান্সলেট ফ্রি API ব্যবহার করে অর্থ বের করা
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURI(word)}`);
        const data = await res.json();
        
        if (data[0] && data[0][0]) {
            wordEl.innerText = word;
            meaningEl.innerText = data[0][0][0]; // এটি অনুবাদিত অর্থ দেখাবে
        } else {
            meaningEl.innerText = "অর্থ পাওয়া যায়নি।";
        }
    } catch (e) {
        meaningEl.innerText = "ইন্টারনেট বা সেটিংস চেক করুন।";
    }
}

function closeModal() {
    document.getElementById('dict-modal').classList.replace('flex', 'hidden');
}
