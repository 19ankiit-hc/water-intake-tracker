/* ═══════════════════════════════════════════════════════════
   AQUA — Water Intake Tracker  |  script.js
   Author: Senior Frontend Developer
   Features: Tracking, Goals, Streak, Dark Mode, Tips, Toasts,
             Persistence (localStorage), Animations
═══════════════════════════════════════════════════════════ */

'use strict';

// ─── Constants ────────────────────────────────────────────
const ML_PER_GLASS   = 250;          // ml per glass
const STORAGE_KEY    = 'aqua_data';  // localStorage key
const DAYS_KEEP      = 30;           // days of history to keep

// ─── Motivational Messages ───────────────────────────────
const MESSAGES = [
  "Your cells are celebrating every sip you take. 💧",
  "Water is the driving force of all nature. — Leonardo da Vinci",
  "A well-hydrated mind thinks sharper. Stay clear.",
  "75% of people are chronically dehydrated — don't be one of them.",
  "Sip by sip, you're becoming a healthier version of yourself.",
  "Your skin, your joints, your brain — all thank you for this glass.",
  "Hydration is not a luxury. It's your body's most basic need.",
  "Even mild dehydration can reduce focus by 15%. Drink up!",
  "Great things are done by those who drink enough water.",
  "You're doing amazing — keep that hydration streak alive! 🌊",
];

// ─── Hydration Tips ─────────────────────────────────────
const TIPS = [
  "Drink a glass of water first thing in the morning to kickstart your metabolism.",
  "Keep a water bottle on your desk as a constant visual reminder.",
  "Drink a glass before each meal — it also aids digestion.",
  "Set hourly reminders on your phone to take a hydration break.",
  "Herbal teas and water-rich fruits count toward your daily intake.",
  "Dehydration can disguise itself as hunger — drink first before snacking.",
  "Add lemon, cucumber, or mint to your water for a refreshing twist.",
  "Drink an extra glass for every 30 minutes of exercise.",
  "Cold water can help you feel more alert during afternoon slumps.",
  "Your urine color is the best indicator of hydration — aim for pale yellow.",
  "Drink extra water during hot weather or air-conditioned environments.",
  "Avoid drinking large amounts all at once — sip steadily throughout the day.",
];

// ─── Status Levels ────────────────────────────────────────
const STATUS_LEVELS = [
  { minPct: 0,   maxPct: 25,  label: 'Dehydrated',     cls: 'low',   msg: 'Start hydrating now — your body needs it.' },
  { minPct: 25,  maxPct: 50,  label: 'Low Hydration',  cls: 'ok',    msg: 'You\'re on your way — keep the sips coming.' },
  { minPct: 50,  maxPct: 75,  label: 'Hydrating',      cls: 'good',  msg: 'Great progress! Over halfway to your goal.' },
  { minPct: 75,  maxPct: 101, label: 'Well Hydrated',  cls: 'great', msg: 'Excellent — you\'re hitting peak hydration!' },
];

// ─── Progress Status Messages ──────────────────────────
const PROGRESS_MSGS = [
  { pct: 0,   msg: 'Keep going — you\'re just getting started!' },
  { pct: 10,  msg: 'A great beginning. Keep the momentum!' },
  { pct: 25,  msg: 'Quarter of the way there. Excellent!' },
  { pct: 50,  msg: 'Halfway there — you\'re crushing it! 💪' },
  { pct: 75,  msg: 'Three-quarters done. Almost there!' },
  { pct: 90,  msg: 'So close! Just a few sips away from your goal.' },
  { pct: 100, msg: '🎉 Daily goal achieved! You\'re a hydration hero.' },
];

// ─── State ────────────────────────────────────────────────
let state = {
  today:          todayKey(),
  glasses:        0,
  goal:           8,
  streak:         0,
  lastGoalDate:   null,
  goalCelebrated: false,
  theme:          'dark',
  tipIndex:       0,
  motiveIndex:    0,
};

let tipIndex      = 0;
let motiveIndex   = 0;

