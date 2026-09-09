import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Runs every day at 11:00 AM UTC (7:00 AM EDT)
export const config = {
  schedule: "0 11 * * *"
};

// Initialize Firebase for the backend
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY, 
  authDomain: "senorplus-1926c.firebaseapp.com",
  projectId: "senorplus-1926c",
  storageBucket: "senorplus-1926c.firebasestorage.app",
  messagingSenderId: "176067304584",
  appId: "1:176067304584:web:16346821442861c7f6533d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// EmailJS REST API Helper
const sendEmailJS = async (booking, timeFrame) => {
  const MEETING_OPTIONS = {
    AMES: 'AMES Meeting - 25m',
    CAS: 'CAS Interview - 30m',
    EE: 'Extended Essay - 60m'
  };

  const payload = {
    service_id: "service_zgelqce", // 👈 Paste your Gmail service ID here
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

  await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};

export default async () => {
  try {
    const getOffsetDate = (days) => {
      const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Detroit" }));
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const todayStr = getOffsetDate(0);
    const tomorrowStr = getOffsetDate(1);
    const twoDaysStr = getOffsetDate(2);

    const bookingsSnap = await getDocs(collection(db, "bookings"));
    const promises = [];

    bookingsSnap.forEach(doc => {
      const b = doc.data();
      if (b.status !== "confirmed" || !b.reminders) return;

      if (b.date === todayStr && b.reminders.morningOf) {
        promises.push(sendEmailJS(b, "TODAY"));
      } else if (b.date === tomorrowStr && b.reminders.default24h) {
        promises.push(sendEmailJS(b, "TOMORROW"));
      } else if (b.date === twoDaysStr && b.reminders.twoDaysBefore) {
        promises.push(sendEmailJS(b, "IN 2 DAYS"));
      }
    });

    await Promise.all(promises);
    return new Response("Reminders processed successfully", { status: 200 });

  } catch (error) {
    console.error(error);
    return new Response("Failed to send reminders", { status: 500 });
  }
};