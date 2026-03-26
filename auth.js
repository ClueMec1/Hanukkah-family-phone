// ── Sign In ───────────────────────────────────────────────
function signIn(){
    const name=document.getElementById('nameInput').value.trim();
    if(!name){toast('Please enter your name!','warn');return;}
    currentUser=name;
    try{localStorage.setItem('userName',name);}catch(e){}
    document.getElementById('signinOverlay').classList.add('hidden');
    // Cards already visible — just register presence and reload with real data
    waitForFirebase(()=>{registerOnlineUser();loadContent();});
    toast('Welcome, '+name+'! 👋');
}

// ── Presence ──────────────────────────────────────────────
async function registerOnlineUser(){
    if(!currentUser)return;
    const key=currentUser.replace(/[.#$[\]]/g,'_');
    userRef=window.dbRef(window.db,'onlineUsers/'+key);
    try{await window.dbSet(userRef,{name:currentUser,timestamp:Date.now(),deviceId:getDeviceId()});}catch(e){}
}
window.addEventListener('beforeunload',()=>{
    if(userRef)navigator.sendBeacon(userRef.toString()+'.json',JSON.stringify(null));
});

// ── Load everything after login ───────────────────────────
async function loadContent(){
    // Show cards immediately (placeholders) — don't make user stare at empty grid
    loadCards(currentSection);

    // Then load Firebase data in parallel
    try{
        const n=await window.dbGet(window.dbRef(window.db,'appName'));
        if(n.exists())document.getElementById('appName').textContent=n.val();
        const dc=await window.dbGet(window.dbRef(window.db,'defaultCardCount'));
        if(dc.exists())defaultCardCount=Number(dc.val())||20;
        const ml=await window.dbGet(window.dbRef(window.db,'meetLink'));
        if(ml.exists())meetLink=ml.val()||'';
        const cn=await window.dbGet(window.dbRef(window.db,'cloudinaryName'));
        if(cn.exists()&&cn.val())CLOUDINARY_CLOUD_NAME=cn.val();
        const cp=await window.dbGet(window.dbRef(window.db,'cloudinaryPreset'));
        if(cp.exists()&&cp.val())CLOUDINARY_UPLOAD_PRESET=cp.val();
    }catch(e){}
    loadSections();
    loadCards(currentSection); // reload now that we have real defaultCardCount
    loadCommentsCount();
    listenAnnouncements();
    prefetchAllCards();
}

// ── Sections ──────────────────────────────────────────────
async function loadSections(){
    try{
        const snap=await window.dbGet(window.dbRef(window.db,'sections'));
        if(!snap.exists())return;
        const raw=snap.val();
        const list=Array.isArray(raw)?raw:Object.values(raw);
        document.querySelectorAll('.nav-button').forEach((btn,i)=>{
            if(!list[i])return;
            const s=list[i];
            btn.querySelector('.nav-button-text').textContent=s.name||('Section '+(i+1));
            const em=btn.querySelector('.nav-button-emoji');
            if(s.icon){
                if(s.iconType==='image'){
                    em.innerHTML='<img src="'+esc(s.icon)+'" style="width:22px;height:22px;object-fit:cover;border-radius:4px;">';
                    em.style.fontSize='0';
                }else{
                    em.textContent=s.icon;
                    em.style.fontSize='17px';
                }
            }
        });
        const a=list[currentSection];
        if(a)document.getElementById('sectionTitle').textContent=a.name||('Section '+(currentSection+1));
    }catch(e){console.error('loadSections:',e);}
}

function switchSection(idx){
    currentSection=idx;
    document.querySelectorAll('.nav-button').forEach((b,i)=>b.classList.toggle('active',i===idx));
    const btn=document.querySelector('.nav-button[data-section="'+idx+'"]');
    if(btn)document.getElementById('sectionTitle').textContent=
        btn.querySelector('.nav-button-text').textContent;
    loadCards(idx);
    closeAllPickers();
    popupClose();
}

