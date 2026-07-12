class AdminDashboard {
    constructor() {
        this.API_BASE = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.currentPage = 'dashboard';
        
        console.log('🔧 AdminDashboard Initialized');
        console.log('Token exists:', !!this.token);
        console.log('User role:', this.user.role);
        console.log('User data:', this.user);
        
        // If no token or wrong role, redirect immediately
        if (!this.token) {
            console.error('❌ No token found');
            window.location.href = '/';
            return;
        }
        
        if (this.user.role !== 'admin') {
            console.error('❌ User is not admin. Role:', this.user.role);
            window.location.href = '/';
            return;
        }
        
        console.log('✅ Authentication passed');
        this.init();
    }

    async init() {
        try {
            // Set user info first
            this.setUserInfo();
            
            // Load dashboard content immediately
            await this.loadDashboardContent();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadDashboardStats();
            
            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Init error:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    setUserInfo() {
        try {
            const name = this.user.firstName + ' ' + this.user.lastName;
            const initials = (this.user.firstName?.[0] || 'A') + (this.user.lastName?.[0] || '');
            
            // Update all user info elements
            const elements = {
                'userName': name,
                'userEmail': this.user.email,
                'userInitials': initials,
                'navUserName': name,
                'navInitials': initials,
                'navUserRole': 'Administrator'
            };
            
            Object.keys(elements).forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = elements[id];
            });
            
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
        
        // Create coach form
        const coachForm = document.getElementById('createCoachForm');
        if (coachForm) {
            coachForm.addEventListener('submit', (e) => this.handleCoachSubmit(e));
        }

        // Add hidden ID field to coach form if it doesn't exist
        if (coachForm && !document.getElementById('coachId')) {
            const hiddenId = document.createElement('input');
            hiddenId.type = 'hidden';
            hiddenId.id = 'coachId';
            hiddenId.name = 'coachId';
            coachForm.appendChild(hiddenId);
        }

        // Reset coach form when modal is closed or opened for new coach
        const coachModal = document.getElementById('createCoachModal');
        if (coachModal) {
            coachModal.addEventListener('hidden.bs.modal', () => this.resetCoachForm());
            
            // Handle "Add Coach" buttons to reset form
            document.querySelectorAll('[data-bs-target="#createCoachModal"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (!this.isEditing) this.resetCoachForm();
                });
            });
        }
        
        // Create category form
        const categoryForm = document.getElementById('createCategoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.createCategory(e));
        }
        
        // Notifications
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleNotifications();
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

    async loadDashboardContent() {
        console.log('📊 Loading dashboard content');
        
        const pageContent = document.getElementById('pageContent');
        if (!pageContent) {
            console.error('❌ pageContent element not found');
            return;
        }
        
        // Hide loading spinner
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        
        // Set basic dashboard HTML
        pageContent.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Dashboard Overview</h3>
                    <p class="text-muted">Welcome back, ${this.user.firstName}!</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createCoachModal">
                        <i class="bi bi-plus-circle me-2"></i>Add Coach
                    </button>
                </div>
            </div>
            
            <!-- Stats Cards -->
            <div class="row mb-4 stagger-in">
                <div class="col-md-3 mb-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Total Coaches</h6>
                                <h3 class="mb-0" id="totalCoaches">0</h3>
                            </div>
                            <div class="stat-icon bg-primary bg-opacity-10 text-primary">
                                <i class="bi bi-person-badge"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Total Students</h6>
                                <h3 class="mb-0" id="totalStudents">0</h3>
                            </div>
                            <div class="stat-icon bg-success bg-opacity-10 text-success">
                                <i class="bi bi-people"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Pending Approvals</h6>
                                <h3 class="mb-0" id="pendingStudents">0</h3>
                            </div>
                            <div class="stat-icon bg-warning bg-opacity-10 text-warning">
                                <i class="bi bi-clock"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Total Sessions</h6>
                                <h3 class="mb-0" id="totalSessions">0</h3>
                            </div>
                            <div class="stat-icon bg-info bg-opacity-10 text-info">
                                <i class="bi bi-calendar-check"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Recent Activity -->
            <div class="row">
                <div class="col-12">
                    <div class="stat-card">
                        <h5 class="mb-3">Recent Activity</h5>
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Action</th>
                                        <th>User</th>
                                        <th>Timestamp</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="recentActivity">
                                    <tr>
                                        <td colspan="4" class="text-center">
                                            <div class="spinner-border spinner-border-sm" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                            Loading activities...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="stat-card">
                        <h5 class="mb-3">Quick Actions</h5>
                        <div class="row">
                            <div class="col-md-3 mb-3">
                                <button class="btn btn-outline-primary w-100 py-3" onclick="adminDashboard.loadPage('coaches')">
                                    <i class="bi bi-person-badge fs-4 mb-2"></i><br>
                                    Manage Coaches
                                </button>
                            </div>
                            <div class="col-md-3 mb-3">
                                <button class="btn btn-outline-success w-100 py-3" onclick="adminDashboard.loadPage('students')">
                                    <i class="bi bi-people fs-4 mb-2"></i><br>
                                    Manage Students
                                </button>
                            </div>
                            <div class="col-md-3 mb-3">
                                <button class="btn btn-outline-warning w-100 py-3" onclick="adminDashboard.loadPage('audit')">
                                    <i class="bi bi-shield-check fs-4 mb-2"></i><br>
                                    Audit Logs
                                </button>
                            </div>
                            <div class="col-md-3 mb-3">
                                <button class="btn btn-outline-info w-100 py-3" data-bs-toggle="modal" data-bs-target="#createCategoryModal">
                                    <i class="bi bi-tags fs-4 mb-2"></i><br>
                                    Add Category
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('✅ Dashboard content loaded');
    }

    async loadDashboardStats() {
        console.log('📈 Loading dashboard stats...');
        
        try {
            const response = await fetch(`${this.API_BASE}/admin/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 Stats response:', data);
            
            if (data.success) {
                const stats = data.data.totals;
                
                // Update stats
                this.updateElementText('totalCoaches', stats.totalCoaches);
                this.updateElementText('totalStudents', stats.totalStudents);
                this.updateElementText('pendingStudents', stats.pendingStudents);
                this.updateElementText('totalSessions', stats.totalSessions);
                
                // Update pending count badge
                this.updateElementText('pendingCount', stats.pendingStudents);
                
                // Update recent activity
                this.updateRecentActivity(data.data.recentLogs || []);
                
                console.log('✅ Stats loaded successfully');
            } else {
                console.error('❌ API returned error:', data.error);
                this.showError(data.error || 'Failed to load stats');
            }
        } catch (error) {
            console.error('❌ Error loading stats:', error);
            this.showError('Failed to load statistics: ' + error.message);
        }
    }

    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    updateRecentActivity(logs) {
        const tbody = document.getElementById('recentActivity');
        if (!tbody) return;
        
        if (!logs.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        No recent activity
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        logs.forEach(log => {
            const timestamp = new Date(log.timestamp).toLocaleString();
            html += `
                <tr>
                    <td>
                        <span class="badge bg-light text-dark">${log.action}</span>
                    </td>
                    <td>
                        <small>${log.userEmail || 'System'}</small>
                    </td>
                    <td>
                        <small>${timestamp}</small>
                    </td>
                    <td>
                        <span class="badge ${log.status === 'success' ? 'bg-success' : 'bg-danger'}">
                            ${log.status}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    async loadPage(page) {
        console.log('📄 Loading page:', page);
        
        this.currentPage = page;
        const pageContent = document.getElementById('pageContent');
        
        if (!pageContent) {
            console.error('❌ pageContent element not found');
            return;
        }
        
        // Show loading
        pageContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading ${page} page...</p>
            </div>
        `;
        
        try {
            switch(page) {
                case 'dashboard':
                    await this.loadDashboardContent();
                    await this.loadDashboardStats();
                    break;
                    
                case 'coaches':
                    pageContent.innerHTML = this.getCoachesPage();
                    await this.loadCoaches();
                    break;
                    
                case 'students':
                    pageContent.innerHTML = this.getStudentsPage();
                    await this.loadStudents();
                    break;
                    
                case 'audit':
                    pageContent.innerHTML = this.getAuditPage();
                    await this.loadAuditLogs();
                    break;
                    
                default:
                    await this.loadDashboardContent();
                    await this.loadDashboardStats();
            }
        } catch (error) {
            console.error('❌ Error loading page:', error);
            pageContent.innerHTML = `
                <div class="alert alert-danger">
                    Error loading page: ${error.message}
                </div>
            `;
        }
    }

    getCoachesPage() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Coaches Management</h3>
                    <p class="text-muted">Manage all coach accounts</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createCoachModal">
                        <i class="bi bi-plus-circle me-2"></i>Add New Coach
                    </button>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Specialization</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="coachesList">
                        <tr>
                            <td colspan="5" class="text-center">
                                <div class="spinner-border spinner-border-sm" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                Loading coaches...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    async loadCoaches() {
        try {
            const response = await fetch(`${this.API_BASE}/admin/coaches`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderCoaches(data.data);
            }
        } catch (error) {
            console.error('❌ Error loading coaches:', error);
            this.showError('Failed to load coaches: ' + error.message);
        }
    }

    renderCoaches(coaches) {
        const tbody = document.getElementById('coachesList');
        if (!tbody) return;
        
        if (!coaches.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        No coaches found
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        coaches.forEach(coach => {
            const statusClass = coach.status === 'active' ? 'success' : 'secondary';
            const statusText = coach.status === 'active' ? 'Active' : 'Inactive';
            
            html += `
                <tr>
                    <td>
                        <strong>${coach.firstName} ${coach.lastName}</strong>
                    </td>
                    <td>${coach.email}</td>
                    <td>${coach.specialization || '-'}</td>
                    <td>
                        <span class="badge bg-${statusClass}">${statusText}</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.editCoach('${coach._id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-${coach.status === 'active' ? 'danger' : 'success'}" 
                                onclick="adminDashboard.toggleCoachStatus('${coach._id}', '${coach.status}')">
                            <i class="bi bi-${coach.status === 'active' ? 'person-x' : 'person-check'}"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    async handleCoachSubmit(e) {
        e.preventDefault();
        const coachId = document.getElementById('coachId').value;
        const isEditing = !!coachId;
        
        console.log(`${isEditing ? '📝 Updating' : '👨‍🏫 Creating'} coach...`);
        
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Remove password from update if it's empty
        if (isEditing && !data.password) {
            delete data.password;
        }
        
        try {
            const url = isEditing ? `${this.API_BASE}/admin/coaches/${coachId}` : `${this.API_BASE}/admin/coaches`;
            const method = isEditing ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Coach ${isEditing ? 'updated' : 'created'} successfully!`);
                this.resetCoachForm();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createCoachModal'));
                if (modal) modal.hide();
                
                // Reload coaches if on coaches page
                if (this.currentPage === 'coaches') {
                    await this.loadCoaches();
                }
                
                // Reload stats
                await this.loadDashboardStats();
            } else {
                alert('❌ Error: ' + result.error);
            }
        } catch (error) {
            console.error(`❌ Error ${isEditing ? 'updating' : 'creating'} coach:`, error);
            alert(`Failed to ${isEditing ? 'update' : 'create'} coach: ` + error.message);
        }
    }

    async editCoach(coachId) {
        console.log('📝 Editing coach:', coachId);
        this.isEditing = true;
        
        try {
            const response = await fetch(`${this.API_BASE}/admin/coaches/${coachId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                const coach = result.data;
                const form = document.getElementById('createCoachForm');
                
                // Fill form fields
                document.getElementById('coachId').value = coach._id;
                form.querySelector('[name="firstName"]').value = coach.firstName;
                form.querySelector('[name="lastName"]').value = coach.lastName;
                form.querySelector('[name="email"]').value = coach.email;
                form.querySelector('[name="phone"]').value = coach.phone || '';
                form.querySelector('[name="specialization"]').value = coach.specialization || '';
                form.querySelector('[name="experience"]').value = coach.experience || 0;
                form.querySelector('[name="hourlyRate"]').value = coach.hourlyRate || 0;
                form.querySelector('[name="bio"]').value = coach.bio || '';
                
                // Password is not required when editing
                form.querySelector('[name="password"]').required = false;
                form.querySelector('[name="password"]').placeholder = '(Leave blank to keep current)';
                
                // Update modal title and button
                const modalTitle = document.querySelector('#createCoachModal .modal-title');
                const submitBtn = document.querySelector('#createCoachForm button[type="submit"]');
                
                if (modalTitle) modalTitle.textContent = 'Edit Coach';
                if (submitBtn) submitBtn.textContent = 'Update Coach';
                
                // Open modal
                const modal = new bootstrap.Modal(document.getElementById('createCoachModal'));
                modal.show();
            } else {
                alert('❌ Error fetching coach: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error fetching coach:', error);
            alert('Failed to fetch coach details: ' + error.message);
        }
    }

    resetCoachForm() {
        this.isEditing = false;
        const form = document.getElementById('createCoachForm');
        if (form) {
            form.reset();
            const coachIdField = document.getElementById('coachId');
            if (coachIdField) coachIdField.value = '';
            
            // Reset password field requirements
            const passwordField = form.querySelector('[name="password"]');
            if (passwordField) {
                passwordField.required = true;
                passwordField.placeholder = '';
            }
            
            // Reset modal title and button
            const modalTitle = document.querySelector('#createCoachModal .modal-title');
            const submitBtn = document.querySelector('#createCoachForm button[type="submit"]');
            
            if (modalTitle) modalTitle.textContent = 'Create New Coach';
            if (submitBtn) submitBtn.textContent = 'Create Coach';
        }
    }

    async toggleCoachStatus(coachId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const confirmMessage = `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this coach?`;
        
        if (!confirm(confirmMessage)) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/admin/coaches/${coachId}/toggle-status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Coach ${newStatus === 'active' ? 'activated' : 'deactivated'}!`);
                
                // Reload coaches
                if (this.currentPage === 'coaches') {
                    await this.loadCoaches();
                }
            } else {
                alert('❌ Error: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error toggling coach status:', error);
            alert('Failed to update coach status: ' + error.message);
        }
    }

    getStudentsPage() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Students Management</h3>
                    <p class="text-muted">Approve and manage student accounts</p>
                </div>
                <div class="col-md-6 text-end">
                    <div class="btn-group">
                        <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-filter me-2"></i>Filter by Status
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="adminDashboard.filterStudents('all')">All Students</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" onclick="adminDashboard.filterStudents('pending')">
                                <span class="badge bg-warning me-2">●</span>Pending
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="adminDashboard.filterStudents('active')">
                                <span class="badge bg-success me-2">●</span>Active
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="adminDashboard.filterStudents('suspended')">
                                <span class="badge bg-danger me-2">●</span>Suspended
                            </a></li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Pending Approvals -->
            <div class="card mb-4">
                <div class="card-header bg-warning text-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                        <i class="bi bi-clock me-2"></i>
                        Pending Approvals
                        <span class="badge bg-light text-dark ms-2" id="pendingCountBadge">0</span>
                    </h5>
                </div>
                <div class="card-body">
                    <div id="pendingStudentsList">
                        <div class="text-center py-3">
                            <div class="spinner-border spinner-border-sm text-warning" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            Loading pending students...
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- All Students Table -->
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">All Students</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th>Registered</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="allStudentsList">
                                <tr>
                                    <td colspan="6" class="text-center">
                                        <div class="spinner-border spinner-border-sm" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        Loading students...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async loadStudents() {
        try {
            console.log('📋 Loading students...');
            
            // Load pending students
            const pendingResponse = await fetch(`${this.API_BASE}/admin/students/pending`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const pendingData = await pendingResponse.json();
            console.log('⏳ Pending students:', pendingData);
            
            if (pendingData.success) {
                this.renderPendingStudents(pendingData.data);
            }
            
            // Load all students
            const allResponse = await fetch(`${this.API_BASE}/admin/students`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const allData = await allResponse.json();
            console.log('👥 All students:', allData);
            
            if (allData.success) {
                this.renderAllStudents(allData.data);
            }
        } catch (error) {
            console.error('❌ Error loading students:', error);
            this.showError('Failed to load students: ' + error.message);
        }
    }

    renderPendingStudents(students) {
        const container = document.getElementById('pendingStudentsList');
        const badge = document.getElementById('pendingCountBadge');
        
        if (!container) {
            console.error('❌ pendingStudentsList container not found');
            return;
        }
        
        if (badge) badge.textContent = students.length;
        
        if (!students || students.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3 text-muted">
                    <i class="bi bi-check-circle fs-4"></i>
                    <p class="mt-2">No pending approvals</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="row">';
        students.forEach(student => {
            html += `
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6>${student.firstName} ${student.lastName}</h6>
                            <p class="text-muted mb-1">${student.email}</p>
                            <p class="text-muted mb-2">
                                <small>Registered: ${new Date(student.createdAt).toLocaleDateString()}</small>
                            </p>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-success" onclick="adminDashboard.approveStudent('${student._id}')">
                                    <i class="bi bi-check me-1"></i>Approve
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="adminDashboard.rejectStudent('${student._id}')">
                                    <i class="bi bi-x me-1"></i>Reject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        console.log('✅ Pending students rendered:', students.length);
    }

    renderAllStudents(students) {
        const tbody = document.getElementById('allStudentsList');
        if (!tbody) {
            console.error('❌ allStudentsList container not found');
            return;
        }
        
        if (!students || students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        No students found
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        students.forEach(student => {
            // Determine status badge color and text
            let statusClass, statusText;
            switch(student.status) {
                case 'active':
                    statusClass = 'success';
                    statusText = 'Active';
                    break;
                case 'pending':
                    statusClass = 'warning';
                    statusText = 'Pending';
                    break;
                case 'suspended':
                    statusClass = 'danger';
                    statusText = 'Suspended';
                    break;
                case 'inactive':
                    statusClass = 'secondary';
                    statusText = 'Inactive';
                    break;
                default:
                    statusClass = 'secondary';
                    statusText = student.status;
            }
            
            // Format registration date
            const regDate = student.createdAt ? 
                new Date(student.createdAt).toLocaleDateString() : 
                'N/A';
            
            // Action buttons based on status
            let actionButtons = '';
            if (student.status === 'pending') {
                actionButtons = `
                    <button class="btn btn-sm btn-success me-1" 
                            onclick="adminDashboard.approveStudent('${student._id}')">
                        <i class="bi bi-check"></i>
                    </button>
                    <button class="btn btn-sm btn-danger me-1" 
                            onclick="adminDashboard.rejectStudent('${student._id}')">
                        <i class="bi bi-x"></i>
                    </button>
                `;
            } else if (student.status === 'active') {
                actionButtons = `
                    <button class="btn btn-sm btn-warning me-1" 
                            onclick="adminDashboard.suspendStudent('${student._id}')">
                        <i class="bi bi-pause"></i>
                    </button>
                `;
            } else if (student.status === 'suspended') {
                actionButtons = `
                    <button class="btn btn-sm btn-success me-1" 
                            onclick="adminDashboard.activateStudent('${student._id}')">
                        <i class="bi bi-play"></i>
                    </button>
                `;
            }
            
            // Add view and delete buttons for all statuses
            actionButtons += `
                <button class="btn btn-sm btn-outline-info me-1" 
                        onclick="adminDashboard.viewStudentDetails('${student._id}')">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" 
                        onclick="adminDashboard.deleteStudent('${student._id}')">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            
            html += `
                <tr>
                    <td>
                        <strong>${student.firstName} ${student.lastName}</strong>
                    </td>
                    <td>${student.email}</td>
                    <td>${student.phone || '-'}</td>
                    <td>
                        <span class="badge bg-${statusClass}">${statusText}</span>
                    </td>
                    <td>${regDate}</td>
                    <td>
                        <div class="d-flex">
                            ${actionButtons}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        console.log('✅ All students rendered:', students.length);
    }

    async approveStudent(studentId) {
        if (!confirm('Approve this student?')) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/admin/students/${studentId}/approve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Student approved successfully!');
                await this.loadStudents();
                await this.loadDashboardStats();
            } else {
                alert('❌ Error: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error approving student:', error);
            alert('Failed to approve student: ' + error.message);
        }
    }

    async rejectStudent(studentId) {
        if (!confirm('Reject this student?')) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/admin/students/${studentId}/reject`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Student rejected successfully!');
                await this.loadStudents();
                await this.loadDashboardStats();
            } else {
                alert('❌ Error: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error rejecting student:', error);
            alert('Failed to reject student: ' + error.message);
        }
    }

    async suspendStudent(studentId) {
        if (!confirm('Suspend this student? They will not be able to login.')) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/admin/students/${studentId}/suspend`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Student suspended successfully!');
                await this.loadStudents();
                await this.loadDashboardStats();
            } else {
                alert('❌ Error: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error suspending student:', error);
            alert('Failed to suspend student: ' + error.message);
        }
    }

    async activateStudent(studentId) {
        if (!confirm('Activate this student?')) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/admin/students/${studentId}/activate`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'active' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Student activated successfully!');
                await this.loadStudents();
                await this.loadDashboardStats();
            } else {
                alert('❌ Error: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error activating student:', error);
            alert('Failed to activate student: ' + error.message);
        }
    }

    async deleteStudent(studentId) {
        if (!confirm('Delete this student permanently? This action cannot be undone.')) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/admin/students/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Student deleted successfully!');
                await this.loadStudents();
                await this.loadDashboardStats();
            } else {
                alert('❌ Error: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error deleting student:', error);
            alert('Failed to delete student: ' + error.message);
        }
    }

    async filterStudents(status) {
        console.log('🔍 Filtering students by:', status);
        
        const tbody = document.getElementById('allStudentsList');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Filtering students...
                </td>
            </tr>
        `;
        
        try {
            const url = status === 'all' 
                ? `${this.API_BASE}/admin/students` 
                : `${this.API_BASE}/admin/students?status=${status}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderAllStudents(data.data);
            }
        } catch (error) {
            console.error('❌ Error filtering students:', error);
            this.showError('Failed to filter students: ' + error.message);
        }
    }

    viewStudentDetails(studentId) {
        // This will open a modal with student details
        alert('Student details feature will be implemented');
        // You can implement a modal to show detailed student information
    }

    getAuditPage() {
        return `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h3 class="mb-0">Audit Logs</h3>
                    <p class="text-muted">Monitor system activity and user actions</p>
                </div>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="auditLogsList">
                                <tr>
                                    <td colspan="5" class="text-center">
                                        <div class="spinner-border spinner-border-sm" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        Loading audit logs...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAuditLogs() {
        try {
            const response = await fetch(`${this.API_BASE}/admin/audit-logs?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderAuditLogs(data.data);
            }
        } catch (error) {
            console.error('❌ Error loading audit logs:', error);
            this.showError('Failed to load audit logs: ' + error.message);
        }
    }

    renderAuditLogs(logs) {
        const tbody = document.getElementById('auditLogsList');
        if (!tbody) return;
        
        if (!logs.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        No audit logs found
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        logs.forEach(log => {
            const timestamp = new Date(log.timestamp).toLocaleString();
            const statusClass = log.status === 'success' ? 'success' : 'danger';
            
            html += `
                <tr>
                    <td>
                        <small>${timestamp}</small>
                    </td>
                    <td>
                        <small>${log.userEmail || 'System'}</small>
                    </td>
                    <td>
                        <span class="badge bg-light text-dark">${log.action}</span>
                    </td>
                    <td>${log.entity || '-'}</td>
                    <td>
                        <span class="badge bg-${statusClass}">${log.status}</span>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    async createCategory(e) {
        e.preventDefault();
        console.log('🏷️ Creating category...');
        
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch(`${this.API_BASE}/admin/categories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Category created successfully!');
                form.reset();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createCategoryModal'));
                if (modal) modal.hide();
            } else {
                alert('❌ Error: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error creating category:', error);
            alert('Failed to create category: ' + error.message);
        }
    }

    toggleNotifications() {
        console.log('🔔 Toggling notifications');
        // Implement notification dropdown
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
let adminDashboard;

document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM loaded, initializing dashboard...');
    adminDashboard = new AdminDashboard();
    window.adminDashboard = adminDashboard;
    console.log('✅ Dashboard object created:', !!adminDashboard);
});