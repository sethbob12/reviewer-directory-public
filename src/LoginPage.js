// src/LoginPage.js
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  Typography,
  Button,
  Alert,
  TextField,
  Fade,
  Stack,
  Divider,
  Link,
  CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import BackgroundAnimation from "./BackgroundAnimation.js";
import { supabase } from "./supabaseClient.js";

/* ---------- config ---------- */
const PASS_LEN = 6;

// Supabase passcode source (override via env if you want)
const PASSCODE_TABLE = process.env.REACT_APP_PASSCODE_TABLE || "public_directory_passcodes";
const PASSCODE_COLUMN = process.env.REACT_APP_PASSCODE_COLUMN || "code";
const PASSCODE_ACTIVE_COLUMN = process.env.REACT_APP_PASSCODE_ACTIVE_COLUMN || "is_active";

const AUTH_KEY = "pl_dir_auth";
const AUTH_TTL_MS = 12 * 60 * 60 * 1000; // 12h

const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "seth@peerlinkmedical.com";

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
  window.location.replace("/");
}

/* ---------- motion ---------- */
const containerVariants = {
  initial: { opacity: 0, y: 22, scale: 0.988 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function LoginPage() {
  const [code, setCode] = useState(Array(PASS_LEN).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const inputRefs = useRef([]);
  const mountedRef = useRef(true);

  const mailto = useMemo(() => {
    const subject = encodeURIComponent("PeerLink Directory Access Help");
    const body = encodeURIComponent(
      "Hi Seth,\n\nI need help accessing the PeerLink Panel Directory.\n\nMy issue:\n"
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* redirect if already authed */
  useEffect(() => {
    if (isAuthed()) goHome();
  }, []);

  /* focus first box */
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const resetInputs = () => {
    setCode(Array(PASS_LEN).fill(""));
    setTimeout(() => inputRefs.current[0]?.focus(), 10);
  };

  const checkPasscodeInSupabase = async (entered) => {
    // attempt with active column
    const q = supabase.from(PASSCODE_TABLE).select("id").eq(PASSCODE_COLUMN, entered).limit(1);

    const { data, error: err1 } = await q.eq(PASSCODE_ACTIVE_COLUMN, true);
    if (!err1) return Array.isArray(data) && data.length > 0;

    // fallback (table has no active column or it’s not selectable)
    const { data: data2, error: err2 } = await supabase
      .from(PASSCODE_TABLE)
      .select("id")
      .eq(PASSCODE_COLUMN, entered)
      .limit(1);

    if (err2) throw err2;
    return Array.isArray(data2) && data2.length > 0;
  };

  const attemptLogin = async (entered) => {
    if (checking) return;

    const clean = String(entered || "").replace(/\D/g, "").slice(0, PASS_LEN);
    if (clean.length !== PASS_LEN) {
      setError(`Enter a ${PASS_LEN}-digit access code.`);
      setShakeKey((k) => k + 1);
      return;
    }

    setChecking(true);
    try {
      const ok = await checkPasscodeInSupabase(clean);
      if (ok) {
        setError("");
        setSuccess(true);
        setAuthed();
        setTimeout(goHome, 420);
      } else {
        setSuccess(false);
        setError("Incorrect access code. Please try again.");
        resetInputs();
        setShakeKey((k) => k + 1);
      }
    } catch (e) {
      setSuccess(false);
      setError(e?.message || "Login check failed.");
      setShakeKey((k) => k + 1);
    } finally {
      if (!mountedRef.current) return;
      setChecking(false);
    }
  };

  const handleChange = (e, index) => {
    const value = e.target.value;

    if (error) setError("");

    // paste-to-fill in any cell
    if (value && value.length > 1) {
      const paste = value.replace(/\D/g, "").slice(0, PASS_LEN);
      if (paste.length) {
        const next = Array(PASS_LEN)
          .fill("")
          .map((_, i) => paste[i] || "");
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
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < PASS_LEN - 1) inputRefs.current[index + 1]?.focus();
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        minHeight: 620,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #050814 0%, #070c19 40%, #050814 100%)",
      }}
    >
      {/* animated background */}
      <Box sx={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.95 }}>
        <BackgroundAnimation isDark />
      </Box>

      {/* studio lighting layer */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background: [
            "radial-gradient(980px 560px at 18% 10%, rgba(122,162,255,0.26), transparent 60%)",
            "radial-gradient(900px 560px at 90% 14%, rgba(0,229,177,0.18), transparent 62%)",
            "radial-gradient(1100px 760px at 50% 120%, rgba(58,104,254,0.16), transparent 62%)",
            "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.58))",
          ].join(", "),
        }}
      />

      {/* ultra subtle noise */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          opacity: 0.06,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='.28'/%3E%3C/svg%3E\")",
          mixBlendMode: "overlay",
        }}
      />

      {/* card */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        style={{ zIndex: 3, width: "100%", maxWidth: 560, padding: "0 16px" }}
      >
        <Card
          elevation={0}
          sx={{
            position: "relative",
            overflow: "hidden",
            px: { xs: 3.4, sm: 5.6 },
            py: { xs: 4.2, sm: 5.6 },
            borderRadius: 7.5,

            // glass
            backdropFilter: "blur(34px) saturate(155%)",
            WebkitBackdropFilter: "blur(34px) saturate(155%)",
            background: "linear-gradient(180deg, rgba(14,18,30,0.78), rgba(14,18,30,0.50))",

            // premium border + depth
            border: "1px solid rgba(210,235,255,0.18)",
            boxShadow:
              "0 56px 170px rgba(0,0,0,0.70), 0 26px 90px rgba(58,104,254,0.16)",

            // subtle inner rim
            "&:before": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: 7.5,
              pointerEvents: "none",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(255,255,255,0.04)",
            },

            // thin iridescent border glow
            "&:after": {
              content: '""',
              position: "absolute",
              inset: -1,
              borderRadius: 7.5,
              pointerEvents: "none",
              background:
                "linear-gradient(135deg, rgba(122,162,255,0.22), rgba(0,229,177,0.14), rgba(122,162,255,0.18))",
              opacity: 0.65,
              maskImage:
                "linear-gradient(#000, #000), linear-gradient(#000, #000)",
              WebkitMaskImage:
                "linear-gradient(#000, #000), linear-gradient(#000, #000)",
              maskComposite: "exclude",
              WebkitMaskComposite: "xor",
              padding: "1px",
            },
          }}
        >
          {/* cinematic top glow */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: -2,
              pointerEvents: "none",
              background:
                "radial-gradient(860px 360px at 50% 0%, rgba(122,162,255,0.22), transparent 70%)",
              opacity: 0.9,
            }}
          />

          {/* ultra soft ambient aura */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              boxShadow: "0 0 120px rgba(122,162,255,0.12)",
              opacity: 1,
            }}
          />

          {/* slow light sweep */}
          <motion.div
            aria-hidden
            initial={{ x: "-150%", opacity: 0 }}
            animate={{ x: "150%", opacity: [0, 0.33, 0] }}
            transition={{
              duration: 4.4,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 1.4,
            }}
            style={{
              position: "absolute",
              top: "-40%",
              left: 0,
              width: "62%",
              height: "190%",
              transform: "rotate(18deg)",
              pointerEvents: "none",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
              filter: "blur(2px)",
              zIndex: 0,
            }}
          />

          <Fade in>
            <Stack alignItems="center" spacing={1.35} sx={{ mb: 3.1, position: "relative", zIndex: 2 }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 5.2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, rgba(58,104,254,0.22), rgba(0,229,177,0.10))",
                  border: "1px solid rgba(200,230,255,0.20)",
                  boxShadow: "0 18px 46px rgba(58,104,254,0.24)",
                }}
              >
                {success ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 34, color: "rgba(182,255,232,0.96)" }} />
                ) : (
                  <LockOutlinedIcon sx={{ fontSize: 34, color: "rgba(235,246,255,0.96)" }} />
                )}
              </Box>

              <Typography
                variant="h5"
                sx={{
                  fontWeight: 950,
                  letterSpacing: 0.22,
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                PeerLink Panel Directory
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: "rgba(190,214,255,0.86)",
                  textAlign: "center",
                  maxWidth: 420,
                }}
              >
                Enter your {PASS_LEN}-digit access code to continue.
              </Typography>

          
            </Stack>
          </Fade>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2.1,
                width: "100%",
                borderRadius: 3,
                background: "rgba(239,68,68,0.13)",
                border: "1px solid rgba(239,68,68,0.20)",
                color: "rgba(255,220,220,0.96)",
                "& .MuiAlert-icon": { color: "rgba(255,160,160,0.95)" },
                position: "relative",
                zIndex: 2,
              }}
            >
              {error}
            </Alert>
          )}

          {/* inputs (3 + 3 grouping) */}
          <motion.div
            key={shakeKey}
            animate={{ x: [0, -10, 8, -6, 4, -2, 0] }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ position: "relative", zIndex: 2 }}
          >
            <Stack direction="row" alignItems="center" justifyContent="center" sx={{ mb: 2.35, mt: 0.7 }}>
              {code.map((digit, idx) => (
                <React.Fragment key={idx}>
                  <TextField
                    variant="outlined"
                    value={digit}
                    disabled={checking || success}
                    onChange={(e) => handleChange(e, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PASS_LEN);
                      if (text.length > 1) {
                        e.preventDefault();
                        const next = Array(PASS_LEN)
                          .fill("")
                          .map((_, i) => text[i] || "");
                        setCode(next);
                        if (next.every((c) => c !== "")) attemptLogin(next.join(""));
                      }
                    }}
                    inputProps={{
                      maxLength: 1,
                      inputMode: "numeric",
                      style: {
                        textAlign: "center",
                        fontSize: "1.58rem",
                        fontWeight: 950,
                        padding: "0.78rem 0.1rem",
                        color: "#ffffff",
                        width: 52,
                      },
                    }}
                    sx={{
                      mx: 0.68,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3.2,
                        background: "rgba(255,255,255,0.045)",
                        transition: "transform 140ms ease, box-shadow 140ms ease, background 140ms ease",
                        "& fieldset": {
                          borderColor: "rgba(160,210,255,0.20)",
                          borderWidth: "2px",
                        },
                        "&:hover": {
                          background: "rgba(255,255,255,0.055)",
                          transform: "translateY(-1px)",
                        },
                        "&:hover fieldset": {
                          borderColor: "rgba(190,228,255,0.45)",
                        },
                        "&.Mui-focused": {
                          background: "rgba(122,162,255,0.07)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "rgba(122,162,255,0.95)",
                          boxShadow: "0 0 0 4px rgba(122,162,255,0.18)",
                        },
                      },
                    }}
                    inputRef={(el) => (inputRefs.current[idx] = el)}
                  />

                  {/* visual grouping between 3 and 3 */}
                  {idx === 2 && (
                    <Box
                      aria-hidden
                      sx={{
                        width: 26,
                        height: 2,
                        mx: 0.9,
                        borderRadius: 2,
                        background:
                          "linear-gradient(90deg, transparent, rgba(190,228,255,0.42), transparent)",
                        opacity: 0.95,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Stack>
          </motion.div>

          <Button
            variant="contained"
            size="large"
            fullWidth
            disableElevation
            disabled={checking || success}
            onClick={() => attemptLogin(code.join(""))}
            sx={{
              mt: 0.1,
              py: 1.32,
              fontWeight: 950,
              fontSize: "1.05rem",
              borderRadius: 3.2,
              color: "#fff",
              background: success
                ? "linear-gradient(90deg,#0bca82 0%,#00e5b1 100%)"
                : "linear-gradient(90deg, rgba(58,104,254,1) 0%, rgba(91,182,255,1) 100%)",
              boxShadow: success
                ? "0 16px 44px rgba(0,220,160,0.20)"
                : "0 22px 58px rgba(58,104,254,0.22)",
              transition: "transform 160ms ease, filter 160ms ease, box-shadow 160ms ease",
              "&:hover": {
                transform: "translateY(-1px)",
                filter: "brightness(1.03)",
                boxShadow: success
                  ? "0 18px 50px rgba(0,220,160,0.22)"
                  : "0 26px 70px rgba(58,104,254,0.26)",
                background: success
                  ? "linear-gradient(90deg,#08ac6d 0%,#00c59b 100%)"
                  : "linear-gradient(90deg, rgba(47,87,217,1) 0%, rgba(78,164,242,1) 100%)",
              },
              "&:active": {
                transform: "translateY(0px)",
                filter: "brightness(0.99)",
              },
            }}
          >
            {success ? (
              "Welcome"
            ) : checking ? (
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} sx={{ color: "rgba(255,255,255,0.85)" }} />
                {"Checking…"}
              </Box>
            ) : (
              "Unlock"
            )}
          </Button>

          {/* Need help (nicer) */}
          <Box sx={{ mt: 2.1, display: "flex", justifyContent: "center", position: "relative", zIndex: 2 }}>
            <Link
              href={mailto}
              underline="none"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.9,
                px: 2.1,
                py: 1.05,
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 900,
                letterSpacing: 0.25,
                color: "rgba(220,238,255,0.92)",
                background: "rgba(255,255,255,0.055)",
                border: "1px solid rgba(210,235,255,0.18)",
                backdropFilter: "blur(10px)",
                transition: "transform 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  background: "rgba(255,255,255,0.085)",
                  borderColor: "rgba(210,235,255,0.30)",
                  color: "#ffffff",
                },
                "&:active": { transform: "translateY(0px)" },
              }}
            >
              <HelpOutlineRoundedIcon sx={{ fontSize: 16, opacity: 0.95 }} />
              Need help?
            </Link>
          </Box>

          <Divider sx={{ my: 2.25, opacity: 0.45, borderColor: "rgba(140,180,255,0.16)" }} />

          <Typography
            variant="caption"
            align="center"
            sx={{
              color: "rgba(200,220,255,0.70)",
              display: "block",
              position: "relative",
              zIndex: 2,
            }}
          >
            © {new Date().getFullYear()} PeerLink. Authorized access only.
          </Typography>
        </Card>
      </motion.div>
    </Box>
  );
}