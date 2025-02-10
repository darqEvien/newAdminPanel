import PropTypes from 'prop-types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';


const SortableItem = ({ category, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: category.name,
    modifiers: [restrictToVerticalAxis]
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-700 p-4 rounded-lg shadow-md relative group"
    >
      <div 
        {...attributes} 
        {...listeners}
        className="absolute right-2 top-2 cursor-grab active:cursor-grabbing"
      >
          <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2 overflow-hidden text-ellipsis whitespace-nowrap pr-8">{category.title}</h3>
      <p className="text-gray-400 mb-2">Ana Kategori: {category.parentCategory || "Ana Kategori"}</p>
      <p className="text-gray-400 mb-2">Seçim: {category.select || "N/A"}</p>
      <p className="text-gray-400 mb-2">Fiyat Biçimi: {category.priceFormat || "N/A"}</p>
      <p className="text-gray-400 mb-2 overflow-hidden text-ellipsis whitespace-nowrap">Tags: {(category.tags || []).join(', ') || "N/A"}</p>
      <div className="flex justify-evenly gap-2 mt-4">
  <button
    onClick={() => onEdit(category)}
    className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-full transition-colors duration-200"
    title="Düzenle"
  >
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  </button>
  <button
    onClick={() => onDelete(category.name)}
    className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200"
    title="Sil"
  >
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
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
      const oldIndex = sortedCategories.findIndex((cat) => cat.name === active.id);
      const newIndex = sortedCategories.findIndex((cat) => cat.name === over.id);
      onDragEnd({ oldIndex, newIndex });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <SortableContext items={sortedCategories.map(cat => cat.name)} strategy={rectSortingStrategy}>
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