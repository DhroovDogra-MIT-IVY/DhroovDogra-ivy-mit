// ---- CONFIG ----
// If you DO NOT have a backend deployed, you can put NASA_API_KEY here (not secure).
// Recommended: deploy backend and set FRONTEND_API_BASE = '/api'
const FRONTEND_API_BASE = "/api"; // if backend deployed at same origin. For GitHub Pages use absolute backend URL.
const PUBLIC_NASA_KEY = "DEMO_KEY"; // replace with your real key or use backend proxy

// DOM
const cardsSection = document.getElementById("cardsSection");
const papersSection = document.getElementById("papersSection");
const papersList = document.getElementById("papersList");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const searchBtn = document.getElementById("searchBtn");

// nav buttons
document.getElementById("homeBtn").onclick = () => showOnly("home");
document.getElementById("researchBtn").onclick = () => showOnly("research");
document.getElementById("papersBtn").onclick = () => showOnly("papers");
document.getElementById("aiBtn").onclick = () => showOnly("ai");

function showOnly(page){
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  document.getElementById(page+"Btn").classList.add("active");
  document.getElementById("cardsSection").classList.toggle("hidden", page!=="research" && page!=="home");
  document.getElementById("papersSection").classList.toggle("hidden", page!=="papers");
  document.getElementById("aiSection").classList.toggle("hidden", page!=="ai");
  if(page==="research" || page==="home") loadResearch(); 
  if(page==="papers") loadPapers();
}

// Modal handlers
modalClose.onclick = ()=> modal.classList.add("hidden");
modal.addEventListener("click", (e)=> { if(e.target===modal) modal.classList.add("hidden"); })

// Load initial content
document.addEventListener("DOMContentLoaded", ()=> {
  showOnly("home");
  // also populate research by default
  loadResearch();
});

// Search button
searchBtn.onclick = ()=> loadResearch(searchInput.value.trim(), filterSelect.value);

// ---- RESEARCH: NASA APOD + Mars rover sample ----
async function loadResearch(query="", filter="all"){
  cardsSection.innerHTML = "";
  // 1) NASA APOD
  try{
    const apod = await fetchAPOD();
    addCard({
      title: apod.title,
      source: "NASA",
      image: apod.url,
      summary: apod.explanation.slice(0,220) + "..."
    }, query, filter);
  }catch(err){
    console.warn("APOD failed", err);
  }

  // 2) Mars Rover latest photos (Curiosity)
  try{
    const photos = await fetchMarsPhotos();
    for(let i=0;i<Math.min(6, photos.length); i++){
      const p = photos[i];
      addCard({
        title: `Mars Rover: ${p.rover.name} — ${p.camera.full_name}`,
        source: "NASA",
        image: p.img_src,
        summary: `Rover sol ${p.sol} — ${p.earth_date}`
      }, query, filter);
    }
  }catch(err){ console.warn("Mars failed", err); }

  // 3) Add static links / ISRO quick card
  addCard({
    title: "ISRO Updates",
    source: "ISRO",
    image: "https://www.isro.gov.in/sites/default/files/isro_logo.png",
    summary: "Official ISRO updates and mission news."
  }, query, filter);
}

// helper to add card with filter and click-to-open
function addCard(data, query="", filter="all"){
  const q = query.toLowerCase();
  if(q && !((data.title||"").toLowerCase().includes(q) || (data.summary||"").toLowerCase().includes(q))) return;
  if(filter!=="all" && filter.toLowerCase()!==data.source.toLowerCase()) return;

  const card = document.createElement("div");
  card.className = "card-item";
  card.innerHTML = `
    ${data.image ? `<img src="${data.image}" alt="${data.title}" loading="lazy">` : ""}
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0;color:white">${data.title}</h3>
      <span class="badge">${data.source}</span>
    </div>
    <p style="margin:8px 0 0 0;color:#bcd">${data.summary || ""}</p>
    <div style="margin-top:8px;display:flex;gap:8px">
      <button class="open-btn">Open</button>
      <a class="external-link" target="_blank" href="${data.link||'#'}">Open original</a>
    </div>
  `;
  card.querySelector(".open-btn").onclick = ()=>{
    modalBody.innerHTML = `<h2>${data.title}</h2>
      ${data.image ? `<img src="${data.image}" style="width:100%;border-radius:8px;margin:8px 0">` : ""}
      <p style="white-space:pre-wrap">${data.long || data.summary || ""}</p>
      <p style="font-size:13px;color:#9fb0c8">Source: ${data.source}</p>
      ${data.link?`<a href="${data.link}" target="_blank">Open original</a>`:""}`;
    modal.classList.remove("hidden");
  };
  cardsSection.appendChild(card);
}

