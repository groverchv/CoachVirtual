// src/view/ejercicios/ParteCuerpo.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Activity,
  Footprints,
  Zap,
  Brain,
  Loader2,
} from "lucide-react";
import MusculoService from "../../services/MusculoService";
import TipoService from "../../services/TipoService";

/**
 * Vista de selección de parte del cuerpo
 * - Trae TODOS los músculos
 * - Filtra en frontend por la categoría seleccionada (?categoria=id)
 */
export default function ParteCuerpo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoria = searchParams.get("categoria");

  const [selectedCategoria, setSelectedCategoria] = useState("");
  const [partesCuerpo, setPartesCuerpo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mapeo de iconos por nombre de músculo (puedes extender esto)
  const iconMapping = {
    brazos: Activity,
    piernas: Footprints,
    espalda: User,
    cintura: Zap,
    cabeza: Brain,
    default: Activity,
  };

  // Colores predefinidos para las partes del cuerpo (cíclico)
  const colorOptions = [
    "from-red-400 to-red-600",
    "from-yellow-400 to-yellow-600",
    "from-purple-400 to-purple-600",
    "from-blue-400 to-blue-600",
    "from-green-400 to-green-600",
    "from-pink-400 to-pink-600",
    "from-indigo-400 to-indigo-600",
    "from-orange-400 to-orange-600",
  ];

  const fetchPartesCuerpo = async () => {
    try {
      setLoading(true);
      setError(null);

      const categoriaId = parseInt(categoria, 10);

      // 1) Obtener el nombre de la categoría (solo para mostrar arriba)
      const tipos = await TipoService.getAll();
      const tipoActual = tipos.find((t) => t.id === categoriaId);
      if (tipoActual) {
        setSelectedCategoria(tipoActual.nombre);
      }

      // 2) Obtener TODOS los músculos
      const musculosAll = await MusculoService.getAll();

      // ✅ Helper para sacar el idTipo sin importar cómo venga
      const getTipoId = (m) => {
        // caso común: m.tipo es un número o string
        if (m.tipo !== undefined && m.tipo !== null) {
          return parseInt(m.tipo, 10);
        }
        // si te llega anidado como objeto {id, ...}
        if (m.tipo && typeof m.tipo === "object" && m.tipo.id) {
          return parseInt(m.tipo.id, 10);
        }
        // si te llega como tipo_data {id,...}
        if (m.tipo_data && m.tipo_data.id) {
          return parseInt(m.tipo_data.id, 10);
        }
        return null;
      };

      // 3) Filtrar por categoría en frontend
      const musculosFiltrados = musculosAll.filter(
        (m) => getTipoId(m) === categoriaId
      );

      // 4) Transformar al formato de tarjetas
      const partesFormateadas = musculosFiltrados.map((musculo, index) => {
        const nombreLower = musculo.nombre.toLowerCase();
        const icon = iconMapping[nombreLower] || iconMapping["default"];
        const color = colorOptions[index % colorOptions.length];

        return {
          id: musculo.id,
          nombre: musculo.nombre,
          descripcion: `Ejercicios de ${musculo.nombre}`,
          icon,
          color,
          url: musculo.url,
        };
      });

      setPartesCuerpo(partesFormateadas);
    } catch (err) {
      console.error("Error al cargar partes del cuerpo:", err);
      setError(
        "No se pudieron cargar las partes del cuerpo. Por favor, intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!categoria) {
      navigate("/ejercicios/categoria");
      return;
    }
    fetchPartesCuerpo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, navigate]);

  const handleSelectParte = (parteId) => {
    navigate(`/ejercicios/seleccion?categoria=${categoria}&parte=${parteId}`);
  };

  const handleBack = () => {
    navigate("/ejercicios/categoria");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="mb-8 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span className="font-medium">Volver a categorías</span>
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            {selectedCategoria || "Selecciona una categoría"}
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Selecciona la Parte del Cuerpo
          </h1>
          <p className="text-gray-600 text-lg">
            Elige la zona muscular que deseas trabajar
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchPartesCuerpo}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && partesCuerpo.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 text-center">
            <p className="text-yellow-700">
              No hay partes del cuerpo para esta categoría.
            </p>
          </div>
        )}

        {/* Grid de partes del cuerpo */}
        {!loading && !error && partesCuerpo.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {partesCuerpo.map((parte) => {
              const Icon = parte.icon;

              return (
                <button
                  key={parte.id}
                  onClick={() => handleSelectParte(parte.id)}
                  className="group text-left"
                >
                  <div className="relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                    {/* Imagen de cabecera */}
                    <div className="relative h-40 w-full overflow-hidden">
                      {parte.url ? (
                        <img
                          src={parte.url}
                          alt={parte.nombre}
                          loading="lazy"
                          className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${parte.color}`}
                        >
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                      )}

                      {/* Overlay para contraste */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                      {/* Nombre + icono sobre la imagen */}
                      <div className="absolute bottom-3 left-4 flex items-center gap-2">
                        <div className="inline-flex p-2 rounded-xl bg-white/15 border border-white/40 backdrop-blur">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white font-semibold text-lg drop-shadow">
                          {parte.nombre}
                        </span>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-5">
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        {parte.descripcion}
                      </p>

                      {/* Etiqueta categoría */}
                      {selectedCategoria && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 mb-3">
                          {selectedCategoria}
                        </span>
                      )}

                      {/* CTA */}
                      <div className="flex items-center text-blue-600 font-medium text-sm mt-1">
                        <span>Ver ejercicios</span>
                        <svg
                          className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            💪 Selecciona una zona para ver los ejercicios disponibles.
          </p>
        </div>
      </div>
    </div>
  );
}
