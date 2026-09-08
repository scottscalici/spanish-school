import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AdminScheduler from './admin/AdminScheduler';
import Scheduler from './Scheduler';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        
        {/* Global Header */}
        <header className="w-full max-w-6xl mx-auto flex justify-between items-center px-4 sm:px-6 pt-6 pb-4 border-b border-slate-200 mb-4">
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter hover:text-blue-600 transition-colors">
            <Link to="/">MEETING SCHEDULER</Link>
          </h1>
        </header>

        <main className="w-full flex-grow">
          <Routes>
            {/* 📅 The Main Scheduler Route */}
            <Route path="/" element={<Scheduler />} />
            
            {/* 🔐 Admin Secret Portal */}
            <Route path="/admin-secret-portal-scheduler" element={<AdminScheduler />} />
          </Routes>
        </main>
        
      </div>
    </BrowserRouter>
  );
}

export default App;