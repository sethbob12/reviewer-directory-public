// src/ReviewerDirectoryPublic.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Paper, Typography, TextField, InputAdornment,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TableSortLabel,
  Chip, IconButton, Tooltip, Switch, FormControlLabel, CircularProgress, Alert
} from "@mui/material";
import { Search as SearchIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { supabase } from "./supabaseClient.js";

// ====== CONFIG ======
const VIEW_NAME = "public_reviewer_directory"; // columns: id, name, specialties, states

// ====== UTILS ======
const specialtyColors = [
  "#1976d2","#388e3c","#fbc02d","#7b1fa2",
  "#d32f2f","#0097a7","#8d6e63","#c2185b",
  "#0288d1","#43a047","#ffa000","#6d4c41",
  "#512da8","#455a64",
];

function colorForSpecialty(s) {
  if (!s) return "#777";
  let hash = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return specialtyColors[Math.abs(hash) % specialtyColors.length];
}

const toStr = v => (v ?? "").toString().trim();

function splitNameAndCred(full) {
  const n = toStr(full);
  if (!n) return { base: "", cred: "" };
  const parts = n.split(",");
  if (parts.length === 1) return { base: n.trim(), cred: "" };
  return { base: parts[0].trim(), cred: parts.slice(1).join(",").trim() };
}

function toLastFirst(base) {
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return base;
  const last = parts[parts.length - 1];
  const firstMid = parts.slice(0, -1).join(" ");
  return `${last}, ${firstMid}`;
}

function formatDisplayName(full, lastFirst) {
  const { base, cred } = splitNameAndCred(full);
  const styled = lastFirst ? toLastFirst(base) : base;
  return cred ? `${styled}, ${cred}` : styled;
}

function lastNameKey(full) {
  const { base } = splitNameAndCred(full);
  const parts = base.split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1] || "").toLowerCase();
}

// Normalize specialties/states to arrays even if the DB returns strings
function asArray(x) {
  if (Array.isArray(x)) return x.filter(Boolean);
  if (x == null) return [];
  if (typeof x === "string") {
    try {
      const j = JSON.parse(x);
      if (Array.isArray(j)) return j.filter(Boolean);
      // fallthrough to comma split if JSON is not an array
    } catch {/* ignore */}
    return String(x)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

// Stable, unique-ish key for rows (handles no id)
function stableRowKey(r, idx) {
  const id = r.id != null ? `id:${r.id}` : "";
  const name = toStr(r.name).toLowerCase();
  const sig = `${name}|${(r.specialties||[]).join("|").toLowerCase()}|${(r.states||[]).join("|").toLowerCase()}`;
  return id || `sig:${sig}#${idx}`;
}

// ====== COMPONENT ======
export default function ReviewerDirectoryPublic() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // UI state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [orderBy, setOrderBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [lastFirst, setLastFirst] = useState(true);

  const debounceTimer = useRef(null);

  // Debounce search for smoother typing
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  // Fetch public data
  const fetchData = async () => {
    setErr("");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(VIEW_NAME)
        .select("id,name,specialties,states")
        .order("name", { ascending: true });

      if (error) throw error;

      const normalized = (Array.isArray(data) ? data : []).map(r => ({
        id: r.id,
        name: r.name || "",
        specialties: asArray(r.specialties),
        states: asArray(r.states).map(s => s.toUpperCase()),
      }));
      setRows(normalized);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global filter across name, specialties, states
  const filtered = useMemo(() => {
    const terms = debouncedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return rows;
    return rows.filter(r => {
      const hay = [r.name, ...(r.specialties || []), ...(r.states || [])].join(" ").toLowerCase();
      return terms.every(t => hay.includes(t));
    });
  }, [rows, debouncedSearch]);

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const getKey = (row) => {
        if (orderBy === "name") {
          // Always sort by actual last-name key, then by full name, so
          // visual toggle (Last, First) doesn’t change sort semantics.
          return `${lastNameKey(row.name)}|||${row.name.toLowerCase()}`;
        }
        if (orderBy === "specialties") return (row.specialties || []).join(", ").toLowerCase();
        if (orderBy === "states") return (row.states || []).join(", ").toLowerCase();
        return String(row[orderBy] ?? "").toLowerCase();
      };
      const A = getKey(a), B = getKey(b);
      if (A < B) return order === "asc" ? -1 : 1;
      if (A > B) return order === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, orderBy, order]);

  const totalCount = rows.length;

  const handleSort = (col) => {
    if (orderBy === col) setOrder(o => (o === "asc" ? "desc" : "asc"));
    else { setOrderBy(col); setOrder("asc"); }
  };

  const bg = theme.palette.mode === "dark"
    ? "linear-gradient(180deg, #0b0e19, #161b2c)"
    : "linear-gradient(180deg, #eef2f7, #e2e8f0)";

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, minHeight: "100vh", background: bg }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Reviewer Directory
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {sorted.length} of {totalCount} reviewers
        </Typography>
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search + Display toggle */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          label="Search name, specialty, or state"
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
          InputProps={{ endAdornment: <InputAdornment position="end"><SearchIcon /></InputAdornment> }}
        />
        <Box sx={{ mt: 1 }}>
          <FormControlLabel
            control={<Switch size="small" checked={lastFirst} onChange={() => setLastFirst(v => !v)} />}
            label={<Typography variant="caption">Display as Last, First</Typography>}
          />
        </Box>
      </Paper>

      {/* Errors and loading */}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading...</Typography>
        </Box>
      )}

      {/* Table */}
      <TableContainer component={Paper} sx={{ height: "calc(100vh - 260px)", overflowY: "auto" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 380 }}>
                <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleSort("name")}>
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 360 }}>
                <TableSortLabel active={orderBy === "specialties"} direction={order} onClick={() => handleSort("specialties")}>
                  Specialties
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 240 }}>
                <TableSortLabel active={orderBy === "states"} direction={order} onClick={() => handleSort("states")}>
                  States of Licensure
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sorted.map((r, idx) => (
              <TableRow key={stableRowKey(r, idx)} hover>
                <TableCell>{formatDisplayName(r.name, lastFirst)}</TableCell>
                <TableCell>
                  {(r.specialties || []).map((s, i) => (
                    <Chip
                      key={`spec-${idx}-${i}-${s}`}
                      label={s}
                      size="small"
                      sx={{ m: 0.3, background: colorForSpecialty(s), color: "#fff" }}
                    />
                  ))}
                </TableCell>
                <TableCell>
                  {(r.states || []).map((st, i) => (
                    <Chip key={`state-${idx}-${i}-${st}`} label={st} size="small" sx={{ m: 0.3 }} />
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

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Public view: name, specialties, and states only.
      </Typography>
    </Box>
  );
}
