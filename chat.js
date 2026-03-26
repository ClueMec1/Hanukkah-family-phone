// ══════════════════════════════════════════════════════════
//  FAMILY HUB — chat.js
//  Features: text messages, voice messages, emoji reactions,
//             reply, delete, group tabs, fixed unread badge
// ══════════════════════════════════════════════════════════

let currentGroup = 'General';
let replyTo = null;
let chatGroups = ['General'];

// Voice recording state
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingSeconds = 0;

// Emoji reaction options
const REACTION_EMOJIS = ['❤️','😂','😮','😢','🙏','👍','🔥','🎉'];

// ── Open / Groups ──────────────────────────────────────────
function openComments(){
    document.getElementById('commentsModal').classList.add('active');
    setLastRead(currentGroup);
    loadChatGroups();
    injectChatStyles();
}

function loadChatGroups(){
    window.dbOnValue(window.dbRef(window.db,'chatGroups'), snap=>{
        if(snap.exists()) chatGroups = snap.val();
        else { chatGroups=['General']; window.dbSet(window.dbRef(window.db,'chatGroups'),chatGroups); }
        renderGroupTabs();
    });
}

function renderGroupTabs(){
    const tabs = document.getElementById('waGroupTabs');
    tabs.innerHTML = '';
    chatGroups.forEach(g => {
        const btn = document.createElement('button');
        btn.className = 'wa-group-tab' + (g===currentGroup?' active':'');
        btn.textContent = g;
        btn.onclick = () => switchChatGroup(g);
        tabs.appendChild(btn);
    });
    if(isHost){
        const add = document.createElement('button');
        add.className = 'wa-add-group';
        add.textContent = '+ Group';
        add.onclick = addChatGroup;
        tabs.appendChild(add);
    }
    document.getElementById('waChatSub').textContent = currentGroup;
    loadMessages(currentGroup);
}

function switchChatGroup(name){
    currentGroup = name;
    setLastRead(name);
    renderGroupTabs();
    cancelReply();
}

function addChatGroup(){
    const name = prompt('New group name (e.g. "Photos", "Plans"):');
    if(!name||!name.trim()) return;
    const trimmed = name.trim();
    if(chatGroups.includes(trimmed)){ toast('Group already exists','warn'); return; }
    chatGroups.push(trimmed);
    window.dbSet(window.dbRef(window.db,'chatGroups'), chatGroups)
        .then(()=>{ switchChatGroup(trimmed); toast('Group "'+trimmed+'" created!'); })
        .catch(()=>toast('Failed','danger'));
}

// ── Messages ───────────────────────────────────────────────
function msgPath(group){ return 'messages/'+group.replace(/\s+/g,'_'); }

function loadMessages(group){
    window.dbOnValue(window.dbRef(window.db, msgPath(group)), snap=>{
        const container = document.getElementById('waMessages');
        container.innerHTML = '';
        if(!snap.exists()){
            container.innerHTML = '<p style="color:#888;text-align:center;padding:22px;font-size:13px;">No messages yet. Say hello!</p>';
        } else {
            Object.entries(snap.val()).forEach(([key,msg])=>container.appendChild(buildBubble(key,msg)));
            container.scrollTop = container.scrollHeight;
        }
        if(document.getElementById('commentsModal').classList.contains('active')){
            setLastRead(group);
        }
    });
}