// ─── DOM Refs ─────────────────────────────────────────────
const $  = id => document.getElementById(id);
const el = {
  dateDisplay:      $('dateDisplay'),
  streakCount:      $('streakCount'),
  themeToggle:      $('themeToggle'),
  themeIcon:        $('themeIcon'),

  // Bottle
  bottleFill:       $('bottleFill'),
  fillLiquid:       $('fillLiquid'),
  percentLabel:     $('percentLabel'),
  glassesToday:     $('glassesToday'),
  goalDisplay:      $('goalDisplay'),

  // Buttons
  btnDrink:         $('btnDrink'),
  btnUndo:          $('btnUndo'),
  btnReset:         $('btnReset'),
  btnSetGoal:       $('btnSetGoal'),
  goalInput:        $('goalInput'),
  goalDown:         $('goalDown'),
  goalUp:           $('goalUp'),

  // Stats
  statGlasses:      $('statGlasses'),
  statRemaining:    $('statRemaining'),
  statLiters:       $('statLiters'),
  statPct:          $('statPct'),

  // Progress
  progressFill:     $('progressFill'),
  progressPctLabel: $('progressPctLabel'),
  progressStatus:   $('progressStatus'),

  // Status
  statusDot:        $('statusDot'),
  statusText:       $('statusText'),
  statusPointer:    $('statusPointer'),

  // Banners
  motiveBanner:     $('motiveBanner'),
  motiveText:       $('motiveText'),
  tipText:          $('tipText'),
  btnNextTip:       $('btnNextTip'),

  // Achievement
  achievementOverlay:  $('achievementOverlay'),
  btnAchievementClose: $('btnAchievementClose'),
  sparkles:            $('sparkles'),

  toastContainer: $('toastContainer'),
};

/* ═══════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
═══════════════════════════════════════════════════════════ */

/** Returns today's date as YYYY-MM-DD string */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Formats a date string to a human-readable label */
function formatDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Clamps a value between min and max */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/** Returns the percentage (0–100) of glasses vs goal */
function pct() {
  return clamp(Math.round((state.glasses / state.goal) * 100), 0, 100);
}

/* ═══════════════════════════════════════════════════════════
   PERSISTENCE — localStorage
═══════════════════════════════════════════════════════════ */

/** Saves the full state object to localStorage */
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Aqua: Could not save to localStorage.', e);
  }
}

/** Loads state from localStorage, merges with defaults */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
  } catch (e) {
    console.warn('Aqua: Could not load state.', e);
  }
}

/**
 * Checks if it's a new day since last save.
 * Resets glasses + goalCelebrated; updates streak.
 */
function checkNewDay() {
  const today = todayKey();
  if (state.today !== today) {
    // Determine streak: was yesterday completed?
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);

    if (state.today === yKey && state.glasses >= state.goal) {
      // Completed yesterday → extend streak
      state.streak = (state.streak || 0) + 1;
    } else if (state.today !== yKey) {
      // Missed a day → reset streak
      state.streak = 0;
    }

    // Fresh day
    state.today          = today;
    state.glasses        = 0;
    state.goalCelebrated = false;
    saveState();
  }
}

/* ═══════════════════════════════════════════════════════════
   UI RENDERING
═══════════════════════════════════════════════════════════ */

/** Master render — updates ALL UI from state */
function render() {
  const p = pct();
  const remaining = Math.max(state.goal - state.glasses, 0);
  const liters    = ((state.glasses * ML_PER_GLASS) / 1000).toFixed(1);

  // ── Header
  el.streakCount.textContent = state.streak || 0;
  el.dateDisplay.textContent = formatDate(state.today);

  // ── Bottle
  const fillH = Math.min(p, 100);
  el.bottleFill.style.height  = fillH + '%';
  el.percentLabel.textContent = p + '%';
  el.percentLabel.style.color = p >= 100
    ? 'var(--success)'
    : p >= 75
      ? 'var(--accent)'
      : 'var(--water-bright)';

  el.glassesToday.textContent = state.glasses;
  el.goalDisplay.textContent  = state.goal;

  // ── Stats cards
  el.statGlasses.textContent   = state.glasses;
  el.statRemaining.textContent = remaining;
  el.statLiters.textContent    = liters + 'L';
  el.statPct.textContent       = p + '%';

  // Colour the remaining card red if at 0
  const cardRemaining = document.getElementById('cardRemaining');
  if (remaining === 0) {
    cardRemaining.style.borderColor = 'rgba(0,229,160,0.3)';
  } else {
    cardRemaining.style.borderColor = '';
  }

  // ── Progress bar
  el.progressFill.style.width   = p + '%';
  el.progressPctLabel.textContent = p + '%';

  // Progress status message — pick the highest threshold below p
  const pmsg = [...PROGRESS_MSGS].reverse().find(m => p >= m.pct);
  if (pmsg) el.progressStatus.textContent = pmsg.msg;

  // ── Status indicator
  const level = STATUS_LEVELS.find(l => p >= l.minPct && p < l.maxPct)
    || STATUS_LEVELS[STATUS_LEVELS.length - 1];

  // Clear old classes
  el.statusDot.className = 'status-dot ' + level.cls;
  el.statusText.textContent = level.label;

  // Pointer position (0–100% across the bar)
  el.statusPointer.style.left = clamp(p, 2, 98) + '%';

  // Highlight the active zone
  document.querySelectorAll('.status-zone').forEach((z, i) => {
    const levels = ['low', 'ok', 'good', 'great'];
    z.style.opacity = level.cls === levels[i] ? '1' : '0.35';
  });

  // ── Goal Input sync
  el.goalInput.value = state.goal;

  // ── Theme icon
  el.themeIcon.textContent = state.theme === 'dark' ? '☀' : '☽';

  // ── Wave visibility — only animate when there's water
  document.querySelectorAll('.wave').forEach(w => {
    w.style.opacity = state.glasses > 0 ? '1' : '0';
  });
}

