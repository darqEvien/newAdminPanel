import { Dialog, DialogContent } from "./dialogForCustomers";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { ref, get, set, update } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import OrderEditModal from "./OrderEditmodal";


const CustomerDetailModal = ({ isOpen, onClose, customer }) => {
  // const [orders, setOrders] = useState([]);
  const [kontiImages, setKontiImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState({});
  const [categories, setCategories] = useState({});
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [expandedNoteDates, setExpandedNoteDates] = useState({});
  const [editingOrder, setEditingOrder] = useState(null);
  const [showOrderOptions, setShowOrderOptions] = useState(false);
  const [showCustomerOrders, setShowCustomerOrders] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  // const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Mevcut siparişleri getiren fonksiyon
  const fetchAvailableCustomers = async () => {
    try {
      const customersRef = ref(database, 'customers');
      const snapshot = await get(customersRef);
      if (snapshot.exists()) {
        const customers = Object.entries(snapshot.val())
          .filter(([id]) => id !== customer.id) // Mevcut müşteriyi hariç tut
          .map(([id, data]) => ({
            id,
            fullName: data.fullName || '',
            email: data.email || '',
            phone: data.phone || '',
            products: data.products || {},
            dimensions: data.dimensions || {},
            totalPrice: data.totalPrice || 0,
            message: data.message || '',
            pdfUrl: data.pdfUrl || ''
          }));
        setAvailableCustomers(customers);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };
  
  // Sipariş ekleme fonksiyonu
  const handleAddExistingOrder = async (selectedCustomer) => {
    try {
      if (!selectedCustomer?.products) return;
      
      // Tüm verileri null check ile ekleyelim
      const orderData = {
        products: selectedCustomer.products[0] || {},
        dimensions: selectedCustomer.dimensions || {},
        totalPrice: selectedCustomer.totalPrice || 0,
        addedAt: new Date().toISOString(),
        fullName: selectedCustomer.fullName || '',
        email: selectedCustomer.email || '',
        phone: selectedCustomer.phone || ''
      };
  
      // Opsiyonel alanları sadece varsa ekleyelim
      if (selectedCustomer.message) {
        orderData.message = selectedCustomer.message;
      }
      if (selectedCustomer.pdfUrl) {
        orderData.pdfUrl = selectedCustomer.pdfUrl;
      }
  
      const updates = {};
      updates[`customers/${customer.id}/otherOrders/${selectedCustomer.id}`] = orderData;
      
      await update(ref(database), updates);
      setShowCustomerOrders(false);
      
      // Modalı yenile
      window.location.reload();
    } catch (error) {
      console.error("Error adding existing order:", error);
    }
  };
  // Edit butonunun onClick fonksiyonunu güncelleyelim
  const handleEditOrder = (orderKey, orderData) => {
    setEditingOrder({ key: orderKey, data: orderData });
  };
  // Add toggle function for note dates
  const toggleNoteDate = (date) => {
    setExpandedNoteDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  // Group notes by date
  const groupNotesByDate = (notes) => {
    if (!notes) return {};

    return notes.reduce((groups, note) => {
      const date = new Date(note.date);
      const dateKey = date.toLocaleDateString("tr-TR");

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push({
        ...note,
        time: date.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });

      return groups;
    }, {});
  };

  // Handle note add
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setNotesLoading(true);
    try {
      const noteRef = ref(database, `customers/${customer.id}/notes`);
      const newNoteData = {
        content: newNote.trim(),
        date: new Date().toISOString(),
      };

      // Get existing notes or empty array
      const snapshot = await get(noteRef);
      const existingNotes = snapshot.exists() ? snapshot.val() : [];

      // Add new note and update Firebase
      await set(noteRef, [...existingNotes, newNoteData]);

      setNewNote("");
      setIsAddingNote(false);
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setNotesLoading(false);
    }
  };

  // Handle note delete
  const handleDeleteNote = async (dateKey, noteIndex) => {
    try {
      const noteRef = ref(database, `customers/${customer.id}/notes`);
      const snapshot = await get(noteRef);
      if (snapshot.exists()) {
        const notes = snapshot.val();
        
        // Silinecek notun tam indeksini bulmak için gruplanmış notları kontrol edelim
        const groupedNotes = groupNotesByDate(notes);
        // let notesToDelete = groupedNotes[dateKey];
        let actualIndex = -1;
        
        // Tüm notları tarayan bir sayaç
        let counter = 0;
        for (const date of Object.keys(groupedNotes)) {
          for (let i = 0; i < groupedNotes[date].length; i++) {
            if (date === dateKey && i === noteIndex) {
              actualIndex = counter;
              break;
            }
            counter++;
          }
          if (actualIndex !== -1) break;
        }
  
        // Doğru notu sil
        if (actualIndex !== -1) {
          const updatedNotes = notes.filter((_, index) => index !== actualIndex);
          await set(noteRef, updatedNotes);
        }
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  // Update the notes section JSX
  const renderNotes = () => {
    const groupedNotes = groupNotesByDate(customer.notes);
    const sortedDates = Object.keys(groupedNotes).sort(
      (a, b) =>
        new Date(b.split(".").reverse().join("-")) -
        new Date(a.split(".").reverse().join("-"))
    );

    return (
      <div className="space-y-3">
        {sortedDates.map((date) => (
          <div
            key={date}
            className="border border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Date Header with Expand Button */}
            <div
              className="flex items-center justify-between p-3 bg-gray-800 cursor-pointer"
              onClick={() => toggleNoteDate(date)}
            >
              <h3 className="text-sm font-medium text-gray-300">{date}</h3>
              <button className="text-gray-400 hover:text-blue-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {expandedNoteDates[date] ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 15l7-7 7 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  )}
                </svg>
              </button>
            </div>

            {/* Notes List - Collapsible */}
            {expandedNoteDates[date] && (
            <div className="divide-y divide-gray-700">
              {groupedNotes[date]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((note, index) => (
                  <div key={index} className="p-3 relative bg-gray-900/50">
                    <p className="text-gray-300 text-sm pr-8">
                      {note.content}
                    </p>
                    <span className="text-gray-500 text-xs mt-2 block">
                      {note.time}
                    </span>
                    <button
                      onClick={() => handleDeleteNote(date, index)} 
                      className="absolute top-3 right-3 text-gray-500 hover:text-red-400"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
         
      </div>
    );
  };

  // Add categories fetch
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesRef = ref(database, "categories");
        const snapshot = await get(categoriesRef);
        if (snapshot.exists()) {
          setCategories(snapshot.val());
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Add sorting helper function
  const sortByCategories = (a, b) => {
    const categoryA = Object.values(categories).find(
      (cat) => cat.propertyName?.toLowerCase() === a[0].toLowerCase()
    );
    const categoryB = Object.values(categories).find(
      (cat) => cat.propertyName?.toLowerCase() === b[0].toLowerCase()
    );

    // Sort by order value, fallback to 999 if not found
    const orderA = categoryA?.order ?? 999;
    const orderB = categoryB?.order ?? 999;

    return orderA - orderB;
  };

  const toggleExpand = (orderKey) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [orderKey]: !prev[orderKey],
    }));
  };

  useEffect(() => {
    const fetchKontiDetails = async () => {
      const images = {};
      
      // Ana siparişlerin konti resimlerini al
      if (customer.products) {
        for (const [orderKey, orderData] of Object.entries(customer.products)) {
          const kontiProduct = orderData?.konti?.[0];
          if (kontiProduct?.productCollectionId) {
            try {
              const kontiRef = ref(database, `products/konti/${kontiProduct.productCollectionId}`);
              const snapshot = await get(kontiRef);
              if (snapshot.exists()) {
                const kontiData = snapshot.val();
                if (kontiData.images?.[0]) {
                  images[orderKey] = {
                    image: kontiData.images[0],
                    name: kontiData.name || "Konti",
                  };
                }
              }
            } catch (error) {
              console.error("Error fetching konti details:", error);
            }
          }
        }
      }
  
      // Other Orders'ın konti resimlerini al
      if (customer.otherOrders) {
        for (const [orderId, orderData] of Object.entries(customer.otherOrders)) {
          const kontiProduct = orderData.products?.konti?.[0];
          if (kontiProduct?.productCollectionId) {
            try {
              const kontiRef = ref(database, `products/konti/${kontiProduct.productCollectionId}`);
              const snapshot = await get(kontiRef);
              if (snapshot.exists()) {
                const kontiData = snapshot.val();
                if (kontiData.images?.[0]) {
                  images[orderId] = {
                    image: kontiData.images[0],
                    name: kontiData.name || "Konti",
                  };
                }
              }
            } catch (error) {
              console.error("Error fetching other order konti details:", error);
            }
          }
        }
      }
  
      setKontiImages(images);
      setLoading(false);
    };
  
    if (isOpen && customer) {
      fetchKontiDetails();
    }
  }, [isOpen, customer]);

  const getProductsLength = () => {
    if (!customer.products) return 0;
    return Object.keys(customer.products).length;
  };

  const renderProducts = () => {
    const allOrders = [];
  
    // Ana siparişleri ve diğer siparişleri birleştir
    if (customer.products) {
      Object.entries(customer.products).forEach(([orderKey, orderData]) => {
        allOrders.push({
          key: orderKey,
          data: orderData,
          type: 'main',
          dimensions: customer.dimensions,
          pdfUrl: customer.pdfUrl,
          totalPrice: customer.totalPrice,
        });
      });
    }
  
    if (customer.otherOrders) {
      Object.entries(customer.otherOrders).forEach(([orderId, orderData]) => {
        allOrders.push({
          key: orderId,
          data: orderData.products,
          type: 'other',
          dimensions: orderData.dimensions,
          pdfUrl: orderData.pdfUrl,
          totalPrice: orderData.totalPrice,
          sourceCustomer: {
            fullName: orderData.fullName,
            email: orderData.email,
            phone: orderData.phone
          }
        });
      });
    }
  
    return allOrders.map((order) => (
      <div
        key={order.key}
        className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 max-w-md" // max-w-md ekleyerek kartın maksimum genişliğini sınırladım
      >
        {/* Card Header */}
        <div className="p-3 border-b border-gray-700 bg-gray-800/50"> {/* padding'i p-4'ten p-3'e düşürdüm */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"> {/* space-x yerine gap kullandım */}
              {order.dimensions?.kontiWidth && order.dimensions?.kontiHeight && (
                <span className="bg-gray-700/50 px-2 py-0.5 rounded text-xs text-gray-300"> {/* py-1'i py-0.5'e düşürdüm */}
                  {order.dimensions.kontiWidth} x {order.dimensions.kontiHeight}
                </span>
              )}
              {order.type === 'other' && (
                <span className="bg-gray-700/30 px-2 py-0.5 rounded text-xs text-gray-400">
                  Kaynak: {order.sourceCustomer.fullName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1"> {/* space-x-2'yi gap-1'e düşürdüm */}
              <button
                onClick={() => handleEditOrder(order.key, order.data)}
                className="text-gray-400 hover:text-blue-400 p-1"
                title="Düzenle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              {order.pdfUrl && (
                <button
                  onClick={() => window.open(order.pdfUrl, "_blank")}
                  className="text-gray-400 hover:text-blue-400 p-1"
                  title="PDF'i Aç"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => toggleExpand(order.key)}
                className="text-gray-400 hover:text-blue-400 p-1"
                title={expandedProducts[order.key] ? "Daralt" : "Genişlet"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {expandedProducts[order.key] ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  )}
                </svg>
              </button>
            </div>
          </div>
    
          {/* Konti Image */}
          {kontiImages[order.key]?.image && (
            <div className="w-full h-32 rounded-md overflow-hidden"> {/* h-40'ı h-32'ye düşürdüm */}
              <img
                src={kontiImages[order.key].image}
                alt={kontiImages[order.key].name}
                className="w-full h-full object-contain bg-gray-900" // object-cover yerine object-contain kullandım ve bg ekledim
              />
            </div>
          )}
        </div>
    
        {/* Card Content */}
        {expandedProducts[order.key] && (
  <div className="p-2 bg-gray-800/30"> {/* p-3'ten p-2'ye düşürdüm */}
    <div className="space-y-1.5"> {/* space-y-2'den space-y-1.5'e düşürdüm */}
      {Object.entries(order.data)
        .filter(([categoryName]) => 
          categoryName !== "status" && 
          categoryName !== "verandaWidth" && 
          categoryName !== "verandaHeight"
        )
        .sort(sortByCategories)
        .map(([categoryName, products], index) => {
          const category = Object.values(categories).find(
            (cat) => cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
          );

          return (
            <div key={index} className="bg-gray-700/20 px-2 py-1.5 rounded text-xs"> {/* padding'i azalttım ve text-xs ekledim */}
              <div className="font-medium text-gray-300 text-xs"> {/* text-sm'den text-xs'e düşürdüm */}
                {category?.title || categoryName}
              </div>
              <div className="grid grid-cols-2 gap-1 mt-1"> {/* liste yerine grid kullandım */}
                {Object.entries(products).map(([productKey, product]) => (
                  <div 
                    key={productKey} 
                    className="text-gray-400 text-xs truncate ml-1" // truncate ekledim
                  >
                    {product.name || product.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  </div>
)}
    
        {/* Card Footer */}
        <div className="p-3 border-t border-gray-700 bg-gray-800/50"> {/* p-4'ü p-3'e düşürdüm */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Toplam Tutar:</span>
            <span className="text-green-400 font-semibold">
              {order.totalPrice?.toLocaleString("tr-TR")}₺
            </span>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
  title="Müşteri Detayları" 
  description={`${customer.fullName} için müşteri detayları ve siparişler`}
  className="max-w-[90vw] w-[90vw] h-[85vh] max-h-[85vh] p-6"
>
          <div className="flex h-full gap-6">
            {/* Left Section */}
            <div className="flex-1 space-y-6 overflow-y-auto pr-4">
              {/* Customer Header */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-100">{customer.fullName}</h1>
                    <div className="space-y-1 mt-2">
                      <p className="text-gray-400">{customer.email}</p>
                      <p className="text-gray-400">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="bg-blue-900/30 px-4 py-2 rounded-lg">
                      <span className="text-blue-300 font-medium">
                        {getProductsLength()} Sipariş Bulundu
                      </span>
                    </div>
                    {customer.message && (
                      <div className="bg-gray-800 px-4 py-2 rounded-lg">
                        <span className="text-gray-300 text-sm">{customer.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
  
              {/* Products Section */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">Siparişler</h2>
                <div className="grid grid-cols-2 gap-4">
                  {/* Mevcut Siparişler */}
                  {loading ? (
                    <div className="text-gray-400">Yükleniyor...</div>
                  ) : (
                    <>
                      {renderProducts()}
                    </>
                  )}
                  {/* Yeni Sipariş Kartı */}
                  <div 
        className="bg-gray-800/30 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800/50 transition-colors relative border border-gray-700 border-dashed"
        onClick={() => setShowOrderOptions(true)}
      >
        <div className="text-gray-400 text-6xl mb-2">+</div>
        <span className="text-gray-400 text-sm">Yeni Sipariş Ekle</span>
        
        {showOrderOptions && (
          <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-lg shadow-lg p-2 min-w-[200px] border border-gray-700 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Yeni sipariş oluştur
              }}
              className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 rounded"
            >
              Yeni Sipariş Oluştur
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomerOrders(true);
                fetchAvailableCustomers();
              }}
              className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 rounded"
            >
              Mevcut Siparişi Ekle
            </button>
          </div>
        )}
      </div>
  
                  
                </div>
              </div>
            </div>
  
            {/* Right Section - Notes */}
            <div className="w-80 border-l border-gray-700 pl-6 overflow-y-auto">
              <div className="sticky top-0 bg-gray-900 pb-4 z-10">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold text-gray-200">Notlar</h2>
                  <button
                    onClick={() => setIsAddingNote(true)}
                    className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-blue-400/10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                {/* Note adding form */}
                {isAddingNote && (
                  <div className="mt-4 space-y-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Notunuzu yazın..."
                      className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-300 text-sm resize-none focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsAddingNote(false)}
                        className="px-3 py-1 text-sm text-gray-400 hover:text-gray-300"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleAddNote}
                        disabled={notesLoading}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {notesLoading ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
  
              <div className="space-y-4 mt-4">
                {customer.notes?.length > 0 ? renderNotes() : (
                  <p className="text-gray-500">Not bulunmamaktadır.</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  
      {/* Mevcut Siparişler Modal */}
      {showCustomerOrders && (
        <Dialog open={showCustomerOrders} onOpenChange={() => setShowCustomerOrders(false)}>
          <DialogContent className="max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Mevcut Siparişler</h2>
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 p-4">
                {availableCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700"
                    onClick={() => handleAddExistingOrder(customer)}
                  >
                    <h3 className="text-gray-200 font-medium mb-2">{customer.fullName}</h3>
                    {customer.dimensions && (
                      <p className="text-gray-400 text-sm">
                        {customer.dimensions.kontiWidth} x {customer.dimensions.kontiHeight}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
  
      {/* Edit Order Modal */}
      {editingOrder && (
        <OrderEditModal
          isOpen={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          customer={customer}
          orderKey={editingOrder.key}
          orderData={editingOrder.data}
        />
      )}
    </>
  );
};

CustomerDetailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  customer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    fullName: PropTypes.string.isRequired,
    email: PropTypes.string,
    phone: PropTypes.string.isRequired,
    message: PropTypes.string,
    dimensions: PropTypes.shape({
      kontiWidth: PropTypes.number,
      kontiHeight: PropTypes.number,
    }),
    products: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.objectOf(
        PropTypes.shape({
          konti: PropTypes.arrayOf(
            PropTypes.shape({
              productCollectionId: PropTypes.string,
            })
          ),
        })
      ),
    ]),
    otherOrders: PropTypes.objectOf(
      PropTypes.shape({
        products: PropTypes.object,
        dimensions: PropTypes.object,
        message: PropTypes.string,
        totalPrice: PropTypes.number,
        pdfUrl: PropTypes.string,
        addedAt: PropTypes.string,
        fullName: PropTypes.string,
        email: PropTypes.string,
        phone: PropTypes.string
      })
    ),
    totalPrice: PropTypes.number,
    pdfUrl: PropTypes.string,
    notes: PropTypes.arrayOf(
      PropTypes.shape({
        content: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
      })
    ),
  }).isRequired,
};

export default CustomerDetailModal;
