class CoachDashboard {
    constructor() {
        this.API_BASE = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.currentPage = 'dashboard';
        this.calendar = null;
        
        console.log('🔧 CoachDashboard Initialized');
        console.log('Token exists:', !!this.token);
        console.log('User role:', this.user.role);
        console.log('User data:', this.user);
        
        // If no token or wrong role, redirect immediately
        if (!this.token) {
            console.error('❌ No token found');
            window.location.href = '/';
            return;
        }
        
        if (this.user.role !== 'coach') {
            console.error('❌ User is not coach. Role:', this.user.role);
            window.location.href = '/';
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
            console.log('🚀 Initializing coach dashboard...');
            
            // Set user info first
            this.setUserInfo();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load dashboard content
            this.loadPage('dashboard');
            
            console.log('✅ Coach dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Init error:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    setUserInfo() {
        try {
            const name = this.user.firstName + ' ' + this.user.lastName;
            const initials = (this.user.firstName?.[0] || 'C') + (this.user.lastName?.[0] || '');
            
            // Update all user info elements
            const elements = {
                'coachName': name,
                'coachEmail': this.user.email,
                'coachInitials': initials,
                'coachAvatar': initials,
                'navCoachName': name,
                'navInitials': initials,
                'navAvatar': initials
            };
            
            Object.keys(elements).forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = elements[id];
            });
            
            // Update specialization if exists
            if (this.user.specialization) {
                const specElement = document.getElementById('coachSpecialization');
                if (specElement) specElement.textContent = this.user.specialization;
            }
            
            console.log('✅ User info set:', name);
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
        
        // Navigation
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('.nav-link').getAttribute('data-page');
                console.log('📱 Navigation to:', page);
                this.loadPage(page);
                
                // Update active state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.target.closest('.nav-link').classList.add('active');
            });
        });
        
        // Logout
        const logoutBtns = ['logoutBtn', 'navLogout'];
        logoutBtns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
        
        // Create session form
        const sessionForm = document.getElementById('createSessionForm');
        if (sessionForm) {
            sessionForm.addEventListener('submit', (e) => this.createSession(e));
        }
        
        // Load students when session modal opens
        const sessionModal = document.getElementById('createSessionModal');
        if (sessionModal) {
            sessionModal.addEventListener('show.bs.modal', () => {
                this.loadStudentsForSessionModal();
            });
        }
        
        // Notification button
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => this.toggleNotifications());
        }
        
        // Global click handler for action buttons
        document.addEventListener('click', (e) => {
            // Handle session actions
            if (e.target.closest('.session-action')) {
                const actionBtn = e.target.closest('.session-action');
                const action = actionBtn.getAttribute('data-action');
                const sessionId = actionBtn.getAttribute('data-id');
                if (action && sessionId) {
                    this.handleSessionAction(action, sessionId);
                }
            }
            
            // Handle quick actions
            if (e.target.closest('.quick-action')) {
                const action = e.target.closest('.quick-action').getAttribute('data-action');
                if (action) this.handleQuickAction(action);
            }
        });
        
        console.log('✅ Event listeners set up');
    }

    async loadStudentsForSessionModal() {
        try {
            console.log('👥 Loading students for session modal...');
            
            const response = await fetch(`${this.API_BASE}/coach/students`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            console.log('📋 Students data:', data);
            
            if (data.success) {
                this.populateStudentDropdown(data.data);
            } else {
                console.error('❌ Failed to load students:', data.error);
            }
        } catch (error) {
            console.error('❌ Error loading students:', error);
        }
    }

    populateStudentDropdown(students) {
        const studentSelect = document.getElementById('studentSelect');
        if (!studentSelect) {
            console.error('❌ studentSelect element not found');
            return;
        }
        
        // Clear existing options (keep the first "Select Student" option)
        while (studentSelect.options.length > 1) {
            studentSelect.remove(1);
        }
        
        if (!students || students.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No students available';
            option.disabled = true;
            studentSelect.appendChild(option);
            console.log('ℹ️ No students found for this coach');
            return;
        }
        
        // Add student options
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student._id;
            option.textContent = `${student.firstName} ${student.lastName} (${student.email})`;
            studentSelect.appendChild(option);
        });
        
        console.log(`✅ Loaded ${students.length} students into dropdown`);
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
                <div class="spinner-border text-success" role="status">
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
                case 'calendar':
                    html = this.getCalendarContent();
                    break;
                case 'sessions':
                    html = this.getSessionsContent();
                    break;
                case 'students':
                    html = this.getStudentsContent();
                    break;
                case 'messages':
                    html = this.getMessagesContent();
                    break;
                case 'materials':
                    html = this.getMaterialsContent();
                    break;
                case 'reports':
                    html = this.getReportsContent();
                    break;
                case 'profile':
                    html = this.getProfileContent();
                    break;
                case 'availability':
                    html = this.getAvailabilityContent();
                    break;
                default:
                    html = await this.getDashboardContent();
            }
            
            pageContent.innerHTML = html;
            
            // Load page-specific data
            switch(page) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'calendar':
                    await this.initCalendar();
                    break;
                case 'sessions':
                    await this.loadSessions();
                    break;
                case 'students':
                    await this.loadStudents();
                    break;
                case 'messages':
                    await this.loadMessages();
                    break;
                case 'materials':
                    await this.loadMaterials();
                    break;
                case 'reports':
                    await this.loadReports();
                    break;
                case 'profile':
                    this.setupProfileForm();
                    break;
            }
            
            console.log(`✅ ${page} page loaded successfully`);
        } catch (error) {
            console.error('❌ Error loading page:', error);
            pageContent.innerHTML = `
                <div class="alert alert-danger">
                    <h5>Error loading page</h5>
                    <p>${error.message}</p>
                    <button class="btn btn-sm btn-success" onclick="coachDashboard.loadPage('dashboard')">
                        Go to Dashboard
                    </button>
                </div>
            `;
        }
    }

    // PAGE TEMPLATES
    async getDashboardContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Coach Dashboard</h3>
                    <p class="text-muted">Welcome back, ${this.user.firstName}!</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#createSessionModal">
                        <i class="bi bi-plus-circle me-2"></i>New Session
                    </button>
                    <button class="btn btn-outline-success ms-2" onclick="coachDashboard.loadPage('availability')">
                        <i class="bi bi-clock me-2"></i>Set Availability
                    </button>
                </div>
            </div>
            
            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-md-3 mb-3">
                    <div class="coach-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Today's Sessions</h6>
                                <h3 class="mb-0" id="statsTodaySessions">0</h3>
                                <small class="text-success">Scheduled today</small>
                            </div>
                            <div class="avatar bg-success bg-opacity-10 text-success">
                                <i class="bi bi-calendar-check"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="coach-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Active Students</h6>
                                <h3 class="mb-0" id="statsActiveStudents">0</h3>
                                <small class="text-success">Currently enrolled</small>
                            </div>
                            <div class="avatar bg-primary bg-opacity-10 text-primary">
                                <i class="bi bi-people"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="coach-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Completed Sessions</h6>
                                <h3 class="mb-0" id="statsCompletedSessions">0</h3>
                                <small class="text-success">This month</small>
                            </div>
                            <div class="avatar bg-warning bg-opacity-10 text-warning">
                                <i class="bi bi-check-circle"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="coach-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Upcoming</h6>
                                <h3 class="mb-0" id="statsUpcomingSessions">0</h3>
                                <small class="text-success">Next 7 days</small>
                            </div>
                            <div class="avatar bg-info bg-opacity-10 text-info">
                                <i class="bi bi-clock"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <!-- Upcoming Sessions -->
                <div class="col-md-8">
                    <div class="coach-card">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="mb-0">Upcoming Sessions</h5>
                            <a href="#" onclick="coachDashboard.loadPage('sessions')" class="text-decoration-none">View All</a>
                        </div>
                        <div id="upcomingSessionsList">
                            <div class="text-center py-4">
                                <div class="spinner-border spinner-border-sm text-success" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-2 text-muted">Loading sessions...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Today's Schedule -->
                    <div class="coach-card mt-4">
                        <h5 class="mb-3">Today's Schedule</h5>
                        <div id="todaysSchedule">
                            <div class="text-center py-3">
                                <p class="text-muted">No sessions scheduled for today</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions & Stats -->
                <div class="col-md-4">
                    <div class="coach-card">
                        <h5 class="mb-3">Quick Actions</h5>
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-success text-start" data-bs-toggle="modal" data-bs-target="#createSessionModal">
                                <i class="bi bi-plus-circle me-2"></i> Schedule Session
                            </button>
                            <button class="btn btn-outline-primary text-start" onclick="coachDashboard.loadPage('students')">
                                <i class="bi bi-people me-2"></i> View Students
                            </button>
                            <button class="btn btn-outline-warning text-start" onclick="coachDashboard.loadPage('messages')">
                                <i class="bi bi-chat me-2"></i> Check Messages
                            </button>
                            <button class="btn btn-outline-info text-start" onclick="coachDashboard.loadPage('materials')">
                                <i class="bi bi-folder me-2"></i> Upload Materials
                            </button>
                        </div>
                        
                        <hr class="my-4">
                        
                        <!-- Performance Stats -->
                        <h6 class="mb-3">Performance Overview</h6>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span>Session Completion</span>
                                <span id="completionRate">0%</span>
                            </div>
                            <div class="progress progress-coach">
                                <div class="progress-bar progress-coach-bar" id="completionBar" style="width: 0%"></div>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span>Student Satisfaction</span>
                                <span id="satisfactionRate">0/5</span>
                            </div>
                            <div class="d-flex">
                                <i class="bi bi-star text-warning"></i>
                                <i class="bi bi-star text-warning"></i>
                                <i class="bi bi-star text-warning"></i>
                                <i class="bi bi-star text-warning"></i>
                                <i class="bi bi-star text-warning"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCalendarContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Session Calendar</h3>
                    <p class="text-muted">Manage your schedule and appointments</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#createSessionModal">
                        <i class="bi bi-plus-circle me-2"></i>New Session
                    </button>
                    <div class="btn-group ms-2">
                        <button class="btn btn-outline-secondary" id="prevWeek">
                            <i class="bi bi-chevron-left"></i>
                        </button>
                        <button class="btn btn-outline-secondary" id="todayBtn">Today</button>
                        <button class="btn btn-outline-secondary" id="nextWeek">
                            <i class="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="calendar-container">
                <div id="calendar"></div>
            </div>
        `;
    }

    getSessionsContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Session Management</h3>
                    <p class="text-muted">View and manage all your sessions</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#createSessionModal">
                        <i class="bi bi-plus-circle me-2"></i>New Session
                    </button>
                    <div class="btn-group ms-2">
                        <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-filter me-2"></i>Filter
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="coachDashboard.filterSessions('all')">All Sessions</a></li>
                            <li><a class="dropdown-item" href="#" onclick="coachDashboard.filterSessions('scheduled')">Scheduled</a></li>
                            <li><a class="dropdown-item" href="#" onclick="coachDashboard.filterSessions('ongoing')">Ongoing</a></li>
                            <li><a class="dropdown-item" href="#" onclick="coachDashboard.filterSessions('completed')">Completed</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Student</th>
                            <th>Date & Time</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="sessionsTable">
                        <tr>
                            <td colspan="6" class="text-center">
                                <div class="spinner-border spinner-border-sm text-success" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                Loading sessions...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    getStudentsContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">My Students</h3>
                    <p class="text-muted">Manage your student relationships</p>
                </div>
                <div class="col-md-6 text-end">
                    <div class="input-group" style="width: 300px;">
                        <input type="text" class="form-control" placeholder="Search students..." id="studentSearch">
                        <button class="btn btn-outline-secondary" type="button">
                            <i class="bi bi-search"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="row" id="studentsList">
                <div class="col-12">
                    <div class="coach-card">
                        <div class="text-center py-5">
                            <div class="spinner-border text-success" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-3">Loading students...</p>
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
                    <p class="text-muted">Communicate with your students</p>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-4">
                    <div class="coach-card">
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
                    <div class="coach-card" style="height: 600px;">
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
                                    <button class="btn btn-success" type="button" id="sendMessageBtn" disabled>
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
                    <p class="text-muted">Upload and manage teaching materials</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#uploadMaterialModal">
                        <i class="bi bi-plus-circle me-2"></i>Upload Material
                    </button>
                </div>
            </div>
            
            <div class="row" id="materialsList">
                <div class="col-12">
                    <div class="coach-card">
                        <div class="text-center py-5">
                            <div class="spinner-border text-success" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-3">Loading materials...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getReportsContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Performance Reports</h3>
                    <p class="text-muted">Track your coaching performance</p>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-8">
                    <div class="coach-card">
                        <h5 class="mb-3">Session Statistics</h5>
                        <canvas id="sessionChart" height="300"></canvas>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="coach-card">
                        <h5 class="mb-3">Student Feedback</h5>
                        <div class="text-center py-4">
                            <div class="display-1 text-warning">4.8</div>
                            <div class="mb-3">
                                <i class="bi bi-star-fill text-warning"></i>
                                <i class="bi bi-star-fill text-warning"></i>
                                <i class="bi bi-star-fill text-warning"></i>
                                <i class="bi bi-star-fill text-warning"></i>
                                <i class="bi bi-star-half text-warning"></i>
                            </div>
                            <p class="text-muted">Based on 24 reviews</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getProfileContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">My Profile</h3>
                    <p class="text-muted">Manage your coach profile</p>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-4">
                    <div class="coach-card text-center">
                        <div class="avatar mx-auto mb-3" style="width: 100px; height: 100px; font-size: 36px;">
                            ${this.user.firstName?.[0] || 'C'}${this.user.lastName?.[0] || 'O'}
                        </div>
                        <h4>${this.user.firstName} ${this.user.lastName}</h4>
                        <p class="text-muted">${this.user.specialization || 'Coach'}</p>
                        <div class="d-grid">
                            <button class="btn btn-outline-primary">Change Photo</button>
                        </div>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="coach-card">
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
                                <input type="email" class="form-control" value="${this.user.email}" disabled>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Phone</label>
                                <input type="tel" class="form-control" value="${this.user.phone || ''}" name="phone">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Specialization</label>
                                <input type="text" class="form-control" value="${this.user.specialization || ''}" name="specialization">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Experience (years)</label>
                                <input type="number" class="form-control" value="${this.user.experience || 0}" name="experience">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Bio</label>
                                <textarea class="form-control" name="bio" rows="4">${this.user.bio || ''}</textarea>
                            </div>
                            <button type="submit" class="btn btn-success">Update Profile</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    getAvailabilityContent() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Availability Settings</h3>
                    <p class="text-muted">Set your working hours and availability</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-success" onclick="coachDashboard.saveAvailability()">
                        <i class="bi bi-save me-2"></i>Save Schedule
                    </button>
                </div>
            </div>
            
            <div class="coach-card">
                <h5 class="mb-3">Weekly Schedule</h5>
                <div id="availabilitySchedule">
                    <div class="text-center py-4">
                        <p class="text-muted">Loading availability schedule...</p>
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
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    }

    async loadDashboardData() {
        try {
            console.log('📊 Loading dashboard data...');
            
            const response = await fetch(`${this.API_BASE}/coach/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📈 Dashboard data:', data);
            
            if (data.success) {
                const { coach, upcomingSessions, stats } = data.data;
                
                // Update stats
                this.updateElementText('statsTodaySessions', upcomingSessions.length);
                this.updateElementText('statsActiveStudents', stats.totalStudents);
                this.updateElementText('statsCompletedSessions', stats.completedSessions);
                this.updateElementText('statsUpcomingSessions', stats.upcomingSessions);
                
                // Update top navbar stats
                this.updateElementText('todaySessions', upcomingSessions.length);
                this.updateElementText('totalStudents', stats.totalStudents);
                this.updateElementText('sessionCount', stats.upcomingSessions);
                this.updateElementText('studentCount', stats.totalStudents);
                
                // Render upcoming sessions
                this.renderUpcomingSessions(upcomingSessions);
                
                // Load today's schedule
                await this.loadTodaysSchedule();
                
                // Update performance stats
                this.updatePerformanceStats(stats);
            }
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data: ' + error.message);
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
                    <p class="text-muted mt-2">No upcoming sessions</p>
                    <button class="btn btn-sm btn-success mt-2" data-bs-toggle="modal" data-bs-target="#createSessionModal">
                        Schedule Your First Session
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        sessions.forEach(session => {
            const date = new Date(session.date);
            const time = `${session.startTime} - ${session.endTime}`;
            const statusClass = this.getSessionStatusClass(session.status);
            
            html += `
                <div class="session-card p-3 mb-2 rounded">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${session.title}</h6>
                            <div class="d-flex align-items-center">
                                <div class="avatar me-2" style="width: 30px; height: 30px; font-size: 12px;">
                                    ${session.student?.firstName?.[0] || 'S'}${session.student?.lastName?.[0] || 'T'}
                                </div>
                                <div>
                                    <small class="fw-medium">${session.student?.firstName || 'Student'} ${session.student?.lastName || ''}</small>
                                    <br>
                                    <small class="text-muted">${date.toLocaleDateString()} • ${time}</small>
                                </div>
                            </div>
                        </div>
                        <div>
                            <span class="badge ${statusClass}">${session.status}</span>
                            <button class="btn btn-sm btn-outline-primary ms-2 session-action" 
                                    data-action="start" 
                                    data-id="${session._id}"
                                    ${session.status !== 'scheduled' ? 'disabled' : ''}>
                                Start
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    getSessionStatusClass(status) {
        switch(status) {
            case 'scheduled': return 'bg-success';
            case 'ongoing': return 'bg-primary';
            case 'completed': return 'bg-secondary';
            case 'cancelled': return 'bg-danger';
            default: return 'bg-light text-dark';
        }
    }

    async loadTodaysSchedule() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${this.API_BASE}/coach/sessions?startDate=${today}&endDate=${today}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                const container = document.getElementById('todaysSchedule');
                if (!container) return;
                
                let html = '';
                data.data.forEach(session => {
                    const statusClass = this.getSessionStatusClass(session.status);
                    html += `
                        <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                            <div>
                                <small class="fw-medium">${session.title}</small>
                                <br>
                                <small class="text-muted">${session.startTime} • ${session.student?.firstName || 'Student'}</small>
                            </div>
                            <span class="badge ${statusClass}">
                                ${session.status}
                            </span>
                        </div>
                    `;
                });
                
                container.innerHTML = html;
            }
        } catch (error) {
            console.error('❌ Error loading today\'s schedule:', error);
        }
    }

    updatePerformanceStats(stats) {
        // Calculate completion rate
        const totalSessions = stats.completedSessions + stats.upcomingSessions;
        const completionRate = totalSessions > 0 ? Math.round((stats.completedSessions / totalSessions) * 100) : 0;
        
        this.updateElementText('completionRate', completionRate + '%');
        
        const completionBar = document.getElementById('completionBar');
        if (completionBar) {
            completionBar.style.width = completionRate + '%';
        }
    }

    async initCalendar() {
        try {
            const data = await this.makeRequest('/coach/sessions');
            
            if (data.success && window.FullCalendar) {
                const calendarEl = document.getElementById('calendar');
                if (!calendarEl) return;
                
                // Clear previous calendar
                if (this.calendar) {
                    this.calendar.destroy();
                }
                
                this.calendar = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'timeGridWeek',
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    },
                    events: data.data.map(session => ({
                        id: session._id,
                        title: session.title,
                        start: `${session.date.split('T')[0]}T${session.startTime}`,
                        end: `${session.date.split('T')[0]}T${session.endTime}`,
                        backgroundColor: this.getSessionColor(session.status),
                        borderColor: this.getSessionColor(session.status),
                        extendedProps: {
                            student: session.student,
                            status: session.status
                        }
                    })),
                    eventClick: (info) => {
                        this.showSessionDetails(info.event);
                    }
                });
                
                this.calendar.render();
                
                // Add calendar control listeners
                document.getElementById('prevWeek')?.addEventListener('click', () => this.calendar.prev());
                document.getElementById('nextWeek')?.addEventListener('click', () => this.calendar.next());
                document.getElementById('todayBtn')?.addEventListener('click', () => this.calendar.today());
                
                console.log('✅ Calendar initialized');
            }
        } catch (error) {
            console.error('❌ Error initializing calendar:', error);
            this.showError('Failed to load calendar: ' + error.message);
        }
    }

    getSessionColor(status) {
        switch(status) {
            case 'scheduled': return '#10b981';
            case 'ongoing': return '#3b82f6';
            case 'completed': return '#6b7280';
            case 'cancelled': return '#ef4444';
            default: return '#9ca3af';
        }
    }

    async loadSessions() {
        try {
            const data = await this.makeRequest('/coach/sessions');
            
            if (data.success) {
                this.renderSessionsTable(data.data);
            }
        } catch (error) {
            console.error('❌ Error loading sessions:', error);
            this.showError('Failed to load sessions: ' + error.message);
        }
    }

    renderSessionsTable(sessions) {
        const tbody = document.getElementById('sessionsTable');
        if (!tbody) return;
        
        if (!sessions || sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        No sessions found
                        <br>
                        <button class="btn btn-sm btn-success mt-2" data-bs-toggle="modal" data-bs-target="#createSessionModal">
                            Create Your First Session
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        sessions.forEach(session => {
            const date = new Date(session.date);
            const student = session.student || {};
            const statusClass = this.getSessionStatusClass(session.status);
            const duration = this.calculateDuration(session.startTime, session.endTime);
            
            html += `
                <tr>
                    <td>
                        <div class="fw-medium">${session.title}</div>
                        <small class="text-muted">${session.description || 'No description'}</small>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar me-2">
                                ${student.firstName?.[0] || 'S'}${student.lastName?.[0] || 'T'}
                            </div>
                            <div>
                                <div>${student.firstName || ''} ${student.lastName || ''}</div>
                                <small class="text-muted">${student.email || ''}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div>${date.toLocaleDateString()}</div>
                        <small class="text-muted">${session.startTime} - ${session.endTime}</small>
                    </td>
                    <td>${duration} min</td>
                    <td>
                        <span class="badge ${statusClass}">${session.status}</span>
                    </td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary session-action" 
                                    data-action="view" 
                                    data-id="${session._id}">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success session-action" 
                                    data-action="start" 
                                    data-id="${session._id}"
                                    ${session.status !== 'scheduled' ? 'disabled' : ''}>
                                <i class="bi bi-play"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning session-action" 
                                    data-action="edit" 
                                    data-id="${session._id}">
                                <i class="bi bi-pencil"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    calculateDuration(startTime, endTime) {
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const startTotal = startHour * 60 + startMinute;
        const endTotal = endHour * 60 + endMinute;
        
        return endTotal - startTotal;
    }

    async createSession(e) {
        if (!e) return;
        
        e.preventDefault();
        console.log('📅 Creating session...');
        
        const form = e.target;
        const studentSelect = document.getElementById('studentSelect');
        const studentId = studentSelect ? studentSelect.value : null;
        
        if (!studentId) {
            alert('❌ Please select a student');
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Add student ID
        data.studentId = studentId;
        
        console.log('📋 Session data:', data);
        
        try {
            const response = await fetch(`${this.API_BASE}/coach/sessions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Session created successfully!');
                form.reset();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createSessionModal'));
                if (modal) modal.hide();
                
                // Reload data based on current page
                if (this.currentPage === 'dashboard') {
                    await this.loadDashboardData();
                } else if (this.currentPage === 'sessions') {
                    await this.loadSessions();
                } else if (this.currentPage === 'calendar') {
                    await this.initCalendar();
                }
            } else {
                alert('❌ Error: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error creating session:', error);
            alert('Failed to create session: ' + error.message);
        }
    }

    async handleSessionAction(action, sessionId) {
        switch(action) {
            case 'start':
                await this.startSession(sessionId);
                break;
            case 'view':
                await this.viewSession(sessionId);
                break;
            case 'edit':
                await this.editSession(sessionId);
                break;
        }
    }

    async startSession(sessionId) {
        if (!confirm('Start this session now?')) return;
        
        try {
            const result = await this.makeRequest(`/coach/sessions/${sessionId}/status`, 'PUT', {
                status: 'ongoing'
            });
            
            if (result.success) {
                alert('✅ Session started!');
                
                // Reload data
                if (this.currentPage === 'dashboard') {
                    await this.loadDashboardData();
                } else if (this.currentPage === 'sessions') {
                    await this.loadSessions();
                }
            }
        } catch (error) {
            console.error('❌ Error starting session:', error);
            alert('Failed to start session: ' + error.message);
        }
    }

    async viewSession(sessionId) {
        try {
            const sessions = await this.makeRequest('/coach/sessions');
            const session = sessions.data.find(s => s._id === sessionId);
            
            if (session) {
                const student = session.student || {};
                const date = new Date(session.date);
                
                const modalHtml = `
                    <div class="modal fade" id="sessionDetailModal">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">${session.title}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="mb-3">
                                        <strong>Student:</strong> ${student.firstName} ${student.lastName}
                                    </div>
                                    <div class="mb-3">
                                        <strong>Date:</strong> ${date.toLocaleDateString()}
                                    </div>
                                    <div class="mb-3">
                                        <strong>Time:</strong> ${session.startTime} - ${session.endTime}
                                    </div>
                                    <div class="mb-3">
                                        <strong>Duration:</strong> ${this.calculateDuration(session.startTime, session.endTime)} minutes
                                    </div>
                                    <div class="mb-3">
                                        <strong>Status:</strong> 
                                        <span class="badge ${this.getSessionStatusClass(session.status)}">
                                            ${session.status}
                                        </span>
                                    </div>
                                    ${session.description ? `
                                    <div class="mb-3">
                                        <strong>Description:</strong>
                                        <p>${session.description}</p>
                                    </div>
                                    ` : ''}
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                    ${session.status === 'scheduled' ? `
                                    <button type="button" class="btn btn-success" onclick="coachDashboard.startSession('${session._id}')">
                                        Start Session
                                    </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove existing modal if any
                const existingModal = document.getElementById('sessionDetailModal');
                if (existingModal) existingModal.remove();
                
                // Add new modal to body
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('sessionDetailModal'));
                modal.show();
            }
        } catch (error) {
            console.error('❌ Error viewing session:', error);
            alert('Failed to load session details: ' + error.message);
        }
    }

    showSessionDetails(event) {
        const session = event.extendedProps;
        const student = session.student || {};
        
        const modalHtml = `
            <div class="modal fade" id="calendarSessionModal">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${event.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <strong>Student:</strong> ${student.firstName || ''} ${student.lastName || ''}
                            </div>
                            <div class="mb-3">
                                <strong>Time:</strong> ${event.start.toLocaleString()}
                            </div>
                            <div class="mb-3">
                                <strong>Status:</strong> 
                                <span class="badge ${this.getSessionStatusClass(session.status)}">
                                    ${session.status}
                                </span>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            ${session.status === 'scheduled' ? `
                            <button type="button" class="btn btn-success" onclick="coachDashboard.startSession('${event.id}')">
                                Start Session
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('calendarSessionModal');
        if (existingModal) existingModal.remove();
        
        // Add new modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('calendarSessionModal'));
        modal.show();
    }

    async loadStudents() {
        try {
            const data = await this.makeRequest('/coach/students');
            
            if (data.success) {
                this.renderStudentsList(data.data);
            }
        } catch (error) {
            console.error('❌ Error loading students:', error);
            this.showError('Failed to load students: ' + error.message);
        }
    }

    renderStudentsList(students) {
        const container = document.getElementById('studentsList');
        if (!container) return;
        
        if (!students || students.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="coach-card text-center py-5">
                        <i class="bi bi-people fs-1 text-muted"></i>
                        <h5 class="mt-3">No Students Yet</h5>
                        <p class="text-muted">You don't have any students assigned yet.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        let html = '';
        students.forEach(student => {
            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="coach-card h-100">
                        <div class="d-flex align-items-center mb-3">
                            <div class="avatar me-3">
                                ${student.firstName?.[0] || 'S'}${student.lastName?.[0] || 'T'}
                            </div>
                            <div>
                                <h6 class="mb-0">${student.firstName} ${student.lastName}</h6>
                                <small class="text-muted">${student.email}</small>
                            </div>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted">
                                <i class="bi bi-telephone me-1"></i> ${student.phone || 'No phone'}
                            </small>
                        </div>
                        <div class="d-grid gap-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="coachDashboard.messageStudent('${student._id}')">
                                <i class="bi bi-chat me-1"></i> Message
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="coachDashboard.scheduleWithStudent('${student._id}')">
                                <i class="bi bi-calendar-plus me-1"></i> Schedule Session
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = `<div class="row">${html}</div>`;
    }

    async loadMessages() {
        // This is a placeholder - implement real messaging later
        console.log('💬 Loading messages...');
    }

    async loadMaterials() {
        // This is a placeholder - implement materials management later
        console.log('📚 Loading materials...');
        
        const container = document.getElementById('materialsList');
        if (!container) return;
        
        container.innerHTML = `
            <div class="col-12">
                <div class="coach-card text-center py-5">
                    <i class="bi bi-folder fs-1 text-muted"></i>
                    <h5 class="mt-3">No Materials Yet</h5>
                    <p class="text-muted">Upload your first learning material.</p>
                    <button class="btn btn-success mt-2" data-bs-toggle="modal" data-bs-target="#uploadMaterialModal">
                        <i class="bi bi-upload me-2"></i>Upload Material
                    </button>
                </div>
            </div>
        `;
    }

    async loadReports() {
        // This is a placeholder - implement reports later
        console.log('📊 Loading reports...');
    }

    setupCoachForm() {
    console.log('🔧 Setting up coach form...');
    const profileForm = document.getElementById('profileForm');
    
    if (profileForm) {
        // Populate form with current coach data
        const formData = {
            firstName: this.coach.firstName || '',
            lastName: this.coach.lastName || '',
            email: this.coach.email || '',
            phone: this.coach.phone || '',
            bio: this.coach.bio || '',
            hourlyRate: this.coach.hourlyRate || 50,
            experience: this.coach.experience || '',
            qualifications: this.coach.qualifications || ''
        };

        // Fill form fields
        Object.keys(formData).forEach(field => {
            const element = profileForm.querySelector(`[name="${field}"]`);
            if (element) {
                element.value = formData[field];
            }
        });

        // Handle specializations
        const specializationSelect = profileForm.querySelector('[name="specialization"]');
        if (specializationSelect && this.coach.specialization) {
            const specializations = Array.isArray(this.coach.specialization) 
                ? this.coach.specialization 
                : [this.coach.specialization];
            
            if (specializationSelect.multiple) {
                Array.from(specializationSelect.options).forEach(option => {
                    option.selected = specializations.includes(option.value);
                });
            } else {
                specializationSelect.value = specializations[0] || '';
            }
        }

        // Handle form submission
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateCoachProfile(e);
        });

        console.log('✅ Coach form set up successfully');
    } else {
        console.error('❌ Profile form not found');
    }
}

   async updateCoachProfile(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        
        // Convert FormData to object
        const data = {};
        formData.forEach((value, key) => {
            if (key === 'hourlyRate') {
                data[key] = parseFloat(value);
            } else if (key === 'specialization' && formData.getAll('specialization').length > 1) {
                if (!data[key]) data[key] = [];
                data[key].push(value);
            } else {
                data[key] = value;
            }
        });

        // Handle specializations for single selection
        if (data.specialization && !Array.isArray(data.specialization)) {
            data.specialization = [data.specialization];
        }

        console.log('📤 Updating coach profile with data:', data);

        const response = await fetch(`${this.API_BASE}/coach/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            this.showSuccess('Profile updated successfully!');
            
            // Update local user data
            if (result.data && result.data.coach) {
                this.coach = result.data.coach;
                localStorage.setItem('user', JSON.stringify(this.coach));
                
                // Update UI
                this.setUserInfo();
                
                console.log('✅ Profile updated:', this.coach);
            }
        } else {
            this.showError(result.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        this.showError('Failed to update profile: ' + error.message);
    }
}

    async saveAvailability() {
        try {
            // This would save availability via API
            console.log('Saving availability...');
            alert('Availability saved successfully!');
        } catch (error) {
            console.error('❌ Error saving availability:', error);
            alert('Failed to save availability: ' + error.message);
        }
    }

    handleQuickAction(action) {
        switch(action) {
            case 'schedule':
                document.getElementById('createSessionModal').classList.add('show');
                break;
            case 'students':
                this.loadPage('students');
                break;
            case 'messages':
                this.loadPage('messages');
                break;
            case 'materials':
                this.loadPage('materials');
                break;
        }
    }

    toggleNotifications() {
        console.log('🔔 Toggling notifications');
        // Implement notification dropdown
    }

    messageStudent(studentId) {
        this.loadPage('messages');
        console.log('Messaging student:', studentId);
        // Implement specific student messaging
    }

    scheduleWithStudent(studentId) {
        // Pre-fill student in session creation modal
        const modal = new bootstrap.Modal(document.getElementById('createSessionModal'));
        modal.show();
        
        // This would set the student in the form
        console.log('Scheduling with student:', studentId);
        
        // After modal loads, select this student
        setTimeout(() => {
            const studentSelect = document.getElementById('studentSelect');
            if (studentSelect) {
                studentSelect.value = studentId;
            }
        }, 500);
    }

    filterSessions(status) {
        console.log('Filtering sessions by:', status);
        alert(`Filtering by ${status} - feature to be implemented`);
    }

    showError(message) {
        console.error('❌ Error:', message);
        
        // Create error alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3';
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            <strong>Error!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    logout() {
        console.log('👋 Logging out...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// Initialize dashboard when page loads
let coachDashboard;

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📋 DOM loaded, initializing coach dashboard...');
        coachDashboard = new CoachDashboard();
        window.coachDashboard = coachDashboard;
    });
} else {
    console.log('📋 DOM already loaded, initializing coach dashboard...');
    coachDashboard = new CoachDashboard();
    window.coachDashboard = coachDashboard;
}