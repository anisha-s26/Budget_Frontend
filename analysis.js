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

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check for logged-in user
    const uid = localStorage.getItem('uid');
    
    // Redirect if session is missing
    if (!uid) {
        window.location.href = "index.html";
        return;
    }

    try {
        // 2. Fetch user-specific data
        const res = await fetch(`${API}/all/${uid}`);
        const data = await res.json();
        
        if (data && data.length > 0) {
            renderAnalysis(data);
        } else {
            document.getElementById('custom-legend').innerHTML = `
                <div class="empty-state">
                    <p>No data found. Add some expenses on the dashboard to see your spending breakdown!</p>
                </div>`;
        }
    } catch (err) {
        console.error("Analysis Fetch Error:", err);
        document.getElementById('custom-legend').innerHTML = "<p style='color:red;'>Unable to connect to server.</p>";
    }
});

function renderAnalysis(expenses) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const legendBox = document.getElementById('custom-legend');
    
    // 3. Group and Sum Totals by Category
    const categoryTotals = {};
    expenses.forEach(exp => {
        const cat = exp.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(exp.amount);
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);
    
    // Modern palette matching your CSS variables
    const colors = [
        '#10b981', // Emerald (Food)
        '#6366f1', // Indigo (Transport)
        '#f97316', // Orange (Bills)
        '#ec4899', // Pink (Shopping)
        '#a78bfa', // Purple (General)
        '#f43f5e'  // Rose (Misc)
    ];

    // 4. Initialize Chart.js Doughnut
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 20,
                borderRadius: 5
            }]
        },
        options: {
            cutout: '75%', // Makes it a thin doughnut ring
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Using our custom HTML legend instead
                tooltip: {
                    callbacks: {
                        label: (context) => ` ₹${context.raw.toLocaleString('en-IN')}`
                    }
                }
            }
        }
    });

    // 5. Generate the Custom Interactive Legend
    legendBox.innerHTML = labels.map((label, index) => {
        const amount = categoryTotals[label];
        const color = colors[index % colors.length];
        
        return `
            <div class="legend-item" style="border-left: 4px solid ${color}">
                <div class="category-info">
                    <div class="legend-color-box" style="background: ${color}"></div>
                    <span style="font-weight: 600;">${label}</span>
                </div>
                <span class="category-amount">₹${amount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}</span>
            </div>
        `;
    }).join('');
}
// Logout Logic for Analysis Page
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear(); // Clears user session (uid, email, etc.)
        window.location.href = "index.html"; // Redirects to login
    });
}