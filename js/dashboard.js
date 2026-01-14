// Dashboard JavaScript - COMPLETE FIXED VERSION
console.log("📊 Dashboard JS loaded - Vercel Deployment");

// Global variables
let currentUser = null;
let poolsData = [];

// ==================== INITIALIZATION ====================

// Initialize Dashboard with Firebase Auth
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Dashboard initialized for Vercel");
    
    // Check Firebase authentication
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("✅ Firebase user authenticated:", user.email);
                
                // Create/Sync user object
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0] || 'User',
                    hostel: getSavedHostel() || 'Hostel B'
                };
                
                // Save for compatibility
                localStorage.setItem('poolify_user', JSON.stringify(currentUser));
                
                // Initialize UI
                initializeDashboard();
                
            } else {
                console.log("⚠️ No Firebase user, checking localStorage...");
                checkLocalStorageUser();
            }
        });
    } else {
        console.log("⚠️ Firebase auth not available, using localStorage");
        checkLocalStorageUser();
    }
});

function checkLocalStorageUser() {
    const userData = localStorage.getItem('poolify_user');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            console.log("📦 User from localStorage:", currentUser.email);
            initializeDashboard();
        } catch (e) {
            console.error("❌ Error parsing user data:", e);
            redirectToLogin();
        }
    } else {
        console.log("❌ No user found, redirecting to login");
        redirectToLogin();
    }
}

function redirectToLogin() {
    // Don't redirect if on homepage
    if (!window.location.pathname.includes('dashboard')) {
        return;
    }
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1500);
}

function getSavedHostel() {
    return localStorage.getItem('user_hostel') || 
           localStorage.getItem('hostel') || 
           'Hostel B';
}

// ==================== DASHBOARD INITIALIZATION ====================

function initializeDashboard() {
    console.log("🎯 Initializing dashboard for:", currentUser.name);
    
    // Load UI in sequence
    setTimeout(() => {
        loadUserProfile();
        updateStats();
        setupEventListeners();
        checkAndLoadPools();
    }, 300);
}

// ==================== USER PROFILE ====================

function loadUserProfile() {
    console.log("👤 Loading user profile...");
    
    if (!currentUser) {
        console.error("❌ No user data available");
        return;
    }
    
    // Update UI elements with fallbacks
    updateElement('userName', currentUser.name || 'User');
    updateElement('userAvatar', (currentUser.name || 'U').charAt(0).toUpperCase());
    updateElement('userLocation', `🏠 ${currentUser.hostel || 'Hostel B'}`);
    
    // Ensure data persistence
    if (!localStorage.getItem('user_hostel') && currentUser.hostel) {
        localStorage.setItem('user_hostel', currentUser.hostel);
    }
}

function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
        console.log(`✅ ${id}: ${content}`);
    } else {
        console.error(`❌ Element #${id} not found`);
    }
}

// ==================== POOLS MANAGEMENT ====================

