// ══════════════════════════════════════════════════════════
//  RECIPES
// ══════════════════════════════════════════════════════════
function openAddRecipe(){
    ['recTitle','recEmoji','recTime','recServes','recIngredients','recSteps'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.value='';
    });
    document.getElementById('recEmoji').value='🍽️';
    document.getElementById('recAuthor').value=currentUser||'';
    document.getElementById('addRecipeModal').classList.add('active');
}

async function saveRecipe(){
    const title = document.getElementById('recTitle').value.trim();
    const emoji = document.getElementById('recEmoji').value.trim()||'🍽️';
    const time = document.getElementById('recTime').value.trim();
    const serves = document.getElementById('recServes').value.trim();
    const ingredients = document.getElementById('recIngredients').value.trim();
    const steps = document.getElementById('recSteps').value.trim();
    if(!title||!ingredients||!steps){ toast('Please fill in title, ingredients and steps','warn'); return; }
    try{
        const ref = window.dbPush(window.dbRef(window.db,'recipes'));
        await window.dbSet(ref,{title,emoji,time,serves,ingredients,steps,author:currentUser||'Family',timestamp:Date.now()});
        toast('Recipe saved! 🍳'); closeModal('addRecipeModal'); renderRecipes();
    }catch(e){ toast('Failed: '+e.message,'danger'); }
}

async function renderRecipes(){
    const grid = document.getElementById('recipeGrid');
    grid.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px;">Loading recipes…</div>';
    try{
        const snap = await window.dbGet(window.dbRef(window.db,'recipes'));
        grid.innerHTML = '';
        if(!snap.exists()){
            grid.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px;grid-column:1/-1;text-align:center;">No recipes yet — add your first one!</div>';
            return;
        }
        const recipes = snap.val();
        Object.entries(recipes).forEach(([key,r])=>{
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `<div class="recipe-card-thumb">${esc(r.emoji||'🍽️')}</div>
                <div class="recipe-card-body">
                    <div class="recipe-card-title">${esc(r.title)}</div>
                    <div class="recipe-card-meta">${r.time?'⏱ '+esc(r.time)+' · ':''}${r.serves?'👥 '+esc(r.serves)+' · ':''}by ${esc(r.author||'Family')}</div>
                </div>`;
            card.addEventListener('click', ()=> openViewRecipe(key, r));
            grid.appendChild(card);
        });
    }catch(e){ grid.innerHTML = '<div style="color:var(--danger);padding:20px;">Error loading recipes</div>'; }
}

function openViewRecipe(key, r){
    const steps = (r.steps||'').split('\n').filter(Boolean);
    const ingredients = (r.ingredients||'').split('\n').filter(Boolean);
    let stepsHtml = steps.map((s,i)=>`
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
            <div style="width:26px;height:26px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">${i+1}</div>
            <div style="font-size:13px;color:var(--text);line-height:1.6;">${esc(s)}</div>
        </div>`).join('');
    let ingHtml = ingredients.map(ing=>`<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;display:flex;gap:8px;align-items:center;"><span style="color:var(--accent2);">•</span>${esc(ing)}</div>`).join('');
    document.getElementById('viewRecipeContent').innerHTML = `
        <div style="text-align:center;font-size:52px;margin-bottom:8px;">${esc(r.emoji||'🍽️')}</div>
        <h2 style="text-align:center;margin-bottom:4px;">${esc(r.title)}</h2>
        <div style="text-align:center;color:var(--muted);font-size:12px;margin-bottom:20px;">${r.time?'⏱ '+esc(r.time)+' · ':''}${r.serves?'👥 '+esc(r.serves)+' · ':''}by ${esc(r.author||'Family')}</div>
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Ingredients</div>
        <div style="margin-bottom:20px;">${ingHtml}</div>
        <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Steps</div>
        ${stepsHtml}`;
    const delBtn = document.getElementById('deleteRecipeBtn');
    if(isHost){ delBtn.style.display='flex'; delBtn.onclick=async()=>{ if(!confirm('Delete this recipe?')) return; await window.dbRemove(window.dbRef(window.db,'recipes/'+key)); toast('Recipe deleted','warn'); closeModal('viewRecipeModal'); renderRecipes(); }; }
    else { delBtn.style.display='none'; }
    document.getElementById('viewRecipeModal').classList.add('active');
}

