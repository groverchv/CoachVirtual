import React, { useEffect, useState } from 'react';
import { getGoogleFitStats, startStatsPolling } from '../services/Dispositivo';

function Dispositivo() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 0) Carga inmediata desde localStorage para percibir velocidad
    try {
      const cached = localStorage.getItem('gv_stats');
      const cachedAt = localStorage.getItem('gv_updated');
      if (cached) {
        setStats(JSON.parse(cached));
        if (cachedAt) setUpdatedAt(new Date(parseInt(cachedAt, 10)).toLocaleTimeString());
      }
    } catch {}

    // 1) Primer fetch activo y luego polling cada 7s
    const apply = (data) => {
      setStats(data);
      const now = Date.now();
      setUpdatedAt(new Date(now).toLocaleTimeString());
      try {
        localStorage.setItem('gv_stats', JSON.stringify(data));
        localStorage.setItem('gv_updated', String(now));
      } catch {}
    };
    const onErr = (e) => setError('No se pudo cargar datos');

    // Disparo inicial
    (async () => {
      try {
        const d = await getGoogleFitStats();
        apply(d);
      } catch { /* silencioso, el polling cubrirá */ }
    })();

    // Polling contínuo (7s)
    let stop = startStatsPolling(apply, onErr, 7000);
    return () => stop && stop();
  }, []);

  const refreshNow = async () => {
    setBusy(true);
    try {
      const d = await getGoogleFitStats();
      const now = Date.now();
      setStats(d);
      setUpdatedAt(new Date(now).toLocaleTimeString());
      localStorage.setItem('gv_stats', JSON.stringify(d));
      localStorage.setItem('gv_updated', String(now));
    } catch {
      setError('No se pudo cargar datos');
    }
    setBusy(false);
  };

  const goal = 10000;
  const pct = Math.min(100, Math.round(((stats?.steps || 0) / goal) * 100));

  return (
    <div className="fixed top-24 right-4 w-80 bg-gradient-to-br from-white/90 to-blue-50/70 backdrop-blur rounded-2xl shadow-xl border border-white/60 p-4 z-50 ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-700">Tiempo real</h2>
        <button
          onClick={refreshNow}
          disabled={busy}
          className={`text-xs px-2 py-1 rounded-md border transition ${busy ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/60'} border-slate-300 text-slate-700`}
          title="Actualizar ahora"
        >{busy ? '...' : 'Actualizar'}</button>
      </div>

      {error && <div className="text-red-600 text-xs mb-2">{error}</div>}

      {stats ? (
        <div className="space-y-3">
          {/* Pasos */}
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-slate-600">Pasos</span>
              <span className="text-sm font-semibold text-slate-800">{stats.steps?.toLocaleString?.() || stats.steps}</span>
            </div>
            <div className="mt-1 h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
              <div className="h-2 bg-blue-500 rounded-full transition-all duration-500" style={{ width: pct + '%' }} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-0.5">
              <span>Meta {goal.toLocaleString()}</span>
              <span>{pct}%</span>
            </div>
          </div>

          {/* Calorías */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-600">Calorías</span>
            <span className="text-sm font-semibold text-orange-600">{stats.calories?.toLocaleString?.() || stats.calories}</span>
          </div>

          {/* Frecuencia */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-600">Frecuencia</span>
            <span className="text-sm font-semibold text-rose-600">{stats.heartRate} bpm</span>
          </div>

         
        </div>
      ) : (
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-slate-200 rounded w-24" />
          <div className="h-2 bg-slate-200 rounded" />
          <div className="h-2 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-20 mt-3" />
        </div>
      )}
    </div>
  );
}

export default Dispositivo;
