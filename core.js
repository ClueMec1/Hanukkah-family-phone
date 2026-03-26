// ═══════════════════════════════════════════════════════════
//  FAMILY HUB — clean rewrite, no legacy patches
// ═══════════════════════════════════════════════════════════
// Functions are assigned to window at the bottom of this script

// ── State ─────────────────────────────────────────────────
let currentUser = null;
let isHost      = false;
let currentSection = 0;
let userRef     = null;
let allCards    = {};
let defaultCardCount = 20;
let emojiPickerOpen  = null;
let meetLink    = '';

// ── Multi-account & wheel constants (declared early so boot functions can use them) ──
const MAX_ACCOUNTS  = 5;
const AVATAR_COLORS = ['#7c6af7','#4fd1c5','#f87171','#fbbf24','#34d399','#f472b6','#60a5fa'];
const WHEEL_COLORS  = ['#7c6af7','#4fd1c5','#f87171','#fbbf24','#34d399','#f472b6','#60a5fa','#fb923c'];
let wheelNames      = [];
let wheelSpinning   = false;
let wheelAngle      = 0;

const PRIVATE_ROOM = 'FamilyHub-8x4k2m9q7w3j5p1r6n0y';

// ── Cloudinary config ─────────────────────────────────────
// Replace these with your own values from cloudinary.com → Settings → API Keys
let CLOUDINARY_CLOUD_NAME = 'YOUR_CLOUD_NAME';   // e.g. 'myfamilyhub'
let CLOUDINARY_UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET'; // e.g. 'family_hub_uploads'
const EMOJIS = ['📁','📂','🏠','❤️','⭐','🎵','🎬','📸','🎮','📖','🍕','🌟',
                '🔥','💡','🎯','🎁','🌈','🦁','🐻','🌺','⚽','🎸','🧩','🍎',
                '🌙','☀️','🎉','💎','🔖','📌'];

// ── Helpers ───────────────────────────────────────────────
function esc(s){
    const d=document.createElement('div');
    d.appendChild(document.createTextNode(String(s??'')));
    return d.innerHTML;
}

// Detect mobile/tablet — iframes are blocked on iOS Safari & many Android browsers
function isMobile(){
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function toast(msg,type='success'){
    const area=document.getElementById('toastArea');
    const t=document.createElement('div');
    t.className='toast '+type;
    const col=type==='success'?'var(--success)':type==='danger'?'var(--danger)':'var(--warn)';
    const sym=type==='success'?'✓':type==='danger'?'✕':'!';
    t.innerHTML=`<span style="color:${col};font-size:16px;">${sym}</span> ${esc(msg)}`;
    area.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .35s';
        setTimeout(()=>t.remove(),400);},3200);
}

function closeModal(id){document.getElementById(id).classList.remove('active');}

function closeAllPickers(){
    document.querySelectorAll('.emoji-picker').forEach(p=>p.remove());
    emojiPickerOpen=null;
}

// ── Firebase wait — poll every 30ms until globals exist ───
function waitForFirebase(cb){
    if(typeof window.dbRef==='function') cb();
    else setTimeout(()=>waitForFirebase(cb),30);
}


// ── Global DOM Events ──────────────────────────────────────
// (These run after DOM is ready — safe because scripts load at end of body)

// Drive lightbox button delegation
document.addEventListener('DOMContentLoaded', function(){
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

    // Close popup when clicking outside card
    document.addEventListener('click',e=>{
        if(document.getElementById('cardEditorOverlay'))return;
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
});
