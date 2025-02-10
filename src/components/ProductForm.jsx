import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { ref, push } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { database, storage } from "../firebase/firebaseConfig";

const ProductForm = ({
  onClose,
  categoryPropertyName,
  product,
  updateProduct,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    gizliDesc: "",
    width: "",
    height: "",
    size: "",
    order: 0,
    price: "",
    alanPrice: "",
    tag: [],
    images: [],
    accessibility: false,
  });

  // const [tagInput, setTagInput] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imageURLs, setImageURLs] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        gizliDesc: product.gizliDesc || "",
        width: product.width || "",
        height: product.height || "",
        size: product.size || "",
        order: product.order || 0,
        price: product.price || "",
        alanPrice: product.alanPrice || "",
        tag: product.tag || [],
        images: product.images || [],
        accessibility: product.accessibility || false,
      });
      setImageURLs(product.images || []);
    }
  }, [product]);

  //     if (e.key === 'Enter' || e.key === ',') {
  //         e.preventDefault();
  //         const newTag = tagInput.trim();
  //         if (newTag && !formData.tag.includes(newTag)) {
  //             setFormData(prev => ({
  //                 ...prev,
  //                 tag: [...prev.tag, newTag]
  //             }));
  //         }
  //         setTagInput('');
  //     }
  // };
  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tag: formData.tag.filter((tag) => tag !== tagToRemove),
    });
  };
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);
    
    // Create and store URLs
    const newUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newUrls]);
};

const handleImageReorder = (dragIndex, dropIndex) => {
    // Update form data images
    setFormData(prev => {
        const newImages = [...prev.images];
        const [movedImage] = newImages.splice(dragIndex, 1);
        newImages.splice(dropIndex, 0, movedImage);
        return { ...prev, images: newImages };
    });

    // Update image files and preview URLs together
    if (imageFiles.length > 0) {
        const newFiles = [...imageFiles];
        const newPreviews = [...previewUrls];
        
        const [movedFile] = newFiles.splice(dragIndex, 1);
        const [movedPreview] = newPreviews.splice(dragIndex, 1);
        
        newFiles.splice(dropIndex, 0, movedFile);
        newPreviews.splice(dropIndex, 0, movedPreview);
        
        setImageFiles(newFiles);
        setPreviewUrls(newPreviews);
    }
};

const removeNewImage = (index) => {
    if (previewUrls[index]) {
        URL.revokeObjectURL(previewUrls[index]);
    }
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
};

const removeImage = (index) => {
    setFormData(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
    }));
};


