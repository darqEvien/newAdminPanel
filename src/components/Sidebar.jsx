import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../firebase/firebaseConfig";

const Sidebar = () => {
  const [mainCategories, setMainCategories] = useState([]);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // İlk render'da localStorage'dan menü durumunu yükle
    const savedMenuState = localStorage.getItem("productsMenuOpen");
    if (savedMenuState === "true") {
      setIsProductsOpen(true);
    } else if (location.pathname.includes("/products/")) {
      // Eğer localStorage'da kayıtlı değer yoksa ve ürünler sayfasındaysa aç
      setIsProductsOpen(true);
    }

    const fetchCategories = async () => {
      try {
        const categoriesRef = ref(database, "categories");
        const snapshot = await get(categoriesRef);

        if (snapshot.exists()) {
          const categories = [];
          snapshot.forEach((childSnapshot) => {
            categories.push({
              id: childSnapshot.key,
              ...childSnapshot.val(),
            });
          });

          const mainCats = categories
            .filter((cat) => !cat.parentCategory)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          setMainCategories(mainCats);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, [location.pathname]);

  // Menü durumu değiştiğinde localStorage'a kaydet
  const toggleProductsMenu = () => {
    const newState = !isProductsOpen;
    setIsProductsOpen(newState);
    localStorage.setItem("productsMenuOpen", newState.toString());
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col shadow-xl">
      {/* Logo ve Header */}
      <div className="flex-shrink-0 flex items-center justify-center h-20 border-b border-gray-700/50 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 7h16M4 11h16M11 15h9M11 19h9M5 15l-2 2 2 2M5 19l-2-2"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Söz Çelik</h1>
        </div>
      </div>

      {/* Ana Menü */}
      <nav className="flex-1 py-6 px-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1">
          {/* Ana Sayfa */}
          <li>
            <Link
              to="/"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 
                ${
                  isActive("/")
                    ? "bg-blue-600/20 text-blue-400 border-l-4 border-blue-500 pl-3"
                    : "hover:bg-gray-800/60 text-gray-300 hover:text-white border-l-4 border-transparent pl-3"
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span className="font-medium">Ana Sayfa</span>
            </Link>
          </li>

          {/* Kategoriler */}
          <li>
            <Link
              to="/categories"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 
                ${
                  isActive("/categories")
                    ? "bg-blue-600/20 text-blue-400 border-l-4 border-blue-500 pl-3"
                    : "hover:bg-gray-800/60 text-gray-300 hover:text-white border-l-4 border-transparent pl-3"
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span className="font-medium">Kategoriler</span>
            </Link>
          </li>

          {/* Ürünler (Açılır Menü) */}
          <li className="relative">
            <button
              onClick={toggleProductsMenu}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200 
                ${
                  location.pathname.includes("/products/")
                    ? "bg-blue-600/20 text-blue-400 border-l-4 border-blue-500 pl-3"
                    : "hover:bg-gray-800/60 text-gray-300 hover:text-white border-l-4 border-transparent pl-3"
                }`}
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                <span className="font-medium">Ürünler</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
                  isProductsOpen ? "transform rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Alt Kategoriler */}
            <div
              className={`transition-all duration-300 ${
                isProductsOpen
                  ? "max-h-[250px] opacity-100 my-2"
                  : "max-h-0 opacity-0 pointer-events-none"
              }`}
            >
              <div className="overflow-y-auto scroll-smooth pr-1.5 hover-scrollbar max-h-[250px]">
                <ul className="pl-4 space-y-1.5 border-l border-gray-700/50 ml-6">
                  {mainCategories.map((category) => (
                    <li key={category.id}>
                      <Link
                        to={`/products/${category.propertyName}`}
                        className={`block py-2 px-4 rounded-md text-sm transition-all duration-200
              ${
                location.pathname === `/products/${category.propertyName}`
                  ? "bg-blue-600/20 text-blue-300 shadow-sm border-l-2 border-blue-500 -ml-[2px]"
                  : "hover:bg-gray-700/30 text-gray-400 hover:text-gray-200"
              }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              location.pathname ===
                              `/products/${category.propertyName}`
                                ? "bg-blue-400"
                                : "bg-gray-600"
                            }`}
                          ></div>
                          <span>{category.title}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>

          {/* Prefabric Crafter */}
          <li>
            <Link
              to="/orders"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 
                ${
                  isActive("/orders")
                    ? "bg-blue-600/20 text-blue-400 border-l-4 border-blue-500 pl-3"
                    : "hover:bg-gray-800/60 text-gray-300 hover:text-white border-l-4 border-transparent pl-3"
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"
                />
              </svg>
              <span className="font-medium">Prefabric Crafter</span>
            </Link>
          </li>

          {/* Müşteriler */}
          <li>
            <Link
              to="/customers"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 
                ${
                  isActive("/customers")
                    ? "bg-blue-600/20 text-blue-400 border-l-4 border-blue-500 pl-3"
                    : "hover:bg-gray-800/60 text-gray-300 hover:text-white border-l-4 border-transparent pl-3"
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="font-medium">Müşteriler</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center">
              <span className="text-xs font-medium text-white">SA</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-300">Söz Admin</p>
              <p className="text-xs text-gray-500">v1.0.0</p>
            </div>
          </div>
          <button className="p-1.5 rounded-md bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
