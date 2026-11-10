"use strict";
const COLORS = {
  USA: "#17664d",
  GBR: "#b95832",
  DEU: "#765ba5",
  CAN: "#287caa",
  AUS: "#987817",
  JPN: "#be4673",
};
const selected = new Set(Object.keys(DATA));
const fmt = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const pct = (n) => (n > 0 ? "+" : "") + n.toFixed(1) + "%";
const change = (v) => 100 * (v[v.length - 1][1] / v[0][1] - 1);
const ns = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, text) {
  const e = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}
function chart(
  target,
  series,
  { min, max, start = 1990, end = 2018, dark = false, area = false, unit = "" },
) {
  const container = document.getElementById(target);
  container.replaceChildren();
  const W = 960,
    H = 410,
    L = 78,
    R = 26,
    T = 42,
    B = 55,
    ink = dark ? "#c8dacb" : "#52675c",
    grid = dark ? "#3a5548" : "#e1e7df";
  const x = (y) => L + ((y - start) / (end - start)) * (W - L - R),
    y = (v) => H - B - ((v - min) / (max - min)) * (H - T - B);
  const svg = el("svg", {
    viewBox: `0 0 ${W} ${H}`,
    role: "img",
    "aria-labelledby": target + "-title " + target + "-desc",
  });
  svg.append(
    el(
      "title",
      { id: target + "-title" },
      target === "white-chart"
        ? "Greenhouse gas emissions across selected countries"
        : "United States greenhouse gas emissions",
    ),
    el(
      "desc",
      { id: target + "-desc" },
      `${start} to ${end}. Vertical range ${min} to ${max} ${unit}. ${series.map((s) => s.name).join(", ")}. Annual values are available in the white hat data table.`,
    ),
  );
  svg.append(el("text", { x: L, y: 20, fill: ink, "font-size": 13 }, unit));
  for (let i = 0; i <= 5; i++) {
    let v = min + ((max - min) * i) / 5;
    svg.append(
      el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: grid }),
      el(
        "text",
        {
          x: L - 12,
          y: y(v) + 4,
          "text-anchor": "end",
          fill: ink,
          "font-size": 12,
        },
        fmt(v),
      ),
    );
  }
  if (min < 0 && max > 0)
    svg.append(
      el("line", {
        x1: L,
        x2: W - R,
        y1: y(0),
        y2: y(0),
        stroke: ink,
        "stroke-dasharray": "5 5",
      }),
    );
  const ticks = [
    start,
    ...[1995, 2000, 2005, 2010, 2015].filter((t) => t > start && t < end),
    end,
  ];
  for (const t of ticks)
    svg.append(
      el(
        "text",
        {
          x: x(t),
          y: H - 22,
          "text-anchor": "middle",
          fill: ink,
          "font-size": 12,
        },
        t,
      ),
    );
  for (const s of series) {
    const points = s.values.filter((p) => p[0] >= start && p[0] <= end);
    const d = points
      .map((p, i) => (i ? "L" : "M") + x(p[0]) + "," + y(p[1]))
      .join(" ");
    if (area)
      svg.append(
        el("path", {
          d: d + ` L${x(end)},${y(min)} L${x(start)},${y(min)} Z`,
          fill: s.color,
          opacity: 0.17,
        }),
      );
    svg.append(
      el("path", {
        d,
        fill: "none",
        stroke: s.color,
        "stroke-width": 3,
        "stroke-linejoin": "round",
      }),
    );
    for (const p of points) {
      const dot = el("circle", {
        cx: x(p[0]),
        cy: y(p[1]),
        r: 4,
        fill: s.color,
        tabindex: 0,
      });
      dot.append(
        el(
          "title",
          {},
          `${s.name}, ${p[0]}: ${fmt(p[1])} ${unit}. ${p[2] || ""}`,
        ),
      );
      svg.append(dot);
    }
  }
  container.append(svg);
}
for (const [code, d] of Object.entries(DATA)) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = true;
  input.addEventListener("change", () => {
    input.checked ? selected.add(code) : selected.delete(code);
    renderWhite();
  });
  label.append(input, document.createTextNode(d.name));
  label.style.color = COLORS[code];
  document.getElementById("countries").append(label);
}
function renderWhite() {
  const absolute = document.getElementById("metric").value === "absolute";
  const series = Object.entries(DATA)
    .filter(([c]) => selected.has(c))
    .map(([c, d]) => ({
      name: d.name,
      color: COLORS[c],
      values: d.values.map((p) => [
        p[0],
        absolute ? p[1] : 100 * (p[1] / d.values[0][1] - 1),
        p[2],
      ]),
    }));
  chart("white-chart", series, {
    min: absolute ? 0 : -50,
    max: absolute ? 8000 : 40,
    unit: absolute ? "Mt CO₂e" : "Change from 1990 (%)",
  });
  document.getElementById("white-caption").textContent = series.length
    ? "Annual total excluding LULUCF · 1990–2018 · Fixed shared scale · Hover or focus a point for its value."
    : "Select at least one country to show its trajectory.";
  const stats = document.getElementById("stats");
  stats.replaceChildren();
  for (const c of selected) {
    const d = DATA[c],
      div = document.createElement("div");
    div.className = "stat";
    div.style.borderColor = COLORS[c];
    const name = document.createElement("span");
    name.textContent = d.name;
    const value = document.createElement("strong");
    value.textContent = pct(change(d.values));
    const desc = document.createElement("span");
    desc.textContent = `1990–2018 · ${fmt(d.values.at(-1)[1])} Mt in 2018`;
    div.append(name, value, desc);
    stats.append(div);
  }
  const wrap = document.getElementById("data-table");
  wrap.replaceChildren();
  const table = document.createElement("table");
  table.innerHTML =
    '<caption>Annual totals excluding LULUCF, Mt CO₂e</caption><thead><tr><th scope="col">Country</th><th scope="col">Year</th><th scope="col">Mt CO₂e</th><th scope="col">Status</th></tr></thead>';
  const body = document.createElement("tbody");
  for (const c of selected)
    for (const p of DATA[c].values) {
      const tr = document.createElement("tr");
      for (const val of [DATA[c].name, p[0], p[1].toFixed(3), p[2]]) {
        const td = document.createElement("td");
        td.textContent = val;
        tr.append(td);
      }
      body.append(tr);
    }
  table.append(body);
  wrap.append(table);
}
let restored = false;
function renderBlack() {
  chart(
    "black-chart",
    [{ name: "United States", color: "#bfe29b", values: DATA.USA.values }],
    {
      min: restored ? 0 : 6000,
      max: 8000,
      start: restored ? 1990 : 2007,
      dark: true,
      area: true,
      unit: "Mt CO₂e",
    },
  );
  document.getElementById("restore").textContent = restored
    ? "Return to the selective framing"
    : "Restore the full context";
  document.getElementById("restore").setAttribute("aria-pressed", restored);
  document.getElementById("restore-status").textContent = restored
    ? "Full context: 1990–2018, zero-based axis. Emissions increased " +
      pct(change(DATA.USA.values)) +
      ". The campaign headline above remains visible for comparison."
    : "Showing the selective 2007–2018 window with a truncated axis.";
}
document.getElementById("metric").addEventListener("change", renderWhite);
document.getElementById("restore").addEventListener("click", () => {
  restored = !restored;
  renderBlack();
});
renderWhite();
renderBlack();
