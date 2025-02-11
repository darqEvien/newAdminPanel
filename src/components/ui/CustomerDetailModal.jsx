import { Dialog, DialogContent } from './dialog';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase/firebaseConfig';

const CustomerDetailModal = ({ isOpen, onClose, customer }) => {
  const [orders, setOrders] = useState([]);
  const [kontiImages, setKontiImages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKontiDetails = async () => {
      if (!customer.products) return;

      const images = {};
      for (const [orderKey, orderData] of Object.entries(customer.products)) {
        for (const [categoryName, products] of Object.entries(orderData)) {
          if (categoryName === 'konti' && products.propertyName) {
            try {
              const kontiRef = ref(database, `products/konti/${products.propertyName}`);
              const snapshot = await get(kontiRef);
              if (snapshot.exists()) {
                images[orderKey] = snapshot.val();
              }
            } catch (error) {
              console.error('Error fetching konti details:', error);
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
    if (!customer.products) return null;

    return Object.entries(customer.products).map(([orderKey, orderData]) => (
      <div 
        key={orderKey}
        className="bg-gray-800 rounded-lg p-3 border border-gray-700 relative max-w-[220px]"
      >
        {/* Edit Icon */}
        <button className="absolute top-2 right-2 text-gray-400 hover:text-blue-400 z-10">
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
            />
          </svg>
        </button>

        {/* Konti Image */}
        {kontiImages[orderKey]?.images?.[0] && (
          <div className="w-full h-28 mb-3 rounded-md overflow-hidden">
            <img 
              src={kontiImages[orderKey].images[0]} 
              alt={kontiImages[orderKey].name} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Konti Dimensions */}
        {customer.dimensions?.kontiWidth && customer.dimensions?.kontiHeight && (
          <div className="text-gray-300 mb-3 bg-gray-700/50 px-2 py-1 rounded text-xs">
            {customer.dimensions.kontiWidth} x {customer.dimensions.kontiHeight}
          </div>
        )}

        {/* Products List */}
        <div className="space-y-1.5 mt-2">
          {Object.entries(orderData).map(([categoryName, products], index) => {
            if (categoryName === 'status' || categoryName === 'verandaWidth' || categoryName === 'verandaHeight') return null;
            return (
              <div key={index} className="text-gray-400 text-sm">
                <div className="font-medium text-gray-300">{categoryName}</div>
                {Object.entries(products).map(([productKey, product]) => (
                  <div key={productKey} className="ml-2 text-gray-400 text-xs">
                    {product.name || product.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Total Price */}
        <div className="mt-2 text-right border-t border-gray-700 pt-2">
          <span className="text-green-400 font-semibold text-sm">
            {customer.totalPrice}₺
          </span>
        </div>
      </div>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[85vh] max-h-[85vh] overflow-y-auto">
        <div className="flex h-full gap-6">
          <div className="flex-1 space-y-6">
            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-100">{customer.fullName}</h1>
                <div className="bg-blue-900/30 px-4 py-2 rounded-lg">
                  <span className="text-blue-300">
                    {getProductsLength()} Sipariş Bulundu
                  </span>
                </div>
              </div>
              
              {customer.message && (
                <div className="mb-4 bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Sipariş Notu</h3>
                  <p className="text-gray-400 text-sm">{customer.message}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-gray-400">{customer.email}</p>
                <p className="text-gray-400">{customer.phone}</p>
              </div>
            </div>

            {/* Products Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-200 mb-4">Siparişler</h2>
              <div className="grid grid-cols-2 gap-4">
                {loading ? (
                  <div className="text-gray-400">Yükleniyor...</div>
                ) : (
                  renderProducts()
                )}
              </div>
            </div>

            {/* Create Button */}
            <div className="mt-6">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Yeni Sipariş Oluştur
              </button>
            </div>
          </div>

          {/* Right Section - Notes */}
          <div className="w-80 border-l border-gray-700 pl-6">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">Notlar</h2>
            <div className="space-y-4">
              {customer.notes ? (
                customer.notes.map((note, index) => (
                  <div 
                    key={index}
                    className="bg-gray-800 p-3 rounded-lg border border-gray-700"
                  >
                    <p className="text-gray-300 text-sm">{note.content}</p>
                    <span className="text-gray-500 text-xs mt-2 block">
                      {new Date(note.date).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Not bulunmamaktadır.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

CustomerDetailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  customer: PropTypes.shape({
    fullName: PropTypes.string.isRequired,
    email: PropTypes.string,
    phone: PropTypes.string.isRequired,
    message: PropTypes.string,
    dimensions: PropTypes.shape({
      kontiWidth: PropTypes.number,
      kontiHeight: PropTypes.number
    }),
    products: PropTypes.objectOf(
      PropTypes.shape({
        konti: PropTypes.shape({
          propertyName: PropTypes.string,
          products: PropTypes.array
        }),
        status: PropTypes.string
      })
    ),
    totalPrice: PropTypes.number,
    pdfUrl: PropTypes.string,
    notes: PropTypes.arrayOf(
      PropTypes.shape({
        content: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired
      })
    )
  }).isRequired
};

export default CustomerDetailModal;