/**
 * NSFChat — Supabase Configuration
 * ─────────────────────────────────────────────────────────
 * Replace the two placeholder values below with your own
 * project credentials from: https://app.supabase.com
 *   → Project Settings → API
 * ─────────────────────────────────────────────────────────
 */

const SUPABASE_URL     = 'https://hzrxjaxrmpnfwksdhakf.supabase.co';       // e.g. https://xyzabc.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6cnhqYXhybXBuZndrc2RoYWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTIzOTUsImV4cCI6MjA5MTk4ODM5NX0.Di0nZVHkXWl8Y5wH4XzB5INuZsCApRLy2FW04TVo4DM'; // starts with eyJ…

// Initialize the Supabase client (loaded via CDN in index.html)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});

// Storage bucket name
const MEDIA_BUCKET = 'chat-media';

// Accepted media types & size limits
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE_MB      = 50;
const MAX_FILE_SIZE_BYTES   = MAX_FILE_SIZE_MB * 1024 * 1024;
