// ── Cards ─────────────────────────────────────────────────
async function loadCards(sectionIndex){
    const grid=document.getElementById('cardsGrid');
    grid.innerHTML='';
    const count=defaultCardCount||20;

    // Step 1: always build all N placeholder cards immediately
    for(let i=0;i<count;i++) buildCard({name:'Card '+(i+1)},sectionIndex,i);

    // Step 2: fetch real data from Firebase
    try{
        const snap=await window.dbGet(window.dbRef(window.db,'cards/section'+sectionIndex));
        if(snap.exists()){
            const cards=snap.val();
            allCards[sectionIndex]=cards;

            // Step 3: for each saved card, REPLACE that specific placeholder in place.
            // All other placeholder cards stay visible — grid always shows N cards.
            Object.keys(cards).forEach(id=>{
                const cardData=cards[id];
                const cardNum=parseInt(id); // id is 0-based index

                // Find the existing placeholder card at this position
                const existing=grid.querySelector('.card[data-card="'+id+'"]');
                if(existing){
                    // Replace it with the real card (preserves position in grid)
                    const replacement=document.createElement('div');
                    grid.insertBefore(replacement, existing);
                    existing.remove();
                    // Build real card into a temp container, then move it
                    const tmp=document.createElement('div');
                    document.body.appendChild(tmp);
                    const realCard=buildCardEl(cardData,sectionIndex,id);
                    tmp.remove();
                    grid.insertBefore(realCard, replacement);
                    replacement.remove();
                }else{
                    // Card index beyond placeholder count — append it
                    grid.appendChild(buildCardEl(cardData,sectionIndex,id));
                }
            });
        }else{
            allCards[sectionIndex]={};
            // No saved data — all 20 placeholders already showing, nothing to do
        }
    }catch(e){
        console.warn('loadCards: Firebase unavailable, showing placeholders.',e);
    }
}

// buildCardEl returns a card DOM element without appending it
function buildCardEl(cardData,sectionIndex,cardId){
    const tmp=document.createElement('div');
    // Temporarily attach so buildCard can find 'cardsGrid'... 
    // Actually buildCard appends to grid directly, so we use a different approach:
    // We'll swap buildCard to return the element. For now we capture it.
    const grid=document.getElementById('cardsGrid');
    const before=grid.children.length;
    buildCard(cardData,sectionIndex,cardId);
    // buildCard appended to grid — grab and detach the last added card
    const added=grid.lastElementChild;
    added.remove();
    return added;
}

async function prefetchAllCards(){
    for(let s=0;s<5;s++){
        try{
            const snap=await window.dbGet(window.dbRef(window.db,'cards/section'+s));
            if(snap.exists())allCards[s]=snap.val();
        }catch(e){}
    }
}

