:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5; }

/* Top bar */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: .8rem 1rem; border-bottom: 1px solid #e0e0e0;
}
.brand { font-size: clamp(1.2rem, 2vw + .5rem, 1.8rem); display: flex; gap: .35rem; align-items: center; }
.flag { font-size: 1em; }
.toggle { display: inline-flex; gap: .5rem; align-items: center; user-select: none; }

.container { max-width: 900px; margin: 1.2rem auto 3rem; padding: 0 1rem; }

.status { text-align: center; margin: 0 0 1.25rem; font-weight: 600; }

.buttons { display: flex; gap: 1rem; justify-content: center; margin-bottom: 1.5rem; flex-wrap: wrap; }
.btn {
  padding: .9rem 1.2rem; border: 1px solid #9aa0a6; border-radius: .8rem;
  background: transparent; cursor: pointer; font-size: 1.2rem; min-width: 4.5rem;
}
.btn:disabled { opacity: .5; cursor: not-allowed; }

.log h2 { margin: 1rem 0 .5rem; font-size: 1.2rem; }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #e0e0e0; padding: .55rem .5rem; text-align: left; }
tbody tr:last-child td { border-bottom: none; }

/* Dark mode */
body.dark { background:#0b0c0e; color:#e7e7ea; }
body.dark .topbar { border-bottom-color: #2a2a2a; }
body.dark th, body.dark td { border-bottom-color: #2a2a2a; }
body.dark .btn { border-color: #4b4f56; }
