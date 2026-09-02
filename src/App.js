import React, { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  ListTodo,
  Timer,
  ClipboardList,
  TrendingUp,
  NotebookPen,
  Settings2,
  CheckCircle2,
  Circle,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  X,
  Plus,
  LogOut,
  UserPlus,
  CalendarDays,
  BookOpen,
  Target,
  BarChart3,
  Clock3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { auth, db } from "./firebase";

/* =========================================================
   CONSTANTS
========================================================= */

const COLORS = {
  bg: "#FAF9F4",
  dark: "#2B2E4A",
  muted: "#5B5E7A",
  border: "#DFDACB",
  teal: "#5B7B7A",
  orange: "#C97B4A",
  green: "#5C8A63",
  white: "#FFFFFF",
  red: "#B85C5C",
  yellow: "#B39445",
};

const NAV_ITEMS = [
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "focus", label: "Focus", icon: Timer },
  { id: "tests", label: "Tests", icon: ClipboardList },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "friends", label: "Friends", icon: Settings2 },
];

/* =========================================================
   GLOBAL INLINE CSS
========================================================= */

const GlobalStyles = () => (
  <style>{
    * {
      box-sizing: border-box;
    }

    html, body, #root {
      margin: 0;
      min-height: 100%;
      background: ${COLORS.bg};
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      color: ${COLORS.dark};
    }

    button, input, textarea, select {
      font: inherit;
    }

    button {
      cursor: pointer;
    }

    input, textarea, select {
      outline: none;
    }

    input:focus, textarea:focus, select:focus {
      border-color: ${COLORS.teal} !important;
      box-shadow: 0 0 0 3px rgba(91,123,122,.10);
    }

    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    ::-webkit-scrollbar-thumb {
      background: ${COLORS.border};
      border-radius: 10px;
    }

    .focus-pulse {
      animation: focusPulse 1.5s infinite;
    }

    @keyframes focusPulse {
      0% {
        box-shadow: 0 0 0 0 rgba(201,123,74,.55);
      }
      70% {
        box-shadow: 0 0 0 8px rgba(201,123,74,0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(201,123,74,0);
      }
    }

    .slide-up {
      animation: slideUp .25s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (min-width: 800px) {
      .desktop-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      .desktop-three {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }

      .desktop-content {
        max-width: 1100px !important;
      }
    }
  }</style>
);

/* =========================================================
   HELPERS
========================================================= */

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;

  return ${String(mins).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )};
}

function formatDate(value) {
  if (!value) return "No date";

  let date;

  if (typeof value === "string") {
    date = new Date(${value}T00:00:00);
  } else if (value?.toDate) {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return "No date";  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dateValue(value) {
  if (!value) return Infinity;

  if (typeof value === "string") {
    const t = new Date(${value}T00:00:00).getTime();
    return Number.isNaN(t) ? Infinity : t;
  }

  if (value?.toDate) return value.toDate().getTime();

  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Infinity : t;
}

function isOverdue(task) {
  if (!task?.dueDate || task.completed) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(${task.dueDate}T00:00:00);
  return due < today;
}

function percentage(score, max) {
  if (!max || Number(max) <= 0) return 0;
  return Math.min(100, Math.max(0, (Number(score) / Number(max)) * 100));
}

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function makeId() {
  return ${Date.now()}-${Math.random().toString(36).slice(2)};
}

/* =========================================================
   GENERIC FIRESTORE COLLECTION HOOK
========================================================= */

function useCollection(collectionName, constraints = [], enabled = true) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    let q;

    try {
      const ref = collection(db, collectionName);
      q = constraints.length
        ? query(ref, ...constraints)
        : query(ref);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setData(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          );
          setLoading(false);
        },
        (err) => {
          console.error(Firestore ${collectionName} error:, err);
          setError(err);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error(err);
      setError(err);
      setLoading(false);
      return undefined;
    }
  }, [collectionName, enabled, JSON.stringify(constraints)]);

  return { data, loading, error };
}

/* =========================================================
   LIVE FRIEND STATUS HOOK
========================================================= */

function useLiveStatus(uid) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!uid) {
      setStatus(null);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "userStatus", uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setStatus({
            id: snapshot.id,
            ...snapshot.data(),
          });
        } else {
          setStatus({
            status: "idle",
            remainingSeconds: 0,
            totalSeconds: 0

    return unsubscribe;
  }, [uid]);

  return status;
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  style = {},
  type = "button",
}) {
  const variants = {
    primary: {
      background: COLORS.dark,
      color: COLORS.white,
      border: 1px solid ${COLORS.dark},
    },
    secondary: {
      background: COLORS.white,color: COLORS.dark,
      border: 1px solid ${COLORS.border},
    },
    teal: {
      background: COLORS.teal,
      color: COLORS.white,
      border: 1px solid ${COLORS.teal},
    },
    danger: {
      background: "transparent",
      color: COLORS.red,
      border: 1px solid ${COLORS.border},
    },
    ghost: {
      background: "transparent",
      color: COLORS.muted,
      border: "none",
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...variants[variant],
        borderRadius: 10,
        padding: "10px 14px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        fontWeight: 700,
        transition: "all .15s ease",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style = {} }) {
  return (
    <div
      className="slide-up"
      style={{
        background: COLORS.white,
        border: 1px solid ${COLORS.border},
        borderRadius: 18,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Heading({ children, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1
        style={{
          fontFamily: "'Iowan Old Style', Georgia, serif",
          fontSize: 29,
          margin: 0,
          color: COLORS.dark,
        }}
      >
        {children}
      </h1>

      {subtitle && (
        <p
          style={{
            margin: "6px 0 0",
            color: COLORS.muted,
            fontSize: 14,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Input({ label, style = {}, ...props }) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 12,
        ...style,
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: COLORS.muted,
            marginBottom: 6,
          }}
        >
          {label}
        </div>
      )}

      <input
        {...props}
        style={{
          width: "100%",
          border: 1px solid ${COLORS.border},
          background: COLORS.bg,
          color: COLORS.dark,
          borderRadius: 10,
          padding: "11px 12px",
          ...props.style,
        }}
      />
    </label>
  );
}

function Select({ label, children, style = {}, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 12, ...style }}>
      {label && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: COLORS.muted,
            marginBottom: 6,
          }}
        >
          {label}
        </div>
      )}

      <select
        {...props}
        style={{
          width: "100%",
          border: 1px solid ${COLORS.border},
          background: COLORS.bg,
          color: COLORS.dark,
          borderRadius: 10,
          padding: "11px 12px",
          ...props.style,
        }}
      >
        {children}
      </select>
    </label>
  );
}

function TextArea({ label, style = {}, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 12, ...style }}>
      {label && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: COLORS.muted,
            marginBottom: 6,
          }}
        >
          {label}
        </div>
      )}

      <textarea
        {...props}
        style={{
          width: "100%",
          minHeight: 130,
          resize: "vertical",
          border: 1px solid ${COLORS.border},
          background: COLORS.bg,
          color: COLORS.dark,
          borderRadius: 10,
          padding: "11px 12px",
          ...props.style,
        }}
      />
    </label>
  );
}
