# NSFChat

A polished, mobile-first Supabase chat app for GitHub Pages.

## Included
- Email sign-up / sign-in
- Password reset
- Session persistence
- Profile creation and editing
- Direct chats
- Text, image, and voice messages
- Realtime updates
- Supabase Storage uploads
- Responsive desktop + mobile UI

## Setup
1. Apply `sql/schema.sql` in the Supabase SQL editor.
2. Make sure email auth is enabled in Supabase Auth.
3. Upload the project folder to GitHub Pages.
4. Open `index.html`.

## Notes
- Avatar uploads use the public `avatars` bucket.
- Chat images and voice notes use private buckets with signed URLs.
- The schema is migration-safe and can be applied to an existing database.
