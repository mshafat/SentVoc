let notes = JSON.parse(localStorage.getItem('vocab_notes')) || {};
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

// নোট সেভ করা
function saveNote() {
    const input = document.getElementById('note-input');
    const text = input.value.trim();
    if (!text) return alert("কিছু লিখুন!");

    const date = new Date().toLocaleDateString();
    const boldWords = text.match(/\*\*(.*?)\*\*/g);

    if (!boldWords) return alert("**শব্দ** বোল্ড করুন!");

    const newEntries = boldWords.map(bw => ({
        word: bw.replace(/\*\*/g, ""),
        sentence: text.replace(/\*\*/g, ""), // বাক্যে বোল্ড মার্ক সরিয়ে সাধারণ রাখা
        date: date
    }));

    if (!notes[date]) notes[date] = [];
    notes[date].push(...newEntries);
    
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    input.value = "";
    alert("সফলভাবে সেভ হয়েছে!");
}

// রিপিট সেশন শুরু
function startRepeat(range) {
    currentSessionCards = [];
    const allDates = Object.keys(notes);
    
    allDates.forEach(date => {
        currentSessionCards.push(...notes[date]);
    });

    if (currentSessionCards.length === 0) return alert("কোনো কার্ড সেভ করা নেই!");

    // র‍্যান্ডম করা
    currentSessionCards.sort(() => Math.random() - 0.5);
    
    currentIndex = 0;
    isFlipped = false;
    showCard();
    
    document.getElementById('input-view').classList.add('hidden');
    document.getElementById('repeat-view').classList.remove('hidden');
}

// কার্ড দেখানো
function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    const progress = document.getElementById('card-progress');
    
    progress.innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    
    if (isFlipped) {
        // বাক্যের প্রতিটি শব্দকে ক্লিকেবল করা
        const words = card.sentence.split(" ");
        content.innerHTML = words.map(w => `<span class="word-btn" onclick="lookup('${w.replace(/[.,]/g, "")}')">${w}</span>`).join(" ");
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
        alert("আজকের সেশন শেষ!");
        exitRepeat();
    }
}

function exitRepeat() {
    document.getElementById('input-view').classList.remove('hidden');
    document.getElementById('repeat-view').classList.add('hidden');
}

// ডিকশনারি লুকআপ
async function lookup(word) {
    event.stopPropagation(); // কার্ড ফ্লিপ হওয়া বন্ধ করবে
    const modal = document.getElementById('dict-modal');
    const wordEl = document.getElementById('dict-word');
    const meaningEl = document.getElementById('dict-meaning');

    wordEl.innerText = "Loading...";
    meaningEl.innerText = "";
    modal.classList.replace('hidden', 'flex');

    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await res.json();
        
        if (data[0]) {
            wordEl.innerText = word;
            meaningEl.innerText = data[0].meanings[0].definitions[0].definition;
        } else {
            wordEl.innerText = "দুঃখিত";
            meaningEl.innerText = "অর্থ খুঁজে পাওয়া যায়নি।";
        }
    } catch (e) {
        wordEl.innerText = "Error";
        meaningEl.innerText = "ইন্টারনেট কানেকশন চেক করুন।";
    }
}

function closeModal() {
    document.getElementById('dict-modal').classList.replace('flex', 'hidden');
}
