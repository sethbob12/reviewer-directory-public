// src/App.js
import React, { useMemo, useState, useEffect } from "react";
import {
  ThemeProvider,
  CssBaseline,
  createTheme,
  IconButton,
  Tooltip,
  Box,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Menu as MenuIcon,
  HelpOutline as HelpIcon,
  Check as CheckIcon,
  ViewAgenda as ComfortableIcon,
  ViewCompactAlt as CompactIcon,
  FormatSize as FormatSizeIcon,
} from "@mui/icons-material";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import ReviewerDirectoryPublic from "./ReviewerDirectoryPublic";
import LoginPage from "./LoginPage";
import AuthCallbackPage from "./AuthCallbackPage";

// --------- LocalStorage helpers for UI prefs ----------
const LS = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

function AppShell() {
  const location = useLocation();
  const onLoginPage = location.pathname === "/login";

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;

  const [mode] = useState(LS.get("pl_mode", prefersDark ? "dark" : "light"));
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [density, setDensity] = useState(LS.get("pl_density", "comfortable"));
  const [fontScale, setFontScale] = useState(LS.get("pl_fs", "md"));
  const menuOpen = Boolean(menuAnchor);

  const sendEvent = (name, detail) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));

  useEffect(() => {
    LS.set("pl_mode", mode);
  }, [mode]);

  useEffect(() => {
    LS.set("pl_density", density);
  }, [density]);

  useEffect(() => {
    LS.set("pl_fs", fontScale);
  }, [fontScale]);

  const applyDensity = (d) => {
    setDensity(d);
    sendEvent("pl:set-density", { density: d });
  };

  const applyFontScale = (scale) => {
    setFontScale(scale);
    sendEvent("pl:set-font-scale", { fontScale: scale });
  };

  useEffect(() => {
    sendEvent("pl:set-density", { density });
    sendEvent("pl:set-font-scale", { fontScale });
    sendEvent("pl:set-theme", { mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const theme = useMemo(() => {
    const isDark = mode === "dark";
    const baseFont = fontScale === "sm" ? 13 : fontScale === "lg" ? 16 : 14;

    const lightGray = {
      bgDefault: "#c9ced6",
      bgPaper: "#bfc5ce",
      textPri: "#0f172a",
      textSec: "#374151",
      divider: "rgba(17,24,39,0.22)",
      primary: "#5b6b88",
      inputBg: "#d2d6dd",
      inputBorder: "rgba(17,24,39,0.28)",
      inputBorderHover: "rgba(17,24,39,0.38)",
    };

    const dark = {
      bgDefault: "#0b0e19",
      bgPaper: "#111727",
      textPri: "#eaf0ff",
      textSec: "#cdd9ff",
      divider: "rgba(255,255,255,0.14)",
      primary: "#7aa2ff",
    };

    const p = isDark ? dark : lightGray;

    return createTheme({
      palette: {
        mode,
        primary: { main: p.primary },
        background: { default: p.bgDefault, paper: p.bgPaper },
        text: { primary: p.textPri, secondary: p.textSec },
        divider: p.divider,
      },
      shape: { borderRadius: 10 },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: { backgroundColor: p.bgDefault, colorScheme: mode },
          },
        },
        MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
        MuiTableCell: { styleOverrides: { head: { fontWeight: 700 } } },
        MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
        MuiOutlinedInput: {
          styleOverrides: {
            root: mode === "light"
              ? {
                  backgroundColor: lightGray.inputBg,
                  "& fieldset": { borderColor: lightGray.inputBorder },
                  "&:hover fieldset": { borderColor: lightGray.inputBorderHover },
                  "&.Mui-focused fieldset": { borderColor: p.primary },
                }
              : undefined,
          },
        },
      },
      typography: {
        fontSize: baseFont,
        fontFamily:
          `'Inter', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"`,
      },
    });
  }, [mode, fontScale]);

  const handleOpenMenu = (e) => setMenuAnchor(menuOpen ? null : e.currentTarget);
  const handleCloseMenu = () => setMenuAnchor(null);

  return (
    <ThemeProvider theme={theme} key={mode}>
      <CssBaseline enableColorScheme />

      {!onLoginPage && (
        <Box sx={{ position: "fixed", top: 14, right: 12, zIndex: 2000 }}>
          <Tooltip title="Menu">
            <Paper
              elevation={0}
              sx={{
                p: 0.5,
                borderRadius: 999,
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(180deg, rgba(17,23,39,0.62), rgba(17,23,39,0.40))",
                backdropFilter: "blur(12px) saturate(160%)",
                WebkitBackdropFilter: "blur(12px) saturate(160%)",
                border: `1px solid ${alpha("#7aa2ff", 0.28)}`,
                boxShadow: `0 14px 34px ${alpha("#000", 0.35)}`,
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: -2,
                  background:
                    "radial-gradient(420px 120px at 12% 0%, rgba(122,162,255,0.55), transparent 60%), radial-gradient(360px 120px at 100% 0%, rgba(34,197,94,0.42), transparent 55%)",
                  opacity: 0.55,
                  pointerEvents: "none",
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  boxShadow: `inset 0 0 0 1px ${alpha("#ffffff", 0.08)}`,
                  pointerEvents: "none",
                },
              }}
            >
              <IconButton
                onClick={handleOpenMenu}
                aria-label="Open display menu"
                aria-controls={menuOpen ? "display-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={menuOpen ? "true" : undefined}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  position: "relative",
                  zIndex: 1,
                  color: alpha("#eaf2ff", 0.92),
                  backgroundColor: alpha("#0b0e19", 0.18),
                  transition: "transform 140ms ease, background 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
                  border: `1px solid ${alpha("#7aa2ff", 0.18)}`,
                  "& .MuiSvgIcon-root": { fontSize: 20 },
                  "&:hover": {
                    transform: "translateY(-1px)",
                    backgroundColor: alpha("#7aa2ff", 0.10),
                    borderColor: alpha("#7aa2ff", 0.36),
                    boxShadow: `0 0 0 3px ${alpha("#7aa2ff", 0.12)}`,
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
            </Paper>
          </Tooltip>

          <Menu
            id="display-menu"
            anchorEl={menuAnchor}
            open={menuOpen}
            onClose={handleCloseMenu}
            keepMounted
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                elevation: 8,
                sx: {
                  mt: 1.25,
                  minWidth: 270,
                  borderRadius: 2.25,
                  overflow: "hidden",
                  background: "linear-gradient(180deg, rgba(17,23,39,0.92), rgba(17,23,39,0.78))",
                  backdropFilter: "blur(12px) saturate(160%)",
                  WebkitBackdropFilter: "blur(12px) saturate(160%)",
                  border: `1px solid ${alpha("#7aa2ff", 0.22)}`,
                  boxShadow: `0 22px 70px ${alpha("#000", 0.55)}`,
                },
              },
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 1.1,
                position: "relative",
                overflow: "hidden",
                borderBottom: `1px solid ${alpha("#ffffff", 0.10)}`,
              }}
            >
              <Typography sx={{ fontWeight: 900, color: "#fff", letterSpacing: 0.2 }}>
                Display
              </Typography>
              <Typography sx={{ mt: 0.2, fontSize: 12, color: alpha("#eaf2ff", 0.70) }}>
                Density and font sizing
              </Typography>
            </Box>

            <MenuItem onClick={() => { applyDensity("comfortable"); handleCloseMenu(); }}>
              <ListItemIcon sx={{ minWidth: 34, color: alpha("#eaf2ff", 0.85) }}>
                <ComfortableIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Row density: Comfortable"
                primaryTypographyProps={{ sx: { fontWeight: 800, color: alpha("#eaf2ff", 0.92) } }}
              />
              {density === "comfortable" && <CheckIcon fontSize="small" sx={{ color: "#22c55e" }} />}
            </MenuItem>

            <MenuItem onClick={() => { applyDensity("compact"); handleCloseMenu(); }}>
              <ListItemIcon sx={{ minWidth: 34, color: alpha("#eaf2ff", 0.85) }}>
                <CompactIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Row density: Compact"
                primaryTypographyProps={{ sx: { fontWeight: 800, color: alpha("#eaf2ff", 0.92) } }}
              />
              {density === "compact" && <CheckIcon fontSize="small" sx={{ color: "#22c55e" }} />}
            </MenuItem>

            <Divider sx={{ borderColor: alpha("#ffffff", 0.10) }} />

            <MenuItem onClick={() => { applyFontScale("sm"); handleCloseMenu(); }}>
              <ListItemIcon sx={{ minWidth: 34, color: alpha("#eaf2ff", 0.85) }}>
                <FormatSizeIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Font size: Small"
                primaryTypographyProps={{ sx: { fontWeight: 800, color: alpha("#eaf2ff", 0.92) } }}
              />
              {fontScale === "sm" && <CheckIcon fontSize="small" sx={{ color: "#22c55e" }} />}
            </MenuItem>

            <MenuItem onClick={() => { applyFontScale("md"); handleCloseMenu(); }}>
              <ListItemIcon sx={{ minWidth: 34, color: alpha("#eaf2ff", 0.85) }}>
                <Typography fontSize="0.95rem" sx={{ opacity: 0.85, fontWeight: 900 }}>A</Typography>
              </ListItemIcon>
              <ListItemText
                primary="Font size: Medium"
                primaryTypographyProps={{ sx: { fontWeight: 800, color: alpha("#eaf2ff", 0.92) } }}
              />
              {fontScale === "md" && <CheckIcon fontSize="small" sx={{ color: "#22c55e" }} />}
            </MenuItem>

            <MenuItem onClick={() => { applyFontScale("lg"); handleCloseMenu(); }}>
              <ListItemIcon sx={{ minWidth: 34, color: alpha("#eaf2ff", 0.85) }}>
                <Typography fontSize="1.15rem" sx={{ fontWeight: 900 }}>A</Typography>
              </ListItemIcon>
              <ListItemText
                primary="Font size: Large"
                primaryTypographyProps={{ sx: { fontWeight: 800, color: alpha("#eaf2ff", 0.92) } }}
              />
              {fontScale === "lg" && <CheckIcon fontSize="small" sx={{ color: "#22c55e" }} />}
            </MenuItem>

            <Divider sx={{ borderColor: alpha("#ffffff", 0.10) }} />

            <MenuItem
              component="a"
              onClick={handleCloseMenu}
              href={`mailto:seth@peerlinkmedical.com?subject=${encodeURIComponent("PeerLink Panel Directory Help")}&body=${encodeURIComponent(
                [
                  "Hi Seth,",
                  "",
                  "Context:",
                  `- URL: ${window.location.href}`,
                  `- Mode: ${mode}`,
                  `- Density: ${density}`,
                  `- Font: ${fontScale}`,
                  `- UA: ${navigator.userAgent}`,
                  "",
                  "Issue/Question:",
                  "",
                ].join("\r\n")
              )}`}
            >
              <ListItemIcon sx={{ minWidth: 34, color: alpha("#eaf2ff", 0.85) }}>
                <HelpIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Need help? Email support"
                primaryTypographyProps={{ sx: { fontWeight: 800, color: alpha("#eaf2ff", 0.92) } }}
              />
            </MenuItem>
          </Menu>
        </Box>
      )}

      <Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/auth/callback" element={<AuthCallbackPage />} />
  <Route path="/" element={<ReviewerDirectoryPublic />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}