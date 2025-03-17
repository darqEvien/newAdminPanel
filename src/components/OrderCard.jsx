import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  FaFilePdf,
  FaCheck,
  FaTimes,
  FaExpandAlt,
  FaCompressAlt,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaRuler,
  FaCommentDots,
  FaShoppingCart,
} from "react-icons/fa";
import { ref, get } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import { Card, CardHeader, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";

const OrderCard = ({ order, onApprove, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [categories, setCategories] = useState({});
  const [sortedCategories, setSortedCategories] = useState([]);
  const [animateTotal, setAnimateTotal] = useState(false);

  // Hover efekti için
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Toplam fiyat animasyonu
  const handleTotalClick = () => {
    setAnimateTotal(true);
    setTimeout(() => setAnimateTotal(false), 1000);
  };

  const getDimensionsDisplay = () => {
    const dimensions = [];

    // Konteyner boyutlarını kontrol et
    if (order.dimensions?.kontiWidth && order.dimensions?.kontiHeight) {
      dimensions.push(
        `Konteyner: ${order.dimensions.kontiWidth} × ${order.dimensions.kontiHeight}`
      );
    }

    // Veranda boyutlarını kontrol et
    if (order.dimensions?.verandaWidth && order.dimensions?.verandaHeight) {
      dimensions.push(
        `Veranda: ${order.dimensions.verandaWidth} × ${order.dimensions.verandaHeight}`
      );
    }

    // Hiç boyut yoksa
    if (dimensions.length === 0) {
      return null;
    }

    // Boyutları yan yana göster
    return dimensions;
  };

  // Firebase'den categories verilerini al
  useEffect(() => {
    const fetchCategories = async () => {
      // Categories verisi bir kez indirilip localStorage'da saklanabilir
      const cachedCategories = localStorage.getItem("categories");
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

      const categoriesRef = ref(database, "categories");
      try {
        const snapshot = await get(categoriesRef);
        if (snapshot.exists()) {
          const categoriesData = snapshot.val();
          // Categories verisini localStorage'a kaydet
          localStorage.setItem("categories", JSON.stringify(categoriesData));
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
    if (!order.products || !categories || sortedCategories.length === 0)
      return null;

    return (
      <div className="space-y-3">
        {sortedCategories.map((propertyName) => {
          const productData = order.products[propertyName];
          if (!productData?.selected) return null;

          // Kategori bilgisini bul
          const category = Object.values(categories).find(
            (cat) => cat.propertyName === propertyName
          );
          if (!category) return null;

          return (
            <div
              key={propertyName}
              className="mb-3 bg-gray-50 dark:bg-gray-800/70 rounded-lg p-3"
            >
              <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                {category.title}
              </h4>
              {/* Eğer products array'i varsa onları göster */}
              {productData.products && (
                <ul className="space-y-1">
                  {productData.products.map((product, index) => (
                    <li
                      key={`${propertyName}-${index}`}
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                    >
                      <span>{product.name}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {product.price.toLocaleString("tr-TR")}₺
                      </span>
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

  const dimensionsArray = getDimensionsDisplay();
  const formattedDate =
    order.formattedDate ||
    new Date(order.createdAt).toLocaleDateString("tr-TR");

  return (
    <Card
      className={`relative transition-all duration-300 overflow-hidden ${
        isHovered ? "shadow-xl translate-y-[-2px]" : "shadow-md"
      } ${isExpanded ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""}
      bg-white dark:bg-gray-800/90 backdrop-blur-sm`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Durum göstergesi şeridi */}
      <div
        className={`absolute top-0 left-0 w-1 h-full ${
          order.condition === "onaylandı" ? "bg-green-500" : "bg-blue-500"
        }`}
      ></div>

      <CardHeader className="pb-3 border-b dark:border-gray-700/50 relative pl-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center mb-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FaUser className="text-gray-500 dark:text-gray-400 mr-2 h-4 w-4" />
                {order.fullName}
              </h3>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <p className="text-gray-600 dark:text-gray-300 flex items-center">
                <FaPhone className="text-gray-400 mr-2 h-3 w-3" />
                {order.phone}
              </p>

              {order.email && (
                <p className="text-gray-500 dark:text-gray-400 flex items-center">
                  <FaEnvelope className="text-gray-400 mr-2 h-3 w-3" />
                  {order.email}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {order.condition && (
              <Badge
                variant={
                  order.condition === "onaylandı" ? "success" : "default"
                }
                className={`px-2.5 py-1 rounded-full uppercase text-xs tracking-wider font-medium ${
                  order.condition === "onaylandı"
                    ? "bg-green-100/80 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800/30"
                    : "bg-blue-100/80 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30"
                }`}
              >
                {order.condition === "onaylandı" ? (
                  <span className="flex items-center">
                    <FaCheck className="mr-1 h-3 w-3" />
                    Onaylı
                  </span>
                ) : (
                  <span>Bekliyor</span>
                )}
              </Badge>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors ${
                isExpanded
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  : ""
              }`}
            >
              {isExpanded ? (
                <FaCompressAlt size={14} />
              ) : (
                <FaExpandAlt size={14} />
              )}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Tarih bilgisi */}
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
            <FaCalendarAlt className="mr-1.5 h-3 w-3" />
            <span>{formattedDate}</span>
          </div>

          {/* Boyutlar */}
          {dimensionsArray && dimensionsArray.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dimensionsArray.map((dimension, index) => (
                <div
                  key={index}
                  className="flex items-center px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-full text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700/30"
                >
                  <FaRuler className="mr-1.5 h-3 w-3 text-blue-500 dark:text-blue-400" />
                  {dimension}
                </div>
              ))}
            </div>
          )}

          {/* Genişletilmiş bölüm */}
          <div
            className={`transition-all duration-500 ease-in-out space-y-4 overflow-hidden ${
              isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            {/* Mesaj */}
            {order.message && (
              <div className="p-4 bg-blue-50/80 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-start">
                  <FaCommentDots className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {order.message}
                  </p>
                </div>
              </div>
            )}

            {/* Ürünler */}
            {sortedCategories.length > 0 && (
              <div className="border-t dark:border-gray-700/50 pt-4">
                <div className="flex items-center mb-3">
                  <FaShoppingCart className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">
                    Sipariş İçeriği
                  </h3>
                </div>
                {renderProducts()}
              </div>
            )}
          </div>

          {/* Toplam ve PDF */}
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center space-x-2">
              {order.pdfUrl && (
                <a
                  href={order.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/30 transition-colors border border-red-100 dark:border-red-800/30 flex items-center"
                >
                  <FaFilePdf className="mr-1.5" size={16} />
                  <span className="text-sm font-medium">PDF</span>
                </a>
              )}
            </div>

            <div
              onClick={handleTotalClick}
              className={`px-3 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800/50 transition-all duration-300 cursor-pointer ${
                animateTotal ? "scale-110 bg-green-50 dark:bg-green-900/20" : ""
              }`}
            >
              <p className="font-medium text-gray-900 dark:text-white flex items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                  Toplam:
                </span>
                <span className="text-lg">
                  {order.totalPrice?.toLocaleString("tr-TR")}₺
                </span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-end space-x-3 border-t dark:border-gray-700/50 pt-4 pb-4">
        {order.condition !== "onaylandı" && (
          <button
            onClick={() => onApprove(order.id)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
          >
            <FaCheck className="mr-2" /> Onayla
          </button>
        )}

        <button
          onClick={() => onDelete(order.id)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
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
            description: PropTypes.string,
          })
        ),
      })
    ),
    pdfUrl: PropTypes.string,
    totalPrice: PropTypes.number,
    condition: PropTypes.string,
    createdAt: PropTypes.string,
    formattedDate: PropTypes.string,
    orderNumber: PropTypes.string,
  }).isRequired,
  onApprove: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default OrderCard;
