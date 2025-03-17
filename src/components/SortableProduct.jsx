import { useState } from "react";
import PropTypes from "prop-types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Default placeholder image - Base64 kodlanmış küçük bir gri resim (reliable fallback)
const defaultPlaceholder =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='16' fill='%23999' text-anchor='middle' alignment-baseline='middle'%3EResim Yok%3C/text%3E%3C/svg%3E";

const SortableProduct = ({
  product,
  onEdit,
  onDelete,
  layout = "grid",
  isDraggingAny = false,
  isDragging = false,
  isOverlay = false,
}) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: product.id,
      disabled: isOverlay,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  // Fiyat formatı - Düzeltilmiş sürüm
  const formattedPrice = (() => {
    try {
      if (typeof product.price === "number") {
        return new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
        }).format(product.price);
      }
      if (typeof product.price === "string") {
        // Remove non-numeric characters except decimal point
        const numericPrice = product.price.replace(/[^0-9.,]/g, "");
        if (
          numericPrice &&
          !isNaN(parseFloat(numericPrice.replace(",", ".")))
        ) {
          return new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
          }).format(parseFloat(numericPrice.replace(",", ".")));
        }
        return product.price; // Return original if not parseable
      }
      return "₺0";
    } catch (e) {
      console.error("Price formatting error:", e);
      return typeof product.price === "undefined" ? "₺0" : `₺${product.price}`;
    }
  })();

  // İlk resmi veya varsayılan resmi göster
  const imageUrl =
    !imageError && product.images && product.images.length > 0
      ? product.images[0]
      : defaultPlaceholder;

  // Etiketleri göster - Tüm etiketleri gösterme opsiyonu ile
  const renderTags = () => {
    if (!product.tag || !product.tag.length) return null;

    const tagsToShow = showAllTags ? product.tag : product.tag.slice(0, 2);
    const hasMore = !showAllTags && product.tag.length > 2;

    return (
      <div className="flex gap-1.5 flex-wrap">
        {tagsToShow.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100/80 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/30"
          >
            {tag}
          </span>
        ))}

        {hasMore ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAllTags(true);
            }}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            +{product.tag.length - 2} etiket daha
          </button>
        ) : product.tag.length > 2 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAllTags(false);
            }}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg
              className="w-3 h-3 mr-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 15l7-7 7 7"
              />
            </svg>
            Gizle
          </button>
        ) : null}
      </div>
    );
  };

  // Grid layout
  if (layout === "grid") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden group transition-all duration-200 flex flex-col h-full ${
          isDragging
            ? "shadow-lg ring-2 ring-purple-400/30 dark:ring-purple-500/20 opacity-90 z-20"
            : isDraggingAny
            ? "shadow border border-gray-200 dark:border-gray-700"
            : "border border-gray-200 dark:border-gray-700 hover:shadow-md"
        }`}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className={`absolute top-2 right-2 z-10 rounded-full p-1.5 
                        ${
                          isDragging
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 cursor-grabbing"
                            : "bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-grab"
                        } transition-all ${
            isDraggingAny ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
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
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </div>

        {/* Product image */}
        <div className="relative h-36 sm:h-44 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
          <img
            src={imageUrl}
            alt={product.name || "Ürün"}
            className="object-cover w-full h-full"
            onError={() => setImageError(true)}
          />

          {/* Product price */}
          <div className="absolute bottom-0 right-0 bg-gradient-to-l from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-tl-md shadow-sm">
            <span className="font-medium text-sm tracking-wide">
              {formattedPrice}
            </span>
          </div>
        </div>

        {/* Product content */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">
            {product.name || "Ürün Adı"}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 flex-grow">
            {product.description || "Açıklama bulunmuyor"}
          </p>

          {/* Tags */}
          <div className="mt-auto">{renderTags()}</div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 dark:border-gray-700 p-3 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => onEdit(product)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gradient-to-b from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 dark:from-blue-900/30 dark:to-blue-900/40 dark:hover:from-blue-900/40 dark:hover:to-blue-900/50 dark:text-blue-300 rounded-md transition-all duration-200 shadow-sm hover:shadow focus:outline-none transform hover:-translate-y-0.5"
          >
            <svg
              className="w-3.5 h-3.5 mr-1"
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
            Düzenle
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gradient-to-b from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-700 dark:from-red-900/30 dark:to-red-900/40 dark:hover:from-red-900/40 dark:hover:to-red-900/50 dark:text-red-300 rounded-md transition-all duration-200 shadow-sm hover:shadow focus:outline-none transform hover:-translate-y-0.5"
          >
            <svg
              className="w-3.5 h-3.5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Sil
          </button>
        </div>

        {/* Size indicator if available */}
        {product.size && (
          <div className="absolute top-2 left-2 bg-gray-800/80 dark:bg-gray-900/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded font-medium">
            {product.size}
          </div>
        )}
      </div>
    );
  }

  // List layout - horizontal card
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden group transition-all duration-200 ${
        isDragging
          ? "shadow-lg ring-2 ring-purple-400/30 dark:ring-purple-500/20 opacity-90 z-20"
          : isDraggingAny
          ? "shadow border border-gray-200 dark:border-gray-700"
          : "border border-gray-200 dark:border-gray-700 hover:shadow-md"
      }`}
    >
      <div className="flex">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className={`absolute top-2 right-2 z-10 rounded-full p-1.5 
                        ${
                          isDragging
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 cursor-grabbing"
                            : "bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-grab"
                        } transition-all ${
            isDraggingAny ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
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
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </div>

        {/* Product image */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
          <img
            src={imageUrl}
            alt={product.name || "Ürün"}
            className="object-cover w-full h-full"
            onError={() => setImageError(true)}
          />
        </div>

        {/* Product content */}
        <div className="p-4 flex-grow flex flex-col">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-gray-900 dark:text-white truncate pr-8">
              {product.name || "Ürün Adı"}
            </h3>
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-md shadow-sm">
              <span className="font-medium text-sm tracking-wide whitespace-nowrap">
                {formattedPrice}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 mb-3 line-clamp-2">
            {product.description || "Açıklama bulunmuyor"}
          </p>

          {/* Tags and Size */}
          <div className="mt-auto flex flex-wrap gap-y-2 items-center justify-between">
            <div className="flex-grow">{renderTags()}</div>

            {product.size && (
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs px-2 py-0.5 rounded-md font-medium">
                {product.size}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={() => onEdit(product)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gradient-to-b from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 dark:from-blue-900/30 dark:to-blue-900/40 dark:hover:from-blue-900/40 dark:hover:to-blue-900/50 dark:text-blue-300 rounded-md transition-all duration-200 shadow-sm hover:shadow focus:outline-none transform hover:-translate-y-0.5"
            >
              <svg
                className="w-3.5 h-3.5 mr-1"
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
              Düzenle
            </button>
            <button
              onClick={() => onDelete(product.id)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gradient-to-b from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-700 dark:from-red-900/30 dark:to-red-900/40 dark:hover:from-red-900/40 dark:hover:to-red-900/50 dark:text-red-300 rounded-md transition-all duration-200 shadow-sm hover:shadow focus:outline-none transform hover:-translate-y-0.5"
            >
              <svg
                className="w-3.5 h-3.5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Sil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

SortableProduct.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    description: PropTypes.string,
    size: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    tag: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  layout: PropTypes.oneOf(["grid", "list"]),
  isDraggingAny: PropTypes.bool,
  isDragging: PropTypes.bool,
  isOverlay: PropTypes.bool,
};

export default SortableProduct;
