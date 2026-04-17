/**
 * NSFChat — Chat Module
 * Conversations, messages, realtime subscriptions, media uploads
 */

const Chat = (() => {

  /* ── State ─────────────────────────────────────────── */
  let currentUser        = null;
  let activeConversation = null;  // { id, other: profileObj }
  let realtimeChannel    = null;  // active Supabase Realtime subscription
  let conversationsCache = [];    // local cache of conversation list

  /* ── Profile helpers ──────────────────────────────── */

  /** Fetch a profile by email (used when starting a new chat) */
  async function getProfileByEmail(email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();
    if (error) return null;
    return data;
  }

  /** Fetch the current user's profile */
  async function getMyProfile() {
    if (!currentUser) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    return data;
  }

  /* ── Conversation helpers ─────────────────────────── */

  /**
   * Get or create a 1-to-1 conversation between two users.
   * Uses canonical ordering (smaller UUID first) to avoid duplicates.
   */
  async function getOrCreateConversation(otherUserId) {
    const uid   = currentUser.id;
    const a     = uid < otherUserId ? uid   : otherUserId;
    const b     = uid < otherUserId ? otherUserId : uid;

    // Try to find existing
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_a', a)
      .eq('participant_b', b)
      .single();

    if (existing) return existing;

    // Create new
    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ participant_a: a, participant_b: b })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created;
  }

  /**
   * Fetch all conversations for the current user,
   * with the other participant's profile info joined in.
   */
  async function loadConversations() {
    if (!currentUser) return [];

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        last_message,
        last_message_at,
        participant_a,
        participant_b,
        created_at
      `)
      .or(`participant_a.eq.${currentUser.id},participant_b.eq.${currentUser.id}`)
      .order('last_message_at', { ascending: false });

    if (error) { console.error('loadConversations error:', error); return []; }

    // Enrich each conversation with the other participant's profile
    const enriched = await Promise.all(
      (data || []).map(async (conv) => {
        const otherId = conv.participant_a === currentUser.id
          ? conv.participant_b
          : conv.participant_a;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, display_name, avatar_url')
          .eq('id', otherId)
          .single();

        return { ...conv, other: profile || { id: otherId, email: 'Unknown', display_name: 'Unknown' } };
      })
    );

    conversationsCache = enriched;
    return enriched;
  }

  /* ── Message helpers ──────────────────────────────── */

  /**
   * Load all messages for a conversation, oldest first
   */
  async function loadMessages(conversationId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) { console.error('loadMessages error:', error); return []; }
    return data || [];
  }

  /**
   * Send a text message (and optional media URL)
   */
  async function sendMessage({ conversationId, content, mediaUrl, mediaType }) {
    if (!currentUser) return null;

    const payload = {
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content: content || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Update conversation's last_message preview
    const preview = mediaType
      ? (mediaType === 'image' ? '📷 Image' : '🎬 Video')
      : (content?.slice(0, 80) || '');

    await supabase
      .from('conversations')
      .update({ last_message: preview, last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
  }

  /* ── Media upload ─────────────────────────────────── */

  /**
   * Upload a media file to Supabase Storage.
   * Returns the public URL of the uploaded file.
   */
  async function uploadMedia(file) {
    if (!currentUser) throw new Error('Not authenticated');
    if (file.size > MAX_FILE_SIZE_BYTES)
      throw new Error(`File too large. Max ${MAX_FILE_SIZE_MB} MB.`);

    const ext      = file.name.split('.').pop();
    const filePath = `${currentUser.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Determine media type string from MIME type
   */
  function getMediaType(file) {
    if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'image';
    if (ACCEPTED_VIDEO_TYPES.includes(file.type)) return 'video';
    return null;
  }

  /* ── Realtime subscription ────────────────────────── */

  /**
   * Subscribe to new messages in a conversation via Supabase Realtime.
   * Calls onMessage(msg) whenever a new row is inserted.
   */
  function subscribeToMessages(conversationId, onMessage) {
    // Unsubscribe from previous channel if any
    unsubscribe();

    realtimeChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          onMessage(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to conversation ${conversationId}`);
        }
      });
  }

  /** Unsubscribe from current realtime channel */
  function unsubscribe() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }

  /* ── Setters ──────────────────────────────────────── */

  function setCurrentUser(user) { currentUser = user; }
  function setActiveConversation(conv) { activeConversation = conv; }
  function getActiveConversation() { return activeConversation; }

  return {
    getProfileByEmail,
    getMyProfile,
    getOrCreateConversation,
    loadConversations,
    loadMessages,
    sendMessage,
    uploadMedia,
    getMediaType,
    subscribeToMessages,
    unsubscribe,
    setCurrentUser,
    setActiveConversation,
    getActiveConversation
  };
})();
