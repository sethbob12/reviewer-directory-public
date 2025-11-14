// src/ReviewerDirectoryPublic.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Paper, Typography, TextField, InputAdornment,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TableSortLabel,
  Chip, CircularProgress, Alert, Autocomplete, Stack, Divider, Tooltip
} from "@mui/material";
import { Search as SearchIcon, Circle as LiveDot } from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";
import { supabase } from "./supabaseClient.js";

const TABLE_NAME = "reviewers";
const STATUS_URL = process.env.REACT_APP_STATUS_URL || null;

/* ========= Specialty synonyms (lowercase) ========= */
const SPEC_SYNONYMS = (() => {
  const map = {};
  const add = (arr) => {
    const set = new Set(arr.map((s) => s.toLowerCase()));
    for (const s of set) map[s] = new Set(set);
  };
  add(["cardiology","cardiovascular disease","interventional cardiology","cardiovascular medicine"]);
  add(["pulmonology","pulmonary medicine","pulmonary","pulmonary/critical care","pccm"]);
  add(["otolaryngology","ent","ear nose throat"]);
  add(["gastroenterology","gi","digestive diseases"]);
  add(["nephrology","renal medicine","kidney disease"]);
  add(["endocrinology","endocrinology, diabetes & metabolism","diabetes & metabolism"]);
  add(["hematology/oncology","heme/onc","oncology","medical oncology","hematology"]);
  add(["pm&r","physical medicine & rehabilitation","physical medicine and rehabilitation","physiatry"]);
  add(["ob/gyn","obstetrics and gynecology","obstetrics & gynecology","gynecology","obstetrics"]);
  add(["orthopedic surgery","orthopedics","orthopaedics","orthopaedic surgery"]);
  add(["family medicine","family practice"]);
  add(["internal medicine","internist"]);
  add(["emergency medicine","er"]);
  add(["general surgery","surgery"]);
  add(["pediatrics","peds"]);
  add(["dermatology","derm"]);
  add(["rheumatology","rheum"]);
  add(["infectious disease","id"]);
  add(["anesthesiology","anesthesia"]);
  add(["pain medicine","pain management"]);
  add(["neurology","neuro"]);
  add(["psychiatry","psych"]);
  add(["psychology","clinical psychology","behavioral health"]);
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

/* ========= UI utils ========= */
const specialtyColors = [
  "#1976d2","#388e3c","#fbc02d","#7b1fa2",
  "#d32f2f","#0097a7","#8d6e63","#c2185b",
  "#0288d1","#43a047","#ffa000","#6d4c41",
  "#512da8","#455a64",
];
const specialtyColorsHC = [
  "#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6",
  "#f97316","#22c55e","#e11d48","#3b82f6","#a855f7","#06b6d4",
];

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
    } catch {}
    return String(x).split(",").map((s) => s.trim()).filter(Boolean);
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

function formatCT(d) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
}

