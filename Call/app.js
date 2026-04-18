import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://sryiaybsgyavmepvwvkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyeWlheWJzZ3lhdm1lcHZ3dmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTU4ODMsImV4cCI6MjA5MjA3MTg4M30.MSbw_f31A-mD0BfRgV43UDihKVniscIk2BkBJgtgucE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const normalizeUsername = (value = '') => value.trim().toLowerCase().replace(/\s+/g, '');
const makeEmailFromUsername = (username) => `${normalizeUsername(username)}@voicecall.local`;
const timeLabel = (value) => new Date(value).toLocaleString();

const els = {
  sessionChip: $('sessionChip'),
  heroCopy: $('heroCopy'),
  statusLine: $('statusLine'),
  authCard: $('authCard'),
  authTitle: $('authTitle'),
  authSubtitle: $('authSubtitle'),
  authModePill: $('authModePill'),
  username: $('username'),
  password: $('password'),
  submitAuth: $('submitAuth'),
  toggleAuth: $('toggleAuth'),
  appCard: $('appCard'),
  searchUsername: $('searchUsername'),
  searchBtn: $('searchBtn'),
  clearSearchBtn: $('clearSearchBtn'),
  searchResultBox: $('searchResultBox'),
  resultUsername: $('resultUsername'),
  resultMeta: $('resultMeta'),
  callBtn: $('callBtn'),
  logoutBtn: $('logoutBtn'),
  incomingCard: $('incomingCard'),
  incomingText: $('incomingText'),
  acceptBtn: $('acceptBtn'),
  rejectBtn: $('rejectBtn'),
  callCard: $('callCard'),
  callTitle: $('callTitle'),
  callSubtitle: $('callSubtitle'),
  callStatePill: $('callStatePill'),
  localVideo: $('localVideo'),
  remoteVideo: $('remoteVideo'),
  micBtn: $('micBtn'),
  endCallBtn: $('endCallBtn'),
  usersCard: $('usersCard'),
  usersList: $('usersList'),
  refreshUsersBtn: $('refreshUsersBtn'),
  callsCard: $('callsCard'),
  callsList: $('callsList'),
};

let authMode = 'login';
let currentSession = null;
let currentProfile = null;
let currentSearchUser = null;
let incomingCall = null;
let activeCall = null;
let micEnabled = true;
let localStream = null;
let peer = null;
let callChannel = null;
let incomingChannel = null;
let realtimeChannel = null;
let activeCallId = null;
let currentPeerUsername = '';

function setStatus(message) {
  els.statusLine.textContent = message || '';
}

function setSessionLabel() {
  els.sessionChip.textContent = currentProfile ? `@${currentProfile.username}` : 'Guest';
}

function showAuthUI() {
  els.authCard.classList.remove('hidden');
  els.appCard.classList.add('hidden');
  els.incomingCard.classList.add('hidden');
  els.callCard.classList.add('hidden');
  els.usersCard.classList.add('hidden');
  els.callsCard.classList.add('hidden');
  els.heroCopy.textContent = 'Sign up with a username and password, then search users and place a live voice call.';
}

function showAppUI() {
  els.authCard.classList.add('hidden');
  els.appCard.classList.remove('hidden');
  els.usersCard.classList.remove('hidden');
  els.callsCard.classList.remove('hidden');
  if (activeCall || incomingCall) {
    els.callCard.classList.remove('hidden');
  }
}

function updateAuthModeUI() {
  if (authMode === 'signup') {
    els.authTitle.textContent = 'Create account';
    els.authSubtitle.textContent = 'Pick a username and password.';
    els.authModePill.textContent = 'New';
    els.submitAuth.textContent = 'Sign up';
    els.toggleAuth.textContent = 'I already have one';
    els.password.autocomplete = 'new-password';
  } else {
    els.authTitle.textContent = 'Sign in';
    els.authSubtitle.textContent = 'Enter your username and password.';
    els.authModePill.textContent = 'Secure';
    els.submitAuth.textContent = 'Sign in';
    els.toggleAuth.textContent = 'Create account';
    els.password.autocomplete = 'current-password';
  }
}

function setBusy(isBusy) {
  els.submitAuth.disabled = isBusy;
  els.searchBtn.disabled = isBusy;
  els.callBtn.disabled = isBusy;
  els.acceptBtn.disabled = isBusy;
  els.rejectBtn.disabled = isBusy;
  els.endCallBtn.disabled = isBusy;
  els.refreshUsersBtn.disabled = isBusy;
}

