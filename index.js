// @ts-nocheck

// ─── Hash ────────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 of a string, returns a Uint8Array of 32 bytes.
 * @param {string} str
 * @returns {Promise<Uint8Array>}
 */
async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  )
  return new Uint8Array(buf)
}

// ─── Color ───────────────────────────────────────────────────────────────────

/**
 * Convert HSL (0-360, 0-100, 0-100) to an RGB tuple.
 * @param {number} h @param {number} s @param {number} l
 * @returns {[number, number, number]}
 */
function hslToRgb(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ]
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

const GRID = 5
const CELL = 50 // Fixed cell size; canvas is always GRID×CELL = 250px

/**
 * Draw a rounded-rectangle path (does not stroke/fill).
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/**
 * Render an identicon for `text` onto `canvas`.
 * Canvas dimensions are fixed to GRID×CELL internally.
 * @param {string} text
 * @param {HTMLCanvasElement} canvas
 */
async function drawIdenticon(text, canvas) {
  const hash = await sha256(text.trim().toLowerCase() || " ")

  const size = GRID * CELL
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext("2d")

  // ── Palette from hash ──
  const hue = ((((hash[0] << 8) | hash[1]) % 360) + 360) % 360
  const sat = 45 + (hash[2] % 30)
  const lig = 38 + (hash[3] % 20)
  const [r, g, b] = hslToRgb(hue, sat, lig)
  const fg = `rgb(${r},${g},${b})`
  const bg = `hsl(${hue},${Math.max(sat - 30, 5)}%,${Math.min(lig + 42, 96)}%)`

  // ── Background ──
  ctx.fillStyle = bg
  roundRect(ctx, 0, 0, size, size, 12)
  ctx.fill()

  // ── Pixel grid (mirrored, ~50% density via % 2) ──
  const half = Math.ceil(GRID / 2) // 3 columns define the pattern
  const cells = Array.from({ length: GRID }, (_, row) =>
    Array.from(
      { length: half },
      (_, col) => hash[4 + row * half + col] % 2 === 0,
    ),
  )

  ctx.fillStyle = fg
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const mirrorCol = col < half ? col : GRID - 1 - col
      if (cells[row][mirrorCol]) {
        ctx.fillRect(col * CELL, row * CELL, CELL, CELL)
      }
    }
  }
}

// ─── State & UI helpers ───────────────────────────────────────────────────────

const canvas = document.getElementById("cv")
const nameInput = document.getElementById("nameInput")
const nameLabel = document.getElementById("nameLabel")
const btnGenerate = document.getElementById("btnGenerate")
const btnRandom = document.getElementById("btnRandom")
const btnDownload = document.getElementById("btnDownload")

/** Set all interactive elements to disabled/enabled. */
function setLoading(on) {
  ;[btnGenerate, btnRandom, btnDownload, nameInput].forEach(
    (el) => (el.disabled = on),
  )
  canvas.classList.toggle("loading", on)
}

/** Render the identicon for the given name and update the label. */
async function renderFor(name) {
  const display = name.trim() || "—"
  nameLabel.textContent = display
  nameLabel.classList.toggle("active", name.trim().length > 0)

  setLoading(true)
  try {
    await drawIdenticon(name || " ", canvas)
  } finally {
    setLoading(false)
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function generate() {
  await renderFor(nameInput.value)
}

const SAMPLE_NAMES = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Eve",
  "Frank",
  "Grace",
  "Hiro",
  "Iris",
  "Jack",
  "Kai",
  "Luna",
  "Max",
  "Nora",
  "Oscar",
  "Panda",
  "Quinn",
  "River",
  "Sam",
  "Tara",
  "Uma",
  "Vince",
  "Wren",
  "Xena",
  "Yuki",
  "Zara",
  "Claude",
  "GPT",
  "Gemini",
  "Grok",
]

async function random() {
  const base = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)]
  const suffix = Math.floor(Math.random() * 99)
  const name = `${base}${suffix}`
  nameInput.value = name
  await renderFor(name)
}

function download() {
  const name = nameLabel.textContent.trim()
  // Use a safe fallback filename if label is still the placeholder dash
  const safeName = name === "—" || name === "" ? "identicon" : name
  const link = document.createElement("a")
  link.download = `identicon-${safeName}.png`
  link.href = canvas.toDataURL("image/png")
  link.click()
}

// ─── Bindings ─────────────────────────────────────────────────────────────────

btnGenerate.addEventListener("click", generate)
btnRandom.addEventListener("click", random)
btnDownload.addEventListener("click", download)
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generate()
})

// ─── Init ─────────────────────────────────────────────────────────────────────

// Render a default identicon on load without filling the input box
renderFor("Claude")
nameInput.value = "" // keep placeholder visible
