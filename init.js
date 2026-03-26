// ── Boot ──────────────────────────────────────────────────
// Cards show IMMEDIATELY for everyone — no login required to see content.
// Name is only needed for comments and online presence.

// Step 1: show 20 placeholder cards right now, before anything loads
(function showPlaceholders(){
    const grid=document.getElementById('cardsGrid');
    if(!grid)return;
    for(let i=0;i<20;i++) buildCard({name:'Card '+(i+1)},0,i);
})();

// Step 2: hide sign-in if name already saved, otherwise keep it open
(function restoreSession(){
    // Always show the sign-in screen — never auto-login
    // Just pre-populate the saved accounts so they can tap their name
    renderSignIn();
})();

// Step 3: load real data from Firebase once ready (replaces placeholders)
waitForFirebase(async ()=>{
    const allowed = await checkDeviceAccess();
    if(!allowed) return; // blocked or needs verification
    if(currentUser) registerOnlineUser();
    loadContent();
    loadCommentsCount();
    listenAnnouncements();
    checkBirthdays();
});

// ══════════════════════════════════════════════════════════
//  MULTI-ACCOUNT LOGIN
// ══════════════════════════════════════════════════════════
// (MAX_ACCOUNTS and AVATAR_COLORS declared at top)

function getSavedAccounts(){
    try{ return JSON.parse(localStorage.getItem('familyAccounts')||'[]'); }
    catch(e){ return []; }
}
function saveAccounts(arr){
    try{ localStorage.setItem('familyAccounts', JSON.stringify(arr.slice(0,MAX_ACCOUNTS))); }catch(e){}
}

function renderSignIn(){
    const accounts = getSavedAccounts();
    const list = document.getElementById('savedAccountsList');
    const divider = document.getElementById('signinDivider');
    const newWrap = document.getElementById('newNameWrap');
    const sub = document.getElementById('signinSub');
    list.innerHTML = '';

    const toggleBtn = document.getElementById('showNewNameBtn');

    if(accounts.length > 0){
        sub.textContent = "Who's using the app?";
        accounts.forEach((acc, i) => {
            const initials = acc.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
            const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const btn = document.createElement('button');
            btn.className = 'saved-btn';
            const isRememberedHost = localStorage.getItem('hostAccount') === acc.name;
            btn.innerHTML = `<div class="saved-avatar" style="background:${color}">${initials}</div>
                <span class="saved-name">${esc(acc.name)}</span>
                ${isRememberedHost ? '<span style="font-size:10px;font-weight:700;color:var(--danger);background:rgba(229,57,53,.1);border:1px solid var(--danger);border-radius:10px;padding:2px 7px;">HOST</span>' : ''}
                <button class="saved-remove" data-idx="${i}" title="Remove from this device">✕</button>`;
            btn.addEventListener('click', e => {
                if(e.target.closest('.saved-remove')) return;
                doSignIn(acc.name);
            });
            btn.querySelector('.saved-remove').addEventListener('click', e => {
                e.stopPropagation();
                const arr = getSavedAccounts();
                arr.splice(parseInt(e.target.dataset.idx), 1);
                saveAccounts(arr);
                renderSignIn();
            });
            list.appendChild(btn);
        });
        // Show toggle button, hide name input by default
        if(accounts.length < MAX_ACCOUNTS){
            toggleBtn.style.display = 'block';
            newWrap.style.display = 'none';
            document.getElementById('nameInput').value = '';
        } else {
            // Max reached — no toggle, no input
            toggleBtn.style.display = 'none';
            newWrap.style.display = 'none';
        }
    } else {
        sub.textContent = 'Enter your name to join';
        toggleBtn.style.display = 'none';
        newWrap.style.display = 'block';
    }
}

function toggleNewName(){
    const wrap = document.getElementById('newNameWrap');
    const btn = document.getElementById('showNewNameBtn');
    const isHidden = wrap.style.display === 'none';
    wrap.style.display = isHidden ? 'block' : 'none';
    btn.textContent = isHidden ? '✕ Cancel' : '+ Use a different name';
    if(isHidden) setTimeout(()=>document.getElementById('nameInput').focus(), 50);
}

