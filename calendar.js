// ══════════════════════════════════════════════════════════
//  BIRTHDAY BANNER
// ══════════════════════════════════════════════════════════
function checkBirthdays(){
    waitForFirebase(async ()=>{
        try{
            const snap = await window.dbGet(window.dbRef(window.db,'events'));
            if(!snap.exists()) return;
            const events = Object.values(snap.val());
            const today = new Date();
            const mm = String(today.getMonth()+1).padStart(2,'0');
            const dd = String(today.getDate()).padStart(2,'0');
            const todayMD = mm+'-'+dd;
            const bdays = events.filter(e => e.type==='birthday' && e.date && e.date.slice(5)===todayMD);
            const banner = document.getElementById('bdayBanner');
            const bannerText = document.getElementById('bdayBannerText');
            if(bdays.length){
                const names = bdays.map(b=>b.title).join(' & ');
                bannerText.textContent = '🎉 Today is ' + names + '! Wishing them a wonderful birthday!';
                banner.classList.add('active');
            } else {
                banner.classList.remove('active');
            }
        }catch(e){}
    });
}

// ══════════════════════════════════════════════════════════
//  CALENDAR
// ══════════════════════════════════════════════════════════
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
const EVENT_COLORS = {birthday:'#f87171',holiday:'#fbbf24',gathering:'#7c6af7',appointment:'#4fd1c5',other:'#34d399'};
const EVENT_EMOJIS = {birthday:'🎂',holiday:'🎉',gathering:'👨‍👩‍👧',appointment:'🏥',other:'📌'};

function calNav(dir){
    calMonth += dir;
    if(calMonth > 11){ calMonth=0; calYear++; }
    if(calMonth < 0){ calMonth=11; calYear--; }
    renderCalendar();
}

// Get Hebrew date string for a given JS Date
function getHebrewDate(date){
    try{
        const day = new Intl.DateTimeFormat('he-IL-u-ca-hebrew',{day:'numeric'}).format(date);
        const month = new Intl.DateTimeFormat('he-IL-u-ca-hebrew',{month:'long'}).format(date);
        return day + ' ' + month;
    }catch(e){ return ''; }
}

async function renderCalendar(){
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calMonthLabel').textContent = monthNames[calMonth] + ' ' + calYear;
    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';
    // Day name headers — English + Hebrew
    const dayNames = [
        {en:'Sun', he:'א׳'},
        {en:'Mon', he:'ב׳'},
        {en:'Tue', he:'ג׳'},
        {en:'Wed', he:'ד׳'},
        {en:'Thu', he:'ה׳'},
        {en:'Fri', he:'ש׳'},
        {en:'Sat', he:'שבת'}
    ];
    dayNames.forEach(d => {
        const el = document.createElement('div');
        el.className = 'cal-day-name';
        el.innerHTML = '<span style="display:block;font-size:11px;">' + d.en + '</span>'
            + '<span style="display:block;font-size:9px;color:var(--accent2);direction:rtl;">' + d.he + '</span>';
        grid.appendChild(el);
    });
    // Load events
    let eventsMap = {};
    try{
        const snap = await window.dbGet(window.dbRef(window.db,'events'));
        if(snap.exists()) Object.values(snap.val()).forEach(e => {
            if(e.date){ eventsMap[e.date] = eventsMap[e.date]||[]; eventsMap[e.date].push(e); }
        });
    }catch(ex){}

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    const daysInPrev = new Date(calYear, calMonth, 0).getDate();
    const today = new Date();

    // Prev month padding
    for(let i=firstDay-1; i>=0; i--){
        const d = document.createElement('div');
        d.className = 'cal-day other-month';
        d.innerHTML = '<div class="cal-day-num">'+(daysInPrev-i)+'</div>';
        grid.appendChild(d);
    }
    // Current month days
    for(let d=1; d<=daysInMonth; d++){
        const dateStr = calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
        const isToday = d===today.getDate() && calMonth===today.getMonth() && calYear===today.getFullYear();
        const dayEl = document.createElement('div');
        dayEl.className = 'cal-day' + (isToday?' today':'') + (eventsMap[dateStr]?' has-event':'');
        const jsDate = new Date(calYear, calMonth, d);
        const hebStr = getHebrewDate(jsDate);
        let dotsHtml = (eventsMap[dateStr]||[]).slice(0,3).map(e=>
            '<div class="cal-dot" style="background:'+EVENT_COLORS[e.type||'other']+'"></div>').join('');
        dayEl.innerHTML = '<div class="cal-day-num">'+d+'</div>'
            + (hebStr ? '<div class="cal-day-heb">'+hebStr+'</div>' : '')
            + dotsHtml;
        grid.appendChild(dayEl);
    }
    // Next month padding
    const total = firstDay + daysInMonth;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for(let i=1; i<=remaining; i++){
        const d = document.createElement('div');
        d.className = 'cal-day other-month';
        d.innerHTML = '<div class="cal-day-num">'+i+'</div>';
        grid.appendChild(d);
    }
    // Render upcoming events list
    renderUpcomingEvents(eventsMap);
}