// ── Build message bubble ───────────────────────────────────
function buildBubble(key, msg){
    const isMine = msg.author === currentUser;
    const msgIsFromHost = msg.isHostMsg === true;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:'+(isMine?'flex-end':'flex-start');

    const bubble = document.createElement('div');
    bubble.className = 'wa-bubble '+(isMine?'mine':'theirs')+(msgIsFromHost?' host-bubble':'');
    if(msgIsFromHost) bubble.style.cssText += ';border-left:3px solid var(--danger);';
    bubble.id = 'msg-'+key;

    let inner = '';

    if(msgIsFromHost) inner += '<div style="font-size:10px;font-weight:800;color:var(--danger);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px;">Message from Host</div>';
    if(!isMine) inner += '<div class="wa-author" style="'+(msgIsFromHost?'color:var(--danger);font-weight:700;':'')+'">'+esc(msg.author)+'</div>';
    if(msg.replyTo) inner += '<div class="wa-reply-preview" onclick="scrollToMsg(\''+esc(msg.replyTo.key)+'\')"><div class="rp-author">'+esc(msg.replyTo.author)+'</div><div>'+esc((msg.replyTo.text||msg.replyTo.audioLabel||'Voice message').slice(0,80))+'</div></div>';

    if(msg.audioUrl){
        inner += '<div class="wa-audio-player"><audio controls preload="metadata" style="width:100%;min-width:180px;max-width:260px;height:36px;" src="'+esc(msg.audioUrl)+'"></audio><div style="font-size:10px;color:rgba(0,0,0,.45);margin-top:2px;">Voice message</div></div>';
    } else {
        inner += '<div class="wa-text" style="'+(msgIsFromHost?'font-weight:700;':'')+'">'+esc(msg.text)+'</div>';
    }

    inner += '<div class="wa-time">'+formatMsgTime(msg.timestamp)+'</div>';

    if(msg.reactions && Object.keys(msg.reactions).length){
        inner += buildReactionsDisplay(key, msg.reactions);
    }

    const canDel = isHost || msg.author === currentUser;
    const safeText = esc((msg.text||'Voice message').slice(0,60).replace(/\\/g,'\\\\').replace(/'/g,"\\'"));

    inner += '<div class="wa-bubble-actions">'
        + '<div class="wa-action-btn" title="Reply" onclick="startReply(\''+esc(key)+'\',\''+esc(msg.author)+'\',\''+safeText+'\')">Reply</div>'
        + '<div class="wa-action-btn react-btn" title="React" onclick="showReactionPicker(\''+esc(key)+'\',this)">React</div>'
        + (canDel?'<div class="wa-action-btn" title="Delete" onclick="deleteComment(\''+esc(key)+'\')">Delete</div>':'')
        + '</div>';

    bubble.innerHTML = inner;
    wrap.appendChild(bubble);
    return wrap;
}

// ── Reactions ──────────────────────────────────────────────
function buildReactionsDisplay(msgKey, reactions){
    let html = '<div class="wa-reactions">';
    Object.entries(reactions).forEach(([emoji, users])=>{
        const count = Object.keys(users).length;
        if(count < 1) return;
        const myUserKey = (currentUser||'').replace(/[.#$[\]/]/g,'_');
        const iReacted = users[myUserKey] === true;
        html += '<span class="wa-reaction'+(iReacted?' mine-reaction':'')+'" onclick="toggleReaction(\''+esc(msgKey)+'\',\''+esc(emoji)+'\')">'+emoji+' '+count+'</span>';
    });
    html += '</div>';
    return html;
}

function showReactionPicker(msgKey, btnEl){
    document.querySelectorAll('.reaction-picker-popup').forEach(p=>p.remove());
    const picker = document.createElement('div');
    picker.className = 'reaction-picker-popup';
    picker.innerHTML = REACTION_EMOJIS.map(em=>
        '<span class="reaction-opt" onclick="toggleReaction(\''+esc(msgKey)+'\',\''+esc(em)+'\');this.closest(\'.reaction-picker-popup\').remove()">'+em+'</span>'
    ).join('');
    const rect = btnEl.getBoundingClientRect();
    picker.style.cssText = 'position:fixed;z-index:99999;background:var(--surface);border:1px solid var(--border);border-radius:30px;padding:6px 10px;display:flex;gap:4px;box-shadow:0 4px 20px rgba(0,0,0,.2);';
    picker.style.top = (rect.top - 54)+'px';
    picker.style.left = Math.max(8, rect.left - 60)+'px';
    document.body.appendChild(picker);
    setTimeout(()=>{
        document.addEventListener('click', function closePicker(e){
            if(!picker.contains(e.target)){ picker.remove(); document.removeEventListener('click',closePicker); }
        });
    }, 50);
}

async function toggleReaction(msgKey, emoji){
    if(!currentUser){ toast('Sign in to react','warn'); return; }
    const userKey = currentUser.replace(/[.#$[\]/]/g,'_');
    const reactionRef = window.dbRef(window.db, msgPath(currentGroup)+'/'+msgKey+'/reactions/'+emoji+'/'+userKey);
    try{
        const snap = await window.dbGet(reactionRef);
        if(snap.exists()){ await window.dbRemove(reactionRef); }
        else { await window.dbSet(reactionRef, true); }
    }catch(e){ toast('Failed','danger'); }
}

// ── Voice recording ────────────────────────────────────────
async function startVoiceRecording(){
    if(isRecording){ stopVoiceRecording(); return; }
    try{
        const stream = await navigator.mediaDevices.getUserMedia({audio:true});
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e=>{ if(e.data.size>0) audioChunks.push(e.data); };
        mediaRecorder.onstop = handleRecordingStop;
        mediaRecorder.start();
        isRecording = true;
        recordingSeconds = 0;

        const btn = document.getElementById('voiceBtn');
        btn.style.background = 'var(--danger)';
        btn.textContent = 'Stop';

        const timer = document.getElementById('voiceTimer');
        timer.style.display = 'inline';
        recordingTimer = setInterval(()=>{
            recordingSeconds++;
            const m = Math.floor(recordingSeconds/60).toString().padStart(2,'0');
            const s = (recordingSeconds%60).toString().padStart(2,'0');
            timer.textContent = m+':'+s;
            if(recordingSeconds >= 120) stopVoiceRecording();
        }, 1000);
    }catch(err){
        toast('Microphone not available','danger');
    }
}

function stopVoiceRecording(){
    if(!mediaRecorder||!isRecording) return;
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t=>t.stop());
    isRecording = false;
    clearInterval(recordingTimer);
    const btn = document.getElementById('voiceBtn');
    btn.style.background = 'var(--accent2)';
    btn.textContent = 'Voice';
    document.getElementById('voiceTimer').style.display = 'none';
}

async function handleRecordingStop(){
    if(!audioChunks.length) return;
    const blob = new Blob(audioChunks, {type:'audio/webm'});
    toast('Sending voice message...','warn');
    try{
        let audioUrl = '';
        if(CLOUDINARY_CLOUD_NAME && CLOUDINARY_CLOUD_NAME !== 'YOUR_CLOUD_NAME'){
            const fd = new FormData();
            fd.append('file', blob, 'voice_'+Date.now()+'.webm');
            fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const res = await fetch('https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD_NAME+'/auto/upload', {method:'POST',body:fd});
            const data = await res.json();
            audioUrl = data.secure_url;
        } else if(window.storage){
            const path = 'voice/'+Date.now()+'.webm';
            const ref = window.storageRef(window.storage, path);
            const task = window.uploadBytesResumable(ref, blob);
            await new Promise((res,rej)=>task.on('state_changed',null,rej,res));
            audioUrl = await window.getDownloadURL(ref);
        } else {
            toast('Set up Cloudinary in Host Settings to send voice messages','warn');
            return;
        }
        const data = {author:currentUser, audioUrl, audioLabel:'Voice message', text:'', timestamp:Date.now(), isHostMsg:isHost===true};
        if(replyTo) data.replyTo = replyTo;
        await window.dbSet(window.dbPush(window.dbRef(window.db, msgPath(currentGroup))), data);
        cancelReply();
        toast('Voice message sent!');
    }catch(e){
        toast('Failed to send voice: '+e.message,'danger');
    }
}

// ── Send text ──────────────────────────────────────────────
async function postComment(){
    const input = document.getElementById('newComment');
    const text = input.value.trim();
    if(!text){ toast('Write something first!','warn'); return; }
    if(!currentUser){ toast('Please sign in first!','warn'); return; }
    const data = {author:currentUser, text, timestamp:Date.now(), isHostMsg:isHost===true};
    if(replyTo) data.replyTo = replyTo;
    try{
        await window.dbSet(window.dbPush(window.dbRef(window.db, msgPath(currentGroup))), data);
        input.value = ''; input.style.height = 'auto';
        cancelReply();
    }catch(e){ toast('Failed: '+e.message,'danger'); }
}

// ── Reply ──────────────────────────────────────────────────
function startReply(key, author, text){
    replyTo = {key, author, text};
    document.getElementById('waReplyAuthor').textContent = author;
    document.getElementById('waReplyText').textContent = text;
    document.getElementById('waReplyBar').classList.add('active');
    document.getElementById('newComment').focus();
}
function cancelReply(){
    replyTo = null;
    document.getElementById('waReplyBar').classList.remove('active');
}
function scrollToMsg(key){
    const el = document.getElementById('msg-'+key);
    if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.style.outline='2px solid var(--accent)'; setTimeout(()=>el.style.outline='',1200); }
}

// ── Delete ─────────────────────────────────────────────────
async function deleteComment(key){
    try{ await window.dbRemove(window.dbRef(window.db, msgPath(currentGroup)+'/'+key)); toast('Message deleted','warn'); }
    catch(e){ toast('Failed','danger'); }
}
async function clearAllComments(){
    if(!confirm('Delete ALL messages in ALL groups?')) return;
    try{ await window.dbRemove(window.dbRef(window.db,'messages')); toast('All messages cleared','warn'); }
    catch(e){ toast('Failed','danger'); }
}

// ── Unread badge (FIXED) ───────────────────────────────────
// Only counts messages from OTHER people that arrived after
// the last time you opened each group. Your own messages
// never count as unread.
function getLastRead(group){
    try{ return parseInt(localStorage.getItem('lastRead_'+group)||'0'); }catch(e){ return 0; }
}
function setLastRead(group){
    try{ localStorage.setItem('lastRead_'+group, Date.now()); }catch(e){}
}

function loadCommentsCount(){
    window.dbOnValue(window.dbRef(window.db,'messages'), snap=>{
        if(!snap.exists()){ updateUnreadBadge(0); return; }
        let totalUnread = 0;
        const allGroups = snap.val();
        Object.keys(allGroups).forEach(groupKey => {
            const msgs = allGroups[groupKey];
            if(!msgs) return;
            const groupName = groupKey.replace(/_/g,' ');
            const modalOpen = document.getElementById('commentsModal').classList.contains('active');
            if(groupName === currentGroup && modalOpen){
                setLastRead(groupName);
                return; // currently viewing — 0 unread
            }
            const lastRead = getLastRead(groupName);
            Object.values(msgs).forEach(msg => {
                if(msg.author === currentUser) return; // own messages = not unread
                if(msg.timestamp && msg.timestamp > lastRead) totalUnread++;
            });
        });
        updateUnreadBadge(totalUnread);
    });
}

function updateUnreadBadge(n){
    const badge = document.getElementById('commentCount');
    if(n <= 0){ badge.style.display='none'; badge.textContent='0'; }
    else{ badge.style.display='flex'; badge.textContent=n>99?'99+':String(n); }
}

// ── Helpers ────────────────────────────────────────────────
function formatMsgTime(ts){
    const d = new Date(ts), now = new Date();
    if(d.toDateString()===now.toDateString()) return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    return d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}

// ── Inject chat UI additions (voice btn, reaction styles) ──
function injectChatStyles(){
    if(document.getElementById('chat-extra-styles')) return;
    const style = document.createElement('style');
    style.id = 'chat-extra-styles';
    style.textContent = `
        #voiceBtn{padding:0 12px;height:44px;background:var(--accent2);border:none;border-radius:22px;color:#fff;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;flex-shrink:0;transition:all .2s;}
        #voiceBtn:hover{filter:brightness(1.1);}
        #voiceTimer{font-size:12px;font-weight:700;color:var(--danger);min-width:34px;display:none;align-self:center;}
        .wa-reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
        .wa-reaction{background:rgba(0,0,0,.07);border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:2px 7px;font-size:13px;cursor:pointer;transition:all .15s;user-select:none;}
        .wa-reaction:hover{background:rgba(0,0,0,.15);}
        .wa-reaction.mine-reaction{background:rgba(92,107,192,.2);border-color:var(--accent);}
        .reaction-opt{font-size:22px;cursor:pointer;transition:transform .15s;padding:2px;}
        .reaction-opt:hover{transform:scale(1.3);}
        .wa-action-btn{font-size:11px;padding:2px 6px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all .15s;white-space:nowrap;}
        .wa-action-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent);}
        .wa-audio-player{padding:2px 0;}
    `;
    document.head.appendChild(style);

    // Inject voice button + timer into the input area
    const inputArea = document.querySelector('.wa-input-area');
    if(inputArea && !document.getElementById('voiceBtn')){
        const timer = document.createElement('span');
        timer.id = 'voiceTimer';
        timer.textContent = '0:00';

        const btn = document.createElement('button');
        btn.id = 'voiceBtn';
        btn.title = 'Hold to record a voice message';
        btn.textContent = 'Voice';
        btn.onclick = startVoiceRecording;

        const sendBtn = inputArea.querySelector('.wa-send-btn');
        inputArea.insertBefore(timer, sendBtn);
        inputArea.insertBefore(btn, sendBtn);
    }
}

// ── Expose to window ───────────────────────────────────────
window.toggleReaction = toggleReaction;
window.showReactionPicker = showReactionPicker;
window.startVoiceRecording = startVoiceRecording;
