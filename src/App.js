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

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [friendUID, setFriendUID] = useState(null);
  const [viewMode, setViewMode] = useState("mine");
  const [tab, setTab] = useState("tasks");
  const [examFocus, setExamFocus] = useState("Both");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const docSnap = await getDoc(doc(db, "users", u.uid));
        if (docSnap.exists()) {
          setFriendUID(docSnap.data().friendUID || null);
        } else {
          await setDoc(doc(db, "users", u.uid), { friendUID: null });
        }
      } else {
        setUser(null);
        setFriendUID(null);
      }
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  const myTasks = useCollection("tasks", user?.uid);
  const myFocusLog = useCollection("focusLog", user?.uid);
  const mySubjects = useCollection("subjects", user?.uid);
  const myNotes = useCollection("notes", user?.uid);
  const myMocks = useCollection("mocks", user?.uid);
  const myCoachingTests = useCollection("coachingTests", user?.uid);

  const friendTasks = useCollection("tasks", friendUID);
  const friendFocusLog = useCollection("focusLog", friendUID);
  const friendSubjects = useCollection("subjects", friendUID);
  const friendNotes = useCollection("notes", friendUID);
  const friendMocks = useCollection("mocks", friendUID);
  const friendCoachingTests = useCollection("coachingTests", friendUID);

  const tasks = viewMode === "friend" ? friendTasks.data : myTasks.data;
  const focusLog = viewMode === "friend" ? friendFocusLog.data : myFocusLog.data;
  const subjects = viewMode === "friend" ? friendSubjects.data : mySubjects.data;
  const notes = viewMode === "friend" ? friendNotes.data : myNotes.data;
  const mocks = viewMode === "friend" ? friendMocks.data : myMocks.data;
  const coachingTests = viewMode === "friend" ? friendCoachingTests.data : myCoachingTests.data;

  const visibleSubjects = subjects.filter(
    (s) => examFocus === "Both" || !s.exam || s.exam === "Both" || s.exam === examFocus
  );

  if (loadingAuth) return <div style={{ padding: 40, textAlign: "center" }}>Loading…</div>;
  if (!user) return <Auth onAuth={() => {}} />;

  const tabs = [
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "timer", label: "Focus", icon: TimerIcon },
    { id: "tests", label: "Tests", icon: ClipboardList },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "notes", label: "Notes", icon: NotebookPen },
    { id: "settings", label: "Friends", icon: Settings2 },
  ];

  return (
    <div style={{
      fontFamily: BODY_FONT,
      background: C.paper,
      minHeight: "100vh",
      color: C.ink,
      position: "relative",
      paddingBottom: 80
    }}>
      <div style={{
        position: "fixed",
        bottom: 70,
        right: 16,
        display: "flex",
        alignItems: "center",
        gap: 6,
        userSelect: "none",
        pointerEvents: "none",
        opacity: 0.25,
        zIndex: 999,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.sage}, ${C.gold})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 10,
            fontWeight: "bold",
            color: "#FFFFFF",
            letterSpacing: -0.5,
          }}>
            K24
          </span>
        </div>
        <span style={{
          fontFamily: DISPLAY_FONT,
          fontSize: 10,
          color: C.inkSoft,
          letterSpacing: 0.5,
        }}>
          Focus Prep
        </span>
      </div>

      <div style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 100,
        opacity: 0.6,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.sage}, ${C.gold})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(91, 123, 122, 0.2)",
        }}>
          <span style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 12,
            fontWeight: "bold",
            color: "#FFFFFF",
            letterSpacing: -0.5,
          }}>
            K24
          </span>
        </div>
      </div>

      <header style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${C.line}`, paddingLeft: 56 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: DISPLAY_FONT, fontSize: 22, letterSpacing: 0.2, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Focus Prep</span>
              <span style={{
                fontSize: 11,
                color: C.sage,
                background: C.sageSoft,
                padding: "2px 8px",
                borderRadius: 12,
                fontWeight: "normal",
              }}>
                K24
              </span>
            </div>
            <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 2 }}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              {friendUID && viewMode === "friend" && (
                <span style={{
                  marginLeft: 8,
                  background: C.sageSoft,
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 11,
                  color: C.sage
                }}>
                  Friend view
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {friendUID && <FriendStatusBadge friendUID={friendUID} />}
            <button
              onClick={() => signOut(auth)}
              style={{
                background: "none",
                border: `1px solid ${C.line}`,
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 12,
                color: C.inkSoft,
                cursor: "pointer"
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {["NEET", "JEE", "Both"].map((ex) => (
            <button
              key={ex}
              onClick={() => setExamFocus(ex)}
              style={{
                padding: "5px 12px",
                borderRadius: 16,
                border: `1px solid ${examFocus === ex ? C.sage : C.line}`,
                background: examFocus === ex ? C.sageSoft : "transparent",
                color: examFocus === ex ? C.sage : C.inkSoft,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, padding: "16px 14px 20px" }}>
        {tab === "tasks" ? (
          <div>Tasks Tab - Coming Soon</div>
        ) : tab === "timer" ? (
          <div>Timer Tab - Coming Soon</div>
        ) : tab === "tests" ? (
          <div>Tests Tab - Coming Soon</div>
        ) : tab === "progress" ? (
          <div>Progress Tab - Coming Soon</div>
        ) : tab === "notes" ? (
          <div>Notes Tab - Coming Soon</div>
        ) : (
          <div>Settings Tab - Coming Soon</div>
        )}
      </main>

      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: C.paperRaised,
        borderTop: `1px solid ${C.line}`,
        display: "flex",
        padding: "6px 4px calc(env(safe-area-inset-bottom, 0px) + 6px)",
        zIndex: 100
      }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "6px 0",
              background: "transparent",
              border: "none",
              color: tab === id ? C.sage : C.inkSoft,
              fontFamily: BODY_FONT,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
