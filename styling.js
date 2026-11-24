(function () {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
  <style>
    :host{display:block;font-family:Arial,Helvetica,sans-serif;font-size:13px}
    label{display:block;margin:8px 0 4px;color:#555}
    input{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #aaa;border-radius:4px;font-size:13px}
    button{margin-top:10px;padding:6px 14px;border:0;border-radius:4px;background:#0a6ed1;color:#fff;cursor:pointer}
  </style>
  <form id="form">
    <label for="ttl">Widget title</label>
    <input id="ttl" type="text" />
    <button type="submit">Apply</button>
  </form>`;

  class StylingPanel extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._shadow.getElementById("form").addEventListener("submit", (e) => {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent("propertiesChanged", {
          detail: { properties: { widgetTitle: this._shadow.getElementById("ttl").value } }
        }));
      });
    }
    set widgetTitle(v) { this._shadow.getElementById("ttl").value = v || ""; }
    get widgetTitle() { return this._shadow.getElementById("ttl").value; }
  }
  customElements.define("com-evora-actual-vs-target-styling", StylingPanel);
})();