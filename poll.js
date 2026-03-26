// ══════════════════════════════════════════════════════════
//  POLL
// ══════════════════════════════════════════════════════════
function openCreatePoll(){
    document.getElementById('pollQuestion').value='';
    document.getElementById('pollOptions').value='';
    document.getElementById('createPollModal').classList.add('active');
}

async function savePoll(){
    const question = document.getElementById('pollQuestion').value.trim();
    const options = document.getElementById('pollOptions').value.split('\n').map(s=>s.trim()).filter(Boolean);
    if(!question){ toast('Please enter a question','warn'); return; }
    if(options.length < 2){ toast('Please enter at least 2 options','warn'); return; }
    const pollData = {question, options, votes:{}, createdBy:currentUser||'Host', timestamp:Date.now(), active:true};
    try{
        const ref = window.dbPush(window.dbRef(window.db,'polls'));
        await window.dbSet(ref, pollData);
        toast('Poll created! 🗳️'); closeModal('createPollModal'); renderPolls();
    }catch(e){ toast('Failed: '+e.message,'danger'); }
}

async function renderPolls(){
    const container = document.getElementById('pollContainer');
    container.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px;">Loading polls…</div>';
    // Only host can create polls
    document.getElementById('createPollBtn').style.display = isHost ? 'flex' : 'none';
    try{
        const snap = await window.dbGet(window.dbRef(window.db,'polls'));
        container.innerHTML = '';
        if(!snap.exists()){
            container.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px;text-align:center;">No polls yet!'+(isHost?' Create one above!':'')+'</div>';
            return;
        }
        const polls = snap.val();
        Object.entries(polls).reverse().forEach(([key,poll])=>{
            const votedKey = 'voted_'+key;
            const myVote = localStorage.getItem(votedKey);
            const votes = poll.votes||{};
            const totalVotes = Object.values(votes).reduce((a,b)=>a+b,0);
            const card = document.createElement('div');
            card.className = 'poll-card';
            let optionsHtml = (poll.options||[]).map((opt,i)=>{
                const voteCount = votes[i]||0;
                const pct = totalVotes ? Math.round(voteCount/totalVotes*100) : 0;
                const isMyVote = myVote == i;
                const colors = ['rgba(124,106,247,.5)','rgba(79,209,197,.5)','rgba(248,113,113,.5)','rgba(251,191,36,.5)','rgba(52,211,153,.5)'];
                return '<div class="poll-option" data-pollkey="'+esc(key)+'" data-optidx="'+i+'">'
                    +'<div class="poll-bar-wrap">'
                    +'<div class="poll-bar-fill" style="width:'+pct+'%;background:'+colors[i%colors.length]+';"></div>'
                    +'<div class="poll-bar-label">'+(isMyVote?'&#10003; ':'')+'<span>'+esc(opt)+'</span></div>'
                    +'<div class="poll-bar-pct">'+pct+'%</div>'
                    +'</div></div>';
            }).join('');
            card.innerHTML = '<div class="poll-question">'+esc(poll.question)+'</div>'
                + optionsHtml
                + '<div class="poll-voted">'+totalVotes+' vote'+(totalVotes!==1?'s':'')+' &middot; by '+esc(poll.createdBy||'Host')+'</div>'
                + (isHost ? '<button class="delete-poll-btn" data-key="'+esc(key)+'" style="margin-top:8px;background:none;border:none;color:var(--muted);font-size:11px;cursor:pointer;font-family:inherit;">&#128465; Delete poll</button>' : '');
            container.appendChild(card);
        });
    }catch(e){ container.innerHTML = '<div style="color:var(--danger);padding:20px;">Error loading polls</div>'; }
}

// Poll vote delegation
document.addEventListener('click', e=>{
    const opt = e.target.closest('.poll-option');
    if(opt && opt.dataset.pollkey) castVote(opt.dataset.pollkey, parseInt(opt.dataset.optidx));
});

async function castVote(pollKey, optionIdx){
    const votedKey = 'voted_'+pollKey;
    if(localStorage.getItem(votedKey)!==null){ toast('You already voted!','warn'); return; }
    try{
        const ref = window.dbRef(window.db,'polls/'+pollKey+'/votes/'+optionIdx);
        const snap = await window.dbGet(ref);
        const current = snap.exists() ? snap.val() : 0;
        await window.dbSet(ref, current+1);
        localStorage.setItem(votedKey, optionIdx);
        toast('Vote cast! 🗳️'); renderPolls();
    }catch(e){ toast('Failed','danger'); }
}

// Poll delete delegation
document.addEventListener('click', e=>{
    const btn = e.target.closest('.delete-poll-btn');
    if(btn) deletePoll(btn.dataset.key);
});

async function deletePoll(key){
    if(!confirm('Delete this poll?')) return;
    try{
        await window.dbRemove(window.dbRef(window.db,'polls/'+key));
        toast('Poll deleted','warn'); renderPolls();
    }catch(e){ toast('Failed','danger'); }
}

