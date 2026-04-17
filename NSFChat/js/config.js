/**
 * NSFChat — Supabase Configuration
 * ---------------------------------------------------------
 * Put this file in js/config.js and load it before auth.js.
 * It creates a shared global client at:
 *   window.supabaseClient
 * ---------------------------------------------------------
 */

(() => {
  const SUPABASE_URL = 'https://hzrxjaxrmpnfwksdhakf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6cnhqYXhybXBuZndrc2RoYWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTIzOTUsImV4cCI6MjA5MTk4ODM5NX0.Di0nZVHkXWl8Y5wH4XzB5INuZsCApRLy2FW04TVo4DM';

  const MEDIA_BUCKET = 'chat-media';

  const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  const MAX_FILE_SIZE_MB = 50;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase CDN did not load. Check the script tag in index.html.');
    return;
  }

  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.MEDIA_BUCKET = MEDIA_BUCKET;
  window.ACCEPTED_IMAGE_TYPES = ACCEPTED_IMAGE_TYPES;
  window.ACCEPTED_VIDEO_TYPES = ACCEPTED_VIDEO_TYPES;
  window.MAX_FILE_SIZE_MB = MAX_FILE_SIZE_MB;
  window.MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_BYTES;

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  });

  console.log('NSFChat Supabase client ready');
})();
