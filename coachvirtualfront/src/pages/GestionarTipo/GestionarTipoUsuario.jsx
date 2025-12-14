// src/pages/tipos/GestionarTipoUsuario.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategory } from "../../context/CategoryContext";
import TipoService from "../../services/TipoService";

export default function GestionarTipoUsuario() {
  const { chooseCategory } = useCategory();
  const navigate = useNavigate();

  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const pick = (tipo) => {
    // 👉 guardamos el tipo elegido en el contexto
    chooseCategory(tipo); // { id, nombre, estado, ... }

    // IMPORTANTE: sin { replace: true } para que el botón "Volver"
    // en MusculoUsuario pueda regresar a esta pantalla.
    navigate("/mis-musculos");
  };

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await TipoService.listActivos(); // o getAll()
      const sorted = [...(data || [])].sort(
        (a, b) => (b.id || 0) - (a.id || 0)
      );
      setTipos(sorted);
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          e?.message ||
          "No se pudieron cargar los tipos."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <p className="text-white/80">Cargando tipos…</p>;
  }

  if (err) {
    return (
      <div className="p-3 rounded-2xl bg-red-500/20 border border-red-400 text-red-100 text-sm mb-4">
        {err}
      </div>
    );
  }

  if (!tipos.length) {
    return (
      <p className="text-white/80">
        No hay tipos configurados. Pídele al administrador que registre algunos
        en el panel de Tipos.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tipos.map((tipo) => (
        <button
          key={tipo.id}
          onClick={() => pick(tipo)}
          className="bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/20 rounded-2xl p-6 text-left text-white transition-all shadow-lg hover:shadow-xl"
        >
          <h2 className="text-2xl font-semibold">{tipo.nombre}</h2>
          <p className="text-white/70 mt-2 text-sm">
            Tipo de rutina disponible.
          </p>
        </button>
      ))}
    </div>
  );
}
