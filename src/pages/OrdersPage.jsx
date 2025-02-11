import { useState, useEffect, useCallback, useRef } from 'react';
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
  set
} from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import Sidebar from '../components/Sidebar';
import OrderCard from '../components/OrderCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ORDERS_PER_PAGE = 12;
const INITIAL_FETCH_COUNT = ORDERS_PER_PAGE;

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const lastVisibleRef = useRef(null);

  const createISOString = () => new Date().toISOString();

  const fetchOrders = useCallback(async (loadMore = false) => {
    try {
      setError(null);
      setLoading(true);

      let ordersQuery;
      
      if (loadMore && lastVisibleRef.current) {
        // Daha fazla yükle için sorgu
        ordersQuery = query(
          ref(database, 'crafter-orders'),
          orderByChild('createdAt'),
          endBefore(lastVisibleRef.current),
          limitToLast(ORDERS_PER_PAGE)
        );
      } else {
        // İlk yükleme için sorgu
        ordersQuery = query(
          ref(database, 'crafter-orders'),
          orderByChild('createdAt'),
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
        createdAt: order.createdAt || createISOString()
      }));

      // Tarihe göre sırala (en yeniden eskiye)
      newOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Son görünen öğeyi kaydet
      if (newOrders.length > 0) {
        lastVisibleRef.current = newOrders[newOrders.length - 1].createdAt;
      }

      setOrders(prev => {
        if (loadMore) {
          // Yeni siparişleri ekle
          const combined = [...prev, ...newOrders];
          // Benzersiz siparişleri al ve sırala
          return Array.from(
            new Map(combined.map(order => [order.id, order])).values()
          ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return newOrders;
      });

      // Daha fazla veri var mı kontrol et
      setHasMore(newOrders.length >= ORDERS_PER_PAGE);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = useCallback(async (orderId) => {
    try {
      const orderRef = ref(database, `crafter-orders/${orderId}`);
      const snapshot = await get(orderRef);
      const orderData = snapshot.val();
  
      if (!orderData) {
        throw new Error('Sipariş bulunamadı');
      }
  
      // Önce ürünleri düzenle
      const simplifiedProducts = {};
      if (orderData.products) {
        Object.entries(orderData.products).forEach(([categoryName, categoryData]) => {
          if (categoryData.selected && categoryData.products) {
            simplifiedProducts[categoryName] = categoryData.products;
          }
        });
      }
  
      // Customers koleksiyonu için yeni veri yapısı
      const customerData = {
        fullName: orderData.fullName,
        phone: orderData.phone,
        email: orderData.email || null,
        message: orderData.message || null,
        dimensions: orderData.dimensions || null,
        products: simplifiedProducts,
        totalPrice: orderData.totalPrice,
        pdfUrl: orderData.pdfUrl || null,
        from: 'crafter-orders',
        condition: 'verified',
        createdAt: orderData.createdAt,
        verifiedAt: new Date().toISOString(),
        orderId: orderId // orijinal sipariş ID'sini referans olarak sakla
      };
  
      // Customers'a ekle
      const customersRef = ref(database, 'customers');
      const newCustomerRef = push(customersRef);
      await set(newCustomerRef, customerData);
  
      // Orijinal siparişi güncelle
      const updates = {
        condition: 'onaylandı',
        updatedAt: new Date().toISOString()
      };
  
      await update(orderRef, updates);
      
      // Local state'i güncelle
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, ...updates }
            : order
        )
      );
  
    } catch (err) {
      console.error('Order approval error:', err);
      setError('Sipariş onaylanırken bir hata oluştu');
    }
  }, []);



  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }, []);

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, orderId: null });

  // Silme dialog'unu açma fonksiyonu
  const handleDeleteClick = useCallback((orderId) => {
    setDeleteDialog({ isOpen: true, orderId });
  }, []);

  // Silme işlemini onaylama
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog.orderId) return;

    try {
      await remove(ref(database, `crafter-orders/${deleteDialog.orderId}`));
      setOrders(prev => prev.filter(order => order.id !== deleteDialog.orderId));
      setDeleteDialog({ isOpen: false, orderId: null });
    } catch (err) {
      console.error('Order deletion error:', err);
      setError('Sipariş silinirken bir hata oluştu');
    }
  }, [deleteDialog.orderId]);

  // Dialog'u kapatma
  const handleCancelDelete = useCallback(() => {
    setDeleteDialog({ isOpen: false, orderId: null });
  }, []);
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <Dialog open={deleteDialog.isOpen} onOpenChange={handleCancelDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Siparişi Sil</DialogTitle>
            <DialogDescription>
              Bu siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
  <button
    onClick={handleCancelDelete}
    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
  >
    İptal
  </button>
  <button
    onClick={handleConfirmDelete}
    className="ml-3 px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 rounded-md hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
  >
    Sil
  </button>
</DialogFooter>
        </DialogContent>
      </Dialog>
      <main className="flex-1 p-6 bg-white dark:bg-gray-800 ml-64">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Prefabric Crafter
          </h1>
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={{
                ...order,
                formattedDate: formatDate(order.createdAt)
              }}
              onApprove={handleApprove}
              onDelete={handleDeleteClick} 
            />
          ))}
        </section>

        <footer className="mt-8 flex justify-center items-center min-h-[100px]">
          {loading && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          )}

          {!loading && hasMore && (
            <button
              onClick={() => fetchOrders(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors duration-200 ease-in-out focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                       disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Daha Fazla Yükle
            </button>
          )}

          {!loading && !hasMore && orders.length > 0 && (
            <p className="text-gray-600 dark:text-gray-400">
              Tüm siparişler yüklendi
            </p>
          )}

          {!loading && orders.length === 0 && (
            <p className="text-gray-600 dark:text-gray-400">
              Henüz sipariş bulunmuyor
            </p>
          )}
        </footer>
      </main>
    </div>
  );
};

export default OrdersPage;