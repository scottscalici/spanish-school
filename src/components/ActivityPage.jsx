import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGymData } from '../hooks/useGymData';
import Eslabones from './Eslabones'; // 👈 Make sure this import is here!

const ActivityPage = () => {
  const { type, id } = useParams();
  const { data, loading } = useGymData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse font-bold text-slate-400 uppercase tracking-widest">
          Cargando Actividad...
        </div>
      </div>
    );
  }

  // Find the specific activity from the Brain's unified list
  const activityData = data?.activities?.find(act => String(act.id) === String(id));

  if (!activityData) {
    return (
      <div className="min-h-screen p-8 text-center bg-slate-50 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-black text-slate-800 mb-4">Actividad no encontrada</h2>
        <Link to="/" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-widest">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Universal Back Button */}
        <Link to="/" className="text-indigo-600 font-bold mb-8 inline-flex items-center gap-2 hover:text-indigo-800 transition-colors group">
          <span className="text-xl leading-none group-hover:-translate-x-1 transition-transform">←</span> 
          Volver al Dashboard
        </Link>

        {/* 🔀 THE TRAFFIC COP: Logic for different activity types */}
        
        {/* 1. If it's a Conversation */}
        {type === 'conversacion' && <ConversacionLayout activity={activityData} />}

        {/* 2. If it's the Eslabones Game */}
        {type === 'eslabones' && <Eslabones gameData={activityData.raw} />}

        {/* 3. Fallback for Videos, Music, etc. until we build their layouts */}
        {type !== 'conversacion' && type !== 'eslabones' && (
          <DefaultLayout activity={activityData} />
        )}

      </div>
    </div>
  );
};

// --- LAYOUT: CONVERSACIÓN ---
const ConversacionLayout = ({ activity }) => {
  const { raw } = activity;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
       <div className="md:flex border-b border-slate-100 bg-slate-50/50">
        <div className="md:w-1/3 shrink-0">
          <img src={activity.img} alt={activity.title} className="w-full h-48 md:h-full object-cover" />
        </div>
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">{activity.subtitle}</h4>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight">{activity.title}</h1>
        </div>
      </div>
      <div className="p-6 md:p-8">
        {/* Check for IB Style 3-Column questions */}
        {raw.preguntas && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['1', '2', '3'].map(lvl => raw.preguntas[lvl] && (
              <div key={lvl} className={`rounded-xl p-5 border ${lvl === '1' ? 'bg-emerald-50 border-emerald-100' : lvl === '2' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'}`}>
                 <h4 className="font-black uppercase text-[10px] tracking-widest mb-4 border-b border-slate-200 pb-2">Nivel {lvl}</h4>
                 <ul className="space-y-3">
                   {raw.preguntas[lvl].map((q, i) => <li key={i} className="text-sm font-medium leading-snug">{q}</li>)}
                 </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- LAYOUT: DEFAULT (Fallback) ---
const DefaultLayout = ({ activity }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
    <h1 className="text-3xl font-black text-slate-800 mb-2">{activity.title}</h1>
    <p className="text-slate-500 font-medium mb-8 text-lg">{activity.subtitle}</p>
    <div className="bg-slate-100 p-4 rounded-lg font-mono text-xs overflow-auto">
      <p className="font-bold text-slate-400 uppercase mb-2">Diseño en construcción para tipo: {activity.type}</p>
      <pre>{JSON.stringify(activity.raw, null, 2)}</pre>
    </div>
  </div>
);

export default ActivityPage;