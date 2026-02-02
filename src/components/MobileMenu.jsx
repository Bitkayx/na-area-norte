import { useState, useEffect } from "react";

const MobileMenu = ({ navigation }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";

    const handleEscape = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button
        className="md:hidden p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[999]">

          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <div className="relative h-screen w-screen bg-white dark:bg-slate-900">

            <button
              onClick={closeMenu}
              aria-label="Cerrar menú"
              className="
                fixed
                top-8
                right-8
                z-50
                text-3xl
                font-light
                text-slate-500
                hover:text-black
                dark:hover:text-white
                transition
                cursor-pointer
              "
            >
              ✕
            </button>

            <div className="flex h-full items-center justify-center px-8">

              <nav className="flex flex-col items-center gap-10 text-center">

                {navigation.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="
                      text-3xl
                      font-semibold
                      tracking-wide
                      text-slate-800 dark:text-white
                      hover:text-primary
                      transition
                    "
                  >
                    {item.label}
                  </a>
                ))}

              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileMenu;
