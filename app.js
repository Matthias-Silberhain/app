// Main App
class MatthiasApp {
    constructor() {
        this.currentSection = 'home';
        this.notes = [];
        this.settings = {
            theme: 'light',
            offlineMode: true
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadNotes();
        this.setupEventListeners();
        this.setupServiceWorker();
        this.checkInstallPrompt();
        this.updateStats();
        
        // Show initial section
        const hash = window.location.hash.substring(1) || 'home';
        this.showSection(hash);
    }

    setupEventListeners() {
        // Menu toggle
        document.getElementById('menuBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('active');
        });

        // Theme toggle
        document.getElementById('themeBtn').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.showSection(section);
                document.getElementById('sidebar').classList.remove('active');
            });
        });

        // Close menu when clicking outside on mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const menuBtn = document.getElementById('menuBtn');
            
            if (window.innerWidth < 768 && 
                sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) &&
                e.target !== menuBtn &&
                !menuBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });

        // Hash change
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1) || 'home';
            this.showSection(hash);
        });
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            
            // Update active nav link
            const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            this.currentSection = sectionId;
            window.location.hash = sectionId;

            // Load section data if needed
            this.loadSectionData(sectionId);
        }
    }

    loadSectionData(sectionId) {
        switch(sectionId) {
            case 'projects':
                this.loadProjects();
                break;
            case 'skills':
                this.loadSkills();
                break;
            case 'notes':
                this.renderNotes();
                break;
            case 'cloud':
                this.checkCloudStatus();
                break;
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        this.settings.theme = newTheme;
        this.saveSettings();
        
        // Update button icon
        const themeIcon = document.getElementById('themeBtn').querySelector('i');
        themeIcon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        
        this.showToast(`Theme zu ${newTheme === 'light' ? 'Hell' : 'Dunkel'} geändert`);
    }

    loadSettings() {
        const saved = localStorage.getItem('matthias-app-settings');
        if (saved) {
            this.settings = JSON.parse(saved);
            document.documentElement.setAttribute('data-theme', this.settings.theme);
            
            // Update theme button icon
            const themeIcon = document.getElementById('themeBtn').querySelector('i');
            if (themeIcon) {
                themeIcon.className = this.settings.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            }
        }
    }

    saveSettings() {
        localStorage.setItem('matthias-app-settings', JSON.stringify(this.settings));
    }

    // Notes Functions
    createNote() {
        const title = prompt('Titel der Notiz:');
        if (!title) return;
        
        const content = prompt('Inhalt der Notiz:');
        if (!content) return;
        
        const note = {
            id: Date.now(),
            title: title,
            content: content,
            color: '#4f46e5',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.notes.unshift(note);
        this.saveNotes();
        this.renderNotes();
        this.showToast('Notiz erstellt');
    }

    saveNotes() {
        localStorage.setItem('matthias-app-notes', JSON.stringify(this.notes));
    }

    loadNotes() {
        const saved = localStorage.getItem('matthias-app-notes');
        if (saved) {
            this.notes = JSON.parse(saved);
        }
    }

    renderNotes() {
        const container = document.getElementById('notesContainer');
        if (!container) return;
        
        if (this.notes.length === 0) {
            container.innerHTML = `
                <div class="empty-notes">
                    <i class="fas fa-sticky-note fa-3x"></i>
                    <p>Noch keine Notizen</p>
                    <button class="btn outline" onclick="app.createNote()">
                        Erste Notiz erstellen
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.notes.map(note => `
            <div class="note-card">
                <div class="note-header">
                    <h4>${this.escapeHtml(note.title)}</h4>
                    <button class="btn small outline" onclick="app.deleteNote(${note.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="note-content">
                    <p>${this.escapeHtml(note.content).replace(/\n/g, '<br>')}</p>
                </div>
                <div class="note-footer">
                    <small>${new Date(note.createdAt).toLocaleDateString('de-DE')}</small>
                </div>
            </div>
        `).join('');
    }

    deleteNote(noteId) {
        if (confirm('Notiz wirklich löschen?')) {
            this.notes = this.notes.filter(note => note.id !== noteId);
            this.saveNotes();
            this.renderNotes();
            this.showToast('Notiz gelöscht');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Cloud Functions
    async checkCloudStatus() {
        const statusEl = document.getElementById('cloudStatus');
        if (!statusEl) return;
        
        if (window.supabaseClient && await window.supabaseClient.testConnection()) {
            statusEl.innerHTML = `
                <div class="cloud-status-success">
                    <i class="fas fa-cloud-check"></i>
                    <p>Mit Supabase verbunden</p>
                </div>
            `;
        } else {
            statusEl.innerHTML = `
                <div class="cloud-status-error">
                    <i class="fas fa-cloud-slash"></i>
                    <p>Cloud nicht verfügbar</p>
                </div>
            `;
        }
    }

    async syncToCloud() {
        if (!window.supabaseClient) {
            this.showToast('Cloud nicht verfügbar', 'error');
            return;
        }
        
        try {
            const result = await window.supabaseClient.saveNotes(this.notes);
            if (result.success) {
                this.showToast('Notizen in Cloud gespeichert');
                this.checkCloudStatus();
            } else {
                this.showToast('Fehler beim Speichern', 'error');
            }
        } catch (error) {
            this.showToast('Sync fehlgeschlagen', 'error');
        }
    }

    async restoreFromCloud() {
        if (!window.supabaseClient) {
            this.showToast('Cloud nicht verfügbar', 'error');
            return;
        }
        
        if (!confirm('Notizen aus Cloud laden? Lokale Notizen werden überschrieben.')) {
            return;
        }
        
        try {
            const result = await window.supabaseClient.loadNotes();
            if (result.success && result.notes.length > 0) {
                this.notes = result.notes;
                this.saveNotes();
                this.renderNotes();
                this.showToast(`${result.notes.length} Notizen geladen`);
            } else {
                this.showToast('Keine Cloud-Daten gefunden', 'info');
            }
        } catch (error) {
            this.showToast('Laden fehlgeschlagen', 'error');
        }
    }

    // Projects & Skills
    async loadProjects() {
        // Hier könntest du Projekte von deiner API laden
        const container = document.querySelector('.projects-grid');
        if (!container) return;
        
        container.innerHTML = `
            <div class="project-card">
                <h3>Portfolio Website</h3>
                <p>Meine persönliche Portfolio-Website</p>
            </div>
            <div class="project-card">
                <h3>PWA App</h3>
                <p>Diese installierbare App</p>
            </div>
        `;
    }

    async loadSkills() {
        const container = document.querySelector('.skills-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="skill-card">
                <h4>Frontend</h4>
                <p>HTML, CSS, JavaScript, React</p>
            </div>
            <div class="skill-card">
                <h4>Backend</h4>
                <p>Node.js, Supabase, Firebase</p>
            </div>
            <div class="skill-card">
                <h4>Tools</h4>
                <p>Git, Docker, VS Code</p>
            </div>
        `;
    }

    // Stats
    updateStats() {
        // Simuliere dynamische Stats
        const projects = Math.floor(Math.random() * 5) + 12;
        const commits = Math.floor(Math.random() * 50) + 245;
        
        document.getElementById('projectCount').textContent = projects;
        document.getElementById('commitCount').textContent = commits;
    }

    // Toast
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type] || icons.success}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Auto-remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // PWA Functions
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registriert');
            } catch (error) {
                console.error('Service Worker Fehler:', error);
            }
        }
    }

    checkInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install prompt after 5 seconds
            setTimeout(() => {
                if (deferredPrompt) {
                    document.getElementById('installPrompt').classList.add('active');
                }
            }, 5000);
        });
        
        window.installApp = () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        this.showToast('App wird installiert');
                    }
                    deferredPrompt = null;
                    document.getElementById('installPrompt').classList.remove('active');
                });
            }
        };
        
        window.dismissInstall = () => {
            document.getElementById('installPrompt').classList.remove('active');
        };
    }
}

// Global functions
function downloadCV() {
    window.open('https://matthias-silberhain.github.io/matthias-silberhain/bilder/Lebenslauf.pdf', '_blank');
    app.showToast('Lebenslauf wird geöffnet');
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'Matthias Silberhain App',
            text: 'Schau dir meine App an!',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        app.showToast('Link kopiert');
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MatthiasApp();
    window.app = app;
});
