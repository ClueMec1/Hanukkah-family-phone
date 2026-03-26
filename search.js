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

