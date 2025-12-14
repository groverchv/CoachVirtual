import React, { useEffect, useState } from "react";
import { AlertaService } from "../../services/AlertaService";
import api from "../../api/api";
import { useAuth } from "../../auth/useAuth";

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
    const sorted = [...(arr || [])].sort((a, b) => {
      const da = new Date(a.created_at).getTime() || 0;
      const db = new Date(b.created_at).getTime() || 0;
      if (db !== da) return db - da; // más recientes primero
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
      } catch {}

      let fetched = null;
      for (const url of candidateUrls(uid)) {
        try {
          const { data } = await api.get(url);
          if (Array.isArray(data)) {
            fetched = data;
            break;
          }
        } catch {}
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
    load(); /* eslint-disable-next-line */
  }, [uid]);

  if (!uid) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
        <p className="text-white/80">Cargando tu sesión…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
      <div className="max-w-5xl mx-auto mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis alertas</h1>
          <p className="text-white/70 text-sm">Viendo tus notificaciones.</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15"
        >
          Recargar
        </button>
      </div>

      <section className="max-w-5xl mx-auto bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur">
        {loading ? (
          <p className="text-white/80">Cargando…</p>
        ) : err ? (
          <div className="p-3 rounded-xl bg-yellow-500/20 border border-yellow-400 text-yellow-100 text-sm">
            {err}
          </div>
        ) : items.length === 0 ? (
          <p className="text-white/80">No hay alertas para mostrar.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {items.map((a) => (
              <li key={a.id} className="py-3">
                <div className="text-white font-medium">{a.mensaje}</div>
                <div className="text-white/60 text-sm">
                  Recibida: {fmtDateTime(a.created_at)}
                  {a.fecha ? ` · Límite: ${fmtDateTime(a.fecha)}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
