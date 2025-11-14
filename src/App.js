import React from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { aeroTheme } from "./aeroTheme.js";
import ReviewerDirectoryPublic from "./ReviewerDirectoryPublic.js";

export default function App() {
  return (
    <ThemeProvider theme={aeroTheme}>
      <CssBaseline />
      <ReviewerDirectoryPublic />
    </ThemeProvider>
  );
}
