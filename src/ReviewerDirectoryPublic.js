// src/ReviewerDirectoryPublic.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableSortLabel,
  Chip,
  CircularProgress,
  Alert,
  Autocomplete,
  Divider,
  Tooltip,
  IconButton,
  Snackbar,
  Slide,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { Search as SearchIcon, Circle as LiveDot, MapRounded as MapIcon, ClearAll as ClearAllIcon } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { supabase } from "./supabaseClient.js";
import USReviewerDirectoryDrawer from "./USReviewerDirectoryDrawer.js";

const TABLE_NAME = "public_reviewer_directory";
const STATUS_URL = process.env.REACT_APP_STATUS_URL || null;

const SPEC_SYNONYMS = (() => {
  const map = {};
  const add = (arr) => {
    const set = new Set(arr.map((s) => s.toLowerCase()));
    for (const s of set) map[s] = new Set(set);
  };
  add(["cardiology", "cardiovascular disease", "interventional cardiology", "cardiovascular medicine"]);
  add(["pulmonology", "pulmonary medicine", "pulmonary", "pulmonary/critical care", "pccm"]);
  add(["otolaryngology", "ent", "ear nose throat"]);
  add(["gastroenterology", "gi", "digestive diseases"]);
  add(["nephrology", "renal medicine", "kidney disease"]);
  add(["endocrinology", "endocrinology, diabetes & metabolism", "diabetes & metabolism"]);
  add(["hematology/oncology", "heme/onc", "oncology", "medical oncology", "hematology"]);
  add(["pm&r", "physical medicine & rehabilitation", "physical medicine and rehabilitation", "physiatry"]);
  add(["ob/gyn", "obstetrics and gynecology", "obstetrics & gynecology", "gynecology", "obstetrics"]);
  add(["orthopedic surgery", "orthopedics", "orthopaedics", "orthopaedic surgery"]);
  add(["family medicine", "family practice"]);
  add(["internal medicine", "internist"]);
  add(["emergency medicine", "er"]);
  add(["general surgery", "surgery"]);
  add(["pediatrics", "peds"]);
  add(["dermatology", "derm"]);
  add(["rheumatology", "rheum"]);
  add(["infectious disease", "id"]);
  add(["anesthesiology", "anesthesia"]);
  add(["pain medicine", "pain management"]);
  add(["neurology", "neuro"]);
  add(["psychiatry", "psych"]);
  add(["psychology", "clinical psychology", "behavioral health"]);
  return map;
})();

function expandSpecialtySynonyms(spec) {
  const s = String(spec || "").toLowerCase().trim();
  if (!s) return new Set();
  if (SPEC_SYNONYMS[s]) return new Set(SPEC_SYNONYMS[s]);
  const normalized = s.replace(/\band\b/g, "&").replace(/\s+/g, " ").trim();
  for (const key in SPEC_SYNONYMS) {
    if (key.replace(/\band\b/g, "&") === normalized) return new Set(SPEC_SYNONYMS[key]);
  }
  return new Set([s]);
}

function buildSpecialtyIndex(specs) {
  const out = new Set();
  for (const sp of specs || []) {
    const syns = expandSpecialtySynonyms(sp);
    for (const w of syns) out.add(w);
    out.add(String(sp || "").toLowerCase());
  }
  return out;
}

const specialtyColors = [
  "#1976d2",
  "#388e3c",
  "#fbc02d",
  "#7b1fa2",
  "#d32f2f",
  "#0097a7",
  "#8d6e63",
  "#c2185b",
  "#0288d1",
  "#43a047",
  "#ffa000",
  "#6d4c41",
  "#512da8",
  "#455a64",
];
const specialtyColorsHC = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#22c55e"];

function colorForSpecialty(s, highContrast = false) {
  if (!s) return "#777";
  let hash = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const pal = highContrast ? specialtyColorsHC : specialtyColors;
  return pal[Math.abs(hash) % pal.length];
}

const toStr = (v) => (v ?? "").toString().trim();

const splitNameAndCred = (full) => {
  const n = toStr(full);
  if (!n) return { base: "", cred: "" };
  const parts = n.split(",");
  if (parts.length === 1) return { base: n.trim(), cred: "" };
  return { base: parts[0].trim(), cred: parts.slice(1).join(",").trim() };
};

const toLastFirst = (base) => {
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return base;
  const last = parts[parts.length - 1];
  const firstMid = parts.slice(0, -1).join(" ");
  return `${last}, ${firstMid}`;
};

const formatDisplayName = (full) => {
  const { base, cred } = splitNameAndCred(full);
  const styled = toLastFirst(base);
  return cred ? `${styled}, ${cred}` : styled;
};

const lastNameKey = (full) => {
  const { base } = splitNameAndCred(full);
  const parts = base.split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1] || "").toLowerCase();
};

const asArray = (x) => {
  if (Array.isArray(x)) return x.filter(Boolean);
  if (x == null) return [];
  if (typeof x === "string") {
    try {
      const j = JSON.parse(x);
      if (Array.isArray(j)) return j.filter(Boolean);
    } catch {
      // ignore
    }
    return String(x)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const stableRowKey = (r, idx) => {
  const id = r.id != null ? `id:${r.id}` : "";
  const name = toStr(r.name).toLowerCase();
  const sig = `${name}|${(r.specialties || []).join("|").toLowerCase()}|${(r.states || []).join("|").toLowerCase()}`;
  return id || `sig:${sig}#${idx}`;
};

function contrastText(hex) {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return L > 0.6 ? "#000" : "#fff";
  } catch {
    return "#fff";
  }
}

function formatLocalTime(d) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
  } catch {
    return d?.toLocaleTimeString?.() || "";
  }
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

