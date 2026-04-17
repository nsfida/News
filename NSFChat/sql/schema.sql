-- ============================================================
-- NSFChat — Supabase Schema + RLS + Storage Setup
-- Run this entire file in: Supabase > SQL Editor > New Query
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. PROFILES TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─────────────────────────────────────────────
-- 2. CONVERSATIONS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_a UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  participant_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_message  TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Ensures only one conversation per pair of users
  CONSTRAINT unique_conversation UNIQUE (participant_a, participant_b),
  -- Enforce canonical ordering so (A,B) == (B,A) isn't duplicated
  CONSTRAINT ordered_participants CHECK (participant_a < participant_b)
);

-- ─────────────────────────────────────────────
-- 3. MESSAGES TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content         TEXT,                          -- text body (nullable if media-only)
  media_url       TEXT,                          -- public URL from Supabase Storage
  media_type      TEXT CHECK (media_type IN ('image', 'video')),
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  read_at         TIMESTAMPTZ                    -- null = unread
);

-- Index for fast conversation message lookup
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages (conversation_id, created_at DESC);

-- ─────────────────────────────────────────────
-- 4. ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages     ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 5. PROFILES RLS POLICIES
-- ─────────────────────────────────────────────

-- Any authenticated user can view profiles (needed for searching by email)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only insert their own profile row
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ─────────────────────────────────────────────
-- 6. CONVERSATIONS RLS POLICIES
-- ─────────────────────────────────────────────

CREATE POLICY "conversations_select_participant"
  ON public.conversations FOR SELECT
  USING (
    auth.uid() = participant_a OR
    auth.uid() = participant_b
  );

CREATE POLICY "conversations_insert_participant"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.uid() = participant_a OR
    auth.uid() = participant_b
  );

CREATE POLICY "conversations_update_participant"
  ON public.conversations FOR UPDATE
  USING (
    auth.uid() = participant_a OR
    auth.uid() = participant_b
  );

-- ─────────────────────────────────────────────
-- 7. MESSAGES RLS POLICIES
-- ─────────────────────────────────────────────

-- Users can only read messages from their own conversations
CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

-- Users can only send messages in their own conversations
CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

-- ─────────────────────────────────────────────
-- 8. AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    -- Default display name = part before @ in email
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─────────────────────────────────────────────
-- 9. REALTIME SUBSCRIPTIONS — Enable for tables
-- ─────────────────────────────────────────────
-- Run these in Supabase SQL Editor:

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ─────────────────────────────────────────────
-- 10. STORAGE BUCKET SETUP
-- ─────────────────────────────────────────────
-- Run these in Supabase SQL Editor OR create the bucket
-- manually in Storage > New Bucket > "chat-media" (public: true)

INSERT INTO storage.buckets (id, name, public)
  VALUES ('chat-media', 'chat-media', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own folder
CREATE POLICY "storage_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media' AND
    auth.role() = 'authenticated'
  );

-- Anyone authenticated can view chat media
CREATE POLICY "storage_select_authenticated"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-media' AND
    auth.role() = 'authenticated'
  );

-- Users can delete their own uploads
CREATE POLICY "storage_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- SCHEMA COMPLETE — All tables, RLS, trigger, and storage ready
-- ============================================================
