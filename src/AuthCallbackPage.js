import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { supabase } from "./supabaseClient";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    let unsub;

    const run = async () => {
      try {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            window.location.replace("/");
          }
        });

        unsub = subscription;

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          window.location.replace("/");
          return;
        }

        setTimeout(async () => {
          const {
            data: { session: delayedSession },
          } = await supabase.auth.getSession();

          if (delayedSession) {
            window.location.replace("/");
          } else {
            setMessage("Sign-in could not be completed. Please request a new link.");
          }
        }, 1200);
      } catch (e) {
        setMessage(e?.message || "Sign-in could not be completed.");
      }
    };

    run();

    return () => {
      unsub?.unsubscribe?.();
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