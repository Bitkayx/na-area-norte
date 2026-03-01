import { useState, useMemo, useEffect } from "react";

export default function InventoryTable({ items }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");

  useEffect(() => {
    console.log("Category changed to:", category);
  }, [category]);

  const categories = useMemo(() => {
    const unique = new Set(items.map((i) => i.category));
    return ["Todas", ...unique];
  }, [items]);

  const filteredItems = useMemo(() => {
    const result = items.filter((item) => {
      const matchesSearch = item.description
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        category === "Todas" || item.category === category;

      return matchesSearch && matchesCategory;
    });
    console.log(`Filtered items for "${category}":`, result.length);
    return result;
  }, [search, category, items]);

  return (
    <div
      className="w-full p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mt-8"
      key={category}
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:text-slate-900 rounded-xl px-4 py-3 text-sm border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-11.5 bg-white dark:text-slate-900 rounded-xl px-4 py-2 text-sm border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-600">
              <th className="text-left py-3 px-4 text-xs font-bold uppercase text-slate-400">
                Descripción
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold uppercase text-slate-400">
                Código
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold uppercase text-slate-400">
                Valor Unitario
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, index) => (
              <tr
                key={`${category}-${index}-${item.code || item.description}`}
                className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-200">
                  {item.description}
                </td>
                <td className="py-3 px-4 text-sm text-slate-500">
                  {item.code || "-"}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-primary">
                  ${item.price.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredItems.length === 0 && (
        <p className="text-center text-slate-500 py-8">
          No se encontraron resultados
        </p>
      )}
    </div>
  );
}
