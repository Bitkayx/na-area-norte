import { useMemo, useState, useEffect } from "react";
const gruposData = Object.values(
  import.meta.glob("../data/grupos/*.json", { eager: true })
).flatMap((m) => m.default);

const Notification = ({ notification, onClose }) => {
  if (!notification.type) return null;

  const baseClasses =
    "fixed z-50 p-4 rounded-xl border-2 shadow-lg transition-all duration-300 ease-in-out";
  const typeClasses =
    notification.type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-yellow-50 border-yellow-200 text-yellow-700";

  const responsiveClasses = `
    ${baseClasses} ${typeClasses}
    left-4 right-4 mx-auto max-w-sm sm:max-w-md md:max-w-lg
    top-4 sm:top-6 md:top-8
  `;

  return (
    <div className={responsiveClasses}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {notification.type === "error" ? "⚠️" : "🔮"}
          </span>
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
        <button
          onClick={onClose}
          className="text-lg leading-none hover:opacity-70 transition-opacity"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default function Directorio() {
  const [searchText, setSearchText] = useState("");
  const [district, setDistrict] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [notification, setNotification] = useState({
    type: null,
    message: "",
    id: null,
  });

  const districts = ["1", "2", "4", "5"];

  useEffect(() => {
    setAllGroups(gruposData);
  }, []);

  const filteredGroups = useMemo(() => {
    return allGroups.filter(
      (group) => !district || group.distrito === district,
    );
  }, [district, allGroups]);

  const showNotification = (type, message) => {
    const id = Date.now();
    setNotification({ type, message, id });

    // Auto-dismiss después de 5 segundos
    setTimeout(() => {
      setNotification((prev) =>
        prev.id === id ? { type: null, message: "", id: null } : prev,
      );
    }, 5000);
  };

  const closeNotification = () => {
    setNotification({ type: null, message: "", id: null });
  };

  const handleSearch = () => {
    // Resetear notificación previa
    closeNotification();

    let results;
    let shouldProceed = true;

    if (!searchText.trim() && !district) {
      // ERROR: No hay ningún filtro
      showNotification(
        "error",
        "Por favor, ingresa un nombre de grupo o selecciona un distrito",
      );
      shouldProceed = false;
    } else if (!district && searchText.trim()) {
      // WARNING: Solo nombre, no distrito
      showNotification(
        "warning",
        "¿Quieres filtrar también por distrito para resultados más precisos?",
      );
      // Continúa con búsqueda
    } else if (district && !searchText.trim()) {
      // WARNING: Solo distrito, no nombre
      showNotification(
        "warning",
        "Se mostrarán todos los grupos del distrito seleccionado",
      );
      // Continúa con búsqueda
    }

    if (!shouldProceed) return;

    // Lógica de búsqueda existente
    if (searchText.trim() && district) {
      // Ambos filtros: nombre Y distrito
      results = allGroups.filter(
        (group) =>
          group.nombre.toLowerCase().includes(searchText.toLowerCase()) &&
          group.distrito === district,
      );
    } else if (searchText.trim()) {
      // Solo por nombre
      results = allGroups.filter((group) =>
        group.nombre.toLowerCase().includes(searchText.toLowerCase()),
      );
    } else if (district) {
      // Solo por distrito
      results = allGroups.filter((group) => group.distrito === district);
    }

    // Verificar si hay resultados
    if (results.length === 0) {
      showNotification(
        "warning",
        "No se encontraron grupos con los criterios seleccionados",
      );
    }

    setSearchResults(results);
    setIsSearchMode(true);
    setSelectedGroup(null);
    setShowMap(false);
  };

  const handleDistrictChange = (value) => {
    setDistrict(value);
    setSelectedGroup(null);
    setIsSearchMode(false);
    setSearchResults([]);
    closeNotification(); // Limpiar notificación al cambiar distrito
  };

  const handleGroupSelect = (groupId) => {
    const group = filteredGroups.find((g) => g.id === groupId);
    setSelectedGroup(group);
    setIsSearchMode(false);
    setShowMap(false);
    closeNotification(); // Limpiar notificación al seleccionar grupo
  };

  const handleShowMap = (group) => {
    setSelectedGroup(group);
    setShowMap(true);
    // Scroll automático al mapa después de un breve delay
    setTimeout(() => {
      const mapSection = document.getElementById("map-section");
      if (mapSection) {
        mapSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Notificación flotante */}
      <Notification notification={notification} onClose={closeNotification} />

      {/* HEADER */}
      <div className="space-y-3 mb-10 text-center md:text-left">

        <h1 className="text-6xl md:text-7xl font-extrabold text-slate-800 dark:text-white leading-[1.05] tracking-tight">
          Directorio de <span className="text-primary">Grupos</span>
        </h1>

        <p className="text-base text-slate-500 max-w-[600px]">
          Encuentra el grupo más cercano a ti.
        </p>
      </div>

      {/* FILTROS */}
      <div className="w-full p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-10">
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="flex-1 w-full space-y-2">
            <label className="text-[11px] font-bold uppercase text-slate-400">
              Búsqueda
            </label>
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-white dark:text-slate-900 rounded-xl px-4 py-3 text-sm"
              placeholder="Nombre del grupo..."
            />
          </div>

          <div className="flex-1 w-full space-y-2">
            <label className="text-[11px] font-bold uppercase text-slate-400">
              Distrito
            </label>
            <select
              value={district}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full bg-white dark:text-slate-900 rounded-xl px-4 py-3 text-sm"
            >
              <option value="">Selecciona un Distrito</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  Distrito {d}
                </option>
              ))}
            </select>
          </div>

          {district && (
            <div className="flex-1 w-full space-y-2">
              <label className="text-[11px] font-bold uppercase text-slate-400">
                Grupo
              </label>
              <select
                onChange={(e) => handleGroupSelect(e.target.value)}
                className="w-full bg-white dark:text-slate-900 rounded-xl px-4 py-3 text-sm"
              >
                <option value="">Todos</option>
                {filteredGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSearch}
            className="w-full md:w-40 bg-primary text-white h-[46px] rounded-xl font-bold"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(isSearchMode
          ? searchResults
          : selectedGroup
            ? [selectedGroup]
            : []
        ).map((group) => (
          <div
            key={group.id}
            className="p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
          >
            <h3 className="text-xl font-bold mb-4">{group.nombre}</h3>

            <p className="text-sm text-slate-500 mb-2">
              {group.direccion.linea1}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              {group.direccion.colonia}, {group.direccion.ciudad}
            </p>

            <p className="text-sm text-slate-500 mb-4">
              Referencias: {group.direccion.referencias}
            </p>

            {group.horarios.map((h, i) => (
              <p key={i} className="text-sm text-slate-500">
                {h.dias}: {h.horaInicio} - {h.horaFin}
              </p>
            ))}

            <button
              onClick={() => handleShowMap(group)}
              className="mt-4 w-full bg-primary text-white py-2 rounded-xl"
            >
              Ver mapa
            </button>
          </div>
        ))}
      </div>

      {/* MAPA */}
      <div id="map-section">
        {showMap && selectedGroup && (
          <div className="mt-16 p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">
                Mapa del grupo {selectedGroup.nombre}
              </h3>
              <p className="text-sm text-slate-500">
                {selectedGroup.direccion.linea1},{" "}
                {selectedGroup.direccion.colonia},{" "}
                {selectedGroup.direccion.ciudad}.{" "}
                {selectedGroup.direccion.referencias}
              </p>
            </div>
            <iframe
              className="w-full h-96 rounded-xl"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedGroup.mapQuery)}&output=embed`}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </section>
  );
}
