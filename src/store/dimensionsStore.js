import { create } from "zustand";

export const useDimensionsStore = create((set, get) => ({
  // State değerleri
  kontiWidth: 0,
  kontiHeight: 0,
  anaWidth: 0,
  anaHeight: 0,
  verandaWidth: "Seçilmedi",
  verandaHeight: "Seçilmedi",
  length: 0,

  // Fiyat hesaplamalarını tetikleyecek flag
  needsRecalculation: false,

  // Tüm boyutları ayarlayan metod
  initializeDimensions: (dims) =>
    set({
      kontiWidth: Number(dims?.kontiWidth || 0),
      kontiHeight: Number(dims?.kontiHeight || 0),
      anaWidth: Number(dims?.anaWidth || 0),
      anaHeight: Number(dims?.anaHeight || 0),
      verandaWidth: dims?.verandaWidth || "Seçilmedi",
      verandaHeight: dims?.verandaHeight || "Seçilmedi",
      length: Number(dims?.length || 0),
      needsRecalculation: true, // Initialize olunca recalculation flag'ini aktive et
    }),

  // Tek bir boyutu güncelleyen metod
  updateDimension: (key, value) => {
    const prevState = get();
    const newValue = typeof value === "string" ? value : Number(value) || 0;

    // Değer değişmişse güncelle
    if (prevState[key] !== newValue) {
      set({
        [key]: newValue,
        needsRecalculation: true, // Boyut değiştiğinde recalculation flag'ini set et
      });
      console.log(
        `Dimension ${key} updated: ${prevState[key]} -> ${newValue}, triggering recalculation`
      );
    }
  },

  // En ve boy boyutlarını aynı anda güncelleyen metod
  updateKontiDimensions: (width, height) => {
    const prevState = get();
    const newWidth = Number(width) || 0;
    const newHeight = Number(height) || 0;

    // Değer değişmişse güncelle
    if (
      prevState.kontiWidth !== newWidth ||
      prevState.kontiHeight !== newHeight
    ) {
      set({
        kontiWidth: newWidth,
        kontiHeight: newHeight,
        anaWidth: newWidth,
        anaHeight: newHeight,
        needsRecalculation: true, // Boyutlar değiştiğinde recalculation flag'ini set et
      });
      console.log(
        `Konti dimensions updated: ${prevState.kontiWidth}x${prevState.kontiHeight} -> ${newWidth}x${newHeight}, triggering recalculation`
      );
    }
  },

  // Recalculation flag'ini sıfırlayan metod
  resetRecalculationFlag: () => set({ needsRecalculation: false }),

  // Tüm boyutları döndüren yardımcı metod
  getAllDimensions: () => {
    const state = get();
    return {
      kontiWidth: state.kontiWidth,
      kontiHeight: state.kontiHeight,
      anaWidth: state.anaWidth,
      anaHeight: state.anaHeight,
      verandaWidth: state.verandaWidth,
      verandaHeight: state.verandaHeight,
      length: state.length,
    };
  },
}));

export default useDimensionsStore;