function makeCallPill(status) {
  const nice = {
    ringing: 'Ringing',
    accepted: 'Live',
    ended: 'Ended',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    missed: 'Missed',
  };
  return nice[status] || status || 'Idle';
}

async function getLocalMedia() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  localStream = stream;
  els.localVideo.srcObject = stream;
  await els.localVideo.play().catch(() => {});
  return stream;
}

function createPeer() {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
    ],
  });

  pc.onicecandidate = async (event) => {
    if (event.candidate && callChannel) {
      await callChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          kind: 'ice',
          candidate: event.candidate,
          callId: activeCallId,
        },
      });
    }
  };

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (stream) {
      els.remoteVideo.srcObject = stream;
      els.remoteVideo.play().catch(() => {});
    }
  };

  pc.onconnectionstatechange = () => {
    els.callStatePill.textContent = pc.connectionState;
    els.callSubtitle.textContent = `Connection: ${pc.connectionState}`;
    if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
      setStatus('Call ended');
    }
  };

  peer = pc;
  return pc;
}

async function cleanupCallUI() {
  try {
    if (realtimeChannel) await supabase.removeChannel(realtimeChannel);
  } catch {}
  realtimeChannel = null;

  try {
    if (callChannel) await supabase.removeChannel(callChannel);
  } catch {}
  callChannel = null;

  try {
    if (incomingChannel) await supabase.removeChannel(incomingChannel);
  } catch {}
  incomingChannel = null;

  try {
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }
  } catch {}
  peer = null;

  try {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
  } catch {}
  localStream = null;

  els.localVideo.srcObject = null;
  els.remoteVideo.srcObject = null;
  activeCall = null;
  activeCallId = null;
  currentPeerUsername = '';
  micEnabled = true;
}

async function loadProfile(user) {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  currentProfile = data;
  setSessionLabel();
  return data;
}

async function upsertMyProfile(user, username) {
  const payload = {
    user_id: user.id,
    username: normalizeUsername(username || user.user_metadata?.username || ''),
  };

  if (!payload.username) throw new Error('Username is required');

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });
  if (error) throw error;
  currentProfile = payload;
  setSessionLabel();
}

async function refreshUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username, created_at')
    .order('username', { ascending: true })
    .limit(50);

  if (error) throw error;

  els.usersList.innerHTML = '';
  if (!data || !data.length) {
    els.usersList.innerHTML = `<div class="list-item"><div><p class="list-item-title">No users found</p><p class="list-item-subtitle">Create one to begin.</p></div></div>`;
    return;
  }

  data.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <div>
        <p class="list-item-title">@${user.username}</p>
        <p class="list-item-subtitle">Joined ${timeLabel(user.created_at)}</p>
      </div>
      <button class="small-btn">Call</button>
    `;
    row.querySelector('button').addEventListener('click', async () => {
      els.searchUsername.value = user.username;
      await searchUser();
    });
    els.usersList.appendChild(row);
  });
}

async function refreshRecentCalls() {
  if (!currentSession?.user?.id) return;

  const uid = currentSession.user.id;
  const { data, error } = await supabase
    .from('calls')
    .select('id, caller_id, callee_id, status, created_at, answered_at, ended_at')
    .or(`caller_id.eq.${uid},callee_id.eq.${uid}`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  els.callsList.innerHTML = '';
  if (!data || !data.length) {
    els.callsList.innerHTML = `<div class="list-item"><div><p class="list-item-title">No recent calls</p><p class="list-item-subtitle">Your call history will appear here.</p></div></div>`;
    return;
  }

  data.forEach((call) => {
    const label = makeCallPill(call.status);
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <div>
        <p class="list-item-title">${call.id.slice(0, 8)}</p>
        <p class="list-item-subtitle">${label} • ${timeLabel(call.created_at)}</p>
      </div>
      <span class="pill">${label}</span>
    `;
    els.callsList.appendChild(row);
  });
}

