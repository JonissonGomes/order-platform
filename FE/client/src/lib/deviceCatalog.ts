/** Catálogo de marcas/modelos para sugestão na abertura de OS (digitação livre permitida). */

export const DEVICE_BRANDS_BY_TYPE: Record<string, string[]> = {
  Smartphone: [
    "Apple",
    "Samsung",
    "Xiaomi",
    "Motorola",
    "LG",
    "Asus",
    "Realme",
    "OPPO",
    "Huawei",
    "Nokia",
    "Infinix",
    "Tecno",
  ],
  Tablet: ["Apple", "Samsung", "Lenovo", "Xiaomi", "Multilaser", "Positivo"],
  Notebook: ["Dell", "Lenovo", "HP", "Acer", "Asus", "Apple", "Samsung", "Positivo"],
  Smartwatch: ["Apple", "Samsung", "Xiaomi", "Huawei", "Amazfit"],
  Fone: ["Apple", "Samsung", "Xiaomi", "JBL", "Sony", "QCY"],
  Outro: ["Apple", "Samsung", "Xiaomi", "Motorola", "LG", "Outros"],
};

export const DEVICE_MODELS_BY_BRAND: Record<string, string[]> = {
  Apple: [
    "iPhone 11",
    "iPhone 12",
    "iPhone 12 Pro",
    "iPhone 13",
    "iPhone 13 Pro",
    "iPhone 14",
    "iPhone 14 Pro",
    "iPhone 15",
    "iPhone 15 Pro",
    "iPhone 16",
    "iPhone SE",
    "iPad 9ª geração",
    "iPad 10ª geração",
    "iPad Air",
    "iPad Pro",
    "Apple Watch SE",
    "Apple Watch Series 8",
    "AirPods Pro",
  ],
  Samsung: [
    "Galaxy A14",
    "Galaxy A15",
    "Galaxy A54",
    "Galaxy A55",
    "Galaxy S21",
    "Galaxy S22",
    "Galaxy S23",
    "Galaxy S24",
    "Galaxy S25",
    "Galaxy Z Flip",
    "Galaxy Z Fold",
    "Galaxy Tab A8",
    "Galaxy Tab S9",
    "Galaxy Watch",
    "Galaxy Buds",
  ],
  Xiaomi: [
    "Redmi Note 12",
    "Redmi Note 13",
    "Redmi 13C",
    "Poco X5",
    "Poco X6",
    "Mi 11",
    "Mi 12",
    "Redmi Pad",
  ],
  Motorola: [
    "Moto G22",
    "Moto G54",
    "Moto G84",
    "Moto Edge 40",
    "Moto Edge 50",
    "Razr",
  ],
  LG: ["K62", "K52", "G8", "Wing"],
  Asus: ["Zenfone 8", "Zenfone 9", "ROG Phone"],
  Lenovo: ["Tab M8", "Tab M9", "Tab P11", "IdeaPad"],
  Dell: ["Inspiron 15", "Vostro", "XPS 13"],
  HP: ["Pavilion", "250 G8", "EliteBook"],
  Acer: ["Aspire 5", "Aspire 3"],
  Multilaser: ["M7", "M8", "M10"],
  Positivo: ["Twist", "Motion", "Master"],
  Huawei: ["P30", "P40", "MatePad"],
  JBL: ["Tune 510", "Wave Buds"],
  Sony: ["WH-1000XM", "WF-C700"],
};

/** Marcas sugeridas conforme o tipo de aparelho. */
export function brandsForType(productType: string): string[] {
  return DEVICE_BRANDS_BY_TYPE[productType] ?? DEVICE_BRANDS_BY_TYPE.Outro ?? [];
}

/** Modelos sugeridos pela marca (e filtrados pelo tipo quando possível). */
export function modelsForBrand(productType: string, brand: string): string[] {
  const key = brand.trim();
  if (!key) return [];
  const all = DEVICE_MODELS_BY_BRAND[key] ?? [];
  const t = productType.toLowerCase();
  if (t.includes("tablet") || t.includes("ipad")) {
    const tablets = all.filter(m => /ipad|tab|pad|tablet/i.test(m));
    return tablets.length ? tablets : all;
  }
  if (t.includes("watch") || t.includes("smartwatch")) {
    const watches = all.filter(m => /watch/i.test(m));
    return watches.length ? watches : all;
  }
  if (t.includes("fone") || t.includes("airpods") || t.includes("buds")) {
    const audio = all.filter(m => /airpods|buds|tune|wave|wf-|wh-/i.test(m));
    return audio.length ? audio : all;
  }
  if (t.includes("notebook") || t.includes("laptop")) {
    const notebooks = all.filter(m => /inspiron|vostro|xps|pavilion|ideapad|aspire|elitebook|twist|motion|master/i.test(m));
    return notebooks.length ? notebooks : all;
  }
  // Smartphone / padrão: exclui claramente tablet/watch quando houver alternativas
  const phones = all.filter(m => !/ipad|tab(?!s)|pad\b|watch|airpods|buds/i.test(m));
  return phones.length ? phones : all;
}