/* ═══════════════════════════════════════════════════════════
   ACTIONS
═══════════════════════════════════════════════════════════ */

/** Adds one glass of water */
function drinkGlass() {
  state.glasses++;
  saveState();

  // Animate the drink button
  el.btnDrink.classList.remove('drink-pulse');
  void el.btnDrink.offsetWidth; // reflow
  el.btnDrink.classList.add('drink-pulse');

  // Bump all stat values
  bumpStats();

  // Update the motivational message
  rotateMotivation();

  render();

  // Check goal reached (only celebrate once per day)
  if (state.glasses >= state.goal && !state.goalCelebrated) {
    state.goalCelebrated = true;
    state.streak = (state.streak || 0) + (state.glasses === state.goal ? 1 : 0);
    saveState();
    setTimeout(showAchievement, 600);
  } else {
    const remaining = state.goal - state.glasses;
    if (remaining > 0) {
      toast(`💧 Glass added! ${remaining} more to go.`, 'info');
    }
  }
}

/** Removes the last glass (undo) */
function undoGlass() {
  if (state.glasses <= 0) {
    toast('Nothing to undo yet.', 'warning');
    return;
  }
  state.glasses--;
  // Reset celebration flag if we're below goal again
  if (state.glasses < state.goal) state.goalCelebrated = false;
  saveState();
  bumpStats();
  render();
  toast('↩ Last glass removed.', 'warning');
}

/** Resets today's count */
function resetDay() {
  if (state.glasses === 0) {
    toast('Already at zero!', 'warning');
    return;
  }
  if (!confirm('Reset today\'s progress to zero?')) return;
  state.glasses        = 0;
  state.goalCelebrated = false;
  saveState();
  render();
  toast('✕ Today\'s count reset.', 'warning');
}

/** Sets a new daily goal */
function setGoal() {
  const newGoal = parseInt(el.goalInput.value, 10);
  if (isNaN(newGoal) || newGoal < 1 || newGoal > 30) {
    toast('Please enter a goal between 1 and 30.', 'warning');
    return;
  }
  state.goal = newGoal;
  // If we've already exceeded the new goal, flag as celebrated
  if (state.glasses >= state.goal && !state.goalCelebrated) {
    state.goalCelebrated = true;
  }
  saveState();
  render();
  toast(`🎯 Goal updated to ${newGoal} glasses.`, 'success');
}

/* ═══════════════════════════════════════════════════════════
   ACHIEVEMENT OVERLAY
═══════════════════════════════════════════════════════════ */

function showAchievement() {
  el.achievementOverlay.classList.add('active');
  el.achievementOverlay.setAttribute('aria-hidden', 'false');
  spawnSparkles();
  toast('🏆 Daily goal reached! Amazing job!', 'success');
}

function hideAchievement() {
  el.achievementOverlay.classList.remove('active');
  el.achievementOverlay.setAttribute('aria-hidden', 'true');
}

/** Creates animated sparkle particles inside the achievement card */
function spawnSparkles() {
  el.sparkles.innerHTML = '';
  const count = 30;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'sparkle';

    const angle   = Math.random() * 360;
    const dist    = 80 + Math.random() * 120;
    const dx      = Math.cos(angle * Math.PI / 180) * dist;
    const dy      = Math.sin(angle * Math.PI / 180) * dist;
    const dur     = 0.6 + Math.random() * 0.8;
    const delay   = Math.random() * 0.4;

    s.style.cssText = `
      left: ${40 + Math.random() * 20}%;
      top:  ${30 + Math.random() * 20}%;
      --dx: ${dx}px;
      --dy: ${dy}px;
      --dur: ${dur}s;
      animation-delay: ${delay}s;
      background: hsl(${180 + Math.random() * 60}, 100%, 70%);
      width: ${4 + Math.random() * 6}px;
      height: ${4 + Math.random() * 6}px;
    `;
    el.sparkles.appendChild(s);
  }
}

/* ═══════════════════════════════════════════════════════════
   TOASTS
═══════════════════════════════════════════════════════════ */

