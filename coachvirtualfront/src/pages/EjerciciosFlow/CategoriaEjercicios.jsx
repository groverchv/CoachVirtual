import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Heart, Activity, Loader2 } from 'lucide-react';
import TipoService from '../../services/TipoService';

/**
 * Vista inicial: Selección de categoría de ejercicios
 * Las categorías se cargan dinámicamente desde el backend usando TipoService
 */
export default function CategoriaEjercicios() {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mapeo de iconos por nombre de categoría (puedes extender esto según necesites)
  const iconMapping = {
    'gimnasio': Dumbbell,
    'fisioterapia': Heart,
    'default': Activity
  };

  // Colores predefinidos para las categorías (se asignan cíclicamente)
  const colorOptions = [
    { bg: 'bg-blue-500 hover:bg-blue-600', icon: 'text-blue-500' },
    { bg: 'bg-green-500 hover:bg-green-600', icon: 'text-green-500' },
    { bg: 'bg-purple-500 hover:bg-purple-600', icon: 'text-purple-500' },
    { bg: 'bg-orange-500 hover:bg-orange-600', icon: 'text-orange-500' },
    { bg: 'bg-red-500 hover:bg-red-600', icon: 'text-red-500' },
    { bg: 'bg-indigo-500 hover:bg-indigo-600', icon: 'text-indigo-500' }
  ];

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      setError(null);
      // Obtener solo los tipos activos
      const tipos = await TipoService.listActivos();

      // Transformar los tipos del backend al formato de categorías
      const categoriasFormateadas = tipos.map((tipo, index) => {
        const nombreLower = tipo.nombre.toLowerCase();
        const icon = iconMapping[nombreLower] || iconMapping['default'];
        const colors = colorOptions[index % colorOptions.length];

        return {
          id: tipo.id,
          nombre: tipo.nombre,
          descripcion: tipo.descripcion || `Ejercicios de ${tipo.nombre}`,
          icon: icon,
          color: colors.bg,
          iconColor: colors.icon
        };
      });

      setCategorias(categoriasFormateadas);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
      setError('No se pudieron cargar las categorías. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategoria = (categoriaId) => {
    navigate(`/ejercicios/parte-cuerpo?categoria=${categoriaId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Categoría de Ejercicios
          </h1>
          <p className="text-gray-600 text-lg">
            Selecciona la categoría que deseas explorar
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
              onClick={fetchCategorias}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && categorias.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 text-center">
            <p className="text-yellow-700">
              No hay categorías disponibles en este momento.
            </p>
          </div>
        )}

        {/* Cards de categorías */}
        {!loading && !error && categorias.length > 0 && (
          <div className="grid md:grid-cols-2 gap-8">
            {categorias.map((categoria) => {
              const Icon = categoria.icon;
              return (
                <button
                  key={categoria.id}
                  onClick={() => handleSelectCategoria(categoria.id)}
                  className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-8 text-left overflow-hidden"
                >
                  {/* Background pattern */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-100 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />

                  {/* Content */}
                  <div className="relative z-10">
                    <div className={`inline-flex p-4 rounded-xl bg-gray-50 mb-6 ${categoria.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-12 h-12" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                      {categoria.nombre}
                    </h2>

                    <p className="text-gray-600 leading-relaxed">
                      {categoria.descripcion}
                    </p>

                    {/* Arrow indicator */}
                    <div className="mt-6 flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                      <span>Seleccionar</span>
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
            💡 Tip: Selecciona la categoría según tu objetivo de entrenamiento
          </p>
        </div>
      </div>
    </div>
  );
}
