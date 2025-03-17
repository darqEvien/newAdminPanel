import { useState, useEffect, useCallback } from "react";
import {
  ref,
  onValue,
  query,
  orderByChild,
  limitToLast,
  get,
} from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import CustomerCard from "../components/ui/CustomerCard";
import CustomerForm from "../components/CustomerForm";
import Sidebar from "../components/Sidebar";

const CUSTOMERS_PER_PAGE = 16;

const CustomerPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    new: 0,
  });
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Müşteri verilerini çek
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // İlk yükleme için sorgu, son eklenen müşterilerden başla
        const customersQuery = query(
          ref(database, "customers"),
          orderByChild("createdAt"),
          limitToLast(CUSTOMERS_PER_PAGE)
        );

        const snapshot = await get(customersQuery);
        const data = snapshot.val();

        if (data) {
          const customersArray = Object.entries(data).map(([id, values]) => ({
            id,
            ...values,
            name: values.fullName || values.name || "İsimsiz Müşteri",
          }));

          // Tarihe göre sıralama
          customersArray.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
          });

          setCustomers(customersArray);

          // İstatistikleri güncelle
          updateStats(customersArray);

          // Daha fazla veri var mı kontrol et
          setHasMore(customersArray.length >= CUSTOMERS_PER_PAGE);
        } else {
          setCustomers([]);
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // İstatistikleri güncelle
  const updateStats = useCallback((customersArray) => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const active = customersArray.filter(
      (c) => c.lastOrder && new Date(c.lastOrder) > oneMonthAgo
    ).length;
    const newCustomers = customersArray.filter(
      (c) => c.createdAt && new Date(c.createdAt) > oneMonthAgo
    ).length;

    setStats({
      total: customersArray.length,
      active: active,
      new: newCustomers,
    });
  }, []);

  // Müşteri arama
  const filteredCustomers = customers.filter(
    (customer) =>
      (customer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomer = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Sidebar />
        <main className="flex-1 p-0 ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <div className="text-gray-700 dark:text-gray-300 font-medium">
                Müşteriler yükleniyor...
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />

      <main className="flex-1 p-0 ml-64">
        {/* Modern Header */}
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Müşteriler
                </h1>
                <p className="mt-1.5 text-blue-100">
                  Müşteri bilgilerinizi yönetin ve ilişkilerinizi güçlendirin.
                </p>
              </div>

              {/* İstatistik Kartları */}
              <div className="mt-6 md:mt-0 grid grid-cols-3 gap-4 transition-all duration-300">
                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">Toplam</p>
                    <span className="bg-blue-500/30 text-xs px-2 py-0.5 rounded-full text-blue-100">
                      Müşteri
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.total}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">Aktif</p>
                    <span className="bg-green-500/30 text-xs px-2 py-0.5 rounded-full text-green-100">
                      Son 30 gün
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.active}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">Yeni</p>
                    <span className="bg-yellow-500/30 text-xs px-2 py-0.5 rounded-full text-yellow-100">
                      Son 30 gün
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.new}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search & Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Müşteri ara... (isim, e-posta veya telefon)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:text-gray-200 text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm transition-colors duration-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* View switcher */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 flex shadow-sm">
                <button
                  className={`p-2 rounded-md ${
                    viewMode === "grid"
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  } transition-colors`}
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
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
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
                <button
                  className={`p-2 rounded-md ${
                    viewMode === "list"
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  } transition-colors`}
                  onClick={() => setViewMode("list")}
                  title="List view"
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
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>

              <button
                className="group relative px-5 py-2.5 font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 ease-out focus:outline-none"
                onClick={handleAddCustomer}
              >
                <div className="absolute inset-0 w-3/5 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-[150%] transition-transform duration-700 ease-out"></div>
                <span className="relative flex items-center">
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
                </span>
              </button>
            </div>
          </div>

          {/* Customers Section */}
          {filteredCustomers.length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"
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
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Müşteri Bulunamadı
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {searchTerm
                  ? `"${searchTerm}" ile eşleşen müşteri bulunamadı.`
                  : "Henüz müşteri eklenmemiş. Yeni müşteri eklemek için yukarıdaki butona tıklayın."}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                >
                  Aramayı Temizle
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Customer Grid/List */}
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-4"
                }
              >
                {filteredCustomers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    viewMode={viewMode}
                  />
                ))}
              </div>

              {/* Footer with Load More */}
              <footer className="mt-12 mb-6 flex justify-center items-center min-h-[80px]">
                {hasMore && (
                  <button
                    onClick={() => {
                      setPage(page + 1);
                      // Burada daha fazla müşteri yükleme kodu eklenebilir
                    }}
                    className="group relative px-6 py-3 font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 ease-out focus:outline-none"
                  >
                    <div className="absolute inset-0 w-3/5 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-[150%] transition-transform duration-700 ease-out"></div>
                    <span className="relative flex items-center">
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
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      Daha Fazla Yükle
                    </span>
                  </button>
                )}

                {!hasMore && filteredCustomers.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-6 py-4 text-gray-600 dark:text-gray-300 shadow-sm">
                    <div className="flex items-center">
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Tüm müşteriler yüklendi</span>
                    </div>
                  </div>
                )}
              </footer>
            </>
          )}
        </div>
      </main>

      {isFormOpen && <CustomerForm onClose={handleCloseForm} />}
    </div>
  );
};

export default CustomerPage;
