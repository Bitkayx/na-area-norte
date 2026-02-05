import { useMemo, useState, useEffect } from "react";
import type { Grupo } from "../types/grupo.ts";

const gruposData = Object.values(
  import.meta.glob("../data/grupos/*.json", { eager: true }),
).flatMap((m: any) => m.default) as Grupo[];

export default function Directorio() {
  const [searchText, setSearchText] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<Grupo | null>(null);
  const [allGroups, setAllGroups] = useState<Grupo[]>([]);
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Grupo[]>([]);
  const [showMap, setShowMap] = useState<boolean>(false);

  const districts = ["1", "2", "4", "5"];

  useEffect(() => {
    setAllGroups(gruposData);
  }, []);

  const filteredGroups = useMemo(() => {
    return allGroups.filter(
      (group) => !district || group.distrito === district,
    );
  }, [district, allGroups]);

  const handleSearch = () => {
    if (!searchText.trim()) {
      return;
    }

    let results = allGroups.filter((group) =>
      group.nombre.toLowerCase().includes(searchText.toLowerCase()),
    );

    setSearchResults(results);
    setIsSearchMode(true);
    setSelectedGroup(null);
    setDistrict("");
    setShowMap(false);
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
    setSearchText("");
    setSelectedGroup(null);

    if (value) {
      const results = allGroups.filter((group) => group.distrito === value);
      setSearchResults(results);
      setIsSearchMode(true);
      setShowMap(false);
    } else {
      setSearchResults([]);
      setIsSearchMode(false);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    setSearchText("");

    if (groupId === "") {
      // "Todos" seleccionado
      const results = allGroups.filter((group) => group.distrito === district);
      setSearchResults(results);
      setSelectedGroup(null);
      setIsSearchMode(true);
    } else {
      // Grupo específico seleccionado - buscar solo en el distrito actual para evitar duplicados
      const group = filteredGroups.find(
        (g: Grupo): boolean => g.id === groupId,
      );
      setSelectedGroup(group || null);
      setIsSearchMode(false);
      setSearchResults([]);
    }

    setShowMap(false);
  };

  const handleShowMap = (group: Grupo) => {
    setSelectedGroup(group);
    setShowMap(true);
    setTimeout(() => {
      const mapSection = document.getElementById("map-section");
      if (mapSection) {
        mapSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-3 mb-10 text-center md:text-left">
        <h1 className="text-6xl md:text-7xl font-extrabold text-slate-800 dark:text-white leading-[1.05] tracking-tight">
          Directorio de <span className="text-primary">Grupos</span>
        </h1>

        <p className="text-base text-slate-500 max-w-150">
          Encuentra el grupo más cercano a ti.
        </p>
      </div>

      <div className="w-full p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-10">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-bold uppercase text-slate-400">
                Búsqueda por Nombre
              </label>
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-white dark:text-slate-900 rounded-xl px-4 py-3 text-sm"
                placeholder="Nombre del grupo..."
              />
            </div>
            <div className="sm:w-40">
              <label className="text-[11px] font-bold uppercase text-slate-400 opacity-0">
                Acción
              </label>
              <button
                onClick={handleSearch}
                disabled={!searchText.trim()}
                className="w-full h-11.5 bg-primary disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold"
              >
                Buscar por Nombre
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
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
                  value={selectedGroup ? selectedGroup.id : ""}
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
          </div>
        </div>
      </div>

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
              {group.direccion.referencias}
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
