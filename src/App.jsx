import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'; // 👈 1. Added Router imports
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Login from './Login';
import Dashboard from './Dashboard';
import ActivityPage from './components/ActivityPage'; // 👈 2. Imported the new page
import SenordlePage from './pages/SenordlePage';
import RecreoHub from './pages/RecreoHub';
import TicoTalk from './pages/TicoTalk';
import AtandoCabosPage from './pages/AtandoCabosPage';
import EslabonesFinales from './pages/EslabonesFinales';
import CulturaSandbox from './pages/CulturaSandbox';
import MusicUploader from './admin/MusicUploader';
import MusicPage from './pages/MusicPage';
import VocabUploader from './admin/VocabUploader';
import VerbUploader from './admin/VerbUploader';
import CulturaUploader from './admin/CulturaUploader';
import TieredCulturaUploader from './admin/TieredCulturaUploader';
import DestacadoUploader from './admin/DestacadoUploader';
import MasterDashboard from './admin/MasterDashboard/MasterDashboard';
import SenordleUploader from './admin/SenordleUploader';
import AtandoCabosUploader from './admin/AtandoCabosUploader';
import EslabonesUploader from './admin/EslabonesUploader';
import VerbVault from './admin/MasterDashboard/components/VerbVault';
import VocabVault from './admin/MasterDashboard/components/VocabVault';
import TareasDashboard from './admin/MasterDashboard/components/TareasDashboard';
import AdminScheduler from './admin/AdminScheduler';
import Scheduler from './Scheduler';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); 
      setLoading(false);    
    });
    return () => unsubscribe(); 
  }, []);

  // 3. Loading Guard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <h2 className="text-xl font-bold animate-pulse text-slate-400 uppercase tracking-widest">
          Cargando el Gimnasio...
        </h2>
      </div>
    );
  }

 // 4. Security Guard: If no user, show Login
 if (!user) {
  // Peek at the URL to see if they are trying to reach the scheduler
  const isSchedulerRoute = window.location.pathname.includes('/scheduler');
  
  // Pass that true/false flag into your Login component
  return <Login isEnglish={isSchedulerRoute} />;
}

  // 5. Main Content: Only runs if user is logged in
  // 🚀 Wrap the return in <BrowserRouter>
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        
       {/* Global Header: Stays at the top on every page */}
       <header className="w-full max-w-6xl mx-auto flex justify-between items-center px-4 sm:px-6 pt-6 pb-4 border-b border-slate-200 mb-4">
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter hover:text-blue-600 transition-colors">
            <Link to="/">ESPAÑOL CON SEÑOR</Link>
          </h1>
          <div className="flex items-center gap-6">
            {/* New Scheduler Navigation Link */}
            <Link to="/scheduler" className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full">
              Book Meeting 📅
            </Link>
            <div className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              SESIÓN: {user.email}
            </div>
          </div>
        </header>

        <main className="w-full flex-grow">
          <Routes>
            {/* 🏠 Main Dashboard */}
            <Route path="/" element={<Dashboard user={user} />} />
            
            {/* 📅 The English Scheduler */}
            <Route path="/scheduler" element={<Scheduler />} />
            
            {/* 🕹️ Game & Activity Routes */}
            <Route path="/juegos/senordle" element={<SenordlePage />} /> 
            <Route path="/actividad/:type/:id" element={<ActivityPage />} />
            <Route path="/recreo" element={<RecreoHub />} />
            <Route path="/recreo/ticotalk" element={<TicoTalk />} />
            <Route path="/juegos/atandocabos" element={<AtandoCabosPage />} />
            <Route path="/juegos/eslabones" element={<EslabonesFinales />} />
            <Route path="/musica/:id" element={<MusicPage />} />
            <Route path="/test-firebase" element={<CulturaSandbox />} />

            {/* 🔐 Admin Secret Portals */}
            <Route path="/admin-secret-portal" element={<MusicUploader />} />
            <Route path="/admin-secret-portal-vocab" element={<VocabUploader />} />
            <Route path="/admin-secret-portal-verb" element={<VerbUploader />} />
            <Route path="/admin-secret-portal-cultura" element={<CulturaUploader />} />
            <Route path="/admin-secret-portal-tieredcultura" element={<TieredCulturaUploader />} />
            <Route path="/admin-secret-portal-destacado" element={<DestacadoUploader />} />
            <Route path="/admin-secret-portal-master" element={<MasterDashboard />} />
            <Route path="/admin-secret-portal-senordle" element={<SenordleUploader />} />
            <Route path="/admin-secret-portal-atando" element={<AtandoCabosUploader />} />
            <Route path="/admin-secret-portal-eslabon" element={<EslabonesUploader />} />
            <Route path="/admin-secret-portal-verbvault" element={<VerbVault />} />
            <Route path="/admin-secret-portal-vocabvault" element={<VocabVault />} />
            <Route path="/admin-secret-portal-tareas" element={<TareasDashboard />} />
            <Route path="/admin-secret-portal-scheduler" element={<AdminScheduler />} />
            
          </Routes>
        </main>
        
      </div>
    </BrowserRouter>
  );
}

export default App;
