import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaFilePdf, FaCheck, FaTimes, FaExpandAlt, FaCompressAlt } from 'react-icons/fa';
import { ref, get } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import { Card, CardHeader, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';

const OrderCard = ({ order, onApprove, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDimensionsDisplay = () => {
    const dimensions = [];
  
    // Konteyner boyutlarını kontrol et
    if (order.dimensions?.kontiWidth && order.dimensions?.kontiHeight) {
      dimensions.push(
        `Konteyner Ebatları: ${order.dimensions.kontiWidth} x ${order.dimensions.kontiHeight}`
      );
    }
  
    // Veranda boyutlarını kontrol et
    if (order.dimensions?.verandaWidth && order.dimensions?.verandaHeight) {
      dimensions.push(
        `Veranda Ebatları: ${order.dimensions.verandaWidth} x ${order.dimensions.verandaHeight}`
      );
    }
  
    // Hiç boyut yoksa
    if (dimensions.length === 0) {
      return 'Boyutlar belirtilmemiş';
    }
  
    // Boyutları alt alta göster
    return dimensions.join('\n');
  };

  const [categories, setCategories] = useState({});
  const [sortedCategories, setSortedCategories] = useState([]);

  // Firebase'den categories verilerini al
  useEffect(() => {
    const fetchCategories = async () => {
      // Categories verisi bir kez indirilip localStorage'da saklanabilir
      const cachedCategories = localStorage.getItem('categories');
      if (cachedCategories) {
        const parsedCategories = JSON.parse(cachedCategories);
        setCategories(parsedCategories);
        setSortedCategories(
          Object.entries(parsedCategories)
            .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0))
            .reduce((acc, [, category]) => {
              if (category.propertyName) {
                acc.push(category.propertyName);
              }
              return acc;
            }, [])
        );
        return;
      }
  
      const categoriesRef = ref(database, 'categories');
      try {
        const snapshot = await get(categoriesRef);
        if (snapshot.exists()) {
          const categoriesData = snapshot.val();
          // Categories verisini localStorage'a kaydet
          localStorage.setItem('categories', JSON.stringify(categoriesData));
          setCategories(categoriesData);

          // Kategorileri order'a göre sırala
          const sorted = Object.entries(categoriesData)
            .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0))
            .reduce((acc, [, category]) => {
              if (category.propertyName) {
                acc.push(category.propertyName);
              }
              return acc;
            }, []);
          setSortedCategories(sorted);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  const renderProducts = () => {
    if (!order.products || !categories || sortedCategories.length === 0) return null;

    return (
      <div className="space-y-4">
        {sortedCategories.map(propertyName => {
          const productData = order.products[propertyName];
          if (!productData?.selected) return null;

          // Kategori bilgisini bul
          const category = Object.values(categories).find(cat => cat.propertyName === propertyName);
          if (!category) return null;

          return (
            <div key={propertyName} className="mb-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-200">
                {category.title}
              </h4>
              {/* Eğer products array'i varsa onları göster */}
              {productData.products && (
                <ul className="ml-4">
                  {productData.products.map((product, index) => (
                    <li 
                      key={`${propertyName}-${index}`}
                      className="text-sm text-gray-600 dark:text-gray-300"
                    >
                      {product.name} - {product.price.toLocaleString('tr-TR')}₺
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  };


  return (
    <Card className={`relative transition-all duration-300 hover:shadow-xl bg-white dark:bg-gray-800 ${
      isExpanded ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
    }`}>
      <CardHeader className="pb-3 border-b dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {order.fullName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{order.phone}</p>
            {order.email && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{order.email}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {order.condition && (
              <Badge 
                variant={order.condition === 'onaylandı' ? 'success' : 'default'}
                className={`${
                  order.condition === 'onaylandı' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                }`}
              >
                {order.condition}
              </Badge>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              {isExpanded ? <FaCompressAlt size={16} /> : <FaExpandAlt size={16} />}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="text-sm bg-gray-50 dark:bg-gray-900/50 rounded-md p-3">
            <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
              {getDimensionsDisplay()}
            </p>
          </div>

          {isExpanded && (
            <>
              {order.message && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{order.message}</p>
                </div>
              )}
              <div className="border-t dark:border-gray-700 pt-4">
                {renderProducts()}
              </div>
            </>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center space-x-2">
              {order.pdfUrl && (
                <a
                  href={order.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  <FaFilePdf size={20} />
                </a>
              )}
            </div>
            <p className="font-medium text-gray-900 dark:text-white">
              Toplam: {order.totalPrice?.toLocaleString('tr-TR')}₺
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-end space-x-3 border-t dark:border-gray-700 pt-4">
        <button
          onClick={() => onApprove(order.id)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          <FaCheck className="mr-2" /> Onayla
        </button>
        <button
          onClick={() => onDelete(order.id)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          <FaTimes className="mr-2" /> Sil
        </button>
      </CardFooter>
    </Card>
  );
};

OrderCard.propTypes = {
    order: PropTypes.shape({
      id: PropTypes.string.isRequired,
      fullName: PropTypes.string.isRequired,
      phone: PropTypes.string.isRequired,
      email: PropTypes.string,
      dimensions: PropTypes.shape({
        kontiWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        kontiHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        verandaWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        verandaHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
      message: PropTypes.string,
      products: PropTypes.objectOf(
        PropTypes.shape({
          selected: PropTypes.bool,
          products: PropTypes.arrayOf(
            PropTypes.shape({
              name: PropTypes.string.isRequired,
              price: PropTypes.number.isRequired,
              description: PropTypes.string
            })
          )
        })
      ),
      pdfUrl: PropTypes.string,
      totalPrice: PropTypes.number,
      condition: PropTypes.string,
      createdAt: PropTypes.string,
      orderNumber: PropTypes.string
    }).isRequired,
    onApprove: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
  };

export default OrderCard;