function checkAndLoadPools() {
    console.log("🔍 Checking for pools data...");
    
    const poolsContainer = document.getElementById('poolsContainer');
    if (!poolsContainer) {
        console.error("❌ Pools container not found");
        return;
    }
    
    // Try to load existing pools
    let existingPools = [];
    try {
        const stored = localStorage.getItem('poolify_pools');
        if (stored) {
            existingPools = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Error loading pools:", e);
    }
    
    // Filter active pools
    const now = new Date();
    poolsData = existingPools.filter(pool => {
        if (!pool || !pool.expiresAt) return false;
        try {
            return new Date(pool.expiresAt) > now;
        } catch {
            return false;
        }
    });
    
    if (poolsData.length > 0) {
        console.log(`✅ Found ${poolsData.length} active pools`);
        renderPools();
    } else {
        console.log("📭 No active pools found, loading demo data");
        loadDemoPools();
    }
}

function renderPools() {
    const poolsContainer = document.getElementById('poolsContainer');
    const noPoolsMessage = document.getElementById('noPoolsMessage');
    
    if (!poolsContainer) return;
    
    // Clear and show loading
    poolsContainer.innerHTML = '<div class="loading">Loading pools...</div>';
    
    setTimeout(() => {
        poolsContainer.innerHTML = '';
        
        if (poolsData.length === 0) {
            if (noPoolsMessage) noPoolsMessage.style.display = 'block';
            return;
        }
        
        // Create pool cards
        poolsData.forEach((pool, index) => {
            setTimeout(() => {
                createPoolCard(pool);
            }, index * 100);
        });
        
        if (noPoolsMessage) noPoolsMessage.style.display = 'none';
        
        // Start timers
        setTimeout(startPoolTimers, 500);
        
    }, 500);
}

function createPoolCard(pool) {
    const poolsContainer = document.getElementById('poolsContainer');
    if (!poolsContainer || !pool) return;
    
    try {
        const expiresAt = new Date(pool.expiresAt);
        const timeLeft = getTimeLeft(expiresAt);
        
        // Skip expired
        if (timeLeft.total <= 0) return;
        
        const poolCard = document.createElement('div');
        poolCard.className = 'pool-card fade-in';
        poolCard.dataset.poolId = pool.id;
        poolCard.dataset.expiresAt = expiresAt.getTime();
        
        // Card content
        poolCard.innerHTML = `
            <div class="pool-header">
                <div class="pool-platform ${pool.platform}">
                    <i class="${getPlatformIcon(pool.platform)}"></i>
                    <span>${getPlatformName(pool.platform)}</span>
                </div>
                <div class="pool-timer ${timeLeft.minutes < 5 ? 'urgent' : ''}">
                    <i class="fas fa-clock"></i>
                    ${timeLeft.minutes}:${timeLeft.seconds.toString().padStart(2, '0')} min
                </div>
            </div>
            
            <div class="pool-creator">
                <i class="fas fa-user"></i>
                Created by ${pool.creatorName || 'Someone'}
            </div>
            
            <div class="pool-items">
                <strong>Items:</strong>
                <div class="item-tags">
                    ${(pool.items || []).slice(0, 3).map(item => 
                        `<span class="item-tag">${item}</span>`
                    ).join('')}
                    ${(pool.items || []).length > 3 ? 
                        `<span class="item-tag">+${pool.items.length - 3} more</span>` : ''}
                </div>
            </div>
            
            <div class="pool-stats">
                <span><i class="fas fa-users"></i> ${pool.joinedUsers?.length || 1}/${pool.maxUsers || 4}</span>
                <span><i class="fas fa-rupee-sign"></i> Save ₹${pool.estimatedSave || 50}</span>
            </div>
            
            <div class="pool-actions">
                <button onclick="joinPool('${pool.id}')" class="btn-primary btn-sm" 
                        ${isUserJoined(pool) ? 'disabled' : ''}>
                    <i class="fas fa-${isUserJoined(pool) ? 'check' : 'plus'}"></i>
                    ${isUserJoined(pool) ? 'Joined' : 'Join Pool'}
                </button>
                <button onclick="viewPool('${pool.id}')" class="btn-secondary btn-sm">
                    <i class="fas fa-eye"></i> View
                </button>
                <button onclick="openChat('${pool.id}')" class="btn-chat">
                    <i class="fas fa-comment"></i> Chat
                </button>
            </div>
        `;
        
        poolsContainer.appendChild(poolCard);
        
    } catch (error) {
        console.error("Error creating pool card:", error);
    }
}

function isUserJoined(pool) {
    if (!currentUser || !pool.joinedUsers) return false;
    return pool.joinedUsers.some(id => 
        id === currentUser.uid || 
        id === currentUser.email
    );
}

// ==================== DEMO DATA ====================

function loadDemoPools() {
    console.log("🎮 Loading demo pools...");
    
    const demoPools = [
        {
            id: 'demo-' + Date.now(),
            platform: 'instamart',
            creatorName: 'Amit',
            creator: 'amit@example.com',
            items: ['Fruits', 'Juice', 'Snacks', 'Tea', 'Coffee'],
            joinedUsers: ['demo1@example.com'],
            maxUsers: 5,
            estimatedSave: 150,
            expiresAt: new Date(Date.now() + 25 * 60000).toISOString(),
            status: 'active'
        },
        {
            id: 'demo-' + (Date.now() + 1),
            platform: 'blinkit',
            creatorName: 'Rahul',
            creator: 'rahul@example.com',
            items: ['Milk', 'Bread', 'Eggs', 'Chips'],
            joinedUsers: [],
            maxUsers: 4,
            estimatedSave: 120,
            expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
            status: 'active'
        },
        {
            id: 'demo-' + (Date.now() + 2),
            platform: 'zepto',
            creatorName: 'Priya',
            creator: 'priya@example.com',
            items: ['Maggi', 'Cold Drinks', 'Biscuits'],
            joinedUsers: ['demo2@example.com'],
            maxUsers: 3,
            estimatedSave: 90,
            expiresAt: new Date(Date.now() + 8 * 60000).toISOString(),
            status: 'active'
        }
    ];
    
    // Save to localStorage
    localStorage.setItem('poolify_pools', JSON.stringify(demoPools));
    poolsData = demoPools;
    
    // Update stats
    updateStats();
    
    // Render
    renderPools();
}

// ==================== STATISTICS ====================

function updateStats() {
    console.log("📊 Updating dashboard stats...");
    
    // Calculate from poolsData
    const activePools = poolsData.length;
    const totalSaved = poolsData.reduce((sum, pool) => sum + (pool.estimatedSave || 0), 0);
    const totalItems = poolsData.reduce((sum, pool) => sum + ((pool.items || []).length || 0), 0);
    
    // Update UI with animation
    animateCounter('activePoolsCount', activePools || 3);
    animateCounter('moneySaved', totalSaved || 450);
    animateCounter('itemsPooled', totalItems || 28);
    animateCounter('timeSaved', Math.floor((activePools || 3) * 0.5) || 12);
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const current = parseInt(element.textContent) || 0;
    const increment = targetValue > current ? 1 : -1;
    let currentValue = current;
    
    const interval = setInterval(() => {
        currentValue += increment;
        element.textContent = currentValue;
        
        if (currentValue === targetValue) {
            clearInterval(interval);
        }
    }, 50);
}

// ==================== TIMER FUNCTIONS ====================

function startPoolTimers() {
    document.querySelectorAll('.pool-timer').forEach(timer => {
        const expiresAt = parseInt(timer.closest('.pool-card').dataset.expiresAt);
        if (!isNaN(expiresAt)) {
            updateTimer(timer, expiresAt);
            setInterval(() => updateTimer(timer, expiresAt), 1000);
        }
    });
}

function updateTimer(timer, expiresAt) {
    const now = Date.now();
    const remaining = expiresAt - now;
    
    if (remaining <= 0) {
        timer.innerHTML = '<i class="fas fa-clock"></i> Expired';
        timer.classList.add('expired');
        return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    timer.innerHTML = `<i class="fas fa-clock"></i> ${minutes}:${seconds.toString().padStart(2, '0')} min`;
    
    if (minutes < 5) {
        timer.classList.add('urgent');
    }
}

function getTimeLeft(expiresAt) {
    const now = new Date();
    const diff = expiresAt - now;
    
    if (diff <= 0) {
        return { total: 0, minutes: 0, seconds: 0 };
    }
    
    return {
        total: diff,
        minutes: Math.floor(diff / 60000),
        seconds: Math.floor((diff % 60000) / 1000)
    };
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    console.log("🔧 Setting up event listeners...");
    
    // Search
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-bar button');
    
    if (searchInput && searchBtn) {
        searchBtn.onclick = () => searchPools(searchInput.value);
        searchInput.onkeypress = (e) => {
            if (e.key === 'Enter') searchPools(searchInput.value);
        };
    }
    
    // Filters
    document.querySelectorAll('.filter-btn').forEach((btn, index) => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const platform = ['all', 'blinkit', 'zepto', 'instamart'][index];
            filterPools(platform);
        };
    });
    
    // Quick Actions
    document.querySelectorAll('.btn-secondary').forEach(btn => {
        const text = btn.textContent || '';
        if (text.includes('Blinkit')) btn.onclick = () => createQuickPool('blinkit');
        else if (text.includes('Zepto')) btn.onclick = () => createQuickPool('zepto');
        else if (text.includes('Instamart')) btn.onclick = () => createQuickPool('instamart');
        else if (text.includes('Invite')) btn.onclick = inviteFriends;
    });
}

