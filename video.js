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

