/**
 * Theme initialization, injected into the initial HTML by
 * `<Script strategy="beforeInteractive">` in the root layout.
 *
 * Applies the saved Reachly theme (`reachly-theme`) before first paint, and
 * falls back to the OS `prefers-color-scheme` when nothing valid is saved.
 * `DashboardHeader` reads and writes the same key.
 */
export const THEME_STORAGE_KEY = "reachly-theme";

export const themeInitScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}`;