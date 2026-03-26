// ── Announcements ─────────────────────────────────────────
function listenAnnouncements(){
    window.dbOnValue(window.dbRef(window.db,'announcement'),snap=>{
        const b=document.getElementById('announcementBanner');
        if(snap.exists()){document.getElementById('announcementText').textContent=snap.val().text;b.classList.add('active');}
        else b.classList.remove('active');
    });
}

// ── Host login ────────────────────────────────────────────
function showHostLogin(){
    if(isHost){openSettings();return;}
    document.getElementById('hostModal').classList.add('active');
    document.getElementById('hostPin').value='';
}

async function checkHostPin(){
    const pin=document.getElementById('hostPin').value;
    if(pin==='2011'){
        isHost=true;
        document.getElementById('adminBadge').classList.add('active');
        document.body.classList.add('host-mode');
        // Remember this device+name as host
        if(currentUser) localStorage.setItem('hostAccount', currentUser);
        closeModal('hostModal');
        openSettings();
        toast('Host mode on! Your device will remember this next time.');
        loadCards(currentSection);
        listenAccessRequests(); // start watching for new requests
    }else{
        toast('Incorrect PIN','danger');
        document.getElementById('hostPin').value='';
    }
}

function removeHostMemory(){
    localStorage.removeItem('hostAccount');
    isHost=false;
    document.getElementById('adminBadge').classList.remove('active');
    document.body.classList.remove('host-mode');
    toast('Host mode removed from this device','warn');
    loadCards(currentSection);
    renderSignIn();
}

// ── Host settings ─────────────────────────────────────────
function openSettings(){
    document.getElementById('settingsModal').classList.add('active');
    loadOnlineUsers();
    loadBlockedDevices();
    // Load access requests if host
    if(isHost){
        window.dbGet(window.dbRef(window.db,'accessRequests')).then(snap=>{
            renderAccessRequests(snap.exists()?snap.val():{});
        }).catch(()=>{});
    }
    document.getElementById('hubNameInput').value=document.getElementById('appName').textContent;
    document.getElementById('meetLinkInput').value=meetLink||'';
    document.getElementById('cloudNameInput').value=CLOUDINARY_CLOUD_NAME!=='YOUR_CLOUD_NAME'?CLOUDINARY_CLOUD_NAME:'';
    document.getElementById('uploadPresetInput').value=CLOUDINARY_UPLOAD_PRESET!=='YOUR_UPLOAD_PRESET'?CLOUDINARY_UPLOAD_PRESET:'';
}
function switchHostTab(name,btn){
    document.querySelectorAll('.host-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.host-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+name).classList.add('active');
}
function loadOnlineUsers(){
    window.dbOnValue(window.dbRef(window.db,'onlineUsers'),snap=>{
        const panel=document.getElementById('onlineUsersList');
        panel.innerHTML='';
        if(snap.exists()){
            Object.keys(snap.val()).forEach(key=>{
                const u=snap.val()[key];
                const el=document.createElement('div');
                el.className='user-item';
                el.innerHTML='<span class="user-name">'+esc(u.name)+'</span>'
                    +'<div class="user-actions">'
                    +(isHost&&u.name!==currentUser
                        ?'<button class="kick-btn" data-key="'+esc(key)+'" data-name="'+esc(u.name)+'" onclick="kickUser(this.dataset.key,this.dataset.name)">Kick</button>'
                        +' <button class="kick-btn" style="border-color:var(--danger);color:var(--danger);" data-devid="'+esc(u.deviceId||'')+'" data-name="'+esc(u.name)+'" onclick="blockDevice(this.dataset.devid,this.dataset.name)">Block</button>'
                        :'')
                    +'<span class="online-dot"></span></div>';
                panel.appendChild(el);
            });
        }else{
            panel.innerHTML='<p style="color:var(--muted);text-align:center;padding:14px;">No users online</p>';
        }
    });
}
async function kickUser(key,name){
    if(!confirm('Remove '+name+'?'))return;
    try{await window.dbRemove(window.dbRef(window.db,'onlineUsers/'+key));toast(name+' removed','warn');}
    catch(e){toast('Failed','danger');}
}
async function sendAnnouncement(){
    const msg=document.getElementById('announcementInput').value.trim();
    if(!msg){toast('Type a message first','warn');return;}
    try{await window.dbSet(window.dbRef(window.db,'announcement'),{text:msg,timestamp:Date.now()});toast('Sent!');}
    catch(e){toast('Failed','danger');}
}
async function clearAnnouncement(){
    try{await window.dbRemove(window.dbRef(window.db,'announcement'));toast('Banner cleared','warn');}
    catch(e){toast('Failed','danger');}
}
async function saveHubSettings(){
    const name=document.getElementById('hubNameInput').value.trim();
    const count=parseInt(document.getElementById('defaultCardsInput').value)||20;
    const link=document.getElementById('meetLinkInput').value.trim();
    const cloudName=document.getElementById('cloudNameInput').value.trim();
    const uploadPreset=document.getElementById('uploadPresetInput').value.trim();
    try{
        if(name)await window.dbSet(window.dbRef(window.db,'appName'),name);
        await window.dbSet(window.dbRef(window.db,'defaultCardCount'),count);
        await window.dbSet(window.dbRef(window.db,'meetLink'),link);
        if(cloudName)await window.dbSet(window.dbRef(window.db,'cloudinaryName'),cloudName);
        if(uploadPreset)await window.dbSet(window.dbRef(window.db,'cloudinaryPreset'),uploadPreset);
        document.getElementById('appName').textContent=name||'Family Hub';
        defaultCardCount=count;
        meetLink=link;
        if(cloudName)CLOUDINARY_CLOUD_NAME=cloudName;
        if(uploadPreset)CLOUDINARY_UPLOAD_PRESET=uploadPreset;
        toast('Saved! ✓');
    }catch(e){toast('Failed','danger');}
}

// ── Comments ──────────────────────────────────────────────
// ── WhatsApp-style Chat ───────────────────────────────────
let currentGroup = 'General';
let replyTo = null;
let chatGroups = ['General'];

function openComments(){
    document.getElementById('commentsModal').classList.add('active');
    setLastRead(currentGroup);  // mark current group as read
    loadChatGroups();
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
        add.textContent = '＋ Group';
        add.onclick = addChatGroup;
        tabs.appendChild(add);
    }
    document.getElementById('waChatSub').textContent = currentGroup;
    loadMessages(currentGroup);
}

