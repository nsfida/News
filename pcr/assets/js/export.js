
(() => {
  const PCR = window.PCR = window.PCR || {};

  PCR.downloadBlob = (filename, content, mime = "application/json;charset=utf-8") => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  PCR.exportModuleJSON = (module) => {
    const data = PCR.getModuleData(module);
    const filename = `${module}.json`;
    PCR.downloadBlob(filename, JSON.stringify(data, null, 2));
    PCR.toast?.(`Downloaded ${filename}`);
  };

  PCR.exportAllJSON = () => {
    const bundle = {
      version: PCR.state.version || 2,
      savedAt: new Date().toISOString(),
      data: {}
    };
    Object.keys(window.PCR_CONFIG.modules).forEach((module) => {
      bundle.data[module] = PCR.getModuleData(module);
    });
    PCR.downloadBlob("premium-car-rental-uae-backup.json", JSON.stringify(bundle, null, 2));
    PCR.toast?.("Downloaded full backup JSON");
  };

  PCR.exportDocumentHTML = (filename, html) => {
    PCR.downloadBlob(filename, html, "text/html;charset=utf-8");
  };

  PCR.openPrintWindow = (title, bodyHTML, extraCSS = "") => {
    const w = window.open("", "_blank", "width=1200,height=900");
    if (!w) {
      alert("Popup blocked. Please allow popups to print/download the document.");
      return null;
    }
    const company = PCR.getModuleData("settings") || {};
    const logo = "assets/img/logo.png";
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${PCR.escapeHTML(title)}</title>
        <style>
          :root { color-scheme: dark; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f3f5fb; color: #101828; }
          .page { max-width: 1100px; margin: 0 auto; background: white; min-height: 100vh; padding: 28px; }
          .doc-head { display:flex; gap:16px; align-items:center; justify-content:space-between; border-bottom: 2px solid #e6e8f0; padding-bottom: 18px; margin-bottom: 18px; }
          .brand { display:flex; gap:14px; align-items:center; }
          .brand img { width: 72px; height: 72px; object-fit: contain; border-radius: 18px; background:#0b1020; padding: 8px; }
          .brand h1 { margin:0; font-size: 24px; letter-spacing: .4px; }
          .brand p { margin:4px 0 0; color:#667085; font-size: 13px; }
          .meta { text-align:right; font-size: 13px; color:#344054; line-height: 1.6; }
          .pill { display:inline-block; padding: 4px 10px; border-radius: 999px; background:#f1e7f6; color:#8a2f6f; font-weight: 700; }
          table { width:100%; border-collapse: collapse; margin: 14px 0; }
          th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align:left; font-size: 13px; vertical-align: top; }
          th { background: #f8fafc; font-weight: 700; }
          .grid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 14px 0; }
          .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 14px; }
          .card h3 { margin:0 0 8px; font-size: 15px; }
          .muted { color:#667085; }
          .section { margin: 18px 0; }
          .section h2 { font-size: 18px; margin: 0 0 8px; }
          .terms li { margin: 8px 0; }
          .signature { display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 22px; }
          .sign-box { min-height: 92px; border: 1px dashed #b8c1d9; border-radius: 14px; padding: 12px; font-size: 13px; }
          .check-card { display:grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
          .vehicle-view { min-height: 145px; border: 1px solid #d7dceb; border-radius: 14px; padding: 10px; background:#fbfcff; }
          .vehicle-grid { display:grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
          .vehicle-grid div { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; min-height: 64px; font-size: 12px; }
          .footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 12px; color:#667085; display:flex; justify-content:space-between; gap:12px; }
          ${extraCSS}
          @media print { body { background: white; } .page { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="page">
          ${bodyHTML}
          <div class="footer">
            <div>${PCR.escapeHTML(company.documentFooterText || "")}</div>
            <div>${new Date().toLocaleString()}</div>
          </div>
        </div>
        <script>
          window.onload = () => { setTimeout(() => window.print(), 350); };
        </script>
      </body>
      </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
    return w;
  };
})();
