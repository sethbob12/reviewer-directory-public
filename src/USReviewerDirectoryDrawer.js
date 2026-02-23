// src/USReviewerDirectoryDrawer.js
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Drawer,
  Paper,
  Stack,
  Typography,
  IconButton,
  Chip,
  TextField,
  Divider,
  Tooltip,
  Checkbox,
  FormControlLabel,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { alpha } from "@mui/material/styles";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const MAP_SECTION_H = "min(84vh, 920px)";

const US_50 = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
]);

const STATE_NAME_TO_CODE = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

function toStrArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  try {
    if (typeof v === "string" && v.trim().startsWith("[")) {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    }
  } catch {}
  return typeof v === "string"
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

function normalizeState(s) {
  if (!s) return "";
  const t = String(s).trim().toUpperCase();
  const nameToAbbr = {
    ALABAMA: "AL",
    ALASKA: "AK",
    ARIZONA: "AZ",
    ARKANSAS: "AR",
    CALIFORNIA: "CA",
    COLORADO: "CO",
    CONNECTICUT: "CT",
    DELAWARE: "DE",
    FLORIDA: "FL",
    GEORGIA: "GA",
    HAWAII: "HI",
    IDAHO: "ID",
    ILLINOIS: "IL",
    INDIANA: "IN",
    IOWA: "IA",
    KANSAS: "KS",
    KENTUCKY: "KY",
    LOUISIANA: "LA",
    MAINE: "ME",
    MARYLAND: "MD",
    MASSACHUSETTS: "MA",
    MICHIGAN: "MI",
    MINNESOTA: "MN",
    MISSISSIPPI: "MS",
    MISSOURI: "MO",
    MONTANA: "MT",
    NEBRASKA: "NE",
    NEVADA: "NV",
    "NEW HAMPSHIRE": "NH",
    "NEW JERSEY": "NJ",
    "NEW MEXICO": "NM",
    "NEW YORK": "NY",
    "NORTH CAROLINA": "NC",
    "NORTH DAKOTA": "ND",
    OHIO: "OH",
    OKLAHOMA: "OK",
    OREGON: "OR",
    PENNSYLVANIA: "PA",
    "RHODE ISLAND": "RI",
    "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD",
    TENNESSEE: "TN",
    TEXAS: "TX",
    UTAH: "UT",
    VERMONT: "VT",
    VIRGINIA: "VA",
    WASHINGTON: "WA",
    "WEST VIRGINIA": "WV",
    WISCONSIN: "WI",
    WYOMING: "WY",
    "DISTRICT OF COLUMBIA": "DC",
    DC: "DC",
  };
  if (t.length === 2) return t;
  return nameToAbbr[t] || t.slice(0, 2);
}

function nameLine(r) {
  const n = String(r?.name || "").trim();
  const c = String(r?.credential || "").trim();
  if (!n) return "";
  if (!c) return n;
  const ln = n.toLowerCase();
  const lc = c.toLowerCase();
  if (ln.endsWith(`, ${lc}`) || ln.endsWith(` ${lc}`)) return n;
  return `${n}, ${c}`;
}

function specialtyList(r) {
  return toStrArray(r?.specialties);
}

function getReviewerStates(r) {
  return toStrArray(r?.states).map(normalizeState).filter(Boolean);
}

function wcStateList(r) {
  return toStrArray(r?.wc_state_jurisdiction).map(normalizeState).filter(Boolean);
}

function dnuList(r) {
  return toStrArray(r?.dnu).filter(Boolean);
}

