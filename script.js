
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
const API = "http://localhost:5000";

// --- DOM Elements ---
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const authForm = document.getElementById('auth-form');
const expenseForm = document.getElementById('expense-form');
const logoutBtn = document.getElementById('logout-btn');
const darkToggle = document.getElementById('dark-mode-toggle');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthText = document.getElementById('toggle-auth');
const passwordInput = document.getElementById('auth-password');
const toggleBtn = document.getElementById('password-toggle');
const descInput = document.getElementById('description');
const categSelect = document.getElementById('category');

let isLoginMode = true;

// --- 1. Initial Load & Session Check ---
window.addEventListener('load', () => {
    const savedUid = localStorage.getItem('uid');
    if (savedUid) {
        showDashboard();
    }
    initDateValidation();
});

function showDashboard() {
    authContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    loadExpenses();
}

// --- 2. Authentication Logic ---
toggleAuthText.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authTitle.innerText = isLoginMode ? "Welcome Back 👋" : "Create Account ✨";
    authSubmitBtn.innerText = isLoginMode ? "Login" : "Sign Up";
    toggleAuthText.innerHTML = isLoginMode 
        ? "Don't have account sign up, <span>here</span>" 
        : "Already have an account? <span>Login here</span>";
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const endpoint = isLoginMode ? '/login' : '/signup';

    try {
        const res = await fetch(`${API}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('uid', data.userId); 
            localStorage.setItem('userEmail', email);
            showSuccessToast(isLoginMode ? "Welcome back!" : "Account created!");
            showDashboard();
        } else {
            alert(data.message || "Authentication failed.");
        }
    } catch (err) {
        showSuccessToast("❌ Server is offline.");
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// --- 3. Expense Management (Add) ---
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const uid = localStorage.getItem('uid');
    if (!uid) return alert("Session expired.");

    const payload = {
        userId: uid,
        date: document.getElementById('date').value,
        amount: parseFloat(document.getElementById('amount').value),
        description: descInput.value,
        category: categSelect.value
    };

    try {
        const res = await fetch(`${API}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            expenseForm.reset();
            initDateValidation(); 
            loadExpenses();
            showSuccessToast("Expense added! ✅");
        }
    } catch (err) {
        expenseForm.classList.add('error-shake');
        setTimeout(() => expenseForm.classList.remove('error-shake'), 400);
    }
});

