# NSFChat

**A premium, production-ready private messaging web app**  
Built with vanilla HTML/CSS/JS and powered by Supabase (free tier).

---

## ✦ Features

- **Email / Password Authentication** — secure sign-up and login via Supabase Auth
- **Direct 1-to-1 Chat** — find any registered user by email and start chatting instantly
- **Real-time Messaging** — messages appear live via Supabase Realtime (WebSocket)
- **Image Sending** — send JPG, PNG, GIF, WebP images (up to 50 MB)
- **Video Sending** — send MP4, WebM, MOV short videos (up to 50 MB)
- **Media Lightbox** — tap any image to view it full-screen
- **Premium UI** — noir luxury design: deep blacks, champagne gold, elegant typography
- **Mobile Responsive** — collapsible sidebar, full mobile layout
- **No backend required** — runs as a static site, deployable anywhere

---

## ✦ Tech Stack

| Layer       | Technology                |
|-------------|---------------------------|
| Frontend    | HTML5, CSS3, Vanilla JS   |
| Auth        | Supabase Auth             |
| Database    | Supabase (PostgreSQL)     |
| Realtime    | Supabase Realtime         |
| Storage     | Supabase Storage          |
| Fonts       | Google Fonts (CDN)        |
| Supabase JS | @supabase/supabase-js v2  |

---

## ✦ File Structure

```
nsfchat/
├── index.html          # Main app (single page)
├── assets/
│   └── favicon.svg     # App icon
├── css/
│   └── styles.css      # Full stylesheet
├── js/
│   ├── config.js       # ← PUT YOUR KEYS HERE
│   ├── auth.js         # Auth module
│   ├── chat.js         # Chat + realtime + storage
│   └── app.js          # Main controller + UI
├── sql/
│   └── schema.sql      # DB schema, RLS policies, storage setup
└── README.md           # This file
```

---

## ✦ Setup Instructions

### Step 1 — Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com) and click **New Project**
2. Choose a name (e.g. `nsfchat`), set a database password, and pick a region
3. Wait for the project to provision (~1–2 minutes)

---

### Step 2 — Run the SQL Schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open `sql/schema.sql` from this project folder
4. **Copy the entire contents** and paste it into the SQL editor
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

This creates:
- `profiles` table (auto-populated on signup via trigger)
- `conversations` table (1-to-1, canonical pair ordering)
- `messages` table (text + media)
- Row Level Security policies on all tables
- A trigger to auto-create profiles when users sign up
- Realtime enabled for `messages` and `conversations`
- Storage bucket `chat-media` with access policies

> **Note:** If you get an error about `supabase_realtime` publication already existing, that's fine — skip that line.

---

### Step 3 — Create the Storage Bucket (if SQL didn't work)

If the SQL Storage section failed, create it manually:

1. Go to **Storage** in the left sidebar
2. Click **New Bucket**
3. Name it exactly: `chat-media`
4. Check **Public bucket** ✓
5. Click **Create bucket**

Then add these policies manually:
- **INSERT**: `(bucket_id = 'chat-media') AND (auth.role() = 'authenticated')`
- **SELECT**: `(bucket_id = 'chat-media') AND (auth.role() = 'authenticated')`

---

### Step 4 — Get Your API Keys

1. In your Supabase dashboard go to **Project Settings → API**
2. Copy:
   - **Project URL** (looks like `https://xyzabc.supabase.co`)
   - **anon / public** key (starts with `eyJ…`)

---

### Step 5 — Add Your Keys to the App

Open `js/config.js` and replace the placeholder values:

```javascript
const SUPABASE_URL      = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

> ⚠️ The anon key is safe to use in frontend code — it's designed for this.  
> Never use your **service role** key in frontend code.

---

### Step 6 — Run Locally

NSFChat is a static site. Any static server works:

**Option A — VS Code Live Server**
- Install the "Live Server" extension
- Right-click `index.html` → Open with Live Server

**Option B — Python**
```bash
cd nsfchat
python3 -m http.server 8080
# Open http://localhost:8080
```

**Option C — Node.js (npx serve)**
```bash
cd nsfchat
npx serve .
# Open the URL shown in terminal
```

**Option D — Direct file**  
Some browsers allow opening `index.html` directly. However, a local server is recommended for Supabase connections to work properly.

---

## ✦ Deployment

Since NSFChat is a pure static site, deploy it anywhere:

### Vercel (recommended, free)
```bash
npm i -g vercel
cd nsfchat
vercel
```

### Netlify (free)
- Drag and drop the `nsfchat/` folder at [netlify.com/drop](https://app.netlify.com/drop)

### GitHub Pages
1. Push to a GitHub repo
2. Go to repo Settings → Pages → deploy from branch `main` / root

### Any static host
Upload all files maintaining the folder structure. No server-side processing needed.

---

## ✦ Supabase Auth Settings (Optional)

In Supabase → **Authentication → Settings**:

- **Email confirmations**: disable for development (makes testing easier)
- **Site URL**: set to your deployment URL (e.g. `https://your-app.vercel.app`)
- **Redirect URLs**: add `http://localhost:8080` for local dev

---

## ✦ How It Works

### New Conversation
1. Click the **+** button in the sidebar
2. Enter the recipient's email address (they must already have an account)
3. A conversation is created (or the existing one is opened)

### Sending Media
1. Click the 📷 icon in the message bar
2. Choose an image or video from your device
3. A preview appears in the input bar
4. Press **Send** — the file uploads to Supabase Storage, then the message is sent

### Real-time
Messages arrive live without page refresh via Supabase Realtime WebSocket subscriptions. The app subscribes to the active conversation's message channel and appends new messages as they arrive.

---

## ✦ Customisation

| What to change              | Where                                  |
|-----------------------------|----------------------------------------|
| App name / branding         | `index.html` (logo text, page title)  |
| Colors / theme              | `css/styles.css` (`:root` variables)  |
| Max file size               | `js/config.js` (`MAX_FILE_SIZE_MB`)   |
| Accepted file types         | `js/config.js` (`ACCEPTED_*_TYPES`)   |
| Storage bucket name         | `js/config.js` (`MEDIA_BUCKET`)       |
| Message character limit     | `js/app.js` (handleSend function)     |

---

## ✦ Security Notes

- All database tables use **Row Level Security** — users can only read/write their own data
- The Supabase anon key is intentionally public — access is controlled by RLS policies
- Media uploads are scoped to authenticated users only
- Passwords are handled entirely by Supabase Auth (bcrypt hashed, never stored in your DB)

---

## ✦ Troubleshooting

| Problem | Solution |
|---------|----------|
| "No user found with that email" | The other user must sign up first |
| Messages not updating in real-time | Check Realtime is enabled in Supabase Dashboard → Database → Replication |
| Media upload fails | Check the `chat-media` bucket exists and is public |
| Auth not working | Verify your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `config.js` |
| Blank screen | Open browser devtools console for errors |

---

*NSFChat — Built for premium private communication.*
