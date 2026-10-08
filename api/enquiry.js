// Demo enquiries from the Book a demo page, sent as an email via Resend.
//
// Environment (Vercel project settings):
//   RESEND_API_KEY   required; without it the endpoint answers 503 and the page
//                    falls back to its plain email link
//   ENQUIRY_TO       where enquiries go       (default support@pulsus.tech)
//   ENQUIRY_FROM     the sending address      (default Pulsus Intelligence Suite <support@pulsus.tech>)
//
// Spam: a hidden "website" field that people never fill, and a minimum time
// between the page loading and the form being sent. Both fail quietly with a
// normal-looking success so a bot learns nothing.

const clean = (v) => (typeof v === "string" ? v.trim().replace(/^["']+|["']+$/g, "").trim() : "");
const field = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MIN_FILL_MS = 3000;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method" });
  }

  const b = req.body && typeof req.body === "object" ? req.body : {};
  const name = field(b.name, 120);
  const email = field(b.email, 200);
  const institution = field(b.institution, 160);
  const role = field(b.role, 120);
  const application = field(b.application, 80);
  const availability = field(b.availability, 300);
  const notes = field(b.notes, 2000);

  // Bot checks: answer as if it worked.
  const startedAt = Number(b.t) || 0;
  if (field(b.website, 200) || !startedAt || Date.now() - startedAt < MIN_FILL_MS) {
    return res.status(200).json({ ok: true });
  }

  if (!name || !institution || !EMAIL.test(email)) {
    return res.status(400).json({ ok: false, error: "fields" });
  }

  const key = clean(process.env.RESEND_API_KEY);
  if (!key) return res.status(503).json({ ok: false, error: "unconfigured" });
  const to = clean(process.env.ENQUIRY_TO) || "support@pulsus.tech";
  const from = clean(process.env.ENQUIRY_FROM) || "Pulsus Intelligence Suite <support@pulsus.tech>";

  const rows = [
    ["Name", name],
    ["Email", email],
    ["Institution", institution],
    ["Role", role],
    ["Application of most interest", application],
    ["Availability", availability],
    ["Notes", notes],
  ]
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#6E625E;vertical-align:top;white-space:nowrap">${k}</td>` +
        `<td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`
    )
    .join("");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#1C1416">
    <div style="background:#E4012B;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0;font-weight:bold">Pulsus Intelligence Suite: demo request</div>
    <div style="border:1px solid #eee;border-top:none;padding:16px 18px;border-radius:0 0 10px 10px">
      <table style="border-collapse:collapse;font-size:14px">${rows}</table>
      <p style="font-size:12px;color:#6E625E;margin-top:16px">Sent from the Book a demo page on about.pulsus.tech. Reply to answer ${esc(name)} directly.</p>
    </div></div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `Demo request: ${institution}${application ? ` (${application})` : ""}`,
        html,
      }),
    });
    if (!r.ok) {
      console.error("[enquiry] Resend send failed:", r.status, (await r.text().catch(() => "")).slice(0, 200));
      return res.status(502).json({ ok: false, error: "send" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[enquiry] Resend error:", e && e.message ? e.message : e);
    return res.status(502).json({ ok: false, error: "send" });
  }
};
