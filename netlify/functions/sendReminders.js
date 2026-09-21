import admin from "firebase-admin";

// Runs every day at 11:00 AM UTC (7:00 AM EDT)
export const config = {
  schedule: "0 11 * * *"
};

// Initialize Firebase Admin (bypasses Firestore security rules, unlike the
// client SDK, so this works with no signed-in user).
// Read via bracket notation (not process.env.FIREBASE_SERVICE_ACCOUNT_KEY):
// Netlify's function bundler inlines build-time env vars accessed by dot
// notation as literals into the deployed bundle, which would bake this
// private key into the shipped code. Bracket notation isn't statically
// resolvable, so the value is only read at runtime.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env['FIREBASE_SERVICE_ACCOUNT_KEY'])
    )
  });
}

const db = admin.firestore();

const MEETING_OPTIONS = {
  AMES: 'AMES Meeting - 25m',
  CAS: 'CAS Interview - 30m',
  EE: 'Extended Essay - 60m'
};

// Maps a reminder key to the booking.reminders flag that opts into it and
// the human-readable phrase used in the email.
const REMINDER_DEFS = [
  { key: 'twoDaysBefore', prefField: 'twoDaysBefore', offsetDays: 2, timeFrame: 'IN 48 HOURS' },
  { key: 'default24h', prefField: 'default24h', offsetDays: 1, timeFrame: 'TOMORROW (24 HOURS)' },
  { key: 'morningOf', prefField: 'morningOf', offsetDays: 0, timeFrame: 'TODAY' }
];

// EmailJS REST API Helper
const sendEmailJS = async (booking, timeFrame) => {
  const payload = {
    service_id: "service_zgelqce",
    template_id: "template_zlacnbh",
    user_id: "cT8kGbRn8OIQpCvPm",
    template_params: {
      to_email: booking.studentEmail,
      meeting_type: MEETING_OPTIONS[booking.meetingType] || booking.meetingType,
      date: booking.date,
      day_cycle: booking.dayCycle,
      time: booking.timeString,
      block: booking.blockLabel,
      notes: `Automated Reminder: Your meeting is ${timeFrame}. Notes: ${booking.notes || "None"}`
    }
  };

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`EmailJS ${res.status}: ${body}`);
  }
};

export default async () => {
  const getOffsetDate = (days) => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Detroit" }));
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const dateByOffset = { 0: getOffsetDate(0), 1: getOffsetDate(1), 2: getOffsetDate(2) };

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    const bookingsSnap = await db.collection("bookings").get();

    const jobs = [];

    bookingsSnap.forEach(docSnap => {
      const b = docSnap.data();
      if (b.status !== "confirmed" || !b.reminders) return;

      REMINDER_DEFS.forEach(({ key, prefField, offsetDays, timeFrame }) => {
        if (b.date !== dateByOffset[offsetDays]) return;
        if (!b.reminders[prefField]) return;
        if (b.remindersSent?.[key]) {
          skipped++;
          return;
        }

        jobs.push(
          sendEmailJS(b, timeFrame)
            .then(() => docSnap.ref.update({ [`remindersSent.${key}`]: true }))
            .then(() => { sent++; })
            .catch(err => {
              failed++;
              console.error(`Reminder failed for booking ${docSnap.id} (${key}):`, err.message);
            })
        );
      });
    });

    await Promise.all(jobs);

    const summary = `Reminders processed: ${sent} sent, ${failed} failed, ${skipped} already sent.`;
    console.log(summary);
    return new Response(summary, { status: failed > 0 ? 207 : 200 });

  } catch (error) {
    console.error("Fatal error running sendReminders:", error);
    return new Response(`Failed to send reminders: ${error.message}`, { status: 500 });
  }
};
