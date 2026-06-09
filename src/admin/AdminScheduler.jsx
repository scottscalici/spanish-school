// src/admin/AdminScheduler.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

const AdminScheduler = () => {
  const [activeTab, setActiveTab] = useState('bookings'); // Default to bookings now
  
  // Roster State
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  
  // Settings & Exceptions State
  const [defaultA, setDefaultA] = useState([{ start: '07:15', end: '08:45' }, { start: '08:51', end: '10:00' }]);
  const [defaultB, setDefaultB] = useState([{ start: '08:51', end: '10:21' }]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [exceptions, setExceptions] = useState([]);
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionType, setExceptionType] = useState('blackout'); 
  const [customStart, setCustomStart] = useState('07:15');
  const [customEnd, setCustomEnd] = useState('10:21');

  // Bookings State
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const AVAILABLE_TAGS = ['AMES', 'CAS', 'EE', '1A', '2A', '3A', '4A', '1B', '2B', '3B', '4B'];

  // --- HELPER: ACADEMIC YEAR ---
  const getAcademicYearDocId = (dateString) => {
    const [yearStr, monthStr] = dateString.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr); 
    return month >= 7 ? `academic_year_${year}_${year + 1}` : `academic_year_${year - 1}_${year}`;
  };

  // --- FETCH DATA ---
  useEffect(() => {
    fetchStudents();
    fetchExceptions();
    fetchSettings();
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'bookings'));
      const fetched = [];
      querySnapshot.forEach((doc) => fetched.push({ id: doc.id, ...doc.data() }));
      // Sort chronologically by date and start minutes
      fetched.sort((a, b) => {
        if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
        return a.startMins - b.startMins;
      });
      setBookings(fetched);
    } catch (error) { console.error("Error fetching bookings:", error); }
    setLoadingBookings(false);
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers = [];
      querySnapshot.forEach((doc) => fetchedUsers.push({ id: doc.id, ...doc.data() }));
      setStudents(fetchedUsers);
    } catch (error) { console.error("Error fetching students:", error); }
    setLoadingStudents(false);
  };

  const fetchSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'scheduler_settings', 'defaults'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.dayA) setDefaultA(data.dayA);
        if (data.dayB) setDefaultB(data.dayB);
      }
    } catch (error) { console.error("Error fetching settings:", error); }
  };

  const fetchExceptions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'scheduler_overrides'));
      const fetched = [];
      querySnapshot.forEach((doc) => fetched.push({ id: doc.id, ...doc.data() }));
      fetched.sort((a, b) => new Date(a.date) - new Date(b.date));

      const configsCache = {};
      for (let i = 0; i < fetched.length; i++) {
        const exc = fetched[i];
        const docId = getAcademicYearDocId(exc.date);
        if (!configsCache[docId]) {
          const configSnap = await getDoc(doc(db, 'config', docId));
          configsCache[docId] = configSnap.exists() ? (configSnap.data().map || []) : [];
        }
        const dayRecord = configsCache[docId].find(d => d.fecha === exc.date);
        exc.dayCycle = (dayRecord && dayRecord.ciclo) ? dayRecord.ciclo : null;
      }
      setExceptions(fetched);
    } catch (error) { console.error("Error fetching exceptions:", error); }
  };

  // --- ACTIONS ---
  const toggleTag = async (userId, currentTags = [], tagToToggle) => {
    const newTags = currentTags.includes(tagToToggle) ? currentTags.filter(t => t !== tagToToggle) : [...currentTags, tagToToggle];
    try {
      await updateDoc(doc(db, 'users', userId), { tags: newTags });
      setStudents(students.map(student => student.id === userId ? { ...student, tags: newTags } : student));
    } catch (error) { alert("Failed to update tag."); }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'scheduler_settings', 'defaults'), { dayA: defaultA, dayB: defaultB, updatedAt: new Date().toISOString() });
      alert("Default schedule saved successfully!");
    } catch (error) { console.error("Error saving settings:", error); }
    setSavingSettings(false);
  };

  const handleAddException = async (e) => {
    e.preventDefault();
    if (!exceptionDate) return;

    const payload = { date: exceptionDate, type: exceptionType, createdAt: new Date().toISOString() };
    if (exceptionType === 'custom') payload.blocks = [{ start: customStart, end: customEnd }];

    try {
      const docRef = await addDoc(collection(db, 'scheduler_overrides'), payload);
      const docId = getAcademicYearDocId(exceptionDate);
      const configSnap = await getDoc(doc(db, 'config', docId));
      let cycle = null;
      if (configSnap.exists()) {
        const dayRecord = (configSnap.data().map || []).find(d => d.fecha === exceptionDate);
        if (dayRecord && dayRecord.ciclo) cycle = dayRecord.ciclo;
      }
      const newExceptionList = [...exceptions, { id: docRef.id, dayCycle: cycle, ...payload }];
      setExceptions(newExceptionList.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setExceptionDate('');
    } catch (error) { console.error("Error adding exception:", error); }
  };

  const handleDeleteException = async (id) => {
    try {
      await deleteDoc(doc(db, 'scheduler_overrides', id));
      setExceptions(exceptions.filter(e => e.id !== id));
    } catch (error) { console.error("Error deleting exception:", error); }
  };

  const handleCancelBooking = async (id) => {
    if (window.confirm("Are you sure you want to cancel this meeting? (This will permanently delete the slot)")) {
      try {
        await deleteDoc(doc(db, 'bookings', id));
        setBookings(bookings.filter(b => b.id !== id));
      } catch (error) { console.error("Error deleting booking:", error); }
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200 font-sans">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-3xl font-black text-slate-800">Scheduler Admin</h2>
        
        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'bookings' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            Upcoming Meetings
          </button>
          <button onClick={() => setActiveTab('roster')} className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'roster' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            Roster & Tags
          </button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            Default Patterns
          </button>
          <button onClick={() => setActiveTab('exceptions')} className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'exceptions' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            Daily Overrides
          </button>
        </div>
      </div>

      {/* --- TAB 0: BOOKINGS (NEW) --- */}
      {activeTab === 'bookings' && (
        <div>
          <p className="text-slate-500 mb-6 font-bold">Review and manage your upcoming student meetings.</p>
          {loadingBookings ? (
            <div className="text-center text-blue-600 font-bold animate-pulse py-10">Loading Calendar...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center text-slate-400 py-10 font-bold border-2 border-dashed border-slate-300 rounded-lg">No meetings booked yet. 📅</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bookings.map(booking => (
                <div key={booking.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between hover:border-amber-400 transition-colors">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="font-black text-xl text-slate-800">{booking.date}</span>
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-widest">{booking.timeString}</span>
                      {booking.dayCycle && <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-full uppercase tracking-widest">DÍA {booking.dayCycle}</span>}
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest">{booking.meetingType}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-sm">
                      <p className="font-bold text-slate-700">Student: <span className="font-normal text-slate-600">{booking.studentEmail}</span></p>
                      <p className="font-bold text-slate-700">Block: <span className="font-normal text-slate-600">{booking.blockLabel}</span></p>
                    </div>

                    {booking.notes && (
                      <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-lg">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">📝 Notes from Student:</p>
                        <p className="text-sm font-bold text-slate-800">{booking.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-start justify-end">
                    <button 
                      onClick={() => handleCancelBooking(booking.id)} 
                      className="text-xs font-bold text-red-500 hover:text-white border border-red-200 hover:bg-red-500 px-4 py-2 rounded transition-colors"
                    >
                      CANCEL MEETING ✖
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 1: ROSTER --- */}
      {activeTab === 'roster' && (
        <div>
          <p className="text-slate-500 mb-6 font-bold">Assign meeting tags and class cohorts to registered users.</p>
          {loadingStudents ? (
            <div className="text-center text-blue-600 font-bold animate-pulse py-10">Loading Roster...</div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-200 text-slate-600 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-4 font-black">Student Email</th>
                    <th className="p-4 font-black">Role</th>
                    <th className="p-4 font-black">Assigned Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-white transition-colors">
                      <td className="p-4 font-bold text-slate-800">{student.email}</td>
                      <td className="p-4"><span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full uppercase tracking-widest">{student.role}</span></td>
                      <td className="p-4 flex flex-wrap gap-2">
                        {AVAILABLE_TAGS.map(tag => {
                          const hasTag = student.tags && student.tags.includes(tag);
                          return (
                            <button key={tag} onClick={() => toggleTag(student.id, student.tags, tag)}
                              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${hasTag ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}>
                              {hasTag ? `✓ ${tag}` : `+ ${tag}`}
                            </button>
                          );
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: DEFAULT PATTERNS --- */}
      {activeTab === 'settings' && (
        // ... Code remains identical for Settings
        <div>
          <p className="text-slate-500 mb-6 font-bold">Set your standard availability. This is what the calendar uses unless a daily override is active.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
              <h3 className="font-black text-indigo-800 mb-4 text-lg">Day A Default Blocks</h3>
              {defaultA.map((block, index) => (
                <div key={index} className="flex gap-4 mb-3 items-center bg-white p-3 rounded border border-indigo-100">
                  <input type="time" value={block.start} onChange={(e) => { const newA = [...defaultA]; newA[index].start = e.target.value; setDefaultA(newA); }} className="border p-2 rounded font-bold" />
                  <span className="font-bold text-slate-400">to</span>
                  <input type="time" value={block.end} onChange={(e) => { const newA = [...defaultA]; newA[index].end = e.target.value; setDefaultA(newA); }} className="border p-2 rounded font-bold" />
                </div>
              ))}
              <button onClick={() => setDefaultA([...defaultA, { start: '12:00', end: '13:00' }])} className="text-sm font-bold text-indigo-600 mt-2">+ Add Time Block</button>
            </div>

            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
              <h3 className="font-black text-emerald-800 mb-4 text-lg">Day B Default Blocks</h3>
              {defaultB.map((block, index) => (
                <div key={index} className="flex gap-4 mb-3 items-center bg-white p-3 rounded border border-emerald-100">
                  <input type="time" value={block.start} onChange={(e) => { const newB = [...defaultB]; newB[index].start = e.target.value; setDefaultB(newB); }} className="border p-2 rounded font-bold" />
                  <span className="font-bold text-slate-400">to</span>
                  <input type="time" value={block.end} onChange={(e) => { const newB = [...defaultB]; newB[index].end = e.target.value; setDefaultB(newB); }} className="border p-2 rounded font-bold" />
                </div>
              ))}
              <button onClick={() => setDefaultB([...defaultB, { start: '12:00', end: '13:00' }])} className="text-sm font-bold text-emerald-600 mt-2">+ Add Time Block</button>
            </div>
          </div>
          <button onClick={handleSaveSettings} disabled={savingSettings} className="mt-8 bg-indigo-600 text-white font-black py-3 px-8 rounded-lg shadow-md hover:bg-indigo-700 transition-colors w-full md:w-auto">
            {savingSettings ? "Saving..." : "Save Master Defaults to Database"}
          </button>
        </div>
      )}

      {/* --- TAB 3: DAILY OVERRIDES --- */}
      {activeTab === 'exceptions' && (
        // ... Code remains identical for Exceptions
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 bg-red-50 p-6 rounded-xl border border-red-200 h-fit">
            <h3 className="font-black text-red-800 mb-4 text-lg">Add Daily Override</h3>
            <form onSubmit={handleAddException} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-red-700 uppercase tracking-widest mb-1">Select Date</label>
                <input type="date" required value={exceptionDate} onChange={(e) => setExceptionDate(e.target.value)} className="w-full p-2 rounded border border-red-300 font-bold text-slate-700 outline-none focus:border-red-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-red-700 uppercase tracking-widest mb-1">Override Type</label>
                <select value={exceptionType} onChange={(e) => setExceptionType(e.target.value)} className="w-full p-2 rounded border border-red-300 font-bold text-slate-700 outline-none focus:border-red-600 bg-white">
                  <option value="blackout">Full Day Blackout (No Meetings)</option>
                  <option value="custom">Custom Hours (Ignore Defaults)</option>
                </select>
              </div>
              {exceptionType === 'custom' && (
                <div className="bg-white p-3 rounded border border-red-200">
                  <label className="block text-xs font-bold text-red-700 uppercase tracking-widest mb-2">Available Window</label>
                  <div className="flex items-center gap-2">
                    <input type="time" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border p-1 rounded font-bold w-full" />
                    <span className="font-bold text-slate-400">to</span>
                    <input type="time" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border p-1 rounded font-bold w-full" />
                  </div>
                </div>
              )}
              <button type="submit" className="mt-2 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition-colors">
                Save Override 🗓️
              </button>
            </form>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-black text-slate-800 mb-4 text-lg">Active Overrides</h3>
            {exceptions.length === 0 ? (
              <div className="text-center text-slate-400 py-10 font-bold border-2 border-dashed border-slate-300 rounded-lg">No daily overrides scheduled.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {exceptions.map(exc => (
                  <div key={exc.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center">
                      <span className="font-black text-slate-800 mr-3">{exc.date}</span>
                      {exc.dayCycle && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mr-4 ${exc.dayCycle === 'A' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          DÍA {exc.dayCycle}
                        </span>
                      )}
                      {exc.type === 'blackout' ? (
                        <span className="text-xs font-bold text-white bg-slate-800 px-3 py-1 rounded uppercase tracking-widest">Blackout</span>
                      ) : (
                        <span className="text-xs font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded uppercase tracking-widest">
                          Custom: {exc.blocks[0].start} - {exc.blocks[0].end}
                        </span>
                      )}
                    </div>
                    <button onClick={() => handleDeleteException(exc.id)} className="text-slate-400 hover:text-red-600 font-bold text-sm">REMOVE ✖</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScheduler;