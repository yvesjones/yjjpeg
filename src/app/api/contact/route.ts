import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "yvesjonesmusic@gmail.com";

/**
 * Resend's shared test sender. It can only deliver to the address that owns
 * the Resend account, so the enquiry itself arrives but the confirmation to
 * the visitor is refused. Verify a domain in Resend and change this to an
 * address on it (hello@yourdomain.com) to fix that.
 */
const FROM_EMAIL = "onboarding@resend.dev";

const typeLabels: Record<string, string> = {
  prints: "Print Enquiry",
  commission: "Commission",
  press: "Press / Media",
  general: "General",
};

/** The message goes into an HTML email, so it cannot carry markup of its own. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  try {
    const { name, email, type, subject, message } = (await request.json()) as
      Record<string, string>;

    if (!name || !email || !type || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const typeLabel = typeLabels[type] || type;
    const safe = {
      name: escapeHtml(name),
      email: escapeHtml(email),
      subject: escapeHtml(subject),
      message: escapeHtml(message),
      typeLabel: escapeHtml(typeLabel),
    };

    const notification = await resend.emails.send({
      from: FROM_EMAIL,
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `[${typeLabel}] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New enquiry from YJJPEG</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Name</td>
              <td style="padding: 8px 12px;">${safe.name}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Email</td>
              <td style="padding: 8px 12px;"><a href="mailto:${safe.email}">${safe.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Type</td>
              <td style="padding: 8px 12px;">${safe.typeLabel}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Subject</td>
              <td style="padding: 8px 12px;">${safe.subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Message</td>
              <td style="padding: 8px 12px; white-space: pre-wrap;">${safe.message}</td>
            </tr>
          </table>
        </div>
      `,
    });

    if (notification.error) {
      console.error("Resend notification error:", notification.error);
      return NextResponse.json(
        { error: notification.error.message },
        { status: 500 },
      );
    }

    const confirmation = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "We got your message — Yves Jones",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thanks for reaching out, ${safe.name}.</h2>
          <p style="color: #555; line-height: 1.6;">
            A quick confirmation that your message came through. I'll get back
            to you as soon as I can.
          </p>
          <div style="margin: 24px 0; padding: 16px; background: #f9f9f9; border-radius: 8px;">
            <p style="margin: 0 0 4px; font-weight: bold; color: #333;">${safe.subject}</p>
            <p style="margin: 0; color: #666; white-space: pre-wrap;">${safe.message}</p>
          </div>
          <p style="color: #999; font-size: 14px;">— Yves Jones</p>
        </div>
      `,
    });

    // The enquiry is what matters; a failed confirmation must not tell the
    // sender their message bounced when it did not.
    if (confirmation.error) {
      console.warn(
        `Confirmation to ${email} not sent: ${confirmation.error.message}. ` +
          `Sending from ${FROM_EMAIL} only reaches the Resend account owner — ` +
          `verify a domain in Resend and change FROM_EMAIL to fix this.`,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
