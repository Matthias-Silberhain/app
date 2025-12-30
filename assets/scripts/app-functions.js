// Enhanced App Functions
class AppFunctions {
    constructor() {
        this.init();
    }

    init() {
        this.setupKeyboardShortcuts();
        this.setupGestures();
        this.setupPerformanceMonitoring();
        this.setupAnalytics();
        this.setupBackgroundTasks();
    }

    // Keyboard shortcuts for power users
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + S - Save/Sync
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (window.app) {
                    window.app.syncData();
                }
            }

            // Ctrl/Cmd + N - New Note
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                if (window.app) {
                    window.app.openQuickNoteModal();
                }
            }

            // Ctrl/Cmd + T - Toggle Theme
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                document.getElementById('themeToggle')?.click();
            }

            // Ctrl/Cmd + M - Toggle Menu
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                document.getElementById('menuToggle')?.click();
            }

            // Escape - Close modals/menus
            if (e.key === 'Escape') {
                this.closeAllModals();
            }

            // Number keys 1-7 for navigation
            if (e.key >= '1' && e.key <= '7' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                const sections = ['home', 'about', 'projects', 'skills', 'contact', 'notes', 'settings'];
                const index = parseInt(e.key) - 1;
                if (sections[index] && window.app) {
                    window.app.navigateTo(sections[index]);
                }
            }
        });
    }

    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });

        if (document.getElementById('sidebar')?.classList.contains('active')) {
            document.getElementById('menuToggle')?.click();
        }
    }

    // Advanced gesture controls
    setupGestures() {
        if ('ontouchstart' in window) {
            let lastTap = 0;
            let tapCount = 0;
            let tapTimer;

            // Double tap to go home
            document.addEventListener('touchend', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                
                if (tapLength < 300 && tapLength > 0) {
                    tapCount++;
                    
                    if (tapCount === 2) {
                        // Double tap detected
                        e.preventDefault();
                        if (window.app && window.app.currentSection !== 'home') {
                            window.app.navigateTo('home');
                        }
                        tapCount = 0;
                        clearTimeout(tapTimer);
                    }
                } else {
                    tapCount = 1;
                }
                
                lastTap = currentTime;
                
                // Reset tap count after delay
                clearTimeout(tapTimer);
                tapTimer = setTimeout(() => {
                    tapCount = 0;
                }, 300);
            });

            // Long press for context menu
            let pressTimer;
            document.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => {
                    this.showContextMenu(e.touches[0].clientX, e.touches[0].clientY);
                }, 500);
            });

            document.addEventListener('touchend', () => {
                clearTimeout(pressTimer);
            });

            document.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
            });
        }
    }

    showContextMenu(x, y) {
        // Remove existing context menu
        const existingMenu = document.getElementById('contextMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.className = 'context-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        menu.innerHTML = `
            <div class="context-menu-item" data-action="new-note">
                <i class="fas fa-sticky-note"></i> Neue Notiz
            </div>
            <div class="context-menu-item" data-action="take-screenshot">
                <i class="fas fa-camera"></i> Screenshot
            </div>
            <div class="context-menu-item" data-action="share-page">
                <i class="fas fa-share-alt"></i> Teilen
            </div>
            <div class="context-menu-item" data-action="reload">
                <i class="fas fa-redo"></i> Neu laden
            </div>
            <div class="context-menu-item" data-action="inspect">
                <i class="fas fa-code"></i> Entwicklertools
            </div>
        `;

        document.body.appendChild(menu);

        // Add event listeners
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            this.handleContextAction(action);
            menu.remove();
        });

        // Close menu when clicking outside
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeHandler);
                    document.removeEventListener('touchstart', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
            document.addEventListener('touchstart', closeHandler);
        }, 100);
    }

    handleContextAction(action) {
        switch(action) {
            case 'new-note':
                if (window.app) window.app.openQuickNoteModal();
                break;
            case 'take-screenshot':
                this.takeScreenshot();
                break;
            case 'share-page':
                if (navigator.share) {
                    navigator.share({
                        title: document.title,
                        text: 'Schau dir diese App an!',
                        url: window.location.href
                    });
                }
                break;
            case 'reload':
                location.reload();
                break;
            case 'inspect':
                // Can't open dev tools programmatically for security reasons
                console.log('Dev Tools: Strg+Shift+I (Windows) oder Cmd+Opt+I (Mac)');
                break;
        }
    }

    async takeScreenshot() {
        try {
            if (!window.html2canvas) {
                // Load html2canvas library
                await this.loadScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js');
            }

            const app = document.querySelector('.app-container');
            const canvas = await html2canvas(app, {
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary'),
                scale: 2,
                useCORS: true,
                allowTaint: true
            });

            const image = canvas.toDataURL('image/png');
            this.downloadImage(image, 'screenshot.png');
            
            if (window.app) {
                window.app.showToast('Screenshot gespeichert', 'success');
            }
        } catch (error) {
            console.error('Screenshot failed:', error);
            if (window.app) {
                window.app.showToast('Screenshot fehlgeschlagen', 'error');
            }
        }
    }

    downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Performance monitoring
    setupPerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const timing = performance.getEntriesByType('navigation')[0];
                const metrics = {
                    loadTime: timing.loadEventEnd - timing.navigationStart,
                    domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                    redirectCount: timing.redirectCount,
                    size: timing.transferSize,
                    type: timing.type
                };
                
                console.log('Performance metrics:', metrics);
                
                // Store for analytics
                localStorage.setItem('perf-metrics', JSON.stringify(metrics));
                
                // Show performance score
                this.calculatePerformanceScore(metrics);
            }, 0);
        });

        // Monitor memory usage (if available)
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                console.log('Memory usage:', {
                    used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
                    total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
                    limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
                });
            }, 60000); // Every minute
        }

        // Monitor network status
        this.setupNetworkMonitoring();
    }

    setupNetworkMonitoring() {
        let lastOnlineStatus = navigator.onLine;
        
        setInterval(() => {
            const currentOnlineStatus = navigator.onLine;
            if (currentOnlineStatus !== lastOnlineStatus) {
                lastOnlineStatus = currentOnlineStatus;
                
                // Log network changes
                const event = {
                    type: 'network_change',
                    status: currentOnlineStatus ? 'online' : 'offline',
                    timestamp: new Date().toISOString()
                };
                
                this.logEvent('network', event);
            }
        }, 1000);
    }

    calculatePerformanceScore(metrics) {
        let score = 100;
        
        // Deduct points for slow loading
        if (metrics.loadTime > 3000) score -= 20;
        if (metrics.loadTime > 5000) score -= 30;
        
        // Deduct points for large page size
        if (metrics.size > 1024 * 1024) score -= 10; // > 1MB
        
        // Store score
        localStorage.setItem('performance-score', score);
        
        // Show warning if score is low
        if (score < 70 && window.app) {
            window.app.showToast(`Performance-Warnung: Score ${score}/100`, 'warning');
        }
        
        return score;
    }

    // Analytics and usage tracking
    setupAnalytics() {
        // Track page views
        this.trackPageView();
        
        // Track user interactions
        this.trackInteractions();
        
        // Track errors
        this.trackErrors();
        
        // Periodic sync with Supabase (if available)
        if (window.supabaseClient?.isAvailable()) {
            setInterval(() => {
                this.syncAnalytics();
            }, 300000); // Every 5 minutes
        }
    }

    trackPageView() {
        const pageView = {
            url: window.location.href,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`
        };
        
        this.logEvent('pageview', pageView);
        
        // Also track hash changes (SPA navigation)
        window.addEventListener('hashchange', () => {
            const hashView = {
                ...pageView,
                url: window.location.href,
                hash: window.location.hash
            };
            this.logEvent('hashchange', hashView);
        });
    }

    trackInteractions() {
        // Track button clicks
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.tagName === 'BUTTON' || target.closest('button')) {
                const button = target.tagName === 'BUTTON' ? target : target.closest('button');
                const interaction = {
                    type: 'button_click',
                    buttonText: button.textContent.trim(),
                    buttonId: button.id,
                    className: button.className,
                    timestamp: new Date().toISOString()
                };
                this.logEvent('interaction', interaction);
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const submission = {
                type: 'form_submit',
                formId: form.id,
                formAction: form.action,
                timestamp: new Date().toISOString()
            };
            this.logEvent('interaction', submission);
        });
    }

    trackErrors() {
        // Track JavaScript errors
        window.addEventListener('error', (e) => {
            const errorEvent = {
                type: 'javascript_error',
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                timestamp: new Date().toISOString()
            };
            this.logEvent('error', errorEvent);
        });

        // Track unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            const rejectionEvent = {
                type: 'promise_rejection',
                reason: e.reason?.message || e.reason,
                timestamp: new Date().toISOString()
            };
            this.logEvent('error', rejectionEvent);
        });
    }

    logEvent(category, data) {
        // Store locally
        const events = JSON.parse(localStorage.getItem('analytics-events') || '[]');
        events.push({
            category,
            data,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 1000 events
        if (events.length > 1000) {
            events.splice(0, events.length - 1000);
        }
        
        localStorage.setItem('analytics-events', JSON.stringify(events));
        
        // Send to Supabase if available and online
        if (window.supabaseClient?.isAvailable() && navigator.onLine) {
            setTimeout(() => {
                window.supabaseClient.trackEvent(category, data);
            }, 0);
        }
    }

    async syncAnalytics() {
        if (!window.supabaseClient?.isAvailable() || !navigator.onLine) {
            return;
        }

        try {
            const events = JSON.parse(localStorage.getItem('analytics-events') || '[]');
            
            if (events.length === 0) return;

            // Send events in batches
            const batchSize = 50;
            for (let i = 0; i < events.length; i += batchSize) {
                const batch = events.slice(i, i + batchSize);
                
                // Send batch to Supabase
                // This would require a Supabase function or direct table insert
                console.log('Syncing analytics batch:', batch.length);
                
                // Clear sent events from local storage
                events.splice(0, batch.length);
                localStorage.setItem('analytics-events', JSON.stringify(events));
                
                // Delay between batches
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Analytics sync error:', error);
        }
    }

    // Background tasks and scheduling
    setupBackgroundTasks() {
        // Periodic cache cleanup
        setInterval(() => {
            this.cleanupOldData();
        }, 3600000); // Every hour

        // Auto-save notes
        setInterval(() => {
            this.autoSaveNotes();
        }, 300000); // Every 5 minutes

        // Update stats periodically
        setInterval(() => {
            if (window.app) {
                window.app.updateStats();
            }
        }, 600000); // Every 10 minutes

        // Check for updates
        setInterval(() => {
            this.checkForUpdates();
        }, 1800000); // Every 30 minutes
    }

    cleanupOldData() {
        try {
            // Cleanup old analytics events (older than 30 days)
            const events = JSON.parse(localStorage.getItem('analytics-events') || '[]');
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const filteredEvents = events.filter(event => {
                return new Date(event.timestamp) > thirtyDaysAgo;
            });
            
            if (filteredEvents.length !== events.length) {
                localStorage.setItem('analytics-events', JSON.stringify(filteredEvents));
                console.log(`Cleaned up ${events.length - filteredEvents.length} old analytics events`);
            }

            // Cleanup old cached images
            if ('caches' in window) {
                this.cleanupImageCache();
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    async cleanupImageCache() {
        try {
            const cache = await caches.open('matthias-app-v2.0.0');
            const requests = await cache.keys();
            
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    const date = response.headers.get('date');
                    if (date && new Date(date).getTime() < oneWeekAgo) {
                        await cache.delete(request);
                    }
                }
            }
        } catch (error) {
            console.error('Cache cleanup error:', error);
        }
    }

    autoSaveNotes() {
        if (!window.app || !window.app.notes || window.app.notes.length === 0) {
            return;
        }

        // Check if notes have been modified recently
        const lastSave = localStorage.getItem('notes-last-save');
        const now = new Date().getTime();
        
        if (lastSave && (now - parseInt(lastSave)) < 60000) {
            return; // Saved less than a minute ago
        }

        // Auto-save to Supabase if available
        if (window.supabaseClient?.isAvailable() && navigator.onLine) {
            window.supabaseClient.syncNotes(window.app.notes)
                .then(result => {
                    if (result.success) {
                        localStorage.setItem('notes-last-save', now.toString());
                        console.log('Notes auto-saved to Supabase');
                    }
                })
                .catch(error => {
                    console.error('Auto-save error:', error);
                });
        }
    }

    checkForUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.update();
            });
        }

        // Check for new app version
        const currentVersion = '2.0.0';
        const storedVersion = localStorage.getItem('app-version');
        
        if (storedVersion !== currentVersion) {
            console.log('New app version detected:', currentVersion);
            localStorage.setItem('app-version', currentVersion);
            
            // Show update notification
            if (window.app && storedVersion) {
                window.app.showToast('App wurde aktualisiert!', 'info');
            }
        }
    }

    // Utility functions
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    formatDate(date, format = 'datetime') {
        const d = new Date(date);
        
        if (format === 'datetime') {
            return d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE');
        } else if (format === 'date') {
            return d.toLocaleDateString('de-DE');
        } else if (format === 'time') {
            return d.toLocaleTimeString('de-DE');
        } else if (format === 'relative') {
            const now = new Date();
            const diff = now - d;
            
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
            if (hours > 0) return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
            if (minutes > 0) return `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
            return 'gerade eben';
        }
        
        return d.toISOString();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Export data function
    exportAllData() {
        const data = {
            notes: window.app?.notes || [],
            settings: window.app?.settings || {},
            analytics: JSON.parse(localStorage.getItem('analytics-events') || '[]'),
            version: '2.0.0',
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `matthias-app-full-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return data;
    }

    // Import data function
    importAllData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    // Validate data structure
                    if (!data.version || !data.exportDate) {
                        throw new Error('Ungültige Datei');
                    }
                    
                    // Import notes
                    if (data.notes && Array.isArray(data.notes)) {
                        if (window.app) {
                            window.app.notes = data.notes;
                            window.app.saveNotes();
                        }
                    }
                    
                    // Import settings
                    if (data.settings && typeof data.settings === 'object') {
                        if (window.app) {
                            window.app.settings = { ...window.app.settings, ...data.settings };
                            window.app.saveSettings();
                        }
                    }
                    
                    // Import analytics
                    if (data.analytics && Array.isArray(data.analytics)) {
                        localStorage.setItem('analytics-events', JSON.stringify(data.analytics));
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Fehler beim Lesen der Datei'));
            };
            
            reader.readAsText(file);
        });
    }

    // Health check function
    async performHealthCheck() {
        const checks = {
            localStorage: false,
            serviceWorker: false,
            indexedDB: false,
            online: false,
            supabase: false
        };

        // Check localStorage
        try {
            localStorage.setItem('health-check', 'test');
            localStorage.removeItem('health-check');
            checks.localStorage = true;
        } catch (error) {
            console.error('LocalStorage check failed:', error);
        }

        // Check Service Worker
        checks.serviceWorker = 'serviceWorker' in navigator;

        // Check IndexedDB
        checks.indexedDB = 'indexedDB' in window;

        // Check online status
        checks.online = navigator.onLine;

        // Check Supabase connection
        if (window.supabaseClient?.isAvailable()) {
            const test = await window.supabaseClient.testConnection();
            checks.supabase = test.connected;
        }

        // Calculate overall health score
        const passed = Object.values(checks).filter(Boolean).length;
        const total = Object.keys(checks).length;
        const score = Math.round((passed / total) * 100);

        return {
            checks,
            score,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
    }
}

// Initialize App Functions
document.addEventListener('DOMContentLoaded', () => {
    window.appFunctions = new AppFunctions();
    
    // Add context menu styles
    const style = document.createElement('style');
    style.textContent = `
        .context-menu {
            position: fixed;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 2000;
            min-width: 200px;
            overflow: hidden;
        }
        
        .context-menu-item {
            padding: 0.75rem 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            transition: var(--transition);
        }
        
        .context-menu-item:hover {
            background-color: var(--bg-secondary);
        }
        
        .context-menu-item i {
            width: 16px;
            text-align: center;
            color: var(--primary-color);
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});
