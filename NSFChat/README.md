# NSFChat

NSFChat is a responsive, Supabase-backed messaging app with:

- Email sign-up and sign-in
- User profiles stored in Supabase
- Display name, nationality, username, bio, avatar, website, location, phone, and status fields
- Direct chat creation
- Realtime message updates
- Mobile-first layout for GitHub Pages

## Folder layout

- `index.html` in the project root
- `css/` for styles
- `js/` for application code
- `assets/` for the logo
- `sql/` for the database schema and RLS policies

## Supabase setup

1. Open your Supabase project.
2. Run `sql/schema.sql` in the SQL editor.
3. Make sure Email auth is enabled in Authentication settings.
4. Add your GitHub Pages URL to the allowed site URLs and redirect URLs in Supabase Authentication settings.
5. Deploy this repo to GitHub Pages from the repository root.

## Notes

- The project uses the Supabase anonymous key in the browser. That is expected for client-side apps.
- The schema uses Row Level Security and a secure RPC for direct conversation creation.
- If you edit the Supabase project URL or anon key, update `js/config.js`.

## Local preview

Open `index.html` through a local static server or through GitHub Pages. For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.
