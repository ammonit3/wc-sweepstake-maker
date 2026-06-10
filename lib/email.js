// Sends the creator their admin link via Resend. No-op if not configured.
export async function sendAdminLink({ to, creatorName, sweepName, viewUrl, adminUrl }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const from = process.env.EMAIL_FROM || "Sweepstake <onboarding@resend.dev>";
    await resend.emails.send({
      from, to,
      subject: `Your sweepstake "${sweepName}" is live ⚽`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px">
          <h2>It's Mathematically Possible!</h2>
          <p>Hi ${creatorName || "there"}, your World Cup sweepstake <b>${sweepName}</b> is set up and the draw is done.</p>
          <p><b>Share this link with your players (view-only):</b><br>
            <a href="${viewUrl}">${viewUrl}</a></p>
          <p><b>Keep this one private — it's your admin link:</b><br>
            <a href="${adminUrl}">${adminUrl}</a></p>
          <p style="color:#888;font-size:12px">Scores and standings update automatically once the tournament kicks off.</p>
        </div>`,
    });
    return { sent: true };
  } catch (e) {
    return { error: e.message };
  }
}
