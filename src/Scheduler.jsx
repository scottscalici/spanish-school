// src/Scheduler.jsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase'; 
import emailjs from '@emailjs/browser';

const Scheduler = () => {
  // --- STATE ---
  const [selectedDate, setSelectedDate] = useState('');
  const [meetingType, setMeetingType] = useState('AMES'); 
  const [availableSlots, setAvailableSlots] = useState({}); 
  const [dayCycle, setDayCycle] = useState(null); 
  const [isFetching, setIsFetching] = useState(false);
  
  // Data Caches
  const [calendarCache, setCalendarCache] = useState({}); 
  const [settings, setSettings] = useState(null);
  const [exceptions, setExceptions] = useState([]);

  // Booking Modal State
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingNotes, setBookingNotes] = useState(''); 
  const [emailPrefs, setEmailPrefs] = useState({
    receipt: true,
    twoDaysBefore: false,
    morningOf: false,
    default24h: true 
  });

  // --- CONFIGURATION ---
  const BUFFER_MINS = 5;
  const MEETING_OPTIONS = {
    AMES: { duration: 25, label: 'AMES Meeting - 25m' },
    CAS: { duration: 30, label: 'CAS Interview - 30m' },
    EE: { duration: 60, label: 'Extended Essay - 60m' }
  };

  // --- HELPERS ---
  const getAcademicYearDocId = (dateString) => {
    const [yearStr, monthStr] = dateString.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr); 
    return month >= 7 ? `academic_year_${year}_${year + 1}` : `academic_year_${year - 1}_${year}`;
  };

  const timeToMins = (timeStr) => {
    const [h, m] = timeStr.split(':');
    return parseInt(h) * 60 + parseInt(m);
  };

  const minsToFormat = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const getSchoolBlock = (startMins) => {
    if (startMins < 435) return "☀️ Before School";
    if (startMins <= 525) return "1️⃣ 1st Block (7:15 - 8:45)";
    if (startMins < 531) return "🚶 Passing Time";
    if (startMins <= 621) return "2️⃣ 2nd Block (8:51 - 10:21)";
    if (startMins < 627) return "🚶 Passing Time";
    if (startMins <= 752) return "3️⃣ 3rd Block & Lunch (10:27 - 12:32)";
    if (startMins < 758) return "🚶 Passing Time";
    if (startMins <= 849) return "4️⃣ 4th Block (12:38 - 2:09)";
    return "🎒 After School";
  };

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const snapSettings = await getDoc(doc(db, 'scheduler_settings', 'defaults'));
        if (snapSettings.exists()) setSettings(snapSettings.data());

        const snapExceptions = await getDocs(collection(db, 'scheduler_overrides'));
        const excList = [];
        snapExceptions.forEach(d => excList.push({ id: d.id, ...d.data() }));
        setExceptions(excList);
      } catch (err) { console.error("Error fetching master data:", err); }
    };
    fetchMasterData();
  }, []);

  // --- GENERATE SLOTS ---
  useEffect(() => {
    if (!selectedDate || !settings) {
      setAvailableSlots({});
      setDayCycle(null);
      return;
    }

    const fetchAndCalculate = async () => {
      setIsFetching(true);
      try {
        const bookingsQuery = query(collection(db, 'bookings'), where('date', '==', selectedDate));
        const bookingsSnap = await getDocs(bookingsQuery);
        const dailyBookings = [];
        bookingsSnap.forEach(d => dailyBookings.push(d.data()));

        const docId = getAcademicYearDocId(selectedDate);
        let yearMapArray = calendarCache[docId];

        if (!yearMapArray) {
          const docSnap = await getDoc(doc(db, 'config', docId));
          yearMapArray = docSnap.exists() ? (docSnap.data().map || []) : [];
          setCalendarCache(prev => ({ ...prev, [docId]: yearMapArray }));
        }

        const dayRecord = yearMapArray.find(d => d.fecha === selectedDate);
        const todayException = exceptions.find(e => e.date === selectedDate);
        
        if (todayException && todayException.type === 'blackout') {
          setAvailableSlots({});
          setDayCycle(dayRecord ? dayRecord.ciclo : 'BLACKOUT');
          setIsFetching(false);
          return;
        }

        if (!dayRecord || dayRecord.status !== 'school') {
          setAvailableSlots({});
          setDayCycle(null);
          setIsFetching(false);
          return;
        }

        const isDayA = dayRecord.ciclo === 'A';
        setDayCycle(dayRecord.ciclo);

        let activeBlocks = (todayException && todayException.type === 'custom') 
          ? todayException.blocks 
          : (isDayA ? settings.dayA : settings.dayB);

        if (!activeBlocks) {
          setAvailableSlots({});
          setIsFetching(false);
          return;
        }

        const totalDurationRequired = MEETING_OPTIONS[meetingType].duration + BUFFER_MINS;
        const meetingMinsOnly = MEETING_OPTIONS[meetingType].duration;
        const groupedSlots = {};

        activeBlocks.forEach(block => {
          let currentStartMins = timeToMins(block.start);
          const endBlockMins = timeToMins(block.end);

          while (currentStartMins + totalDurationRequired <= endBlockMins) {
            const meetingEndMins = currentStartMins + meetingMinsOnly;
            
            const isConflict = dailyBookings.some(booking => {
              return (currentStartMins < booking.endMins && meetingEndMins > booking.startMins);
            });

            if (!isConflict) {
              const blockLabel = getSchoolBlock(currentStartMins);
              const timeString = `${minsToFormat(currentStartMins)} - ${minsToFormat(meetingEndMins)}`;
              
              if (!groupedSlots[blockLabel]) groupedSlots[blockLabel] = [];
              groupedSlots[blockLabel].push({ 
                rawTime: timeString, 
                startMins: currentStartMins, 
                endMins: meetingEndMins 
              });
            }
            currentStartMins += totalDurationRequired;
          }
        });

        setAvailableSlots(groupedSlots);
      } catch (error) { console.error("Error calculating slots:", error); }
      setIsFetching(false);
    };

    fetchAndCalculate();
  }, [selectedDate, meetingType, settings, exceptions]); 

 // --- SAVE BOOKING ---
 const submitBooking = async () => {
  setIsBooking(true);
  const user = auth.currentUser;

  if (!user) {
    alert("You must be logged in to book a meeting.");
    setIsBooking(false);
    return;
  }

  const payload = {
    studentUid: user.uid,
    studentEmail: user.email,
    meetingType: meetingType,
    date: selectedDate,
    dayCycle: dayCycle, 
    blockLabel: getSchoolBlock(selectedSlot.startMins),
    timeString: selectedSlot.rawTime,
    startMins: selectedSlot.startMins,
    endMins: selectedSlot.endMins,
    reminders: emailPrefs,
    notes: bookingNotes,
    createdAt: new Date().toISOString(),
    status: 'confirmed'
  };

  try {
    // 1. Save the actual booking to your JSON database
    await addDoc(collection(db, 'bookings'), payload);

    // 2. 🟢 NEW: Trigger the EmailJS Receipt
    if (emailPrefs.receipt) {
      await emailjs.send(
        'service_9sslrqv',     // <-- From EmailJS Services tab
        'template_zlacnbh',    // <-- From EmailJS Templates tab
        {
          to_email: user.email,
          meeting_type: MEETING_OPTIONS[meetingType].label,
          date: selectedDate,
          day_cycle: dayCycle,
          time: selectedSlot.rawTime,
          block: getSchoolBlock(selectedSlot.startMins),
          notes: bookingNotes || "No notes provided"
        },
        'cT8kGbRn8OIQpCvPm'      // <-- From EmailJS Account > API Keys tab
      );
    }

    alert("🎉 Meeting booked successfully! Check your email for a receipt.");
    
    setSelectedSlot(null); 
    setBookingNotes('');
    const tempDate = selectedDate;
    setSelectedDate('');
    setTimeout(() => setSelectedDate(tempDate), 50);

  } catch (error) {
    console.error("Error saving booking or sending email:", error);
    alert("Failed to process request. Please try again.");
  }
  setIsBooking(false);
}; // 🟢 <--- HERE IS THE MISSING CLOSING BRACE!

  const handleOpenModal = (slot) => {
    setSelectedSlot(slot);
    setBookingNotes(''); 
  };

  const hasAvailability = Object.keys(availableSlots).length > 0;

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200 font-sans relative">
      
      {/* --- BOOKING MODAL (OVERLAY) --- */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-blue-600 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 border-b pb-4">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Confirm Booking</h3>
                <p className="font-bold text-blue-600 mt-1">{MEETING_OPTIONS[meetingType].label}</p>
              </div>
              <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-slate-600 font-black text-xl">✖</button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Date & Time</p>
              {/* 🟢 TRANSLATED TO ENGLISH */}
              <p className="text-lg font-black text-slate-800">{selectedDate} • DAY {dayCycle}</p>
              <p className="text-lg font-black text-slate-800">{selectedSlot.rawTime}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                Notes for Señor Scalici (Optional)
              </label>
              <textarea 
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="E.g., I had to schedule a different time, I uploaded my EE outline to ManageBAC..."
                className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-600 resize-none h-24"
              ></textarea>
            </div>

            {/* Email Preferences */}
            <div className="mb-6">
              <h4 className="font-bold text-slate-800 mb-3">Email Preferences</h4>
              <div className="flex flex-col gap-3 text-sm font-bold text-slate-600">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={emailPrefs.receipt} onChange={(e) => setEmailPrefs({...emailPrefs, receipt: e.target.checked})} className="w-4 h-4 text-blue-600 accent-blue-600" />
                  Send me a confirmation receipt now
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={emailPrefs.default24h} onChange={(e) => setEmailPrefs({...emailPrefs, default24h: e.target.checked})} className="w-4 h-4 text-blue-600 accent-blue-600" />
                  Send reminder 24 hours before
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={emailPrefs.twoDaysBefore} onChange={(e) => setEmailPrefs({...emailPrefs, twoDaysBefore: e.target.checked})} className="w-4 h-4 text-blue-600 accent-blue-600" />
                  Send reminder 2 days before
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={emailPrefs.morningOf} onChange={(e) => setEmailPrefs({...emailPrefs, morningOf: e.target.checked})} className="w-4 h-4 text-blue-600 accent-blue-600" />
                  Send reminder at 7:00 AM the morning of
                </label>
              </div>
            </div>

            <button 
              onClick={submitBooking}
              disabled={isBooking}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300"
            >
              {isBooking ? 'SAVING...' : 'CONFIRM & BOOK MEETING ➔'}
            </button>
          </div>
        </div>
      )}

      {/* --- MAIN INTERFACE --- */}
      <h2 className="text-3xl font-black text-slate-800 mb-2">Book a Meeting</h2>
      <p className="text-slate-500 mb-8 border-b pb-4">Select a meeting type and date to view available times.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">1. Meeting Type</label>
            <div className="flex flex-col gap-2">
              {Object.keys(MEETING_OPTIONS).map(type => (
                <button
                  key={type}
                  onClick={() => setMeetingType(type)}
                  className={`p-3 text-left rounded-lg border-2 transition-all font-bold ${meetingType === type ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                >
                  {MEETING_OPTIONS[type].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">2. Select Date</label>
              {/* 🟢 TRANSLATED TO ENGLISH */}
              {dayCycle && dayCycle !== 'BLACKOUT' && (
                <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest ${dayCycle === 'A' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  DAY {dayCycle}
                </span>
              )}
            </div>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-3 border-2 border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 min-h-[300px]">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Available Times</h3>
          
          {isFetching ? (
            <div className="text-center text-blue-600 py-10 font-bold animate-pulse">Checking Availability...</div>
          ) : !selectedDate ? (
            <div className="text-center text-slate-400 py-10 font-bold border-2 border-dashed border-slate-300 rounded-lg">Please select a date first. 📅</div>
          ) : !hasAvailability ? (
            <div className="text-center text-slate-400 py-10 font-bold border-2 border-dashed border-slate-300 rounded-lg">
              {dayCycle === 'BLACKOUT' ? 'No meetings are available on this date. 🚫' : 'All slots are booked or unavailable. 🚫'}
            </div>
          ) : (
            <div className="flex flex-col gap-6 max-h-[450px] overflow-y-auto pr-2">
              {Object.keys(availableSlots).map((blockName) => (
                <div key={blockName}>
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 border-b border-slate-200 pb-1">{blockName}</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {availableSlots[blockName].map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => handleOpenModal(slot)}
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:border-blue-600 hover:text-blue-600 hover:shadow-sm transition-all text-left"
                      >
                        {slot.rawTime}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scheduler;