function buildCard(cardData,sectionIndex,cardId){
    const grid=document.getElementById('cardsGrid');
    if(!grid)return;

    const palettes=[['#7c6af7','#4fd1c5'],['#f87171','#fbbf24'],
                    ['#34d399','#4fd1c5'],['#f472b6','#7c6af7'],['#fbbf24','#f87171']];
    const [c1,c2]=palettes[sectionIndex%palettes.length];
    const emojis=['📄','🎵','📸','📹','⭐','🎯','💡','🔖'];
    const em=emojis[(sectionIndex*3+parseInt(String(cardId).replace(/\D/g,'')||'0'))%emojis.length];

    const card=document.createElement('div');
    card.className='card';
    card.dataset.section=sectionIndex;
    card.dataset.card=cardId;

    // Thumbnail
    let thumb='';
    let body='';
    if(cardData.mediaUrl){
        // On mobile prefer Cloudinary (works everywhere); fall back to Drive
        const url = isMobile()
            ? (cardData.cloudinaryUrl || cardData.mediaUrl || '')
            : (cardData.mediaUrl || cardData.cloudinaryUrl || '');
        if(!url){ }  // no media
        const media=detectMediaType(url);
        if(media.type==='youtube'){
            // YouTube — thumbnail with play button; clicking opens a lightbox player
            const ytId=media.embed.split('/embed/')[1];
            thumb='<img src="https://img.youtube.com/vi/'+ytId+'/hqdefault.jpg" style="width:100%;height:100%;object-fit:cover;">'
                 +'<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;cursor:pointer;" data-ytid="'+ytId+'" onclick="openVideoLightbox(this.dataset.ytid)">'
                 +'<div style="width:56px;height:56px;background:rgba(255,0,0,.9);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.5);">'
                 +'<svg width="22" height="22" fill="white" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>';
            body='';
        }else if(media.type==='streamable'){
            // Streamable — thumbnail with play button, opens lightbox on click
            const stId=media.embed.split('/e/')[1];
            thumb='<img src="https://cdn-cf-east.streamable.com/image/'+stId+'.jpg" style="width:100%;height:100%;object-fit:cover;">'
                 +'<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;cursor:pointer;" data-stid="'+stId+'" onclick="openStreamableLightbox(this.dataset.stid)">'
                 +'<div style="width:56px;height:56px;background:rgba(30,136,229,.9);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.5);">'
                 +'<svg width="22" height="22" fill="white" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>';
            body='';
        }else if(media.type==='gdrive'){
            const driveIcon='<svg width="44" height="44" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:.8;">'
                +'<path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>'
                +'<path d="M43.65 25L29.9 1.2C28.55.4 27 0 25.45 0c-1.55 0-3.1.4-4.45 1.2L6.6 25H43.65z" fill="#00ac47"/>'
                +'<path d="M73.55 25L59.8 1.2C58.45.4 56.9 0 55.35 0H25.45L43.65 25H73.55z" fill="#ea4335"/>'
                +'<path d="M43.65 25L25.45 53H62.35L43.65 25z" fill="#00832d"/>'
                +'<path d="M62.35 53L80.55 25H43.65L62.35 53z" fill="#2684fc"/>'
                +'<path d="M62.35 53H25.45l-11.7 20.8c1.35.8 2.9 1.2 4.45 1.2H68.9c1.55 0 3.1-.4 4.45-1.2L62.35 53z" fill="#ffba00"/>'
                +'</svg>';
            thumb='<div style="position:absolute;inset:0;background:linear-gradient(135deg,'+c1+'33,'+c2+'33);display:flex;align-items:center;justify-content:center;">'+driveIcon+'</div>';
            if(isMobile()){
                // On mobile open Drive in a full-screen in-app overlay
                const driveEmbed = media.embed;
                body='<button data-driveurl="'+esc(driveEmbed)+'" class="drive-lightbox-btn" '
                    +'style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px;padding:13px 16px;width:100%;'
                    +'background:rgba(26,115,232,.12);border:1.5px solid rgba(26,115,232,.5);border-radius:10px;'
                    +'color:#4285f4;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">'
                    +driveIcon.replace('width="44" height="44"','width="22" height="22"')
                    +'&#9654; View in Full Screen</button>';
            }else{
                body='<iframe src="'+media.embed+'" style="width:100%;aspect-ratio:16/9;border:none;border-radius:8px;margin-top:8px;" allowfullscreen></iframe>';
            }
        }else if(media.type==='image'){
            thumb='<img src="'+esc(url)+'" loading="lazy" style="width:100%;height:100%;object-fit:cover;">';
        }else if(media.type==='video'){
            thumb='<video src="'+esc(url)+'" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>';
            // On mobile always show controls inline so tapping works
            body='<video controls playsinline class="card-media" style="max-width:100%;"><source src="'+esc(url)+'"></video>';
        }else if(media.type==='audio'){
            thumb='<div style="position:absolute;inset:0;background:linear-gradient(135deg,'+c1+'33,'+c2+'33);"></div>'
                 +'<div style="position:relative;z-index:1;color:rgba(255,255,255,.3);">'
                 +'<svg width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">'
                 +'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>';
            body='<audio controls class="card-media" style="width:100%;"><source src="'+esc(url)+'"></audio>';
        }else if(media.type==='link'){
            // Try as image, fall back to gradient placeholder
            thumb='<div class="link-img-wrap" style="position:absolute;inset:0;">'
                 +'<img class="link-img-try" src="'+esc(url)+'" style="width:100%;height:100%;object-fit:cover;display:block;">'
                 +'<div class="link-fallback" style="display:none;position:absolute;inset:0;background:linear-gradient(135deg,'+c1+'33,'+c2+'33);align-items:center;justify-content:center;">'
                 +'<svg width="36" height="36" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.5" viewBox="0 0 24 24">'
                 +'<rect x="2" y="2" width="20" height="20" rx="3"/><path d="M2 9h20M9 21V9"/></svg></div></div>';
            body='<a href="'+esc(url)+'" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:6px;margin-top:8px;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--accent);font-size:12px;font-weight:600;text-decoration:none;">🔗 Open</a>';
        }
    }else{
        thumb='<div style="position:absolute;inset:0;background:linear-gradient(135deg,'+c1+'20,'+c2+'18);"></div>'
             +'<div style="position:relative;z-index:1;font-size:26px;opacity:.3;">'+em+'</div>';
    }

    card.innerHTML=(isHost?'<div class="card-host-badge">✎ double-click</div>':'')
        +'<div class="drop-hint">'
        +'<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">'
        +'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
        +'<polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
        +'<span>Drop file here</span></div>'
        +'<div class="card-thumb" style="background:var(--surface2);">'+thumb+'</div>'
        +'<div class="card-body">'
        +'<div class="card-name">'+esc(cardData.name||'Empty Card')+'</div>'
        +(cardData.desc?'<div class="card-meta">'+esc(cardData.desc)+'</div>':'')
        +body
        +'<div class="upload-bar" style="display:none;"><div class="upload-bar-fill"></div></div>'
        +'</div>';

    if(isHost){
        // Double-click → popup
        card.addEventListener('dblclick',e=>{
            e.preventDefault(); e.stopPropagation();
            showCardPopup(card,cardData,sectionIndex,cardId);
        });
        // Drag & drop any file
        card.addEventListener('dragover',e=>{e.preventDefault();card.classList.add('drag-over');});
        card.addEventListener('dragleave',e=>{if(!card.contains(e.relatedTarget))card.classList.remove('drag-over');});
        card.addEventListener('drop',e=>{
            e.preventDefault(); card.classList.remove('drag-over');
            const file=e.dataTransfer.files[0];
            if(file) uploadToCard(file,sectionIndex,cardId,card,cardData);
        });
    }

    grid.appendChild(card);
}

