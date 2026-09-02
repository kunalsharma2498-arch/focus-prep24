import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc,
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, updateDoc as updateFirestoreDoc
} from "firebase/firestore";
import {
  CheckCircle2, Circle, Plus, X, Play, Pause, RotateCcw,
  ListTodo, Timer as TimerIcon, TrendingUp, NotebookPen,
  Trash2, ChevronDown, ChevronRight, ClipboardList, Settings2
} from "lucide-react";

const C = {
  paper: "#FAF9F4",
  paperRaised: "#FFFFFF",
  ink: "#2B2E4A",
  inkSoft: "#5B5E7A",
  line: "#DFDACB",
  sage: "#5B7B7A",
  sageSoft: "#E4ECEA",
  clay: "#C97B4A",
  claySoft: "#F5E4D8",
  green: "#5C8A63",
  greenSoft: "#E4EDE4",
  gold: "#D4A843",
};

const DISPLAY_FONT = "'Iowan Old Style', Georgia, serif";
const BODY_FONT = "ui-sans-serif, -apple-system, sans-serif";
const SUBJECT_PALETTE = ["#5B7B7A", "#C97B4A", "#7C6FA6", "#4B7CA6", "#5C8A63"];

function uid() { return Math.random().toString(36).slice(2, 10); }
function todayISO() { return new Date().toISOString().slice(0, 10); }

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - new Date(todayISO())) / 86400000);
}

function dueLabel(dateStr) {
  const n = daysUntil(dateStr);
  if (n === null) return "";
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return "due today";
  if (n === 1) return "due tomorrow";
  return `due in ${n}d`;
}

