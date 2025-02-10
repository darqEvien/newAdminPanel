import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ref, update } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy
} from '@dnd-kit/sortable';
import SortableProduct from './SortableProduct';

const ProductList = ({ products = [], onEdit, onDelete, categoryPropertyName }) => {
    const [items, setItems] = useState([]);
    
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Single useEffect to handle initialization and ordering
    useEffect(() => {
        if (!products.length) return;
        
        const orderedProducts = [...products].sort((a, b) => (a.order || 0) - (b.order || 0));
        const productsWithUpdatedOrder = orderedProducts.map((product, index) => ({
            ...product,
            order: index
        }));
        
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

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!active || !over || active.id === over.id) return;

        setItems((currentItems) => {
            const oldIndex = currentItems.findIndex(item => item.id === active.id);
            const newIndex = currentItems.findIndex(item => item.id === over.id);
            
            if (oldIndex === -1 || newIndex === -1) return currentItems;
            
            const reorderedItems = arrayMove(currentItems, oldIndex, newIndex);
            const updatedItems = reorderedItems.map((item, index) => ({
                ...item,
                order: index
            }));

            // Update Firebase
            const updates = {};
            updatedItems.forEach((item, index) => {
                updates[`products/${categoryPropertyName}/${item.id}/order`] = index;
            });
            update(ref(database), updates);

            return updatedItems;
        });
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <SortableContext items={items.map(item => item.id)} strategy={rectSortingStrategy}>
                    {items.map((product) => (
                        <SortableProduct
                            key={product.id}
                            product={product}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </SortableContext>
            </div>
        </DndContext>
    );
};

ProductList.propTypes = {
    products: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string,
        price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        description: PropTypes.string,
        size: PropTypes.string,
        order: PropTypes.number,
        images: PropTypes.arrayOf(PropTypes.string),
        tag: PropTypes.arrayOf(PropTypes.string)
    })),
    categoryPropertyName: PropTypes.string.isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired
};

export default ProductList;