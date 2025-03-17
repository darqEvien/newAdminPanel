import { Dialog, DialogContent } from "./dialogForCustomers";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { ref, get, set, update } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import OrderEditModal from "./OrderEditModal";
import ReactDOM from "react-dom";

const ensureNotesArray = (notes) => {
  if (!notes) return [];

  // If notes is already an array
  if (Array.isArray(notes)) return notes;

  // If notes is a string, convert to array format with a single entry
  if (typeof notes === "string") {
    return [
      {
        content: notes,
        date: new Date().toISOString(),
      },
    ];
  }

  // If it's an object but not an array (like from Firebase)
  if (typeof notes === "object") {
    return Object.values(notes);
  }

  return [];
};

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
      const customersRef = ref(database, "customers");
      const snapshot = await get(customersRef);
      if (snapshot.exists()) {
        const customers = Object.entries(snapshot.val())
          .filter(([id]) => id !== customer.id) // Mevcut müşteriyi hariç tut
          .map(([id, data]) => ({
            id,
            fullName: data.fullName || "",
            email: data.email || "",
            phone: data.phone || "",
            products: data.products || {},
            dimensions: data.dimensions || {},
            totalPrice: data.totalPrice || 0,
            message: data.message || "",
            pdfUrl: data.pdfUrl || "",
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
        fullName: selectedCustomer.fullName || "",
        email: selectedCustomer.email || "",
        phone: selectedCustomer.phone || "",
      };

      // Opsiyonel alanları sadece varsa ekleyelim
      if (selectedCustomer.message) {
        orderData.message = selectedCustomer.message;
      }
      if (selectedCustomer.pdfUrl) {
        orderData.pdfUrl = selectedCustomer.pdfUrl;
      }

      const updates = {};
      updates[`customers/${customer.id}/otherOrders/${selectedCustomer.id}`] =
        orderData;

      await update(ref(database), updates);
      setShowCustomerOrders(false);

      // Modalı yenile
      window.location.reload();
    } catch (error) {
      console.error("Error adding existing order:", error);
    }
  };
  // Yeni sipariş oluştur fonksiyonu
  const handleCreateNewOrder = () => {
    // Yeni boş bir sipariş oluştur
    const newOrderKey = `new-${Date.now()}`;

    // Varsayılan/boş sipariş verisi oluştur
    const emptyOrderData = {
      konti: [], // Boş konti listesi
    };

    // Sipariş düzenleme modalını aç
    setEditingOrder({
      key: newOrderKey,
      data: emptyOrderData,
      dimensions: customer.dimensions || { kontiWidth: 0, kontiHeight: 0 },
      sourceCustomer: {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
      type: "main",
      isNewOrder: true, // Yeni sipariş olduğunu belirt
    });

    // Sipariş seçenekleri menüsünü kapat
    setShowOrderOptions(false);
  };

  // Edit butonunun onClick fonksiyonunu güncelleyelim
  const handleEditOrder = (
    orderKey,
    orderData,
    dimensions,
    sourceCustomer = null,
    orderType = "main" // Add this parameter
  ) => {
    setEditingOrder({
      key: orderKey,
      data: orderData,
      dimensions: dimensions || customer.dimensions,
      // sourceCustomer varsa onu kullan, yoksa ana müşteri bilgilerini kullan
      sourceCustomer: sourceCustomer || {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
      type: orderType, // Add this property
    });
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
    const safeNotes = ensureNotesArray(notes);

    if (!safeNotes.length) return {};

    return safeNotes.reduce((groups, note) => {
      // Make sure note has a valid date
      const date = note.date ? new Date(note.date) : new Date();
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

  // Update the notes section JSX
  const renderNotes = () => {
    // Only proceed if we actually have notes
    if (!customer.notes) {
      return <p className="text-gray-500">Not bulunmamaktadır.</p>;
    }

    const groupedNotes = groupNotesByDate(customer.notes);

    // If we ended up with no grouped notes, show no notes message
    if (Object.keys(groupedNotes).length === 0) {
      return <p className="text-gray-500">Not bulunmamaktadır.</p>;
    }

    const sortedDates = Object.keys(groupedNotes).sort(
      (a, b) =>
        new Date(b.split(".").reverse().join("-")) -
        new Date(a.split(".").reverse().join("-"))
    );

    // Rest of the function remains the same
    return (
      <div className="space-y-3">
        {sortedDates.map((date) => (
          // Existing JSX
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
  const handleDeleteNote = async (dateKey, noteIndex) => {
    try {
      const noteRef = ref(database, `customers/${customer.id}/notes`);
      const snapshot = await get(noteRef);

      if (snapshot.exists()) {
        const notesData = snapshot.val();

        // Convert notes to array format if needed
        const notes = ensureNotesArray(notesData);

        // Rest of the function remains the same
        const groupedNotes = groupNotesByDate(notes);
        let actualIndex = -1;
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

        if (actualIndex !== -1) {
          const updatedNotes = notes.filter(
            (_, index) => index !== actualIndex
          );
          await set(noteRef, updatedNotes);
        }
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };
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
      let existingNotes = [];

      if (snapshot.exists()) {
        existingNotes = ensureNotesArray(snapshot.val());
      }

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
              const kontiRef = ref(
                database,
                `products/konti/${kontiProduct.productCollectionId}`
              );
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
        for (const [orderId, orderData] of Object.entries(
          customer.otherOrders
        )) {
          const kontiProduct = orderData.products?.konti?.[0];
          if (kontiProduct?.productCollectionId) {
            try {
              const kontiRef = ref(
                database,
                `products/konti/${kontiProduct.productCollectionId}`
              );
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
    let count = 0;

    // Count main products
    if (customer.products) {
      count += Object.keys(customer.products).length;
    }

    // Count other orders
    if (customer.otherOrders) {
      count += Object.keys(customer.otherOrders).length;
    }

    return count;
  };
  // Bu kodu diğer useEffect'lerin yanına ekleyin
  useEffect(() => {
    if (showOrderOptions) {
      const handleClickOutside = (event) => {
        // Eğer tıklanan eleman "Yeni Sipariş Ekle" menüsü veya içindeki elemanlar değilse
        if (
          !event.target.closest("#new-order-options") &&
          !event.target.closest("#new-order-button")
        ) {
          setShowOrderOptions(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showOrderOptions]);
  const renderProducts = () => {
    const allOrders = [];

    // Ana siparişleri ve diğer siparişleri birleştir
    if (customer.products) {
      Object.entries(customer.products).forEach(([orderKey, orderData]) => {
        allOrders.push({
          key: orderKey,
          data: orderData,
          type: "main",
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
          type: "other",
          dimensions: orderData.dimensions,
          pdfUrl: orderData.pdfUrl,
          totalPrice: orderData.totalPrice,
          sourceCustomer: {
            fullName: orderData.fullName,
            email: orderData.email,
            phone: orderData.phone,
          },
        });
      });
    }

    return allOrders.map((order) => (
      <div
        key={order.key}
        className="bg-gradient-to-b from-gray-800 to-gray-800/90 rounded-lg overflow-hidden border border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300 hover:border-gray-600/70"
      >
        {/* Card Header */}
        <div className="p-3 border-b border-gray-700/70 bg-gray-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {order.dimensions?.kontiWidth &&
                order.dimensions?.kontiHeight && (
                  <div className="bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-600/20">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                        />
                      </svg>
                      <span className="text-xs text-blue-300 font-medium">
                        {order.dimensions.kontiWidth} ×{" "}
                        {order.dimensions.kontiHeight}
                        <span className="ml-1 text-blue-400/70 font-normal">
                          (
                          {(
                            order.dimensions.kontiWidth *
                            order.dimensions.kontiHeight
                          ).toFixed(2)}{" "}
                          m²)
                        </span>
                      </span>
                    </div>
                  </div>
                )}

              {order.type === "other" && (
                <span className="bg-purple-500/10 px-2 py-0.5 rounded text-xs text-purple-300 border border-purple-500/20">
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
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
                    <span>{order.sourceCustomer.fullName}</span>
                  </div>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  handleEditOrder(
                    order.key,
                    order.data,
                    order.type === "other"
                      ? order.dimensions
                      : customer.dimensions,
                    order.type === "other" ? order.sourceCustomer : null,
                    order.type
                  )
                }
                className="text-gray-400 hover:text-blue-400 p-1.5 hover:bg-blue-400/10 rounded-md transition-colors"
                title="Düzenle"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>

              {order.pdfUrl && (
                <button
                  onClick={() => window.open(order.pdfUrl, "_blank")}
                  className="text-gray-400 hover:text-green-400 p-1.5 hover:bg-green-400/10 rounded-md transition-colors"
                  title="PDF'i Aç"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              )}

              <button
                onClick={() => toggleExpand(order.key)}
                className="text-gray-400 hover:text-blue-400 p-1.5 hover:bg-blue-400/10 rounded-md transition-colors"
                title={expandedProducts[order.key] ? "Daralt" : "Genişlet"}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {expandedProducts[order.key] ? (
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
          </div>

          {/* Konti Image */}
          {kontiImages[order.key]?.image && (
            <div className="w-full h-32 rounded-md overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800">
              <img
                src={kontiImages[order.key].image}
                alt={kontiImages[order.key].name}
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
        </div>

        {/* Card Content - Product Details (Expandable) */}
        {expandedProducts[order.key] && (
          <div className="p-3 bg-gray-800/30">
            <div className="space-y-2">
              {Object.entries(order.data)
                .filter(
                  ([categoryName]) =>
                    categoryName !== "status" &&
                    categoryName !== "verandaWidth" &&
                    categoryName !== "verandaHeight"
                )
                .sort(sortByCategories)
                .map(([categoryName, products], index) => {
                  const category = Object.values(categories).find(
                    (cat) =>
                      cat.propertyName?.toLowerCase() ===
                      categoryName.toLowerCase()
                  );

                  return (
                    <div
                      key={index}
                      className="bg-gray-700/20 px-3 py-2 rounded-md border border-gray-700/30"
                    >
                      <div className="font-medium text-gray-300 text-xs mb-1.5 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        {category?.title || categoryName}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(products).map(
                          ([productKey, product]) => (
                            <div
                              key={productKey}
                              className="flex items-center gap-1"
                            >
                              <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                              <span className="text-gray-400 text-xs truncate">
                                {product.name || product.title}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Card Footer */}
        <div className="p-3 border-t border-gray-700/70 bg-gradient-to-r from-gray-800/50 to-gray-800/30">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs font-medium">
              Toplam Tutar:
            </span>
            <span className="text-green-400 font-semibold bg-green-400/10 px-2.5 py-1 rounded border border-green-500/20">
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
            <div className="flex-1 space-y-6 overflow-y-auto pr-4 custom-scrollbar">
              {/* Customer Header */}
              <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    {/* Customer Avatar */}
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                      {customer.fullName?.charAt(0).toUpperCase()}
                    </div>

                    {/* Customer Info */}
                    <div>
                      <h1 className="text-2xl font-bold text-gray-100">
                        {customer.fullName}
                      </h1>
                      <div className="space-y-1.5 mt-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <p>{customer.email || "Email belirtilmemiş"}</p>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          <p>{customer.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {/* Order Count Badge */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 rounded-lg shadow-md">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-blue-200"
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
                        <span className="text-blue-100 font-medium">
                          {getProductsLength()}{" "}
                          {getProductsLength() === 1 ? "Sipariş" : "Sipariş"}{" "}
                          Bulundu
                        </span>
                      </div>
                    </div>

                    {/* Customer Message */}
                    {customer.message && (
                      <div className="bg-gray-700/40 px-4 py-2.5 rounded-lg border border-gray-600/50 max-w-xs">
                        <div className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                            />
                          </svg>
                          <span className="text-gray-300 text-sm line-clamp-3 overflow-hidden">
                            {customer.message}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Products Section */}
              {/* Products Section */}
              <div className="bg-gradient-to-b from-gray-800/70 to-gray-800/40 rounded-lg shadow-lg border border-gray-700/40 overflow-hidden">
                {/* Header with Icon */}
                <div className="p-4 border-b border-gray-700/50 bg-gray-800/70 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <svg
                        className="w-5 h-5 text-blue-400"
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
                    <h2 className="text-xl font-semibold text-gray-200">
                      Siparişler
                    </h2>
                  </div>

                  {/* Order count badge */}
                  <span className="bg-blue-600/20 text-blue-400 text-xs px-2.5 py-1 rounded-full font-medium">
                    {getProductsLength()}{" "}
                    {getProductsLength() === 1 ? "Sipariş" : "Siparişler"}
                  </span>
                </div>

                {/* Orders Grid */}
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-5">
                    {/* Existing Orders */}
                    {loading ? (
                      <div className="col-span-2 flex justify-center items-center p-8">
                        <div className="inline-flex items-center gap-2 text-gray-400">
                          <svg
                            className="animate-spin w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span>Siparişler yükleniyor...</span>
                        </div>
                      </div>
                    ) : (
                      <>{renderProducts()}</>
                    )}

                    {/* Add New Order Card */}
                    <div
                      id="new-order-button"
                      className="bg-gradient-to-b from-gray-800/50 to-gray-800/30 rounded-lg overflow-hidden border border-gray-700/60 border-dashed hover:border-blue-500/40 transition-all duration-300 group cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation(); // Bu satırı ekleyin
                        setShowOrderOptions(true);
                      }}
                    >
                      <div className="flex flex-col items-center justify-center h-full p-8 relative">
                        <div className="h-14 w-14 rounded-full bg-gray-700/40 group-hover:bg-blue-600/20 flex items-center justify-center mb-3 transition-colors duration-300">
                          <svg
                            className="w-6 h-6 text-gray-400 group-hover:text-blue-400 transition-colors duration-300"
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
                        </div>
                        <span className="text-gray-400 group-hover:text-blue-400 font-medium transition-colors duration-300">
                          Yeni Sipariş Ekle
                        </span>

                        {showOrderOptions && (
                          <div
                            id="new-order-options"
                            className="fixed bg-gray-800 rounded-lg shadow-xl p-1 min-w-[220px] border border-gray-700 z-[9999]"
                            style={{
                              top: "auto", // Top değerini sıfırlayalım
                              left: "auto", // Left değerini sıfırlayalım
                              position: "fixed", // Modal içindeki herhangi bir relative elementten etkilenmemesi için fixed kullanıyoruz
                            }}
                            ref={(el) => {
                              // Menu elemanını konumlandırmak için buton referansını alalım
                              if (
                                el &&
                                document.getElementById("new-order-button")
                              ) {
                                const buttonRect = document
                                  .getElementById("new-order-button")
                                  .getBoundingClientRect();
                                el.style.top = `${buttonRect.bottom + 10}px`; // Butonun alt kısmından 10px aşağıda
                                el.style.left = `${
                                  buttonRect.left +
                                  buttonRect.width / 2 -
                                  el.offsetWidth / 2
                                }px`; // Butonun ortasına hizala
                              }
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateNewOrder();
                              }}
                              className="w-full text-left px-4 py-2.5 text-gray-300 hover:bg-gray-700 rounded-md flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4 text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                              Yeni Sipariş Oluştur
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowCustomerOrders(true);
                                fetchAvailableCustomers();
                              }}
                              className="w-full text-left px-4 py-2.5 text-gray-300 hover:bg-gray-700 rounded-md flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4 text-green-400"
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
                              Mevcut Siparişi Ekle
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-80 border-l border-gray-700 pl-6 overflow-y-auto custom-scrollbar">
              <div className="sticky top-0 bg-gray-900 pb-4 z-20">
                {/* Notes Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-indigo-500/20 p-1.5 rounded-md">
                      <svg
                        className="w-4 h-4 text-indigo-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-200">
                      Notlar
                    </h2>
                  </div>

                  <button
                    onClick={() => setIsAddingNote(true)}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-400/10 transition-colors mr-7"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span className="text-sm">Yeni Not</span>
                  </button>
                </div>

                {/* Note adding form */}
                {isAddingNote && (
                  <div className="mt-4 space-y-2 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 shadow-sm">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Notunuzu yazın..."
                      className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-300 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsAddingNote(false)}
                        className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300 border border-transparent hover:border-gray-700 rounded"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleAddNote}
                        disabled={notesLoading || !newNote.trim()}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        {notesLoading ? (
                          <div className="flex items-center gap-1.5">
                            <svg
                              className="animate-spin w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            <span>Kaydediliyor</span>
                          </div>
                        ) : (
                          "Kaydet"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes List */}
              <div className="space-y-4 mt-4">
                {customer.notes?.length > 0 ? (
                  // Enhanced renderNotes implementation would be here
                  // Using the existing renderNotes function
                  renderNotes()
                ) : (
                  <div className="text-center py-8 px-4">
                    <div className="bg-gray-800/30 rounded-full w-12 h-12 flex items-center justify-center mb-2 mx-auto">
                      <svg
                        className="w-6 h-6 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-500">Not bulunmamaktadır.</p>
                    <button
                      onClick={() => setIsAddingNote(true)}
                      className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      İlk notu ekle
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mevcut Siparişler Modal */}
      {showCustomerOrders && (
        <Dialog
          open={showCustomerOrders}
          onOpenChange={() => setShowCustomerOrders(false)}
        >
          <DialogContent className="max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Mevcut Siparişler
            </h2>
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 p-4">
                {availableCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700"
                    onClick={() => handleAddExistingOrder(customer)}
                  >
                    <h3 className="text-gray-200 font-medium mb-2">
                      {customer.fullName}
                    </h3>
                    {customer.dimensions && (
                      <p className="text-gray-400 text-sm">
                        {customer.dimensions.kontiWidth} x{" "}
                        {customer.dimensions.kontiHeight}
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
          customer={editingOrder.sourceCustomer}
          orderKey={editingOrder.key}
          orderData={editingOrder.data}
          initialDimensions={editingOrder.dimensions}
          isMainOrder={editingOrder.type !== "other"} // Add this line
          customerId={customer.id} // Add this line
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
        phone: PropTypes.string,
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
