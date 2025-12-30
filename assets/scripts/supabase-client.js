// Supabase Client Configuration
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.init();
    }

    init() {
        // Supabase configuration
        this.supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
        this.supabaseKey = 'YOUR_ANON_KEY';
        
        // Try to initialize Supabase if available
        if (window.supabase) {
            this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
            this.isConnected = true;
            console.log('Supabase initialized successfully');
        } else {
            console.warn('Supabase JS library not loaded. Running in offline mode.');
        }
    }

    // Check if Supabase is available
    isAvailable() {
        return this.supabase !== null;
    }

    // User Authentication
    async signUp(email, password, userData) {
        if (!this.isAvailable()) {
            throw new Error('Supabase nicht verfügbar');
        }

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        if (!this.isAvailable()) {
            throw new Error('Supabase nicht verfügbar');
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        if (!this.isAvailable()) {
            throw new Error('Supabase nicht verfügbar');
        }

        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentUser() {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }

    // Notes Management
    async syncNotes(localNotes) {
        if (!this.isAvailable() || !navigator.onLine) {
            return { success: false, error: 'Offline oder Supabase nicht verfügbar' };
        }

        try {
            const user = await this.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Nicht angemeldet' };
            }

            // Get existing notes from Supabase
            const { data: remoteNotes, error: fetchError } = await this.supabase
                .from('notes')
                .select('*')
                .eq('user_id', user.id);

            if (fetchError) throw fetchError;

            // Merge logic: prioritize newer changes
            const mergedNotes = this.mergeNotes(localNotes, remoteNotes || []);

            // Upload merged notes
            const notesToUpload = mergedNotes.map(note => ({
                ...note,
                user_id: user.id,
                updated_at: new Date().toISOString()
            }));

            const { error: uploadError } = await this.supabase
                .from('notes')
                .upsert(notesToUpload);

            if (uploadError) throw uploadError;

            return { 
                success: true, 
                notes: mergedNotes,
                syncedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Sync error:', error);
            return { success: false, error: error.message };
        }
    }

    mergeNotes(localNotes, remoteNotes) {
        const noteMap = new Map();

        // Add remote notes to map
        remoteNotes.forEach(note => {
            noteMap.set(note.id, note);
        });

        // Merge local notes, prioritizing newer ones
        localNotes.forEach(localNote => {
            const remoteNote = noteMap.get(localNote.id);
            
            if (!remoteNote) {
                // New note, add it
                noteMap.set(localNote.id, localNote);
            } else {
                // Compare timestamps
                const localDate = new Date(localNote.updatedAt || localNote.createdAt);
                const remoteDate = new Date(remoteNote.updated_at || remoteNote.created_at);
                
                if (localDate > remoteDate) {
                    // Local is newer
                    noteMap.set(localNote.id, {
                        ...localNote,
                        created_at: remoteNote.created_at
                    });
                }
            }
        });

        return Array.from(noteMap.values());
    }

    async getNotes() {
        if (!this.isAvailable()) {
            return { success: false, error: 'Supabase nicht verfügbar' };
        }

        try {
            const user = await this.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Nicht angemeldet' };
            }

            const { data, error } = await this.supabase
                .from('notes')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            return { 
                success: true, 
                notes: data.map(note => ({
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    color: note.color,
                    createdAt: note.created_at,
                    updatedAt: note.updated_at
                }))
            };
        } catch (error) {
            console.error('Get notes error:', error);
            return { success: false, error: error.message };
        }
    }

    async saveNote(note) {
        if (!this.isAvailable()) {
            return { success: false, error: 'Supabase nicht verfügbar' };
        }

        try {
            const user = await this.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Nicht angemeldet' };
            }

            const noteData = {
                id: note.id,
                title: note.title,
                content: note.content,
                color: note.color,
                user_id: user.id,
                created_at: note.createdAt,
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('notes')
                .upsert(noteData);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Save note error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteNote(noteId) {
        if (!this.isAvailable()) {
            return { success: false, error: 'Supabase nicht verfügbar' };
        }

        try {
            const { error } = await this.supabase
                .from('notes')
                .delete()
                .eq('id', noteId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Delete note error:', error);
            return { success: false, error: error.message };
        }
    }

    // Analytics - Track app usage
    async trackEvent(eventName, eventData = {}) {
        if (!this.isAvailable() || !navigator.onLine) {
            return;
        }

        try {
            const user = await this.getCurrentUser();
            const { error } = await this.supabase
                .from('analytics')
                .insert({
                    event_name: eventName,
                    event_data: eventData,
                    user_id: user?.id || null,
                    user_agent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                });

            if (error) {
                console.error('Analytics error:', error);
            }
        } catch (error) {
            console.error('Track event error:', error);
        }
    }

    // Backup and restore
    async createBackup(backupData) {
        if (!this.isAvailable()) {
            return { success: false, error: 'Supabase nicht verfügbar' };
        }

        try {
            const user = await this.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Nicht angemeldet' };
            }

            const backup = {
                user_id: user.id,
                data: backupData,
                created_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('backups')
                .insert(backup);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Create backup error:', error);
            return { success: false, error: error.message };
        }
    }

    async getBackups() {
        if (!this.isAvailable()) {
            return { success: false, error: 'Supabase nicht verfügbar' };
        }

        try {
            const user = await this.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Nicht angemeldet' };
            }

            const { data, error } = await this.supabase
                .from('backups')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, backups: data };
        } catch (error) {
            console.error('Get backups error:', error);
            return { success: false, error: error.message };
        }
    }

    // File Storage
    async uploadFile(file, bucket = 'app-files') {
        if (!this.isAvailable()) {
            return { success: false, error: 'Supabase nicht verfügbar' };
        }

        try {
            const user = await this.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Nicht angemeldet' };
            }

            const fileName = `${user.id}/${Date.now()}_${file.name}`;
            const { error } = await this.supabase.storage
                .from(bucket)
                .upload(fileName, file);

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return { 
                success: true, 
                fileName, 
                publicUrl 
            };
        } catch (error) {
            console.error('Upload file error:', error);
            return { success: false, error: error.message };
        }
    }

    async getFiles(bucket = 'app-files') {
        if (!this.isAvailable()) {
            return { success: false, error: 'Supabase nicht verfügbar' };
        }

        try {
            const user = await this.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Nicht angemeldet' };
            }

            const { data, error } = await this.supabase.storage
                .from(bucket)
                .list(user.id);

            if (error) throw error;

            return { success: true, files: data || [] };
        } catch (error) {
            console.error('Get files error:', error);
            return { success: false, error: error.message };
        }
    }

    // Real-time subscriptions
    subscribeToNotes(callback) {
        if (!this.isAvailable()) {
            return { success: false, error: 'Supabase nicht verfügbar' };
        }

        try {
            const subscription = this.supabase
                .channel('notes-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notes'
                    },
                    (payload) => {
                        callback(payload);
                    }
                )
                .subscribe();

            return { 
                success: true, 
                subscription,
                unsubscribe: () => subscription.unsubscribe()
            };
        } catch (error) {
            console.error('Subscription error:', error);
            return { success: false, error: error.message };
        }
    }

    // Test connection
    async testConnection() {
        if (!this.isAvailable()) {
            return { 
                success: false, 
                connected: false,
                error: 'Supabase JS library not loaded' 
            };
        }

        try {
            // Simple query to test connection
            const { error } = await this.supabase
                .from('notes')
                .select('count', { count: 'exact', head: true });

            return { 
                success: !error, 
                connected: !error,
                error: error?.message 
            };
        } catch (error) {
            return { 
                success: false, 
                connected: false,
                error: error.message 
            };
        }
    }

    // Health check
    async healthCheck() {
        const connectionTest = await this.testConnection();
        const user = await this.getCurrentUser();
        
        return {
            timestamp: new Date().toISOString(),
            connected: connectionTest.connected,
            authenticated: user !== null,
            online: navigator.onLine,
            userAgent: navigator.userAgent,
            platform: navigator.platform
        };
    }
}

