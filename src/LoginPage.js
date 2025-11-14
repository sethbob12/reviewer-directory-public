// src/LoginPage.js
import React, { useState, useRef, useEffect } from "react";
import {
  Box, Card, Typography, Button, Alert, TextField, Fade, Stack, Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BackgroundAnimation from "./BackgroundAnimation.js";

/* ---------- config ---------- */
const PASS_LEN = 5;
const validPasswords = ["12345"]; // hardcoded passcode
const AUTH_KEY = "pl_dir_auth";
const AUTH_TTL_MS = 12 * 60 * 60 * 1000; // 12h

/* ---------- auth helpers ---------- */
function isAuthed() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const { t } = JSON.parse(raw);
    return Date.now() - Number(t) < AUTH_TTL_MS;
  } catch {
    return false;
  }
}
function setAuthed() {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ t: Date.now() }));
  } catch {}
}
function goHome() {
  // Avoid history clutter so back doesn’t return to login
  window.location.replace("/");
}

/* ---------- animation variants ---------- */
const containerVariants = {
  initial: { opacity: 0, y: 36, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function LoginPage() {
  const [code, setCode] = useState(Array(PASS_LEN).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [shakeKey, setShakeKey] = useState(0); // bump to trigger error shake
  const inputRefs = useRef([]);

  /* redirect if already authed */
  useEffect(() => {
    if (isAuthed()) goHome();
  }, []);

  /* focus first box on mount */
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const resetInputs = () => {
    setCode(Array(PASS_LEN).fill(""));
    // tiny delay lets React paint before focusing
    setTimeout(() => inputRefs.current[0]?.focus(), 10);
  };

  const attemptLogin = (entered) => {
    if (validPasswords.includes(entered)) {
      setError("");
      setSuccess(true);
      setAuthed();
      setTimeout(goHome, 320);
    } else {
      setError("Incorrect passcode. Please try again.");
      resetInputs();
      setShakeKey((k) => k + 1); // trigger shake
    }
  };

  const handleChange = (e, index) => {
    const value = e.target.value;

    if (error) setError(""); // clear error when they start typing again

    // paste-to-fill
    if (value && value.length > 1) {
      const paste = value.replace(/\D/g, "").slice(0, PASS_LEN);
      if (paste.length) {
        const next = Array(PASS_LEN).fill("").map((_, i) => paste[i] || "");
        setCode(next);
        if (next.every((c) => c !== "")) attemptLogin(next.join(""));
        return;
      }
    }

    const val = value.slice(0, 1).replace(/\D/g, "");
    const next = [...code];
    next[index] = val;
    setCode(next);

    if (val && index < PASS_LEN - 1) inputRefs.current[index + 1]?.focus();
    if (index === PASS_LEN - 1 && next.every((c) => c !== "")) attemptLogin(next.join(""));
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      const joined = code.join("");
      if (joined.length === PASS_LEN) attemptLogin(joined);
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        minHeight: 520,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Force a dark base regardless of app theme
        background: "linear-gradient(180deg, #0b0e19 0%, #111727 100%)",
      }}
    >
      {/* Full-canvas modern background (force dark palette) */}
      <Box sx={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <BackgroundAnimation isDark />
      </Box>

      {/* Subtle dark overlay to knock back the background */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "radial-gradient(1200px 600px at 80% 10%, rgba(20,30,60,0.35), rgba(8,10,20,0.55))",
        }}
      />

      {/* Foreground card */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        style={{ zIndex: 2, width: "100%", maxWidth: 440, padding: "0 10px" }}
      >
        <Card
          elevation={0}
          sx={{
            px: { xs: 3, sm: 4 },
            py: { xs: 3.5, sm: 4.5 },
            borderRadius: 5,
            backdropFilter: "blur(16px)",
            background:
              "linear-gradient(180deg, rgba(22,26,40,0.74), rgba(22,26,40,0.54))",
            boxShadow: "0 12px 48px rgba(0,20,60,0.45)",
            border: "1px solid rgba(120,170,255,0.22)",
          }}
        >
          <Fade in>
            <Stack alignItems="center" spacing={1.4} sx={{ mb: 2.5 }}>
              <Box
                sx={{
                  bgcolor: "rgba(20,120,255,0.15)",
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "inset 0 0 20px rgba(100,160,255,0.15)",
                }}
              >
                <LockOutlinedIcon sx={{ fontSize: 32, color: "#7ec0ff" }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                PeerLink Panel Directory
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#bcd7ff",
                  opacity: 0.95,
                  textAlign: "center",
                }}
              >
                Enter your 5 digit access code to continue.
              </Typography>
            </Stack>
          </Fade>

          {error && (
            <Alert severity="error" sx={{ mb: 2, width: "100%" }}>
              {error}
            </Alert>
          )}

          {/* Inputs (shake on wrong attempt) */}
          <motion.div
            key={shakeKey}
            animate={{ x: [0, -10, 8, -6, 4, -2, 0] }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              sx={{ mb: 2.5, mt: 0.5 }}
            >
              {code.map((digit, idx) => (
                <motion.div key={idx} whileFocus={{ scale: 1.06 }} style={{ borderRadius: 12 }}>
                  <TextField
                    variant="outlined"
                    value={digit}
                    onChange={(e) => handleChange(e, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    onPaste={(e) => {
                      const text = e.clipboardData
                        .getData("text")
                        .replace(/\D/g, "")
                        .slice(0, PASS_LEN);
                      if (text.length > 1) {
                        e.preventDefault();
                        const next = Array(PASS_LEN).fill("").map((_, i) => text[i] || "");
                        setCode(next);
                        if (next.every((c) => c !== "")) attemptLogin(next.join(""));
                      }
                    }}
                    inputProps={{
                      maxLength: 1,
                      inputMode: "numeric",
                      style: {
                        textAlign: "center",
                        fontSize: "1.7rem",
                        fontWeight: 700,
                        padding: "0.5rem 0.2rem",
                        color: "#f5fbff",
                        letterSpacing: 2,
                        width: 56,
                      },
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2.2,
                        fontWeight: 700,
                        backgroundColor: "rgba(50,60,110,0.12)",
                        transition: "box-shadow 160ms ease, transform 160ms ease",
                        "& fieldset": {
                          borderColor: "rgba(110,160,255,0.35)",
                          borderWidth: "2px",
                        },
                        "&:hover fieldset": {
                          borderColor: "rgba(130,180,255,0.6)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#7aa2ff",
                          boxShadow: "0 0 0 3px rgba(122,162,255,0.24)",
                        },
                      },
                    }}
                    inputRef={(el) => (inputRefs.current[idx] = el)}
                  />
                </motion.div>
              ))}
            </Stack>
          </motion.div>

          <Button
            variant="contained"
            size="large"
            fullWidth
            disableElevation
            onClick={() => attemptLogin(code.join(""))}
            sx={{
              mt: 0.5,
              py: 1.15,
              fontWeight: 700,
              fontSize: "1.05rem",
              borderRadius: 2.5,
              color: "#fff",
              background: success
                ? "linear-gradient(90deg,#0bca82 30%,#00e5b1 100%)"
                : "linear-gradient(90deg,#3a68fe 10%,#5bb6ff 100%)",
              boxShadow: success
                ? "0 8px 30px rgba(0,220,160,0.25)"
                : "0 10px 30px rgba(58,104,254,0.25)",
              "&:hover": {
                transform: "translateY(-1px)",
                background: success
                  ? "linear-gradient(90deg,#08ac6d 0%,#00c59b 100%)"
                  : "linear-gradient(90deg,#2f57d9 0%,#4ea4f2 100%)",
              },
            }}
          >
            {success ? "Welcome!" : "Unlock"}
          </Button>

          <Divider sx={{ my: 3, opacity: 0.5 }} />

          <Typography
            variant="caption"
            align="center"
            sx={{
              color: "rgba(200,220,255,0.75)",
              display: "block",
            }}
          >
            © {new Date().getFullYear()} PeerLink. Authorized access only.
          </Typography>
        </Card>
      </motion.div>
    </Box>
  );
}
