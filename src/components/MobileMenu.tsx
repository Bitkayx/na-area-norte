import React, { useState, useEffect } from "react";
import type { NavigationItem } from "../types/navigation.ts"

interface Navigation {
  navigation: NavigationItem
}

const MobileMenu = ({ navigation }: Navigation): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect((): () => void => {
    document.body.style.overflow = isOpen ? "hidden" : "";

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleEscape);

    return (): void => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const closeMenu = (): void => setIsOpen(false);

  return (
    <>
      <button
        className="md:hidden p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        onClick={(): void => setIsOpen(true)}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-99">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div className="relative h-screen w-screen bg-white dark:bg-slate-900">
            <button
              onClick={closeMenu}
              aria-label="Cerrar menú"
              className="fixed top-8 right-8 z-50 text-3xl font-light text-slate-500 hover:text-black dark:hover:text-white transition cursor-pointer"
            >
              ✕
            </button>

            <div className="flex h-full items-center justify-center px-8">
              <nav className="flex flex-col items-center gap-10 text-center">
                {navigation?.map((item: NavigationItem): React.JSX.Element => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="text-3xl font-semibold tracking-wide text-slate-800 dark:text-white hover:text-primary transition"
                  >
                    {item.label}
                  </a>
                ))}
                <a
                  href="/contacto/"
                  className="text-3xl font-semibold tracking-wide text-slate-800 dark:text-white hover:text-primary transition"
                >Contacto</a>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileMenu;