// ==================== SEARCH & FILTER ====================

function searchPools(query) {
    if (!query.trim()) {
        renderPools();
        return;
    }
    
    const cards = document.querySelectorAll('.pool-card');
    let found = false;
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query.toLowerCase()) ? 'block' : 'none';
        if (text.includes(query.toLowerCase())) found = true;
    });
    
    const msg = document.getElementById('noPoolsMessage');
    if (msg) {
        msg.style.display = found ? 'none' : 'block';
        if (!found) {
            msg.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>No results for "${query}"</h3>
                    <button onclick="renderPools()" class="btn-primary">Show All</button>
                </div>
            `;
        }
    }
}

function filterPools(platform) {
    const cards = document.querySelectorAll('.pool-card');
    
    if (platform === 'all') {
        cards.forEach(card => card.style.display = 'block');
        return;
    }
    
    let found = false;
    cards.forEach(card => {
        const cardPlatform = card.querySelector('.pool-platform').classList[1];
        const show = cardPlatform === platform;
        card.style.display = show ? 'block' : 'none';
        if (show) found = true;
    });
    
    const msg = document.getElementById('noPoolsMessage');
    if (msg) {
        msg.style.display = found ? 'none' : 'block';
        if (!found) {
            msg.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <i class="fas fa-filter fa-3x"></i>
                    <h3>No ${getPlatformName(platform)} pools</h3>
                    <button onclick="createQuickPool('${platform}')" class="btn-primary">
                        Create ${getPlatformName(platform)} Pool
                    </button>
                </div>
            `;
        }
    }
}

