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

// ---------- COLORS ----------
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

// ---------- HELPERS ----------
function uid() { return Math.random().toString(36).slice(2, 10); }
function todayISO() { return new Date().toISOString().slice(0, 10); }

// ---------- MAIN APP ----------
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [mocks, setMocks] = useState([]);
  const [coachingTests, setCoachingTests] = useState([]);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load tasks
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Load subjects
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "subjects"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Load notes
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "notes"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Load mocks
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "mocks"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setMocks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Load coaching tests
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "coachingTests"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setCoachingTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Add task
  const addTask = async (title, subject, due) => {
    if (!title.trim()) return;
    await addDoc(collection(db, "tasks"), {
      userId: user.uid,
      title: title.trim(),
      subject: subject || "General",
      due: due || todayISO(),
      done: false
    });
  };

  // Toggle task
  const toggleTask = async (id, done) => {
    await updateDoc(doc(db, "tasks", id), { done: !done });
  };

  // Delete task
  const deleteTask = async (id) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  // Add subject
  const addSubject = async (name) => {
    if (!name.trim()) return;
    await addDoc(collection(db, "subjects"), {
      userId: user.uid,
      name: name.trim(),
      exam: "Both",
      chapters: []
    });
  };

  // Add note
  const addNote = async (subject, text) => {
    if (!text.trim()) return;
    await addDoc(collection(db, "notes"), {
      userId: user.uid,
      subject: subject || "General",
      text: text.trim(),
      date: todayISO()
    });
  };

  // Delete note
  const deleteNote = async (id) => {
    await deleteDoc(doc(db, "notes", id));
  };

  // Add mock
  const addMock = async (exam, score, max, date) => {
    await addDoc(collection(db, "mocks"), {
      userId: user.uid,
      exam: exam,
      score: parseFloat(score),
      max: parseFloat(max),
      date: date || todayISO()
    });
  };

  // Delete mock
  const deleteMock = async (id) => {
    await deleteDoc(doc(db, "mocks", id));
  };

  // Add coaching test
  const addCoachingTest = async (name, date, subject) => {
    if (!name.trim()) return;
    await addDoc(collection(db, "coachingTests"), {
      userId: user.uid,
      name: name.trim(),
      date: date || todayISO(),
      subject: subject || "General",
      chapters: []
    });
  };

  // Delete coaching test
  const deleteCoachingTest = async (id) => {
    await deleteDoc(doc(db, "coachingTests", id));
  };

  // Add chapter to coaching test
  const addChapterToTest = async (testId, chapterName) => {
    if (!chapterName.trim()) return;
    const test = coachingTests.find(t => t.id === testId);
    const newChapters = [...(test.chapters || []), { id: uid(), name: chapterName.trim(), done: false }];
    await updateDoc(doc(db, "coachingTests", testId), { chapters: newChapters });
  };

  // Toggle chapter in coaching test
  const toggleChapterInTest = async (testId, chapterId) => {
    const test = coachingTests.find(t => t.id === testId);
    const newChapters = test.chapters.map(c => 
      c.id === chapterId ? { ...c, done: !c.done } : c
    );
    await updateDoc(doc(db, "coachingTests", testId), { chapters: newChapters });
  };

  // Delete chapter from coaching test
  const deleteChapterFromTest = async (testId, chapterId) => {
    const test = coachingTests.find(t => t.id === testId);
    const newChapters = test.chapters.filter(c => c.id !== chapterId);
    await updateDoc(doc(db, "coachingTests", testId), { chapters: newChapters });
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 320, margin: "80px auto", padding: 20, textAlign: "center" }}>
        <h2>Focus Prep</h2>
        <p style={{ color: "#666" }}>Sign in to continue</p>
        <button 
          onClick={() => signInWithEmailAndPassword(auth, "demo@test.com", "password123")}
          style={{ background: "#2B2E4A", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, marginTop: 10 }}
        >
          Sign In (Demo)
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: BODY_FONT, background: C.paper, minHeight: "100vh", paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: DISPLAY_FONT, fontSize: 24, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Focus Prep</span>
              <span style={{ fontSize: 12, color: C.sage, background: C.sageSoft, padding: "2px 8px", borderRadius: 12 }}>K24</span>
            </div>
            <div style={{ fontSize: 13, color: C.inkSoft }}>{new Date().toLocaleDateString()}</div>
          </div>
          <button onClick={() => signOut(auth)} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: "16px 14px" }}>
        {tab === "tasks" && (
          <div>
            <h3 style={{ marginBottom: 12 }}>Tasks</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input 
                placeholder="Add task..." 
                id="taskInput"
                style={{ flex: 1, padding: 8, border: `1px solid ${C.line}`, borderRadius: 6 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = document.getElementById("taskInput");
                    addTask(input.value, "General", todayISO());
                    input.value = "";
                  }
                }}
              />
              <button 
                onClick={() => {
                  const input = document.getElementById("taskInput");
                  addTask(input.value, "General", todayISO());
                  input.value = "";
                }}
                style={{ ...solidBtn, padding: "8px 16px" }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px" }}>
                  <button onClick={() => toggleTask(t.id, t.done)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    {t.done ? <CheckCircle2 size={20} color={C.green} /> : <Circle size={20} color={C.inkSoft} />}
                  </button>
                  <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.6 : 1 }}>{t.title}</span>
                  <button onClick={() => deleteTask(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {tasks.length === 0 && <EmptyState text="No tasks yet. Add your first task!" />}
            </div>
          </div>
        )}

        {tab === "timer" && (
          <div style={{ textAlign: "center" }}>
            <h3 style={{ marginBottom: 12 }}>Focus Timer</h3>
            <div style={{ fontSize: 48, fontFamily: DISPLAY_FONT, margin: "20px 0" }}>25:00</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button style={solidBtn}><Play size={20} /> Start</button>
              <button style={ghostBtn}><RotateCcw size={20} /> Reset</button>
            </div>
            <div style={{ marginTop: 20, fontSize: 13, color: C.inkSoft }}>0 focus sessions completed</div>
          </div>
        )}

        {tab === "tests" && (
          <div>
            <h3 style={{ marginBottom: 12 }}>Coaching Tests</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input 
                placeholder="Test name..." 
                id="testInput"
                style={{ flex: 1, padding: 8, border: `1px solid ${C.line}`, borderRadius: 6 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = document.getElementById("testInput");
                    addCoachingTest(input.value, todayISO(), "General");
                    input.value = "";
                  }
                }}
              />
              <button 
                onClick={() => {
                  const input = document.getElementById("testInput");
                  addCoachingTest(input.value, todayISO(), "General");
                  input.value = "";
                }}
                style={{ ...solidBtn, padding: "8px 16px" }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {coachingTests.map(t => (
                <div key={t.id} style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{t.name}</span>
                    <button onClick={() => deleteCoachingTest(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: C.inkSoft }}>{t.subject} · {t.date}</div>
                </div>
              ))}
              {coachingTests.length === 0 && <EmptyState text="No tests added yet." />}
            </div>
          </div>
        )}

        {tab === "progress" && (
          <div>
            <h3 style={{ marginBottom: 12 }}>Progress</h3>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <StatCard label="Subjects" value={subjects.length} />
              <StatCard label="Tasks" value={tasks.length} />
              <StatCard label="Notes" value={notes.length} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {subjects.map(s => (
                <div key={s.id} style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{s.name}</span>
                    <span style={{ fontSize: 12, color: C.inkSoft }}>{s.exam || "Both"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.inkSoft }}>{s.chapters?.length || 0} chapters</div>
                </div>
              ))}
              {subjects.length === 0 && <EmptyState text="Add subjects to track your syllabus." />}
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div>
            <h3 style={{ marginBottom: 12 }}>Notes</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input 
                placeholder="Note content..." 
                id="noteInput"
                style={{ flex: 1, padding: 8, border: `1px solid ${C.line}`, borderRadius: 6 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = document.getElementById("noteInput");
                    addNote("General", input.value);
                    input.value = "";
                  }
                }}
              />
              <button 
                onClick={() => {
                  const input = document.getElementById("noteInput");
                  addNote("General", input.value);
                  input.value = "";
                }}
                style={{ ...solidBtn, padding: "8px 16px" }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notes.map(n => (
                <div key={n.id} style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{n.text}</span>
                    <button onClick={() => deleteNote(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: C.inkSoft }}>{n.subject} · {n.date}</div>
                </div>
              ))}
              {notes.length === 0 && <EmptyState text="No notes saved yet." />}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div>
            <h3 style={{ marginBottom: 12 }}>Settings</h3>
            <div style={{ background: C.paperRaised, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 14, color: C.inkSoft }}>Your UID</p>
              <p style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", background: C.paper, padding: 8, borderRadius: 4 }}>{user?.uid}</p>
              <p style={{ fontSize: 13, color: C.inkSoft, marginTop: 12 }}>Share this with your friend to connect.</p>
            </div>
            <div style={{ marginTop: 12, textAlign: "center", opacity: 0.4, fontSize: 12 }}>
              Focus Prep · K24 Edition
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: C.paperRaised,
        borderTop: `1px solid ${C.line}`,
        display: "flex",
        padding: "6px 4px",
      }}>
        {[
          { id: "tasks", label: "Tasks", icon: ListTodo },
          { id: "timer", label: "Focus", icon: TimerIcon },
          { id: "tests", label: "Tests", icon: ClipboardList },
          { id: "progress", label: "Progress", icon: TrendingUp },
          { id: "notes", label: "Notes", icon: NotebookPen },
          { id: "settings", label: "Friends", icon: Settings2 },
        ].map(({ id, label, icon: Icon }) => (
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
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8} />
            {label}
          </button>
        ))}
      </nav>

      {/* Watermark */}
      <div style={{
        position: "fixed",
        bottom: 70,
        right: 16,
        fontSize: 10,
        color: C.line,
        opacity: 0.4,
        pointerEvents: "none",
        fontFamily: DISPLAY_FONT,
        zIndex: 999,
      }}>
        K24 · Focus Prep
      </div>
    </div>
  );
}

// ---------- STYLED COMPONENTS ----------
const solidBtn = {
  background: "#2B2E4A",
  color: "#FAF9F4",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4
};

const ghostBtn = {
  background: "transparent",
  color: "#5B5E7A",
  border: `1px solid #DFDACB`,
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4
};

function EmptyState({ text }) {
  return (
    <div style={{
      border: `1px dashed #DFDACB`,
      borderRadius: 10,
      padding: "20px 16px",
      textAlign: "center",
      color: "#5B5E7A",
      fontSize: 13
    }}>
      {text}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      flex: 1,
      background: "#FFFFFF",
      border: `1px solid #DFDACB`,
      borderRadius: 10,
      padding: "10px 12px",
      textAlign: "center"
    }}>
      <div style={{ fontFamily: "'Iowan Old Style', Georgia, serif", fontSize: 20 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#5B5E7A" }}>{label}</div>
    </div>
  );
}
