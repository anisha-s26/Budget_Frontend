function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        // Update the toggle icon if it exists on the page
        const darkToggle = document.getElementById('dark-mode-toggle');
        if (darkToggle) darkToggle.innerText = '☀️';
    }
}

// Run this immediately on script load
applySavedTheme();

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('bill-input');
const previewImg = document.getElementById('preview-img');
const statusText = document.getElementById('status-text');
const resultsArea = document.getElementById('results-area');

// 1. Trigger hidden file input when clicking the box
dropZone.addEventListener('click', () => fileInput.click());

// 2. Handle file selection
fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

// 3. Handle Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#6366f1";
    dropZone.style.background = "rgba(99, 102, 241, 0.05)";
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = "";
    dropZone.style.background = "";
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
});

// 4. Core Processing Logic
function handleFile(file) {
    if (!file) return;

    // Reset UI for new scan
    statusText.innerText = "⚡ Reading document... please wait.";
    resultsArea.style.display = 'none';
    previewImg.style.display = 'none';
    
    const reader = new FileReader();

    reader.onload = async (e) => {
        const fileUrl = e.target.result;

        // Show Image Preview
        if (file.type.startsWith('image/')) {
            previewImg.src = fileUrl;
            previewImg.style.display = 'block';
            runOCR(fileUrl);
        } 
        // Handle PDF (Requires pdf.js to convert to image first)
        else if (file.type === 'application/pdf') {
            document.getElementById('doc-icon').style.display = 'block';
            processPDF(fileUrl);
        }
    };

    reader.readAsDataURL(file);
}

// 5. OCR Engine (Tesseract)
async function runOCR(source) {
    const statusText = document.getElementById('status-text');
    try {
        const worker = await Tesseract.createWorker('eng');
        const { data: { text } } = await worker.recognize(source);
        await worker.terminate();

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // --- 1. Detect Merchant Name ---
        // We look at the first 3 lines. We skip lines that are just dates or numbers.
        let merchantName = "Unknown Merchant";
        for (let i = 0; i < Math.min(lines.length, 3); i++) {
            const line = lines[i];
            // Skip if line is just a date (e.g. 23/03/2026) or just numbers
            if (!/^\d/.test(line) && line.length > 2) {
                merchantName = line;
                break;
            }
        }

        // --- 2. Detect Grand Total (Bottom-Up) ---
        let detectedAmount = "";
        const reversedLines = [...lines].reverse();
        for (let line of reversedLines) {
            const match = line.match(/(?:total|payable|due|net|amt)\s*[:\-\s]*[₹$]?\s*([\d,]+\.\d{2})/i);
            if (match) {
                detectedAmount = match[1].replace(/,/g, '');
                break;
            }
        }

        // --- 3. Update UI ---
        document.getElementById('scanned-amount').value = detectedAmount;
        document.getElementById('scanned-desc').value = merchantName; // Now shows shop name
        document.getElementById('results-area').style.display = "block";
        statusText.innerText = "✅ Merchant & Total Detected!";

    } catch (err) {
        statusText.innerText = "❌ OCR Failed.";
        console.error(err);
    }
}
// 6. Extraction Logic (AI-ish)
function extractDetails(text) {
    console.log("Full Scanned Text:", text); // Debugging

    // Basic Regex to find currency (₹ or Rs or total amount)
    const amountMatch = text.match(/(?:RS|INR|₹|TOTAL)\s?[:.]?\s?(\d+[\d,.]*)/i);
    const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : "";

    // Fill the inputs
    document.getElementById('scanned-amount').value = amount;
    document.getElementById('scanned-desc').value = "Scanned Bill";
    
    // Show results
    statusText.innerText = "✅ Scan Complete!";
    resultsArea.style.display = 'block';
}

// 7. Save to MongoDB (Matches your script.js logic)
document.getElementById('save-scan-btn').onclick = async () => {
    const uid = localStorage.getItem('uid');
    const amount = document.getElementById('scanned-amount').value;
    const description = document.getElementById('scanned-desc').value;

    if (!uid) return alert("Log in first!");

    const payload = {
        userId: uid,
        description: description,
        amount: parseFloat(amount),
        category: "Bills", // Default for scanner
        date: new Date().toISOString().split('T')[0]
    };

    try {
        const res = await fetch(`http://localhost:5000/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            window.location.href = "index.html"; 
        }
    } catch (err) {
        alert("Server error. Is your backend running?");
    }
};

// Logout Logic for Scanner Page
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = "index.html";
    });
}