async function searchUser() {
  const username = normalizeUsername(els.searchUsername.value);
  if (!username) {
    setStatus('Enter a username to search');
    return;
  }
  if (username === currentProfile?.username) {
    setStatus('You cannot call yourself');
    return;
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
  if (error) throw error;

  if (!data) {
    currentSearchUser = null;
    els.searchResultBox.classList.add('hidden');
    setStatus('No user found');
    return;
  }

  currentSearchUser = data;
  els.resultUsername.textContent = `@${data.username}`;
  els.resultMeta.textContent = 'Ready to call';
  els.searchResultBox.classList.remove('hidden');
  setStatus(`Found ${data.username}`);
}

async function subscribeToIncomingCalls() {
  if (!currentSession?.user?.id) return;

  if (incomingChannel) {
    try { await supabase.removeChannel(incomingChannel); } catch {}
  }

  incomingChannel = supabase
    .channel(`incoming-${currentSession.user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `callee_id=eq.${currentSession.user.id}`,
      },
      async (payload) => {
        incomingCall = payload.new;
        els.incomingCard.classList.remove('hidden');
        els.callCard.classList.remove('hidden');
        els.callTitle.textContent = 'Incoming call';
        els.callSubtitle.textContent = 'Someone is trying to reach you.';
        els.callStatePill.textContent = 'Ringing';

        const { data: caller } = await supabase.from('profiles').select('*').eq('user_id', incomingCall.caller_id).maybeSingle();
        els.incomingText.textContent = `Incoming call from @${caller?.username || 'unknown'}`;
        setStatus(`Incoming call from ${caller?.username || 'unknown'}`);
      }
    )
    .subscribe();
}

async function subscribeToMyCallUpdates() {
  if (!currentSession?.user?.id) return;

  if (realtimeChannel) {
    try { await supabase.removeChannel(realtimeChannel); } catch {}
  }

  realtimeChannel = supabase
    .channel(`call-updates-${currentSession.user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls',
        filter: `caller_id=eq.${currentSession.user.id}`,
      },
      () => refreshRecentCalls().catch(() => {})
    )
    .subscribe();
}

async function attachCallChannel(callId, isCaller) {
  callChannel = supabase.channel(`call-${callId}`);

  callChannel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
    if (!peer || payload?.callId !== callId) return;

    try {
      if (payload.kind === 'offer' && !isCaller) {
        await peer.setRemoteDescription(payload.offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await callChannel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { kind: 'answer', answer, callId },
        });
      }

      if (payload.kind === 'answer' && isCaller) {
        await peer.setRemoteDescription(payload.answer);
      }

      if (payload.kind === 'ice' && payload.candidate) {
        try {
          await peer.addIceCandidate(payload.candidate);
        } catch {}
      }
    } catch (error) {
      console.error(error);
    }
  });

  await callChannel.subscribe();
}

async function startCall(targetProfile) {
  if (!currentSession?.user?.id || !currentProfile) throw new Error('Sign in first');
  if (!targetProfile?.user_id) throw new Error('No target selected');
  if (targetProfile.user_id === currentSession.user.id) throw new Error('You cannot call yourself');

  await cleanupCallUI();
  const stream = await getLocalMedia();
  const pc = createPeer();
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  const { data: callRow, error } = await supabase
    .from('calls')
    .insert({
      caller_id: currentSession.user.id,
      callee_id: targetProfile.user_id,
      status: 'ringing',
    })
    .select('*')
    .single();

  if (error) throw error;

  activeCallId = callRow.id;
  currentPeerUsername = targetProfile.username;
  activeCall = { ...callRow, isCaller: true };
  els.callCard.classList.remove('hidden');
  els.incomingCard.classList.add('hidden');
  els.callTitle.textContent = `Calling @${targetProfile.username}`;
  els.callSubtitle.textContent = 'Waiting for answer';
  els.callStatePill.textContent = 'Dialing';
  setStatus(`Calling @${targetProfile.username}`);

  await attachCallChannel(callRow.id, true);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await callChannel.send({
    type: 'broadcast',
    event: 'signal',
    payload: { kind: 'offer', offer, callId: callRow.id },
  });

  await refreshRecentCalls();
}

async function acceptCall() {
  if (!incomingCall) return;

  await cleanupCallUI();
  const stream = await getLocalMedia();
  const pc = createPeer();
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  const { data: callerProfile } = await supabase.from('profiles').select('*').eq('user_id', incomingCall.caller_id).maybeSingle();

  activeCallId = incomingCall.id;
  currentPeerUsername = callerProfile?.username || 'caller';
  activeCall = { ...incomingCall, isCaller: false };
  els.callCard.classList.remove('hidden');
  els.callTitle.textContent = `Live call with @${currentPeerUsername}`;
  els.callSubtitle.textContent = 'Connecting';
  els.callStatePill.textContent = 'Connecting';
  setStatus(`Accepted call from @${currentPeerUsername}`);

  await attachCallChannel(incomingCall.id, false);

  await supabase.from('calls').update({ status: 'accepted', answered_at: new Date().toISOString() }).eq('id', incomingCall.id);

  incomingCall = null;
  els.incomingCard.classList.add('hidden');
  await refreshRecentCalls();
}

