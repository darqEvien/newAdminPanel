import {useState, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableProduct = ({ product, onEdit, onDelete }) => {
    const [, setShowAllTags] = useState(false);
    const tagRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const renderTags = (tags) => {
      
    
        if (!tags || tags.length === 0) {
            return null;
        }
    
        return (

            <div className="relative inline-block" ref={tagRef}>
                <div className="flex flex-wrap items-center gap-2">
                    {(isExpanded ? tags : tags.slice(0, 1)).map((tag, index) => (
                        <span 
                            key={index}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                        >
                            {tag} 
                        </span>
                        
                    ))}
                    
                    <p className={`text-gray-500 hover:text-gray-700 dark:hover:text-gray-300`}>
    {isExpanded ? 'Etiketleri gizle' : `+${tags.length - 1} etiket daha`}
</p>
                    {tags.length > 1 && (
                        
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            
                        >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                            >
                                
                                <path 
                                    fillRule="evenodd" 
                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                                    clipRule="evenodd" 
                                />
                            </svg>
                            
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Add click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tagRef.current && !tagRef.current.contains(event.target)) {
                setShowAllTags(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden flex flex-col"
        >
            <div className="relative w-full pt-[75%]">
                <div className="absolute top-2 right-2 z-10 cursor-move bg-white/80 dark:bg-gray-800/80 rounded-full p-1" {...attributes} {...listeners}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
                </div>

                {product.images && product.images.length > 0 ? (
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                        <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="absolute top-0 left-0 w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                                e.target.src = 'placeholder-image-url';
                            }}
                        />
                    </div>
                ) : (
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                        <span className="text-gray-400">Resim Yok</span>
                    </div>
                )}
            </div>

            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg truncate">{product.name}</h3>
                    <span className="text-green-600 font-semibold">{(product.price/1).toLocaleString("tr-TR")}₺</span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Alan: {product.size} m²</p>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 overflow-hidden text-ellipsis mb-3">
                    Açıklama: {product.description}
                </p>

     <div className="mt-auto">
        {renderTags(product.tag)}
    </div>

                <div className="flex justify-evenly gap-2 mt-2">
                    <button
                        onClick={() => onEdit(product)}
                        className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-full transition-colors duration-200"
                        title="Düzenle"
                    >
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200"
                        title="Sil"
                    >
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
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
        tag: PropTypes.arrayOf(PropTypes.string)
    }).isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired
};

export default SortableProduct;