import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ref, onValue, remove, update,push } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import Sidebar from "../components/Sidebar";
import ProductForm from "../components/ProductForm";
import ProductList from "../components/ProductList";

const ProductPage = () => {
  const { categoryPropertyName } = useParams();
  const [categoryData, setCategoryData] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [subCategoryProducts, setSubCategoryProducts] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

 const getAllSubCategories = useMemo(() => {
    return function getSubCategories(categories, parentPropertyName) {
      const directSubs = categories.filter(
        (cat) => cat.parentCategory === parentPropertyName
      );
      let allSubs = [...directSubs];

      directSubs.forEach((subCat) => {
        const nestedSubs = getSubCategories(categories, subCat.propertyName);
        allSubs = [...allSubs, ...nestedSubs];
      });

      return allSubs;
    };
  }, []);
  useEffect(() => {
    const categoriesRef = ref(database, "categories");

    onValue(categoriesRef, (snapshot) => {
      const categoriesData = snapshot.val();

      if (categoriesData) {
        const allCategories = Object.values(categoriesData);
        const mainCategory = allCategories.find(
          (cat) => cat.propertyName === categoryPropertyName
        );

        if (mainCategory) {
          setCategoryData(mainCategory);

          // Get all nested subcategories
          const allSubs = getAllSubCategories(
            allCategories,
            categoryPropertyName
          );
          setSubCategories(allSubs);

          // Fetch main category products
          const productsRef = ref(database, `products/${categoryPropertyName}`);
          onValue(productsRef, (snapshot) => {
            const productsData = snapshot.val();
            if (productsData) {
              setProducts(
                Object.entries(productsData).map(([id, data]) => ({
                  id,
                  ...data,
                }))
              );
            } else {
              setProducts([]);
            }
          });

          // Fetch all subcategories products
          allSubs.forEach((subCat) => {
            const subProductsRef = ref(
              database,
              `products/${subCat.propertyName}`
            );
            onValue(subProductsRef, (snapshot) => {
              const subProductsData = snapshot.val();
              setSubCategoryProducts((prev) => ({
                ...prev,
                [subCat.propertyName]: subProductsData
                  ? Object.entries(subProductsData).map(([id, data]) => ({
                      id,
                      ...data,
                    }))
                  : [],
              }));
            });
          });
        }
      }
      setLoading(false);
    });
  }, [categoryPropertyName, getAllSubCategories]);

  const handleEditProduct = (product, category) => {
    // Ensure category information is available
    const targetCategory = category || {
        propertyName: categoryPropertyName,
        title: categoryData?.title
    };

    // Create clean product object with preserved ID
    const productToEdit = {
        ...product,
        id: product.id,
        images: product.images || [],
        tag: product.tag || [],
        order: product.order || 0
    };
    console.log(productToEdit);
    setSelectedProduct(productToEdit);
    setSelectedCategory(targetCategory);
    setIsProductFormOpen(true);
};

  const handleAddProduct = (category) => {
    setSelectedProduct(null);
    setSelectedCategory(category);
    setIsProductFormOpen(true);
};
  const handleDeleteProduct = async (productId, categoryPropertyName) => {
    if (!categoryPropertyName) {
      console.error("Category property name is required for deletion");
      return;
    }

    if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      try {
        // İlgili kategorideki ürünü sil
        const productRef = ref(
          database,
          `products/${categoryPropertyName}/${productId}`
        );
        await remove(productRef);

        // Opsiyonel: Storage'dan resimleri de silebilirsiniz
        // Bu kısım gerekirse eklenebilir

        console.log(
          `Ürün başarıyla silindi: ${productId} from ${categoryPropertyName}`
        );
      } catch (error) {
        console.error("Ürün silinirken hata oluştu:", error);
        alert("Ürün silinirken bir hata oluştu.");
      }
    }
  };

  const updateProduct = async (productData, categoryId) => {
    try {
        if (!categoryId) {
            throw new Error('Category ID is required');
        }

        // Ensure we have product ID for updates
        if (productData.id) {
            // Update existing product
            const productRef = ref(database, `products/${categoryId}/${productData.id}`);
            const updateData = {
                ...productData,
                updatedAt: new Date().toISOString()
            };
            
            // Remove Firebase-generated key if present
            delete updateData['.key'];
            
            await update(productRef, updateData);
        } else {
            // Create new product
            const newProductRef = ref(database, `products/${categoryId}`);
            const newProduct = {
                ...productData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await push(newProductRef, newProduct);
        }
        
        return true;
    } catch (error) {
        console.error('Error saving product:', error);
        throw error;
    }
};

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-5 bg-white dark:bg-gray-800 text-black dark:text-white ml-64">
        <div className="container mx-auto">
          {loading && <div>Yükleniyor...</div>}
          {error && <div className="text-red-500">{error}</div>}
          {!loading && !error && categoryData && (
            <>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold">
                    {categoryData.title} Kategorisi
                  </h1>
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    onClick={() => handleAddProduct(categoryData)}
                  >
                    <span>+</span>
                    <span>Ürün Ekle</span>
                  </button>
                </div>
                <ProductList
                  products={products}
                  categoryPropertyName={categoryPropertyName}
                  onEdit={handleEditProduct}
                  onDelete={(productId) =>
                    handleDeleteProduct(productId, categoryPropertyName)
                  }
                />
              </div>

              {/* Sub Categories Section */}
              <div className="mt-8 space-y-8">
                {subCategories.map((subCat) => (
                  <div
                    key={subCat.propertyName}
                    className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold">
                        {subCat.title} Kategorisi
                      </h2>
                      <button
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        onClick={() => handleAddProduct(subCat)}
                      >
                        <span>+</span>
                        <span>Ürün Ekle</span>
                      </button>
                    </div>

                    <ProductList
    products={subCategoryProducts[subCat.propertyName] || []}
    categoryPropertyName={subCat.propertyName}
    onEdit={(product) => handleEditProduct(product, {
        propertyName: subCat.propertyName,
        title: subCat.title
    })}
    onDelete={(productId) => handleDeleteProduct(productId, subCat.propertyName)}
/>
                  </div>
                ))}
              </div>

              {/* Product Form Modal */}
              {isProductFormOpen && (
    <ProductForm
    isOpen={isProductFormOpen}
    onClose={() => setIsProductFormOpen(false)}
    product={selectedProduct}
    category={selectedCategory}
    categoryId={selectedCategory?.propertyName || categoryPropertyName}
    categoryPropertyName={selectedCategory?.propertyName || categoryPropertyName}
    updateProduct={updateProduct}
/>
)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