function renderUpcomingEvents(eventsMap){
    const list = document.getElementById('calEventsList');
    list.innerHTML = '';
    const allEvents = [];
    Object.entries(eventsMap).forEach(([date, evts]) => evts.forEach(e => allEvents.push({...e, date})));
    allEvents.sort((a,b) => a.date.localeCompare(b.date));
    if(!allEvents.length){
        list.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">No events yet — add one!</div>';
        return;
    }
    allEvents.forEach(e => {
        const el = document.createElement('div');
        el.className = 'cal-event-item';
        const color = EVENT_COLORS[e.type||'other'];
        const emoji = EVENT_EMOJIS[e.type||'other'];
        const dateObj = new Date(e.date+'T12:00:00');
        const dateStr = dateObj.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
        const hebDateStr = getHebrewDate(dateObj);
        el.innerHTML = `<div class="cal-event-dot" style="background:${color}"></div>
            <div class="cal-event-info">
                <div class="cal-event-title">${emoji} ${esc(e.title)}</div>
                <div class="cal-event-date">${dateStr}${hebDateStr?' · <span style="direction:rtl;color:var(--accent2);">'+hebDateStr+'</span>':''} · added by ${esc(e.author||'Family')}</div>
            </div>
            ${isHost ? '<button class="cal-event-del" data-key="'+esc(e._key||'')+'" onclick="deleteEvent(this.dataset.key)">🗑</button>' : ''}`;
        list.appendChild(el);
    });
}

function openAddEvent(){
    document.getElementById('evtTitle').value='';
    document.getElementById('evtDate').value='';
    document.getElementById('evtType').value='birthday';
    document.getElementById('evtAuthor').value=currentUser||'';
    document.getElementById('addEventModal').classList.add('active');
}

async function saveEvent(){
    const title = document.getElementById('evtTitle').value.trim();
    const date = document.getElementById('evtDate').value;
    const type = document.getElementById('evtType').value;
    if(!title||!date){ toast('Please fill in name and date','warn'); return; }
    try{
        const ref = window.dbPush(window.dbRef(window.db,'events'));
        await window.dbSet(ref,{title,date,type,author:currentUser||'Family',timestamp:Date.now()});
        toast('Event saved! 📅'); closeModal('addEventModal'); renderCalendar(); checkBirthdays();
    }catch(e){ toast('Failed: '+e.message,'danger'); }
}

async function deleteEvent(key){
    if(!key||!confirm('Delete this event?')) return;
    try{
        await window.dbRemove(window.dbRef(window.db,'events/'+key));
        toast('Event deleted','warn'); renderCalendar();
    }catch(e){ toast('Failed','danger'); }
}