export default function ReviewerDirectoryPublic() {
  
  const [density, setDensity] = useState("comfortable");
  const [highContrast, setHighContrast] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [orderBy, setOrderBy] = useState("name");
  const [order, setOrder] = useState("asc");

  const [selSpecs, setSelSpecs] = useState([]);
  const [selStates, setSelStates] = useState([]);
  const [hasWCOnly, setHasWCOnly] = useState(false);

  const [lastUpdated, setLastUpdated] = useState(null);
  const [status, setStatus] = useState({ label: "Unknown", color: "default", uptime: null });

  const [authed, setAuthed] = useState(false);
const [authReady, setAuthReady] = useState(false);

  const [mapOpen, setMapOpen] = useState(false);

  const [notesDraft, setNotesDraft] = useState({});
  const [notesSaving, setNotesSaving] = useState({});
  const [notesError, setNotesError] = useState({});
  const [notesEditing, setNotesEditing] = useState(null);

  const [refreshSnack, setRefreshSnack] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const snackHideTimer = useRef(null);

  const [chipExpand, setChipExpand] = useState({});

  const debounceTimer = useRef(null);
  const statusTimer = useRef(null);
  const refreshTimer = useRef(null);
  const mountedRef = useRef(true);

  const TXT_PRIMARY = alpha("#eaf2ff", 0.94);
  const TXT_SECONDARY = alpha("#eaf2ff", 0.72);
  const TXT_MUTED = alpha("#eaf2ff", 0.55);
  const PLACEHOLDER = alpha("#eaf2ff", 0.34);

  const pageBg =
    "radial-gradient(1200px 800px at 10% -10%, rgba(58,104,254,0.20), transparent 60%), radial-gradient(1000px 700px at 110% 10%, rgba(122,162,255,0.18), transparent 55%), #0b0e19";

  const borderAlpha = highContrast ? 0.75 : 0.26;
  const borderColor = alpha("#7aa2ff", borderAlpha);
  const outlineThick = highContrast ? 2 : 1;

  const rowHoverBg = alpha("#7aa2ff", highContrast ? 0.08 : 0.03);
  const rowStripeBg = alpha("#ffffff", 0.02);
  const notesHoverBg = alpha("#ffffff", 0.014);
  const notesActiveBg = alpha("#7aa2ff", 0.08);

  const cellBorder = `${outlineThick}px solid ${alpha("#ffffff", highContrast ? 0.24 : 0.12)}`;

  const glassPaper = {
  p: 2,
  borderRadius: 3,
  color: TXT_PRIMARY,
  position: "relative",
  background: "linear-gradient(180deg, rgba(17,23,39,0.55), rgba(17,23,39,0.35))",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: `${outlineThick}px solid ${borderColor}`,
  boxShadow: `0 10px 36px ${alpha("#7aa2ff", 0.2)}`,
  "& .MuiTypography-root": { color: "inherit" },

  "&:before": {
    content: '""',
    position: "absolute",
    left: 12,
    right: 12,
    top: 0,
    height: 2,
    borderRadius: 999,
    background: `linear-gradient(
      90deg,
      ${alpha("#7aa2ff", 0)},
      ${alpha("#7aa2ff", 0.55)},
      ${alpha("#22c55e", 0.35)},
      ${alpha("#7aa2ff", 0)}
    )`,
  },
};

  const handleSignOut = async () => {
  await supabase.auth.signOut();
  window.location.replace("/login");
};

const tablePaper = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: 3,
  color: TXT_PRIMARY,

  position: "relative", // needed for :before

  background: "linear-gradient(180deg, rgba(17,23,39,0.55), rgba(17,23,39,0.35))",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: `${outlineThick}px solid ${borderColor}`,
  boxShadow: `0 14px 48px ${alpha("#7aa2ff", 0.22)}`,
  "& .MuiTypography-root": { color: "inherit" },

  "&:before": {
    content: '""',
    position: "absolute",
    left: 12,
    right: 12,
    top: 0,
    height: 2,
    borderRadius: 999,
    background: `linear-gradient(
      90deg,
      ${alpha("#7aa2ff", 0)},
      ${alpha("#7aa2ff", 0.55)},
      ${alpha("#22c55e", 0.35)},
      ${alpha("#7aa2ff", 0)}
    )`,
    pointerEvents: "none",
    zIndex: 2,
  },
};

  const headerCellSX = {
  position: "sticky",
  top: 0,
  zIndex: 30,

  textTransform: highContrast ? "uppercase" : "none",
  fontWeight: 900,
  letterSpacing: 0.4,
  color: "#ffffff",
  borderBottom: `${outlineThick}px solid ${alpha("#ffffff", 0.25)}`,

  backgroundColor: alpha("#0b0e19", 0.92),
  backgroundImage: "none",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",

  "& .MuiTableSortLabel-root": {
    color: "#ffffff",
    fontWeight: 900,
    "&:hover": { color: "#ffffff" },
    "&.Mui-active": { color: "#ffffff" },
  },
  "& .MuiTableSortLabel-icon": { color: alpha("#ffffff", 0.9) },
  "& .MuiTableSortLabel-root.Mui-active .MuiTableSortLabel-icon": { color: "#ffffff" },
};

  const darkFieldSX = {
    "& .MuiInputLabel-root": { color: TXT_SECONDARY },
    "& .MuiInputLabel-root.Mui-focused": { color: "#fff" },
    "& .MuiInputBase-root": { color: TXT_PRIMARY },
    "& .MuiOutlinedInput-root": {
      borderRadius: 14,
      backgroundColor: alpha("#0b0e19", 0.28),
      backdropFilter: "blur(10px) saturate(150%)",
      WebkitBackdropFilter: "blur(10px) saturate(150%)",
      "& fieldset": { borderColor: alpha("#7aa2ff", 0.35) },
      "&:hover fieldset": { borderColor: alpha("#7aa2ff", 0.60) },
      "&.Mui-focused fieldset": { borderColor: alpha("#7aa2ff", 0.82) },
    },
    "& input::placeholder": { color: PLACEHOLDER, opacity: 1 },
    "& textarea::placeholder": { color: PLACEHOLDER, opacity: 1 },
    "& .MuiSvgIcon-root": { color: TXT_SECONDARY },
    "& .MuiChip-root": {
      color: TXT_PRIMARY,
      background: alpha("#0b0e19", 0.22),
      border: `1px solid ${alpha("#7aa2ff", 0.35)}`,
    },
    "& .MuiAutocomplete-popupIndicator": { color: TXT_SECONDARY },
    "& .MuiAutocomplete-clearIndicator": { color: TXT_SECONDARY },
  };

  const isCompact = density === "compact";
  const cellPadY = isCompact ? 0.5 : 1.05;

  const NOTES_MIN_W = 340;
  const NOTES_MAX_W = 520;

  const CHIP_M = 0.22;
  const CHIP_PX = 0.5;

  const toggleSpec = (s) => setSelSpecs((cs) => (cs.includes(s) ? cs.filter((x) => x !== s) : [...cs, s]));
  const toggleState = (st) => setSelStates((cs) => (cs.includes(st) ? cs.filter((x) => x !== st) : [...cs, st]));

  const clearAllFilters = useCallback(() => {
    setSelSpecs([]);
    setSelStates([]);
    setHasWCOnly(false);
    setSearch("");
    setDebouncedSearch("");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        clearInterval(statusTimer.current);
      } catch {}
      try {
        clearInterval(refreshTimer.current);
      } catch {}
      try {
        clearTimeout(debounceTimer.current);
      } catch {}
      try {
        clearTimeout(snackHideTimer.current);
      } catch {}
    };
  }, []);

  useEffect(() => {
  let unsub = null;


  const boot = async () => {
    const { data } = await supabase.auth.getSession();
    const hasSession = !!data?.session;
    setAuthed(hasSession);
    setAuthReady(true);

    if (!hasSession) {
      window.location.replace("/login");
    }
  };

  boot();

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    const hasSession = !!session;
    setAuthed(hasSession);
    setAuthReady(true);

    if (!hasSession) {
      window.location.replace("/login");
    }
  });

  unsub = listener?.subscription;

  return () => {
    unsub?.unsubscribe?.();
  };
}, []);

  useEffect(() => {
    const onDensity = (e) => setDensity(e.detail?.density || "comfortable");
    const onHC = (e) => setHighContrast(!!e.detail?.highContrast);
    window.addEventListener("pl:set-density", onDensity);
    window.addEventListener("pl:set-high-contrast", onHC);
    return () => {
      window.removeEventListener("pl:set-density", onDensity);
      window.removeEventListener("pl:set-high-contrast", onHC);
    };
  }, []);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  const normalizeRows = useCallback((data) => {
    const arr = Array.isArray(data) ? data : [];
    return arr
      .filter((r) => asArray(r.states).length > 0)
      .map((r) => {
        const specs = Array.from(new Set(asArray(r.specialties))).sort((a, b) => a.localeCompare(b));
        const states = Array.from(new Set(asArray(r.states).map((s) => String(s).toUpperCase()))).sort();
        const dnu = Array.from(new Set(asArray(r.dnu))).sort((a, b) => a.localeCompare(b));
        const wc = Array.from(new Set(asArray(r.wc_state_jurisdiction).map((s) => String(s).toUpperCase()))).sort();
        const specIndex = buildSpecialtyIndex(specs);
        return {
          id: r.id,
          name: r.name || "",
          specialties: specs,
          states,
          dnu,
          wc_state_jurisdiction: wc,
          notes: r.notes ?? "",
          availability: r.availability ?? "Available",
          _specIndex: specIndex,
        };
      });
  }, []);

  const showRefreshingSnack = useCallback(() => {
    if (!mountedRef.current) return;
    if (!hasLoadedOnce) return;
    if (err) return;
    setRefreshSnack(true);
    try {
      clearTimeout(snackHideTimer.current);
    } catch {}
    snackHideTimer.current = setTimeout(() => {
      if (mountedRef.current) setRefreshSnack(false);
    }, 900);
  }, [hasLoadedOnce, err]);

  const fetchData = useCallback(async () => {
    setErr("");
    setLoading(true);
    showRefreshingSnack();

    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("id,name,specialties,states,dnu,wc_state_jurisdiction,notes,availability")
        .order("name", { ascending: true });

      if (error) throw error;

      const normalized = normalizeRows(data);

      if (!mountedRef.current) return;
      setRows(normalized);
      setLastUpdated(new Date());
      setHasLoadedOnce(true);

      setNotesDraft((prev) => {
        const next = { ...prev };
        for (const r of normalized) {
          if (notesEditing === r.id) continue;
          next[r.id] = r.notes ?? "";
        }
        return next;
      });

      if (!normalized.length) {
        setErr(
          "Supabase returned 0 rows. This is almost always RLS enabled with no anon SELECT policy (or SELECT privilege missing). Fix RLS/policy on public.public_reviewer_directory."
        );
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setErr(e?.message || String(e));
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
    }
  }, [normalizeRows, notesEditing, showRefreshingSnack]);

  useEffect(() => {
  if (!authReady) return;
  if (!authed) return;
  fetchData();
}, [fetchData, authReady, authed]);

  useEffect(() => {
  if (!authReady || !authed) return;

  refreshTimer.current = setInterval(() => {
    fetchData();
  }, 10 * 60 * 1000);

  const onVisible = () => {
    if (document.visibilityState === "visible") fetchData();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    try {
      clearInterval(refreshTimer.current);
    } catch {}
    document.removeEventListener("visibilitychange", onVisible);
  };
}, [fetchData, authReady, authed]);

  useEffect(() => {
    if (!STATUS_URL) return;

    const poll = async () => {
      try {
        const res = await fetch(STATUS_URL, { cache: "no-store" });
        const json = await res.json();
        const s = String(json.status || "").toLowerCase();
        if (s === "ok") setStatus({ label: "Operational", color: "#22c55e", uptime: json.uptimePct ?? null });
        else if (s === "degraded") setStatus({ label: "Degraded", color: "#f59e0b", uptime: json.uptimePct ?? null });
        else setStatus({ label: "Down", color: "#ef4444", uptime: json.uptimePct ?? null });
      } catch {
        setStatus({ label: "Status Unavailable", color: "default", uptime: null });
      }
    };

    poll();
    statusTimer.current = setInterval(poll, 60000);
    return () => clearInterval(statusTimer.current);
  }, []);

  const allSpecialties = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.specialties || []))).sort(), [rows]);
  const allStates = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.states || []))).sort(), [rows]);

  const rowHasSpecialty = (row, wanted) => {
    if (!wanted) return true;
    const syns = expandSpecialtySynonyms(wanted);
    for (const s of syns) if (row._specIndex?.has(s)) return true;
    return false;
  };

  const rowsWithHay = useMemo(() => {
    return rows.map((r) => {
      const name = String(r.name || "").toLowerCase();
      const states = (r.states || []).map((x) => String(x).toLowerCase());
      const specs = (r.specialties || []).map((x) => String(x).toLowerCase());
      const syns = Array.from(r._specIndex || []);
      const dnu = (r.dnu || []).map((x) => String(x).toLowerCase());
      const wc = (r.wc_state_jurisdiction || []).map((x) => String(x).toLowerCase());
      const notes = String(r.notes || "").toLowerCase();
      const hay = [name, ...states, ...specs, ...syns, ...dnu, ...wc, notes].join(" ");
      return { ...r, _hay: hay };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    const terms = debouncedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return rowsWithHay
      .filter((r) => String(r.availability || "Available") !== "Unavailable")
      .filter((r) => {
        if (hasWCOnly && !(r.wc_state_jurisdiction || []).length) return false;
        if (selSpecs.length && !selSpecs.every((s) => rowHasSpecialty(r, s))) return false;
        if (selStates.length && !selStates.every((s) => (r.states || []).includes(s))) return false;
        if (!terms.length) return true;
        return terms.every((t) => r._hay.includes(t));
      });
  }, [rowsWithHay, debouncedSearch, selSpecs, selStates, hasWCOnly]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const key = (row) => {
        if (orderBy === "name") return `${lastNameKey(row.name)}|||${String(row.name || "").toLowerCase()}`;
        if (orderBy === "specialties") return (row.specialties || []).join(", ").toLowerCase();
        if (orderBy === "states") return (row.states || []).join(", ").toLowerCase();
        if (orderBy === "dnu") return (row.dnu || []).join(", ").toLowerCase();
        if (orderBy === "wc_state_jurisdiction") return (row.wc_state_jurisdiction || []).join(", ").toLowerCase();
        if (orderBy === "notes") return String(row.notes || "").toLowerCase();
        return String(row[orderBy] ?? "").toLowerCase();
      };
      const A = key(a);
      const B = key(b);
      if (A < B) return order === "asc" ? -1 : 1;
      if (A > B) return order === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, orderBy, order]);

  const totalLabel = `${sorted.length} total`;

  const handleSort = (col) => {
    if (orderBy === col) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setOrderBy(col);
      setOrder("asc");
    }
  };

  const saveNotes = useCallback(
    async (id) => {
      if (!authed) {
        setNotesError((m) => ({ ...m, [id]: "Not authorized. Please re-enter the access code." }));
        setNotesEditing((cur) => (cur === id ? null : cur));
        return;
      }
      if (notesSaving[id]) return;

      const val = String(notesDraft[id] ?? "");
      setNotesSaving((m) => ({ ...m, [id]: true }));
      setNotesError((m) => ({ ...m, [id]: "" }));

      try {
        const { error } = await supabase.from(TABLE_NAME).update({ notes: val }).eq("id", id);
        if (error) throw error;

        if (!mountedRef.current) return;
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, notes: val } : r)));
        setNotesEditing((cur) => (cur === id ? null : cur));
      } catch (e) {
        if (!mountedRef.current) return;
        setNotesError((m) => ({ ...m, [id]: e?.message || String(e) }));
      } finally {
        if (!mountedRef.current) return;
        setNotesSaving((m) => ({ ...m, [id]: false }));
      }
    },
    [authed, notesDraft, notesSaving]
  );

  const chipKey = (id, col) => `${id}:${col}`;
  const isExpanded = (id, col) => !!chipExpand[chipKey(id, col)];
  const toggleExpand = (id, col) => setChipExpand((m) => ({ ...m, [chipKey(id, col)]: !m[chipKey(id, col)] }));

  const renderGroupedChips = ({
    id,
    col,
    items,
    limit,
    renderItem,
    moreLabel,
    tooltip,
  }) => {
    const list = items || [];
    const expanded = isExpanded(id, col);
    const shown = expanded ? list : list.slice(0, limit);
    const remaining = list.length - shown.length;

    return (
      <>
        {shown.map(renderItem)}
        {!expanded && remaining > 0 ? (
          <Tooltip title={tooltip || "Show more"}>
            <Chip
              size="small"
              label={moreLabel ? moreLabel(remaining) : `+${remaining}`}
              onClick={() => toggleExpand(id, col)}
              sx={{
                m: CHIP_M,
                px: CHIP_PX,
                cursor: "pointer",
                fontWeight: 900,
                background: alpha("#0b0e19", 0.28),
                color: "#fff",
                border: `1px solid ${alpha("#7aa2ff", 0.45)}`,
                "&:hover": { background: alpha("#7aa2ff", 0.12) },
              }}
            />
          </Tooltip>
        ) : null}
        {expanded && list.length > limit ? (
          <Tooltip title="Collapse">
            <Chip
              size="small"
              label="Less"
              onClick={() => toggleExpand(id, col)}
              sx={{
                m: CHIP_M,
                px: CHIP_PX,
                cursor: "pointer",
                fontWeight: 900,
                background: alpha("#0b0e19", 0.28),
                color: "#fff",
                border: `1px solid ${alpha("#7aa2ff", 0.45)}`,
                "&:hover": { background: alpha("#7aa2ff", 0.12) },
              }}
            />
          </Tooltip>
        ) : null}
      </>
    );
  };

  const activePills = useMemo(() => {
    const pills = [];

    for (const s of selSpecs) pills.push({ type: "spec", key: `spec:${s}`, label: `Specialty: ${s}`, value: s });
    for (const st of selStates) pills.push({ type: "state", key: `state:${st}`, label: `State: ${st}`, value: st });

    const q = debouncedSearch.trim();
    if (q) pills.push({ type: "search", key: `search:${q}`, label: `Search: ${q}`, value: q });

    if (hasWCOnly) pills.push({ type: "wc", key: "wc:only", label: "Has WC Jurisdiction", value: true });

    return pills;
  }, [selSpecs, selStates, debouncedSearch, hasWCOnly]);

  const hasAnyFilters = selSpecs.length || selStates.length || debouncedSearch.trim() || hasWCOnly;

  if (!authReady) {
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(1200px 800px at 10% -10%, rgba(58,104,254,0.20), transparent 60%), radial-gradient(1000px 700px at 110% 10%, rgba(122,162,255,0.18), transparent 55%), #0b0e19",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

  return (
    <Box
  sx={{
    height: "100vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    px: { xs: 1, md: 4 },
    py: { xs: 1.5, md: 4 },
    background: pageBg,
    color: TXT_PRIMARY,
    "& .MuiTypography-root": { color: "inherit" },
  }}
>
      <USReviewerDirectoryDrawer open={mapOpen} onClose={() => setMapOpen(false)} reviewers={sorted} onOpenReviewerDetails={null} />

      <Snackbar
        open={refreshSnack && !err}
        onClose={() => setRefreshSnack(false)}
        autoHideDuration={1200}
        TransitionComponent={(p) => <Slide {...p} direction="up" />}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.25,
            py: 0.9,
            borderRadius: 999,
            bgcolor: alpha("#0b0e19", 0.70),
            color: TXT_PRIMARY,
            border: `1px solid ${alpha("#7aa2ff", highContrast ? 0.55 : 0.30)}`,
            backdropFilter: "blur(12px) saturate(160%)",
            WebkitBackdropFilter: "blur(12px) saturate(160%)",
            boxShadow: `0 16px 42px ${alpha("#000", 0.38)}`,
            "& .MuiCircularProgress-root": { color: TXT_PRIMARY },
          }}
        >
          <CircularProgress size={14} />
          <Typography variant="caption" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
            Refreshing directory…
          </Typography>
        </Box>
      </Snackbar>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          flexShrink: 0,
          flexWrap: "nowrap",
          gap: 2,
          pr: 6,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 0.2, minWidth: 0, whiteSpace: "nowrap", color: "#fff" }}>
          PeerLink Panel Directory
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "nowrap" }}>
          <Tooltip title="Open Coverage Map">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <IconButton
                onClick={() => setMapOpen(true)}
                aria-label="Open Coverage Map"
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2.75,
                  border: `1px solid ${alpha("#7aa2ff", 0.38)}`,
                  bgcolor: alpha("#0b0e19", 0.34),
                  backdropFilter: "blur(12px) saturate(150%)",
                  WebkitBackdropFilter: "blur(12px) saturate(150%)",
                  boxShadow: `0 14px 34px ${alpha("#000", 0.26)}`,
                  transition: "transform 150ms ease, background 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    bgcolor: alpha("#7aa2ff", 0.12),
                    borderColor: alpha("#7aa2ff", 0.68),
                    boxShadow: `0 18px 44px ${alpha("#000", 0.32)}`,
                  },
                  "&:active": { transform: "translateY(0px)" },
                  "&:focus-visible": {
                    outline: "none",
                    boxShadow: `0 0 0 3px ${alpha("#7aa2ff", 0.22)}, 0 14px 34px ${alpha("#000", 0.26)}`,
                  },
                }}
              >
                <MapIcon
                  sx={{
                    fontSize: 19,
                    color: alpha("#cfe2ff", 0.98),
                    filter: `drop-shadow(0 10px 16px ${alpha("#000", 0.32)})`,
                  }}
                />
              </IconButton>

              <Box sx={{ lineHeight: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 950, color: alpha("#ffffff", 0.92), whiteSpace: "nowrap" }}>
                  Coverage Map
                </Typography>
              </Box>
            </Box>
          </Tooltip>

          <Chip
            size="small"
            icon={<LiveDot sx={{ fontSize: 10, color: "#22c55e" }} />}
            label="Live"
            sx={{
              height: 22,
              "& .MuiChip-icon": { mr: 0.3 },
              background: alpha("#22c55e", 0.12),
              color: "#22c55e",
              border: `1px solid ${alpha("#22c55e", 0.5)}`,
              whiteSpace: "nowrap",
            }}
          />

          <Typography variant="caption" sx={{ whiteSpace: "nowrap", color: TXT_SECONDARY }}>
            {lastUpdated ? `Updated · ${formatLocalTime(lastUpdated)}` : "Connecting…"}
          </Typography>

          {STATUS_URL && (
            <Tooltip title="Service status">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, whiteSpace: "nowrap" }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: status.color === "default" ? alpha("#eaf2ff", 0.35) : status.color,
                  }}
                />
                <Typography variant="caption" sx={{ color: TXT_SECONDARY }}>
                  {status.label}
                  {status.uptime != null ? ` • ${status.uptime.toFixed(2)}%` : ""}
                </Typography>
              </Box>
            </Tooltip>
          )}
          <Button
  size="small"
  variant="outlined"
  onClick={handleSignOut}
  sx={{
    borderRadius: 999,
    fontWeight: 900,
    color: "#fff",
    border: `1px solid ${alpha("#7aa2ff", 0.45)}`,
    background: alpha("#0b0e19", 0.22),
    "&:hover": { background: alpha("#7aa2ff", 0.10) },
  }}
