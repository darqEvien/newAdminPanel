import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ref, onValue, remove, update, push } from "firebase/database";
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
  const [error, setError] = useState(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [productStats, setProductStats] = useState({
    total: 0,
    mainCategory: 0,
    subCategories: 0,
  });

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
    try {
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
            const productsRef = ref(
              database,
              `products/${categoryPropertyName}`
            );
            onValue(productsRef, (snapshot) => {
              const productsData = snapshot.val();
              const mainProducts = productsData
                ? Object.entries(productsData).map(([id, data]) => ({
                    id,
                    ...data,
                  }))
                : [];

              setProducts(mainProducts);

              // Update stats
              updateProductStats(mainProducts, subCategoryProducts);
            });

            // Fetch all subcategories products
            allSubs.forEach((subCat) => {
              const subProductsRef = ref(
                database,
                `products/${subCat.propertyName}`
              );
              onValue(subProductsRef, (snapshot) => {
                const subProductsData = snapshot.val();
                const subProds = subProductsData
                  ? Object.entries(subProductsData).map(([id, data]) => ({
                      id,
                      ...data,
                    }))
                  : [];

                setSubCategoryProducts((prev) => {
                  const newSubCategoryProducts = {
                    ...prev,
                    [subCat.propertyName]: subProds,
                  };

                  // Güncellenen verilere göre istatistikleri güncelle
                  updateProductStats(products, newSubCategoryProducts);

                  return newSubCategoryProducts;
                });
              });
            });
          } else {
            setError(`"${categoryPropertyName}" kategori bulunamadı`);
          }
        } else {
          setError("Kategori verileri yüklenemedi");
        }
        setLoading(false);
      });
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Veriler yüklenirken bir hata oluştu");
      setLoading(false);
    }
  }, [categoryPropertyName, getAllSubCategories]);

  const updateProductStats = (mainProducts, subProducts) => {
    let subTotal = 0;

    // Alt kategorilerdeki ürün sayısını hesapla
    Object.values(subProducts).forEach((products) => {
      subTotal += products.length;
    });

    setProductStats({
      total: (mainProducts?.length || 0) + subTotal,
      mainCategory: mainProducts?.length || 0,
      subCategories: subTotal,
    });
  };

  const handleEditProduct = (product, category) => {
    // Ensure category information is available
    const targetCategory = category || {
      propertyName: categoryPropertyName,
      title: categoryData?.title,
    };

    // Create clean product object with preserved ID
    const productToEdit = {
      ...product,
      id: product.id,
      images: product.images || [],
      tag: product.tag || [],
      order: product.order || 0,
    };

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
      } catch (error) {
        console.error("Ürün silinirken hata oluştu:", error);
        alert("Ürün silinirken bir hata oluştu.");
      }
    }
  };

  const updateProduct = async (productData, categoryId) => {
    try {
      if (!categoryId) {
        throw new Error("Category ID is required");
      }

      // Ensure we have product ID for updates
      if (productData.id) {
        // Update existing product
        const productRef = ref(
          database,
          `products/${categoryId}/${productData.id}`
        );
        const updateData = {
          ...productData,
          updatedAt: new Date().toISOString(),
        };

        // Remove Firebase-generated key if present
        delete updateData[".key"];

        await update(productRef, updateData);
      } else {
        // Create new product
        const newProductRef = ref(database, `products/${categoryId}`);
        const newProduct = {
          ...productData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await push(newProductRef, newProduct);
      }

      setIsProductFormOpen(false);
      return true;
    } catch (error) {
      console.error("Error saving product:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Sidebar />
        <main className="flex-1 p-0 ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <div className="text-gray-700 dark:text-gray-300 font-medium">
                Ürünler yükleniyor...
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />

      <main className="flex-1 p-0 ml-64">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 dark:from-purple-800 dark:to-indigo-900 text-white p-8 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <svg
                    className="w-8 h-8 text-purple-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <div>
                    <h1 className="text-3xl font-bold">
                      {categoryData?.title || "Ürünler"}
                    </h1>
                    <p className="text-purple-100 mt-1">
                      {subCategories.length > 0
                        ? `${subCategories.length} alt kategori ile birlikte ürün yönetimi`
                        : "Kategori ürünlerini yönetin"}
                    </p>
                  </div>
                </div>
              </div>

              {/* İstatistik Kartları */}
              <div className="mt-6 md:mt-0 grid grid-cols-3 gap-4 transition-all duration-300">
                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-purple-100">
                      Toplam
                    </p>
                    <span className="bg-purple-500/30 text-xs px-2 py-0.5 rounded-full text-purple-100">
                      Ürün
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {productStats.total}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-purple-100">
                      Ana Kategori
                    </p>
                    <span className="bg-blue-500/30 text-xs px-2 py-0.5 rounded-full text-blue-100">
                      Ürün
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {productStats.mainCategory}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-purple-100">
                      Alt Kategoriler
                    </p>
                    <span className="bg-indigo-500/30 text-xs px-2 py-0.5 rounded-full text-indigo-100">
                      Ürün
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {productStats.subCategories}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md dark:bg-red-900/20 dark:border-red-500/60 dark:text-red-400">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Main Category Products */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-full mr-3"></div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    {categoryData?.title}{" "}
                    <span className="text-gray-500 dark:text-gray-400 text-lg font-normal">
                      Ürünleri
                    </span>
                  </h2>
                </div>

                <button
                  onClick={() => handleAddProduct(categoryData)}
                  className="group relative px-4 py-2.5 font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 ease-out focus:outline-none"
                >
                  <div className="absolute inset-0 w-3/5 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-[150%] transition-transform duration-700 ease-out"></div>
                  <span className="relative flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Ürün Ekle
                  </span>
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

              {products.length === 0 && (
                <div className="text-center py-10">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    ></path>
                  </svg>
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Henüz ürün bulunamadı
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto mb-6">
                    Bu kategoriye henüz ürün eklenmemiş. İlk ürünü eklemek için
                    Ürün Ekle butonuna tıklayın.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sub Categories Section */}
          {subCategories.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center mb-6">
                <div className="w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-blue-600 rounded-full mr-2"></div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  Alt Kategoriler
                </h2>
              </div>

              <div className="space-y-8">
                {subCategories.map((subCat) => (
                  <div
                    key={subCat.propertyName}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                          <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full mr-3"></div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            {subCat.title}{" "}
                            <span className="text-gray-500 dark:text-gray-400 text-lg font-normal">
                              Ürünleri
                            </span>
                          </h3>
                        </div>

                        <button
                          onClick={() => handleAddProduct(subCat)}
                          className="group relative px-4 py-2.5 font-medium bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 ease-out focus:outline-none"
                        >
                          <div className="absolute inset-0 w-3/5 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-[150%] transition-transform duration-700 ease-out"></div>
                          <span className="relative flex items-center">
                            <svg
                              className="w-5 h-5 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            Ürün Ekle
                          </span>
                        </button>
                      </div>

                      <ProductList
                        products={
                          subCategoryProducts[subCat.propertyName] || []
                        }
                        categoryPropertyName={subCat.propertyName}
                        onEdit={(product) =>
                          handleEditProduct(product, {
                            propertyName: subCat.propertyName,
                            title: subCat.title,
                          })
                        }
                        onDelete={(productId) =>
                          handleDeleteProduct(productId, subCat.propertyName)
                        }
                      />

                      {(!subCategoryProducts[subCat.propertyName] ||
                        subCategoryProducts[subCat.propertyName].length ===
                          0) && (
                        <div className="text-center py-8">
                          <svg
                            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            ></path>
                          </svg>
                          <h3 className="text-base font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Bu alt kategoride henüz ürün bulunmuyor
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                            Yeni bir ürün ekleyin ve stok yönetimine başlayın
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Product Form Modal */}
      {isProductFormOpen && (
        <ProductForm
          isOpen={isProductFormOpen}
          onClose={() => setIsProductFormOpen(false)}
          product={selectedProduct}
          category={selectedCategory}
          categoryId={selectedCategory?.propertyName || categoryPropertyName}
          categoryPropertyName={
            selectedCategory?.propertyName || categoryPropertyName
          }
          updateProduct={updateProduct}
        />
      )}
    </div>
  );
};

export default ProductPage;
