import PropTypes from "prop-types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

const SortableItem = ({ category, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: category.name,
      modifiers: [restrictToVerticalAxis],
    });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  // Etiketleri daha iyi göstermek için fonksiyon
  const renderTags = (tags) => {
    if (!tags || !tags.length) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {tags.slice(0, 3).map((tag, index) => (
          <span
            key={index}
            className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
          >
            {tag}
          </span>
        ))}
        {tags.length > 3 && (
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
            +{tags.length - 3}
          </span>
        )}
      </div>
    );
  };

  // Ana kategori olup olmadığını kontrol et
  const isMainCategory = !category.parentCategory;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md group relative"
    >
      {/* Kategori türü göstergesi (sol kenar çizgisi) */}
      <div
        className={`absolute left-0 top-0 w-1 h-full ${
          isMainCategory ? "bg-blue-500" : "bg-emerald-500"
        }`}
      />

      {/* Sürükleme tutacağı */}
      <div
        {...attributes}
        {...listeners}
        className="absolute right-3 top-3 cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group-hover:opacity-100 opacity-50"
      >
        <svg
          className="w-5 h-5 text-gray-500 dark:text-gray-400"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </div>

      {/* Kategori İçeriği */}
      <div className="p-5 pl-6">
        <div className="flex items-center mb-2">
          {isMainCategory ? (
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 mr-2"></span>
          ) : (
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 mr-2"></span>
          )}
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 truncate pr-8">
            {category.title}
          </h3>
        </div>

        {/* Kategori Detayları */}
        <div className="space-y-2 mt-3 mb-3">
          {!isMainCategory && (
            <div className="flex items-center text-sm">
              <svg
                className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              <span className="text-gray-600 dark:text-gray-400">
                Üst Kategorisi: {category.parentCategory}
              </span>
            </div>
          )}

          <div className="flex items-center text-sm">
            <svg
              className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
              />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">
              Sıralama: {category.order || "0"}
            </span>
          </div>

          <div className="flex items-center text-sm">
            <svg
              className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-gray-600 dark:text-gray-400 truncate">
              Özellik adı: {category.propertyName || "N/A"}
            </span>
          </div>

          <div className="flex items-center text-sm">
            <svg
              className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">
              Seçim: {category.select || "N/A"}
            </span>
          </div>

          <div className="flex items-center text-sm">
            <svg
              className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">
              Fiyat Formatı: {category.priceFormat || "N/A"}
            </span>
          </div>
        </div>

        {/* Etiketler */}
        {renderTags(category.tags)}
      </div>

      {/* Buton Alanı */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
        <button
          onClick={() => onEdit(category)}
          className="inline-flex items-center justify-center px-3.5 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <svg
            className="w-4 h-4 mr-1.5"
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
          onClick={() => onDelete(category.name)}
          className="inline-flex items-center justify-center px-3.5 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-800/50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30"
        >
          <svg
            className="w-4 h-4 mr-1.5"
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
  );
};

const CategoryList = ({ categories, onEdit, onDelete, onDragEnd }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedCategories = [...categories].sort((a, b) => {
    const orderA = parseInt(a.order) || 0;
    const orderB = parseInt(b.order) || 0;
    return orderA - orderB;
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = sortedCategories.findIndex(
        (cat) => cat.name === active.id
      );
      const newIndex = sortedCategories.findIndex(
        (cat) => cat.name === over.id
      );
      onDragEnd({ oldIndex, newIndex });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <SortableContext
          items={sortedCategories.map((cat) => cat.name)}
          strategy={rectSortingStrategy}
        >
          {sortedCategories.map((category) => (
            <SortableItem
              key={category.name}
              category={category}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
};

CategoryList.propTypes = {
  categories: PropTypes.array.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
};

SortableItem.propTypes = {
  category: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default CategoryList;
