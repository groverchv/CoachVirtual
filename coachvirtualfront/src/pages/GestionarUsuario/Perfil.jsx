import { useEffect, useMemo, useState } from "react";
import { fetchMyProfile, updateUser } from "../../services/UsuarioService";

// ========= Helpers =========
function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function labelGenero(v) {
  if (!v) return "";
  const s = String(v).trim().toUpperCase();
  if (s === "M" || s === "MASCULINO") return "Masculino";
  if (s === "F" || s === "FEMENINO") return "Femenino";
  return "Otro";
}

// ========= Componente =========
export default function Perfil() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // edición (solo 4 campos)
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    fecha_nacimiento: "",
    genero: "",
    altura: "",
    peso: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");

  // ======= CARGA PERFIL =======
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchMyProfile();
        if (mounted) setUser(data);
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Error al cargar el perfil."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ======= DERIVADOS PARA UI =======
  const ui = useMemo(() => {
    if (!user) return null;

    const email = user.email || "";

    const fechaNacimientoRaw = user.fecha_nacimiento || user.fechaNacimiento || "";
    const generoRaw = user.genero || "";
    const alturaRaw = user.altura ?? "";
    const pesoRaw = user.peso ?? "";

    const planActualRaw = user.plan_actual || "";
    const fechaPlanRaw = user.fecha_expiracion_plan || "";
    const tienePlanActivoRaw = !!user.tiene_plan_activo;
    const puedeEntrenarRaw = !!user.puede_entrenar;

    const avatar =
      user.avatar ||
      user.foto ||
      user.foto_perfil ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(email || "U")}`;

    return {
      id: user.id ?? user.pk ?? null,
      avatar,
      email: email || "—",
      fechaNacimiento: formatDate(fechaNacimientoRaw) || "—",
      genero: labelGenero(generoRaw) || "—",
      altura: alturaRaw ? `${alturaRaw} m` : "—",
      peso: pesoRaw ? `${pesoRaw} kg` : "—",

      // 👇 campos de plan / suscripción
      planActual: planActualRaw || "Sin plan",
      fechaExpiracionPlan: fechaPlanRaw ? formatDate(fechaPlanRaw) : "—",
      tienePlanActivo: tienePlanActivoRaw,
      puedeEntrenar: puedeEntrenarRaw,

      editable: {
        fecha_nacimiento: formatDate(fechaNacimientoRaw) || "",
        genero: typeof generoRaw === "string" ? generoRaw : "",
        altura: alturaRaw ?? "",
        peso: pesoRaw ?? "",
      },
    };
  }, [user]);

  // precargar formulario al entrar en edición
  useEffect(() => {
    if (isEditing && ui?.editable) {
      setForm({
        fecha_nacimiento: ui.editable.fecha_nacimiento || "",
        genero: ui.editable.genero || "",
        altura: ui.editable.altura ?? "",
        peso: ui.editable.peso ?? "",
      });
      setSaveError("");
      setSaveOk("");
    }
  }, [isEditing, ui]);

  // ======= GUARDAR (solo 4 campos) =======
  async function saveChanges(e) {
    e?.preventDefault?.();
    setSaving(true);
    setSaveError("");
    setSaveOk("");

    if (!ui?.id) {
      setSaveError("No se pudo determinar el ID del usuario.");
      setSaving(false);
      return;
    }

    const updates = {
      fecha_nacimiento: form.fecha_nacimiento || null,
      genero: form.genero || null,
      altura: (form.altura ?? "").toString().trim() || null,
      peso: (form.peso ?? "").toString().trim() || null,
      // no tocamos plan_actual ni fecha_expiracion_plan aquí
    };

    try {
      const data = await updateUser(ui.id, updates, {
        mergeWith: user,
        sanitize: true,
      });
      setUser(data);
      setSaveOk("¡Datos actualizados!");
      setIsEditing(false);
    } catch (err) {
      const msg =
        err?.response?.data
          ? Object.entries(err.response.data)
              .map(([k, v]) =>
                `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`
              )
              .join(" | ")
          : err?.message || "No se pudieron guardar los cambios.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ======= UI =======
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4 sm:p-6">
      <section className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-8 max-w-lg w-full text-center border border-white/20 animate-fade-in">
        {loading ? (
          <LoaderSkeleton />
        ) : error ? (
          <div className="text-red-200">
            <p className="font-semibold mb-4">Error al cargar el perfil</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        ) : ui ? (
          <>
            <div className="flex flex-col items-center mb-6">
              <img
                src={ui.avatar}
                alt="Avatar"
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg mb-4 object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://randomuser.me/api/portraits/lego/1.jpg";
                }}
              />
              <span className="text-white/70 text-sm break-all">{ui.email}</span>
            </div>

            {isEditing ? (
              <form
                onSubmit={saveChanges}
                className="grid grid-cols-1 gap-4 text-left mb-4"
              >
                {saveError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg">
                    {saveError}
                  </div>
                )}
                {saveOk && (
                  <div className="bg-green-100 border border-green-500 text-green-800 px-4 py-2 rounded-lg">
                    {saveOk}
                  </div>
                )}

                {/* Campos solo lectura (identidad / plan) */}
                <ReadOnlyRow label="Email" value={ui.email} />
                <ReadOnlyRow label="Plan actual" value={ui.planActual} />
                <ReadOnlyRow
                  label="Vence el"
                  value={ui.fechaExpiracionPlan}
                />
                <ReadOnlyRow
                  label="Plan activo"
                  value={ui.tienePlanActivo ? "Sí" : "No"}
                />
                <ReadOnlyRow
                  label="Puede entrenar"
                  value={ui.puedeEntrenar ? "Sí" : "No"}
                />

                {/* Campos editables */}
                <Input
                  label="Fecha de nacimiento"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(v) =>
                    setForm((s) => ({ ...s, fecha_nacimiento: v }))
                  }
                />

                <Select
                  label="Género"
                  value={form.genero || ""}
                  onChange={(v) => setForm((s) => ({ ...s, genero: v }))}
                  options={[
                    { value: "", label: "Seleccionar" },
                    { value: "Masculino", label: "Masculino" },
                    { value: "Femenino", label: "Femenino" },
                    { value: "Otro", label: "Otro / Prefiero no decir" },
                    { value: "M", label: "M (compat.)" },
                    { value: "F", label: "F (compat.)" },
                  ]}
                />

                <Input
                  label="Altura (m)"
                  type="text"
                  value={String(form.altura ?? "")}
                  onChange={(v) =>
                    setForm((s) => ({ ...s, altura: v }))
                  }
                  placeholder="Ej: 1.75"
                />
                <Input
                  label="Peso (kg)"
                  type="text"
                  value={String(form.peso ?? "")}
                  onChange={(v) =>
                    setForm((s) => ({ ...s, peso: v }))
                  }
                  placeholder="Ej: 70.5"
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition w-full sm:w-auto"
                    onClick={() => {
                      setIsEditing(false);
                      setSaveError("");
                      setSaveOk("");
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg transition w-full sm:w-auto"
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 text-left mb-6">
                  <Row label="Email" value={ui.email} />
                  <Row label="Fecha de nacimiento" value={ui.fechaNacimiento} />
                  <Row label="Género" value={ui.genero} />
                  <Row label="Altura" value={ui.altura} />
                  <Row label="Peso" value={ui.peso} />
                  <Row label="Plan actual" value={ui.planActual} />
                  <Row label="Vence el" value={ui.fechaExpiracionPlan} />
                  <Row
                    label="Plan activo"
                    value={ui.tienePlanActivo ? "Sí" : "No"}
                  />
                  <Row
                    label="Puede entrenar"
                    value={ui.puedeEntrenar ? "Sí" : "No"}
                  />
                </div>

                <button
                  className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-8 rounded-full transition-all duration-300 shadow-lg hover:scale-105"
                  onClick={() => setIsEditing(true)}
                >
                  Editar Perfil
                </button>
              </>
            )}
          </>
        ) : (
          <p className="text-white/80">
            No se encontró información del usuario.
          </p>
        )}
      </section>
    </main>
  );
}

// ======= Subcomponentes UI =======
function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-white/10 rounded-lg px-4 py-3">
      <span className="text-white/70 font-medium">{label}:</span>
      <span className="font-semibold text-white">{value ?? "—"}</span>
    </div>
  );
}

function ReadOnlyRow({ label, value }) {
  return (
    <label className="block">
      <span className="text-white/80 text-sm">{label}</span>
      <div className="mt-1 w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white shadow-md">
        {value ?? "—"}
      </div>
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  ...rest
}) {
  return (
    <label className="block">
      <span className="text-white/80 text-sm">{label}</span>
      <input
        className="mt-1 w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow-md"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        {...rest}
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [] }) {
  return (
    <label className="block">
      <span className="text-white/80 text-sm">{label}</span>
      <select
        className="mt-1 w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow-md"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-32 h-32 rounded-full bg-white/20 mx-auto mb-6" />
      <div className="h-4 bg-white/20 rounded w-2/3 mx-auto mb-8" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-white/10 rounded" />
        ))}
      </div>
    </div>
  );
}
