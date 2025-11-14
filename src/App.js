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
import {
  Menu as MenuIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  HelpOutline as HelpIcon,
  Check as CheckIcon,
  ViewAgenda as ComfortableIcon,
  ViewCompactAlt as CompactIcon,
  FormatSize as FormatSizeIcon,
} from "@mui/icons-material";
import ReviewerDirectoryPublic from "./ReviewerDirectoryPublic";

// LocalStorage helpers
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

export default function App() {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;

  // Persisted UI state
  const [mode, setMode] = useState(LS.get("pl_mode", prefersDark ? "dark" : "light"));
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [density, setDensity] = useState(LS.get("pl_density", "comfortable"));
  const [fontScale, setFontScale] = useState(LS.get("pl_fs", "md"));

  const menuOpen = Boolean(menuAnchor);

  // Broadcast to child
  const sendEvent = (name, detail) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));

  // Persist on change
  useEffect(() => { LS.set("pl_mode", mode); }, [mode]);
  useEffect(() => { LS.set("pl_density", density); }, [density]);
  useEffect(() => { LS.set("pl_fs", fontScale); }, [fontScale]);

  const toggleMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    sendEvent("pl:set-theme", { mode: next });
  };
  const applyDensity = (d) => {
    setDensity(d);
    sendEvent("pl:set-density", { density: d });
  };
  const applyFontScale = (scale) => {
    setFontScale(scale);
    sendEvent("pl:set-font-scale", { fontScale: scale });
  };
  const handleResetDisplay = () => {
    applyDensity("comfortable");
    applyFontScale("md");
    handleCloseMenu();
  };

  // Push initial settings to table on mount
  useEffect(() => {
    sendEvent("pl:set-density", { density });
    sendEvent("pl:set-font-scale", { fontScale });
    sendEvent("pl:set-theme", { mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme (Light mode is a darker gray scheme; Dark mode unchanged)
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
        background: {
          default: p.bgDefault,
          paper: p.bgPaper,
        },
        text: {
          primary: p.textPri,
          secondary: p.textSec,
        },
        divider: p.divider,
      },
      shape: { borderRadius: 10 },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: p.bgDefault,
              colorScheme: mode,
            },
          },
        },
        MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
        MuiTableCell: { styleOverrides: { head: { fontWeight: 700 } } },
        MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
        MuiOutlinedInput: {
          styleOverrides: {
            root: !isDark
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

  // Menu controls (toggle by clicking the hamburger)
  const handleOpenMenu = (e) => {
    if (menuOpen) {
      setMenuAnchor(null); // clicking again closes
    } else {
      setMenuAnchor(e.currentTarget);
    }
  };
  const handleCloseMenu = () => setMenuAnchor(null);

  return (
    <ThemeProvider theme={theme} key={mode}>
      <CssBaseline enableColorScheme />

      {/* Top-right hamburger (bigger, lower) */}
      <Box sx={{ position: "fixed", top: 18, right: 14, zIndex: 2000 }}>
        <Tooltip title="Menu">
          <Paper elevation={4} sx={{ p: 0.75, borderRadius: 2 }}>
            <IconButton
              color="primary"
              onClick={handleOpenMenu}
              aria-label="Open display menu"
              aria-controls={menuOpen ? "display-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? "true" : undefined}
              // bigger hit area
              sx={{
                width: 48,
                height: 48,
                "& .MuiSvgIcon-root": { fontSize: 28 },
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
          // drop it a bit lower from the button
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              elevation: 6,
              sx: { mt: 1.25, minWidth: 260, borderRadius: 2 },
            },
          }}
        >
          {/* Theme toggle */}
          <MenuItem
            onClick={() => {
              toggleMode();
              handleCloseMenu();
            }}
          >
            <ListItemIcon>
              {mode === "dark" ? <LightIcon fontSize="small" /> : <DarkIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            />
          </MenuItem>

          <Divider />

          {/* Row density */}
          <MenuItem
            onClick={() => {
              applyDensity("comfortable");
              handleCloseMenu();
            }}
          >
            <ListItemIcon><ComfortableIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Row density: Comfortable" />
            {density === "comfortable" && <CheckIcon fontSize="small" />}
          </MenuItem>
          <MenuItem
            onClick={() => {
              applyDensity("compact");
              handleCloseMenu();
            }}
          >
            <ListItemIcon><CompactIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Row density: Compact" />
            {density === "compact" && <CheckIcon fontSize="small" />}
          </MenuItem>

          <Divider />

          {/* Font size */}
          <MenuItem
            onClick={() => {
              applyFontScale("sm");
              handleCloseMenu();
            }}
          >
            <ListItemIcon><FormatSizeIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Font size: Small" />
            {fontScale === "sm" && <CheckIcon fontSize="small" />}
          </MenuItem>
          <MenuItem
            onClick={() => {
              applyFontScale("md");
              handleCloseMenu();
            }}
          >
            <ListItemIcon>
              <Typography fontSize="0.9rem" sx={{ opacity: 0.8 }}>A</Typography>
            </ListItemIcon>
            <ListItemText primary="Font size: Medium" />
            {fontScale === "md" && <CheckIcon fontSize="small" />}
          </MenuItem>
          <MenuItem
            onClick={() => {
              applyFontScale("lg");
              handleCloseMenu();
            }}
          >
            <ListItemIcon>
              <Typography fontSize="1.15rem">A</Typography>
            </ListItemIcon>
            <ListItemText primary="Font size: Large" />
            {fontScale === "lg" && <CheckIcon fontSize="small" />}
          </MenuItem>

          <Divider />

          {/* Reset */}
          <MenuItem onClick={handleResetDisplay}>
            <ListItemIcon><FormatSizeIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Reset display settings" secondary="Density, font" />
          </MenuItem>

          <Divider />

          {/* Help with contextual info prefilled */}
          <MenuItem
            component="a"
            href={`mailto:seth@peerlinkmedical.com?subject=PeerLink%20Panel%20Directory%20Help&body=${encodeURIComponent(
              `Hi Seth,%0D%0A%0D%0AContext:%0D%0A- URL: ${window.location.href}%0D%0A- Mode: ${mode}%0D%0A- Density: ${density}%0D%0A- Font: ${fontScale}%0D%0A- UA: ${navigator.userAgent}%0D%0A%0D%0AIssue/Question:%0D%0A`
            )}`}
            onClick={handleCloseMenu}
          >
            <ListItemIcon><HelpIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Need help? Email support" />
          </MenuItem>
        </Menu>
      </Box>

      <ReviewerDirectoryPublic />
    </ThemeProvider>
  );
}
