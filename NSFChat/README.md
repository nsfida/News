# NSFChat

NSFChat is a modern, responsive Supabase-powered messaging app with email sign-up, sign-in, user profiles, direct conversations, realtime messages, and a polished mobile-first UI.

## What is included

- Email sign-up and sign-in
- Automatic profile creation from auth metadata
- Editable profile fields:
  - Display name
  - Full name
  - Username
  - Nationality
  - Avatar URL
  - Bio
  - Website
  - Location
  - Phone
  - Status
- Direct messages between users
- Realtime message updates
- Responsive desktop and mobile layout
- Supabase SQL schema and RLS policies
- Brand logo in SVG

## Project structure

- `index.html` main entry
- `styles/` contains all CSS
- `js/` contains app logic and Supabase config
- `assets/` contains the logo
- `sql/` contains the database schema

## Setup

1. Create the tables by running `sql/schema.sql` in the Supabase SQL Editor.
2. In Supabase Auth, enable email sign-up/sign-in.
3. Set your Site URL and Redirect URLs in Supabase Auth settings to the domain where you will host NSFChat.
4. Upload or use the included `assets/logo.svg`.
5. Host the files on any static hosting service.

## Important notes

- This project uses the Supabase anon public key in `js/config.js`.
- If email confirmation is enabled in your Supabase project, users must confirm before they can sign in.
- For production, keep the SQL policies and only expose the anon key in frontend code.

## Recommended deployment

You can deploy this as a static site on Netlify, Vercel, GitHub Pages, or any static host.