>
  Sign out
</Button>
        </Box>
      </Box>

      <Paper sx={{ ...glassPaper, flexShrink: 0 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <Autocomplete
            multiple
            options={allSpecialties}
            value={selSpecs}
            onChange={(_, v) => setSelSpecs(v)}
            renderInput={(p) => (
              <TextField
                {...p}
                label="Specialty"
                placeholder="e.g., Cardiology / GI / ENT"
                
              />
            )}
            sx={{ minWidth: 260, ...darkFieldSX }}
          />
          <Autocomplete
            multiple
            options={allStates}
            value={selStates}
            onChange={(_, v) => setSelStates(v)}
            renderInput={(p) => <TextField {...p} label="State" />}
            sx={{ minWidth: 240, ...darkFieldSX }}
          />

          <Tooltip title="Search matches name, specialties, states, DNU, WC states, and notes">
            <TextField
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 260, flex: 1, maxWidth: 560, ...darkFieldSX }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Search the directory">
                      <SearchIcon />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Tooltip>

          <Tooltip title="Only show reviewers who have at least one WC state listed">
            <FormControlLabel
              sx={{
                ml: 0.5,
                userSelect: "none",
                "& .MuiFormControlLabel-label": { color: TXT_PRIMARY, fontWeight: 800, fontSize: 12 },
              }}
              control={
                <Checkbox
  checked={hasWCOnly}
  onChange={(e) => setHasWCOnly(e.target.checked)}
  sx={{
    color: alpha("#22c55e", 0.6),          
    "&:hover": {
      backgroundColor: alpha("#22c55e", 0.08),
    },
    "&.Mui-checked": {
      color: "#22c55e",                   
    },
    "&.Mui-checked:hover": {
      backgroundColor: alpha("#22c55e", 0.14),
    },
  }}
/>
              }
              label="Has WC Jurisdiction"
            />
          </Tooltip>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
            {hasAnyFilters ? (
              <Button
                size="small"
                onClick={clearAllFilters}
                startIcon={<ClearAllIcon />}
                sx={{
                  borderRadius: 999,
                  fontWeight: 900,
                  color: "#fff",
                  border: `1px solid ${alpha("#7aa2ff", 0.45)}`,
                  background: alpha("#0b0e19", 0.22),
                  "&:hover": { background: alpha("#7aa2ff", 0.10) },
                }}
                variant="outlined"
              >
                Clear filters
              </Button>
            ) : null}

            <Typography
              variant="subtitle2"
              sx={{
                pr: 0.5,
                color: TXT_PRIMARY,
                fontWeight: highContrast ? 900 : 700,
                letterSpacing: highContrast ? 0.3 : 0.1,
                whiteSpace: "nowrap",
              }}
            >
              {totalLabel}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {err && (
        <Alert
          severity="warning"
          sx={{
            flexShrink: 0,
            bgcolor: alpha("#0b0e19", 0.55),
            color: TXT_PRIMARY,
            border: `1px solid ${alpha("#f59e0b", 0.35)}`,
            "& .MuiAlert-icon": { color: "#f59e0b" },
          }}
          action={<Chip size="small" label="Retry" onClick={fetchData} sx={{ cursor: "pointer", fontWeight: 700 }} />}
        >
          {err}
        </Alert>
      )}

      <Paper sx={tablePaper}>
        {/* Filter pills summary */}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderBottom: `1px solid ${alpha("#ffffff", 0.10)}`,
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Tooltip title="Active filters. Click a pill to remove it.">
            <Typography variant="caption" sx={{ color: TXT_SECONDARY, fontWeight: 900, letterSpacing: 0.3 }}>
              Filters:
            </Typography>
          </Tooltip>

          {activePills.length ? (
            activePills.map((p) => (
              <Tooltip key={p.key} title="Click to remove this filter">
                <Chip
                  size="small"
                  label={p.label}
                  onClick={() => {
                    if (p.type === "spec") setSelSpecs((cs) => cs.filter((x) => x !== p.value));
                    else if (p.type === "state") setSelStates((cs) => cs.filter((x) => x !== p.value));
                    else if (p.type === "search") {
                      setSearch("");
                      setDebouncedSearch("");
                    } else if (p.type === "wc") setHasWCOnly(false);
                  }}
                  sx={{
                    height: 24,
                    fontWeight: 900,
                    color: "#fff",
                    background: alpha("#7aa2ff", 0.12),
                    border: `1px solid ${alpha("#7aa2ff", 0.45)}`,
                    "&:hover": { background: alpha("#7aa2ff", 0.18) },
                  }}
                />
              </Tooltip>
            ))
          ) : (
            <Typography variant="caption" sx={{ color: TXT_MUTED }}>
              None
            </Typography>
          )}

          <Box sx={{ ml: "auto" }} />
        </Box>

       <TableContainer
  sx={{
    flex: 1,
    minHeight: 0,
    maxHeight: "100%",
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
  
    position: "relative",
  }}
>
  <Table
    stickyHeader
    size={isCompact ? "small" : "medium"}
    sx={{
      tableLayout: "auto",
      borderCollapse: "separate",
      borderSpacing: 0,

      "& td, & th": { borderBottom: cellBorder, verticalAlign: "top", color: TXT_PRIMARY },
      "& tr:last-of-type td": { borderBottom: "none" },
      "& .MuiTableCell-root": { color: TXT_PRIMARY },
      "& .MuiTypography-root": { color: "inherit" },

  
      "& thead tr th": {
        boxShadow: `inset 0 -1px 0 ${alpha("#ffffff", 0.18)}`,
      },
    }}
  >
    <TableHead>
  <TableRow>
    <TableCell sx={{ ...headerCellSX, width: 390, minWidth: 360 }}>
      <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleSort("name")}>
        Name
      </TableSortLabel>
    </TableCell>

    <TableCell sx={{ ...headerCellSX, width: 430 }}>
      <TableSortLabel active={orderBy === "specialties"} direction={order} onClick={() => handleSort("specialties")}>
        Specialties
      </TableSortLabel>
    </TableCell>

    <TableCell sx={{ ...headerCellSX, width: 360 }}>
      <Tooltip title="States where this reviewer has active licensure." placement="top" arrow>
        <Box sx={{ display: "inline-flex", alignItems: "center" }}>
          <TableSortLabel active={orderBy === "states"} direction={order} onClick={() => handleSort("states")}>
            States of Licensure
          </TableSortLabel>
        </Box>
      </Tooltip>
    </TableCell>

    <TableCell sx={{ ...headerCellSX, width: 150 }}>
      <Tooltip title="DNU means a client has requested this reviewer not be used for that client for any reason." placement="top" arrow>
        <Box sx={{ display: "inline-flex", alignItems: "center" }}>
          <TableSortLabel active={orderBy === "dnu"} direction={order} onClick={() => handleSort("dnu")}>
            DNU
          </TableSortLabel>
        </Box>
      </Tooltip>
    </TableCell>

    <TableCell sx={{ ...headerCellSX, width: 200 }}>
      <Tooltip
        title="WC State Jurisdiction means the reviewer can handle Workers’ Comp cases in that state and meets any jurisdictional requirements."
        placement="top"
        arrow
      >
        <Box sx={{ display: "inline-flex", alignItems: "center" }}>
          <TableSortLabel
            active={orderBy === "wc_state_jurisdiction"}
            direction={order}
            onClick={() => handleSort("wc_state_jurisdiction")}
          >
            WC State Jurisdiction
          </TableSortLabel>
        </Box>
      </Tooltip>
    </TableCell>

    <TableCell
      sx={{
        ...headerCellSX,
        width: NOTES_MAX_W,
        maxWidth: NOTES_MAX_W,
        minWidth: NOTES_MIN_W,
      }}
    >
      <Tooltip
        title="Shared collaborative notes visible to all users. Add anything helpful such as internal classifications, reminders, or context."
        placement="top"
        arrow
      >
        <Box sx={{ display: "inline-flex", alignItems: "center" }}>
          <TableSortLabel active={orderBy === "notes"} direction={order} onClick={() => handleSort("notes")}>
            Notes
          </TableSortLabel>
        </Box>
      </Tooltip>
    </TableCell>
  </TableRow>
