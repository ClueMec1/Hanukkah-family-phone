// ══════════════════════════════════════════════════════════
//  SPIN WHEEL
// ══════════════════════════════════════════════════════════
// (wheel vars declared at top)

function loadWheelNames(){
    try{ wheelNames = JSON.parse(localStorage.getItem('wheelNames')||'[]'); }
    catch(e){ wheelNames = []; }
}
function saveWheelNames(){
    try{ localStorage.setItem('wheelNames', JSON.stringify(wheelNames)); }catch(e){}
}
function addWheelNameIfNew(name){
    loadWheelNames();
    if(name && !wheelNames.includes(name)){
        wheelNames.push(name);
        saveWheelNames();
    }
}
function addWheelName(){
    const input = document.getElementById('wheelNewName');
    const name = input.value.trim();
    if(!name){ toast('Enter a name first','warn'); return; }
    loadWheelNames();
    if(wheelNames.includes(name)){ toast('Already on the wheel!','warn'); return; }
    wheelNames.push(name);
    saveWheelNames();
    input.value = '';
    renderWheel();
}

function renderWheel(){
    loadWheelNames();
    const canvas = document.getElementById('wheelCanvas');
    if(!canvas) return;
    drawWheel(canvas, wheelAngle);
    // Render name tags
    const tagsEl = document.getElementById('wheelNames');
    tagsEl.innerHTML = '';
    wheelNames.forEach((name, i) => {
        const tag = document.createElement('div');
        tag.className = 'wheel-name-tag';
        tag.style.borderColor = WHEEL_COLORS[i % WHEEL_COLORS.length];
        tag.innerHTML = `<span>${esc(name)}</span><button class="wheel-name-remove" data-name="${esc(name)}">✕</button>`;
        tag.querySelector('.wheel-name-remove').addEventListener('click', e => {
            loadWheelNames();
            wheelNames = wheelNames.filter(n => n !== e.target.dataset.name);
            saveWheelNames();
            renderWheel();
        });
        tagsEl.appendChild(tag);
    });
    if(!wheelNames.length){
        tagsEl.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px;">No names yet — add some or sign in!</div>';
    }
}

function drawWheel(canvas, rotation){
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2, r = W/2 - 4;
    ctx.clearRect(0,0,W,H);
    if(!wheelNames.length){
        ctx.fillStyle = '#1e2230';
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#6b7280'; ctx.font = '14px DM Sans'; ctx.textAlign='center';
        ctx.fillText('Add names to spin!', cx, cy);
        return;
    }
    const slice = (Math.PI*2) / wheelNames.length;
    wheelNames.forEach((name, i) => {
        const startAngle = rotation + i * slice;
        const endAngle = startAngle + slice;
        // Slice
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = '#0d0f14';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Text
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + slice/2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold '+Math.min(14, Math.floor(200/wheelNames.length)+8)+'px DM Sans';
        ctx.shadowColor = 'rgba(0,0,0,.4)';
        ctx.shadowBlur = 3;
        ctx.fillText(name.length > 10 ? name.slice(0,9)+'…' : name, r - 10, 5);
        ctx.restore();
    });
    // Center circle
    ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2);
    ctx.fillStyle = '#0d0f14'; ctx.fill();
    ctx.strokeStyle = '#2a2f42'; ctx.lineWidth=2; ctx.stroke();
}

function spinWheel(){
    loadWheelNames();
    if(wheelNames.length < 2){ toast('Add at least 2 names to spin!','warn'); return; }
    if(wheelSpinning) return;
    wheelSpinning = true;
    document.getElementById('wheelSpinBtn').disabled = true;
    document.getElementById('wheelResult').textContent = '';
    const canvas = document.getElementById('wheelCanvas');
    const totalSpins = (Math.random()*5+5) * Math.PI*2;
    const duration = 4000;
    const startAngle = wheelAngle;
    const startTime = performance.now();
    function animate(now){
        const elapsed = now - startTime;
        const t = Math.min(elapsed/duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1-t, 3);
        wheelAngle = startAngle + totalSpins * eased;
        drawWheel(canvas, wheelAngle);
        if(t < 1){ requestAnimationFrame(animate); return; }
        // Find winner — pointer is at top (Math.PI*1.5 from right = -PI/2)
        const slice = (Math.PI*2) / wheelNames.length;
        const normalised = (((-wheelAngle % (Math.PI*2)) + Math.PI*2) % (Math.PI*2));
        const winnerIdx = Math.floor(normalised / slice) % wheelNames.length;
        const winner = wheelNames[winnerIdx];
        document.getElementById('wheelResult').textContent = '🎉 ' + winner + '!';
        toast('🎉 ' + winner + ' was picked!');
        wheelSpinning = false;
        document.getElementById('wheelSpinBtn').disabled = false;
    }
    requestAnimationFrame(animate);
}

