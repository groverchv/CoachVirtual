// src/pages/GestionarEjercicio_Asignacion/Ejercicio_AsignadoUsuario.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EjercicioAsignadoService from "../../services/Ejercicio_AsignadoService";
import DetalleMusculoService from "../../services/DetalleMusculoService";
import MusculoService from "../../services/MusculoService";
import EjercicioService from "../../services/EjercicioService";
import { useCategory } from "../../context/CategoryContext";

const Ejercicio_AsignadoUsuario = () => {
  const [asignados, setAsignados] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [musculos, setMusculos] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorList, setErrorList] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const { selectedDetalleIds } = useCategory();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setErrorList(null);

      const [asignadosData, detallesData, musculosData, ejerciciosData] =
        await Promise.all([
          EjercicioAsignadoService.getAll(),
          DetalleMusculoService.getAll(),
          MusculoService.getAll(),
          EjercicioService.getAll(),
        ]);

      setAsignados(Array.isArray(asignadosData) ? asignadosData : []);
      setDetalles(Array.isArray(detallesData) ? detallesData : []);
      setMusculos(Array.isArray(musculosData) ? musculosData : []);
      setEjercicios(Array.isArray(ejerciciosData) ? ejerciciosData : []);
    } catch (err) {
      console.error(err);
      setErrorList(err.message || "Error al cargar los ejercicios asignados");
      setAsignados([]);
      setDetalles([]);
      setMusculos([]);
      setEjercicios([]);
    } finally {
      setLoading(false);
    }
  };

  const findDetalle = (idDetalle) => {
    const numId = Number(idDetalle);
    return detalles.find((d) => Number(d.id) === numId);
  };

  const findMusculo = (idMusculo) => {
    const numId = Number(idMusculo);
    return musculos.find((m) => Number(m.id) === numId);
  };

  const findEjercicio = (idEjercicio) => {
    const numId = Number(idEjercicio);
    return ejercicios.find((e) => Number(e.id) === numId);
  };

  const visibleAsignados =
    selectedDetalleIds.length > 0
      ? asignados.filter((a) =>
          selectedDetalleIds.includes(Number(a.idDetalleMusculo))
        )
      : asignados;

  const handleGoDetector = () => {
    navigate("/pose-test");
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <section className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 max-w-6xl w-full border border-white/20 text-white">
        {/* Botón volver */}
        <div className="mb-4 flex justify-start">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-sm text-white font-semibold transition"
          >
            ← Volver
          </button>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2 text-center">
          Ejercicios Seleccionados
        </h1>
        <p className="text-center text-white/70 mb-8 text-sm md:text-base">
          Estos son los ejercicios que vamos a realizar el dia de hoy, revisa las serie y repeticiones.
        </p>

        {loading && (
          <div className="text-center py-8">
            <p className="text-white/60">Cargando ejercicios asignados...</p>
          </div>
        )}

        {!loading && errorList && (
          <div className="text-center py-6 mb-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-100 text-sm">
            {errorList}
          </div>
        )}

        {!loading && !errorList && visibleAsignados.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/60">
              No tienes ejercicios asignados para los detalles seleccionados.
            </p>
          </div>
        )}

        {!loading && !errorList && visibleAsignados.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleAsignados.map((item) => {
                const detalle = findDetalle(item.idDetalleMusculo);
                const musculo = detalle ? findMusculo(detalle.idMusculo) : null;
                const ejercicio = detalle
                  ? findEjercicio(detalle.idEjercicio)
                  : null;

                const titulo = ejercicio ? ejercicio.nombre : "Ejercicio asignado";
                const imgUrl = ejercicio?.url || null;

                return (
                  <article
                    key={item.id}
                    className="bg-white/10 border border-white/20 rounded-2xl p-4 md:p-5 shadow-lg hover:bg-white/20 transition-all"
                  >
                    {imgUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImage({ url: imgUrl, title: titulo })
                        }
                        className="mb-3 rounded-xl overflow-hidden border border-white/20 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 bg-black/40"
                      >
                        <img
                          src={imgUrl}
                          alt={titulo}
                          className="w-full h-44 object-contain hover:scale-[1.02] transition-transform"
                        />
                      </button>
                    )}

                    <h3 className="font-semibold text-lg mb-3">{titulo}</h3>

                    <div className="space-y-1 text-sm text-white/80">
                      <p>
                        <span className="font-semibold text-white">
                          Músculo:
                        </span>{" "}
                        {musculo ? musculo.nombre : detalle?.idMusculo}
                      </p>

                      {detalle && (
                        <p>
                          <span className="font-semibold text-white">
                            Activación:
                          </span>{" "}
                          {detalle.porcentaje}
                        </p>
                      )}

                      <p className="mt-2">
                        <span className="font-semibold text-white">
                          Series x reps:
                        </span>{" "}
                        {item.series} x {item.repeticiones}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleGoDetector}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
              >
                Ir al detector IA
              </button>
            </div>
          </>
        )}

        <footer className="mt-10 text-white/40 text-xs text-center">
          Coach Virtual &copy; {new Date().getFullYear()}
        </footer>
      </section>

      {/* Modal de imagen grande */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg hover:bg-gray-200"
            >
              ✕
            </button>

            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/30 bg-black"
            />

            <p className="mt-3 text-center text-white/80 text-sm">
              {selectedImage.title}
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default Ejercicio_AsignadoUsuario;