/* ========= Component ========= */
export default function ReviewerDirectoryPublic() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

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

  const [lastUpdated, setLastUpdated] = useState(null);
  const [status, setStatus] = useState({ label: "Unknown", color: "default", uptime: null });

  const debounceTimer = useRef(null);
  const statusTimer = useRef(null);

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

  const fetchData = async () => {
    setErr("");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("id,name,specialties,states,availability")
        .order("name", { ascending: true });

      if (error) throw error;

      const normalized = (Array.isArray(data) ? data : [])
        .filter((r) => String(r.availability || "").toLowerCase() === "available")
        .filter((r) => asArray(r.states).length > 0)
        .map((r) => {
          const specs = Array.from(new Set(asArray(r.specialties))).sort((a, b) => a.localeCompare(b));
          const states = Array.from(new Set(asArray(r.states).map((s) => s.toUpperCase()))).sort();
          const specIndex = buildSpecialtyIndex(specs);
          return { id: r.id, name: r.name || "", specialties: specs, states, _specIndex: specIndex };
        });

      setRows(normalized);
      setLastUpdated(new Date()); // only set on successful fetch
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel("reviewers_public_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviewers" }, () => {
        fetchData();
        // lastUpdated will be set inside fetchData on success
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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

  const allSpecialties = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => r.specialties || []))).sort(),
    [rows]
  );
  const allStates = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => r.states || []))).sort(),
    [rows]
  );

  const toggleSpec = (s) => setSelSpecs((cs) => (cs.includes(s) ? cs.filter((x) => x !== s) : [...cs, s]));
  const toggleState = (st) => setSelStates((cs) => (cs.includes(st) ? cs.filter((x) => x !== st) : [...cs, st]));

  const rowHasSpecialty = (row, wanted) => {
    if (!wanted) return true;
    const syns = expandSpecialtySynonyms(wanted);
    for (const s of syns) if (row._specIndex?.has(s)) return true;
    return false;
  };

  const rowsWithHay = useMemo(() => {
    return rows.map((r) => {
      const name = r.name.toLowerCase();
      const states = (r.states || []).map((x) => String(x).toLowerCase());
      const specs = (r.specialties || []).map((x) => String(x).toLowerCase());
      const syns = Array.from(r._specIndex || []);
      const hay = [name, ...states, ...specs, ...syns].join(" ");
      return { ...r, _hay: hay };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    const terms = debouncedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rowsWithHay.filter((r) => {
      if (selSpecs.length && !selSpecs.every((s) => rowHasSpecialty(r, s))) return false;
      if (selStates.length && !selStates.every((s) => (r.states || []).includes(s))) return false;
      if (!terms.length) return true;
      return terms.every((t) => r._hay.includes(t));
    });
  }, [rowsWithHay, debouncedSearch, selSpecs, selStates]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const key = (row) => {
        if (orderBy === "name") return `${lastNameKey(row.name)}|||${row.name.toLowerCase()}`;
        if (orderBy === "specialties") return (row.specialties || []).join(", ").toLowerCase();
        if (orderBy === "states") return (row.states || []).join(", ").toLowerCase();
        return String(row[orderBy] ?? "").toLowerCase();
      };
      const A = key(a), B = key(b);
      if (A < B) return order === "asc" ? -1 : 1;
      if (A > B) return order === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, orderBy, order]);

  const totalCount = rows.length;
  const handleSort = (col) => {
    if (orderBy === col) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setOrderBy(col);
      setOrder("asc");
    }
  };

  /* ======== Visuals ======== */
  const pageBg = isDark
    ? "radial-gradient(1200px 800px at 10% -10%, rgba(58,104,254,0.20), transparent 60%), radial-gradient(1000px 700px at 110% 10%, rgba(122,162,255,0.18), transparent 55%), #0b0e19"
    : "linear-gradient(180deg, #c9ced6 0%, #c3c9d2 55%, #bfc5ce 100%)";

  const borderAlpha = highContrast ? 0.75 : 0.26;
  const borderColor = alpha(isDark ? "#7aa2ff" : "#3b455c", borderAlpha);
  const outlineThick = highContrast ? 2 : 1;
  const rowHoverAlpha = highContrast ? (isDark ? 0.25 : 0.20) : (isDark ? 0.09 : 0.07);
  const rowDivider = `${outlineThick}px solid ${alpha(theme.palette.text.primary, highContrast ? 0.35 : 0.10)}`;

  const glassPaper = {
    p: 2,
    borderRadius: 3,
    background: isDark
      ? "linear-gradient(180deg, rgba(17,23,39,0.55), rgba(17,23,39,0.35))"
      : "linear-gradient(180deg, rgba(243,246,252,0.65), rgba(233,237,245,0.55))",
    backdropFilter: "blur(12px)",
    border: `${outlineThick}px solid ${borderColor}`,
    boxShadow: `0 10px 36px ${alpha(isDark ? "#7aa2ff" : "#3b455c", isDark ? (highContrast ? 0.35 : 0.20) : (highContrast ? 0.34 : 0.22))}`,
  };

  const tablePaper = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: 3,
    background: isDark
      ? "linear-gradient(180deg, rgba(17,23,39,0.55), rgba(17,23,39,0.35))"
      : "linear-gradient(180deg, rgba(243,246,252,0.70), rgba(233,237,245,0.60))",
    backdropFilter: "blur(12px)",
    border: `${outlineThick}px solid ${borderColor}`,
    boxShadow: `0 14px 48px ${alpha(isDark ? "#7aa2ff" : "#3b455c", isDark ? (highContrast ? 0.40 : 0.22) : (highContrast ? 0.38 : 0.24))}`,
  };

  const headerCellSX = {
    textTransform: highContrast ? "uppercase" : "none",
    fontWeight: highContrast ? 900 : 800,
    letterSpacing: highContrast ? 0.4 : 0.2,
    color: theme.palette.text.primary,
    borderBottom: `${outlineThick}px solid ${alpha(theme.palette.text.primary, highContrast ? 0.45 : (isDark ? 0.18 : 0.14))}`,
    background: highContrast
      ? (isDark ? alpha("#0b0e19", 0.92) : alpha("#e9eef6", 0.98))
      : (isDark ? alpha("#0b0e19", 0.65) : alpha("#e9eef6", 0.92)),
    backdropFilter: "blur(8px)",
  };

  const isCompact = density === "compact";
  const tableSize = isCompact ? "small" : "medium";
  const cellPadY = isCompact ? 0.5 : 1.25;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        px: { xs: 1, md: 4 },
        py: { xs: 1.5, md: 4 },
        background: pageBg,
      }}
    >
      {/* Header: title left, freshness/status right */}