/* ---------- colorful chip helpers ---------- */
function hashHue(str) {
  const s = String(str || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function specialtyChipSx(label, dark) {
  const hue = hashHue(label);
  const sat = dark ? 78 : 74;
  const l1 = dark ? 58 : 52;
  const l2 = dark ? 46 : 44;

  const a1 = dark ? 0.28 : 0.18;
  const a2 = dark ? 0.18 : 0.12;

  const c1 = `hsla(${hue}, ${sat}%, ${l1}%, ${a1})`;
  const c2 = `hsla(${(hue + 28) % 360}, ${sat}%, ${l2}%, ${a2})`;

  return {
    height: 22,
    fontWeight: 900,
    borderRadius: 999,
    color: dark ? alpha("#fff", 0.92) : alpha("#0b1220", 0.90),
    background: `linear-gradient(135deg, ${c1}, ${c2})`,
    border: `1px solid ${alpha(dark ? "#fff" : "#0b1220", dark ? 0.16 : 0.10)}`,
    boxShadow: dark ? "0 10px 20px rgba(0,0,0,.24)" : "0 10px 20px rgba(20,35,60,.10)",
    backdropFilter: "blur(10px) saturate(160%)",
    WebkitBackdropFilter: "blur(10px) saturate(160%)",
    "& .MuiChip-label": { px: 1.0 },
  };
}

function tagChipSx({ kind, dark }) {
  // kind: "wc" | "dnu"
  const base =
    kind === "wc"
      ? { hue: 142, sat: 70, light: dark ? 56 : 50 } // green
      : { hue: 358, sat: 72, light: dark ? 58 : 52 }; // red/pink

  const a1 = dark ? 0.22 : 0.14;
  const a2 = dark ? 0.14 : 0.10;

  const c1 = `hsla(${base.hue}, ${base.sat}%, ${base.light}%, ${a1})`;
  const c2 = `hsla(${(base.hue + 18) % 360}, ${base.sat}%, ${dark ? 44 : 46}%, ${a2})`;

  return {
    height: 22,
    fontWeight: 950,
    borderRadius: 999,
    color: dark ? alpha("#fff", 0.92) : alpha("#0b1220", 0.88),
    background: `linear-gradient(135deg, ${c1}, ${c2})`,
    border: `1px solid ${alpha(dark ? "#fff" : "#0b1220", dark ? 0.14 : 0.10)}`,
    backdropFilter: "blur(10px) saturate(160%)",
    WebkitBackdropFilter: "blur(10px) saturate(160%)",
    "& .MuiChip-label": { px: 0.95 },
  };
}

export default function USReviewerDirectoryDrawer({
  open,
  onClose,
  reviewers = [],
  onOpenReviewerDetails,
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";

  const [activeState, setActiveState] = useState("ALL");
  const [query, setQuery] = useState("");
  const [wcOnly, setWcOnly] = useState(false);

  const byState = useMemo(() => {
    const map = new Map();
    for (const r of reviewers || []) {
      const states = getReviewerStates(r);
      if (!states.length) continue;
      for (const code of states) {
        if (!map.has(code)) map.set(code, []);
        map.get(code).push(r);
      }
    }
    for (const [k, arr] of map.entries()) {
      const seen = new Set();
      const next = [];
      for (const r of arr) {
        const id = r?.id ?? r?.reviewer_id ?? r?.npi ?? JSON.stringify([r?.name, r?.email]);
        if (seen.has(id)) continue;
        seen.add(id);
        next.push(r);
      }
      map.set(k, next);
    }
    return map;
  }, [reviewers]);

  const stateCounts = useMemo(() => {
    const obj = {};
    for (const [code, arr] of byState.entries()) obj[code] = arr.length;
    return obj;
  }, [byState]);

  const coveredSet = useMemo(() => new Set(Object.keys(stateCounts)), [stateCounts]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setWcOnly(false);
    if (activeState !== "ALL" && !coveredSet.has(activeState)) setActiveState("ALL");
  }, [open]); // eslint-disable-line

  const leftList = useMemo(() => {
    let list = [];
    if (activeState === "ALL") list = [...(reviewers || [])];
    else list = [...(byState.get(activeState) || [])];

    if (wcOnly) {
      list = list.filter((r) => wcStateList(r).length > 0);
    }

    const q = String(query || "").trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const n = nameLine(r).toLowerCase();
        const sp = specialtyList(r).join(" ").toLowerCase();
        const wc = wcStateList(r).join(" ").toLowerCase();
        const dnu = dnuList(r).join(" ").toLowerCase();
        return n.includes(q) || sp.includes(q) || wc.includes(q) || dnu.includes(q);
      });
    }

    list.sort((a, b) => nameLine(a).localeCompare(nameLine(b)));
    return list;
  }, [activeState, byState, reviewers, query, wcOnly]);

  const mapWrapRef = useRef(null);
  const [tooltip, setTooltip] = useState({ content: "", x: 0, y: 0 });
  const tooltipRef = useRef(null);

  const stats = useMemo(() => {
    const rows = reviewers || [];
    const specialties = new Set();
    const coveredStates50 = new Set();
    let hasDC = false;

    for (const r of rows) {
      const sts = getReviewerStates(r);
      for (const s of sts) {
        if (!s) continue;
        if (US_50.has(s)) coveredStates50.add(s);
      }
      const specs = specialtyList(r);
      for (const sp of specs) if (sp) specialties.add(sp);
    }

    return {
      reviewers: rows.length,
      statesCovered50: coveredStates50.size,
      hasDC,
      specialties: specialties.size,
    };
  }, [reviewers]);

  const activeLabel = activeState === "ALL" ? "All reviewers" : `${activeState} reviewers`;

  const cardSurface = {
    backdropFilter: "blur(26px) saturate(160%)",
    WebkitBackdropFilter: "blur(26px) saturate(160%)",
    background: dark
      ? "linear-gradient(135deg, rgba(10,14,22,.78), rgba(10,14,22,.48))"
      : "linear-gradient(135deg, rgba(255,255,255,.82), rgba(255,255,255,.52))",
    border: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.14 : 0.10)}`,
    borderRadius: "22px",
    boxShadow: dark ? "0 22px 70px rgba(0,0,0,.68)" : "0 22px 70px rgba(20,35,60,.18)",
    position: "relative",
    overflow: "hidden",
  };

  const innerSheen = {
    position: "absolute",
    inset: -2,
    pointerEvents: "none",
    background: dark
      ? "linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,0) 55%)"
      : "linear-gradient(135deg, rgba(255,255,255,.55), rgba(255,255,255,0) 55%)",
    opacity: dark ? 0.55 : 0.65,
    mixBlendMode: dark ? "screen" : "normal",
  };

  const headerShell = {
    position: "relative",
    overflow: "hidden",
    borderRadius: "24px",
    border: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.14 : 0.10)}`,
    background: dark
      ? "linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.04))"
      : "linear-gradient(135deg, rgba(255,255,255,.84), rgba(255,255,255,.56))",
    backdropFilter: "blur(28px) saturate(170%)",
    WebkitBackdropFilter: "blur(28px) saturate(170%)",
    boxShadow: dark ? "0 22px 74px rgba(0,0,0,.70)" : "0 22px 74px rgba(20,35,60,.18)",
  };

  const coverGlow = {
    position: "absolute",
    inset: -180,
    background: dark
      ? "radial-gradient(circle at 16% 18%, rgba(56,189,248,.26), transparent 58%), radial-gradient(circle at 82% 16%, rgba(168,85,247,.18), transparent 58%), radial-gradient(circle at 70% 88%, rgba(34,197,94,.18), transparent 58%), radial-gradient(circle at 35% 80%, rgba(244,63,94,.12), transparent 58%)"
      : "radial-gradient(circle at 16% 18%, rgba(56,189,248,.32), transparent 58%), radial-gradient(circle at 82% 16%, rgba(168,85,247,.22), transparent 58%), radial-gradient(circle at 70% 88%, rgba(34,197,94,.20), transparent 58%), radial-gradient(circle at 35% 80%, rgba(244,63,94,.14), transparent 58%)",
    filter: "blur(30px)",
    pointerEvents: "none",
  };

  const baseFill = dark ? "rgba(255,255,255,.08)" : "rgba(2,6,23,.05)";
  const baseStroke = dark ? "rgba(255,255,255,.20)" : "rgba(2,6,23,.14)";

  const coveredFill = dark ? "rgba(34,197,94,.32)" : "rgba(34,197,94,.18)";
  const coveredStroke = dark ? "rgba(34,197,94,.86)" : "rgba(21,128,61,.58)";

  const activeFill = dark ? "rgba(96,165,250,.34)" : "rgba(96,165,250,.18)";
  const activeStroke = dark ? "rgba(96,165,250,.94)" : "rgba(37,99,235,.56)";

  const hoverFill = dark ? "rgba(255,255,255,.14)" : "rgba(2,6,23,.08)";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", md: "min(1480px, 100%)" },
          border: "none",
          background: "transparent",
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        sx={{
          p: { xs: 1, sm: 1.25 },
          display: "flex",
          flexDirection: "column",
          gap: 1,
          minHeight: 0,
          height: "100%",
        }}
      >
        {/* Header */}
        <Box sx={{ ...headerShell, p: 1.35 }}>
          <Box sx={coverGlow} />
          <Box sx={innerSheen} />

          <Stack direction="row" spacing={1} alignItems="center" sx={{ position: "relative" }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 980, fontSize: "1.10rem", lineHeight: 1.15 }}>
                US Reviewer Directory
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.80 }}>
                Click a highlighted state to filter. Search by name, specialty, WC states, or DNU.
              </Typography>
            </Box>

            <Chip
              size="small"
              label={activeLabel}
              sx={{
                fontWeight: 950,
                borderRadius: 999,
                bgcolor: alpha(dark ? "#fff" : "#000", dark ? 0.06 : 0.04),
                border: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.14 : 0.10)}`,
              }}
            />

            <IconButton
              onClick={onClose}
              aria-label="Close"
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.14 : 0.10)}`,
                bgcolor: alpha(dark ? "#fff" : "#000", dark ? 0.05 : 0.03),
                flexShrink: 0,
                ml: 0.25,
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Body */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "520px 1fr" },
            gap: 1,
            minHeight: 0,
            flex: 1,
          }}
        >
          {/* LEFT PANEL */}
          <Paper
            sx={{
              ...cardSurface,
              height: { xs: "auto", md: MAP_SECTION_H },
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={innerSheen} />

            <Box
              sx={{
                position: "relative",
                p: 1.15,
                borderBottom: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.10 : 0.08)}`,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  label={activeState === "ALL" ? "All states" : `State: ${activeState}`}
                  onClick={() => setActiveState("ALL")}
                  sx={{
                    fontWeight: 950,
                    borderRadius: 999,
                    cursor: "pointer",
                    bgcolor: alpha("#60a5fa", dark ? 0.18 : 0.10),
                    border: `1px solid ${alpha("#60a5fa", 0.36)}`,
                  }}
                />

                <Box sx={{ flex: 1 }} />

                <Typography variant="caption" sx={{ opacity: 0.78, fontWeight: 900 }}>
                  {leftList.length} shown
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <TextField
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, specialty, WC, DNU..."
                  size="small"
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      bgcolor: dark ? alpha("#fff", 0.05) : alpha("#000", 0.02),
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: alpha(dark ? "#fff" : "#000", dark ? 0.18 : 0.12),
                    },
                  }}
                />

                <FormControlLabel
                  sx={{
                    ml: 0,
                    mr: 0,
                    userSelect: "none",
                    "& .MuiFormControlLabel-label": {
                      fontSize: 12,
                      fontWeight: 900,
                      opacity: 0.86,
                      whiteSpace: "nowrap",
                    },
                  }}
                  control={
                    <Checkbox
                      checked={wcOnly}
                      onChange={(e) => setWcOnly(e.target.checked)}
                      size="small"
                      sx={{
                        p: 0.5,
                        mr: 0.25,
                        color: alpha("#22c55e", dark ? 0.80 : 0.65),
                        "&.Mui-checked": { color: alpha("#22c55e", dark ? 0.95 : 0.85) },
                      }}
                    />
                  }
                  label="WC states only"
                />
              </Stack>
            </Box>

            <Divider sx={{ opacity: 0.35 }} />

            <Box sx={{ position: "relative", minHeight: 0, flex: 1, overflowY: "auto", p: 1.15 }}>
              <Stack spacing={0.8}>
                {leftList.map((r) => {
                  const nm = nameLine(r);
                  const specs = specialtyList(r);
                  const wcStates = wcStateList(r);
                  const dnu = dnuList(r);

                  return (
                    <Paper
                      key={r?.id ?? r?.reviewer_id ?? r?.npi ?? `${r?.name}-${r?.email}`}
                      elevation={0}
                      onClick={() => onOpenReviewerDetails?.(r)}
                      sx={{
                        p: 1,
                        borderRadius: 3,
                        cursor: onOpenReviewerDetails ? "pointer" : "default",
                        border: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.12 : 0.08)}`,
                        bgcolor: dark ? alpha("#fff", 0.045) : alpha("#fff", 0.62),
                        backdropFilter: "blur(18px) saturate(150%)",
                        WebkitBackdropFilter: "blur(18px) saturate(150%)",
                        transition: "transform 140ms ease, box-shadow 140ms ease, background 140ms ease",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: dark
                            ? "0 18px 38px rgba(0,0,0,.52)"
                            : "0 18px 38px rgba(20,35,60,.14)",
                          bgcolor: dark ? alpha("#fff", 0.065) : alpha("#fff", 0.82),
                        },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 980,
                            lineHeight: 1.15,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={nm}
                        >
                          {nm || "Unnamed reviewer"}
                        </Typography>

                        {/* Specialties (colored) */}
                        {specs?.length ? (
                          <Box sx={{ mt: 0.6, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {specs.slice(0, 4).map((s) => (
                              <Chip key={s} size="small" label={s} sx={specialtyChipSx(s, dark)} />
                            ))}
                            {specs.length > 4 ? (
                              <Tooltip title={specs.slice(4).join(", ")}>
                                <Chip
                                  size="small"
                                  label={`+${specs.length - 4}`}
                                  sx={{
                                    height: 22,
                                    fontWeight: 950,
                                    borderRadius: 999,
                                    bgcolor: alpha(dark ? "#fff" : "#000", dark ? 0.06 : 0.04),
                                    border: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.14 : 0.10)}`,
                                  }}
                                />
                              </Tooltip>
                            ) : null}
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ opacity: 0.74 }}>
                            No specialties listed
                          </Typography>
                        )}

                        {/* WC State Jurisdiction (when present) */}
                        {wcStates?.length ? (
                          <Box sx={{ mt: 0.7, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {wcStates.slice(0, 10).map((st) => (
                              <Chip
                                key={`wc-${st}`}
                                size="small"
                                label={`WC: ${st}`}
                                sx={tagChipSx({ kind: "wc", dark })}
                              />
                            ))}
                            {wcStates.length > 10 ? (
                              <Tooltip title={wcStates.slice(10).join(", ")}>
                                <Chip
                                  size="small"
                                  label={`WC +${wcStates.length - 10}`}
                                  sx={tagChipSx({ kind: "wc", dark })}
                                />
                              </Tooltip>
                            ) : null}
                          </Box>
                        ) : null}

                        {/* DNU (when present) */}
                        {dnu?.length ? (
                          <Box sx={{ mt: 0.7, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {dnu.slice(0, 6).map((x) => (
                              <Chip
                                key={`dnu-${x}`}
                                size="small"
                                label={`DNU: ${x}`}
                                sx={tagChipSx({ kind: "dnu", dark })}
                              />
                            ))}
                            {dnu.length > 6 ? (
                              <Tooltip title={dnu.slice(6).join(", ")}>
                                <Chip
                                  size="small"
                                  label={`DNU +${dnu.length - 6}`}
                                  sx={tagChipSx({ kind: "dnu", dark })}
                                />
                              </Tooltip>
                            ) : null}
                          </Box>
                        ) : null}
                      </Box>
                    </Paper>
                  );
                })}

                {!leftList.length ? (
                  <Typography variant="caption" sx={{ opacity: 0.78, fontWeight: 900 }}>
                    No reviewers match this filter.
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </Paper>

          {/* MAP PANEL */}
          <Paper
            sx={{
              ...cardSurface,
              height: { xs: "auto", md: MAP_SECTION_H },
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
            ref={mapWrapRef}
          >
            <Box sx={innerSheen} />

            <Box sx={{ position: "relative", p: 1.15, pb: 0.9 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="overline" sx={{ opacity: 0.85 }}>
                  Map
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Chip
                  size="small"
                  label="Reset"
                  onClick={() => setActiveState("ALL")}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 950,
                    borderRadius: 999,
                    bgcolor: alpha(dark ? "#fff" : "#000", dark ? 0.06 : 0.04),
                    border: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.14 : 0.10)}`,
                  }}
                />
              </Stack>
            </Box>

            {/* MAP VIEWPORT */}
            <Box
              sx={{
                position: "relative",
                flex: 1,
                minHeight: 0,
                px: { xs: 1, md: 1.35 },
                pb: 1.15,
                overflow: "visible",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 12,
                  borderRadius: 4,
                  border: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.10 : 0.06)}`,
                  background: dark ? alpha("#0b1220", 0.20) : alpha("#ffffff", 0.35),
                  backdropFilter: "blur(22px) saturate(150%)",
                  WebkitBackdropFilter: "blur(22px) saturate(150%)",
                  pointerEvents: "none",
                }}
              />

              <Box
                sx={{
                  position: "relative",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pt: { xs: 0.5, md: 0.75 },
                }}
              >
                <ComposableMap
                  projection="geoAlbersUsa"
                  projectionConfig={{ scale: 1300 }}
                  width={1020}
                  height={690}
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    maxWidth: "100%",
                    transform: "scale(0.995)",
                    transformOrigin: "center",
                  }}
                >
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const name = geo.properties?.name;
                        const code = STATE_NAME_TO_CODE[name];
                        const isCovered = code ? coveredSet.has(code) : false;
                        const isActive = code && activeState !== "ALL" ? activeState === code : false;

                        const fill = isActive ? activeFill : isCovered ? coveredFill : baseFill;
                        const stroke = isActive ? activeStroke : isCovered ? coveredStroke : baseStroke;

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={0.95}
                            onClick={() => {
                              if (!code) return;
                              if (!isCovered) return;
                              setActiveState(code);
                            }}
                            onMouseMove={(evt) => {
                              if (!mapWrapRef.current) return;
                              const rect = mapWrapRef.current.getBoundingClientRect();
                              const x = evt.clientX - rect.left;
                              const y = evt.clientY - rect.top;
                              const c = code || "";
                              const ct = c && stateCounts[c] ? ` (${stateCounts[c]})` : "";
                              setTooltip({ content: `${name}${c ? ` (${c})` : ""}${ct}`, x, y });
                            }}
                            onMouseLeave={() => setTooltip({ content: "", x: 0, y: 0 })}
                            style={{
                              default: {
                                outline: "none",
                                cursor: isCovered ? "pointer" : "default",
                                transition: "fill 140ms ease, filter 140ms ease",
                                filter: isCovered
                                  ? dark
                                    ? "drop-shadow(0 12px 16px rgba(0,0,0,.26))"
                                    : "drop-shadow(0 12px 16px rgba(20,35,60,.12))"
                                  : "none",
                              },
                              hover: {
                                outline: "none",
                                fill: isCovered ? fill : hoverFill,
                                filter: dark
                                  ? "drop-shadow(0 14px 20px rgba(0,0,0,.42))"
                                  : "drop-shadow(0 14px 20px rgba(20,35,60,.16))",
                              },
                              pressed: { outline: "none" },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>

                {tooltip.content ? (
                  <Paper
                    ref={tooltipRef}
                    elevation={0}
                    sx={{
                      position: "absolute",
                      top: tooltip.y - 42,
                      left: (() => {
                        const panel = mapWrapRef.current;
                        const tip = tooltipRef.current;

                        const panelW = panel?.getBoundingClientRect?.().width || 0;
                        const tipW = tip?.getBoundingClientRect?.().width || 180;

                        const cursorX = tooltip.x;
                        const rightPad = 14;
                        const leftPad = 14;

                        const wouldOverflowRight = cursorX + rightPad + tipW > panelW - 8;

                        if (wouldOverflowRight) {
                          return Math.max(leftPad, cursorX - rightPad - tipW);
                        }
                        return cursorX + rightPad;
                      })(),
                      pointerEvents: "none",
                      px: 1.1,
                      py: 0.7,
                      borderRadius: 2,
                      bgcolor: dark ? "rgba(10,14,22,.82)" : "rgba(255,255,255,.90)",
                      border: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.14 : 0.10)}`,
                      backdropFilter: "blur(18px) saturate(150%)",
                      WebkitBackdropFilter: "blur(18px) saturate(150%)",
                      zIndex: 50,
                      whiteSpace: "nowrap",
                      boxShadow: dark ? "0 14px 30px rgba(0,0,0,.55)" : "0 14px 30px rgba(20,35,60,.14)",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 950, opacity: 0.94 }}>
                      {tooltip.content}
                    </Typography>
                  </Paper>
                ) : null}
              </Box>
            </Box>

            {/* Stats strip (unchanged) */}
            <Box
              sx={{
                position: "relative",
                px: 1.15,
                py: 1.0,
                borderTop: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.10 : 0.08)}`,
                background: dark ? alpha("#0b1220", 0.10) : alpha("#ffffff", 0.20),
                backdropFilter: "blur(24px) saturate(160%)",
                WebkitBackdropFilter: "blur(24px) saturate(160%)",
              }}
            >
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                <Chip
                  size="small"
                  label={`Reviewers: ${stats.reviewers}`}
                  sx={{
                    fontWeight: 950,
                    borderRadius: 999,
                    bgcolor: alpha(dark ? "#fff" : "#000", dark ? 0.06 : 0.04),
                    border: `1px solid ${alpha(dark ? "#fff" : "#000", dark ? 0.14 : 0.10)}`,
                  }}
                />
                <Chip
                  size="small"
                  label={`States covered: ${stats.statesCovered50}/50`}
                  sx={{
                    fontWeight: 950,
                    borderRadius: 999,
                    bgcolor: alpha("#22c55e", dark ? 0.18 : 0.10),
                    border: `1px solid ${alpha("#22c55e", 0.34)}`,
                  }}
                />
                <Chip
                  size="small"
                  label={`Specialties: ${stats.specialties}`}
                  sx={{
                    fontWeight: 950,
                    borderRadius: 999,
                    bgcolor: alpha("#60a5fa", dark ? 0.18 : 0.10),
                    border: `1px solid ${alpha("#60a5fa", 0.34)}`,
                  }}
                />
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" sx={{ opacity: 0.78, fontWeight: 900 }}>
                  Click a highlighted state to filter the roster
                </Typography>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Drawer>
  );
}