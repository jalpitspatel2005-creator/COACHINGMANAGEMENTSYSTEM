class StudentDashboard {
    constructor() {
        this.API_BASE = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.currentPage = 'dashboard';
        this.selectedCoach = null;
        
        console.log('🔧 StudentDashboard Initialized');
        console.log('Token exists:', !!this.token);
        console.log('User role:', this.user.role);
        console.log('User data:', this.user);
        
        // If no token or wrong role, redirect immediately
        if (!this.token) {
            console.error('❌ No token found');
            window.location.href = '/';
            return;
        }
        
        if (this.user.role !== 'student') {
            console.error('❌ User is not student. Role:', this.user.role);
            window.location.href = '/';
            return;
        }
        
        // Check if student is approved
        if (this.user.status !== 'active') {
            this.showPendingApproval();
            return;
        }
        
        console.log('✅ Authentication passed');
        
        // Initialize after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        try {
            console.log('🚀 Initializing student dashboard...');
            
            // First, hide any loading spinner that might be visible
            const loading = document.getElementById('loading');
            if (loading) {
                loading.style.display = 'none';
                console.log('📊 Loading spinner hidden');
            }
            
            // Check if required elements exist
            const pageContent = document.getElementById('pageContent');
            if (!pageContent) {
                console.error('❌ pageContent element not found in DOM');
                throw new Error('Required DOM elements missing');
            }
            
            // Set user info first
            this.setUserInfo();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load dashboard content
            console.log('📋 Loading dashboard page...');
            this.loadPage('dashboard');
            
            console.log('✅ Student dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Init error:', error);
            console.error('❌ Error stack:', error.stack);
            
            // Show error to user
            const pageContent = document.getElementById('pageContent');
            if (pageContent) {
                pageContent.innerHTML = `
                    <div class="alert alert-danger">
                        <h5>Initialization Error</h5>
                        <p>Failed to initialize dashboard: ${error.message}</p>
                        <button class="btn btn-sm btn-primary" onclick="location.reload()">
                            Reload Page
                        </button>
                        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="studentDashboard.logout()">
                            Logout
                        </button>
                    </div>
                `;
            }
            
            // Hide loading spinner
            const loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
        }
    }

    showPendingApproval() {
        const pageContent = document.getElementById('pageContent');
        if (pageContent) {
            pageContent.innerHTML = `
                <div class="container">
                    <div class="row justify-content-center mt-5">
                        <div class="col-md-6">
                            <div class="card text-center">
                                <div class="card-body py-5">
                                    <div class="mb-4">
                                        <i class="bi bi-clock-history display-1 text-warning"></i>
                                    </div>
                                    <h3 class="card-title mb-3">Pending Approval</h3>
                                    <p class="card-text text-muted mb-4">
                                        Your account is pending approval by the administrator.
                                        Please wait while we review your registration.
                                    </p>
                                    <div class="d-flex justify-content-center">
                                        <div class="spinner-border text-warning" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                    <p class="mt-3 small text-muted">
                                        You will receive an email notification once your account is approved.
                                    </p>
                                    <button class="btn btn-outline-secondary mt-3" onclick="studentDashboard.logout()">
                                        <i class="bi bi-box-arrow-left me-2"></i>Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Hide loading spinner
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }

    setUserInfo() {
        try {
            const name = (this.user.firstName || '') + ' ' + (this.user.lastName || '');
            const initials = ((this.user.firstName?.[0] || 'S') + (this.user.lastName?.[0] || 'T')).toUpperCase();
            
            // Update all user info elements
            const elements = {
                'studentName': name.trim() || 'Student',
                'studentEmail': this.user.email || '',
                'studentInitials': initials,
                'studentAvatar': initials,
                'navStudentName': name.trim() || 'Student',
                'navInitials': initials,
                'navAvatar': initials
            };
            
            Object.keys(elements).forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = elements[id];
            });
            
            console.log('✅ User info set:', name.trim() || 'Student');
        } catch (error) {
            console.error('❌ Error setting user info:', error);
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners');
        
        // Sidebar toggle
        const toggleBtn = document.getElementById('toggle-sidebar');
        const mobileToggle = document.getElementById('mobile-toggle');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Navigation - Fix for event delegation
        document.addEventListener('click', (e) => {
            // Handle navigation
            const navLink = e.target.closest('.nav-link[data-page]');
            if (navLink) {
                e.preventDefault();
                const page = navLink.getAttribute('data-page');
                console.log('📱 Navigation to:', page);
                this.loadPage(page);
                
                // Update active state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                navLink.classList.add('active');
            }
            
            // Handle logout
            if (e.target.closest('#logoutBtn') || e.target.closest('#navLogout')) {
                e.preventDefault();
                this.logout();
            }
        });
        
        // Book session form
        const bookSessionForm = document.getElementById('bookSessionForm');
        if (bookSessionForm) {
            bookSessionForm.addEventListener('submit', (e) => this.bookSession(e));
        }
        
        // Load coaches when booking modal opens
        const bookSessionModal = document.getElementById('bookSessionModal');
        if (bookSessionModal) {
            bookSessionModal.addEventListener('show.bs.modal', () => {
                this.loadCoachesForBooking();
            });
        }
        
        console.log('✅ Event listeners set up');
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const toggleBtn = document.getElementById('toggle-sidebar');
        
        if (!sidebar || !mainContent) return;
        
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        
        const isCollapsed = sidebar.classList.contains('collapsed');
        
        // Toggle logo text
        const logoText = document.getElementById('logo-text');
        if (logoText) logoText.style.display = isCollapsed ? 'none' : 'block';
        
        // Toggle nav text
        document.querySelectorAll('.nav-text').forEach(el => {
            el.style.display = isCollapsed ? 'none' : 'inline';
        });
        
        // Update toggle button icon
        if (toggleBtn) {
            toggleBtn.innerHTML = isCollapsed ? 
                '<i class="bi bi-chevron-right"></i>' : 
                '<i class="bi bi-chevron-left"></i>';
        }
    }

    async loadPage(page) {
        console.log('📄 Loading page:', page);
        
        this.currentPage = page;
        const pageContent = document.getElementById('pageContent');
        
        if (!pageContent) {
            console.error('❌ pageContent element not found');
            return;
        }
        
        // Hide loading spinner
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        
        // Show page loading
        pageContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading ${page} page...</p>
            </div>
        `;
        
        try {
            let html = '';
            
            switch(page) {
                case 'dashboard':
                    html = await this.getDashboardContent();
                    break;
                case 'coaches':
                    html = this.getCoachesContent();
                    break;
                case 'sessions':
                    html = this.getSessionsContent();
                    break;
                case 'progress':
                    html = this.getProgressContent();
                    break;
                case 'messages':
                    html = this.getMessagesContent();
                    break;
                case 'materials':
                    html = this.getMaterialsContent();
                    break;
                case 'profile':
                    html = this.getProfileContent();
                    break;
                default:
                    console.warn('⚠️ Unknown page:', page, '- Defaulting to dashboard');
                    html = await this.getDashboardContent();
                    await this.loadDashboardData();
            }
            
            console.log('📝 Page HTML generated, length:', html.length);
            pageContent.innerHTML = html;
            
            // Load page-specific data
            switch(page) {
                case 'dashboard':
                    console.log('📊 Loading dashboard data...');
                    await this.loadDashboardData();
                    break;
                case 'coaches':
                    console.log('👥 Loading coaches...');
                    await this.loadCoaches();
                    break;
                case 'sessions':
                    console.log('📅 Loading student sessions...');
                    await this.loadStudentSessions();
                    break;
                case 'progress':
                    console.log('📈 Loading progress data...');
                    await this.loadProgressData();
                    break;
                case 'messages':
                    console.log('💬 Loading messages...');
                    await this.loadMessages();
                    break;
                case 'materials':
                    console.log('📚 Loading materials...');
                    await this.loadMaterials();
                    break;
                case 'profile':
                    console.log('👤 Setting up profile form...');
                    this.setupProfileForm();
                    break;
            }
            
            console.log(`✅ ${page} page loaded successfully`);
        } catch (error) {
            console.error('❌ Error loading page:', error);
            
            pageContent.innerHTML = `
                <div class="alert alert-danger">
                    <h5>Error loading ${page} page</h5>
                    <p>${error.message}</p>
                    <button class="btn btn-sm btn-primary" onclick="studentDashboard.loadPage('dashboard')">
                        Go to Dashboard
                    </button>
                    <button class="btn btn-sm btn-outline-secondary ms-2" onclick="location.reload()">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }

    // PAGE TEMPLATES
    async getDashboardContent() {
        const userName = this.user.firstName || 'Student';
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Student Dashboard</h3>
                    <p class="text-muted">Welcome back, ${userName}!</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#bookSessionModal">
                        <i class="bi bi-plus-circle me-2"></i>Book New Session
                    </button>
                </div>
            </div>
            
            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-md-3 mb-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Upcoming Sessions</h6>
                                <h3 class="mb-0" id="statsUpcomingSessions">0</h3>
                                <small class="text-success">Scheduled</small>
                            </div>
                            <div class="stat-icon bg-primary bg-opacity-10 text-primary">
                                <i class="bi bi-calendar-check"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Completed Sessions</h6>
                                <h3 class="mb-0" id="statsCompletedSessions">0</h3>
                                <small class="text-success">Total attended</small>
                            </div>
                            <div class="stat-icon bg-success bg-opacity-10 text-success">
                                <i class="bi bi-check-circle"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Available Coaches</h6>
                                <h3 class="mb-0" id="statsAvailableCoaches">0</h3>
                                <small class="text-success">Ready to help</small>
                            </div>
                            <div class="stat-icon bg-warning bg-opacity-10 text-warning">
                                <i class="bi bi-people"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Learning Hours</h6>
                                <h3 class="mb-0" id="statsLearningHours">0</h3>
                                <small class="text-success">This month</small>
                            </div>
                            <div class="stat-icon bg-info bg-opacity-10 text-info">
                                <i class="bi bi-clock"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <!-- Upcoming Sessions -->
                <div class="col-md-8">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="mb-0">Upcoming Sessions</h5>
                            <a href="#" class="text-decoration-none" onclick="event.preventDefault(); studentDashboard.loadPage('sessions')">View All</a>
                        </div>
                        <div id="upcomingSessionsList">
                            <div class="text-center py-4">
                                <div class="spinner-border spinner-border-sm text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-2 text-muted">Loading sessions...</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions & Progress -->
                <div class="col-md-4">
                    <div class="stat-card">
                        <h5 class="mb-3">Quick Actions</h5>
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary text-start" data-bs-toggle="modal" data-bs-target="#bookSessionModal">
                                <i class="bi bi-plus-circle me-2"></i> Book Session
                            </button>
                            <button class="btn btn-outline-success text-start" onclick="studentDashboard.loadPage('coaches')">
                                <i class="bi bi-people me-2"></i> Browse Coaches
                            </button>
                            <button class="btn btn-outline-warning text-start" onclick="studentDashboard.loadPage('messages')">
                                <i class="bi bi-chat me-2"></i> Messages
                            </button>
                            <button class="btn btn-outline-info text-start" onclick="studentDashboard.loadPage('materials')">
                                <i class="bi bi-folder me-2"></i> Learning Materials
                            </button>
                        </div>
                        
                        <hr class="my-4">
                        
                        <!-- Progress Overview -->
                        <h6 class="mb-3">Your Progress</h6>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span>Session Attendance</span>
                                <span id="attendanceRate">0%</span>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-success" id="attendanceBar" style="width: 0%"></div>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span>Goal Completion</span>
                                <span id="goalCompletion">0%</span>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-info" id="goalBar" style="width: 0%"></div>
                            </div>
                        </div>
                        
                        <!-- Today's Sessions -->
                        <h6 class="mb-3 mt-4">Today's Schedule</h6>
                        <div id="todaysSchedule">
                            <div class="text-center py-2">
                                <p class="text-muted small">No sessions today</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCoachesContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Available Coaches</h3>
                    <p class="text-muted">Browse and book sessions with our expert coaches</p>
                </div>
                <div class="col-md-6 text-end">
                    <div class="input-group" style="width: 300px;">
                        <input type="text" class="form-control" placeholder="Search coaches..." id="coachSearch">
                        <button class="btn btn-outline-secondary" type="button">
                            <i class="bi bi-search"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Filter Options -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="stat-card">
                        <div class="row">
                            <div class="col-md-3 mb-2">
                                <select class="form-control form-control-sm" id="specializationFilter">
                                    <option value="">All Specializations</option>
                                    <option value="math">Mathematics</option>
                                    <option value="science">Science</option>
                                    <option value="english">English</option>
                                    <option value="programming">Programming</option>
                                    <option value="business">Business</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-2">
                                <select class="form-control form-control-sm" id="experienceFilter">
                                    <option value="">Any Experience</option>
                                    <option value="1">1+ years</option>
                                    <option value="3">3+ years</option>
                                    <option value="5">5+ years</option>
                                    <option value="10">10+ years</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-2">
                                <select class="form-control form-control-sm" id="ratingFilter">
                                    <option value="">Any Rating</option>
                                    <option value="4">4+ stars</option>
                                    <option value="4.5">4.5+ stars</option>
                                    <option value="5">5 stars</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-2">
                                <button class="btn btn-primary btn-sm w-100" onclick="studentDashboard.applyFilters()">
                                    <i class="bi bi-filter me-1"></i> Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Coaches Grid -->
            <div class="row" id="coachesList">
                <div class="col-12">
                    <div class="stat-card">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-3">Loading coaches...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSessionsContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">My Sessions</h3>
                    <p class="text-muted">View and manage all your booked sessions</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#bookSessionModal">
                        <i class="bi bi-plus-circle me-2"></i>Book New Session
                    </button>
                </div>
            </div>
            
            <!-- Session Tabs -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="stat-card">
                        <ul class="nav nav-tabs" id="sessionTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="upcoming-tab" data-bs-toggle="tab" data-bs-target="#upcoming" type="button">
                                    Upcoming
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="completed-tab" data-bs-toggle="tab" data-bs-target="#completed" type="button">
                                    Completed
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="cancelled-tab" data-bs-toggle="tab" data-bs-target="#cancelled" type="button">
                                    Cancelled
                                </button>
                            </li>
                        </ul>
                        <div class="tab-content p-3">
                            <div class="tab-pane fade show active" id="upcoming" role="tabpanel">
                                <div id="upcomingSessionsTab">
                                    <div class="text-center py-4">
                                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <p class="mt-2 text-muted">Loading upcoming sessions...</p>
                                    </div>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="completed" role="tabpanel">
                                <div id="completedSessionsTab">
                                    <div class="text-center py-4">
                                        <p class="text-muted">No completed sessions yet</p>
                                    </div>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="cancelled" role="tabpanel">
                                <div id="cancelledSessionsTab">
                                    <div class="text-center py-4">
                                        <p class="text-muted">No cancelled sessions</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getProgressContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Progress Tracking</h3>
                    <p class="text-muted">Track your learning journey and achievements</p>
                </div>
            </div>
            
            <div class="row">
                <!-- Progress Overview -->
                <div class="col-md-8">
                    <div class="stat-card">
                        <h5 class="mb-3">Learning Progress</h5>
                        <canvas id="progressChart" height="300"></canvas>
                    </div>
                    
                    <!-- Recent Feedback -->
                    <div class="stat-card mt-4">
                        <h5 class="mb-3">Recent Feedback</h5>
                        <div id="recentFeedback">
                            <div class="text-center py-4">
                                <p class="text-muted">No feedback received yet</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Stats & Achievements -->
                <div class="col-md-4">
                    <div class="stat-card">
                        <h5 class="mb-3">Your Stats</h5>
                        <div class="mb-4">
                            <div class="d-flex justify-content-between mb-2">
                                <span>Total Sessions</span>
                                <span class="fw-bold" id="totalSessionsCount">0</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Total Hours</span>
                                <span class="fw-bold" id="totalHours">0</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Average Rating</span>
                                <span class="fw-bold" id="averageRating">0.0</span>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span>Consistency Score</span>
                                <span class="fw-bold" id="consistencyScore">0%</span>
                            </div>
                        </div>
                        
                        <hr>
                        
                        <!-- Achievements -->
                        <h6 class="mb-3">Achievements</h6>
                        <div id="achievementsList">
                            <div class="text-center py-3">
                                <p class="text-muted small">No achievements yet</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getMessagesContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Messages</h3>
                    <p class="text-muted">Communicate with your coaches</p>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-4">
                    <div class="stat-card">
                        <h5 class="mb-3">Conversations</h5>
                        <div class="list-group list-group-flush" id="conversationList">
                            <div class="text-center py-4 text-muted">
                                <i class="bi bi-chat fs-4"></i>
                                <p class="mt-2">No conversations yet</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="stat-card" style="height: 600px;">
                        <div class="d-flex flex-column h-100">
                            <div class="flex-grow-1 overflow-auto p-3" id="messageContainer">
                                <div class="text-center py-5 text-muted">
                                    <i class="bi bi-chat fs-1"></i>
                                    <p class="mt-2">Select a conversation to start messaging</p>
                                </div>
                            </div>
                            <div class="border-top p-3">
                                <div class="input-group">
                                    <input type="text" class="form-control" placeholder="Type a message..." id="messageInput" disabled>
                                    <button class="btn btn-primary" type="button" id="sendMessageBtn" disabled>
                                        <i class="bi bi-send"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getMaterialsContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Learning Materials</h3>
                    <p class="text-muted">Access materials shared by your coaches</p>
                </div>
                <div class="col-md-6 text-end">
                    <div class="input-group" style="width: 300px;">
                        <input type="text" class="form-control" placeholder="Search materials..." id="materialSearch">
                        <button class="btn btn-outline-secondary" type="button">
                            <i class="bi bi-search"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Materials Filter -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="stat-card">
                        <div class="row">
                            <div class="col-md-3 mb-2">
                                <select class="form-control form-control-sm" id="materialTypeFilter">
                                    <option value="">All Types</option>
                                    <option value="pdf">PDF Documents</option>
                                    <option value="video">Videos</option>
                                    <option value="audio">Audio Files</option>
                                    <option value="link">Links</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-2">
                                <select class="form-control form-control-sm" id="coachFilter">
                                    <option value="">All Coaches</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-2">
                                <select class="form-control form-control-sm" id="dateFilter">
                                    <option value="">Any Date</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="year">This Year</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-2">
                                <button class="btn btn-primary btn-sm w-100" onclick="studentDashboard.filterMaterials()">
                                    <i class="bi bi-filter me-1"></i> Filter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Materials Grid -->
            <div class="row" id="materialsList">
                <div class="col-12">
                    <div class="stat-card">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-3">Loading materials...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getProfileContent() {
        const userName = (this.user.firstName || '') + ' ' + (this.user.lastName || '');
        const initials = ((this.user.firstName?.[0] || 'S') + (this.user.lastName?.[0] || 'T')).toUpperCase();
        
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">My Profile</h3>
                    <p class="text-muted">Manage your student profile</p>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-4">
                    <div class="stat-card text-center">
                        <div class="avatar mx-auto mb-3" style="width: 100px; height: 100px; font-size: 36px;">
                            ${initials}
                        </div>
                        <h4>${userName.trim() || 'Student'}</h4>
                        <p class="text-muted">Student</p>
                        <div class="d-grid">
                            <button class="btn btn-outline-primary">Change Photo</button>
                        </div>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="stat-card">
                        <h5 class="mb-3">Profile Information</h5>
                        <form id="profileForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">First Name</label>
                                    <input type="text" class="form-control" value="${this.user.firstName || ''}" name="firstName">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Last Name</label>
                                    <input type="text" class="form-control" value="${this.user.lastName || ''}" name="lastName">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" value="${this.user.email || ''}" disabled>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Phone</label>
                                <input type="tel" class="form-control" value="${this.user.phone || ''}" name="phone">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Education Level</label>
                                <select class="form-control" name="educationLevel">
                                    <option value="">Select Level</option>
                                    <option value="high_school" ${this.user.educationLevel === 'high_school' ? 'selected' : ''}>High School</option>
                                    <option value="undergraduate" ${this.user.educationLevel === 'undergraduate' ? 'selected' : ''}>Undergraduate</option>
                                    <option value="graduate" ${this.user.educationLevel === 'graduate' ? 'selected' : ''}>Graduate</option>
                                    <option value="professional" ${this.user.educationLevel === 'professional' ? 'selected' : ''}>Professional</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Learning Goals</label>
                                <textarea class="form-control" name="goals" rows="3" placeholder="What do you want to achieve?">${this.user.goals || ''}</textarea>
                                <small class="text-muted">Separate goals with commas</small>
                            </div>
                            <button type="submit" class="btn btn-primary">Update Profile</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    // API METHODS
    async makeRequest(endpoint, method = 'GET', body = null) {
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };

        const options = {
            method,
            headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.API_BASE}${endpoint}`, options);
        
        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        return await response.json();
    }

    async loadDashboardData() {
        try {
            console.log('📊 Loading dashboard data...');
            
            // Show loading state in stats
            this.updateElementText('statsUpcomingSessions', '...');
            this.updateElementText('statsCompletedSessions', '...');
            this.updateElementText('statsAvailableCoaches', '...');
            this.updateElementText('statsLearningHours', '...');
            
            const response = await fetch(`${this.API_BASE}/student/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Dashboard API response status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('🔐 Unauthorized - Token might be invalid');
                    this.showError('Session expired. Please login again.');
                    setTimeout(() => this.logout(), 2000);
                    return;
                }
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📈 Dashboard data received:', data);
            
            if (data.success) {
                const { student, upcomingSessions, stats } = data.data;
                
                // Update stats
                this.updateElementText('statsUpcomingSessions', upcomingSessions?.length || 0);
                this.updateElementText('statsCompletedSessions', stats?.completedSessions || 0);
                this.updateElementText('statsAvailableCoaches', stats?.availableCoaches || 0);
                this.updateElementText('statsLearningHours', stats?.learningHours || 0);
                
                // Update top navbar stats
                this.updateElementText('upcomingCount', upcomingSessions?.length || 0);
                this.updateElementText('completedCount', stats?.completedSessions || 0);
                
                // Render upcoming sessions
                this.renderUpcomingSessions(upcomingSessions || []);
                
                // Load today's schedule
                await this.loadTodaysSchedule();
                
                // Update progress stats
                this.updateProgressStats(stats || {});
                
                console.log('✅ Dashboard data loaded successfully');
            } else {
                console.error('❌ Dashboard API returned success: false', data);
                this.showError(data.message || 'Failed to load dashboard data');
            }
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            
            // Show error but keep page functional
            this.showError('Failed to load dashboard data: ' + error.message);
            
            // Set default values
            this.updateElementText('statsUpcomingSessions', '0');
            this.updateElementText('statsCompletedSessions', '0');
            this.updateElementText('statsAvailableCoaches', '0');
            this.updateElementText('statsLearningHours', '0');
            
            // Show empty state for sessions
            const container = document.getElementById('upcomingSessionsList');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <i class="bi bi-exclamation-triangle text-warning fs-1"></i>
                        <p class="mt-2 text-muted">Unable to load sessions</p>
                        <button class="btn btn-sm btn-outline-primary" onclick="studentDashboard.loadDashboardData()">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    renderUpcomingSessions(sessions) {
        const container = document.getElementById('upcomingSessionsList');
        if (!container) return;

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-calendar-x fs-1 text-muted"></i>
                    <p class="mt-2 text-muted">No upcoming sessions</p>
                    <button class="btn btn-sm btn-primary mt-2" data-bs-toggle="modal" data-bs-target="#bookSessionModal">
                        Book Your First Session
                    </button>
                </div>
            `;
            return;
        }

        let html = '<div class="list-group list-group-flush">';
        
        sessions.forEach(session => {
            const date = new Date(session.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            const formattedTime = session.startTime;

            html += `
                <div class="list-group-item border-0 px-0 py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${session.title || 'General Coaching'}</h6>
                            <div class="d-flex align-items-center text-muted small">
                                <i class="bi bi-clock me-1"></i>
                                <span class="me-3">${formattedDate} • ${formattedTime}</span>
                                <i class="bi bi-person me-1"></i>
                                <span>${session.coach ? `${session.coach.firstName} ${session.coach.lastName}` : 'Coach'}</span>
                            </div>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" 
                                    data-bs-toggle="dropdown" aria-expanded="false">
                                Actions
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <a class="dropdown-item" href="#" onclick="studentDashboard.viewSessionDetails('${session._id}')">
                                        <i class="bi bi-eye me-2"></i>View Details
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item" href="#" onclick="studentDashboard.rescheduleSession('${session._id}')">
                                        <i class="bi bi-calendar-check me-2"></i>Reschedule
                                    </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item text-danger" href="#" 
                                       onclick="studentDashboard.cancelSession('${session._id}')">
                                        <i class="bi bi-x-circle me-2"></i>Cancel Session
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="mt-2">
                        <span class="badge bg-light text-dark">${session.status}</span>
                        ${session.meetingLink ? `
                            <a href="${session.meetingLink}" target="_blank" class="badge bg-primary text-decoration-none ms-2">
                                <i class="bi bi-camera-video me-1"></i>Join Meeting
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    async loadTodaysSchedule() {
        try {
            const response = await fetch(`${this.API_BASE}/student/sessions/today`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.renderTodaysSchedule(data.data.sessions);
                }
            }
        } catch (error) {
            console.error('Error loading today\'s schedule:', error);
        }
    }

    renderTodaysSchedule(sessions) {
        const container = document.getElementById('todaysSchedule');
        if (!container) return;

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-2">
                    <p class="text-muted small mb-1">No sessions scheduled for today</p>
                    <a href="#" class="small" data-bs-toggle="modal" data-bs-target="#bookSessionModal">
                        Book a session
                    </a>
                </div>
            `;
            return;
        }

        let html = '<div class="list-group list-group-flush small">';
        
        sessions.forEach(session => {
            const formattedTime = session.startTime;

            html += `
                <div class="list-group-item border-0 px-0 py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="fw-medium">${session.title || 'Coaching'}</span>
                            <div class="text-muted">
                                <i class="bi bi-clock me-1"></i>
                                ${formattedTime}
                            </div>
                        </div>
                        <div>
                            ${session.meetingLink ? `
                                <a href="${session.meetingLink}" target="_blank" 
                                   class="btn btn-sm btn-outline-primary btn-sm">
                                    <i class="bi bi-camera-video"></i>
                                </a>
                            ` : `
                                <span class="badge bg-light text-dark">${session.status}</span>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    async loadRecommendedCoaches() {
        try {
            const response = await fetch(`${this.API_BASE}/student/recommended-coaches`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.renderRecommendedCoaches(data.data.coaches);
                }
            }
        } catch (error) {
            console.error('Error loading recommended coaches:', error);
        }
    }

    renderRecommendedCoaches(coaches) {
        const container = document.getElementById('recommendedCoaches');
        if (!container) return;

        if (!coaches || coaches.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <p class="text-muted">No coaches available at the moment</p>
                </div>
            `;
            return;
        }

        let html = '<div class="row g-3">';
        
        coaches.slice(0, 3).forEach(coach => {
            const specialization = coach.specialization ? coach.specialization.join(', ') : 'General';
            
            html += `
                <div class="col-md-4">
                    <div class="coach-card p-3 border rounded">
                        <div class="d-flex align-items-center mb-2">
                            <div class="avatar-sm me-2">
                                ${coach.firstName ? coach.firstName[0] : 'C'}${coach.lastName ? coach.lastName[0] : 'C'}
                            </div>
                            <div>
                                <h6 class="mb-0">${coach.firstName} ${coach.lastName}</h6>
                                <small class="text-muted">${specialization}</small>
                            </div>
                        </div>
                        <div class="mb-2">
                            <div class="small text-muted">
                                <i class="bi bi-star-fill text-warning"></i>
                                ${coach.rating || '4.5'} (${coach.totalSessions || 0} sessions)
                            </div>
                        </div>
                        <div class="d-grid">
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="studentDashboard.viewCoachDetails('${coach._id}')">
                                View Profile
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    updateProgressStats(stats) {
        // Update attendance rate
        const attendanceRate = stats.attendanceRate || 0;
        this.updateElementText('attendanceRate', `${attendanceRate}%`);
        const attendanceBar = document.getElementById('attendanceBar');
        if (attendanceBar) {
            attendanceBar.style.width = `${attendanceRate}%`;
        }

        // Update goal completion
        const goalCompletion = stats.goalCompletion || 0;
        this.updateElementText('goalCompletion', `${goalCompletion}%`);
        const goalBar = document.getElementById('goalBar');
        if (goalBar) {
            goalBar.style.width = `${goalCompletion}%`;
        }
    }

    // BOOKING METHODS
    async loadCoachesForBooking() {
        try {
            const coachSelect = document.getElementById('coachSelect');
            if (!coachSelect) return;

            const response = await fetch(`${this.API_BASE}/student/coaches`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                coachSelect.innerHTML = '<option value="">Select a coach...</option>';
                
                if (data.success && data.data.coaches.length > 0) {
                    data.data.coaches.forEach(coach => {
                        const option = document.createElement('option');
                        option.value = coach._id;
                        option.textContent = `${coach.firstName} ${coach.lastName} - ${coach.specialization || 'General Coaching'}`;
                        coachSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading coaches for booking:', error);
        }
    }

    async bookSession(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            if (!data.coachId || !data.subject || !data.date || !data.time || !data.duration) {
                this.showError('Please fill in all required fields');
                return;
            }

            // Calculate end time
            const start = new Date(`${data.date}T${data.time}`);
            const end = new Date(start.getTime() + parseInt(data.duration) * 60000);
            
            const startTimeStr = data.time;
            const endTimeStr = end.toTimeString().substring(0, 5);

            const sessionData = {
                coachId: data.coachId,
                title: data.subject,
                description: data.notes || '',
                date: data.date,
                startTime: startTimeStr,
                endTime: endTimeStr,
                duration: parseInt(data.duration)
            };

            console.log('📅 Sending booking request:', sessionData);

            const response = await fetch(`${this.API_BASE}/student/sessions/book`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showSuccess('Session booked successfully!');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('bookSessionModal'));
                if (modal) modal.hide();
                
                // Reset form
                form.reset();
                
                // Reload dashboard data
                if (this.currentPage === 'dashboard') {
                    await this.loadDashboardData();
                }
                
                // Reload sessions page if active
                if (this.currentPage === 'sessions') {
                    await this.loadStudentSessions();
                }
            } else {
                this.showError(result.error || result.message || 'Failed to book session');
            }
        } catch (error) {
            console.error('Error booking session:', error);
            this.showError('Failed to book session: ' + error.message);
        }
    }

    // SESSION MANAGEMENT
    async loadStudentSessions() {
        try {
            const response = await fetch(`${this.API_BASE}/student/sessions`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.renderSessionsTab(data.data.sessions);
                }
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showError('Failed to load sessions');
        }
    }

    renderSessionsTab(sessions) {
        if (!sessions) return;

        const upcoming = sessions.filter(s => s.status === 'scheduled' || s.status === 'confirmed');
        const completed = sessions.filter(s => s.status === 'completed');
        const cancelled = sessions.filter(s => s.status === 'cancelled');

        // Render upcoming sessions
        this.renderSessionList('upcomingSessionsTab', upcoming, true);
        
        // Render completed sessions
        this.renderSessionList('completedSessionsTab', completed, false);
        
        // Render cancelled sessions
        this.renderSessionList('cancelledSessionsTab', cancelled, false);
    }

    renderSessionList(containerId, sessions, showActions = true) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-calendar-x fs-1 text-muted"></i>
                    <p class="mt-2 text-muted">No sessions found</p>
                </div>
            `;
            return;
        }

        let html = '<div class="list-group list-group-flush">';
        
        sessions.forEach(session => {
            const date = new Date(session.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const formattedTime = session.startTime;

            html += `
                <div class="list-group-item border-0 px-0 py-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1">${session.title || 'General Coaching'}</h6>
                                    <div class="d-flex align-items-center text-muted small mb-2">
                                        <i class="bi bi-person me-1"></i>
                                        <span class="me-3">${session.coach ? `${session.coach.firstName} ${session.coach.lastName}` : 'Coach'}</span>
                                        <i class="bi bi-calendar me-1"></i>
                                        <span>${formattedDate}</span>
                                    </div>
                                    <div class="text-muted small">
                                        <i class="bi bi-clock me-1"></i>
                                        <span>${formattedTime} • ${session.duration || 60} minutes</span>
                                    </div>
                                </div>
                                <div>
                                    <span class="badge bg-${this.getStatusBadgeClass(session.status)}">
                                        ${session.status}
                                    </span>
                                </div>
                            </div>
                            
                            ${session.description ? `
                                <div class="mt-2">
                                    <small class="text-muted">Notes: ${session.description}</small>
                                </div>
                            ` : ''}
                            
                            ${session.meetingLink && session.status === 'confirmed' ? `
                                <div class="mt-2">
                                    <a href="${session.meetingLink}" target="_blank" 
                                       class="btn btn-sm btn-outline-primary">
                                        <i class="bi bi-camera-video me-1"></i>Join Meeting
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${showActions ? `
                            <div class="dropdown ms-3">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" 
                                        data-bs-toggle="dropdown" aria-expanded="false">
                                    Actions
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li>
                                        <a class="dropdown-item" href="#" onclick="studentDashboard.viewSessionDetails('${session._id}')">
                                            <i class="bi bi-eye me-2"></i>View Details
                                        </a>
                                    </li>
                                    <li>
                                        <a class="dropdown-item" href="#" onclick="studentDashboard.rescheduleSession('${session._id}')">
                                            <i class="bi bi-calendar-check me-2"></i>Reschedule
                                        </a>
                                    </li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li>
                                        <a class="dropdown-item text-danger" href="#" 
                                           onclick="studentDashboard.cancelSession('${session._id}')">
                                            <i class="bi bi-x-circle me-2"></i>Cancel Session
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    getStatusBadgeClass(status) {
        const statusClasses = {
            'scheduled': 'info',
            'confirmed': 'success',
            'completed': 'success',
            'cancelled': 'danger',
            'pending': 'warning'
        };
        return statusClasses[status] || 'secondary';
    }

    async cancelSession(sessionId) {
        if (!confirm('Are you sure you want to cancel this session?')) return;

        try {
            const response = await fetch(`${this.API_BASE}/student/sessions/${sessionId}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showSuccess('Session cancelled successfully');
                
                // Reload data
                if (this.currentPage === 'dashboard') {
                    await this.loadDashboardData();
                } else if (this.currentPage === 'sessions') {
                    await this.loadStudentSessions();
                }
            } else {
                this.showError(result.message || 'Failed to cancel session');
            }
        } catch (error) {
            console.error('Error cancelling session:', error);
            this.showError('Failed to cancel session');
        }
    }

    // COACHES PAGE METHODS
    async loadCoaches() {
        try {
            const response = await fetch(`${this.API_BASE}/student/coaches`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.renderCoaches(data.data.coaches);
                }
            }
        } catch (error) {
            console.error('Error loading coaches:', error);
            this.showError('Failed to load coaches');
        }
    }

    renderCoaches(coaches) {
        const container = document.getElementById('coachesList');
        if (!container) return;

        if (!coaches || coaches.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="stat-card">
                        <div class="text-center py-5">
                            <i class="bi bi-people fs-1 text-muted"></i>
                            <p class="mt-3 text-muted">No coaches available at the moment</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        
        coaches.forEach(coach => {
            const specialization = coach.specialization || 'General Coaching';
            const bio = coach.bio ? (coach.bio.length > 120 ? coach.bio.substring(0, 120) + '...' : coach.bio) : 'No bio available';
            
            html += `
                <div class="col-md-4 mb-4">
                    <div class="coach-card stat-card h-100">
                        <div class="d-flex align-items-start mb-3">
                            <div class="avatar-student avatar-lg me-3" style="width: 50px; height: 50px; font-size: 20px;">
                                ${coach.firstName ? coach.firstName[0] : 'C'}${coach.lastName ? coach.lastName[0] : 'C'}
                            </div>
                            <div class="flex-grow-1">
                                <h5 class="mb-1">${coach.firstName} ${coach.lastName}</h5>
                                <p class="text-muted mb-2 small">${specialization}</p>
                                <div class="d-flex align-items-center mb-2">
                                    <div class="text-warning small">
                                        ${this.renderStars(coach.rating || 4.5)}
                                    </div>
                                    <span class="ms-2 small text-muted">(${coach.totalSessions || 0} sessions)</span>
                                </div>
                            </div>
                        </div>
                        
                        <p class="text-muted small mb-3">${bio}</p>
                        
                        <div class="row mb-3">
                            <div class="col-6">
                                <div class="small text-muted">Experience</div>
                                <div class="fw-medium">${coach.experience || 'N/A'} yrs</div>
                            </div>
                            <div class="col-6">
                                <div class="small text-muted">Hourly Rate</div>
                                <div class="fw-medium">$${coach.hourlyRate || 50}/hr</div>
                            </div>
                        </div>
                        
                        <div class="d-grid gap-2">
                            <button class="btn btn-primary" onclick="studentDashboard.bookWithCoach('${coach._id}')">
                                <i class="bi bi-calendar-plus me-1"></i>Book Session
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        let starsHtml = '';
        
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                starsHtml += '<i class="bi bi-star-fill"></i>';
            } else if (i === fullStars + 1 && hasHalfStar) {
                starsHtml += '<i class="bi bi-star-half"></i>';
            } else {
                starsHtml += '<i class="bi bi-star"></i>';
            }
        }
        
        return starsHtml;
    }

    bookWithCoach(coachId) {
        // Store the selected coach
        this.selectedCoach = coachId;
        
        // Open booking modal
        const bookingModal = new bootstrap.Modal(document.getElementById('bookSessionModal'));
        bookingModal.show();
        
        // Pre-select the coach in the dropdown
        const coachSelect = document.getElementById('coachSelect');
        if (coachSelect) {
            coachSelect.value = coachId;
        }
    }

    // UTILITY METHODS
    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert at top of page content
        const pageContent = document.getElementById('pageContent');
        if (pageContent) {
            pageContent.insertBefore(alertDiv, pageContent.firstChild);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.remove(), 300);
            }
        }, 5000);
    }

    showSuccess(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const pageContent = document.getElementById('pageContent');
        if (pageContent) {
            pageContent.insertBefore(alertDiv, pageContent.firstChild);
        }
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.remove(), 300);
            }
        }, 5000);
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }

    // Missing method implementations
    viewCoachDetails(coachId) {
        console.log('View coach details:', coachId);
        // Implement coach details view
    }

    viewSessionDetails(sessionId) {
        console.log('View session details:', sessionId);
        // Implement session details view
    }

    rescheduleSession(sessionId) {
        console.log('Reschedule session:', sessionId);
        // Implement reschedule functionality
    }

    loadProgressData() {
        console.log('Loading progress data...');
        // Implement progress data loading
    }

    loadMessages() {
        console.log('Loading messages...');
        // Implement messages loading
    }

    async loadMaterials() {
        try {
            const response = await fetch(`${this.API_BASE}/student/materials`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.renderMaterials(data.data.materials);
                }
            }
        } catch (error) {
            console.error('Error loading materials:', error);
            this.showError('Failed to load materials');
        }
    }

    renderMaterials(materials) {
        const container = document.getElementById('materialsList');
        if (!container) return;

        if (!materials || materials.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="stat-card">
                        <div class="text-center py-5">
                            <i class="bi bi-folder-x fs-1 text-muted"></i>
                            <p class="mt-3 text-muted">No learning materials available yet</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        
        materials.forEach(material => {
            const icon = material.type === 'pdf' ? 'bi-file-earmark-pdf' : 
                         material.type === 'video' ? 'bi-play-circle' : 'bi-file-earmark';
            const color = material.type === 'pdf' ? 'danger' : 
                          material.type === 'video' ? 'primary' : 'secondary';

            html += `
                <div class="col-md-4 mb-4">
                    <div class="stat-card h-100">
                        <div class="d-flex align-items-center mb-3">
                            <div class="stat-icon bg-${color} bg-opacity-10 text-${color} me-3">
                                <i class="bi ${icon}"></i>
                            </div>
                            <h6 class="mb-0 text-truncate">${material.title}</h6>
                        </div>
                        <p class="text-muted small mb-3">${material.description || 'No description'}</p>
                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <div class="small text-muted">
                                <span>${material.size || material.duration || ''}</span>
                                <span class="mx-1">•</span>
                                <span>${material.coachName}</span>
                            </div>
                            <button class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-download me-1"></i>Access
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    setupProfileForm() {
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Profile form submitted');
                // Implement profile update
            });
        }
    }

    applyFilters() {
        console.log('Applying filters...');
        // Implement filter logic
    }

    filterMaterials() {
        console.log('Filtering materials...');
        // Implement materials filter logic
    }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.studentDashboard = new StudentDashboard();
});