<Box
  sx={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    flexShrink: 0,
    flexWrap: "nowrap",
    gap: 2,
    pr: 6, // a little breathing room under the fixed top-right menu
  }}
>
  <Typography
    variant="h4"
    sx={{ fontWeight: 800, letterSpacing: 0.2, minWidth: 0, whiteSpace: "nowrap" }}
  >
    PeerLink Panel Directory
  </Typography>

  {/* right-side meta */}
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "nowrap" }}>
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
    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
      {lastUpdated ? `Updated · ${formatCT(lastUpdated)} CT` : "Connecting…"}
    </Typography>

    {STATUS_URL && (
      <Tooltip title="Service status">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, whiteSpace: "nowrap" }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background:
                status.color === "default"
                  ? alpha(theme.palette.text.primary, 0.35)
                  : status.color,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {status.label}
            {status.uptime != null ? ` • ${status.uptime.toFixed(2)}%` : ""}
          </Typography>
        </Box>
      </Tooltip>
    )}
  </Box>
</Box>

      {/* Filters */}
      <Paper sx={{ ...glassPaper, flexShrink: 0 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <Autocomplete
            multiple
            options={allSpecialties}
            value={selSpecs}
            onChange={(_, v) => setSelSpecs(v)}
            renderInput={(p) => <TextField {...p} label="Specialty" placeholder="e.g., Cardiology / GI / ENT" />}
            sx={{ minWidth: 260 }}
          />
          <Autocomplete
            multiple
            options={allStates}
            value={selStates}
            onChange={(_, v) => setSelStates(v)}
            renderInput={(p) => <TextField {...p} label="State" />}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Search name, specialty, or state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 280, flex: 1 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Typography
            variant="subtitle2"
            sx={{
              ml: "auto",
              pr: 0.5,
              color: theme.palette.text.primary,
              fontWeight: highContrast ? 900 : 600,
              letterSpacing: highContrast ? 0.3 : 0.1,
            }}
          >
            {sorted.length} of {totalCount}
          </Typography>
        </Box>
      </Paper>

      {/* Errors / Loading */}
      {err && <Alert severity="error" sx={{ flexShrink: 0 }}>{err}</Alert>}
      {loading && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading…</Typography>
        </Stack>
      )}

      {/* Table */}
      <Paper sx={tablePaper}>
        <TableContainer sx={{ flex: 1, overflow: "auto" }}>
          <Table stickyHeader size={tableSize}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headerCellSX, width: 420 }}>
                  <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleSort("name")}>
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...headerCellSX, width: 420 }}>
                  <TableSortLabel active={orderBy === "specialties"} direction={order} onClick={() => handleSort("specialties")}>
                    Specialties
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ ...headerCellSX, width: 280 }}>
                  <TableSortLabel active={orderBy === "states"} direction={order} onClick={() => handleSort("states")}>
                    States of Licensure
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sorted.map((r, idx) => (
                <TableRow
                  key={stableRowKey(r, idx)}
                  hover
                  sx={{
                    position: "relative",
                    borderBottom: rowDivider,
                    "&:hover": {
                      background: alpha(theme.palette.primary.main, rowHoverAlpha),
                      transition: "background 140ms ease",
                    },
                    ...(highContrast && {
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        background: theme.palette.primary.main,
                        opacity: 0.95,
                      },
                    }),
                  }}
                >
                  <TableCell sx={{ py: cellPadY, fontWeight: highContrast ? 800 : 600 }}>
                    {formatDisplayName(r.name)}
                  </TableCell>
                  <TableCell sx={{ py: cellPadY }}>
                    {(r.specialties || []).map((s, i) => {
                      const bg = colorForSpecialty(s, highContrast);
                      const fg = contrastText(bg);
                      return (
                        <Chip
                          key={`spec-${idx}-${i}-${s}`}
                          label={s}
                          size="small"
                          onClick={() => toggleSpec(s)}
                          sx={{
                            m: 0.35,
                            px: 0.6,
                            background: highContrast ? bg : colorForSpecialty(s, false),
                            color: highContrast ? fg : "#fff",
                            cursor: "pointer",
                            fontWeight: highContrast ? 800 : 600,
                            letterSpacing: highContrast ? 0.2 : 0,
                            border: `${selSpecs.includes(s) ? 2 : outlineThick}px solid ${
                              selSpecs.includes(s)
                                ? alpha(theme.palette.primary.main, 0.9)
                                : alpha("#000", isDark ? 0.22 : 0.2)
                            }`,
                            boxShadow: selSpecs.includes(s)
                              ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.35)}`
                              : (highContrast ? `0 0 0 2px ${alpha("#000", isDark ? 0.35 : 0.18)} inset` : "none"),
                          }}
                        />
                      );
                    })}
                  </TableCell>
                  <TableCell sx={{ py: cellPadY }}>
                    {(r.states || []).map((st, i) => (
                      <Chip
                        key={`state-${idx}-${i}-${st}`}
                        label={st}
                        size="small"
                        onClick={() => toggleState(st)}
                        sx={{
                          m: 0.35,
                          px: 0.6,
                          cursor: "pointer",
                          fontWeight: highContrast ? 900 : 600,
                          letterSpacing: highContrast ? 0.3 : 0,
                          textTransform: highContrast ? "uppercase" : "none",
                          background: highContrast
                            ? alpha(theme.palette.background.paper, isDark ? 0.15 : 0.9)
                            : alpha(theme.palette.background.paper, isDark ? 0.3 : 0.4),
                          color: theme.palette.text.primary,
                          border: `${selStates.includes(st) ? 2 : outlineThick}px solid ${
                            selStates.includes(st)
                              ? theme.palette.primary.main
                              : alpha(theme.palette.text.primary, highContrast ? 0.6 : (isDark ? 0.35 : 0.18))
                          }`,
                          boxShadow: selStates.includes(st)
                            ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.35)}`
                            : (highContrast ? `0 0 0 2px ${alpha("#000", isDark ? 0.35 : 0.18)} inset` : "none"),
                        }}
                      />
                    ))}
                  </TableCell>
                </TableRow>
              ))}

              {!loading && !sorted.length && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="text.secondary">No results</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer */}
        <Divider />
        <Box sx={{ px: 2, py: 1.25, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Information updates live and reflects available reviewers only. Public directory contains no PHI.
          </Typography>
          <Box sx={{ ml: "auto" }} />
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} PeerLink Medical. All rights reserved.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
