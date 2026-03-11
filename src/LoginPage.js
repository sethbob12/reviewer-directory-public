// src/LoginPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import BackgroundAnimation from "./BackgroundAnimation.js";
import { supabase } from "./supabaseClient.js";

/* ---------- config ---------- */
const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "seth@peerlinkmedical.com";

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
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);

  const mountedRef = useRef(true);

  const mailto = useMemo(() => {
    const subject = encodeURIComponent("PeerLink Directory Access Help");
    const body = encodeURIComponent(
      "Hi Seth,\n\nI need help accessing the PeerLink Panel Directory.\n\nMy email address is:\n\nMy issue:\n"
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }, []);

  useEffect(() => {
  let subscription = null;

  const boot = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session && window.location.pathname === "/login") {
      window.location.replace("/");
    }
  };

  boot();

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session && window.location.pathname === "/login") {
      window.location.replace("/");
    }
  });

  subscription = data?.subscription ?? null;

  return () => {
    subscription?.unsubscribe?.();
  };
}, []);

  const handleMagicLink = async () => {
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter your email address.");
      return;
    }

    setError("");
    setSending(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
  email: cleanEmail,
  options: {
    shouldCreateUser: false,
    emailRedirectTo: "https://reviewer-directory-public.vercel.app/",
  },
});

      if (authError) throw authError;

      if (!mountedRef.current) return;
      setSuccess(true);
    } catch (e) {
      if (!mountedRef.current) return;
      setSuccess(false);
      setError(
        e?.message ||
          "Unable to send magic link. Make sure your email has been authorized."
      );
    } finally {
      if (!mountedRef.current) return;
      setSending(false);
    }
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
      <Box sx={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.95 }}>
        <BackgroundAnimation isDark />
      </Box>

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
            backdropFilter: "blur(34px) saturate(155%)",
            WebkitBackdropFilter: "blur(34px) saturate(155%)",
            background: "linear-gradient(180deg, rgba(14,18,30,0.78), rgba(14,18,30,0.50))",
            border: "1px solid rgba(210,235,255,0.18)",
            boxShadow:
              "0 56px 170px rgba(0,0,0,0.70), 0 26px 90px rgba(58,104,254,0.16)",
            "&:before": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: 7.5,
              pointerEvents: "none",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(255,255,255,0.04)",
            },
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
                Enter your approved email address and we’ll send you a one-time sign-in link.
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

          {success && (
            <Alert
              severity="success"
              sx={{
                mb: 2.1,
                width: "100%",
                borderRadius: 3,
                background: "rgba(16,185,129,0.13)",
                border: "1px solid rgba(16,185,129,0.20)",
                color: "rgba(220,255,240,0.96)",
                "& .MuiAlert-icon": { color: "rgba(110,255,190,0.95)" },
                position: "relative",
                zIndex: 2,
              }}
            >
              Magic link sent. Check your email and open the link on this device.
            </Alert>
          )}

          <Box sx={{ position: "relative", zIndex: 2 }}>
            <TextField
              fullWidth
              type="email"
              label="Email address"
              value={email}
              disabled={sending || success}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleMagicLink();
              }}
              InputProps={{
                startAdornment: <EmailRoundedIcon sx={{ mr: 1, color: "rgba(190,214,255,0.8)" }} />,
              }}
              sx={{
                mb: 2.35,
                "& .MuiInputLabel-root": { color: "rgba(190,214,255,0.76)" },
                "& .MuiInputLabel-root.Mui-focused": { color: "#fff" },
                "& .MuiInputBase-input": { color: "#fff" },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3.2,
                  background: "rgba(255,255,255,0.045)",
                  "& fieldset": {
                    borderColor: "rgba(160,210,255,0.20)",
                    borderWidth: "2px",
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
            />

            <Button
              variant="contained"
              size="large"
              fullWidth
              disableElevation
              disabled={sending || success}
              onClick={handleMagicLink}
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
                "&:hover": {
                  background: success
                    ? "linear-gradient(90deg,#08ac6d 0%,#00c59b 100%)"
                    : "linear-gradient(90deg, rgba(47,87,217,1) 0%, rgba(78,164,242,1) 100%)",
                },
              }}
            >
              {success ? (
                "Check your email"
              ) : sending ? (
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={16} sx={{ color: "rgba(255,255,255,0.85)" }} />
                  {"Sending link…"}
                </Box>
              ) : (
                "Email magic link"
              )}
            </Button>
          </Box>

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
                "&:hover": {
                  background: "rgba(255,255,255,0.085)",
                  borderColor: "rgba(210,235,255,0.30)",
                  color: "#ffffff",
                },
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