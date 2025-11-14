// src/aeroTheme.js
import { createTheme } from "@mui/material/styles";

export const aeroTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#00b3ff" },
    secondary: { main: "#8affd1" },
    background: { default: "#eaf6ff" },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(18px)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35))",
          border: "1px solid rgba(255,255,255,0.45)",
          boxShadow:
            "0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backdropFilter: "blur(8px)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.25))",
          border: "1px solid rgba(255,255,255,0.55)",
          textTransform: "none",
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
        },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            background:
              "linear-gradient(180deg, rgba(0,179,255,0.85), rgba(0,179,255,0.6))",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.7)",
          },
        },
      ],
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(8px)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.3))",
          border: "1px solid rgba(255,255,255,0.6)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backdropFilter: "blur(20px)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.25))",
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow: "0 12px 50px rgba(0,0,0,0.25)",
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(14px)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.25))",
          border: "1px solid rgba(255,255,255,0.45)",
        },
      },
    },
    // Make snackbars feel "glass"
    MuiAlert: {
      styleOverrides: {
        filledSuccess: {
          backdropFilter: "blur(12px)",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.35))",
          border: "1px solid rgba(255,255,255,0.2)",
        },
        filledError: {
          backdropFilter: "blur(12px)",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.35))",
          border: "1px solid rgba(255,255,255,0.2)",
        },
        filledInfo: {
          backdropFilter: "blur(12px)",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.35))",
          border: "1px solid rgba(255,255,255,0.2)",
        },
        filledWarning: {
          backdropFilter: "blur(12px)",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.35))",
          border: "1px solid rgba(255,255,255,0.2)",
        },
      },
    },
  },
});