function hoursLabel(minutes) {
  const h = minutes / 60;
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`;
}

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function dayShortLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: "narrow" });
}

function colorForSubject(name, subjects) {
  const idx = subjects.findIndex((s) => s.name === name);
  return SUBJECT_PALETTE[(idx < 0 ? 0 : idx) % SUBJECT_PALETTE.length];
}

const inputStyle = {
  border: `1px solid ${C.line}`,
  borderRadius: 8,
  padding: "9px 10px",
  fontSize: 14,
  background: C.paper,
  color: C.ink,
  outline: "none",
  fontFamily: BODY_FONT,
  width: "100%",
  boxSizing: "border-box"
};

const solidBtn = {
  background: C.ink,
  color: C.paper,
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer"
};

const ghostBtn = {
  background: "transparent",
  color: C.inkSoft,
  border: `1px solid ${C.line}`,
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4
};

const solidPillBtn = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: C.ink,
  color: C.paper,
  border: "none",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 13,
  cursor: "pointer"
};

const formCard = {
  background: C.paperRaised,
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: 12,
  marginBottom: 14,
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const pillBtn = (active) => ({
  padding: "4px 10px",
  borderRadius: 12,
  border: `1px solid ${active ? C.sage : C.line}`,
  background: active ? C.sageSoft : "transparent",
  color: active ? C.sage : C.inkSoft,
  fontSize: 11,
  cursor: "pointer"
});

function EmptyState({ text }) {
  return (
    <div style={{
      border: `1px dashed ${C.line}`,
      borderRadius: 10,
      padding: "26px 16px",
      textAlign: "center",
      color: C.inkSoft,
      fontSize: 13
    }}>
      {text}
    </div>
  );
}

function K24Logo({ size = 40, withText = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.sage}, ${C.gold})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: `0 2px 8px rgba(91, 123, 122, 0.3)`,
      }}>
        <span style={{
          fontFamily: DISPLAY_FONT,
          fontSize: size * 0.45,
          fontWeight: "bold",
          color: "#FFFFFF",
          textShadow: "0 1px 3px rgba(0,0,0,0.2)",
          letterSpacing: -1,
        }}>
          K24
        </span>
        <div style={{
          position: "absolute",
          bottom: size * 0.08,
          right: size * 0.08,
          width: size * 0.12,
          height: size * 0.12,
          borderRadius: "50%",
          background: C.gold,
          border: `2px solid white`,
        }} />
      </div>
      {withText && (
        <span style={{
          fontFamily: DISPLAY_FONT,
          fontSize: size * 0.5,
          color: C.ink,
          fontWeight: "bold",
          letterSpacing: 1,
        }}>
          Focus Prep
        </span>
      )}
    </div>
  );
}

function Auth({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onAuth();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{
      maxWidth: 320,
      margin: "60px auto",
      padding: 24,
      background: C.paper,
      border: `1px solid ${C.line}`,
      borderRadius: 16,
      boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
    }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <K24Logo size={56} withText={true} />
        <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>
          {isLogin ? "Welcome back" : "Start your journey"}
        </div>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        <button type="submit" style={solidBtn}>{isLogin ? "Sign in" : "Create account"}</button>
        {error && <div style={{ color: C.clay, fontSize: 13, textAlign: "center" }}>{error}</div>}
        <button type="button" onClick={() => setIsLogin(!isLogin)} style={{
          background: "none",
          border: "none",
          color: C.sage,
          textDecoration: "underline",
          cursor: "pointer",
          fontSize: 13,
          padding: 8,
        }}>
          {isLogin ? "Create account" : "Already have an account?"}
        </button>
      </form>
    </div>
  );
}

function useCollection(collectionName, userId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, collectionName), where("userId", "==", userId));
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [collectionName, userId]);

  return { data, loading };
}

function useLiveStatus(userId) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!userId) {
      setStatus(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "userStatus", userId), (doc) => {
      if (doc.exists()) {
        setStatus(doc.data());
      } else {
        setStatus({ mode: 'idle', isRunning: false });
      }
    });
    return unsub;
  }, [userId]);

  return status;
}

async function addItem(collectionName, item, userId) {
  await addDoc(collection(db, collectionName), { ...item, userId });
}

async function updateItem(collectionName, id, updates) {
  await updateFirestoreDoc(doc(db, collectionName, id), updates);
}

async function deleteItem(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}

async function updateLiveStatus(userId, data) {
  await setDoc(doc(db, "userStatus", userId), {
    ...data,
    userId,
    lastUpdated: new Date().toISOString()
  }, { merge: true });
}

function FriendLiveStatus({ friendUID }) {
  const status = useLiveStatus(friendUID);

  if (!status || status.mode === 'idle' || !status.isRunning) {
    return (
      <div style={{
        background: C.paperRaised,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
        <span style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#999"
        }}></span>
        <span style={{ fontSize: 14, color: C.inkSoft }}>Friend is idle</span>
      </div>
    );
  }

  const isFocus = status.mode === 'focus';
  const isRunning = status.isRunning;
  const mm = String(Math.floor(status.secondsLeft / 60)).padStart(2, "0");
  const ss = String(status.secondsLeft % 60).padStart(2, "0");
  const dotColor = isFocus ? C.sage : C.clay;
  const statusText = isFocus ? "Focusing" : "On break";
  const totalSeconds = isFocus ? status.focusMinutes * 60 : status.breakMinutes * 60;
  const progress = totalSeconds > 0 ? 1 - (status.secondsLeft / totalSeconds) : 0;

  return (
    <div style={{
      background: C.paperRaised,
      border: `1px solid ${isFocus ? C.sage : C.clay}`,
      borderLeft: `4px solid ${isFocus ? C.sage : C.clay}`,
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 12
    }}>
      <div style={{ position: "relative" }}>
        <span style={{
          display: "inline-block",
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: isRunning ? dotColor : "#999",
          animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none'
        }}></span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          Friend is {statusText}
          {isRunning && ` · ${mm}:${ss}`}
        </div>
        <div style={{ fontSize: 12, color: C.inkSoft }}>
          {isRunning ? `${isFocus ? 'Focus' : 'Break'} session in progress` : 'Paused'}
        </div>
      </div>
      {isRunning && (
        <div style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: `conic-gradient(${dotColor} ${progress * 360}deg, ${C.line} 0deg)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: C.paper,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 600,
            color: C.ink
          }}>
            {mm}
          </div>
        </div>
      )}
    </div>
  );
}

function FriendStatusBadge({ friendUID }) {
  const status = useLiveStatus(friendUID);

  let dotColor = "#999";
  let label = "Idle";
  if (status?.mode === 'focus' && status.isRunning) {
    dotColor = C.sage;
    label = "Focusing";
  } else if (status?.mode === 'break' && status.isRunning) {
    dotColor = C.clay;
    label = "Break";
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 11,
      color: C.inkSoft,
      background: C.paperRaised,
      padding: "4px 10px",
      borderRadius: 20,
      border: `1px solid ${C.line}`
    }}>
      <span style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: dotColor,
        animation: status?.isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none'
      }}></span>
      <span>Friend: {label}</span>
    </div>
  );
}

