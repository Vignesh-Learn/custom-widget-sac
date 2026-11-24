(function () {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
  <style>
    :host{display:block;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a}
    .card{background:#fff;border-radius:12px;padding:16px 20px;height:100%;box-sizing:border-box;overflow:auto}
    h3{margin:0 0 6px;font-size:16px}
    .pace{font-size:12px;color:#666;margin-bottom:10px;border-left:3px solid #7B4DFF;padding-left:8px}
    .pace b{color:#7B4DFF}
    .g{color:#1a9d4a}.r{color:#c4262e}
    .legend{display:flex;gap:14px;font-size:12px;color:#666;margin:8px 0}
    .sw{display:inline-block;width:12px;height:12px;border-radius:3px;background:#7B4DFF;margin-right:4px;vertical-align:-2px}
    .tk{display:inline-block;width:2px;height:14px;background:#000;margin-right:4px;vertical-align:-3px}
    .rh{display:flex;justify-content:space-between;font-size:12px;font-weight:bold;color:#777;
        border-bottom:1px solid #e5e5e5;padding:14px 0 4px;margin-bottom:6px}
    .row{display:grid;grid-template-columns:150px 1fr 190px;gap:10px;align-items:center;margin:8px 0;font-size:13px}
    .track{position:relative;height:14px;border-radius:7px;background:#efeef6}
    .fill{position:absolute;left:0;top:0;bottom:0;border-radius:7px;background:#7B4DFF}
    .mark{position:absolute;top:-3px;bottom:-3px;width:2px;background:#000}
    .val{text-align:right}
    .val .t{color:#888;font-size:12px}
    .msg{font-size:13px;color:#777;padding:16px 0}
  </style>
  <div class="card"><h3 id="t"></h3><div class="pace" id="p"></div>
  <div class="legend"><span><i class="sw"></i>Actual</span><span><i class="tk"></i>Target</span></div>
  <div id="body"></div></div>`;

  const money = (v) => {
    const a = Math.abs(v), s = v < 0 ? "-" : "";
    if (a >= 1e6) return s + "€" + (a / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return s + "€" + (a / 1e3).toFixed(2) + "k";
    return s + "€" + a.toFixed(0);
  };
  const num = (m) => {
    if (!m || m.raw == null) return null;
    const n = Number(m.raw);
    return isNaN(n) ? null : n;
  };
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const dayOfYear = () => {
    const n = new Date(), s = new Date(n.getFullYear(), 0, 0);
    return Math.floor((n - s) / 864e5);
  };

  class Widget extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._props = { title: "Order Entry — Actual vs Target" };
    }
    onCustomWidgetBeforeUpdate(changed) { this._props = { ...this._props, ...changed }; }
    onCustomWidgetAfterUpdate() { this.render(); }
    set myDataBinding(b) { this._binding = b; this.render(); }

    message(text) {
      const body = this._shadow.getElementById("body");
      body.innerHTML = `<div class="msg">${esc(text)}</div>`;
    }

    render() {
      try {
        const sh = this._shadow;
        sh.getElementById("t").textContent = this._props.title || "";
        const day = dayOfYear(), pace = Math.round((day / 365) * 100);
        sh.getElementById("p").innerHTML =
          `PACE day ${day}/365 = <b>${pace}%</b> · <span class="g">≥${pace}% green</span> · <span class="r">&lt;${pace}% red</span>`;
        const body = sh.getElementById("body");
        body.innerHTML = "";
        const b = this._binding;
        if (this._props.debug) console.log("ActualVsTarget binding:", b);
        if (!b) return this.message("Waiting for data binding...");
        if (b.state && b.state !== "success") return this.message("Data state: " + b.state);
        if (!b.data || !b.data.length) return this.message("No data. Add Region and Business_Unit under Dimensions, and Actual then Target under Measures.");

        const first = b.data[0];
        if (!first.dimensions_0) return this.message("Add Region (first) and Business_Unit (second) under Dimensions.");
        if (!first.measures_0) return this.message("Add the Actual measure (first) and the Target measure (second) under Measures.");

        const groups = {};
        b.data.forEach((r) => {
          if (!r.dimensions_0) return;
          const region = r.dimensions_0.label || r.dimensions_0.id || "";
          const bu = r.dimensions_1 ? (r.dimensions_1.label || r.dimensions_1.id || "") : "";
          (groups[region] = groups[region] || []).push({ bu, A: num(r.measures_0), T: num(r.measures_1) });
        });

        Object.keys(groups).forEach((region) => {
          const rows = groups[region];
          const sa = rows.reduce((s, x) => s + (x.A || 0), 0);
          const st = rows.reduce((s, x) => s + (x.T || 0), 0);
          const hp = st ? Math.round((sa / st) * 100) : null;
          const h = document.createElement("div");
          h.className = "rh";
          h.innerHTML = `<span>${esc(region.toUpperCase())}</span><span>${
            st ? `${money(sa)} of ${money(st)} · ${hp}%` : "No target set"}</span>`;
          body.appendChild(h);

          rows.forEach((x) => {
            const row = document.createElement("div");
            row.className = "row";
            const name = document.createElement("span");
            name.textContent = x.bu;
            const track = document.createElement("div");
            track.className = "track";
            const val = document.createElement("div");
            val.className = "val";
            if (x.A == null || !x.T) {
              val.innerHTML = `<span class="t">No data yet</span>`;
            } else {
              const dom = Math.max(x.A, x.T) * 1.04;
              const fill = document.createElement("div");
              fill.className = "fill";
              fill.style.width = (Math.min(x.A, x.T) / dom) * 100 + "%";
              const mark = document.createElement("div");
              mark.className = "mark";
              mark.style.left = (x.T / dom) * 100 + "%";
              track.append(fill, mark);
              const p = Math.round((x.A / x.T) * 100);
              val.innerHTML = `<b>${money(x.A)}</b> <span class="t">of ${money(x.T)}</span> <b class="${
                p >= pace ? "g" : "r"}">${p}%</b>`;
            }
            row.append(name, track, val);
            body.appendChild(row);
          });
        });
      } catch (e) {
        console.error("ActualVsTarget render error:", e);
        this.message("Render error: " + e.message);
      }
    }
  }
  customElements.define("com-evora-actual-vs-target", Widget);
})();