async function rejectCall() {
  if (!incomingCall) return;
  await supabase.from('calls').update({ status: 'rejected', ended_at: new Date().toISOString() }).eq('id', incomingCall.id);
  incomingCall = null;
  els.incomingCard.classList.add('hidden');
  setStatus('Call rejected');
  await refreshRecentCalls();
}

async function endCall() {
  if (activeCallId) {
    await supabase.from('calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', activeCallId);
  }
  await cleanupCallUI();
  els.callCard.classList.add('hidden');
  setStatus('Call ended');
  await refreshRecentCalls();
}

function toggleMic() {
  if (!localStream) return;
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach((track) => {
    track.enabled = micEnabled;
  });
  els.micBtn.textContent = micEnabled ? 'Mute mic' : 'Unmute mic';
}

async function authSubmit() {
  const username = normalizeUsername(els.username.value);
  const password = els.password.value;

  if (!username || !password) {
    setStatus('Username and password are required');
    return;
  }

  setBusy(true);
  try {
    if (authMode === 'signup') {
      const email = makeEmailFromUsername(username);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed');
      await upsertMyProfile(data.user, username);
      setStatus('Account created');
    } else {
      const email = makeEmailFromUsername(username);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error('Login failed');
      setStatus('Signed in');
    }

    els.username.value = '';
    els.password.value = '';
  } catch (error) {
    setStatus(error.message || 'Authentication failed');
  } finally {
    setBusy(false);
  }
}

async function bootstrap() {
  updateAuthModeUI();
  showAuthUI();

  const { data } = await supabase.auth.getSession();
  currentSession = data.session;

  if (currentSession?.user) {
    currentProfile = await loadProfile(currentSession.user);
    showAppUI();
    await subscribeToIncomingCalls();
    await subscribeToMyCallUpdates();
    await refreshUsers();
    await refreshRecentCalls();
  } else {
    setSessionLabel();
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentSession = session;
    if (session?.user) {
      await loadProfile(session.user);
      showAppUI();
      await subscribeToIncomingCalls();
      await subscribeToMyCallUpdates();
      await refreshUsers();
      await refreshRecentCalls();
    } else {
      currentProfile = null;
      currentSearchUser = null;
      incomingCall = null;
      await cleanupCallUI();
      showAuthUI();
      setSessionLabel();
    }
  });
}

els.toggleAuth.addEventListener('click', () => {
  authMode = authMode === 'login' ? 'signup' : 'login';
  updateAuthModeUI();
});

els.submitAuth.addEventListener('click', authSubmit);
els.searchBtn.addEventListener('click', async () => {
  setBusy(true);
  try {
    await searchUser();
  } catch (error) {
    setStatus(error.message || 'Search failed');
  } finally {
    setBusy(false);
  }
});

els.clearSearchBtn.addEventListener('click', () => {
  els.searchUsername.value = '';
  currentSearchUser = null;
  els.searchResultBox.classList.add('hidden');
  setStatus('Search cleared');
});

els.callBtn.addEventListener('click', async () => {
  setBusy(true);
  try {
    await startCall(currentSearchUser);
  } catch (error) {
    setStatus(error.message || 'Could not place call');
  } finally {
    setBusy(false);
  }
});

els.logoutBtn.addEventListener('click', async () => {
  setBusy(true);
  try {
    await cleanupCallUI();
    await supabase.auth.signOut();
    setStatus('Signed out');
  } finally {
    setBusy(false);
  }
});

els.acceptBtn.addEventListener('click', async () => {
  setBusy(true);
  try {
    await acceptCall();
  } catch (error) {
    setStatus(error.message || 'Could not accept');
  } finally {
    setBusy(false);
  }
});

els.rejectBtn.addEventListener('click', async () => {
  setBusy(true);
  try {
    await rejectCall();
  } catch (error) {
    setStatus(error.message || 'Could not reject');
  } finally {
    setBusy(false);
  }
});

els.endCallBtn.addEventListener('click', async () => {
  setBusy(true);
  try {
    await endCall();
  } catch (error) {
    setStatus(error.message || 'Could not end call');
  } finally {
    setBusy(false);
  }
});

els.micBtn.addEventListener('click', toggleMic);
els.refreshUsersBtn.addEventListener('click', async () => {
  setBusy(true);
  try {
    await refreshUsers();
    setStatus('Users refreshed');
  } catch (error) {
    setStatus(error.message || 'Could not refresh users');
  } finally {
    setBusy(false);
  }
});

els.searchUsername.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    els.searchBtn.click();
  }
});

bootstrap().catch((error) => {
  console.error(error);
  setStatus(error.message || 'App failed to start');
});