// ==================== HELPER FUNCTIONS ====================

function getPlatformIcon(platform) {
    const icons = {
        'blinkit': 'fas fa-bolt',
        'zepto': 'fas fa-rocket',
        'instamart': 'fas fa-shopping-cart'
    };
    return icons[platform] || 'fas fa-store';
}

function getPlatformName(platform) {
    const names = {
        'blinkit': 'Blinkit',
        'zepto': 'Zepto',
        'instamart': 'Instamart'
    };
    return names[platform] || platform;
}

// ==================== POOL ACTIONS ====================

function joinPool(poolId) {
    if (!currentUser) {
        alert('Please login first');
        return;
    }
    
    const pool = poolsData.find(p => p.id === poolId);
    if (!pool) {
        alert('Pool not found');
        return;
    }
    
    if (isUserJoined(pool)) {
        alert('Already joined!');
        return;
    }
    
    if (pool.joinedUsers && pool.joinedUsers.length >= (pool.maxUsers || 4)) {
        alert('Pool is full!');
        return;
    }
    
    // Add user
    if (!pool.joinedUsers) pool.joinedUsers = [];
    pool.joinedUsers.push(currentUser.uid || currentUser.email);
    pool.estimatedSave = (pool.estimatedSave || 0) + 30;
    
    // Update localStorage
    const allPools = JSON.parse(localStorage.getItem('poolify_pools') || '[]');
    const index = allPools.findIndex(p => p.id === poolId);
    if (index !== -1) {
        allPools[index] = pool;
        localStorage.setItem('poolify_pools', JSON.stringify(allPools));
    }
    
    // Update UI
    alert(`Joined ${getPlatformName(pool.platform)} pool!`);
    updateStats();
    
    // Update button
    const btn = document.querySelector(`[data-pool-id="${poolId}"] .btn-primary`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-check"></i> Joined';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    }
}

function viewPool(poolId) {
    localStorage.setItem('current_viewing_pool', poolId);
    window.location.href = 'pool-details.html';
}

function openChat(poolId) {
    alert(`Chat for pool ${poolId} - Coming soon!`);
}

// ==================== GLOBAL FUNCTIONS ====================

window.createPool = function() {
    window.location.href = 'create-pool.html';
};

window.createQuickPool = function(platform) {
    window.location.href = `create-pool.html?platform=${platform}`;
};

window.inviteFriends = function() {
    alert('Invite friends feature - Coming soon!');
};

window.logout = function() {
    if (confirm('Logout?')) {
        localStorage.clear();
        if (typeof auth !== 'undefined') {
            auth.signOut();
        }
        window.location.href = 'index.html';
    }
};

// Make functions globally available
window.searchPools = searchPools;
window.filterPools = filterPools;
window.joinPool = joinPool;
window.viewPool = viewPool;