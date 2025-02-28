import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "./dialogForCustomers";
import { ref, get, set } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import OrderDetails from "./OrderDetails";
import BonusItems from "./BonusItems";
import OrderNotes from "./OrderNotes";
import OrderSummary from "./OrderSummary";
import CustomerInfo from "./CustomerInfo";
import PropTypes from "prop-types";
const OrderEditModal = ({
  isOpen,
  onClose,
  customer,
  orderKey,
  orderData,
  initialDimensions,
  isMainOrder = true, // Default to true for backward compatibility
  customerId = null, // This should be passed from CustomerDetailModal
}) => {
  // Ana state'ler
  const [categories, setCategories] = useState({});
  const [products, setProducts] = useState({});
  const [localOrderData, setLocalOrderData] = useState(orderData);
  const [dimensions, setDimensions] = useState({
    kontiWidth: Number(initialDimensions?.kontiWidth || 0),
    kontiHeight: Number(initialDimensions?.kontiHeight || 0),
    verandaWidth: initialDimensions?.verandaWidth || "Seçilmedi",
    verandaHeight: initialDimensions?.verandaHeight || "Seçilmedi",
    length: Number(initialDimensions?.length || 0),
  });
  useEffect(() => {
    setDimensions((prev) => ({
      ...prev,
      kontiWidth: Number(prev.kontiWidth) || 0,
      kontiHeight: Number(prev.kontiHeight) || 0,
      length: Number(prev.length) || 0,
    }));
  }, [localOrderData]);
  // Sol taraf için state'ler (OrderDetails)
  const [editingItem, setEditingItem] = useState(null);
  const [editingValues, setEditingValues] = useState({ name: "", price: "" });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notes, setNotes] = useState(orderData.notes || ""); // Add notes state
  // Sağ taraf için state'ler (BonusItems)
  const [savedItems, setSavedItems] = useState([]);
  const [editingSavedItem, setEditingSavedItem] = useState(null);
  const [editingSavedValues, setEditingSavedValues] = useState({
    category: "",
    product: "",
    price: "",
    priceOnly: false,
  });
  const [newItems, setNewItems] = useState([
    { category: "", product: "", price: "" },
  ]);
  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [categoriesSnapshot, productsSnapshot] = await Promise.all([
          get(ref(database, "categories")),
          get(ref(database, "products")),
        ]);

        if (categoriesSnapshot.exists()) {
          setCategories(categoriesSnapshot.val());
        }
        if (productsSnapshot.exists()) {
          setProducts(productsSnapshot.val());
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
  }, []);

  // Ana kaydetme fonksiyonu
  const handleSaveChanges = async () => {
    try {
      await Promise.all([
        set(ref(database, `customers/${orderKey}/products/0`), localOrderData),
        set(ref(database, `customers/${orderKey}/bonus`), savedItems),
        set(ref(database, `customers/${orderKey}/notes`), notes), // Save notes
      ]);
      onClose();
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[85vh] max-h-[85vh] p-0 flex flex-col bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-100">
              Sipariş Düzenle - {customer.fullName}
            </h1>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="flex-1 flex flex-col h-full border-r border-gray-800">
              <div className="p-4 space-y-4 overflow-y-auto">
                {/* Customer Info Card */}
                <div className="bg-gray-800/40 rounded-lg p-4 backdrop-blur-sm">
                  <CustomerInfo customer={customer} />
                </div>

                {/* Order Details Card */}
                <div className="bg-gray-800/40 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-200">
                      Sipariş Detayları
                    </h2>
                    <span className="text-sm text-gray-400">
                      {
                        Object.keys(localOrderData).filter(
                          (key) =>
                            ![
                              "status",
                              "verandaWidth",
                              "verandaHeight",
                              "dimensions",
                              "kontiWidth",
                              "kontiHeight",
                              "notes",
                            ].includes(key)
                        ).length
                      }{" "}
                      Ürün
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* OrderDetails */}
                    <div className="border-r border-gray-700 pr-3">
                      <div className="mb-3 pb-2 border-b border-gray-700">
                        <h3 className="text-sm font-medium text-gray-300">
                          Ürünler
                        </h3>
                      </div>
                      <OrderDetails
                        categories={categories}
                        products={products}
                        localOrderData={localOrderData}
                        editingItem={editingItem}
                        selectedProduct={selectedProduct}
                        editingValues={editingValues}
                        setEditingItem={setEditingItem}
                        setSelectedProduct={setSelectedProduct}
                        setEditingValues={setEditingValues}
                        setLocalOrderData={setLocalOrderData}
                        orderKey={orderKey}
                        dimensions={dimensions}
                        setDimensions={setDimensions}
                      />
                    </div>

                    {/* Bonus Items */}
                    <div className="pl-3">
                      <div className="mb-3 pb-2 border-b border-gray-700">
                        <h3 className="text-sm font-medium text-gray-300">
                          Bonus Ürünler
                        </h3>
                      </div>
                      <BonusItems
                        localOrderData={localOrderData}
                        savedItems={savedItems}
                        newItems={newItems}
                        categories={categories}
                        products={products}
                        editingSavedItem={editingSavedItem}
                        editingSavedValues={editingSavedValues}
                        setSavedItems={setSavedItems}
                        setNewItems={setNewItems}
                        setEditingSavedItem={setEditingSavedItem}
                        setEditingSavedValues={setEditingSavedValues}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Split into two sections */}
            <div className="w-[300px] flex flex-col h-full bg-gray-800/30 border-l border-gray-700">
              {/* Notes Section */}
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-3">
                  <OrderNotes
                    orderKey={orderKey}
                    isMainOrder={isMainOrder}
                    customerId={customerId} // Use customerId if provided, else fallback to customer.id
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm p-4">
          <OrderSummary
            orderData={localOrderData}
            savedItems={savedItems}
            onSave={handleSaveChanges}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

OrderEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  customer: PropTypes.shape({
    fullName: PropTypes.string.isRequired,
    email: PropTypes.string,
    phone: PropTypes.string,
  }).isRequired,
  orderKey: PropTypes.string.isRequired,
  orderData: PropTypes.shape({
    status: PropTypes.string,
    notes: PropTypes.string,
    dimensions: PropTypes.shape({
      kontiWidth: PropTypes.number,
      kontiHeight: PropTypes.number,
      verandaWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      verandaHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      length: PropTypes.number,
    }),
    // Her kategori için dinamik nesne yapısı
    [PropTypes.string]: PropTypes.objectOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        price: PropTypes.number.isRequired,
        productCollectionId: PropTypes.string,
      })
    ),
  }).isRequired,
  initialDimensions: PropTypes.shape({
    kontiWidth: PropTypes.number,
    kontiHeight: PropTypes.number,
    verandaWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    verandaHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    length: PropTypes.number,
  }),
  isMainOrder: PropTypes.bool,
  customerId: PropTypes.string,
};

export default OrderEditModal;
