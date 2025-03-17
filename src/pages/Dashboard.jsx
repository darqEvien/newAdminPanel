import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    categories: 0,
    orders: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Tüm müşterileri getir
        const customersRef = ref(database, "customers");
        const customersSnapshot = await get(customersRef);
        const customersCount = customersSnapshot.exists()
          ? Object.keys(customersSnapshot.val()).length
          : 0;

        // Kategorileri getir
        const categoriesRef = ref(database, "categories");
        const categoriesSnapshot = await get(categoriesRef);
        const categoriesCount = categoriesSnapshot.exists()
          ? Object.keys(categoriesSnapshot.val()).length
          : 0;

        // Örnek olarak ilk kategorinin ürünlerini getir
        let productsCount = 0;
        if (categoriesSnapshot.exists()) {
          const firstCategory = Object.values(categoriesSnapshot.val())[0];
          if (firstCategory && firstCategory.propertyName) {
            const productsRef = ref(
              database,
              `products/${firstCategory.propertyName}`
            );
            const productsSnapshot = await get(productsRef);
            productsCount = productsSnapshot.exists()
              ? Object.keys(productsSnapshot.val()).length
              : 0;
          }
        }

        setStats({
          customers: customersCount,
          categories: categoriesCount,
          products: productsCount,
          orders: Math.floor(Math.random() * 50), // Örnek veri
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />

      <main className="flex-1 p-0 ml-64">
        {/* Modern Header - Diğer sayfalardaki gibi */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 text-white p-8 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <svg
                    className="w-8 h-8 text-blue-200"
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
                  Kontrol Paneli
                </h1>
                <p className="mt-1.5 text-blue-100">
                  Sistem özeti ve hızlı erişim bağlantıları
                </p>
              </div>

              {/* İstatistik Kartları - Header içinde */}
              <div className="mt-6 md:mt-0 grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-300">
                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">
                      Müşteriler
                    </p>
                    <span className="bg-blue-500/30 text-xs px-2 py-0.5 rounded-full text-blue-100">
                      Toplam
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {loading ? "..." : stats.customers}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">Ürünler</p>
                    <span className="bg-purple-500/30 text-xs px-2 py-0.5 rounded-full text-purple-100">
                      Toplam
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {loading ? "..." : stats.products}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">
                      Kategoriler
                    </p>
                    <span className="bg-green-500/30 text-xs px-2 py-0.5 rounded-full text-green-100">
                      Toplam
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {loading ? "..." : stats.categories}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">
                      Siparişler
                    </p>
                    <span className="bg-amber-500/30 text-xs px-2 py-0.5 rounded-full text-amber-100">
                      Toplam
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {loading ? "..." : stats.orders}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Modüller */}
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
            Sistem Modülleri
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Müşteriler Modülü */}
            <Link
              to="/customers"
              className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4 mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/30 transition-colors">
                  <svg
                    className="w-8 h-8 text-blue-600 dark:text-blue-400"
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
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Müşteri Yönetimi
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Müşterileri düzenle, filtrele ve yeni müşteriler ekle
                </p>
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:underline">
                  Müşterileri Görüntüle →
                </span>
              </div>
            </Link>

            {/* Kategoriler Modülü */}
            <Link
              to="/categories"
              className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-800/30 transition-colors">
                  <svg
                    className="w-8 h-8 text-green-600 dark:text-green-400"
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
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Kategori Yönetimi
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Ana ve alt kategorileri düzenle, sırala ve yönet
                </p>
                <span className="text-green-600 dark:text-green-400 text-sm font-medium group-hover:underline">
                  Kategorileri Görüntüle →
                </span>
              </div>
            </Link>

            {/* Ürünler Modülü */}
            <Link
              to="/categories"
              className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-4 mb-4 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/30 transition-colors">
                  <svg
                    className="w-8 h-8 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Ürün Yönetimi
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Ürün ekle, düzenle, sırala ve fiyatları güncelle
                </p>
                <span className="text-purple-600 dark:text-purple-400 text-sm font-medium group-hover:underline">
                  Ürünleri Görüntüle →
                </span>
              </div>
            </Link>

            {/* Siparişler Modülü */}
            <Link
              to="/orders"
              className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4 mb-4 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/30 transition-colors">
                  <svg
                    className="w-8 h-8 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Sipariş Yönetimi
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Siparişleri görüntüle, durumları takip et
                </p>
                <span className="text-amber-600 dark:text-amber-400 text-sm font-medium group-hover:underline">
                  Siparişleri Görüntüle →
                </span>
              </div>
            </Link>
          </div>

          {/* Hızlı Erişim */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Hızlı İşlemler
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link
                to="/customers"
                className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Yeni Müşteri
              </Link>

              <Link
                to="/categories"
                className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Yeni Kategori
              </Link>

              <Link
                to="/categories"
                className="flex items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Yeni Ürün
              </Link>

              <Link
                to="/orders"
                className="flex items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Siparişleri Gör
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p>© 2025 Ero Agan Yapar Admin Panel</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