</TableHead>

    <TableBody>
      {sorted.map((r, idx) => {
        const saving = !!notesSaving[r.id];
        const nerr = notesError[r.id];
        const isEditing = notesEditing === r.id;
        const canEditNotes = authed && r.id != null;

        const stripeBg = idx % 2 === 0 ? rowStripeBg : "transparent";

        return (
          <TableRow
            key={stableRowKey(r, idx)}
            hover
            sx={{
              background: stripeBg,
              "&:hover": { background: rowHoverBg },
            }}
          >
            <TableCell
              sx={{
                py: cellPadY,
                fontWeight: 900,
                color: "#ffffff",
                textShadow: "0 0 8px rgba(255,255,255,0.15)",
              }}
            >
              {formatDisplayName(r.name)}
            </TableCell>

            <TableCell sx={{ py: cellPadY }}>
              {renderGroupedChips({
                id: r.id ?? `row-${idx}`,
                col: "spec",
                items: uniq(r.specialties || []),
                limit: 5,
                tooltip: "Show all specialties",
                renderItem: (s, i) => {
                  const bg = colorForSpecialty(s, highContrast);
                  const fg = contrastText(bg);
                  return (
                    <Tooltip key={`spec-${idx}-${i}-${s}`} title="Click to filter by this specialty">
                      <Chip
                        label={s}
                        size="small"
                        onClick={() => toggleSpec(s)}
                        sx={{
                          m: CHIP_M,
                          px: CHIP_PX,
                          background: highContrast ? bg : colorForSpecialty(s, false),
                          color: highContrast ? fg : "#fff",
                          cursor: "pointer",
                          fontWeight: highContrast ? 800 : 700,
                          border: `${selSpecs.includes(s) ? 2 : 1}px solid ${
                            selSpecs.includes(s) ? alpha("#7aa2ff", 0.95) : alpha("#000", 0.22)
                          }`,
                        }}
                      />
                    </Tooltip>
                  );
                },
              })}
            </TableCell>

            <TableCell sx={{ py: cellPadY }}>
              {renderGroupedChips({
                id: r.id ?? `row-${idx}`,
                col: "states",
                items: uniq(r.states || []),
                limit: 8,
                tooltip: "Show all states",
                renderItem: (st, i) => (
                  <Tooltip key={`state-${idx}-${i}-${st}`} title="Click to filter by this state">
                    <Chip
                      label={st}
                      size="small"
                      onClick={() => toggleState(st)}
                      sx={{
                        m: CHIP_M,
                        px: CHIP_PX,
                        cursor: "pointer",
                        fontWeight: 800,
                        background: alpha("#0b0e19", 0.22),
                        color: TXT_PRIMARY,
                        border: `${selStates.includes(st) ? 2 : 1}px solid ${
                          selStates.includes(st) ? alpha("#7aa2ff", 0.95) : alpha("#eaf2ff", 0.30)
                        }`,
                        "&:hover": { background: alpha("#7aa2ff", 0.10) },
                      }}
                    />
                  </Tooltip>
                ),
              })}
            </TableCell>

            <TableCell sx={{ py: cellPadY }}>
              {(r.dnu || []).length ? (
                renderGroupedChips({
                  id: r.id ?? `row-${idx}`,
                  col: "dnu",
                  items: uniq(r.dnu || []),
                  limit: 3,
                  tooltip: "Show all DNU tags",
                  renderItem: (tag, i) => (
                    <Chip
                      key={`dnu-${idx}-${i}-${tag}`}
                      label={tag}
                      size="small"
                      sx={{
                        m: CHIP_M,
                        px: CHIP_PX,
                        fontWeight: 900,
                        background: alpha("#ef4444", 0.18),
                        color: "#fff",
                        border: `1px solid ${alpha("#ef4444", 0.55)}`,
                      }}
                    />
                  ),
                })
              ) : (
                <Typography variant="caption" sx={{ color: TXT_MUTED }}>
                  —
                </Typography>
              )}
            </TableCell>

            <TableCell sx={{ py: cellPadY }}>
              {(r.wc_state_jurisdiction || []).length ? (
                renderGroupedChips({
                  id: r.id ?? `row-${idx}`,
                  col: "wc",
                  items: uniq(r.wc_state_jurisdiction || []),
                  limit: 6,
                  tooltip: "Show all WC states",
                  renderItem: (st, i) => (
                    <Chip
                      key={`wc-${idx}-${i}-${st}`}
                      label={st}
                      size="small"
                      sx={{
                        m: CHIP_M,
                        px: CHIP_PX,
                        fontWeight: 900,
                        background: alpha("#60a5fa", 0.16),
                        color: "#fff",
                        border: `1px solid ${alpha("#60a5fa", 0.55)}`,
                      }}
                    />
                  ),
                })
              ) : (
                <Typography variant="caption" sx={{ color: TXT_MUTED }}>
                  —
                </Typography>
              )}
            </TableCell>

            <TableCell
              sx={{
                py: cellPadY,
                px: 1,
                width: NOTES_MAX_W,
                maxWidth: NOTES_MAX_W,
                minWidth: NOTES_MIN_W,
                cursor: canEditNotes ? "text" : "default",
                "&:hover": canEditNotes ? { backgroundColor: notesHoverBg } : undefined,
              }}
              onClick={() => {
                if (!canEditNotes) return;
                setNotesEditing(r.id);
                setNotesError((m) => ({ ...m, [r.id]: "" }));
                setNotesDraft((m) => ({ ...m, [r.id]: m[r.id] ?? (r.notes ?? "") }));
              }}
            >
              {isEditing ? (
                <TextField
                  autoFocus
                  multiline
                  minRows={2}
                  maxRows={6}
                  value={notesDraft[r.id] ?? ""}
                  onChange={(e) => setNotesDraft((m) => ({ ...m, [r.id]: e.target.value }))}
                  onBlur={() => saveNotes(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      saveNotes(r.id);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      setNotesDraft((m) => ({ ...m, [r.id]: r.notes ?? "" }));
                      setNotesEditing(null);
                      return;
                    }
                    e.stopPropagation();
                  }}
                  size="small"
                  disabled={saving}
                  fullWidth
                  sx={{
                    "& .MuiInputBase-root": {
                      fontSize: 13,
                      lineHeight: 1.35,
                      background: notesActiveBg,
                      color: TXT_PRIMARY,
                    },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 0,
                      "& fieldset": { borderColor: alpha("#7aa2ff", 0.45) },
                      "&:hover fieldset": { borderColor: alpha("#7aa2ff", 0.70) },
                      "&.Mui-focused fieldset": { borderColor: alpha("#7aa2ff", 0.90) },
                    },
                  }}
                  InputProps={{
                    endAdornment: saving ? (
                      <InputAdornment position="end">
                        <CircularProgress size={14} sx={{ color: TXT_PRIMARY }} />
                      </InputAdornment>
                    ) : null,
                  }}
                />
              ) : toStr(r.notes) ? (
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: TXT_PRIMARY,
                    maxWidth: NOTES_MAX_W,
                  }}
                >
                  {r.notes}
                </Typography>
              ) : (
                <Typography
                  component="span"
                  sx={{
                    fontSize: 11,
                    opacity: 0.45,
                    fontStyle: "italic",
                    color: PLACEHOLDER,
                  }}
                >
                  {canEditNotes ? "click to add notes" : "login to edit notes"}
                </Typography>
              )}

              {nerr ? (
                <Typography variant="caption" sx={{ color: "#ef4444", fontWeight: 700, mt: 0.5, display: "block" }}>
                  {nerr}
                </Typography>
              ) : null}
            </TableCell>
          </TableRow>
        );
      })}

      {!loading && !sorted.length && (
        <TableRow>
          <TableCell colSpan={6} sx={{ borderBottom: "none" }}>
            <Typography variant="body2" sx={{ color: TXT_SECONDARY }}>
              No results
            </Typography>
            {hasAnyFilters ? (
              <Button
                size="small"
                onClick={clearAllFilters}
                sx={{ mt: 1, fontWeight: 900, color: "#fff", border: `1px solid ${alpha("#7aa2ff", 0.45)}` }}
                variant="outlined"
              >
                Clear filters
              </Button>
            ) : null}
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
</TableContainer>

        <Divider sx={{ borderColor: alpha("#ffffff", 0.10) }} />
        <Box sx={{ px: 2, py: 1.25, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          <Box sx={{ ml: "auto" }} />
          <Typography variant="caption" sx={{ color: TXT_MUTED }}>
            © {new Date().getFullYear()} PeerLink Medical. All rights reserved.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}