function switchChatGroup(name){
    currentGroup = name;
    setLastRead(name);  // mark newly opened group as read
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
        .then(()=>{ switchChatGroup(trimmed); toast('Group "'+trimmed+'" created! 🎉'); })
        .catch(()=>toast('Failed','danger'));
}

function msgPath(group){ return 'messages/'+group.replace(/\s+/g,'_'); }

function loadMessages(group){
    window.dbOnValue(window.dbRef(window.db, msgPath(group)), snap=>{
        const container = document.getElementById('waMessages');
        container.innerHTML = '';
        if(!snap.exists()){
            container.innerHTML = '<p style="color:#888;text-align:center;padding:22px;font-size:13px;">No messages yet. Say hello! 👋</p>';
        } else {
            Object.entries(snap.val()).forEach(([key,msg])=>container.appendChild(buildBubble(key,msg)));
            container.scrollTop = container.scrollHeight;
        }
        updateCommentBadge();
    });
}

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
    if(msgIsFromHost) inner += '<div style="font-size:10px;font-weight:800;color:var(--danger);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px;">📢 Message from Host</div>';
    if(!isMine) inner += '<div class="wa-author" style="'+(msgIsFromHost?'color:var(--danger);font-weight:700;':'')+'">'+esc(msg.author)+'</div>';
    if(msg.replyTo) inner += '<div class="wa-reply-preview" onclick="scrollToMsg(\''+esc(msg.replyTo.key)+'\')"><div class="rp-author">'+esc(msg.replyTo.author)+'</div><div>'+esc((msg.replyTo.text||'').slice(0,80))+'</div></div>';
    inner += '<div class="wa-text" style="'+(msgIsFromHost?'font-weight:700;':'')+'">'+esc(msg.text)+'</div>';
    inner += '<div class="wa-time">'+formatMsgTime(msg.timestamp)+'</div>';
    const canDel = isHost || msg.author === currentUser;
    inner += '<div class="wa-bubble-actions">'
        +'<div class="wa-action-btn" title="Reply" onclick="startReply(\''+esc(key)+'\',\''+esc(msg.author)+'\',\''+esc((msg.text||'').slice(0,60).replace(/\\/g,'\\\\').replace(/'/g,"\\'"))+'\')">↩</div>'
        +(canDel?'<div class="wa-action-btn" title="Delete" onclick="deleteComment(\''+esc(key)+'\')">🗑</div>':'')
        +'</div>';
    bubble.innerHTML = inner;
    wrap.appendChild(bubble);
    return wrap;
}

function formatMsgTime(ts){
    const d = new Date(ts), now = new Date();
    if(d.toDateString()===now.toDateString()) return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    return d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}

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

function updateCommentBadge(){
    window.dbGet(window.dbRef(window.db, msgPath(currentGroup))).then(snap=>{
        const n = snap.exists() ? Object.keys(snap.val()).length : 0;
        document.getElementById('commentCount').textContent = n>99?'99+':n;
    }).catch(()=>{});
}

async function deleteComment(key){
    try{ await window.dbRemove(window.dbRef(window.db, msgPath(currentGroup)+'/'+key)); toast('Message deleted','warn'); }
    catch(e){ toast('Failed','danger'); }
}

// Track last-read timestamp per group per user in localStorage
function getLastRead(group){
    try{ return parseInt(localStorage.getItem('lastRead_'+group)||'0'); }catch(e){ return 0; }
}
function setLastRead(group){
    try{ localStorage.setItem('lastRead_'+group, Date.now()); }catch(e){}
}

function loadCommentsCount(){
    // Listen to ALL message groups and count unread across all of them
    window.dbOnValue(window.dbRef(window.db,'messages'), snap=>{
        if(!snap.exists()){ updateUnreadBadge(0); return; }
        let totalUnread = 0;
        const allGroups = snap.val();
        Object.keys(allGroups).forEach(groupKey => {
            const msgs = allGroups[groupKey];
            if(!msgs) return;
            const groupName = groupKey.replace(/_/g,' ');
            const lastRead = getLastRead(groupName);
            Object.values(msgs).forEach(msg => {
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

async function postComment(){
    const input = document.getElementById('newComment');
    const text = input.value.trim();
    if(!text){ toast('Write something first!','warn'); return; }
    if(!currentUser){ toast('Please sign in first!','warn'); return; }
    const data = {author:currentUser, text, timestamp:Date.now(), isHostMsg: isHost===true};
    if(replyTo) data.replyTo = replyTo;
    try{
        await window.dbSet(window.dbPush(window.dbRef(window.db, msgPath(currentGroup))), data);
        input.value = ''; input.style.height = 'auto';
        cancelReply();
    }catch(e){ toast('Failed: '+e.message,'danger'); }
}

async function clearAllComments(){
    if(!confirm('Delete ALL messages in ALL groups?')) return;
    try{ await window.dbRemove(window.dbRef(window.db,'messages')); toast('All messages cleared','warn'); }
    catch(e){ toast('Failed','danger'); }
}

// ── Search ────────────────────────────────────────────────
function openSearch(){
    document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchInput').value='';
    document.getElementById('searchResults').innerHTML='<div class="search-empty">Type to search…</div>';
    setTimeout(()=>document.getElementById('searchInput').focus(),80);
}
function runSearch(query){
    const q=query.trim().toLowerCase();
    const res=document.getElementById('searchResults');
    if(!q){res.innerHTML='<div class="search-empty">Type to search…</div>';return;}
    const matches=[];
    for(let s=0;s<5;s++){
        const cards=allCards[s]||{};
        const sName=document.querySelector('.nav-button[data-section="'+s+'"] .nav-button-text')?.textContent||'Section '+(s+1);
        Object.keys(cards).forEach(id=>{
            const c=cards[id];
            if((c.name||'').toLowerCase().includes(q)||(c.desc||'').toLowerCase().includes(q))
                matches.push({card:c,sectionIndex:s,sectionName:sName});
        });
    }
    if(!matches.length){res.innerHTML='<div class="search-empty">No results for "'+esc(q)+'"</div>';return;}
    res.innerHTML='';
    matches.forEach(m=>{
        const el=document.createElement('div');
        el.className='search-result-item';
        el.innerHTML='<span class="search-result-icon"><svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span>'
            +'<div><div class="search-result-name">'+esc(m.card.name||'Untitled')+'</div>'
            +'<div class="search-result-section">📁 '+esc(m.sectionName)+'</div></div>';
        el.onclick=()=>{closeModal('searchModal');switchSection(m.sectionIndex);};
        res.appendChild(el);
    });
}

// ── Google Drive Lightbox (mobile) ───────────────────────
function openDriveLightbox(embedUrl){
    const lb = document.getElementById('driveLightbox');
    document.getElementById('driveFrame').src = embedUrl;
    lb.style.display = 'flex';
}
function closeDriveLightbox(){
    const lb = document.getElementById('driveLightbox');
    document.getElementById('driveFrame').src = '';
    lb.style.display = 'none';
}

// ── YouTube Lightbox ─────────────────────────────────────
function openStreamableLightbox(stId){
    const lb=document.getElementById('ytLightbox');
    const fr=document.getElementById('ytFrame');
    fr.src='https://streamable.com/e/'+stId+'?autoplay=1';
    lb.style.display='flex';
}
function openVideoLightbox(ytId){
    const lb=document.getElementById('ytLightbox');
    const fr=document.getElementById('ytFrame');
    fr.src='https://www.youtube-nocookie.com/embed/'+ytId+'?autoplay=1&rel=0&origin='+encodeURIComponent(window.location.origin);
    lb.style.display='flex';
}
function closeVideoLightbox(){
    const lb=document.getElementById('ytLightbox');
    const fr=document.getElementById('ytFrame');
    fr.src=''; // stop video
    lb.style.display='none';
}

// ── Video Chat ─────────────────────────────────────────────
function openVideoChat(){ document.getElementById('videoChatModal').classList.add('active'); }

function joinWhatsAppCall(){
    if(!meetLink){ toast('No call link yet! Host: go to ⚙️ Settings → Hub Settings to add a WhatsApp call link.','warn'); return; }
    window.open(meetLink,'_blank','noopener');
    closeModal('videoChatModal');
    toast('Opening WhatsApp call! 📱');
}

// ── Global events ─────────────────────────────────────────
// Handle image load errors for link-type cards
// Drive lightbox button delegation (avoids inline onclick quote issues)
document.getElementById('cardsGrid').addEventListener('click',e=>{
    const btn = e.target.closest('.drive-lightbox-btn');
    if(btn){ e.stopPropagation(); openDriveLightbox(btn.dataset.driveurl); }
});

document.getElementById('cardsGrid').addEventListener('error',e=>{
    if(e.target.classList.contains('link-img-try')){
        e.target.style.display='none';
        const fb=e.target.closest('.link-img-wrap')?.querySelector('.link-fallback');
        if(fb)fb.style.display='flex';
    }
},true);

// Close popup when clicking outside any card
// But NOT when clicking the hidden file input (which triggers file picker dialog)
document.addEventListener('click',e=>{
    if(document.getElementById('cardEditorOverlay'))return; // editor is open — ignore
    if(e.target.id==='globalFileInput'||e.target.id==='sectionImageInput')return;
    if(!e.target.closest('.card'))popupClose();
    if(!e.target.closest('.nav-button'))closeAllPickers();
});

// Keyboard shortcuts
document.getElementById('nameInput').addEventListener('keydown',e=>{if(e.key==='Enter')signIn();});
document.getElementById('hostPin').addEventListener('keydown',e=>{if(e.key==='Enter')checkHostPin();});
document.getElementById('newComment').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();postComment();}});
document.getElementById('searchInput').addEventListener('keydown',e=>{if(e.key==='Escape')closeModal('searchModal');});

// Close modals on backdrop click
document.querySelectorAll('.modal').forEach(m=>{
    m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);});
});

// ── Device Verification ──────────────────────────────────
const FAMILY_SECRET = '1027';  // answer to birthday question
const DEVICE_KEY = 'familyVerified_v1';

function getDeviceId(){
    let id = localStorage.getItem('deviceId');
    if(!id){
        id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('deviceId', id);
    }
    return id;
}

async function checkDeviceAccess(){
    const deviceId = getDeviceId();

    // 1. Check if blocked
    try{
        const snap = await window.dbGet(window.dbRef(window.db,'blockedDevices/'+deviceId));
        if(snap.exists()){
            document.getElementById('verifyOverlay').classList.add('hidden');
            document.getElementById('blockedOverlay').style.display = 'flex';
            return false;
        }
    }catch(e){}

    // 2. Check if already approved by host
    try{
        const snap = await window.dbGet(window.dbRef(window.db,'approvedDevices/'+deviceId));
        if(snap.exists()){
            localStorage.setItem(DEVICE_KEY, 'yes');
            document.getElementById('verifyOverlay').classList.add('hidden');
            return true;
        }
    }catch(e){}

    // 3. Check if already locally verified (approved before)
    if(localStorage.getItem(DEVICE_KEY) === 'yes'){
        document.getElementById('verifyOverlay').classList.add('hidden');
        return true;
    }

    // 4. Check if request already pending — skip to waiting screen
    const pendingName = localStorage.getItem('pendingName');
    const pendingPhone = localStorage.getItem('pendingPhone');
    if(pendingName && pendingPhone){
        showWaitingScreen(pendingName, pendingPhone);
        document.getElementById('verifyOverlay').style.display = 'flex';
        // Start polling for approval
        startApprovalPolling();
        return false;
    }

    // 5. First time — show secret question
    document.getElementById('verifyOverlay').style.display = 'flex';
    return false;
}

function submitVerify(){
    const val = document.getElementById('verifyInput').value.trim();
    // Accept the family secret OR the host master code 2011
    if(val === FAMILY_SECRET || val === '2011'){
        // Correct — move to step 2: request form
        document.getElementById('verifyStep1').style.display = 'none';
        document.getElementById('verifyStep2').style.display = 'block';
        document.getElementById('verifyError').style.display = 'none';
        setTimeout(()=>document.getElementById('requestName').focus(), 100);
    } else {
        document.getElementById('verifyError').style.display = 'block';
        document.getElementById('verifyInput').value = '';
        document.getElementById('verifyInput').focus();
    }
}

async function sendAccessRequest(){
    const name = document.getElementById('requestName').value.trim();
    const phone = document.getElementById('requestPhone').value.trim();
    if(!name || !phone){
        document.getElementById('requestError').style.display = 'block';
        return;
    }
    document.getElementById('requestError').style.display = 'none';

    // ── Secret host bypass ────────────────────────────────
    // If name=host, phone=7183841999, and the verify code was 2011,
    // skip the approval flow and go straight into host mode.
    if(name.toLowerCase() === 'host' && phone === '7183841999'){
        const deviceId = getDeviceId();
        localStorage.setItem(DEVICE_KEY, 'yes');
        localStorage.setItem('hostAccount', 'Host');
        localStorage.removeItem('pendingName');
        localStorage.removeItem('pendingPhone');
        // Mark device as approved in Firebase so future logins work too
        try{ await window.dbSet(window.dbRef(window.db,'approvedDevices/'+deviceId),{name:'Host',approvedAt:Date.now()}); }catch(e){}
        document.getElementById('verifyOverlay').classList.add('hidden');
        currentUser = 'Host';
        isHost = true;
        document.getElementById('adminBadge').classList.add('active');
        document.body.classList.add('host-mode');
        toast('🔑 Host mode activated! Welcome back.');
        waitForFirebase(()=>{ registerOnlineUser(); loadContent(); loadCommentsCount(); listenAnnouncements(); checkBirthdays(); listenAccessRequests(); });
        renderSignIn();
        return;
    }
    // ── End host bypass ───────────────────────────────────
    const deviceId = getDeviceId();
    const requestData = {
        name, phone, deviceId,
        requestedAt: Date.now(),
        status: 'pending'
    };
    try{
        // Save request to Firebase
        await window.dbSet(window.dbRef(window.db,'accessRequests/'+deviceId), requestData);
        // Save locally so we know request is pending
        localStorage.setItem('pendingName', name);
        localStorage.setItem('pendingPhone', phone);
        // Show waiting screen
        showWaitingScreen(name, phone);
        // Start polling for approval
        startApprovalPolling();
    }catch(e){ toast('Failed to send request: '+e.message,'danger'); }
}

function showWaitingScreen(name, phone){
    document.getElementById('verifyStep1').style.display = 'none';
    document.getElementById('verifyStep2').style.display = 'none';
    document.getElementById('verifyStep3').style.display = 'block';
    document.getElementById('waitingName').textContent = name;
    document.getElementById('waitingPhone').textContent = phone;
}

let approvalPollInterval = null;
function startApprovalPolling(){
    // Check every 10 seconds if host approved
    approvalPollInterval = setInterval(checkApprovalStatus, 10000);
}

async function checkApprovalStatus(){
    const deviceId = getDeviceId();
    try{
        // Check if approved
        const approvedSnap = await window.dbGet(window.dbRef(window.db,'approvedDevices/'+deviceId));
        if(approvedSnap.exists()){
            clearInterval(approvalPollInterval);
            localStorage.setItem(DEVICE_KEY, 'yes');
            localStorage.removeItem('pendingName');
            localStorage.removeItem('pendingPhone');
            document.getElementById('verifyOverlay').classList.add('hidden');
            toast('Access approved! Welcome to Family Hub 🎉');
            renderSignIn();
            waitForFirebase(()=>{ loadContent(); loadCommentsCount(); listenAnnouncements(); checkBirthdays(); });
            return;
        }
        // Check if denied/blocked
        const blockedSnap = await window.dbGet(window.dbRef(window.db,'blockedDevices/'+deviceId));
        if(blockedSnap.exists()){
            clearInterval(approvalPollInterval);
            document.getElementById('verifyOverlay').classList.add('hidden');
            document.getElementById('blockedOverlay').style.display = 'flex';
            return;
        }
        toast('Still waiting for host approval…','warn');
    }catch(e){}
}

// ── Access Request Management (Host) ─────────────────────
let requestsListener = null;

function listenAccessRequests(){
    if(!isHost) return;
    window.dbOnValue(window.dbRef(window.db,'accessRequests'), snap=>{
        const pending = [];
        if(snap.exists()){
            Object.values(snap.val()).forEach(r=>{ if(r.status==='pending') pending.push(r); });
        }
        // Update notification badge on settings icon
        updateRequestBadge(pending.length);
        // If settings panel is open, refresh the list
        if(document.getElementById('settingsModal').classList.contains('active')){
            renderAccessRequests(snap.exists() ? snap.val() : {});
        }
    });
}

function updateRequestBadge(count){
    let badge = document.getElementById('requestNotifBadge');
    if(!badge){
        // Add badge to the settings icon in header
        const settingsIcon = document.querySelector('.header-icon[onclick*="showHostLogin"]') ||
                             document.querySelector('.header-icon[title*="Host"]') ||
                             document.querySelector('.header-icon[title*="Settings"]');
        if(settingsIcon){
            settingsIcon.style.position = 'relative';
            badge = document.createElement('span');
            badge.id = 'requestNotifBadge';
            badge.className = 'request-badge';
            settingsIcon.appendChild(badge);
        }
    }
    if(badge){
        badge.style.display = count > 0 ? 'flex' : 'none';
        badge.textContent = count > 9 ? '9+' : String(count);
    }
}

function renderAccessRequests(allRequests){
    const panel = document.getElementById('accessRequestsList');
    if(!panel) return;
    panel.innerHTML = '';
    const entries = Object.entries(allRequests||{});
    const pending = entries.filter(([,r])=>r.status==='pending');
    const decided = entries.filter(([,r])=>r.status!=='pending');

    if(!pending.length && !decided.length){
        panel.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:10px;text-align:center;">No access requests yet</p>';
        return;
    }

    if(pending.length){
        const hdr = document.createElement('p');
        hdr.style.cssText = 'font-size:11px;font-weight:700;color:var(--danger);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;';
        hdr.textContent = '⏳ Pending (' + pending.length + ')';
        panel.appendChild(hdr);
        pending.forEach(([devId, r])=>{
            const el = document.createElement('div');
            el.style.cssText = 'background:var(--surface2);border:1.5px solid rgba(229,57,53,.3);border-radius:10px;padding:12px 14px;margin-bottom:8px;';
            const date = new Date(r.requestedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
            el.innerHTML = '<div style="font-weight:700;font-size:13px;color:var(--text);">'+esc(r.name)+'</div>'
                +'<div style="font-size:12px;color:var(--muted);margin:2px 0 8px;">📱 '+esc(r.phone)+' &nbsp;·&nbsp; '+date+'</div>'
                +'<div style="font-size:10px;color:var(--muted);margin-bottom:10px;font-family:monospace;">Device: '+esc(devId.slice(0,16))+'…</div>'
                +'<div style="display:flex;gap:8px;">'
                +'<button class="approve-btn" data-devid="'+esc(devId)+'" data-name="'+esc(r.name)+'" style="flex:1;padding:8px;background:var(--success);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">✓ Approve</button>'
                +'<button class="deny-btn" data-devid="'+esc(devId)+'" data-name="'+esc(r.name)+'" style="flex:1;padding:8px;background:transparent;color:var(--danger);border:1.5px solid var(--danger);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">✕ Deny</button>'
                +'</div>';
            panel.appendChild(el);
        });
    }

    if(decided.length){
        const hdr = document.createElement('p');
        hdr.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px;';
        hdr.textContent = 'Previous decisions';
        panel.appendChild(hdr);
        decided.slice(-5).forEach(([devId, r])=>{
            const el = document.createElement('div');
            el.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface2);border-radius:8px;margin-bottom:5px;font-size:12px;';
            el.innerHTML = (r.status==='approved'?'<span style="color:var(--success);">✓</span>':'<span style="color:var(--danger);">✕</span>')
                +'<span style="flex:1;color:var(--text);font-weight:600;">'+esc(r.name)+'</span>'
                +'<span style="color:var(--muted);">'+esc(r.phone)+'</span>';
            panel.appendChild(el);
        });
    }
}

async function approveDevice(deviceId, name){
    try{
        await window.dbSet(window.dbRef(window.db,'approvedDevices/'+deviceId), {name, approvedAt:Date.now()});
        await window.dbSet(window.dbRef(window.db,'accessRequests/'+deviceId+'/status'), 'approved');
        toast(name + ' approved! ✓');
    }catch(e){ toast('Failed: '+e.message,'danger'); }
}

async function denyDevice(deviceId, name){
    try{
        await window.dbSet(window.dbRef(window.db,'accessRequests/'+deviceId+'/status'), 'denied');
        toast(name + ' denied','warn');
    }catch(e){ toast('Failed: '+e.message,'danger'); }
}

// Delegation for approve/deny buttons
document.addEventListener('click', e=>{
    const approveBtn = e.target.closest('.approve-btn');
    const denyBtn = e.target.closest('.deny-btn');
    if(approveBtn) approveDevice(approveBtn.dataset.devid, approveBtn.dataset.name);
    if(denyBtn) denyDevice(denyBtn.dataset.devid, denyBtn.dataset.name);
});

async function blockDevice(deviceId, name){
    if(!confirm('Block device of ' + name + '? They will never be able to access the app again on that device.')) return;
    try{
        await window.dbSet(window.dbRef(window.db,'blockedDevices/'+deviceId), {blockedAt:Date.now(), name});
        await window.dbRemove(window.dbRef(window.db,'onlineUsers/'+deviceId.replace(/[.#$[\]]/g,'_')));
        toast(name + ' device blocked! 🚫', 'warn');
        loadOnlineUsers();
    }catch(e){ toast('Failed: '+e.message,'danger'); }
}

async function unblockDevice(deviceId){
    try{
        await window.dbRemove(window.dbRef(window.db,'blockedDevices/'+deviceId));
        toast('Device unblocked ✓');
        loadBlockedDevices();
    }catch(e){ toast('Failed','danger'); }
}

// Event delegation for unblock buttons
document.addEventListener('click', e=>{
    const btn = e.target.closest('.unblock-btn');
    if(btn && btn.dataset.devid) unblockDevice(btn.dataset.devid);
});

async function loadBlockedDevices(){
    const panel = document.getElementById('blockedDevicesList');
    if(!panel) return;
    try{
        const snap = await window.dbGet(window.dbRef(window.db,'blockedDevices'));
        panel.innerHTML = '';
        if(!snap.exists()){
            panel.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:10px;">No blocked devices</p>';
            return;
        }
        Object.entries(snap.val()).forEach(([devId, info])=>{
            const el = document.createElement('div');
            el.className = 'user-item';
            el.innerHTML = '<span class="user-name">'+esc(info.name||devId)+'</span>'
                +'<button class="unblock-btn" data-devid="'+esc(devId)+'" style="background:none;border:1px solid var(--success);color:var(--success);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;font-family:inherit;">Unblock</button>';
            panel.appendChild(el);
        });
    }catch(e){}
}

