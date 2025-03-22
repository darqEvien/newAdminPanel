import { useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL, listAll } from "firebase/storage";
import { update, ref as dbRef } from "firebase/database";
import { storage, database } from "../../firebase/firebaseConfig";
import { jsPDF } from "jspdf";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { erologoBase64 } from "../../assets/digerLogo"; // Logo için bu dosyayı oluşturmanız gerekecek

// Font dosyalarını import edin (bunları assets klasörüne eklemeniz gerekecek)
import robotoNormal from "../../assets/fonts/Roboto-Regular-normal.js";
import robotoMedium from "../../assets/fonts/Roboto-Medium-normal.js";

const PdfGenerator = ({
  customer,
  orderData,
  isMainOrder,
  orderKey,
  categories,
}) => {
  const [generating, setGenerating] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch existing PDFs when component mounts
  useEffect(() => {
    fetchPdfs();
  }, []);

  const fetchPdfs = async () => {
    try {
      setLoading(true);
      const path = isMainOrder
        ? `pdfs/customers/${customer.id}`
        : `pdfs/customers/${customer.id}/otherOrders/${orderKey}`;

      const pdfListRef = ref(storage, path);

      try {
        const result = await listAll(pdfListRef);

        const pdfFiles = await Promise.all(
          result.items.map(async (item) => {
            const downloadUrl = await getDownloadURL(item);
            // Extract date from filename (assuming format: order_YYYY-MM-DD_HH-MM-SS.pdf)
            const nameParts = item.name.split("_");
            let dateStr = "No date";
            if (nameParts.length > 1) {
              const datePart = nameParts[1];
              const timePart = nameParts[2]?.replace(".pdf", "") || "";
              dateStr = `${datePart} ${timePart.replace("-", ":")}`;
            }

            return {
              name: item.name,
              url: downloadUrl,
              date: dateStr,
            };
          })
        );

        // Sort by date descending (newest first)
        pdfFiles.sort((a, b) => b.name.localeCompare(a.name));
        setPdfs(pdfFiles);
      } catch (error) {
        // If directory doesn't exist yet, set empty array
        if (error.code === "storage/object-not-found") {
          setPdfs([]);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      toast.error("PDF listesi yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = async () => {
    try {
      setGenerating(true);
      toast.info("PDF oluşturuluyor...");

      // Yeni tasarıma göre PDF oluşturalım
      const doc = new jsPDF({
        orientation: "p",
        unit: "pt",
        format: "a4",
        putOnlyUsedFonts: true,
        floatPrecision: 16,
      });

      // Font ayarlarını yapabiliriz, ancak eski font dosyaları olmadığı için varsayılan fontları kullanalım

      doc.addFileToVFS("Roboto-Regular-normal.ttf", robotoNormal);
      doc.addFileToVFS("Roboto-Medium-normal.ttf", robotoMedium);
      doc.addFont("Roboto-Regular-normal.ttf", "Roboto", "normal");
      doc.addFont("Roboto-Medium-normal.ttf", "Roboto", "medium");
      doc.setFont("Roboto", "normal");

      // Layout ayarları
      const margins = { top: 30, right: 40, bottom: 40, left: 40 };
      const layout = {
        margins,
        lineHeight: 14,
        contentWidth:
          doc.internal.pageSize.width - margins.left - margins.right,
        pageHeight: doc.internal.pageSize.height - margins.bottom,
        columnGap: 20,
        columnWidth:
          (doc.internal.pageSize.width - margins.left - margins.right - 20) / 2,
      };

      let currentY = margins.top;

      // Şirket başlığı ekleme
      const addCompanyHeader = () => {
        const headerHeight = 70;

        doc.setFillColor(44, 62, 80);
        doc.rect(0, 0, doc.internal.pageSize.width, headerHeight, "F");

        try {
          // Logo ekleme - eğer logo varsa
          if (typeof erologoBase64 !== "undefined") {
            doc.addImage(
              `data:image/png;base64,${erologoBase64}`,
              "PNG",
              layout.margins.left,
              10,
              45,
              50
            );
          }
        } catch (error) {
          console.error("Logo yüklenemedi:", error);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("Roboto", "medium");
        doc.text("Söz Çelik Prefabrik", layout.margins.left + 60, 40);

        currentY = headerHeight + 20;
        doc.setTextColor(0, 0, 0);
        doc.setFont("Roboto", "normal");
      };

      // Sipariş bilgileri ekleme
      const addOrderInformation = () => {
        const boxStartY = currentY;
        const boxPadding = 15;

        doc.setFillColor(249, 250, 251);
        doc.rect(
          layout.margins.left - boxPadding,
          boxStartY - boxPadding,
          layout.contentWidth + boxPadding * 2,
          100,
          "F"
        );

        const leftCol = layout.margins.left;
        const rightCol = layout.margins.left + layout.contentWidth / 2;

        doc.setFontSize(16);
        doc.setFont("Roboto", "medium");
        doc.text("Sipariş Detayları", leftCol, currentY);
        currentY += layout.lineHeight * 2;

        const orderDate = new Date().toLocaleString("tr-TR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const orderNumber = `ORD-${Date.now()}`;

        doc.setFontSize(11);
        doc.setFont("Roboto", "normal");
        doc.text(`Sipariş No: ${orderNumber}`, leftCol, currentY);
        doc.text(`Sipariş Tarihi: ${orderDate}`, rightCol, currentY);
        currentY += layout.lineHeight;

        doc.text(`İsim Soyisim: ${customer.fullName}`, leftCol, currentY);
        doc.text(`Telefon: ${customer.phone || "-"}`, rightCol, currentY);
        currentY += layout.lineHeight;

        doc.text(`Email: ${customer.email || "-"}`, leftCol, currentY);
        currentY += layout.lineHeight * 2;

        if (orderData.notes) {
          doc.setFont("Roboto", "medium");
          doc.text("Sipariş Notu:", leftCol, currentY);
          currentY += layout.lineHeight;

          doc.setFont("Roboto", "normal");
          const messageLines = doc.splitTextToSize(
            orderData.notes,
            layout.contentWidth
          );
          messageLines.forEach((line) => {
            doc.text(line, leftCol, currentY);
            currentY += layout.lineHeight;
          });
        }

        currentY += layout.lineHeight * 2;
      };

      // addProductsSection fonksiyonunu güncelle

      const addProductsSection = () => {
        // Section header
        doc.setFontSize(16);
        doc.setFont("Roboto", "medium");
        doc.text("Seçilen Ürünler", layout.margins.left, currentY);
        currentY += layout.lineHeight * 2;

        let leftColumnY = currentY;
        let rightColumnY = currentY;
        let isLeftColumn = true;

        // Debug için orderData yapısını günlüğe kaydet
        console.log("OrderData yapısı:", orderData);
        console.log("Category keys:", Object.keys(categories));

        // Ana ürün verilerini kontrol edelim
        const productData = orderData.products?.[0] || orderData; // products/0 altında veya doğrudan orderData içinde olabilir

        // Kategorileri filtrele ve sırala
        const filteredCategories = Object.entries(categories || {}).sort(
          ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0)
        );

        // Bonus ürünlerini kategorilerine göre organize et
        const bonusByCategory = {};
        if (orderData.bonus && orderData.bonus.length > 0) {
          orderData.bonus.forEach((item) => {
            const categoryName = item.category || "diger";
            if (!bonusByCategory[categoryName]) {
              bonusByCategory[categoryName] = [];
            }
            bonusByCategory[categoryName].push(item);
          });
        }

        filteredCategories.forEach(([categoryKey, category]) => {
          // Kategori özellik adını al
          const categoryPropertyName = category.propertyName || categoryKey;

          // Ürünleri bul - ya doğrudan orderData'dan veya products/0 içinden
          let categoryProducts = null;

          if (productData[categoryPropertyName]) {
            // Doğrudan mevcut ise kullan
            categoryProducts = productData[categoryPropertyName];
          } else if (productData[categoryKey]) {
            // Veya anahtar ile eşleşiyorsa kullan
            categoryProducts = productData[categoryKey];
          }

          // Bu kategoriye ait bonus ürünleri bul
          const bonusProducts = bonusByCategory[categoryPropertyName] || [];

          // Özel alanları atla
          if (
            ((!categoryProducts ||
              Object.keys(categoryProducts).length === 0) &&
              bonusProducts.length === 0) ||
            [
              "status",
              "verandaWidth",
              "verandaHeight",
              "dimensions",
              "kontiWidth",
              "kontiHeight",
              "notes",
              "anaWidth",
              "anaHeight",
              "bonus", // bonus'u da atla çünkü artık kategorilere entegre edildi
            ].includes(categoryKey) ||
            [
              "status",
              "verandaWidth",
              "verandaHeight",
              "dimensions",
              "kontiWidth",
              "kontiHeight",
              "notes",
              "anaWidth",
              "anaHeight",
              "bonus",
            ].includes(categoryPropertyName)
          ) {
            return;
          }

          // Kategorideki normal ürünler
          let products = [];
          if (categoryProducts) {
            products = Array.isArray(categoryProducts)
              ? categoryProducts.map((item, idx) => [String(idx), item])
              : Object.entries(categoryProducts);
          }

          // Bonus ürünleri de ekle
          const bonusProductEntries = bonusProducts.map((item, idx) => [
            `bonus-${idx}`,
            {
              name: item.product,
              price: item.price,
              isBonus: true,
            },
          ]);

          // Tüm ürünleri birleştir (normal + bonus)
          const allProducts = [...products, ...bonusProductEntries];

          if (allProducts.length === 0) {
            return; // Eğer hiç ürün yoksa bu kategoriyi atla
          }

          const currentY = isLeftColumn ? leftColumnY : rightColumnY;
          const xPos = isLeftColumn
            ? layout.margins.left
            : layout.margins.left + layout.columnWidth + layout.columnGap;

          // Kategori kutusu arka plan
          doc.setFillColor(244, 244, 244);
          doc.rect(xPos - 5, currentY - 5, layout.columnWidth + 10, 30, "F");

          // Kategori başlığı
          doc.setFontSize(12);
          doc.setFont("Roboto", "medium");
          doc.text(category.title || categoryKey, xPos + 10, currentY + 15);
          let yOffset = layout.lineHeight * 3;

          allProducts.forEach(([, product]) => {
            // Ürün bir object olmayabilir, kontrol edelim
            const productObj =
              typeof product === "object"
                ? product
                : { name: String(product), price: 0 };

            const price = Number(productObj.price || 0);
            const name =
              productObj.name || productObj.product || String(product);
            const isBonus = productObj.isBonus || false;

            // Bonus ürünü ise ürün adının önüne (Bonus) ekle
            const productName = `• ${isBonus ? "" : ""}${name}`;
            const maxWidth = layout.columnWidth - 90;
            const lines = doc.splitTextToSize(productName, maxWidth);

            doc.setFontSize(11);
            doc.setFont("Roboto", "normal");

            lines.forEach((line, index) => {
              // Sayfa kontrolü
              if (
                currentY + yOffset + index * layout.lineHeight >
                layout.pageHeight
              ) {
                doc.addPage();
                addCompanyHeader();
                yOffset = layout.lineHeight * 3;
                leftColumnY = currentY;
                rightColumnY = currentY;
              }

              doc.text(
                line,
                xPos + 15,
                currentY + yOffset + index * layout.lineHeight
              );

              // İlk satırda fiyatı göster
              if (index === 0) {
                doc.setFont("Roboto", "medium");
                doc.text(
                  price === 0
                    ? "Standart"
                    : `${Math.round(price).toLocaleString("tr-TR")}₺`,
                  xPos + layout.columnWidth - 60,
                  currentY + yOffset + index * layout.lineHeight
                );
                doc.setFont("Roboto", "normal");
              }
            });

            yOffset += lines.length * layout.lineHeight + 5;
          });

          if (isLeftColumn) {
            leftColumnY = currentY + yOffset;
          } else {
            rightColumnY = currentY + yOffset;
          }

          // Yeni sayfa kontrolü
          if (
            !isLeftColumn &&
            Math.max(leftColumnY, rightColumnY) > layout.pageHeight - 60
          ) {
            doc.addPage();
            addCompanyHeader();
            leftColumnY = currentY;
            rightColumnY = currentY;
          }

          isLeftColumn = !isLeftColumn;
        });

        // Kategori bilgisi olmayan bonus ürünleri için "Diğer" kategori ekle
        const uncategorizedBonus =
          orderData.bonus?.filter((item) => !item.category) || [];

        if (uncategorizedBonus.length > 0) {
          const currentY = isLeftColumn ? leftColumnY : rightColumnY;
          const xPos = isLeftColumn
            ? layout.margins.left
            : layout.margins.left + layout.columnWidth + layout.columnGap;

          // "Diğer" kategori kutusu arka plan
          doc.setFillColor(244, 244, 244);
          doc.rect(xPos - 5, currentY - 5, layout.columnWidth + 10, 30, "F");

          // Kategori başlığı
          doc.setFontSize(12);
          doc.setFont("Roboto", "medium");
          doc.text("Bonus Ürünler (Diğer)", xPos + 10, currentY + 15);
          let yOffset = layout.lineHeight * 3;

          // Kategorisiz bonus ürünlerini ekle
          uncategorizedBonus.forEach((item) => {
            const price = Number(item.price || 0);
            const productName = `• ${item.product || "-"}`;
            const maxWidth = layout.columnWidth - 90;
            const lines = doc.splitTextToSize(productName, maxWidth);

            doc.setFontSize(11);
            doc.setFont("Roboto", "normal");

            lines.forEach((line, index) => {
              // Sayfa kontrolü
              if (
                currentY + yOffset + index * layout.lineHeight >
                layout.pageHeight
              ) {
                doc.addPage();
                addCompanyHeader();
                yOffset = layout.lineHeight * 3;
                leftColumnY = currentY;
                rightColumnY = currentY;
              }

              doc.text(
                line,
                xPos + 15,
                currentY + yOffset + index * layout.lineHeight
              );

              // İlk satırda fiyatı göster
              if (index === 0) {
                doc.setFont("Roboto", "medium");
                doc.text(
                  price === 0
                    ? "Standart"
                    : `${Math.round(price).toLocaleString("tr-TR")}₺`,
                  xPos + layout.columnWidth - 60,
                  currentY + yOffset + index * layout.lineHeight
                );
                doc.setFont("Roboto", "normal");
              }
            });

            yOffset += lines.length * layout.lineHeight + 5;
          });

          if (isLeftColumn) {
            leftColumnY = currentY + yOffset;
          } else {
            rightColumnY = currentY + yOffset;
          }
        }

        currentY = Math.max(leftColumnY, rightColumnY) + layout.lineHeight;
      };

      // Toplam tutar ekleme
      const addTotal = (totalPrice) => {
        doc.setFillColor(244, 244, 244);
        doc.rect(
          layout.margins.left - 5,
          currentY - 5,
          layout.contentWidth + 10,
          40,
          "F"
        );

        doc.setFontSize(14);
        doc.setFont("Roboto", "medium");
        doc.text("Toplam Tutar:", layout.margins.left + 10, currentY + 20);

        doc.text(
          totalPrice.toLocaleString("tr-TR") + " TL",
          layout.margins.left + layout.contentWidth - 100,
          currentY + 20
        );
      };

      // Footer ekleme
      const addFooter = () => {
        const pageCount = doc.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(9);
          doc.setTextColor(128, 128, 128);

          const pageText = `Sayfa ${i} / ${pageCount}`;
          doc.text(
            pageText,
            layout.margins.left,
            doc.internal.pageSize.height - 20
          );

          const footerText = "Söz Çelik Prefabrik © 2025";
          const textWidth =
            (doc.getStringUnitWidth(footerText) * doc.getFontSize()) /
            doc.internal.scaleFactor;
          doc.text(
            footerText,
            layout.contentWidth - textWidth + layout.margins.left,
            doc.internal.pageSize.height - 20
          );
        }
      };

      // Toplam fiyat hesaplama bloğunu tamamen yenileyelim

      // Debug için mevcut değerleri konsola yazdıralım
      console.log("Customer data:", customer);
      console.log("OrderData:", orderData);

      // Toplam fiyatı doğru yoldan alalım
      let totalPrice = 0;

      // 1. Firebase'den gelen totalPrice değerini kontrol et (doğru yoldan)
      if (customer.totalPrice !== undefined) {
        totalPrice = Number(customer.totalPrice);
        console.log("customer.totalPrice kullanıldı:", totalPrice);
      }
      // 2. Alternatif yazılım şekillerini kontrol et
      else if (customer.totalprice !== undefined) {
        totalPrice = Number(customer.totalprice);
        console.log("customer.totalprice kullanıldı:", totalPrice);
      }
      // 3. OrderData içinde kontrol et
      else if (orderData.totalPrice !== undefined) {
        totalPrice = Number(orderData.totalPrice);
        console.log("orderData.totalPrice kullanıldı:", totalPrice);
      } else if (orderData.totalprice !== undefined) {
        totalPrice = Number(orderData.totalprice);
        console.log("orderData.totalprice kullanıldı:", totalPrice);
      }
      // 4. Diğer siparişlerde doğrudan customer'dan değil, otherOrders/{orderKey}/totalPrice içinden alınmalı
      else if (
        !isMainOrder &&
        customer.otherOrders &&
        customer.otherOrders[orderKey]
      ) {
        const otherOrderPrice =
          customer.otherOrders[orderKey].totalPrice ||
          customer.otherOrders[orderKey].totalprice;
        if (otherOrderPrice !== undefined) {
          totalPrice = Number(otherOrderPrice);
          console.log(
            "customer.otherOrders[orderKey].totalPrice kullanıldı:",
            totalPrice
          );
        }
      }
      // 5. Hala bulunamadıysa, hesaplama yapalım
      else {
        console.log("TotalPrice bulunamadı, ürünlerden hesaplanıyor...");

        // İki kez toplamamak için mevcut değeri sıfırla
        totalPrice = 0;

        // Ürünleri doğru kaynaktan alalım
        const productData = orderData.products?.[0] || orderData;

        // Tüm kategorileri ve ürünleri toplayalım
        for (const [categoryName, categoryProducts] of Object.entries(
          productData
        )) {
          if (
            typeof categoryProducts !== "object" ||
            [
              "status",
              "verandaWidth",
              "verandaHeight",
              "dimensions",
              "kontiWidth",
              "kontiHeight",
              "notes",
              "anaWidth",
              "anaHeight",
              "totalprice",
              "totalPrice",
              "bonus",
            ].includes(categoryName)
          ) {
            continue;
          }

          if (Array.isArray(categoryProducts)) {
            categoryProducts.forEach((product) => {
              if (typeof product === "object" && product !== null) {
                totalPrice += Number(product.price || 0);
              }
            });
          } else {
            Object.entries(categoryProducts).forEach(([, product]) => {
              if (typeof product === "object" && product !== null) {
                totalPrice += Number(product.price || 0);
              }
            });
          }
        }

        // Bonus ürünleri de ekleyelim
        if (orderData.bonus && orderData.bonus.length > 0) {
          orderData.bonus.forEach((item) => {
            totalPrice += Number(item.price || 0);
          });
        }
      }

      // Son kontrol ve düzeltme
      if (isNaN(totalPrice)) {
        console.warn("Hesaplanan fiyat NaN, 0 olarak ayarlanıyor");
        totalPrice = 0;
      }

      console.log("Son toplam fiyat:", totalPrice);

      // PDF oluşturma işlemleri
      addCompanyHeader();
      addOrderInformation();
      addProductsSection();
      addTotal(totalPrice);
      addFooter();

      // Generate filename with date and time
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const fileName = `order_${dateStr}_${timeStr}.pdf`;

      // Get PDF as Blob
      const pdfBlob = doc.output("blob");

      // Define the path to save the PDF
      const path = isMainOrder
        ? `pdfs/customers/${customer.id}/${fileName}`
        : `pdfs/customers/${customer.id}/otherOrders/${orderKey}/${fileName}`;

      // Upload to Firebase Storage
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, pdfBlob);

      // Get download URL
      const downloadUrl = await getDownloadURL(fileRef);

      // Update database with PDF URL
      const dbPath = isMainOrder
        ? `customers/${customer.id}/pdfs`
        : `customers/${customer.id}/otherOrders/${orderKey}/pdfs`;

      const updates = {};
      updates[`${dbPath}/${Date.now()}`] = {
        url: downloadUrl,
        fileName: fileName,
        createdAt: Date.now(),
      };

      // Also update the last pdfUrl for backward compatibility
      if (isMainOrder) {
        updates[`customers/${customer.id}/pdfUrl`] = downloadUrl;
      } else {
        updates[`customers/${customer.id}/otherOrders/${orderKey}/pdfUrl`] =
          downloadUrl;
      }

      await update(dbRef(database), updates);

      // Refresh PDF list
      fetchPdfs();

      toast.success("PDF başarıyla oluşturuldu");
      return downloadUrl;
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("PDF oluşturulurken bir hata oluştu");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-100">PDF Yönetimi</h2>
        <button
          onClick={generatePdf}
          disabled={generating}
          className="flex items-center gap-2 py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Oluşturuluyor...</span>
            </>
          ) : (
            <>
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Yeni PDF Oluştur</span>
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <svg
            className="animate-spin h-8 w-8 text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : pdfs.length === 0 ? (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 text-gray-500 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-400 mb-4">Henüz PDF dosyası oluşturulmamış</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pdfs.map((pdf, index) => (
            <div
              key={index}
              className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 flex justify-between items-center group hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-red-500/20 p-2 rounded">
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">
                    {pdf.name}
                  </p>
                  <p className="text-xs text-gray-400">{pdf.date}</p>
                </div>
              </div>
              <a
                href={pdf.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 text-sm bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded border border-blue-600/30 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <span>Görüntüle</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

PdfGenerator.propTypes = {
  customer: PropTypes.object.isRequired,
  orderData: PropTypes.object.isRequired,
  isMainOrder: PropTypes.bool.isRequired,
  orderKey: PropTypes.string.isRequired,
  categories: PropTypes.object.isRequired,
};

export default PdfGenerator;
