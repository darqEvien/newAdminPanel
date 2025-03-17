import { useState, useEffect, useCallback, useRef } from "react";
import {
  ref,
  query,
  orderByChild,
  limitToLast,
  endBefore,
  get,
  update,
  remove,
  push,
  set,
} from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import Sidebar from "../components/Sidebar";
import OrderCard from "../components/OrderCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ORDERS_PER_PAGE = 12;
const INITIAL_FETCH_COUNT = ORDERS_PER_PAGE;

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const lastVisibleRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(true);

  // Basit istatistikler için state
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
  });

  const createISOString = () => new Date().toISOString();

  const fetchOrders = useCallback(async (loadMore = false) => {
    try {
      setError(null);
      if (!loadMore) setLoading(true);

      let ordersQuery;

      if (loadMore && lastVisibleRef.current) {
        // Daha fazla yükle için sorgu
        ordersQuery = query(
          ref(database, "crafter-orders"),
          orderByChild("createdAt"),
          endBefore(lastVisibleRef.current),
          limitToLast(ORDERS_PER_PAGE)
        );
      } else {
        // İlk yükleme için sorgu
        ordersQuery = query(
          ref(database, "crafter-orders"),
          orderByChild("createdAt"),
          limitToLast(INITIAL_FETCH_COUNT)
        );
      }

      const snapshot = await get(ordersQuery);
      const data = snapshot.val();

      if (!data) {
        if (!loadMore) setOrders([]);
        setHasMore(false);
        return;
      }

      const newOrders = Object.entries(data).map(([id, order]) => ({
        id,
        ...order,
        createdAt: order.createdAt || createISOString(),
      }));

      // Tarihe göre sırala (en yeniden eskiye)
      newOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Son görünen öğeyi kaydet
      if (newOrders.length > 0) {
        lastVisibleRef.current = newOrders[newOrders.length - 1].createdAt;
      }

      setOrders((prev) => {
        if (loadMore) {
          // Yeni siparişleri ekle
          const combined = [...prev, ...newOrders];
          // Benzersiz siparişleri al ve sırala
          const uniqueOrders = Array.from(
            new Map(combined.map((order) => [order.id, order])).values()
          ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          // İstatistikleri güncelle
          updateStats(uniqueOrders);
          return uniqueOrders;
        }

        // İstatistikleri güncelle
        updateStats(newOrders);
        return newOrders;
      });

      // Daha fazla veri var mı kontrol et
      setHasMore(newOrders.length >= ORDERS_PER_PAGE);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // İstatistikleri güncelle
  const updateStats = (orders) => {
    const approved = orders.filter(
      (order) => order.condition === "onaylandı"
    ).length;
    setStats({
      total: orders.length,
      approved: approved,
      pending: orders.length - approved,
    });
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = useCallback(async (orderId) => {
    try {
      const orderRef = ref(database, `crafter-orders/${orderId}`);
      const snapshot = await get(orderRef);
      const orderData = snapshot.val();

      if (!orderData) {
        throw new Error("Sipariş bulunamadı");
      }

      // Önce ürünleri düzenle
      const simplifiedProducts = {};
      if (orderData.products) {
        Object.entries(orderData.products).forEach(
          ([categoryName, categoryData]) => {
            if (categoryData.selected && categoryData.products) {
              simplifiedProducts[categoryName] = categoryData.products;
            }
          }
        );
      }

      const products = {
        0: {
          ...simplifiedProducts,
          // status: 'pending'
        },
      };
      // Customers koleksiyonu için yeni veri yapısı
      const customerData = {
        fullName: orderData.fullName,
        phone: orderData.phone,
        email: orderData.email || null,
        message: orderData.message || null,
        dimensions: orderData.dimensions || null,
        products: products,
        totalPrice: orderData.totalPrice,
        pdfUrl: orderData.pdfUrl || null,
        from: "crafter-orders",
        condition: "verified",
        createdAt: orderData.createdAt,
        verifiedAt: new Date().toISOString(),
        orderId: orderId, // orijinal sipariş ID'sini referans olarak sakla
      };

      // Customers'a ekle
      const customersRef = ref(database, "customers");
      const newCustomerRef = push(customersRef);
      await set(newCustomerRef, customerData);

      // Orijinal siparişi güncelle
      const updates = {
        condition: "onaylandı",
        updatedAt: new Date().toISOString(),
      };

      await update(orderRef, updates);

      // Local state'i güncelle
      setOrders((prev) => {
        const newOrders = prev.map((order) =>
          order.id === orderId ? { ...order, ...updates } : order
        );
        updateStats(newOrders);
        return newOrders;
      });

      // Başarı bildirimi göster (isteğe bağlı olarak bir toast ekleyebilirsiniz)
    } catch (err) {
      console.error("Order approval error:", err);
      setError("Sipariş onaylanırken bir hata oluştu");
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }, []);

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    orderId: null,
  });

  // Silme dialog'unu açma fonksiyonu
  const handleDeleteClick = useCallback((orderId) => {
    setDeleteDialog({ isOpen: true, orderId });
  }, []);

  // Silme işlemini onaylama
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog.orderId) return;

    try {
      await remove(ref(database, `crafter-orders/${deleteDialog.orderId}`));

      setOrders((prev) => {
        const newOrders = prev.filter(
          (order) => order.id !== deleteDialog.orderId
        );
        updateStats(newOrders);
        return newOrders;
      });

      setDeleteDialog({ isOpen: false, orderId: null });
      // Başarı bildirimi göster (isteğe bağlı)
    } catch (err) {
      console.error("Order deletion error:", err);
      setError("Sipariş silinirken bir hata oluştu");
    }
  }, [deleteDialog.orderId]);

  // Dialog'u kapatma
  const handleCancelDelete = useCallback(() => {
    setDeleteDialog({ isOpen: false, orderId: null });
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />

      {/* Silme Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={handleCancelDelete}>
        <DialogContent className="sm:max-w-md border border-gray-200 dark:border-gray-700 shadow-xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white">
              Siparişi Sil
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Bu siparişi silmek istediğinizden emin misiniz? Bu işlem geri
              alınamaz.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md mt-2 mb-4 border border-red-100 dark:border-red-800/30">
            <div className="flex items-center text-red-700 dark:text-red-400">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="font-medium">
                Bu işlem kalıcı olarak siparişi silecektir.
              </span>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleCancelDelete}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 rounded-md hover:from-red-700 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              Sil
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  Prefabric Crafter
                </h1>
                <p className="mt-1.5 text-blue-100">
                  Sipariş yönetimini kolaylaştırın, müşterilerinizi memnun edin.
                </p>
              </div>

              {/* İstatistik Kartları */}
              <div
                className={`mt-6 md:mt-0 grid grid-cols-3 gap-4 transition-all duration-300 ${
                  statsVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">Toplam</p>
                    <span className="bg-blue-500/30 text-xs px-2 py-0.5 rounded-full text-blue-100">
                      Sipariş
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.total}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">
                      Onaylanan
                    </p>
                    <span className="bg-green-500/30 text-xs px-2 py-0.5 rounded-full text-green-100">
                      Aktif
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.approved}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">
                      Bekleyen
                    </p>
                    <span className="bg-yellow-500/30 text-xs px-2 py-0.5 rounded-full text-yellow-100">
                      Yeni
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.pending}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md dark:bg-red-900/20 dark:border-red-500/60 dark:text-red-400">
              <div className="flex items-center">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Orders Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading && !orders.length
              ? // Skeleton Loader
                Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse"
                  >
                    <div className="h-32 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="p-4">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      <div className="mt-4 flex justify-between">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))
              : orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={{
                      ...order,
                      formattedDate: formatDate(order.createdAt),
                    }}
                    onApprove={handleApprove}
                    onDelete={handleDeleteClick}
                  />
                ))}
          </section>

          {/* Footer with Load More */}
          <footer className="mt-12 mb-6 flex justify-center items-center min-h-[80px]">
            {loading && orders.length > 0 && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">
                  Yükleniyor...
                </span>
              </div>
            )}

            {!loading && hasMore && (
              <button
                onClick={() => fetchOrders(true)}
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

            {!loading && !hasMore && orders.length > 0 && (
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
                  <span>Tüm siparişler yüklendi</span>
                </div>
              </div>
            )}

            {!loading && orders.length === 0 && (
              <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm w-full max-w-md">
                <svg
                  className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4"
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
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Henüz sipariş bulunmuyor
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Yeni siparişler burada görüntülenecek
                </p>
              </div>
            )}
          </footer>
        </div>
      </main>
    </div>
  );
};

export default OrdersPage;
