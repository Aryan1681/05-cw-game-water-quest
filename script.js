// ===== Config =====
const GOAL = 20;                     // win threshold
const ROUND_TIME = 60;               // seconds
const START_LIVES = 3;

const DIFFICULTY = {
  chill: 1050,
  normal: 850,
  turbo: 650
};
const POLLUTANT_CHANCE = 0.25;
const MISS_PENALTY = 1;

const WIN_MESSAGES = [
  "You hit the milestone. Clean water FTW!",
  "Goal reached. Imagine the impact.",
  "Clutch round. Keep that flow going."
];
const LOSE_MESSAGES = [
  "So close. Try again for the milestone.",
  "Not quite there. One more round.",
  "Missed the goal, but progress matters."
];

// ===== State =====
let score=0, best=0, timeLeft=ROUND_TIME, lives=START_LIVES, streak=0, running=false;
let tickId=null, spawnId=null, spawnMs=DIFFICULTY.normal;

// ===== DOM =====
const els = {
  grid: document.getElementById("grid"),
  score: document.getElementById("score"),
  best: document.getElementById("best"),
  goal: document.getElementById("goal"),
  lives: document.getElementById("lives"),
  streak: document.getElementById("streak"),
  timer: document.getElementById("timer"),
  progress: document.getElementById("timeProgress"),
  start: document.getElementById("start-game"),
  reset: document.getElementById("reset-game"),
  msg: document.getElementById("achievements"),
  banner: document.getElementById("milestone"),
  confetti: document.getElementById("confetti"),
  reducedMotion: document.getElementById("reducedMotion"),
  themeSelect: document.getElementById("themeSelect"),
  difficultySelect: document.getElementById("difficultySelect")
};

// ===== Init =====
els.goal.textContent = GOAL;
best = Number(localStorage.getItem("wq_best")) || 0;
els.best.textContent = best;
spawnMs = DIFFICULTY[els.difficultySelect.value] || DIFFICULTY.normal;

createGrid();
updateHUD();
wireUX();

// ===== Grid =====
function createGrid(){
  els.grid.innerHTML = "";
  for(let i=0;i<9;i++){
    const cell = document.createElement("div");
    cell.className = "grid-cell";
    els.grid.appendChild(cell);
  }
}

// ===== Game flow =====
function startGame(){
  if(running) return;
  resetState();
  running = true;
  els.start.disabled = true;
  setBanner("");
  setMsg("Round started. Tap clean, avoid dirty.");

  tickId = setInterval(()=>{
    timeLeft--;
    updateHUD();
    if(timeLeft<=0) endGame();
  }, 1000);

  spawnId = setInterval(spawnToken, spawnMs);
}

function endGame(){
  running = false;
  clearInterval(tickId); clearInterval(spawnId);
  els.start.disabled = false;
  wipeTokens();

  const win = score >= GOAL;
  const pool = win ? WIN_MESSAGES : LOSE_MESSAGES;
  setMsg((win ? "WIN: " : "TRY AGAIN: ") + pool[Math.floor(Math.random()*pool.length)]);

  if(score > best){
    best = score;
    localStorage.setItem("wq_best", String(best));
    els.best.textContent = best;
    setBanner("New best score!");
  }

  if(win) fireConfetti(1400);
}

function resetGame(){
  resetState();
  setBanner("");
  setMsg("Reset. Press Start to play.");
}

function resetState(){
  score=0; timeLeft=ROUND_TIME; lives=START_LIVES; streak=0;
  updateHUD();
  clearInterval(tickId); clearInterval(spawnId);
  wipeTokens();
}

function wipeTokens(){
  document.querySelectorAll(".grid-cell").forEach(c => c.innerHTML = "");
}