// ── Card popup ────────────────────────────────────────────
// Detects link type: YouTube, Google Drive image, or plain image URL
function detectMediaType(url){
    if(!url)return{type:'none',embed:''};
    // YouTube
    const yt=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if(yt)return{type:'youtube',embed:'https://www.youtube-nocookie.com/embed/'+yt[1]};
    // Streamable
    const st=url.match(/streamable\.com\/([a-zA-Z0-9]+)/);
    if(st)return{type:'streamable',embed:'https://streamable.com/e/'+st[1]};
    // Imgur — many formats, all converted to direct image link
    // e.g. imgur.com/abc123 or imgur.com/abc123.jpg or i.imgur.com/abc123.jpg
    const ig=url.match(/(?:i\.)?imgur\.com\/(?:gallery\/)?([a-zA-Z0-9]+)(?:\.[a-zA-Z]+)?(?:\?.*)?$/i);
    if(ig&&!url.includes('/a/'))return{type:'image',embed:'https://i.imgur.com/'+ig[1]+'.jpg'};
    // Google Drive
    const gd=url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if(gd)return{type:'gdrive',embed:'https://drive.google.com/file/d/'+gd[1]+'/preview'};
    // Google Drive direct share link
    const gd2=url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if(gd2)return{type:'gdrive',embed:'https://drive.google.com/file/d/'+gd2[1]+'/preview'};
    // Image URL
    if(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url))return{type:'image',embed:url};
    // Audio URL
    if(/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url))return{type:'audio',embed:url};
    // Video URL
    if(/\.(mp4|webm|mov)(\?|$)/i.test(url))return{type:'video',embed:url};
    // Default — show as link
    return{type:'link',embed:url};
}

