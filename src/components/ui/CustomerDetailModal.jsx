import { Dialog, DialogContent } from './dialog';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { ref, get,set } from 'firebase/database';
import { database } from '../../firebase/firebaseConfig';

const CustomerDetailModal = ({ isOpen, onClose, customer }) => {
  // const [orders, setOrders] = useState([]);
  const [kontiImages, setKontiImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState({});
  const [categories, setCategories] = useState({});
    // Add new states for notes
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [notesLoading, setNotesLoading] = useState(false);
    const [expandedNoteDates, setExpandedNoteDates] = useState({});

// Add toggle function for note dates
const toggleNoteDate = (date) => {
  setExpandedNoteDates(prev => ({
    ...prev,
    [date]: !prev[date]
  }));
};
  
    // Group notes by date
    const groupNotesByDate = (notes) => {
      if (!notes) return {};
      
      return notes.reduce((groups, note) => {
        const date = new Date(note.date);
        const dateKey = date.toLocaleDateString('tr-TR');
        
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        
        groups[dateKey].push({
          ...note,
          time: date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
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
          date: new Date().toISOString()
        };
        
        // Get existing notes or empty array
        const snapshot = await get(noteRef);
        const existingNotes = snapshot.exists() ? snapshot.val() : [];
        
        // Add new note and update Firebase
        await set(noteRef, [...existingNotes, newNoteData]);
        
        setNewNote('');
        setIsAddingNote(false);
      } catch (error) {
        console.error('Error adding note:', error);
      } finally {
        setNotesLoading(false);
      }
    };
  
    // Handle note delete
    const handleDeleteNote = async (noteIndex) => {
      try {
        const noteRef = ref(database, `customers/${customer.id}/notes`);
        const snapshot = await get(noteRef);
        if (snapshot.exists()) {
          const notes = snapshot.val();
          const updatedNotes = notes.filter((_, index) => index !== noteIndex);
          await set(noteRef, updatedNotes);
        }
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    };
  
    // Update the notes section JSX
    const renderNotes = () => {
      const groupedNotes = groupNotesByDate(customer.notes);
      const sortedDates = Object.keys(groupedNotes).sort((a, b) => 
        new Date(b.split('.').reverse().join('-')) - new Date(a.split('.').reverse().join('-'))
      );
  
      return (
        <div className="space-y-3">
          {sortedDates.map(date => (
            <div key={date} className="border border-gray-700 rounded-lg overflow-hidden">
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
                        <p className="text-gray-300 text-sm pr-8">{note.content}</p>
                        <span className="text-gray-500 text-xs mt-2 block">{note.time}</span>
                        <button
                          onClick={() => handleDeleteNote(index)}
                          className="absolute top-3 right-3 text-gray-500 hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
        const categoriesRef = ref(database, 'categories');
        const snapshot = await get(categoriesRef);
        if (snapshot.exists()) {
          setCategories(snapshot.val());
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Add sorting helper function
  const sortByCategories = (a, b) => {
    const categoryA = Object.values(categories).find(
      cat => cat.propertyName?.toLowerCase() === a[0].toLowerCase()
    );
    const categoryB = Object.values(categories).find(
      cat => cat.propertyName?.toLowerCase() === b[0].toLowerCase()
    );
    
    // Sort by order value, fallback to 999 if not found
    const orderA = categoryA?.order ?? 999;
    const orderB = categoryB?.order ?? 999;
    
    return orderA - orderB;
  };

  const toggleExpand = (orderKey) => {
    setExpandedProducts(prev => ({
      ...prev,
      [orderKey]: !prev[orderKey]
    }));
  };

  useEffect(() => {
    const fetchKontiDetails = async () => {
      if (!customer.products) return;

      const images = {};
      for (const [orderKey, orderData] of Object.entries(customer.products)) {
        // Konti product ID'sini bul
        const kontiProduct = orderData?.konti?.[0];
        if (kontiProduct?.productCollectionId) {
          try {
            // Firebase'den konti detaylarını al
            const kontiRef = ref(database, `products/konti/${kontiProduct.productCollectionId}`);
            const snapshot = await get(kontiRef);
            if (snapshot.exists()) {
              const kontiData = snapshot.val();
              // İlk resmi al ve sakla
              if (kontiData.images && kontiData.images.length > 0) {
                images[orderKey] = {
                  image: kontiData.images[0],
                  name: kontiData.name || 'Konti'
                };
              }
            }
          } catch (error) {
            console.error('Error fetching konti details:', error);
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
        {/* Header with dimensions and buttons */}
        <div className="flex items-start justify-between mb-3">
  {/* Dimensions */}
  {customer.dimensions?.kontiWidth && customer.dimensions?.kontiHeight && (
    <div className="text-gray-300 bg-gray-700/50 px-2 py-1 rounded text-xs">
      {customer.dimensions.kontiWidth} x {customer.dimensions.kontiHeight}
    </div>
  )}
  
  {/* Action Buttons */}
  <div className="flex gap-2">
    {/* Edit Button */}
    <button className="text-gray-400 hover:text-blue-400">
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

    {/* PDF Button */}
    {customer.pdfUrl && (
      <button 
        className="text-gray-400 hover:text-blue-400"
        onClick={() => window.open(customer.pdfUrl, '_blank')}
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
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
          />
        </svg>
      </button>
    )}

    {/* Expand Button */}
    <button 
      onClick={() => toggleExpand(orderKey)}
      className="text-gray-400 hover:text-blue-400"
    >
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {expandedProducts[orderKey] ? (
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
        {kontiImages[orderKey]?.image && (
          <div className="w-full h-32 mb-3 rounded-md overflow-hidden">
            <img 
              src={kontiImages[orderKey].image} 
              alt={kontiImages[orderKey].name} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Products List - Collapsible */}
        {expandedProducts[orderKey] && (
  <div className="space-y-1.5 mt-2">
    {Object.entries(orderData)
      .filter(([categoryName]) => 
        categoryName !== 'status' && 
        categoryName !== 'verandaWidth' && 
        categoryName !== 'verandaHeight'
      )
      .sort(sortByCategories)
      .map(([categoryName, products], index) => {
        // Find matching category by propertyName
        const category = Object.values(categories).find(
          cat => cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );
        
        return (
          <div key={index} className="text-gray-400 text-sm">
            <div className="font-medium text-gray-300">
              {category?.title || categoryName}
            </div>
            {Object.entries(products).map(([productKey, product]) => (
              <div key={productKey} className="ml-2 text-gray-400 text-xs">
                {product.name || product.title}
              </div>
            ))}
          </div>
        );
      })}
  </div>
)}
        {/* Total Price */}
        <div className="mt-2 text-right border-t border-gray-700 pt-2 flex justify-between items-center">
  <span className="text-gray-400 text-sm">Fiyat:</span>
  <span className="text-green-400 font-semibold text-sm">
    {customer.totalPrice.toLocaleString("tr-TR")}₺
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
  <div className="flex items-start justify-between mb-4">
    <div>
      <h1 className="text-3xl font-bold text-gray-100 mb-2">{customer.fullName}</h1>
      <div className="space-y-1">
        <p className="text-gray-400">{customer.email}</p>
        <p className="text-gray-400">{customer.phone}</p>
      </div>
    </div>
    <div className="flex flex-col gap-2">
      <div className="bg-blue-900/30 px-4 py-2 rounded-lg whitespace-nowrap">
        <span className="text-blue-300">
          {getProductsLength()} Sipariş Bulundu
        </span>
      </div>
      {customer.message && (
        <div className="bg-gray-800/50 px-4 py-2 rounded-lg">
          <span className="text-gray-300 text-sm">{customer.message}</span>
        </div>
      )}
    </div>
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
  <div className="flex items-center gap-3 mb-4">
    <h2 className="text-xl font-semibold text-gray-200">Notlar</h2>
    <button
      onClick={() => setIsAddingNote(true)}
      className="text-blue-400 hover:text-blue-300"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </div>

      {isAddingNote && (
        <div className="mb-4 space-y-2">
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

      <div className="space-y-4">
        {customer.notes?.length > 0 ? renderNotes() : (
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
    id: PropTypes.string.isRequired,
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