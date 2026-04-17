# NSFChat

A modern, real-time messaging web app powered by Supabase.

## Features

- **Email Sign-Up & Sign-In** — Secure auth via Supabase Auth
- **Profile Management** — Display name, username, nationality, bio, avatar
- **Direct Messaging** — Find users, start conversations, chat in real time
- **Text Messages** — Rich text input with Enter-to-send
- **Image Sharing** — Upload and preview images inline
- **Voice Messages** — Record, preview, and send voice notes
- **Real-Time Updates** — Messages appear instantly via Supabase Realtime
- **Mobile-First** — Fully responsive on phones and desktops

## Project Structure

```
nsfchat/
├── index.html          — Entry point
├── css/
│   └── style.css       — Complete stylesheet
├── js/
│   └── app.js          — All application logic
├── sql/
│   └── schema.sql      — Database schema & RLS policies
└── assets/
    └── logo.svg        — NSFChat logo
```

## Database Setup

1. Open your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Paste and run the contents of `sql/schema.sql`
4. Go to **Storage** and verify the three buckets are created:
   - `avatars` (public)
   - `chat-images` (public)
   - `voice-messages` (public)

## Supabase Configuration

1. Go to **Authentication → URL Configuration** in your Supabase dashboard
2. Add your GitHub Pages URL (e.g. `https://yourusername.github.io/nsfchat`) to:
   - **Site URL**
   - **Redirect URLs**
3. For email confirmation: go to **Authentication → Settings** and optionally disable "Enable email confirmations" for easier testing

## Deployment to GitHub Pages

1. Push all files to a GitHub repository
2. Go to **Settings → Pages**
3. Set Source: `Deploy from a branch` → `main` → `/ (root)`
4. Your app will be live at `https://yourusername.github.io/repo-name`

## Running Locally

Since this is plain HTML/JS, you can run it with any static server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx serve .

# Using VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

Then open `http://localhost:8080`

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

Voice recording requires HTTPS or localhost (browser security requirement).

## Supabase Credentials

The app connects to:
- **URL**: `https://hzrxjaxrmpnfwksdhakf.supabase.co`
- **Anon Key**: Embedded in `js/app.js`

These are the public anon credentials, safe to include in client-side code.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no framework)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Fonts**: Sora + DM Sans (Google Fonts)
- **CDN**: Supabase JS v2 via jsDelivr