useEffect(() => {
    return () => {
        previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
}, [previewUrls]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      if (!formData.name || !categoryPropertyName) {
        throw new Error("Name and category are required");
      }

      let finalImageURLs = [...formData.images];

      if (imageFiles.length > 0) {
        const uploadedURLs = await Promise.all(
          imageFiles.map(async (file) => {
            const fileName = `${Date.now()}_${file.name}`;
            const imgRef = storageRef(
              storage,
              `images/${categoryPropertyName}/${formData.name}/${fileName}`
            );
            await uploadBytes(imgRef, file);
            return await getDownloadURL(imgRef);
          })
        );
        finalImageURLs = [...finalImageURLs, ...uploadedURLs];
      }

      if (product?.id) {
        // Update existing product
        const updateData = {
          id: product.id,
          name: formData.name,
          price: formData.price || 0,
          description: formData.description || "",
          size: formData.size || "",
          images: finalImageURLs,
          tag: formData.tag || [],
          order: formData.order || 0,
          updatedAt: new Date().toISOString(),
        };
        await updateProduct(updateData, categoryPropertyName);
      } else {
        // Create new product without ID
        const newProduct = {
          name: formData.name,
          price: formData.price || 0,
          description: formData.description || "",
          size: formData.size || "",
          images: finalImageURLs,
          tag: formData.tag || [],
          order: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const newProductRef = ref(database, `products/${categoryPropertyName}`);
        await push(newProductRef, newProduct);
      }

      onClose();
    } catch (error) {
      console.error("Error saving product:", error);
      alert(`Ürün kaydedilirken bir hata oluştu: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl my-8 relative">
        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-50 rounded-xl backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <img src="/loading.gif" alt="Loading..." className="w-16 h-16" />
              <p className="mt-4 text-gray-700 dark:text-gray-200">Yükleniyor...</p>
            </div>
          </div>
        )}
  
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {product ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.accessibility}
                  onChange={(e) => setFormData(prev => ({...prev, accessibility: e.target.checked}))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-600 
                             peer-checked:after:translate-x-full peer-checked:bg-blue-600
                             after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                             after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                             peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800">
                </div>
              </label>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Aktif
              </span>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
  
        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Ürün Adı
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              required
            />
          </div>
  
          {/* Description Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Açıklama
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="4"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                required
              />
            </div>
  
            <div>
              <label htmlFor="gizliDesc" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Gizli Açıklama
              </label>
              <textarea
                id="gizliDesc"
                value={formData.gizliDesc}
                onChange={(e) => setFormData({ ...formData, gizliDesc: e.target.value })}
                rows="4"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>
  
          {/* Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Boyut
              </label>
              <input
                id="size"
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              />
            </div>
  
            <div>
              <label htmlFor="width" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Genişlik
              </label>
              <input
                id="width"
                type="number"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              />
            </div>
  
            <div>
              <label htmlFor="height" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Yükseklik
              </label>
              <input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>
  
          {/* Prices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Fiyat
              </label>
              <div className="relative">
                <input
                  id="price"
                  type="text"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                  required
                />
                <span className="absolute right-3 top-2 text-gray-500 dark:text-gray-400">₺</span>
              </div>
            </div>
  
            <div>
              <label htmlFor="alanPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Alan Fiyatı
              </label>
              <div className="relative">
                <input
                  id="alanPrice"
                  type="text"
                  value={formData.alanPrice}
                  onChange={(e) => setFormData({ ...formData, alanPrice: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                  
                />
                <span className="absolute right-3 top-2 text-gray-500 dark:text-gray-400">₺/m²</span>
              </div>
            </div>
          </div>
  
          {/* Tags */}
          <div>
            <label htmlFor="tag" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Etiketler
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {formData.tag.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm
                             bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                id="tag"
                type="text"
                value={formData.tag.join(", ")}
                onChange={(e) => setFormData({
                  ...formData,
                  tag: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean)
                })}
                placeholder="Etiketleri virgülle ayırarak yazın"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>
  
          {/* Image Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Ürün Resimleri
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Upload Button */}
              <div className="col-span-1">
                <label className="flex flex-col items-center justify-center w-full h-32 
                               border-2 border-dashed rounded-lg cursor-pointer 
                               border-gray-300 dark:border-gray-600
                               hover:bg-gray-50 dark:hover:bg-gray-700/50 
                               transition-colors duration-200">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Resim Yükle</p>
                  </div>
                </label>
              </div>
  
              {/* Image Grid */}
              <div className="col-span-1 md:col-span-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {formData.images.map((image, index) => (
                    <div
                      key={`existing-${index}`}
                      className="relative group cursor-move"
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        handleImageReorder(dragIndex, index);
                      }}
                    >
                      <div className="aspect-square overflow-hidden rounded-lg">
                        <img
                          src={image}
                          alt={`Product ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-200 
                                  group-hover:scale-105"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                       className="absolute top-2 right-2 p-1.5 rounded-full 
                               bg-red-500 text-white opacity-0 transform scale-90
                               group-hover:opacity-100 group-hover:scale-100
                               transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
                  </div>
                ))}
                {imageFiles.map((file, index) => (
                  <div key={`new-${index}`} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-lg">
                      <img
                        src={previewUrls[index]}
                        alt={`New upload ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-200 
                                group-hover:scale-105"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-2 right-2 p-1.5 rounded-full 
                               bg-red-500 text-white opacity-0 transform scale-90
                               group-hover:opacity-100 group-hover:scale-100
                               transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium rounded-lg
                     text-gray-700 dark:text-gray-200 
                     bg-gray-100 dark:bg-gray-700
                     hover:bg-gray-200 dark:hover:bg-gray-600
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium rounded-lg
                     text-white bg-blue-600 
                     hover:bg-blue-700 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200"
          >
            {isUploading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Yükleniyor...
              </div>
            ) : product ? (
              'Güncelle'
            ) : (
              'Kaydet'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
);
};

ProductForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,

  onClose: PropTypes.func.isRequired,
  product: PropTypes.object,
  category: PropTypes.object,
  categoryId: PropTypes.string.isRequired,

  categoryPropertyName: PropTypes.string.isRequired,
  updateProduct: PropTypes.func.isRequired,
};

export default ProductForm;