function signIn(){
    const name = document.getElementById('nameInput').value.trim();
    if(!name){ toast('Please enter your name!','warn'); return; }
    doSignIn(name);
}

function doSignIn(name){
    // Save to accounts list if not already there
    const accounts = getSavedAccounts();
    if(!accounts.find(a => a.name === name)){
        accounts.unshift({name, addedAt: Date.now()});
        saveAccounts(accounts);
    }
    try{ localStorage.setItem('userName', name); }catch(e){}
    currentUser = name;
    document.getElementById('signinOverlay').classList.add('hidden');
    // Auto-restore host if this device/name was a remembered host
    const rememberedHost = localStorage.getItem('hostAccount');
    if(rememberedHost === name){
        isHost = true;
        document.getElementById('adminBadge').classList.add('active');
        document.body.classList.add('host-mode');
        loadCards && setTimeout(()=>loadCards(currentSection), 800);
        toast('Welcome back, Host ' + name + '! 👑');
        setTimeout(listenAccessRequests, 1000); // watch for new requests
    } else {
        toast('Welcome, ' + name + '! 👋');
    }
    waitForFirebase(()=>{ registerOnlineUser(); loadContent(); });
    checkBirthdays();
}

// ══════════════════════════════════════════════════════════
//  FEATURE TAB SWITCHER
// ══════════════════════════════════════════════════════════
function switchFeatureTab(panel, btn){
    document.querySelectorAll('.feature-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.feature-panel').forEach(p => p.classList.remove('active'));
    if(btn) btn.classList.add('active');
    const el = document.getElementById('panel-'+panel);
    if(el) el.classList.add('active');
    // Show section nav only on Home, hide on other tabs
    const topNav = document.getElementById('topNav');
    if(topNav) topNav.style.display = panel === 'cards' ? '' : 'none';
    if(panel === 'calendar') renderCalendar();
    if(panel === 'recipes') renderRecipes();
    if(panel === 'poll') renderPolls();
}

// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
//  Expose all functions needed by HTML onclick attributes
// ══════════════════════════════════════════════════════════
window.signIn=signIn;
window.toggleNewName=toggleNewName;
window.switchFeatureTab=switchFeatureTab;
window.calNav=calNav;
window.openAddEvent=openAddEvent;
window.saveEvent=saveEvent;
window.deleteEvent=deleteEvent;
window.openAddRecipe=openAddRecipe;
window.saveRecipe=saveRecipe;
window.openCreatePoll=openCreatePoll;
window.savePoll=savePoll;
window.castVote=castVote;
window.deletePoll=deletePoll;
window.checkHostPin=checkHostPin;
window.clearAllComments=clearAllComments;
window.clearAnnouncement=clearAnnouncement;
window.closeModal=closeModal;
window.closeVideoLightbox=closeVideoLightbox;
window.deleteComment=deleteComment;
window.joinWhatsAppCall=joinWhatsAppCall;
window.kickUser=kickUser;
window.openComments=openComments;
window.openSearch=openSearch;
window.openStreamableLightbox=openStreamableLightbox;
window.openVideoChat=openVideoChat;
window.openVideoLightbox=openVideoLightbox;
window.postComment=postComment;
window.removeHostMemory=removeHostMemory;
window.submitVerify=submitVerify;
window.sendAccessRequest=sendAccessRequest;
window.checkApprovalStatus=checkApprovalStatus;
window.approveDevice=approveDevice;
window.denyDevice=denyDevice;
window.listenAccessRequests=listenAccessRequests;
window.blockDevice=blockDevice;
window.unblockDevice=unblockDevice;
window.saveHubSettings=saveHubSettings;
window.sendAnnouncement=sendAnnouncement;
window.showHostLogin=showHostLogin;
window.switchHostTab=switchHostTab;
window.runSearch=runSearch;
window.openDriveLightbox=openDriveLightbox;
window.closeDriveLightbox=closeDriveLightbox;
window.startReply=startReply;
window.cancelReply=cancelReply;
window.scrollToMsg=scrollToMsg;
window.addChatGroup=addChatGroup;