function showCardPopup(card,cardData,sectionIndex,cardId){
    popupClose();

    // cardData now stores both cloudinaryUrl and driveUrl separately
    const cloudinaryUrl = cardData.cloudinaryUrl || '';
    const driveUrl      = cardData.driveUrl || '';
    // legacy: if only mediaUrl exists, detect which type it was
    if(!cloudinaryUrl && !driveUrl && cardData.mediaUrl){
        const m = detectMediaType(cardData.mediaUrl);
        if(m.type==='gdrive') cardData.driveUrl = cardData.mediaUrl;
        else cardData.cloudinaryUrl = cardData.mediaUrl;
    }

    const overlay = document.createElement('div');
    overlay.className = 'card-editor-overlay';
    overlay.id = 'cardEditorOverlay';

    // Show existing Cloudinary preview if set
    const clPreview = cardData.cloudinaryUrl ? (() => {
        const m = detectMediaType(cardData.cloudinaryUrl);
        const thumb = m.type==='image' ? '<img src="'+esc(cardData.cloudinaryUrl)+'" style="width:54px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;">'
            : '<div style="width:54px;height:40px;background:var(--surface2);border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;">'+(m.type==='video'?'🎬':m.type==='audio'?'🎵':'📎')+'</div>';
        return '<div class="ce-preview" id="cl-preview">'+thumb
            +'<div class="ce-preview-info"><div class="ce-preview-type" style="color:var(--accent2);">✅ Cloudinary (works everywhere)</div>'
            +'<div class="ce-preview-url">'+esc(cardData.cloudinaryUrl.length>50?cardData.cloudinaryUrl.slice(0,50)+'…':cardData.cloudinaryUrl)+'</div></div>'
            +'<button class="ce-remove-btn" id="pp-remove-cl">Remove</button></div>';
    })() : '';

    // Show existing Drive preview if set
    const drPreview = cardData.driveUrl ? (() => {
        return '<div class="ce-preview" id="dr-preview">'
            +'<div style="width:54px;height:40px;background:rgba(66,133,244,.15);border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;">📂</div>'
            +'<div class="ce-preview-info"><div class="ce-preview-type" style="color:#4285f4;">Google Drive link</div>'
            +'<div class="ce-preview-url">'+esc(cardData.driveUrl.length>50?cardData.driveUrl.slice(0,50)+'…':cardData.driveUrl)+'</div></div>'
            +'<button class="ce-remove-btn" id="pp-remove-dr">Remove</button></div>';
    })() : '';

    overlay.innerHTML = `
        <div class="card-editor-box">
            <div class="card-editor-header">
                <div class="card-editor-title">✎ Edit Card</div>
                <div class="card-editor-close" id="pp-cancel">✕</div>
            </div>
            <div class="card-editor-body">
                <label class="ce-label">Card Name</label>
                <input class="ce-input" id="pp-name" type="text" placeholder="Give this card a name…" value="${esc(cardData.name||'')}">
                <label class="ce-label">Description <span style="font-weight:400;text-transform:none;letter-spacing:0;">(optional)</span></label>
                <input class="ce-input" id="pp-desc" type="text" placeholder="Short description…" value="${esc(cardData.desc||'')}">

                <!-- CLOUDINARY SECTION -->
                <div style="background:rgba(79,209,197,.07);border:1.5px solid rgba(79,209,197,.3);border-radius:12px;padding:14px;margin-top:14px;">
                    <div style="font-size:12px;font-weight:700;color:var(--accent2);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                        ☁️ Cloudinary — Works on iPhone, Android &amp; desktop
                        <span style="font-size:10px;background:rgba(79,209,197,.2);padding:2px 7px;border-radius:10px;">RECOMMENDED</span>
                    </div>
                    <div id="ce-upload-area" style="border:2px dashed rgba(79,209,197,.4);border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:all .2s;background:var(--bg);">
                        <div style="font-size:24px;margin-bottom:4px;">📁</div>
                        <div style="font-weight:700;font-size:13px;color:var(--text);margin-bottom:3px;">Tap to upload a file</div>
                        <div style="font-size:11px;color:var(--muted);">Photo, video or audio</div>
                    </div>
                    <input type="file" id="ce-file-input" accept="image/*,video/*,audio/*" style="display:none">
                    <div id="ce-upload-progress" style="display:none;margin-top:8px;">
                        <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden;">
                            <div id="ce-upload-bar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .3s;"></div>
                        </div>
                        <div id="ce-upload-status" style="font-size:11px;color:var(--muted);margin-top:5px;text-align:center;">Uploading…</div>
                    </div>
                    ${clPreview}
                </div>

                <!-- GOOGLE DRIVE SECTION -->
                <div style="background:rgba(66,133,244,.07);border:1.5px solid rgba(66,133,244,.3);border-radius:12px;padding:14px;margin-top:10px;">
                    <div style="font-size:12px;font-weight:700;color:#4285f4;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                        📂 Google Drive — Backup link
                    </div>
                    <a href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener"
                       style="display:flex;align-items:center;justify-content:center;gap:7px;padding:9px;background:rgba(66,133,244,.1);border:1px solid rgba(66,133,244,.3);border-radius:8px;color:#4285f4;font-size:12px;font-weight:700;text-decoration:none;margin-bottom:8px;">
                        Open Google Drive to copy a link
                    </a>
                    <input class="ce-input" id="pp-drive-url" type="text" placeholder="Paste Google Drive link here…" value="${esc(cardData.driveUrl||'')}">
                    ${drPreview}
                </div>

                <div class="ce-actions">
                    <button class="ce-btn save" id="pp-save">✓ Save Card</button>
                    <button class="ce-btn del" id="pp-del">🗑 Delete Card</button>
                    <button class="ce-btn cancel" id="pp-cancel2">✕ Cancel</button>
                </div>
            </div>
        </div>`;

    document.body.appendChild(overlay);
    document.getElementById('pp-name').focus();

    // Upload area events
    const uploadArea = document.getElementById('ce-upload-area');
    uploadArea.addEventListener('click', ()=> document.getElementById('ce-file-input').click());
    uploadArea.addEventListener('mouseenter', ()=> uploadArea.style.borderColor='var(--accent2)');
    uploadArea.addEventListener('mouseleave', ()=> uploadArea.style.borderColor='rgba(79,209,197,.4)');

    // Only close when clicking dark backdrop
    overlay.addEventListener('mousedown', e=>{ if(e.target===overlay) popupClose(); });
    overlay.querySelector('.card-editor-box').addEventListener('mousedown', e=>e.stopPropagation());
    overlay.querySelector('.card-editor-box').addEventListener('click', e=>e.stopPropagation());

    // Cloudinary file upload
    document.getElementById('ce-file-input').addEventListener('change', async function(){
        const file = this.files[0]; if(!file) return;
        if(CLOUDINARY_CLOUD_NAME==='YOUR_CLOUD_NAME'){
            toast('Set up Cloudinary in Host Settings first!','warn'); return;
        }
        const progressWrap = document.getElementById('ce-upload-progress');
        const bar = document.getElementById('ce-upload-bar');
        const status = document.getElementById('ce-upload-status');
        progressWrap.style.display = 'block';
        uploadArea.style.opacity = '0.5';
        status.textContent = 'Uploading '+file.name+'…';
        bar.style.width = '0%';
        try{
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = e=>{
                if(e.lengthComputable){
                    const pct = Math.round(e.loaded/e.total*100);
                    bar.style.width = pct+'%';
                    status.textContent = 'Uploading… '+pct+'%';
                }
            };
            const result = await new Promise((res,rej)=>{
                xhr.onload = ()=>{ if(xhr.status===200) res(JSON.parse(xhr.responseText)); else rej(new Error('Upload failed: '+xhr.statusText)); };
                xhr.onerror = ()=>rej(new Error('Network error'));
                xhr.open('POST','https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD_NAME+'/auto/upload');
                xhr.send(fd);
            });
            // Store cloudinary url separately
            cardData.cloudinaryUrl = result.secure_url;
            bar.style.width = '100%';
            status.textContent = '✓ Uploaded! Press Save Card.';
            status.style.color = 'var(--success)';
            uploadArea.innerHTML = '<div style="font-size:20px;margin-bottom:3px;">✅</div><div style="font-size:12px;font-weight:600;color:var(--success);">'+esc(file.name)+'</div><div style="font-size:10px;color:var(--muted);">Tap to replace</div>';
            uploadArea.style.opacity = '1';
            uploadArea.style.borderColor = 'var(--success)';
            toast('Uploaded! ✓');
        }catch(err){
            progressWrap.style.display = 'none';
            uploadArea.style.opacity = '1';
            toast('Upload failed: '+err.message,'danger');
        }
    });

    // Save — store both urls
    document.getElementById('pp-save').onclick = async()=>{
        const name = document.getElementById('pp-name').value.trim() || cardData.name || ('Card '+cardId);
        const desc = document.getElementById('pp-desc').value.trim();
        const driveUrl = document.getElementById('pp-drive-url').value.trim();
        const cloudUrl = cardData.cloudinaryUrl || '';
        // Pick primary mediaUrl: cloudinary first, then drive, then empty
        const primaryUrl = cloudUrl || driveUrl;
        const m = detectMediaType(primaryUrl);
        const cd = {name, desc, mediaUrl:primaryUrl, mediaType:m.type, cloudinaryUrl:cloudUrl, driveUrl:driveUrl};
        try{
            await window.dbSet(window.dbRef(window.db,'cards/section'+sectionIndex+'/'+cardId), cd);
            if(!allCards[sectionIndex]) allCards[sectionIndex]={};
            allCards[sectionIndex][cardId] = cd;
            toast('Card saved! ✓'); popupClose(); loadCards(currentSection);
        }catch(ex){ toast('Save failed: '+(ex.message||ex.code||ex),'danger'); }
    };

    // Remove Cloudinary
    const ppRemoveCl = document.getElementById('pp-remove-cl');
    if(ppRemoveCl) ppRemoveCl.onclick = ()=>{
        cardData.cloudinaryUrl = '';
        document.getElementById('cl-preview').remove();
        toast('Cloudinary link removed','warn');
    };

    // Remove Drive
    const ppRemoveDr = document.getElementById('pp-remove-dr');
    if(ppRemoveDr) ppRemoveDr.onclick = ()=>{
        document.getElementById('pp-drive-url').value = '';
        document.getElementById('dr-preview').remove();
        toast('Drive link removed','warn');
    };

    // Delete card
    document.getElementById('pp-del').onclick = async()=>{
        if(!confirm('Delete this card permanently?')) return;
        try{
            await window.dbRemove(window.dbRef(window.db,'cards/section'+sectionIndex+'/'+cardId));
            toast('Card deleted','warn'); popupClose(); loadCards(currentSection);
        }catch(ex){ toast('Delete failed: '+(ex.message||ex.code||ex),'danger'); }
    };

    document.getElementById('pp-cancel').onclick  = popupClose;
    document.getElementById('pp-cancel2').onclick = popupClose;
    overlay._keyHandler = e=>{ if(e.key==='Escape') popupClose(); };
    document.addEventListener('keydown', overlay._keyHandler);
}

function popupClose(){
    const ov = document.getElementById('cardEditorOverlay');
    if(ov){
        if(ov._keyHandler) document.removeEventListener('keydown', ov._keyHandler);
        ov.remove();
    }
    document.querySelectorAll('.card-popup').forEach(p=>p.remove());
}

// ── File upload ───────────────────────────────────────────
async function uploadToCard(file,sectionIndex,cardId,cardEl,existingData,bar,fill){
    // Show a toast that upload is starting so host knows something is happening
    toast('Uploading…','warn');

    // Try to find progress bar — but don't fail if popup is already closed
    if(!bar||!fill){
        const popup=document.querySelector('.card-popup');
        if(popup){bar=popup.querySelector('.upload-bar');fill=popup.querySelector('.upload-bar-fill');}
    }
    if((!bar||!fill)&&cardEl){
        bar=cardEl.querySelector('.upload-bar');
        fill=cardEl.querySelector('.upload-bar-fill');
    }
    if(bar)bar.style.display='block';

    try{
        // Sanitize filename — remove chars Firebase Storage rejects
        const safeName=file.name.replace(/[#$[\]?]/g,'_');
        const fn='cards/'+sectionIndex+'/'+cardId+'/'+Date.now()+'_'+safeName;
        const fRef=window.storageRef(window.storage,fn);
        const task=window.uploadBytesResumable(fRef,file);

        await new Promise((res,rej)=>task.on('state_changed',
            snap=>{
                if(fill)fill.style.width=(snap.bytesTransferred/snap.totalBytes*100)+'%';
            },
            err=>rej(err),
            ()=>res()
        ));

        const url=await window.getDownloadURL(fRef);

        let mediaType='file';
        if(file.type.startsWith('image/'))mediaType='image';
        else if(file.type.startsWith('audio/'))mediaType='audio';
        else if(file.type.startsWith('video/'))mediaType='video';

        // Preserve existing card name — don't overwrite with placeholder name
        const existingName=(existingData&&existingData.name&&!existingData.name.startsWith('Card '))
            ? existingData.name : (existingData?.name||('Card '+cardId));

        const cd={
            name:existingName,
            desc:existingData?.desc||'',
            mediaUrl:url,
            mediaType:mediaType
        };

        await window.dbSet(window.dbRef(window.db,'cards/section'+sectionIndex+'/'+cardId),cd);

        // Update local cache
        if(!allCards[sectionIndex])allCards[sectionIndex]={};
        allCards[sectionIndex][cardId]=cd;

        if(bar)bar.style.display='none';
        popupClose();
        toast('File uploaded! ✓');
        loadCards(currentSection);

    }catch(e){
        if(bar)bar.style.display='none';
        const msg=e.message||e.code||e.serverResponse||String(e);
        toast('Upload failed: '+msg,'danger');
        console.error('Upload failed — full error:',e);
        // Log every property of the error for debugging
        try{console.error('Error details:',JSON.stringify(e,Object.getOwnPropertyNames(e)));}catch(_){}
    }
}

// ── Quick upload test (call from browser console to diagnose) ─────────
window.testUpload=async function(){
    const testBlob=new Blob(['hello world'],{type:'text/plain'});
    testBlob.name='test.txt';
    console.log('Testing Firebase Storage upload...');
    console.log('storage object:',window.storage);
    try{
        const fRef=window.storageRef(window.storage,'test/'+Date.now()+'_test.txt');
        console.log('storage ref created:',fRef);
        const task=window.uploadBytesResumable(fRef,testBlob);
        await new Promise((res,rej)=>task.on('state_changed',
            s=>console.log('Progress:',(s.bytesTransferred/s.totalBytes*100).toFixed(0)+'%'),
            e=>{console.error('Upload error:',e);rej(e);},
            ()=>res()
        ));
        const url=await window.getDownloadURL(fRef);
        console.log('SUCCESS! Download URL:',url);
        toast('Test upload worked! ✓');
    }catch(e){
        console.error('Test upload FAILED:',e);
        toast('Test failed: '+(e.message||e.code||e),'danger');
    }
};

// ── Section double-click editing (host only) ──────────────
// Wired ONCE on the container with event delegation.
// Single-click → switch section. Double-click → open editor.
// Using delegation means no listeners are ever lost when DOM updates.
(function wireNav(){
    const nav=document.getElementById('topNav');
    let clickTimer=null;

    nav.addEventListener('click',e=>{
        const btn=e.target.closest('.nav-button'); if(!btn)return;
        // If a double-click timer is already running, cancel — the dblclick handler will fire
        if(clickTimer){clearTimeout(clickTimer);clickTimer=null;return;}
        clickTimer=setTimeout(()=>{
            clickTimer=null;
            const idx=parseInt(btn.dataset.section);
            if(!isNaN(idx))switchSection(idx);
        },220);
    });

    nav.addEventListener('dblclick',e=>{
        const btn=e.target.closest('.nav-button'); if(!btn)return;
        if(clickTimer){clearTimeout(clickTimer);clickTimer=null;}
        if(!isHost)return;
        e.preventDefault();
        openSectionEditor(btn,parseInt(btn.dataset.section));
    });
})();

function openSectionEditor(btn,sectionIdx){
    closeAllPickers();
    const textEl=btn.querySelector('.nav-button-text');
    const emojiEl=btn.querySelector('.nav-button-emoji');
    if(btn.querySelector('.nav-name-input'))return; // already open

    const savedName=textEl.textContent;
    const savedIcon=emojiEl.textContent;

    // Replace text with editable input
    textEl.innerHTML='';
    const inp=document.createElement('input');
    inp.className='nav-name-input';
    inp.value=savedName;
    inp.onclick=e=>e.stopPropagation();
    inp.ondblclick=e=>e.stopPropagation();
    textEl.appendChild(inp);
    inp.focus(); inp.select();

    // Build emoji + upload picker
    const picker=document.createElement('div');
    picker.className='emoji-picker';
    picker.onclick=e=>e.stopPropagation();

    EMOJIS.forEach(em=>{
        const opt=document.createElement('div');
        opt.className='emoji-opt'; opt.textContent=em;
        opt.onclick=async ev=>{
            ev.stopPropagation();
            emojiEl.textContent=em; emojiEl.style.fontSize='17px';
            await saveSectionData(sectionIdx,inp.value.trim()||savedName,em,'emoji');
            commitEditor(textEl,inp,savedName); closeAllPickers();
        };
        picker.appendChild(opt);
    });

    // Upload image row
    const uploadRow=document.createElement('div');
    uploadRow.className='emoji-upload-row';
    const uploadBtn=document.createElement('button');
    uploadBtn.className='emoji-upload-btn';
    uploadBtn.textContent='⬆ Upload image as icon';
    uploadBtn.onclick=ev=>{
        ev.stopPropagation();
        const imgInp=document.getElementById('sectionImageInput');
        imgInp.value='';
        imgInp.onchange=async()=>{
            const file=imgInp.files[0]; if(!file)return;
            try{
                const fRef=window.storageRef(window.storage,'sections/icon_'+sectionIdx+'_'+Date.now());
                const task=window.uploadBytesResumable(fRef,file);
                await new Promise((res,rej)=>task.on('state_changed',null,rej,res));
                const url=await window.getDownloadURL(fRef);
                emojiEl.innerHTML='<img src="'+url+'" style="width:22px;height:22px;object-fit:cover;border-radius:4px;">';
                emojiEl.style.fontSize='0';
                await saveSectionData(sectionIdx,inp.value.trim()||savedName,url,'image');
                commitEditor(textEl,inp,savedName); closeAllPickers();
                toast('Icon updated!');
            }catch(ex){toast('Upload failed','danger');}
        };
        imgInp.click();
    };
    uploadRow.appendChild(uploadBtn);
    picker.appendChild(uploadRow);
    btn.appendChild(picker);
    emojiPickerOpen=picker;

    const commit=()=>{
        const newName=inp.value.trim()||savedName;
        commitEditor(textEl,inp,newName);
        closeAllPickers();
        saveSectionData(sectionIdx,newName,emojiEl.textContent,emojiEl.querySelector('img')?'image':'emoji');
        if(currentSection===sectionIdx)document.getElementById('sectionTitle').textContent=newName;
    };
    inp.addEventListener('keydown',e=>{
        if(e.key==='Enter'){e.preventDefault();inp.blur();}
        if(e.key==='Escape'){commitEditor(textEl,inp,savedName);emojiEl.textContent=savedIcon;closeAllPickers();}
    });
    inp.addEventListener('blur',()=>setTimeout(commit,180));
}

function commitEditor(textEl,inp,name){
    if(textEl.contains(inp))textEl.textContent=name;
}

async function saveSectionData(index,name,icon,iconType){
    try{
        const snap=await window.dbGet(window.dbRef(window.db,'sections'));
        let sections=[];
        if(snap.exists()){
            const raw=snap.val();
            sections=Array.isArray(raw)?[...raw]:Object.values(raw);
        }else{
            document.querySelectorAll('.nav-button').forEach((b,i)=>{
                sections[i]={name:b.querySelector('.nav-button-text').textContent,
                             icon:b.querySelector('.nav-button-emoji').textContent,iconType:'emoji'};
            });
        }
        while(sections.length<5)sections.push({name:'Section '+(sections.length+1),icon:'📁',iconType:'emoji'});
        sections[index]={name,icon,iconType};
        await window.dbSet(window.dbRef(window.db,'sections'),sections);
        toast('Section '+(index+1)+' saved!');
    }catch(e){toast('Save failed: '+(e.message||e.code||e),'danger');console.error('saveSectionData failed:',e);}
}

// ── Announcements ─────────────────────────────────────────
function listenAnnouncements(){
    window.dbOnValue(window.dbRef(window.db,'announcement'),snap=>{
        const b=document.getElementById('announcementBanner');
        if(snap.exists()){document.getElementById('announcementText').textContent=snap.val().text;b.classList.add('active');}
        else b.classList.remove('active');
    });
}