// Initialize Supabase client
let supabaseClient = null;

function initSupabase() {
    try {
        supabaseClient = new SupabaseClient();
        window.supabaseClient = supabaseClient;
        
        // Log initialization
        console.log('Supabase Client initialized');
        
        // Test connection on startup
        setTimeout(async () => {
            const test = await supabaseClient.testConnection();
            console.log('Supabase connection test:', test);
            
            if (test.connected && window.app) {
                window.app.showToast('Mit Supabase verbunden', 'success');
            }
        }, 2000);
        
        return supabaseClient;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return null;
    }
}

// Load Supabase library dynamically
function loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.supabase) {
            resolve(window.supabase);
            return;
        }

        // Load Supabase library
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js';
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
            if (window.supabase) {
                resolve(window.supabase);
            } else {
                reject(new Error('Supabase library failed to load'));
            }
        };
        
        script.onerror = () => {
            reject(new Error('Failed to load Supabase library'));
        };
        
        document.head.appendChild(script);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check if Supabase should be loaded
    const loadSupabase = localStorage.getItem('supabase-enabled') !== 'false';
    
    if (loadSupabase && navigator.onLine) {
        try {
            await loadSupabaseLibrary();
            initSupabase();
        } catch (error) {
            console.warn('Supabase offline mode:', error.message);
            // Create a mock client for offline mode
            window.supabaseClient = {
                isAvailable: () => false,
                isConnected: false
            };
        }
    } else {
        // Create a mock client for offline mode
        window.supabaseClient = {
            isAvailable: () => false,
            isConnected: false
        };
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupabaseClient, initSupabase, loadSupabaseLibrary };
}