function TasksTab({ tasks, subjects, user, viewMode, setViewMode, friendUID }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0]?.name || "");
  const [due, setDue] = useState(todayISO());

  useEffect(() => { if (!subject && subjects[0]) setSubject(subjects[0].name); }, [subjects]);

  const addTask = async () => {
    if (!title.trim()) return;
    await addItem("tasks", { title: title.trim(), subject, due, done: false }, user.uid);
    setTitle("");
    setShowForm(false);
  };
  const toggle = async (id) => { const task = tasks.find(t => t.id === id); await updateItem("tasks", id, { done: !task.done }); };
  const remove = async (id) => { await deleteItem("tasks", id); };

  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(a.due) - new Date(b.due);
  });
  const openCount = tasks.filter(t => !t.done).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.inkSoft }}>{openCount === 0 ? "Nothing outstanding" : `${openCount} open`}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {friendUID && <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setViewMode("mine")} style={pillBtn(viewMode === "mine")}>My</button>
            <button onClick={() => setViewMode("friend")} style={pillBtn(viewMode === "friend")}>Friend</button>
          </div>}
          <button onClick={() => setShowForm(s => !s)} style={solidPillBtn}><Plus size={15} /> Add</button>
        </div>
      </div>
      {showForm && (
        <div style={formCard}>
          <input autoFocus placeholder="Chapter, PYQs, revision…" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              {subjects.length === 0 && <option value="">General</option>}
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
            <button onClick={addTask} style={solidBtn}>Save</button>
          </div>
        </div>
      )}
      {sorted.length === 0 && !showForm ? <EmptyState text="Add a chapter to revise, a PYQ set, or a mock test." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map(t => {
            const overdue = !t.done && daysUntil(t.due) < 0;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.paperRaised, border: `1px solid ${C.line}`, borderLeft: `3px solid ${colorForSubject(t.subject, subjects)}`, borderRadius: 8, padding: "10px 12px", opacity: t.done ? 0.55 : 1 }}>
                <button onClick={() => toggle(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.done ? C.green : C.inkSoft }}>{t.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, textDecoration: t.done ? "line-through" : "none" }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{t.subject || "General"}{t.due ? ` · ${dueLabel(t.due)}` : ""}</div>
                </div>
                {overdue && <span style={{ fontSize: 11, background: C.claySoft, color: C.clay, padding: "2px 7px", borderRadius: 6 }}>late</span>}
                <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TimerTab({ focusLog, user, friendUID }) {
  const [timerSettings, setTimerSettings] = useState({ focusMinutes: 25, breakMinutes: 5 });
  const [mode, setMode] = useState("focus");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [range, setRange] = useState("week");
  const [showEdit, setShowEdit] = useState(false);
  const [focusInput, setFocusInput] = useState("25");
  const [breakInput, setBreakInput] = useState("5");
  const intervalRef = useRef(null);
  const FOCUS = timerSettings.focusMinutes * 60;
  const BREAK = timerSettings.breakMinutes * 60;

  useEffect(() => {
    const updateStatus = async () => {
      await updateLiveStatus(user.uid, { mode, isRunning: running, secondsLeft, focusMinutes: timerSettings.focusMinutes, breakMinutes: timerSettings.breakMinutes, startTime: running ? new Date().toISOString() : null });
    };
    updateStatus();
  }, [mode, running, secondsLeft, timerSettings, user.uid]);

  useEffect(() => { return () => { updateLiveStatus(user.uid, { mode: 'idle', isRunning: false, secondsLeft: 0 }); }; }, [user.uid]);

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          if (mode === "focus") { addItem("focusLog", { date: todayISO(), minutes: FOCUS / 60 }, user.uid); setMode("break"); return BREAK; } 
          else { setMode("focus"); return FOCUS; }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, mode, FOCUS, BREAK, user.uid]);

  const reset = useCallback(() => { setRunning(false); clearInterval(intervalRef.current); setSecondsLeft(mode === "focus" ? FOCUS : BREAK); }, [mode, FOCUS, BREAK]);
  const switchMode = (m) => { setRunning(false); clearInterval(intervalRef.current); setMode(m); setSecondsLeft(m === "focus" ? FOCUS : BREAK); };
  const saveEdit = () => {
    const f = Math.min(180, Math.max(1, parseInt(focusInput, 10) || timerSettings.focusMinutes));
    const b = Math.min(60, Math.max(1, parseInt(breakInput, 10) || timerSettings.breakMinutes));
    setTimerSettings({ focusMinutes: f, breakMinutes: b });
    if (!running) { setSecondsLeft(mode === "focus" ? f * 60 : b * 60); }
    setShowEdit(false);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const total = mode === "focus" ? FOCUS : BREAK;
  const pct = total > 0 ? 1 - secondsLeft / total : 0;
  const ringColor = mode === "focus" ? C.sage : C.clay;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {friendUID && <FriendLiveStatus friendUID={friendUID} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        {["focus", "break"].map(m => (
          <button key={m} onClick={() => switchMode(m)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${mode === m ? ringColor : C.line}`, background: mode === m ? (m === "focus" ? C.sageSoft : C.claySoft) : "transparent", color: mode === m ? ringColor : C.inkSoft, fontSize: 13, cursor: "pointer" }}>
            {m === "focus" ? `Focus ${timerSettings.focusMinutes}m` : `Break ${timerSettings.breakMinutes}m`}
          </button>
        ))}
        <button onClick={() => setShowEdit(!showEdit)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", border: `1px solid ${showEdit ? C.sage : C.line}`, background: showEdit ? C.sageSoft : "transparent", color: showEdit ? C.sage : C.inkSoft, cursor: "pointer" }}><Settings2 size={15} /></button>
      </div>
      {showEdit && (
        <div style={{ ...formCard, width: "100%", maxWidth: 320, marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: C.inkSoft }}>Set focus & break minutes</div>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 4 }}>Focus</div><input type="number" min={1} max={180} value={focusInput} onChange={(e) => setFocusInput(e.target.value)} style={inputStyle} /></label>
            <label style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 4 }}>Break</div><input type="number" min={1} max={60} value={breakInput} onChange={(e) => setBreakInput(e.target.value)} style={inputStyle} /></label>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowEdit(false)} style={ghostBtn}>Cancel</button>
            <button onClick={saveEdit} style={solidBtn}>Save</button>
          </div>
        </div>
      )}
      <div style={{ width: 220, height: 220, borderRadius: "50%", background: `conic-gradient(${ringColor} ${pct * 360}deg, ${C.line} 0deg)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <div style={{ width: 188, height: 188, borderRadius: "50%", background: C.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 42 }}>{mm}:{ss}</div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{mode === "focus" ? "stay with it" : "step away"}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 26 }}>
        <button onClick={() => setRunning(r => !r)} style={{ ...solidBtn, display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", fontSize: 14 }}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? "Pause" : "Start"}</button>
        <button onClick={reset} style={{ ...ghostBtn, display: "flex", alignItems: "center", gap: 6, padding: "10px 16px" }}><RotateCcw size={16} /> Reset</button>
      </div>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 22 }}>{focusLog.length} focus {focusLog.length === 1 ? "session" : "sessions"} completed</div>
      <FocusHoursSummary focusLog={focusLog} range={range} setRange={setRange} />
    </div>
  );
}

function FocusHoursSummary({ focusLog, range, setRange }) {
  const days = last7Days();
  const minutesByDay = days.map(d => focusLog.filter(f => f.date === d).reduce((sum, f) => sum + f.minutes, 0));
  const todayMinutes = minutesByDay[minutesByDay.length - 1];
  const weekMinutes = minutesByDay.reduce((a, b) => a + b, 0);
  const maxMinutes = Math.max(60, ...minutesByDay);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["day", "week"].map(r => (
          <button key={r} onClick={() => setRange(r)} style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${range === r ? C.sage : C.line}`, background: range === r ? C.sageSoft : "transparent", color: range === r ? C.sage : C.inkSoft, fontSize: 12, cursor: "pointer" }}>{r === "day" ? "Today" : "This week"}</button>
        ))}
      </div>
      {range === "day" ? (
        <div style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 32, color: C.ink }}>{hoursLabel(todayMinutes)}</div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>focused today</div>
        </div>
      ) : (
        <div style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 10, padding: "14px 12px 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.inkSoft }}>Last 7 days</span>
            <span style={{ fontSize: 13, color: C.ink }}>{hoursLabel(weekMinutes)} total</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
            {days.map((d, i) => {
              const m = minutesByDay[i];
              const barPct = Math.max(4, (m / maxMinutes) * 100);
              const isToday = d === todayISO();
              return (
                <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div title={`${d} · ${hoursLabel(m)}`} style={{ width: "100%", height: `${barPct}%`, background: isToday ? C.sage : C.sageSoft, borderRadius: "3px 3px 0 0", minHeight: 4 }} />
                  <span style={{ fontSize: 10, color: isToday ? C.sage : C.inkSoft }}>{dayShortLabel(d)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TestsTab({ coachingTests, visibleSubjects, user }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayISO());
  const [subject, setSubject] = useState(visibleSubjects[0]?.name || "");
  const [openTestId, setOpenTestId] = useState(null);
  const [chapterInput, setChapterInput] = useState("");

  useEffect(() => { if (!subject && visibleSubjects[0]) setSubject(visibleSubjects[0].name); }, [visibleSubjects]);

  const addTest = async () => {
    if (!name.trim()) return;
    await addItem("coachingTests", { name: name.trim(), date, subject, chapters: [] }, user.uid);
    setName("");
    setShowForm(false);
  };
  const removeTest = async (id) => { await deleteItem("coachingTests", id); };
  const addChapter = async (testId) => {
    if (!chapterInput.trim()) return;
    const test = coachingTests.find(t => t.id === testId);
    const newChapters = [...(test.chapters || []), { id: uid(), name: chapterInput.trim(), done: false }];
    await updateItem("coachingTests", testId, { chapters: newChapters });
    setChapterInput("");
  };
  const toggleChapter = async (testId, chapterId) => {
    const test = coachingTests.find(t => t.id === testId);
    const newChapters = test.chapters.map(c => c.id === chapterId ? { ...c, done: !c.done } : c);
    await updateItem("coachingTests", testId, { chapters: newChapters });
  };
  const removeChapter = async (testId, chapterId) => {
    const test = coachingTests.find(t => t.id === testId);
    const newChapters = test.chapters.filter(c => c.id !== chapterId);
    await updateItem("coachingTests", testId, { chapters: newChapters });
  };

  const sorted = [...coachingTests].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = sorted.filter(t => daysUntil(t.date) >= 0);
  const past = sorted.filter(t => daysUntil(t.date) < 0);

  const renderTest = (t) => {
    const chapters = t.chapters || [];
    const doneCount = chapters.filter(c => c.done).length;
    const pct = chapters.length ? Math.round((doneCount / chapters.length) * 100) : 0;
    const fullyReady = chapters.length > 0 && doneCount === chapters.length;
    const open = openTestId === t.id;
    const nDays = daysUntil(t.date);
    return (
      <div key={t.id} style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderLeft: `3px solid ${fullyReady ? C.green : colorForSubject(t.subject, visibleSubjects)}`, borderRadius: 8 }}>
        <button onClick={() => setOpenTestId(open ? null : t.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
          {open ? <ChevronDown size={16} color={C.inkSoft} /> : <ChevronRight size={16} color={C.inkSoft} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: C.ink }}>{t.name}</div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{t.subject || "General"} · {nDays < 0 ? `${Math.abs(nDays)}d ago` : nDays === 0 ? "today" : `in ${nDays}d`}{chapters.length ? ` · ${doneCount}/${chapters.length} chapters` : ""}</div>
          </div>
          {fullyReady ? <span style={{ fontSize: 11, background: C.greenSoft, color: C.green, padding: "3px 8px", borderRadius: 6 }}>ready</span> : chapters.length > 0 ? <div style={{ width: 60, height: 6, background: C.line, borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: colorForSubject(t.subject, visibleSubjects) }} /></div> : null}
          <span onClick={(e) => { e.stopPropagation(); removeTest(t.id); }} style={{ color: C.inkSoft, cursor: "pointer", display: "flex" }}><Trash2 size={15} /></span>
        </button>
        {open && (
          <div style={{ padding: "0 12px 12px" }}>
            {chapters.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
              {chapters.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => toggleChapter(t.id, c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: c.done ? C.green : C.inkSoft }}>{c.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}</button>
                  <span style={{ flex: 1, fontSize: 13, textDecoration: c.done ? "line-through" : "none", opacity: c.done ? 0.6 : 1 }}>{c.name}</span>
                  <button onClick={() => removeChapter(t.id, c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><X size={13} /></button>
                </div>
              ))}
            </div>}
            <div style={{ display: "flex", gap: 6 }}>
              <input placeholder="Add a chapter" value={chapterInput} onChange={(e) => setChapterInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addChapter(t.id); }} style={{ ...inputStyle, flex: 1, padding: "7px 9px", fontSize: 13 }} />
              <button onClick={() => addChapter(t.id)} style={{ ...ghostBtn, padding: "7px 10px" }}>Add</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.inkSoft }}>{upcoming.length === 0 ? "No upcoming tests" : `${upcoming.length} upcoming`}</div>
        <button onClick={() => setShowForm(s => !s)} style={solidPillBtn}><Plus size={15} /> Add test</button>
      </div>
      {showForm && (
        <div style={formCard}>
          <input autoFocus placeholder="Test name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              {visibleSubjects.length === 0 && <option value="">General</option>}
              {visibleSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
            <button onClick={addTest} style={solidBtn}>Save</button>
          </div>
        </div>
      )}
      {upcoming.length === 0 && past.length === 0 && !showForm ? <EmptyState text="Add your next coaching test and list the chapters." /> : (
        <>
          {upcoming.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: past.length ? 18 : 0 }}>{upcoming.map(renderTest)}</div>}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>Past tests</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.7 }}>{past.map(renderTest)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProgressTab({ subjects, visibleSubjects, examFocus, mocks, user, viewMode, setViewMode, friendUID }) {
  const [openSubjectId, setOpenSubjectId] = useState(null);
  const [chapterInput, setChapterInput] = useState("");
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectExam, setNewSubjectExam] = useState(examFocus === "JEE" ? "JEE" : "NEET");
  const [showMockForm, setShowMockForm] = useState(false);
  const [mockExam, setMockExam] = useState(examFocus === "JEE" ? "JEE" : "NEET");
  const [mockScore, setMockScore] = useState("");
  const [mockMax, setMockMax] = useState(mockExam === "NEET" ? "720" : "300");
  const [mockDate, setMockDate] = useState(todayISO());

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    await addItem("subjects", { name: newSubjectName.trim(), exam: newSubjectExam, chapters: [] }, user.uid);
    setNewSubjectName("");
    setShowSubjectForm(false);
  };
  const removeSubject = async (id) => { await deleteItem("subjects", id); };
  const addChapter = async (subjectId) => {
    if (!chapterInput.trim()) return;
    const subj = subjects.find(s => s.id === subjectId);
    const newChapters = [...(subj.chapters || []), { id: uid(), name: chapterInput.trim(), done: false }];
    await updateItem("subjects", subjectId, { chapters: newChapters });
    setChapterInput("");
  };
  const toggleChapter = async (subjectId, chapterId) => {
    const subj = subjects.find(s => s.id === subjectId);
    const newChapters = subj.chapters.map(c => c.id === chapterId ? { ...c, done: !c.done } : c);
    await updateItem("subjects", subjectId, { chapters: newChapters });
  };
  const removeChapter = async (subjectId, chapterId) => {
    const subj = subjects.find(s => s.id === subjectId);
    const newChapters = subj.chapters.filter(c => c.id !== chapterId);
    await updateItem("subjects", subjectId, { chapters: newChapters });
  };
  const addMock = async () => {
    const score = parseFloat(mockScore);
    const max = parseFloat(mockMax);
    if (isNaN(score) || isNaN(max) || max <= 0) return;
    await addItem("mocks", { exam: mockExam, score, max, date: mockDate }, user.uid);
    setMockScore("");
    setShowMockForm(false);
  };
  const removeMock = async (id) => { await deleteItem("mocks", id); };

  const relevantMocks = mocks.filter(m => examFocus === "Both" || m.exam === examFocus).sort((a, b) => new Date(a.date) - new Date(b.date));
  const recentMocks = relevantMocks.slice(-8);
  const bestPct = relevantMocks.length ? Math.max(...relevantMocks.map(m => (m.score / m.max) * 100)) : null;
  const avgPct = relevantMocks.length ? relevantMocks.reduce((sum, m) => sum + (m.score / m.max) * 100, 0) / relevantMocks.length : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: C.inkSoft }}>Mock tests</div>
        <div style={{ display: "flex", gap: 6 }}>
          {friendUID && <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setViewMode("mine")} style={pillBtn(viewMode === "mine")}>My</button>
            <button onClick={() => setViewMode("friend")} style={pillBtn(viewMode === "friend")}>Friend</button>
          </div>}
          <button onClick={() => setShowMockForm(s => !s)} style={solidPillBtn}><Plus size={15} /> Log score</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <StatCard label="Best" value={bestPct !== null ? `${bestPct.toFixed(0)}%` : "—"} />
        <StatCard label="Average" value={avgPct !== null ? `${avgPct.toFixed(0)}%` : "—"} />
        <StatCard label="Tests" value={relevantMocks.length} />
      </div>
      {showMockForm && (
        <div style={formCard}>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={mockExam} onChange={(e) => { setMockExam(e.target.value); setMockMax(e.target.value === "NEET" ? "720" : "300"); }} style={{ ...inputStyle, flex: 1 }}>
              <option value="NEET">NEET</option><option value="JEE">JEE</option>
            </select>
            <input type="date" value={mockDate} onChange={(e) => setMockDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" placeholder="Score" value={mockScore} onChange={(e) => setMockScore(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <input type="number" placeholder="Out of" value={mockMax} onChange={(e) => setMockMax(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowMockForm(false)} style={ghostBtn}>Cancel</button>
            <button onClick={addMock} style={solidBtn}>Save</button>
          </div>
        </div>
      )}
      {recentMocks.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90, background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 10px 8px", marginBottom: 16 }}>
          {recentMocks.map(m => {
            const pct = (m.score / m.max) * 100;
            return <div key={m.id} title={`${m.date} · ${pct.toFixed(0)}%`} style={{ flex: 1, height: `${Math.max(6, pct)}%`, background: m.exam === "NEET" ? C.sage : C.clay, borderRadius: "3px 3px 0 0" }} />;
          })}
        </div>
      )}
      {relevantMocks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 22 }}>
          {[...relevantMocks].reverse().slice(0, 5).map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, padding: "6px 2px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ color: C.inkSoft }}>{m.date} · {m.exam}</span>
              <span>{m.score}/{m.max} ({((m.score / m.max) * 100).toFixed(0)}%)</span>
              <button onClick={() => removeMock(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: C.inkSoft }}>Syllabus</div>
        <button onClick={() => setShowSubjectForm(s => !s)} style={ghostBtn}><Plus size={14} /> Add subject</button>
      </div>
      {showSubjectForm && (
        <div style={formCard}>
          <input autoFocus placeholder="Subject name" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} style={inputStyle} />
          <select value={newSubjectExam} onChange={(e) => setNewSubjectExam(e.target.value)} style={inputStyle}>
            <option value="NEET">NEET</option><option value="JEE">JEE</option><option value="Both">Both</option>
          </select>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowSubjectForm(false)} style={ghostBtn}>Cancel</button>
            <button onClick={addSubject} style={solidBtn}>Save</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleSubjects.map(s => {
          const chapters = s.chapters || [];
          const doneCount = chapters.filter(c => c.done).length;
          const pct = chapters.length ? Math.round((doneCount / chapters.length) * 100) : 0;
          const open = openSubjectId === s.id;
          return (
            <div key={s.id} style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderLeft: `3px solid ${colorForSubject(s.name, subjects)}`, borderRadius: 8 }}>
              <button onClick={() => setOpenSubjectId(open ? null : s.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                {open ? <ChevronDown size={16} color={C.inkSoft} /> : <ChevronRight size={16} color={C.inkSoft} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: C.ink }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{chapters.length ? `${doneCount}/${chapters.length} chapters` : "no chapters"}</div>
                </div>
                <div style={{ width: 60, height: 6, background: C.line, borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: colorForSubject(s.name, subjects) }} /></div>
                <span onClick={(e) => { e.stopPropagation(); removeSubject(s.id); }} style={{ color: C.inkSoft, cursor: "pointer", display: "flex" }}><Trash2 size={15} /></span>
              </button>
              {open && (
                <div style={{ padding: "0 12px 12px" }}>
                  {chapters.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                    {chapters.map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => toggleChapter(s.id, c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: c.done ? C.green : C.inkSoft }}>{c.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}</button>
                        <span style={{ flex: 1, fontSize: 13, textDecoration: c.done ? "line-through" : "none", opacity: c.done ? 0.6 : 1 }}>{c.name}</span>
                        <button onClick={() => removeChapter(s.id, c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><X size={13} /></button>
                      </div>
                    ))}
                  </div>}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input placeholder="Add a chapter" value={chapterInput} onChange={(e) => setChapterInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addChapter(s.id); }} style={{ ...inputStyle, flex: 1, padding: "7px 9px", fontSize: 13 }} />
                    <button onClick={() => addChapter(s.id)} style={{ ...ghostBtn, padding: "7px 10px" }}>Add</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {visibleSubjects.length === 0 && <EmptyState text="Add Biology, Physics, Chemistry, or Maths." />}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ flex: 1, background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function NotesTab({ notes, subjects, user }) {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState(subjects[0]?.name || "General");
  const [text, setText] = useState("");

  useEffect(() => { if (subjects[0] && subject === "General") setSubject(subjects[0].name); }, [subjects]);

  const addNote = async () => {
    if (!text.trim()) return;
    await addItem("notes", { subject, text: text.trim(), date: todayISO() }, user.uid);
    setText("");
    setShowForm(false);
  };
  const remove = async (id) => { await deleteItem("notes", id); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.inkSoft }}>{notes.length === 0 ? "No notes yet" : `${notes.length} saved`}</div>
        <button onClick={() => setShowForm(s => !s)} style={solidPillBtn}><Plus size={15} /> Add note</button>
      </div>
      {showForm && (
        <div style={formCard}>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle}>
            <option value="General">General</option>
            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <textarea autoFocus placeholder="A formula, a tricky NCERT line, an exam tip…" value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical", fontFamily: BODY_FONT }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
            <button onClick={addNote} style={solidBtn}>Save</button>
          </div>
        </div>
      )}
      {notes.length === 0 && !showForm ? <EmptyState text="Save a formula, an NCERT line, or a mistake you keep making in mocks." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notes.map(n => (
            <div key={n.id} style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderLeft: `3px solid ${colorForSubject(n.subject, subjects)}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.inkSoft }}>{n.subject} · {n.date}</span>
                <button onClick={() => remove(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><X size={14} /></button>
              </div>
              <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{n.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ user, friendUID, setFriendUID }) {
  const [inputUID, setInputUID] = useState(friendUID || "");

  const saveFriend = async () => {
    const trimmed = inputUID.trim();
    await updateDoc(doc(db, "users", user.uid), { friendUID: trimmed || null });
    setFriendUID(trimmed || null);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <K24Logo size={48} />
        <div>
          <h3 style={{ fontFamily: DISPLAY_FONT, marginBottom: 2 }}>Focus Prep</h3>
          <div style={{ fontSize: 12, color: C.inkSoft }}>v1.0 · K24 Edition</div>
        </div>
      </div>
      <h4 style={{ fontFamily: DISPLAY_FONT, marginBottom: 8 }}>Connect with a friend</h4>
      <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 8 }}>Enter your friend's UID (they can find it below) to see their tasks and focus time in real-time.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={inputUID} onChange={(e) => setInputUID(e.target.value)} placeholder="Friend's UID" style={{ flex: 1, padding: 8, border: `1px solid ${C.line}`, borderRadius: 6 }} />
        <button onClick={saveFriend} style={solidBtn}>Save</button>
      </div>
      {friendUID && <div style={{ marginTop: 8, fontSize: 13, color: C.sage }}>✓ Connected with friend</div>}
      <div style={{ marginTop: 20, fontSize: 12, color: C.inkSoft }}>
        Your UID: <strong style={{ color: C.ink }}>{user.uid}</strong> – share this with your friend.
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: C.inkSoft }}>After connecting, you can toggle between "My" and "Friend" views in Tasks and Progress tabs.</div>
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", opacity: 0.4 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: `linear-gradient(135deg, ${C.sage}, ${C.gold})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: DISPLAY_FONT, fontSize: 8, fontWeight: "bold", color: "#FFFFFF" }}>K24</span>
          </div>
          <span style={{ fontFamily: DISPLAY_FONT, fontSize: 11, color: C.inkSoft }}>Focus Prep · Made with 🎯</span>
        </div>
      </div>
    </div>
  );
}

// THIS IS THE ONLY export default - DO NOT ADD ANOTHER ONE
export default App;
