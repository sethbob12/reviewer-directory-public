// src/AuthCallbackPage.js
import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { supabase } from "./supabaseClient.js";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    let subscription = null;
    let cancelled = false;

    const goHome = () => {
      window.location.replace("/");
    };

    const run = async () => {
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) return;

          if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
            goHome();
          }
        });

        subscription = data?.subscription ?? null;

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          setMessage("Completing secure sign-in...");

          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) throw exchangeError;

          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) throw sessionError;

          if (session) {
            goHome();
            return;
          }
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          goHome();
          return;
        }

        window.setTimeout(async () => {
          if (cancelled) return;

          try {
            const {
              data: { session: delayedSession },
              error: delayedError,
            } = await supabase.auth.getSession();

            if (delayedError) throw delayedError;

            if (delayedSession) {
              goHome();
            } else {
              setMessage("Sign-in could not be completed. Please request a new link.");
            }
          } catch (e) {
            setMessage(e?.message || "Sign-in could not be completed.");
          }
        }, 1200);
      } catch (e) {
        if (!cancelled) {
          setMessage(e?.message || "Sign-in could not be completed.");
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 2,
        background: "#0b0e19",
        color: "#fff",
      }}
    >
      <CircularProgress />
      <Typography>{message}</Typography>
    </Box>
  );
}