// ===== Spawning & interactions =====
function spawnToken(){
  if(!running) return;

  const cells = Array.from(document.querySelectorAll(".grid-cell"));
  cells.forEach(c => c.innerHTML = ""); // one token at a time

  const cell = cells[Math.floor(Math.random()*cells.length)];
  const isPollutant = Math.random() < POLLUTANT_CHANCE;

  cell.innerHTML = `
    <div class="water-can-wrapper">
      <div class="water-can ${isPollutant ? "pollutant" : "clean"}"></div>
    </div>
  `;
  const token = cell.querySelector(".water-can");
  let clicked = false;

  token.addEventListener("click", e=>{
    if(!running) return;
    clicked = true;
    ripple(e, cell);

    if(token.classList.contains("clean")){
      score += 1; streak += 1;
      setMsg("+1 clean can");
      milestoneCheck();
      pulse(token);
    }else{
      score = Math.max(0, score - 3);
      lives = Math.max(0, lives - 1);
      streak = 0;
      setMsg("dirty can: -3 • life -1");
      token.classList.add("shake");
      setTimeout(()=> token && token.classList.remove("shake"), 220);
      if(lives === 0){ updateHUD(); endGame(); return; }
    }
    updateHUD();
  }, { once:true });

  // miss penalty
  setTimeout(()=>{
    if(!clicked && running && token && token.classList.contains("clean")){
      score = Math.max(0, score - MISS_PENALTY);
      streak = 0;
      setMsg(`missed clean: -${MISS_PENALTY}`);
      updateHUD();
    }
    cell.innerHTML = "";
  }, spawnMs);
}

// ===== HUD + feedback =====
function updateHUD(){
  els.score.textContent = score;
  els.lives.textContent = lives;
  els.streak.textContent = streak;
  els.timer.textContent = timeLeft;
  els.progress.style.setProperty("--p", Math.max(0, timeLeft/ROUND_TIME));
}
function setMsg(t){ els.msg.textContent = t; }
function setBanner(t){ els.banner.textContent = t; }

function milestoneCheck(){
  if(score === 5)  setBanner("Milestone 5: you’re warmed up.");
  if(score === 10) setBanner("Milestone 10: keep the flow going.");
  if(score === 15) setBanner("Milestone 15: almost there.");
  if(score === GOAL) setBanner("Goal reached! Campus perk preview unlocked.");
}

function pulse(el){
  el.style.transform = "scale(1.12)";
  setTimeout(()=> el && (el.style.transform = "scale(1)"), 120);
}

function ripple(e, cell){
  const r = document.createElement("span");
  r.className = "ripple";
  const rect = cell.getBoundingClientRect();
  r.style.left = (e.clientX - rect.left) + "px";
  r.style.top  = (e.clientY - rect.top) + "px";
  cell.appendChild(r);
  setTimeout(()=> r.remove(), 520);
}

// ===== Confetti =====
function fireConfetti(duration=1200){
  const c=els.confetti, ctx=c.getContext("2d");
  c.width=innerWidth; c.height=innerHeight;
  const N=160, parts=Array.from({length:N},()=>({
    x:Math.random()*c.width, y:-10, vx:(Math.random()-0.5)*3, vy:2+Math.random()*3,
    r:2+Math.random()*3, color:Math.random()<.5?"#FFC907":"#2E9DF7"
  }));
  const t0=performance.now();
  (function loop(t){
    const dt=t-t0; ctx.clearRect(0,0,c.width,c.height);
    parts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
    if(dt<duration) requestAnimationFrame(loop); else ctx.clearRect(0,0,c.width,c.height);
  })(t0);
}

// ===== UX wiring =====
function wireUX(){
  els.start.addEventListener("click", startGame);
  els.reset.addEventListener("click", resetGame);

  // Theme switch -> swap body class
  els.themeSelect.addEventListener("change", (e)=>{
    const cls = e.target.value;
    document.body.classList.remove("theme-sky","theme-desert","theme-ocean","theme-neon");
    document.body.classList.add(cls);
  });

  // Difficulty switch (changes spawn rate next round)
  els.difficultySelect.addEventListener("change", (e)=>{
    spawnMs = DIFFICULTY[e.target.value] || DIFFICULTY.normal;
    setMsg(`Difficulty set to ${e.target.value}.`);
  });

  // Reduced motion
  els.reducedMotion.addEventListener("change", e=>{
    document.documentElement.classList.toggle("rm", e.target.checked);
  });
}
