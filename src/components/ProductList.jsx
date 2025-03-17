import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { ref, update } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import SortableProduct from "./SortableProduct";

const ProductList = ({
  products = [],
  onEdit,
  onDelete,
  categoryPropertyName,
  layout: initialLayout = "grid",
}) => {
  const [items, setItems] = useState([]);
  const [layout, setLayout] = useState(initialLayout);
  const [activeId, setActiveId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Products'ta değişiklik olduğunda sıralamaları güncelle
  useEffect(() => {
    // Order özelliğini ekleyerek sırala
    const productsWithOrder = products.map((product) => ({
      ...product,
      order: typeof product.order === "number" ? product.order : 0,
    }));

    const productsWithUpdatedOrder = [...productsWithOrder].sort(
      (a, b) => a.order - b.order
    );

    setItems(productsWithUpdatedOrder);

    // Update Firebase only if orders have changed
    const hasOrderChanges = productsWithUpdatedOrder.some(
      (product, index) => product.order !== index
    );

    if (hasOrderChanges) {
      const updates = {};
      productsWithUpdatedOrder.forEach((product, index) => {
        updates[`products/${categoryPropertyName}/${product.id}/order`] = index;
      });
      update(ref(database), updates);
    }
  }, [products, categoryPropertyName]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setIsDragging(true);
    document.body.classList.add("cursor-grabbing");
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setIsDragging(false);
    document.body.classList.remove("cursor-grabbing");

    if (!active || !over || active.id === over.id) return;

    setItems((currentItems) => {
      const oldIndex = currentItems.findIndex((item) => item.id === active.id);
      const newIndex = currentItems.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return currentItems;

      const reorderedItems = arrayMove(currentItems, oldIndex, newIndex);

      // Firebase'de sıralama değerlerini güncelleme
      const updates = {};
      reorderedItems.forEach((item, index) => {
        updates[`products/${categoryPropertyName}/${item.id}/order`] = index;
      });
      update(ref(database), updates).catch(console.error);

      return reorderedItems;
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setIsDragging(false);
    document.body.classList.remove("cursor-grabbing");
  };

  // Aktif ürünü bul
  const activeProduct = activeId
    ? items.find((item) => item.id === activeId)
    : null;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Layout options */}
      <div className="flex justify-end mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 flex shadow-sm">
          <button
            className={`p-1.5 rounded-md ${
              layout === "grid"
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            } transition-colors`}
            onClick={() => setLayout("grid")}
            title="Grid view"
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
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>
          <button
            className={`p-1.5 rounded-md ${
              layout === "list"
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            } transition-colors`}
            onClick={() => setLayout("list")}
            title="List view"
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Product grid with dnd */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          className={
            layout === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              : "space-y-4"
          }
        >
          <SortableContext
            items={items.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            {items.map((product) => (
              <SortableProduct
                key={product.id}
                product={product}
                onEdit={() => onEdit(product)}
                onDelete={onDelete}
                layout={layout}
                isDraggingAny={isDragging}
                isDragging={activeId === product.id}
              />
            ))}
          </SortableContext>
        </div>

        {/* Drag Overlay */}
        <DragOverlay adjustScale zIndex={100}>
          {activeId && activeProduct ? (
            <SortableProduct
              product={activeProduct}
              onEdit={() => onEdit(activeProduct)}
              onDelete={onDelete}
              layout={layout}
              isDragging={true}
              isOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Drag instructions */}
      <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-lg text-center">
        <p className="text-xs text-purple-700 dark:text-purple-300 flex items-center justify-center">
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Ürünleri sürükleyerek yeniden sıralayabilirsiniz. Değişiklikler
          otomatik olarak kaydedilecektir.
        </p>
      </div>
    </div>
  );
};

ProductList.propTypes = {
  products: PropTypes.array,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  categoryPropertyName: PropTypes.string.isRequired,
  layout: PropTypes.oneOf(["grid", "list"]),
};

export default ProductList;
