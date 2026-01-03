/** -------------------------
 *  Configuration & Constants
 *  ------------------------- */
export const STORE_KEY = "surveyor_ai_v2";
export const GOOGLE_CLIENT_ID = null; // Backend'den alınacak (/api/user/config)

export const DEFAULT_TEMPLATES = [
  {
    id: "kisa_dogru_tr",
    name: "Kısa & doğru (TR)",
    system: "Türkçe konuş. Sorulara DOĞRU ve KISA cevap ver. Uydurma. Bilmiyorsan 'Bilmiyorum' de."
  },
  {
    id: "aciklayici_tr",
    name: "Açıklayıcı (TR)",
    system: "Türkçe konuş. Net, adım adım ve anlaşılır açıkla. Bilmediğin yerde 'Bilmiyorum' de ve varsayım yapma."
  },
  {
    id: "kod_asistani",
    name: "Kod Asistanı",
    system: "Türkçe konuş. Kod üretirken kısa, çalışır örnek ver. Güvenlik açıklarına yol açacak önerilerden kaçın. Bilmiyorsan 'Bilmiyorum' de."
  },
  {
    id: "gis_sql",
    name: "GIS SQL Asistanı (PostGIS)",
    system: "Türkçe konuş. Kullanıcı PostGIS/SQL isterse: önce ihtiyacı 1 cümleyle özetle, sonra sadece gerekli SQL'i ver. Varsayım yapma. Güvenli sorgu yaz (LIMIT, filtre, açıklama)."
  }
];

