-- ============================================================
-- NSFChat Database Schema
-- Fixed: removes signup-breaking auth trigger
-- Migration-safe: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BASE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  username TEXT UNIQUE,
  nationality TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nationality TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct',
  name TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT
);

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);


CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT,
  content_type TEXT NOT NULL DEFAULT 'text',
  file_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS file_url TEXT;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'text';

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id
  ON conversation_members (user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id
  ON conversation_members (conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON conversations (last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_username
  ON profiles (username);


-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- RLS HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION is_conversation_member(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_conversation_creator(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = p_conversation_id
      AND c.created_by = auth.uid()
  );
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

DROP POLICY IF EXISTS conversations_select ON conversations;
DROP POLICY IF EXISTS conversations_insert ON conversations;
DROP POLICY IF EXISTS conversations_update ON conversations;

DROP POLICY IF EXISTS members_select ON conversation_members;
DROP POLICY IF EXISTS members_insert ON conversation_members;
DROP POLICY IF EXISTS members_update ON conversation_members;
DROP POLICY IF EXISTS members_delete ON conversation_members;

DROP POLICY IF EXISTS messages_select ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;
DROP POLICY IF EXISTS messages_update ON messages;
DROP POLICY IF EXISTS messages_delete ON messages;

-- PROFILES
CREATE POLICY profiles_select
ON profiles
FOR SELECT
USING (true);

CREATE POLICY profiles_insert
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- CONVERSATIONS
CREATE POLICY conversations_select
ON conversations
FOR SELECT
USING (is_conversation_member(id));

CREATE POLICY conversations_insert
ON conversations
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY conversations_update
ON conversations
FOR UPDATE
USING (is_conversation_member(id))
WITH CHECK (is_conversation_member(id));

-- CONVERSATION MEMBERS
CREATE POLICY members_select
ON conversation_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_conversation_member(conversation_id)
);

CREATE POLICY members_insert
ON conversation_members
FOR INSERT
WITH CHECK (is_conversation_creator(conversation_id));

CREATE POLICY members_update
ON conversation_members
FOR UPDATE
USING (is_conversation_creator(conversation_id))
WITH CHECK (is_conversation_creator(conversation_id));

CREATE POLICY members_delete
ON conversation_members
FOR DELETE
USING (is_conversation_creator(conversation_id));

-- MESSAGES
CREATE POLICY messages_select
ON messages
FOR SELECT
USING (is_conversation_member(conversation_id));

CREATE POLICY messages_insert
ON messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND is_conversation_member(conversation_id)
);

CREATE POLICY messages_update
ON messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY messages_delete
ON messages
FOR DELETE
USING (auth.uid() = sender_id);


-- ============================================================
-- STORAGE POLICIES
-- ============================================================

DROP POLICY IF EXISTS avatars_select ON storage.objects;
DROP POLICY IF EXISTS avatars_insert ON storage.objects;
DROP POLICY IF EXISTS avatars_update ON storage.objects;
DROP POLICY IF EXISTS avatars_delete ON storage.objects;

DROP POLICY IF EXISTS chat_images_select ON storage.objects;
DROP POLICY IF EXISTS chat_images_insert ON storage.objects;
DROP POLICY IF EXISTS chat_images_update ON storage.objects;
DROP POLICY IF EXISTS chat_images_delete ON storage.objects;

DROP POLICY IF EXISTS voice_select ON storage.objects;
DROP POLICY IF EXISTS voice_insert ON storage.objects;
DROP POLICY IF EXISTS voice_update ON storage.objects;
DROP POLICY IF EXISTS voice_delete ON storage.objects;

CREATE POLICY avatars_select
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY avatars_insert
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY avatars_update
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY avatars_delete
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY chat_images_select
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-images');

CREATE POLICY chat_images_insert
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY chat_images_update
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY chat_images_delete
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY voice_select
ON storage.objects
FOR SELECT
USING (bucket_id = 'voice-messages');

CREATE POLICY voice_insert
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'voice-messages'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY voice_update
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'voice-messages'
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'voice-messages'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY voice_delete
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'voice-messages'
  AND auth.uid() IS NOT NULL
);


-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profile_updated_at();

CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_updated_at ON conversations;
CREATE TRIGGER conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_conversation_updated_at();

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = CASE
      WHEN NEW.content_type = 'text' THEN LEFT(COALESCE(NEW.content, ''), 100)
      WHEN NEW.content_type = 'image' THEN '📷 Image'
      WHEN NEW.content_type = 'voice' THEN '🎤 Voice message'
      ELSE COALESCE(NEW.content, '')
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();


-- ============================================================
-- REALTIME
-- ============================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

-- ============================================================
-- REMOVE BROKEN LEGACY AUTH TRIGGER IF IT EXISTS
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