// ---- Fetch functions (use backend proxy if available) ----
async function fetchAPOD(){
  // If you have backend at FRONTEND_API_BASE, it should forward to NASA with key.
  if(FRONTEND_API_BASE !== "/api"){
    const r = await fetch(`${FRONTEND_API_BASE}/nasa/apod`);
    return await r.json();
  } else {
    // try public key (DEMO_KEY rate-limited)
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${PUBLIC_NASA_KEY}`);
    if(!res.ok) throw new Error("APOD fetch failed");
    return await res.json();
  }
}

async function fetchMarsPhotos(){
  if(FRONTEND_API_BASE !== "/api"){
    const r = await fetch(`${FRONTEND_API_BASE}/nasa/mars`);
    return await r.json();
  } else {
    // use DEMO endpoint (sol 1000 example); change key above
    const res = await fetch(`https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=1000&api_key=${PUBLIC_NASA_KEY}`);
    if(!res.ok) throw new Error("Mars fetch failed");
    const j = await res.json();
    return j.photos || [];
  }
}

// ---- PAPERS: using CrossRef (no API key) ----
async function loadPapers(q="space"){
  papersList.innerHTML = "<em>Loading papers...</em>";
  try{
    const query = encodeURIComponent(q||"space");
    // Note: CrossRef has CORS and supports JSON
    const r = await fetch(`https://api.crossref.org/works?query=${query}&rows=8`);
    const j = await r.json();
    papersList.innerHTML = "";
    if(!j.message || !j.message.items) { papersList.innerHTML = "<div>No results</div>"; return; }
    j.message.items.forEach(it=>{
      const item = document.createElement("div");
      item.className = "paper";
      const title = it.title && it.title[0] ? it.title[0] : "Untitled";
      item.innerHTML = `<h3>${title}</h3>
        <div style="font-size:13px;color:#9fb0c8">${(it.author||[]).slice(0,3).map(a=>a.family? a.family : (a.name||"")).join(", ")} • ${it.published && it.published['date-parts'] ? it.published['date-parts'][0][0] : ''}</div>
        <p style="margin-top:6px">${(it.abstract ? it.abstract.replace(/<[^>]+>/g,"").slice(0,160) : (it.subtitle && it.subtitle[0]) || "").slice(0,160)}...</p>
        <a href="${(it.URL)}" target="_blank">Open paper</a>`;
      papersList.appendChild(item);
    });
  }catch(err){
    papersList.innerHTML = "<div>Failed to load papers.</div>";
    console.error(err);
  }
}

// ---- AI chat (calls backend /api/ai) ----
const chatLog = document.getElementById("chatLog");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

chatSend.onclick = async ()=>{
  const text = chatInput.value.trim(); if(!text) return;
  addChatMessage("user", text); chatInput.value="";
  addChatMessage("bot", "Thinking...");
  try{
    const res = await fetch(`${FRONTEND_API_BASE}/ai/query`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({prompt:text})
    });
    const j = await res.json();
    // j should have {answer}
    const answer = j.answer || j.choices?.[0]?.text || j.data || "No answer from server";
    // replace last bot "Thinking..." with real
    const last = chatLog.querySelector(".chat-msg.bot:last-child");
    if(last) last.innerText = answer;
  }catch(err){
    const last = chatLog.querySelector(".chat-msg.bot:last-child");
    if(last) last.innerText = "AI error (deploy backend and set OPENAI_API_KEY).";
    console.error(err);
  }
};

function addChatMessage(type, text){
  const d = document.createElement("div");
  d.className = `chat-msg ${type}`;
  d.innerText = text;
  chatLog.appendChild(d);
  chatLog.scrollTop = chatLog.scrollHeight;
}