/** Shows a temporary toast notification */
function toast(message, type = 'info', duration = 3000) {
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  el.toastContainer.appendChild(t);

  setTimeout(() => {
    t.classList.add('exit');
    setTimeout(() => t.remove(), 350);
  }, duration);
}

/* ═══════════════════════════════════════════════════════════
   ANIMATIONS HELPERS
═══════════════════════════════════════════════════════════ */

/** Briefly bumps the stat values to show change */
function bumpStats() {
  [el.statGlasses, el.statRemaining, el.statLiters, el.statPct].forEach(el => {
    el.classList.remove('stat-bump');
    void el.offsetWidth;
    el.classList.add('stat-bump');
  });
}

/** Rotates the motivational message */
function rotateMotivation() {
  motiveIndex = (motiveIndex + 1) % MESSAGES.length;
  el.motiveText.style.opacity = '0';
  setTimeout(() => {
    el.motiveText.textContent = MESSAGES[motiveIndex];
    el.motiveText.style.transition = 'opacity 0.5s';
    el.motiveText.style.opacity = '1';
  }, 300);
}

/** Advances to the next hydration tip */
function nextTip() {
  tipIndex = (tipIndex + 1) % TIPS.length;
  el.tipText.style.opacity = '0';
  setTimeout(() => {
    el.tipText.textContent = TIPS[tipIndex];
    el.tipText.style.transition = 'opacity 0.5s';
    el.tipText.style.opacity = '1';
  }, 250);
}

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
═══════════════════════════════════════════════════════════ */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  el.themeIcon.textContent = theme === 'dark' ? '☀' : '☽';
  saveState();
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

/* ═══════════════════════════════════════════════════════════
   GOAL STEPPER BUTTONS
═══════════════════════════════════════════════════════════ */

function goalStep(delta) {
  const current = parseInt(el.goalInput.value, 10) || state.goal;
  el.goalInput.value = clamp(current + delta, 1, 30);
}

/* ═══════════════════════════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════════════════════════ */

function bindEvents() {
  // Core actions
  el.btnDrink.addEventListener('click', drinkGlass);
  el.btnUndo.addEventListener('click', undoGlass);
  el.btnReset.addEventListener('click', resetDay);
  el.btnSetGoal.addEventListener('click', setGoal);

  // Goal input — set on Enter key
  el.goalInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') setGoal();
  });

  // Goal steppers
  el.goalDown.addEventListener('click', () => goalStep(-1));
  el.goalUp.addEventListener('click',   () => goalStep(1));

  // Achievement close
  el.btnAchievementClose.addEventListener('click', hideAchievement);
  el.achievementOverlay.addEventListener('click', e => {
    if (e.target === el.achievementOverlay) hideAchievement();
  });

  // Tips
  el.btnNextTip.addEventListener('click', nextTip);

  // Theme
  el.themeToggle.addEventListener('click', toggleTheme);

  // Keyboard shortcut: W = drink, U = undo
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'w' || e.key === 'W') drinkGlass();
    if (e.key === 'u' || e.key === 'U') undoGlass();
  });
}

/* ═══════════════════════════════════════════════════════════
   AUTO-CYCLE MOTIVATIONAL MESSAGES
═══════════════════════════════════════════════════════════ */

function startMotivationCycle() {
  // Show a new message every 30 seconds
  setInterval(() => {
    if (state.glasses === 0) return; // Only cycle when user is active
    rotateMotivation();
  }, 30_000);
}

/* ═══════════════════════════════════════════════════════════
   INITIALISATION
═══════════════════════════════════════════════════════════ */

function init() {
  // 1. Load persisted state
  loadState();

  // 2. Check if it's a new day
  checkNewDay();

  // 3. Apply stored theme
  applyTheme(state.theme || 'dark');

  // 4. Seed tip & motivational message indices randomly
  tipIndex     = Math.floor(Math.random() * TIPS.length);
  motiveIndex  = Math.floor(Math.random() * MESSAGES.length);
  el.tipText.textContent    = TIPS[tipIndex];
  el.motiveText.textContent = MESSAGES[motiveIndex];

  // 5. Bind all events
  bindEvents();

  // 6. Initial render
  render();

  // 7. Start motivation cycle
  startMotivationCycle();

  // 8. Console welcome
  console.log(
    '%c💧 Aqua — Water Intake Tracker loaded successfully.',
    'color: #00d4ff; font-family: monospace; font-size: 13px;'
  );
  console.log(
    '%cTip: Press W to drink, U to undo.',
    'color: #7aafd4; font-family: monospace; font-size: 11px;'
  );
}

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