// --- 4. Load & Render Logic (The Colourful Part) ---
async function loadExpenses() {
    const uid = localStorage.getItem('uid');
    if (!uid) return;

    try {
        const res = await fetch(`${API}/all/${uid}`);
        const data = await res.json();
        updateSummaryCards(data);
        renderHistory(data);
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

function renderHistory(data) {
    const historyList = document.getElementById('history-list');
    if (data.length === 0) {
        historyList.innerHTML = `<div class="empty-state"><p>No transactions yet.</p></div>`;
        return;
    }

    const tableHTML = `
        <table class="styled-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => {
                    // Logic to apply colourful tags based on category
                    const categoryValue = item.category || 'Other';
                    const tagClass = `tag-${categoryValue.toLowerCase()}`;

                    return `
                    <tr>
                        <td>
                            <strong>${item.description}</strong><br>
                            <small>${new Date(item.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</small>
                        </td>
                        <td>
                            <span class="category-tag ${tagClass}">${categoryValue}</span>
                        </td>
                        <td class="amount-text">₹${item.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        <td>
                            <button class="delete-btn" onclick="deleteItem('${item._id}')">Delete</button>
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    historyList.innerHTML = tableHTML;
}

// Instant Delete Logic (No Alert)
async function deleteItem(id) {
    try {
        const res = await fetch(`${API}/delete/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadExpenses();
            showSuccessToast("Deleted 🗑️");
        }
    } catch (err) {
        console.error("Delete failed:", err);
    }
}

// --- 5. Smart AI Category Logic ---
const categoryMap = {
    'Food': [
        'burger', 'pizza', 'dinner', 'lunch', 'grocery', 'swiggy', 'zomato', 
        'tea', 'coffee', 'maggi', 'restaurant', 'milk', 'blinkit', 'zepto', 
        'bbnow', 'meat', 'vegetables', 'fruit', 'snacks', 'starbucks', 'kfc', 'mcdonald'
    ],
    'Transport': [
        'fuel', 'petrol', 'uber', 'ola', 'bus', 'metro', 'auto', 'rapido', 
        'cab', 'train', 'flight', 'indigo', 'parking', 'toll', 'puncture', 'service'
    ],
    'Bills': [
        'rent', 'electricity', 'recharge', 'wifi', 'netflix', 'gym', 'water', 
        'gas', 'jio', 'airtel', 'vi', 'broadband', 'maintenance', 'trash', 'iptv'
    ],
    'Shopping': [
        'amazon', 'clothes', 'shoes', 'flipkart', 'mall', 'zara', 'h&m', 
        'myntra', 'iphone', 'laptop', 'electronics', 'gadget', 'shirt', 'jeans', 
        'meesho', 'ajio', 'nykaa'
    ],
    'Health': [
        'doctor', 'medicine', 'hospital', 'pharmacy', 'test', 'dentist', 
        'apollo', 'pharmeasy', 'insurance', 'health', 'clinic', 'tablet', 'vitamin'
    ],
    'Entertainment': [
        'movie', 'theatre', 'pvr', 'inox', 'concert', 'club', 'pub', 'bar', 
        'gaming', 'ps5', 'steam', 'spotify', 'booking', 'ticket', 'vacation'
    ],
    'Education': [
        'course', 'udemy', 'coursera', 'book', 'stationary', 'tuition', 'fees', 
        'exam', 'college', 'school', 'workshop', 'internship'
    ],
    'Personal Care': [
        'salon', 'barber', 'haircut', 'spa', 'makeup', 'skincare', 'parlour', 
        'shampoo', 'perfume', 'cosmetics'
    ],
    'Investment': [
        'stock', 'crypto', 'mutual fund', 'sip', 'gold', 'fd', 'insurance premium', 
        'bitcoin', 'zerodha', 'groww', 'upstox'
    ],
    'Misc': [
        'gift', 'charity', 'donation', 'loan', 'interest', 'cash', 'transfer', 'fine'
    ]
};

descInput.addEventListener('input', () => {
    const text = descInput.value.toLowerCase().trim();
    
    // 1. If the input is empty, reset to the placeholder
    if (text.length === 0) {
        categSelect.value = "";
        categSelect.style.borderColor = "#cbd5e1";
        return;
    }

    let foundMatch = false;

    // 2. Try to find a match in the Map
    for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => text.includes(kw))) {
            categSelect.value = category;
            
            // Visual feedback for a "Smart" match
            categSelect.style.borderColor = "#6366f1"; 
            foundMatch = true;
            break; 
        }
    }

    // 3. FALLBACK: If no keyword matched, set to 'Misc'
    if (!foundMatch && text.length > 2) {
        categSelect.value = "Misc";
        categSelect.style.borderColor = "#cbd5e1"; // Normal border for fallback
    }
});

// --- 6. Helpers & UI ---
function updateSummaryCards(data) {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let total = 0, todayTotal = 0, monthTotal = 0;

    data.forEach(item => {
        const amt = parseFloat(item.amount) || 0;
        total += amt;
        const itemDate = new Date(item.date);
        if (item.date === todayStr) todayTotal += amt;
        if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) {
            monthTotal += amt;
        }
    });

    const format = (num) => `₹${num.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('total-expenses').innerText = format(total);
    document.getElementById('transaction-count').innerText = `${data.length} items`;
    document.getElementById('monthly-expenses').innerText = format(monthTotal);
    document.getElementById('daily-expenses').innerText = format(todayTotal);
    document.getElementById('avg-expense').innerText = format(data.length ? total / data.length : 0);
}

function initDateValidation() {
    const dateInput = document.getElementById('date');
    if (!dateInput) return;
    const todayStr = new Date().toLocaleDateString('en-CA');
    dateInput.setAttribute('max', todayStr);
    if (!dateInput.value) dateInput.value = todayStr;
}

function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<span>✅</span> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleBtn.innerText = isPassword ? '🙈' : '👁️';
});

// Dark Mode
// Dark Mode Toggle inside script.js
if (darkToggle) {
    darkToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        darkToggle.innerText = isDark ? '☀️' : '🌙';
        
        // Save choice to localStorage so other pages can see it
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}