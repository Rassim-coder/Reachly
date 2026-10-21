"use client";

import { useState } from "react";

/**
 * Time-of-day greeting for the overview hero.
 *
 * The clock is read in a lazy `useState` initializer, which runs on the client
 * during hydration and returns the neutral fallback during server rendering.
 * That keeps the route prerenderable (a server-side `new Date()` is rejected
 * while prerendering) and avoids a hydration error, since the server and the
 * first client render always agree on "Welcome back". `suppressHydrationWarning`
 * lets React keep the client's own text on this single element.
 *
 * The neighbouring docs (`01-app/02-guides/preventing-flash-before-hydration.md`)
 * use the same server/client branch for the same reason.
 */
function timeOfDayGreeting(): string {
  // Server render: no clock access, so the heading matches the shell HTML.
  if (typeof window === "undefined") {
    return "Welcome back";
  }

  const hour = new Date().getHours();

  return hour < 12
    ? "Good morning"
    : hour < 18
      ? "Good afternoon"
      : "Good evening";
}

export function Greeting() {
  const [greeting] = useState(timeOfDayGreeting);

  return <span suppressHydrationWarning>{greeting}</span>;
}