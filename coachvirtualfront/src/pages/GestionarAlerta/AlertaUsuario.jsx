import React, { useEffect, useState } from "react";
import { AlertaService } from "../../services/AlertaService";
import NotificationService from "../../services/NotificationService";
import api from "../../api/api";
import { useAuth } from "../../auth/useAuth";
import { Bell, RefreshCw, Clock, AlertCircle, Inbox } from 'lucide-react';

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
};
const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

// Limpiar emojis del mensaje para mostrar solo texto
const cleanMessage = (msg) => {
  if (!msg) return "";
  // Remover emojis comunes
  return msg.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
};

const candidateUrls = (uid) => [
  "/mis-alertas/",
  `/alertas/?usuario=${uid}`,
  "/alertas/?mine=1",
];

export default function AlertaUsuario() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const uid = user?.id;

  const setSorted = (arr) => {
    // Filtrar solo alertas no leídas
    const unread = (arr || []).filter(a => !a.leida);
    const sorted = [...unread].sort((a, b) => {
      const da = new Date(a.created_at).getTime() || 0;
      const db = new Date(b.created_at).getTime() || 0;
      if (db !== da) return db - da;
      return (b.id || 0) - (a.id || 0);
    });
    setItems(sorted);
  };

  const load = async () => {
    if (!uid) return;
    setLoading(true);
    setErr(null);
    try {
      try {
        const mine = await AlertaService.listMine();
        if (Array.isArray(mine)) {
          setSorted(mine);
          setLoading(false);
          return;
        }
      } catch { }

      let fetched = null;
      for (const url of candidateUrls(uid)) {
        try {
          const { data } = await api.get(url);
          if (Array.isArray(data)) {
            fetched = data;
            break;
          }
        } catch { }
      }
      if (!fetched) {
        const all = await AlertaService.list();
        fetched = (all || []).filter((a) => {
          const id = typeof a.usuario === "object" ? a.usuario?.id : a.usuario;
          return String(id) === String(uid);
        });
      }
      setSorted(fetched);
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
        e?.message ||
        "No se pudieron cargar tus alertas."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Marcar todas como leídas al entrar a la página
    NotificationService.markAllAsRead();
  }, [uid]);

  if (!uid) {
    return (
      <main className="min-h-screen p-6 bg-slate-950">
        <p className="text-slate-400">Cargando tu sesión…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-slate-950">
      <div className="max-w-4xl mx-auto mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <Bell className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Mis Notificaciones</h1>
            <p className="text-slate-500 text-sm">Notificaciones sin leer.</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Recargar
        </button>
      </div>

      <section className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 flex items-center gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Cargando alertas...
          </div>
        ) : err ? (
          <div className="p-4 flex items-center gap-3 bg-amber-950/50 border-b border-amber-900/50 text-amber-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{err}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p>No hay alertas para mostrar.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {items.map((a) => (
              <li key={a.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                <p className="text-slate-200 font-medium">{cleanMessage(a.mensaje)}</p>
                <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {fmtDateTime(a.created_at)}
                  </span>
                  {a.fecha && (
                    <span className="text-slate-600">
                      Límite: {fmtDateTime(a.fecha)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
