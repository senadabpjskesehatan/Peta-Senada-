// Comprehensive Geographic Coordinates Registry for all Indonesian Cities, Regencies (Kabupaten), 
// Provincial Capitals, and Kantor Cabang (KC) across 38 Provinces.

export interface GeoCoordinate {
  lat: number;
  lon: number;
}

export const INDONESIAN_CITIES_COORDINATES: Record<string, GeoCoordinate> = {
  // ==========================================
  // 1. DKI JAKARTA & SEKITARNYA
  // ==========================================
  'jakarta': { lat: -6.2088, lon: 106.8456 },
  'dki jakarta': { lat: -6.2088, lon: 106.8456 },
  'jakarta pusat': { lat: -6.1818, lon: 106.8373 },
  'jakarta selatan': { lat: -6.2615, lon: 106.8106 },
  'jakarta timur': { lat: -6.2250, lon: 106.9004 },
  'jakarta barat': { lat: -6.1683, lon: 106.7589 },
  'jakarta utara': { lat: -6.1214, lon: 106.8827 },
  'kepulauan seribu': { lat: -5.6122, lon: 106.5619 },
  'gambir': { lat: -6.1754, lon: 106.8272 },
  'kebayoran': { lat: -6.2444, lon: 106.7925 },
  'kebayoran baru': { lat: -6.2444, lon: 106.7925 },
  'kebayoran lama': { lat: -6.2500, lon: 106.7750 },
  'rawamangun': { lat: -6.1967, lon: 106.8889 },
  'jatinegara': { lat: -6.2167, lon: 106.8700 },
  'tanah abang': { lat: -6.1950, lon: 106.8150 },
  'tanjung priok': { lat: -6.1311, lon: 106.8800 },
  'kelapa gading': { lat: -6.1583, lon: 106.9083 },
  'grogol': { lat: -6.1639, lon: 106.7889 },
  'glodok': { lat: -6.1439, lon: 106.8150 },
  'kemayoran': { lat: -6.1611, lon: 106.8611 },
  'cilandak': { lat: -6.2950, lon: 106.8000 },
  'pasar minggu': { lat: -6.2850, lon: 106.8400 },

  // ==========================================
  // 2. JAWA BARAT & BANTEN
  // ==========================================
  'bandung': { lat: -6.9175, lon: 107.6191 },
  'kota bandung': { lat: -6.9175, lon: 107.6191 },
  'kabupaten bandung': { lat: -7.0322, lon: 107.5183 },
  'bandung barat': { lat: -6.8536, lon: 107.4939 },
  'soreang': { lat: -7.0322, lon: 107.5183 },
  'ngamprah': { lat: -6.8536, lon: 107.4939 },
  'padalarang': { lat: -6.8400, lon: 107.4800 },
  'cimahi': { lat: -6.8722, lon: 107.5422 },
  'bogor': { lat: -6.5971, lon: 106.8060 },
  'kota bogor': { lat: -6.5971, lon: 106.8060 },
  'kabupaten bogor': { lat: -6.4817, lon: 106.8539 },
  'cibinong': { lat: -6.4817, lon: 106.8539 },
  'depok': { lat: -6.4025, lon: 106.7942 },
  'kota depok': { lat: -6.4025, lon: 106.7942 },
  'bekasi': { lat: -6.2383, lon: 106.9756 },
  'kota bekasi': { lat: -6.2383, lon: 106.9756 },
  'kabupaten bekasi': { lat: -6.3039, lon: 107.1539 },
  'cikarang': { lat: -6.3039, lon: 107.1539 },
  'tangerang': { lat: -6.1783, lon: 106.6300 },
  'kota tangerang': { lat: -6.1783, lon: 106.6300 },
  'kabupaten tangerang': { lat: -6.2750, lon: 106.4950 },
  'tigaraksa': { lat: -6.2750, lon: 106.4950 },
  'tangerang selatan': { lat: -6.2886, lon: 106.7179 },
  'tangsel': { lat: -6.2886, lon: 106.7179 },
  'bsd': { lat: -6.3017, lon: 106.6850 },
  'ciputat': { lat: -6.3117, lon: 106.7450 },
  'serang': { lat: -6.1153, lon: 106.1542 },
  'kota serang': { lat: -6.1153, lon: 106.1542 },
  'kabupaten serang': { lat: -6.1200, lon: 106.0000 },
  'ciruas': { lat: -6.1150, lon: 106.2300 },
  'cilegon': { lat: -6.0167, lon: 106.0500 },
  'pandeglang': { lat: -6.3083, lon: 106.1067 },
  'lebak': { lat: -6.3583, lon: 106.2483 },
  'rangkasbitung': { lat: -6.3583, lon: 106.2483 },
  'sukabumi': { lat: -6.9277, lon: 106.9300 },
  'kota sukabumi': { lat: -6.9277, lon: 106.9300 },
  'kabupaten sukabumi': { lat: -6.9833, lon: 106.5500 },
  'pelabuhan ratu': { lat: -6.9833, lon: 106.5500 },
  'pelabuhanratu': { lat: -6.9833, lon: 106.5500 },
  'cianjur': { lat: -6.8222, lon: 107.1394 },
  'karawang': { lat: -6.3047, lon: 107.3075 },
  'purwakarta': { lat: -6.5569, lon: 107.4433 },
  'subang': { lat: -6.5714, lon: 107.7594 },
  'sumedang': { lat: -6.8378, lon: 107.9272 },
  'garut': { lat: -7.2167, lon: 107.9000 },
  'tasikmalaya': { lat: -7.3274, lon: 108.2207 },
  'kota tasikmalaya': { lat: -7.3274, lon: 108.2207 },
  'singaparna': { lat: -7.3500, lon: 108.1167 },
  'ciamis': { lat: -7.3256, lon: 108.3533 },
  'banjar': { lat: -7.3694, lon: 108.5333 },
  'kota banjar': { lat: -7.3694, lon: 108.5333 },
  'pangandaran': { lat: -7.6833, lon: 108.6500 },
  'cirebon': { lat: -6.7320, lon: 108.5523 },
  'kota cirebon': { lat: -6.7320, lon: 108.5523 },
  'kabupaten cirebon': { lat: -6.7617, lon: 108.4839 },
  'sumber': { lat: -6.7617, lon: 108.4839 },
  'kuningan': { lat: -6.9767, lon: 108.4833 },
  'majalengka': { lat: -6.8361, lon: 108.2278 },
  'indramayu': { lat: -6.3264, lon: 108.3200 },

  // ==========================================
  // 3. JAWA TENGAH & DI YOGYAKARTA
  // ==========================================
  'semarang': { lat: -6.9667, lon: 110.4167 },
  'kota semarang': { lat: -6.9667, lon: 110.4167 },
  'kabupaten semarang': { lat: -7.1394, lon: 110.4042 },
  'ungaran': { lat: -7.1394, lon: 110.4042 },
  'salatiga': { lat: -7.3306, lon: 110.5083 },
  'kendal': { lat: -6.9231, lon: 110.2036 },
  'demak': { lat: -6.8944, lon: 110.6389 },
  'kudus': { lat: -6.8047, lon: 110.8406 },
  'jepara': { lat: -6.5897, lon: 110.6683 },
  'pati': { lat: -6.7561, lon: 111.0378 },
  'rembang': { lat: -6.7106, lon: 111.3439 },
  'blora': { lat: -6.9697, lon: 111.4183 },
  'grobogan': { lat: -7.0869, lon: 110.9158 },
  'purwodadi': { lat: -7.0869, lon: 110.9158 },
  'pekalongan': { lat: -6.8886, lon: 109.6753 },
  'kota pekalongan': { lat: -6.8886, lon: 109.6753 },
  'kajen': { lat: -7.0300, lon: 109.6000 },
  'batang': { lat: -6.9108, lon: 109.7300 },
  'pemalang': { lat: -6.8906, lon: 109.3806 },
  'tegal': { lat: -6.8694, lon: 109.1250 },
  'kota tegal': { lat: -6.8694, lon: 109.1250 },
  'slawi': { lat: -6.9856, lon: 109.1381 },
  'brebes': { lat: -6.8703, lon: 109.0433 },
  'surakarta': { lat: -7.5755, lon: 110.8243 },
  'solo': { lat: -7.5755, lon: 110.8243 },
  'kota surakarta': { lat: -7.5755, lon: 110.8243 },
  'boyolali': { lat: -7.5333, lon: 110.5958 },
  'klaten': { lat: -7.7056, lon: 110.6044 },
  'sukoharjo': { lat: -7.6833, lon: 110.8333 },
  'wonogiri': { lat: -7.8167, lon: 110.9250 },
  'karanganyar': { lat: -7.5967, lon: 110.9508 },
  'sragen': { lat: -7.4267, lon: 111.0219 },
  'magelang': { lat: -7.4706, lon: 110.2178 },
  'kota magelang': { lat: -7.4706, lon: 110.2178 },
  'mungkid': { lat: -7.5819, lon: 110.2356 },
  'temanggung': { lat: -7.3167, lon: 110.1764 },
  'wonosobo': { lat: -7.3639, lon: 109.9000 },
  'purworejo': { lat: -7.7167, lon: 110.0167 },
  'kebumen': { lat: -7.6694, lon: 109.6547 },
  'purwokerto': { lat: -7.4244, lon: 109.2301 },
  'banyumas': { lat: -7.4244, lon: 109.2301 },
  'cilacap': { lat: -7.7186, lon: 109.0156 },
  'purbalingga': { lat: -7.3889, lon: 109.3639 },
  'banjarnegara': { lat: -7.3975, lon: 109.6969 },
  'yogyakarta': { lat: -7.7956, lon: 110.3695 },
  'jogja': { lat: -7.7956, lon: 110.3695 },
  'kota yogyakarta': { lat: -7.7956, lon: 110.3695 },
  'sleman': { lat: -7.7167, lon: 110.3556 },
  'bantul': { lat: -7.8894, lon: 110.3292 },
  'kulon progo': { lat: -7.8578, lon: 110.1583 },
  'wates': { lat: -7.8578, lon: 110.1583 },
  'gunungkidul': { lat: -7.9658, lon: 110.6025 },
  'wonosari': { lat: -7.9658, lon: 110.6025 },

  // ==========================================
  // 4. JAWA TIMUR & MADURA
  // ==========================================
  'surabaya': { lat: -7.2575, lon: 112.7521 },
  'kota surabaya': { lat: -7.2575, lon: 112.7521 },
  'sidoarjo': { lat: -7.4478, lon: 112.7183 },
  'gresik': { lat: -7.1567, lon: 112.6556 },
  'mojokerto': { lat: -7.4722, lon: 112.4339 },
  'kota mojokerto': { lat: -7.4722, lon: 112.4339 },
  'mojosari': { lat: -7.5300, lon: 112.5500 },
  'jombang': { lat: -7.5458, lon: 112.2331 },
  'bojonegoro': { lat: -7.1500, lon: 111.8817 },
  'tuban': { lat: -6.8975, lon: 112.0647 },
  'lamongan': { lat: -7.1197, lon: 112.4131 },
  'madiun': { lat: -7.6298, lon: 111.5239 },
  'kota madiun': { lat: -7.6298, lon: 111.5239 },
  'caruban': { lat: -7.5500, lon: 111.6600 },
  'magetan': { lat: -7.6528, lon: 111.3281 },
  'ngawi': { lat: -7.4042, lon: 111.4456 },
  'ponorogo': { lat: -7.8694, lon: 111.4625 },
  'pacitan': { lat: -8.1969, lon: 111.0933 },
  'kediri': { lat: -7.8167, lon: 112.0167 },
  'kota kediri': { lat: -7.8167, lon: 112.0167 },
  'pare': { lat: -7.7700, lon: 112.1900 },
  'nganjuk': { lat: -7.6047, lon: 111.9039 },
  'blitar': { lat: -8.0983, lon: 112.1681 },
  'kota blitar': { lat: -8.0983, lon: 112.1681 },
  'kanigoro': { lat: -8.1300, lon: 112.2200 },
  'tulungagung': { lat: -8.0667, lon: 111.9000 },
  'trenggalek': { lat: -8.0500, lon: 111.7167 },
  'malang': { lat: -7.9650, lon: 112.6304 },
  'kota malang': { lat: -7.9650, lon: 112.6304 },
  'kepanjen': { lat: -8.1300, lon: 112.5700 },
  'batu': { lat: -7.8706, lon: 112.5272 },
  'kota batu': { lat: -7.8706, lon: 112.5272 },
  'pasuruan': { lat: -7.6469, lon: 112.9078 },
  'kota pasuruan': { lat: -7.6469, lon: 112.9078 },
  'bangil': { lat: -7.5900, lon: 112.8000 },
  'probolinggo': { lat: -7.7540, lon: 113.2159 },
  'kota probolinggo': { lat: -7.7540, lon: 113.2159 },
  'kraksaan': { lat: -7.7600, lon: 113.4300 },
  'lumajang': { lat: -8.1333, lon: 113.2247 },
  'bondowoso': { lat: -7.9139, lon: 113.8214 },
  'situbondo': { lat: -7.7064, lon: 114.0097 },
  'jember': { lat: -8.1844, lon: 113.6681 },
  'banyuwangi': { lat: -8.2192, lon: 114.3691 },
  'bangkalan': { lat: -7.0306, lon: 112.7469 },
  'sampang': { lat: -7.1894, lon: 113.2422 },
  'pamekasan': { lat: -7.1598, lon: 113.4831 },
  'sumenep': { lat: -7.0091, lon: 113.8617 },

  // ==========================================
  // 5. SUMATERA (ACEH S/D LAMPUNG)
  // ==========================================
  'banda aceh': { lat: 5.5483, lon: 95.3238 },
  'aceh': { lat: 5.5483, lon: 95.3238 },
  'sabang': { lat: 5.8942, lon: 95.3195 },
  'lhokseumawe': { lat: 5.1801, lon: 97.1507 },
  'langsa': { lat: 4.4714, lon: 97.9678 },
  'subulussalam': { lat: 2.6377, lon: 98.0051 },
  'meulaboh': { lat: 4.1436, lon: 96.1283 },
  'tapaktuan': { lat: 3.2575, lon: 97.1814 },
  'kutacane': { lat: 3.4939, lon: 97.8094 },
  'takengon': { lat: 4.6294, lon: 96.8453 },
  'bireuen': { lat: 5.2039, lon: 96.7025 },
  'sigli': { lat: 5.3853, lon: 95.9608 },
  'jantho': { lat: 5.2850, lon: 95.6200 },
  'blangpidie': { lat: 3.7500, lon: 96.8500 },
  'sinabang': { lat: 2.4833, lon: 96.3833 },
  'medan': { lat: 3.5952, lon: 98.6722 },
  'kota medan': { lat: 3.5952, lon: 98.6722 },
  'binjai': { lat: 3.6139, lon: 98.4925 },
  'tebing tinggi': { lat: 3.3283, lon: 99.1625 },
  'pematangsiantar': { lat: 2.9610, lon: 99.0682 },
  'siantar': { lat: 2.9610, lon: 99.0682 },
  'tanjungbalai': { lat: 2.9667, lon: 99.8000 },
  'tanjung balai': { lat: 2.9667, lon: 99.8000 },
  'sibolga': { lat: 1.7388, lon: 98.7892 },
  'padangsidimpuan': { lat: 1.3736, lon: 99.2683 },
  'gunungsitoli': { lat: 1.2901, lon: 97.6150 },
  'lubuk pakam': { lat: 3.5606, lon: 98.8744 },
  'deli serdang': { lat: 3.5606, lon: 98.8744 },
  'stabat': { lat: 3.7333, lon: 98.4500 },
  'langkat': { lat: 3.7333, lon: 98.4500 },
  'kabanjahe': { lat: 3.1783, lon: 98.4950 },
  'karo': { lat: 3.1783, lon: 98.4950 },
  'tarutung': { lat: 2.0256, lon: 98.9661 },
  'tapanuli utara': { lat: 2.0256, lon: 98.9661 },
  'balige': { lat: 2.3333, lon: 99.0667 },
  'toba': { lat: 2.3333, lon: 99.0667 },
  'kisaran': { lat: 2.9833, lon: 99.6167 },
  'asahan': { lat: 2.9833, lon: 99.6167 },
  'rantauprapat': { lat: 2.0975, lon: 99.8306 },
  'labuhanbatu': { lat: 2.0975, lon: 99.8306 },
  'padang': { lat: -0.9471, lon: 100.4172 },
  'kota padang': { lat: -0.9471, lon: 100.4172 },
  'bukittinggi': { lat: -0.3055, lon: 100.3691 },
  'payakumbuh': { lat: -0.2201, lon: 100.6308 },
  'pariaman': { lat: -0.6272, lon: 100.1204 },
  'solok': { lat: -0.8033, lon: 100.6583 },
  'sawahlunto': { lat: -0.6692, lon: 100.7761 },
  'padang panjang': { lat: -0.4644, lon: 100.4439 },
  'padangpanjang': { lat: -0.4644, lon: 100.4439 },
  'batusangkar': { lat: -0.4578, lon: 100.5925 },
  'tanah datar': { lat: -0.4578, lon: 100.5925 },
  'painan': { lat: -1.3500, lon: 100.5667 },
  'pesisir selatan': { lat: -1.3500, lon: 100.5667 },
  'lubuk basung': { lat: -0.3167, lon: 100.0667 },
  'agam': { lat: -0.3167, lon: 100.0667 },
  'pekanbaru': { lat: 0.5071, lon: 101.4478 },
  'kota pekanbaru': { lat: 0.5071, lon: 101.4478 },
  'dumai': { lat: 1.6683, lon: 101.4428 },
  'duri': { lat: 1.2589, lon: 101.2161 },
  'bengkalis': { lat: 1.4833, lon: 102.0833 },
  'tembilahan': { lat: -0.3167, lon: 103.1667 },
  'indragiri hilir': { lat: -0.3167, lon: 103.1667 },
  'rengat': { lat: -0.3667, lon: 102.5500 },
  'indragiri hulu': { lat: -0.3667, lon: 102.5500 },
  'bangkinang': { lat: 0.3333, lon: 101.0333 },
  'kampar': { lat: 0.3333, lon: 101.0333 },
  'pangkalan kerinci': { lat: 0.4000, lon: 101.8667 },
  'pelalawan': { lat: 0.4000, lon: 101.8667 },
  'siak': { lat: 0.7961, lon: 102.0489 },
  'siak sri indrapura': { lat: 0.7961, lon: 102.0489 },
  'pasir pengaraian': { lat: 0.8667, lon: 100.3000 },
  'rokan hulu': { lat: 0.8667, lon: 100.3000 },
  'bagansiapiapi': { lat: 2.1500, lon: 100.8167 },
  'rokan hilir': { lat: 2.1500, lon: 100.8167 },
  'batam': { lat: 1.1301, lon: 104.0528 },
  'kota batam': { lat: 1.1301, lon: 104.0528 },
  'tanjungpinang': { lat: 0.9153, lon: 104.4503 },
  'tanjung pinang': { lat: 0.9153, lon: 104.4503 },
  'tanjung balai karimun': { lat: 1.0000, lon: 103.4333 },
  'karimun': { lat: 1.0000, lon: 103.4333 },
  'ranai': { lat: 3.9333, lon: 108.3833 },
  'natuna': { lat: 3.9333, lon: 108.3833 },
  'tarempa': { lat: 3.2167, lon: 106.2167 },
  'anambas': { lat: 3.2167, lon: 106.2167 },
  'jambi': { lat: -1.6101, lon: 103.6131 },
  'kota jambi': { lat: -1.6101, lon: 103.6131 },
  'sungai penuh': { lat: -2.0622, lon: 101.4000 },
  'kerinci': { lat: -2.0622, lon: 101.4000 },
  'muara bungo': { lat: -1.4833, lon: 102.1167 },
  'bungo': { lat: -1.4833, lon: 102.1167 },
  'bangko': { lat: -2.0667, lon: 102.2667 },
  'merangin': { lat: -2.0667, lon: 102.2667 },
  'kuala tungkal': { lat: -0.8167, lon: 103.4667 },
  'sarolangun': { lat: -2.3000, lon: 102.6500 },
  'muara tebo': { lat: -1.4500, lon: 102.4000 },
  'palembang': { lat: -2.9761, lon: 104.7754 },
  'kota palembang': { lat: -2.9761, lon: 104.7754 },
  'prabumulih': { lat: -3.4283, lon: 104.2250 },
  'pagar alam': { lat: -4.0183, lon: 103.2661 },
  'pagaralam': { lat: -4.0183, lon: 103.2661 },
  'lubuklinggau': { lat: -3.2952, lon: 102.8610 },
  'baturaja': { lat: -4.1300, lon: 104.1667 },
  'oku': { lat: -4.1300, lon: 104.1667 },
  'lahat': { lat: -3.7833, lon: 103.5333 },
  'muara enim': { lat: -3.6500, lon: 103.7833 },
  'kayu agung': { lat: -3.3833, lon: 104.8333 },
  'oki': { lat: -3.3833, lon: 104.8333 },
  'sekayu': { lat: -2.8833, lon: 103.8500 },
  'musi banyuasin': { lat: -2.8833, lon: 103.8500 },
  'martapura': { lat: -4.3333, lon: 104.3500 },
  'bengkulu': { lat: -3.7928, lon: 102.2608 },
  'kota bengkulu': { lat: -3.7928, lon: 102.2608 },
  'curup': { lat: -3.4667, lon: 102.5333 },
  'rejang lebong': { lat: -3.4667, lon: 102.5333 },
  'manna': { lat: -4.4667, lon: 102.9000 },
  'bengkulu selatan': { lat: -4.4667, lon: 102.9000 },
  'arga makmur': { lat: -3.4333, lon: 102.1833 },
  'mukomuko': { lat: -2.5833, lon: 101.1167 },
  'bandar lampung': { lat: -5.3971, lon: 105.2668 },
  'lampung': { lat: -5.3971, lon: 105.2668 },
  'metro': { lat: -5.1139, lon: 105.3061 },
  'kotabumi': { lat: -4.8333, lon: 104.8833 },
  'lampung utara': { lat: -4.8333, lon: 104.8833 },
  'kalianda': { lat: -5.7333, lon: 105.5833 },
  'lampung selatan': { lat: -5.7333, lon: 105.5833 },
  'gunung sugih': { lat: -4.9667, lon: 105.2167 },
  'lampung tengah': { lat: -4.9667, lon: 105.2167 },
  'pringsewu': { lat: -5.3600, lon: 104.9750 },
  'liwa': { lat: -5.0333, lon: 104.0833 },
  'pangkalpinang': { lat: -2.1283, lon: 106.1161 },
  'pangkal pinang': { lat: -2.1283, lon: 106.1161 },
  'sungailiat': { lat: -1.8667, lon: 106.1167 },
  'bangka': { lat: -1.8667, lon: 106.1167 },
  'tanjung pandan': { lat: -2.7350, lon: 107.6367 },
  'belitung': { lat: -2.7350, lon: 107.6367 },

  // ==========================================
  // 6. BALI & NUSA TENGGARA
  // ==========================================
  'denpasar': { lat: -8.6705, lon: 115.2126 },
  'bali': { lat: -8.6705, lon: 115.2126 },
  'kota denpasar': { lat: -8.6705, lon: 115.2126 },
  'singaraja': { lat: -8.1122, lon: 115.0883 },
  'buleleng': { lat: -8.1122, lon: 115.0883 },
  'tabanan': { lat: -8.5411, lon: 115.1250 },
  'gianyar': { lat: -8.5442, lon: 115.3289 },
  'ubud': { lat: -8.5069, lon: 115.2625 },
  'klungkung': { lat: -8.5356, lon: 115.4039 },
  'semarapura': { lat: -8.5356, lon: 115.4039 },
  'bangli': { lat: -8.4542, lon: 115.3550 },
  'karangasem': { lat: -8.4489, lon: 115.6128 },
  'amlapura': { lat: -8.4489, lon: 115.6128 },
  'negara': { lat: -8.3589, lon: 114.6186 },
  'jembrana': { lat: -8.3589, lon: 114.6186 },
  'badung': { lat: -8.5833, lon: 115.1833 },
  'mangupura': { lat: -8.5833, lon: 115.1833 },
  'kuta': { lat: -8.7233, lon: 115.1725 },
  'mataram': { lat: -8.5822, lon: 116.1167 },
  'kota mataram': { lat: -8.5822, lon: 116.1167 },
  'lombok': { lat: -8.5822, lon: 116.1167 },
  'praya': { lat: -8.7000, lon: 116.2833 },
  'lombok tengah': { lat: -8.7000, lon: 116.2833 },
  'selong': { lat: -8.6500, lon: 116.5333 },
  'lombok timur': { lat: -8.6500, lon: 116.5333 },
  'gerung': { lat: -8.6833, lon: 116.1167 },
  'lombok barat': { lat: -8.6833, lon: 116.1167 },
  'lombok utara': { lat: -8.3500, lon: 116.1500 },
  'sumbawa besar': { lat: -8.4975, lon: 117.4244 },
  'sumbawa': { lat: -8.4975, lon: 117.4244 },
  'taliwang': { lat: -8.7461, lon: 116.8500 },
  'sumbawa barat': { lat: -8.7461, lon: 116.8500 },
  'dompu': { lat: -8.5333, lon: 118.4667 },
  'bima': { lat: -8.4552, lon: 118.7247 },
  'kota bima': { lat: -8.4552, lon: 118.7247 },
  'raba': { lat: -8.4552, lon: 118.7500 },
  'kupang': { lat: -10.1772, lon: 123.6077 },
  'kota kupang': { lat: -10.1772, lon: 123.6077 },
  'soe': { lat: -9.8608, lon: 124.2833 },
  'timor tengah selatan': { lat: -9.8608, lon: 124.2833 },
  'kefamenanu': { lat: -9.4447, lon: 124.4789 },
  'timor tengah utara': { lat: -9.4447, lon: 124.4789 },
  'atambua': { lat: -9.1086, lon: 124.8911 },
  'belu': { lat: -9.1086, lon: 124.8911 },
  'kalabahi': { lat: -8.2194, lon: 124.5186 },
  'alor': { lat: -8.2194, lon: 124.5186 },
  'larantuka': { lat: -8.3433, lon: 122.9833 },
  'flores timur': { lat: -8.3433, lon: 122.9833 },
  'lewoleba': { lat: -8.3750, lon: 123.4917 },
  'lembata': { lat: -8.3750, lon: 123.4917 },
  'maumere': { lat: -8.6231, lon: 122.2131 },
  'sikka': { lat: -8.6231, lon: 122.2131 },
  'ende': { lat: -8.8433, lon: 121.6622 },
  'bajawa': { lat: -8.7906, lon: 120.9639 },
  'ngada': { lat: -8.7906, lon: 120.9639 },
  'mbay': { lat: -8.5667, lon: 121.2833 },
  'nagekeo': { lat: -8.5667, lon: 121.2833 },
  'ruteng': { lat: -8.6139, lon: 120.4639 },
  'manggarai': { lat: -8.6139, lon: 120.4639 },
  'borong': { lat: -8.8167, lon: 120.6167 },
  'manggarai timur': { lat: -8.8167, lon: 120.6167 },
  'labuan bajo': { lat: -8.4964, lon: 119.8878 },
  'manggarai barat': { lat: -8.4964, lon: 119.8878 },
  'waingapu': { lat: -9.6547, lon: 120.2642 },
  'sumba timur': { lat: -9.6547, lon: 120.2642 },
  'waikabubak': { lat: -9.6333, lon: 119.3000 },
  'sumba barat': { lat: -9.6333, lon: 119.3000 },
  'tambolaka': { lat: -9.4167, lon: 119.2333 },
  'sumba barat daya': { lat: -9.4167, lon: 119.2333 },
  'baa': { lat: -10.7333, lon: 123.0500 },
  'rote ndao': { lat: -10.7333, lon: 123.0500 },

  // ==========================================
  // 7. KALIMANTAN (BARAT S/D UTARA)
  // ==========================================
  'pontianak': { lat: -0.0263, lon: 109.3425 },
  'kota pontianak': { lat: -0.0263, lon: 109.3425 },
  'singkawang': { lat: 0.9080, lon: 108.9856 },
  'sambas': { lat: 1.3619, lon: 109.3039 },
  'bengkayang': { lat: 0.8239, lon: 109.4794 },
  'ngabang': { lat: 0.3833, lon: 109.9500 },
  'landak': { lat: 0.3833, lon: 109.9500 },
  'sanggau': { lat: 0.1239, lon: 110.5911 },
  'sekadau': { lat: 0.0333, lon: 110.9500 },
  'sintang': { lat: 0.0764, lon: 111.4994 },
  'putussibau': { lat: 0.8583, lon: 112.9333 },
  'kapuas hulu': { lat: 0.8583, lon: 112.9333 },
  'ketapang': { lat: -1.8504, lon: 109.9725 },
  'sukadana': { lat: -1.2500, lon: 109.9667 },
  'kayong utara': { lat: -1.2500, lon: 109.9667 },
  'mempawah': { lat: 0.2500, lon: 109.1833 },
  'sungai raya': { lat: -0.1167, lon: 109.3833 },
  'kubu raya': { lat: -0.1167, lon: 109.3833 },
  'palangka raya': { lat: -2.2078, lon: 113.9167 },
  'palangkaraya': { lat: -2.2078, lon: 113.9167 },
  'kota palangka raya': { lat: -2.2078, lon: 113.9167 },
  'pangkalan bun': { lat: -2.6833, lon: 111.6167 },
  'pangkalanbun': { lat: -2.6833, lon: 111.6167 },
  'kotawaringin barat': { lat: -2.6833, lon: 111.6167 },
  'sampit': { lat: -2.5350, lon: 112.9554 },
  'kotawaringin timur': { lat: -2.5350, lon: 112.9554 },
  'kuala kapuas': { lat: -3.0092, lon: 114.3878 },
  'kapuas': { lat: -3.0092, lon: 114.3878 },
  'buntok': { lat: -1.7167, lon: 114.8333 },
  'barito selatan': { lat: -1.7167, lon: 114.8333 },
  'muara teweh': { lat: -0.9500, lon: 114.9000 },
  'barito utara': { lat: -0.9500, lon: 114.9000 },
  'kasongan': { lat: -2.0000, lon: 113.4000 },
  'katingan': { lat: -2.0000, lon: 113.4000 },
  'kuala pembuang': { lat: -3.3000, lon: 112.5500 },
  'seruyan': { lat: -3.3000, lon: 112.5500 },
  'sukamara': { lat: -2.6333, lon: 111.2333 },
  'nanga bulik': { lat: -2.1833, lon: 111.4667 },
  'lamandau': { lat: -2.1833, lon: 111.4667 },
  'pulang pisau': { lat: -2.7500, lon: 114.2500 },
  'puruk cahu': { lat: -0.6167, lon: 114.5833 },
  'murung raya': { lat: -0.6167, lon: 114.5833 },
  'tamiang layang': { lat: -2.0833, lon: 115.1667 },
  'barito timur': { lat: -2.0833, lon: 115.1667 },
  'banjarmasin': { lat: -3.3166, lon: 114.5901 },
  'kota banjarmasin': { lat: -3.3166, lon: 114.5901 },
  'banjarbaru': { lat: -3.4406, lon: 114.8303 },
  'kota banjarbaru': { lat: -3.4406, lon: 114.8303 },
  'martapura kalsel': { lat: -3.4167, lon: 114.8500 },
  'kabupaten banjar': { lat: -3.4167, lon: 114.8500 },
  'banjar kalsel': { lat: -3.4167, lon: 114.8500 },
  'pelaihari': { lat: -3.8000, lon: 114.7667 },
  'tanah laut': { lat: -3.8000, lon: 114.7667 },
  'batulicin': { lat: -3.4500, lon: 116.0000 },
  'tanah bumbu': { lat: -3.4500, lon: 116.0000 },
  'kotabaru': { lat: -3.2333, lon: 116.2333 },
  'marabahan': { lat: -2.9833, lon: 114.7667 },
  'barito kuala': { lat: -2.9833, lon: 114.7667 },
  'rantau': { lat: -2.9333, lon: 115.1500 },
  'tapin': { lat: -2.9333, lon: 115.1500 },
  'kandangan': { lat: -2.7833, lon: 115.2667 },
  'hulu sungai selatan': { lat: -2.7833, lon: 115.2667 },
  'barabai': { lat: -2.5833, lon: 115.3833 },
  'hulu sungai tengah': { lat: -2.5833, lon: 115.3833 },
  'amuntai': { lat: -2.4167, lon: 115.2500 },
  'hulu sungai utara': { lat: -2.4167, lon: 115.2500 },
  'paringin': { lat: -2.3333, lon: 115.4667 },
  'balangan': { lat: -2.3333, lon: 115.4667 },
  'tanjung': { lat: -2.1833, lon: 115.3833 },
  'tabalong': { lat: -2.1833, lon: 115.3833 },
  'samarinda': { lat: -0.5021, lon: 117.1536 },
  'kota samarinda': { lat: -0.5021, lon: 117.1536 },
  'balikpapan': { lat: -1.2654, lon: 116.8312 },
  'kota balikpapan': { lat: -1.2654, lon: 116.8312 },
  'bontang': { lat: 0.1333, lon: 117.5000 },
  'kota bontang': { lat: 0.1333, lon: 117.5000 },
  'tenggarong': { lat: -0.4167, lon: 116.9833 },
  'kutai kartanegara': { lat: -0.4167, lon: 116.9833 },
  'kukar': { lat: -0.4167, lon: 116.9833 },
  'sendawar': { lat: -0.2333, lon: 115.7167 },
  'kutai barat': { lat: -0.2333, lon: 115.7167 },
  'sangatta': { lat: 0.4833, lon: 117.5500 },
  'kutai timur': { lat: 0.4833, lon: 117.5500 },
  'tanjung redeb': { lat: 2.1500, lon: 117.5000 },
  'berau': { lat: 2.1500, lon: 117.5000 },
  'penajam': { lat: -1.2833, lon: 116.7333 },
  'penajam paser utara': { lat: -1.2833, lon: 116.7333 },
  'ppu': { lat: -1.2833, lon: 116.7333 },
  'tanah grogot': { lat: -1.9000, lon: 116.2000 },
  'paser': { lat: -1.9000, lon: 116.2000 },
  'nusantara': { lat: -0.9739, lon: 116.7089 },
  'ikn': { lat: -0.9739, lon: 116.7089 },
  'tanjung selor': { lat: 2.8333, lon: 117.3667 },
  'bulungan': { lat: 2.8333, lon: 117.3667 },
  'tarakan': { lat: 3.3267, lon: 117.5891 },
  'kota tarakan': { lat: 3.3267, lon: 117.5891 },
  'malinau': { lat: 3.5833, lon: 116.6333 },
  'nunukan': { lat: 4.1333, lon: 117.6500 },
  'tideng pale': { lat: 3.5333, lon: 117.1833 },
  'tana tidung': { lat: 3.5333, lon: 117.1833 },

  // ==========================================
  // 8. SULAWESI (SELURUH 6 PROVINSI)
  // ==========================================
  'makassar': { lat: -5.1477, lon: 119.4327 },
  'kota makassar': { lat: -5.1477, lon: 119.4327 },
  'ujung pandang': { lat: -5.1477, lon: 119.4327 },
  'sungguminasa': { lat: -5.2000, lon: 119.4500 },
  'gowa': { lat: -5.2000, lon: 119.4500 },
  'takalar': { lat: -5.4167, lon: 119.4500 },
  'jeneponto': { lat: -5.6667, lon: 119.7333 },
  'bantaeng': { lat: -5.5500, lon: 119.9500 },
  'bulukumba': { lat: -5.5500, lon: 120.1833 },
  'benteng': { lat: -6.1167, lon: 120.4500 },
  'selayar': { lat: -6.1167, lon: 120.4500 },
  'sinjai': { lat: -5.1333, lon: 120.2500 },
  'maros': { lat: -5.0000, lon: 119.5667 },
  'pangkep': { lat: -4.8167, lon: 119.5500 },
  'pangkajene': { lat: -4.8167, lon: 119.5500 },
  'barru': { lat: -4.4167, lon: 119.6167 },
  'parepare': { lat: -4.0131, lon: 119.6310 },
  'kota parepare': { lat: -4.0131, lon: 119.6310 },
  'watampone': { lat: -4.5386, lon: 120.3283 },
  'bone': { lat: -4.5386, lon: 120.3283 },
  'watansoppeng': { lat: -4.3500, lon: 119.8833 },
  'soppeng': { lat: -4.3500, lon: 119.8833 },
  'sengkang': { lat: -4.1333, lon: 120.0333 },
  'wajo': { lat: -4.1333, lon: 120.0333 },
  'sidrap': { lat: -3.9333, lon: 119.8000 },
  'sidenreng rappang': { lat: -3.9333, lon: 119.8000 },
  'pinrang': { lat: -3.7833, lon: 119.6500 },
  'enrekang': { lat: -3.5500, lon: 119.7667 },
  'palopo': { lat: -2.9928, lon: 120.1947 },
  'kota palopo': { lat: -2.9928, lon: 120.1947 },
  'belopa': { lat: -3.3500, lon: 120.3667 },
  'luwu': { lat: -3.3500, lon: 120.3667 },
  'masamba': { lat: -2.5500, lon: 120.3167 },
  'luwu utara': { lat: -2.5500, lon: 120.3167 },
  'malili': { lat: -2.5833, lon: 121.1000 },
  'luwu timur': { lat: -2.5833, lon: 121.1000 },
  'makale': { lat: -3.1000, lon: 119.8500 },
  'tana toraja': { lat: -3.1000, lon: 119.8500 },
  'toraja': { lat: -3.1000, lon: 119.8500 },
  'rantepao': { lat: -2.9667, lon: 119.9000 },
  'toraja utara': { lat: -2.9667, lon: 119.9000 },
  'manado': { lat: 1.4748, lon: 124.8420 },
  'kota manado': { lat: 1.4748, lon: 124.8420 },
  'bitung': { lat: 1.4447, lon: 125.1878 },
  'kota bitung': { lat: 1.4447, lon: 125.1878 },
  'tomohon': { lat: 1.3283, lon: 124.8394 },
  'kota tomohon': { lat: 1.3283, lon: 124.8394 },
  'kotamobagu': { lat: 0.7306, lon: 124.3167 },
  'kota kotamobagu': { lat: 0.7306, lon: 124.3167 },
  'tondano': { lat: 1.3047, lon: 124.9122 },
  'minahasa': { lat: 1.3047, lon: 124.9122 },
  'amurang': { lat: 1.1833, lon: 124.5667 },
  'minahasa selatan': { lat: 1.1833, lon: 124.5667 },
  'airmadidi': { lat: 1.4239, lon: 124.9817 },
  'minahasa utara': { lat: 1.4239, lon: 124.9817 },
  'ratahan': { lat: 1.0500, lon: 124.7833 },
  'minahasa tenggara': { lat: 1.0500, lon: 124.7833 },
  'tahuna': { lat: 3.6167, lon: 125.4833 },
  'sangihe': { lat: 3.6167, lon: 125.4833 },
  'melonguane': { lat: 4.0000, lon: 126.6833 },
  'talaud': { lat: 4.0000, lon: 126.6833 },
  'palu': { lat: -0.8917, lon: 119.8707 },
  'kota palu': { lat: -0.8917, lon: 119.8707 },
  'donggala': { lat: -0.6833, lon: 119.7500 },
  'sigi': { lat: -1.0333, lon: 119.9333 },
  'parigi': { lat: -0.8000, lon: 120.1833 },
  'poso': { lat: -1.3975, lon: 120.7525 },
  'ampana': { lat: -0.8667, lon: 121.5833 },
  'tojo una-una': { lat: -0.8667, lon: 121.5833 },
  'tolitoli': { lat: 1.0333, lon: 120.8167 },
  'buol': { lat: 1.1667, lon: 121.4333 },
  'luwuk': { lat: -0.9500, lon: 122.7833 },
  'banggai': { lat: -0.9500, lon: 122.7833 },
  'bungku': { lat: -2.5333, lon: 121.9667 },
  'morowali': { lat: -2.5333, lon: 121.9667 },
  'kolonodale': { lat: -1.9833, lon: 121.3333 },
  'morowali utara': { lat: -1.9833, lon: 121.3333 },
  'kendari': { lat: -3.9722, lon: 122.5149 },
  'kota kendari': { lat: -3.9722, lon: 122.5149 },
  'baubau': { lat: -5.4667, lon: 122.6000 },
  'bau-bau': { lat: -5.4667, lon: 122.6000 },
  'kota baubau': { lat: -5.4667, lon: 122.6000 },
  'kolaka': { lat: -4.0500, lon: 121.6000 },
  'lasusua': { lat: -3.2000, lon: 120.8833 },
  'kolaka utara': { lat: -3.2000, lon: 120.8833 },
  'unaaha': { lat: -3.8667, lon: 122.0500 },
  'konawe': { lat: -3.8667, lon: 122.0500 },
  'andoolo': { lat: -4.3333, lon: 122.2500 },
  'konawe selatan': { lat: -4.3333, lon: 122.2500 },
  'wanggudu': { lat: -3.4500, lon: 122.1833 },
  'raha': { lat: -4.8333, lon: 122.7167 },
  'muna': { lat: -4.8333, lon: 122.7167 },
  'pasarwajo': { lat: -5.4833, lon: 122.8500 },
  'buton': { lat: -5.4833, lon: 122.8500 },
  'wakatobi': { lat: -5.3333, lon: 123.5833 },
  'wangi-wangi': { lat: -5.3333, lon: 123.5833 },
  'gorontalo': { lat: 0.5435, lon: 123.0568 },
  'kota gorontalo': { lat: 0.5435, lon: 123.0568 },
  'limboto': { lat: 0.6278, lon: 122.9806 },
  'suwawa': { lat: 0.5500, lon: 123.1500 },
  'bone bolango': { lat: 0.5500, lon: 123.1500 },
  'kwandang': { lat: 0.8333, lon: 122.9167 },
  'gorontalo utara': { lat: 0.8333, lon: 122.9167 },
  'tilamuta': { lat: 0.5333, lon: 122.3333 },
  'boalemo': { lat: 0.5333, lon: 122.3333 },
  'marisa': { lat: 0.4500, lon: 121.9333 },
  'pohuwato': { lat: 0.4500, lon: 121.9333 },
  'mamuju': { lat: -2.6739, lon: 118.8897 },
  'tobadak': { lat: -2.1500, lon: 119.3500 },
  'mamuju tengah': { lat: -2.1500, lon: 119.3500 },
  'pasangkayu': { lat: -1.1833, lon: 119.3833 },
  'mamuju utara': { lat: -1.1833, lon: 119.3833 },
  'polewali': { lat: -3.4333, lon: 119.3333 },
  'polewali mandar': { lat: -3.4333, lon: 119.3333 },
  'polman': { lat: -3.4333, lon: 119.3333 },
  'majene': { lat: -3.5397, lon: 118.9728 },
  'mamasa': { lat: -2.9333, lon: 119.3833 },

  // ==========================================
  // 9. MALUKU & MALUKU UTARA
  // ==========================================
  'ambon': { lat: -3.6547, lon: 128.1906 },
  'kota ambon': { lat: -3.6547, lon: 128.1906 },
  'tual': { lat: -5.6333, lon: 132.7500 },
  'kota tual': { lat: -5.6333, lon: 132.7500 },
  'masohi': { lat: -3.3000, lon: 128.9500 },
  'maluku tengah': { lat: -3.3000, lon: 128.9500 },
  'langgur': { lat: -5.6667, lon: 132.7333 },
  'maluku tenggara': { lat: -5.6667, lon: 132.7333 },
  'saumlaki': { lat: -7.9833, lon: 131.3000 },
  'tanimbar': { lat: -7.9833, lon: 131.3000 },
  'kepulauan tanimbar': { lat: -7.9833, lon: 131.3000 },
  'namlea': { lat: -3.2500, lon: 127.1000 },
  'buru': { lat: -3.2500, lon: 127.1000 },
  'namrole': { lat: -3.8500, lon: 126.7500 },
  'buru selatan': { lat: -3.8500, lon: 126.7500 },
  'dobo': { lat: -5.7667, lon: 134.2167 },
  'kepulauan aru': { lat: -5.7667, lon: 134.2167 },
  'piru': { lat: -3.0667, lon: 128.1833 },
  'seram bagian barat': { lat: -3.0667, lon: 128.1833 },
  'bula': { lat: -3.1167, lon: 130.5000 },
  'seram bagian timur': { lat: -3.1167, lon: 130.5000 },
  'tiakur': { lat: -8.1500, lon: 127.9167 },
  'maluku barat daya': { lat: -8.1500, lon: 127.9167 },
  'ternate': { lat: 0.7893, lon: 127.3756 },
  'kota ternate': { lat: 0.7893, lon: 127.3756 },
  'tidore': { lat: 0.6833, lon: 127.4000 },
  'tidore kepulauan': { lat: 0.6833, lon: 127.4000 },
  'jailolo': { lat: 1.0667, lon: 127.4667 },
  'halmahera barat': { lat: 1.0667, lon: 127.4667 },
  'weda': { lat: 0.3333, lon: 127.8833 },
  'halmahera tengah': { lat: 0.3333, lon: 127.8833 },
  'maba': { lat: 0.7000, lon: 128.3000 },
  'halmahera timur': { lat: 0.7000, lon: 128.3000 },
  'labuha': { lat: -0.6333, lon: 127.4833 },
  'halmahera selatan': { lat: -0.6333, lon: 127.4833 },
  'tobelo': { lat: 1.7333, lon: 128.0000 },
  'halmahera utara': { lat: 1.7333, lon: 128.0000 },
  'sanana': { lat: -2.0500, lon: 125.9833 },
  'sula': { lat: -2.0500, lon: 125.9833 },
  'daruba': { lat: 2.0500, lon: 128.2833 },
  'morotai': { lat: 2.0500, lon: 128.2833 },
  'pulau morotai': { lat: 2.0500, lon: 128.2833 },
  'bobong': { lat: -1.9167, lon: 124.3667 },
  'taliabu': { lat: -1.9167, lon: 124.3667 },

  // ==========================================
  // 10. TANAH PAPUA (PAPUA, PAPUA BARAT, PAPUA SELATAN, TENGAH, PEGUNUNGAN, BARAT DAYA)
  // ==========================================
  'jayapura': { lat: -2.5337, lon: 140.7181 },
  'kota jayapura': { lat: -2.5337, lon: 140.7181 },
  'sentani': { lat: -2.5667, lon: 140.5167 },
  'kabupaten jayapura': { lat: -2.5667, lon: 140.5167 },
  'sarmi': { lat: -1.8667, lon: 138.7500 },
  'keerom': { lat: -3.2833, lon: 140.7500 },
  'waris': { lat: -3.2833, lon: 140.7500 },
  'mamberamo raya': { lat: -2.2500, lon: 138.0000 },
  'biak': { lat: -1.1833, lon: 136.0833 },
  'biak numfor': { lat: -1.1833, lon: 136.0833 },
  'supiori': { lat: -0.7333, lon: 135.5833 },
  'serui': { lat: -1.8833, lon: 136.2333 },
  'kepulauan yapen': { lat: -1.8833, lon: 136.2333 },
  'waropen': { lat: -2.7167, lon: 136.8333 },
  'manokwari': { lat: -0.8615, lon: 134.0620 },
  'kabupaten manokwari': { lat: -0.8615, lon: 134.0620 },
  'ransiki': { lat: -1.5000, lon: 134.1833 },
  'manokwari selatan': { lat: -1.5000, lon: 134.1833 },
  'anggi': { lat: -1.3833, lon: 133.9167 },
  'pegunungan arfak': { lat: -1.3833, lon: 133.9167 },
  'bintuni': { lat: -2.1333, lon: 133.5167 },
  'teluk bintuni': { lat: -2.1333, lon: 133.5167 },
  'rasiei': { lat: -2.7167, lon: 134.5000 },
  'teluk wondama': { lat: -2.7167, lon: 134.5000 },
  'kaimana': { lat: -3.6667, lon: 133.7667 },
  'fakfak': { lat: -2.9333, lon: 132.3000 },
  'fak-fak': { lat: -2.9333, lon: 132.3000 },
  'sorong': { lat: -0.8765, lon: 131.2558 },
  'kota sorong': { lat: -0.8765, lon: 131.2558 },
  'aimas': { lat: -0.9500, lon: 131.3333 },
  'kabupaten sorong': { lat: -0.9500, lon: 131.3333 },
  'teminabuan': { lat: -1.4500, lon: 132.0167 },
  'sorong selatan': { lat: -1.4500, lon: 132.0167 },
  'waisai': { lat: -0.4333, lon: 130.8167 },
  'raja ampat': { lat: -0.4333, lon: 130.8167 },
  'kumurkek': { lat: -1.2833, lon: 132.4833 },
  'maybrat': { lat: -1.2833, lon: 132.4833 },
  'merauke': { lat: -8.4991, lon: 140.4018 },
  'tanah merah': { lat: -6.1000, lon: 140.3000 },
  'boven digoel': { lat: -6.1000, lon: 140.3000 },
  'kepi': { lat: -6.5333, lon: 139.3333 },
  'mappi': { lat: -6.5333, lon: 139.3333 },
  'agats': { lat: -5.5333, lon: 138.1333 },
  'asmat': { lat: -5.5333, lon: 138.1333 },
  'nabire': { lat: -3.3667, lon: 135.5000 },
  'enarotali': { lat: -3.9167, lon: 136.3667 },
  'paniai': { lat: -3.9167, lon: 136.3667 },
  'timika': { lat: -4.5467, lon: 136.8833 },
  'mimika': { lat: -4.5467, lon: 136.8833 },
  'wamena': { lat: -4.0833, lon: 138.9500 },
  'jayawijaya': { lat: -4.0833, lon: 138.9500 },
  'oksibil': { lat: -4.9000, lon: 140.6333 },
  'pegunungan bintang': { lat: -4.9000, lon: 140.6333 },
  'dekai': { lat: -4.8500, lon: 139.4833 },
  'yahukimo': { lat: -4.8500, lon: 139.4833 },
  'karubaga': { lat: -3.7000, lon: 138.7000 },
  'tolikara': { lat: -3.7000, lon: 138.7000 },
};

// Safe land fallback (Jakarta inland center)
export const DEFAULT_FALLBACK_COORDINATE: GeoCoordinate = {
  lat: -6.2088,
  lon: 106.8456
};

// Intelligent helper to resolve city/KC name to verified geographic coordinates
export function findCityCoordinates(rawName: string): GeoCoordinate {
  if (!rawName) return DEFAULT_FALLBACK_COORDINATE;
  
  const rawLower = rawName.toLowerCase().trim();

  // 1. Direct match in dictionary
  if (INDONESIAN_CITIES_COORDINATES[rawLower]) {
    return INDONESIAN_CITIES_COORDINATES[rawLower];
  }

  // 2. Clean common Indonesian branch/office prefixes and suffixes
  let clean = rawLower
    .replace(/^(kc[u|p]?|kantor\s+cabang|kcp|kcu|cabang|kota\s+adm\.|kota\s+administrasi|kota|kabupaten|kab\.|wilayah|daerah|kanwil|divre|kedeputian\s+wilayah)\s+/i, '')
    .replace(/\s+(branch|cabang|kcp|kcu|\d+)$/gi, '')
    .trim();

  if (clean && INDONESIAN_CITIES_COORDINATES[clean]) {
    return INDONESIAN_CITIES_COORDINATES[clean];
  }

  // Handle stripped directional suffixes if base city matches (e.g., "Bandung Timur" -> "Bandung", unless specifically listed)
  const baseCity = clean.replace(/\s+(selatan|utara|timur|barat|pusat)$/gi, '').trim();
  if (baseCity && INDONESIAN_CITIES_COORDINATES[baseCity]) {
    return INDONESIAN_CITIES_COORDINATES[baseCity];
  }

  // 3. Substring matching in dictionary keys
  const dictKeys = Object.keys(INDONESIAN_CITIES_COORDINATES);
  for (const key of dictKeys) {
    if (key.length >= 4) {
      if (clean === key || (clean.length >= 4 && clean.includes(key))) {
        return INDONESIAN_CITIES_COORDINATES[key];
      }
      if (rawLower.includes(key)) {
        return INDONESIAN_CITIES_COORDINATES[key];
      }
    }
  }

  // Reverse search: check if key is in cleaned string
  for (const key of dictKeys) {
    if (key.length >= 4 && clean.startsWith(key)) {
      return INDONESIAN_CITIES_COORDINATES[key];
    }
  }

  return DEFAULT_FALLBACK_COORDINATE;
}

// Categorize Indonesian City into proper island region
export function getIslandForCity(cityName: string, lat: number, lon: number): string {
  if (!cityName) return 'Lainnya';
  const name = cityName.toLowerCase();

  if (/aceh|sabang|lhokseumawe|langsa|meulaboh|medan|binjai|tebing|siantar|pematangsiantar|tanjungbalai|sibolga|padangsidimpuan|gunungsitoli|deli|karo|asahan|labuhanbatu|padang|bukittinggi|payakumbuh|pariaman|solok|sawahlunto|pekanbaru|dumai|duri|bengkalis|tembilahan|rengat|siak|kampar|pelalawan|batam|tanjungpinang|karimun|natuna|anambas|jambi|sungai penuh|bungo|merangin|sarolangun|palembang|prabumulih|pagar alam|lubuklinggau|baturaja|lahat|muara enim|sekayu|bengkulu|curup|manna|mukomuko|lampung|bandar lampung|metro|kotabumi|kalianda|pringsewu|pangkal|bangka|belitung/i.test(name)) {
    return 'Sumatera';
  }

  if (/jakarta|seribu|bogor|depok|tangerang|tangsel|bsd|bekasi|cikarang|serang|cilegon|pandeglang|lebak|rangkasbitung|sukabumi|cianjur|karawang|purwakarta|subang|bandung|cimahi|sumedang|garut|tasikmalaya|ciamis|banjar|pangandaran|cirebon|kuningan|majalengka|indramayu|semarang|salatiga|kendal|demak|kudus|jepara|pati|rembang|blora|grobogan|purwodadi|pekalongan|batang|pemalang|tegal|brebes|solo|surakarta|boyolali|klaten|sukoharjo|wonogiri|karanganyar|sragen|magelang|temanggung|wonosobo|purworejo|kebumen|purwokerto|banyumas|cilacap|purbalingga|banjarnegara|yogyakarta|jogja|sleman|bantul|kulon progo|wates|gunungkidul|wonosari|surabaya|sidoarjo|gresik|mojokerto|jombang|bojonegoro|tuban|lamongan|madiun|magetan|ngawi|ponorogo|pacitan|kediri|nganjuk|blitar|tulungagung|trenggalek|malang|batu|pasuruan|probolinggo|lumajang|bondowoso|situbondo|jember|banyuwangi|bangkalan|sampang|pamekasan|sumenep/i.test(name)) {
    return 'Jawa';
  }

  if (/pontianak|singkawang|sambas|bengkayang|landak|sanggau|sekadau|sintang|kapuas hulu|putussibau|ketapang|sukadana|mempawah|kubu raya|palangka|palangkaraya|pangkalan bun|sampit|kapuas|buntok|muara teweh|katingan|seruyan|sukamara|lamandau|pulang pisau|murung raya|barito|banjarmasin|banjarbaru|martapura|pelaihari|batulicin|kotabaru|marabahan|tapin|kandangan|barabai|amuntai|balangan|tabalong|samarinda|balikpapan|bontang|tenggarong|kukar|kutai|sendawar|sangatta|berau|penajam|ppu|paser|nusantara|ikn|tanjung selor|bulungan|tarakan|malinau|nunukan|tana tidung|kalimantan|kalsel|kalteng|kaltim|kalbar|kaltara/i.test(name)) {
    return 'Kalimantan';
  }

  if (/makassar|gowa|takalar|jeneponto|bantaeng|bulukumba|selayar|sinjai|maros|pangkep|barru|parepare|bone|watampone|soppeng|wajo|sengkang|sidrap|pinrang|enrekang|palopo|luwu|masamba|malili|toraja|manado|bitung|tomohon|kotamobagu|minahasa|sangihe|talaud|palu|donggala|sigi|parigi|poso|ampana|tolitoli|buol|luwuk|banggai|morowali|kendari|baubau|bau-bau|kolaka|konawe|muna|buton|wakatobi|gorontalo|limboto|bone bolango|kwandang|boalemo|pohuwato|mamuju|tobadak|pasangkayu|polman|polewali|majene|mamasa|sulawesi|sulsel|sulut|sulteng|sultra|sulbar/i.test(name)) {
    return 'Sulawesi';
  }

  if (/denpasar|singaraja|buleleng|tabanan|gianyar|ubud|klungkung|semarapura|bangli|karangasem|amlapura|negara|jembrana|badung|mangupura|kuta|mataram|lombok|praya|selong|gerung|sumbawa|taliwang|dompu|bima|raba|kupang|soe|kefamenanu|atambua|belu|kalabahi|alor|larantuka|lewoleba|lembata|maumere|sikka|ende|bajawa|ngada|mbay|nagekeo|ruteng|manggarai|borong|labuan bajo|waingapu|sumba|waikabubak|tambolaka|baa|rote|bali|ntb|ntt|flores|timor/i.test(name)) {
    return 'Bali & Nusa Tenggara';
  }

  if (/ambon|tual|masohi|langgur|saumlaki|tanimbar|namlea|buru|namrole|dobo|aru|piru|bula|tiakur|ternate|tidore|jailolo|weda|maba|labuha|tobelo|sanana|sula|daruba|morotai|bobong|taliabu|jayapura|sentani|sarmi|keerom|biak|supiori|serui|yapen|waropen|manokwari|ransiki|anggi|arfak|bintuni|rasiei|wondama|kaimana|fakfak|fak-fak|sorong|aimas|teminabuan|waisai|raja ampat|kumurkek|maybrat|merauke|tanah merah|boven digoel|kepi|mappi|agats|asmat|nabire|paniai|enarotali|timika|mimika|wamena|jayawijaya|oksibil|dekai|yahukimo|tolikara|karubaga|maluku|papua/i.test(name)) {
    return 'Maluku & Papua';
  }

  // Geographic Bounding Box Fallback
  if (lon >= 95 && lon <= 106.2 && lat >= -6 && lat <= 6) return 'Sumatera';
  if (lon >= 105.5 && lon <= 115.5 && lat >= -9 && lat <= -5.5) return 'Jawa';
  if (lon >= 108.5 && lon <= 119.5 && lat >= -4.5 && lat <= 4.5) return 'Kalimantan';
  if (lon >= 118.5 && lon <= 125.5 && lat >= -6 && lat <= 2.5) return 'Sulawesi';
  if (lon >= 114.5 && lon <= 125.5 && lat >= -11 && lat <= -7) return 'Bali & Nusa Tenggara';
  if (lon >= 124.5 && lon <= 141.5 && lat >= -10 && lat <= 3) return 'Maluku & Papua';

  return 'Lainnya';
}

// Categorize Indonesian City / KC into proper Kedeputian Wilayah (KEPWIL I - XI)
export function getKepwilForCity(cityName: string): string {
  if (!cityName) return 'KEPWIL IV - DKI Jakarta & Banten';
  const name = cityName.toLowerCase().trim();

  // KEPWIL I: Aceh & Sumut
  if (/aceh|sabang|lhokseumawe|langsa|meulaboh|medan|binjai|tebing|siantar|pematangsiantar|tanjungbalai|sibolga|padangsidimpuan|gunungsitoli|deli|karo|asahan|labuhanbatu|nias|tapanuli|simalungun|dairi|pakpak|humbang|samosir|batubara|toba/i.test(name)) {
    return 'KEPWIL I - Aceh & Sumatera Utara';
  }

  // KEPWIL II: Sumbar, Riau, Kepri, Jambi
  if (/padang|bukittinggi|payakumbuh|pariaman|solok|sawahlunto|pasaman|sijunjung|dharmasraya|pekanbaru|dumai|duri|bengkalis|tembilahan|rengat|siak|kampar|pelalawan|rokan|kuansing|batam|tanjungpinang|karimun|natuna|anambas|lingga|jambi|sungai penuh|bungo|merangin|sarolangun|kerinci|batanghari|muaro jambi|tanjung jabung/i.test(name)) {
    return 'KEPWIL II - Riau, Kepri, Sumbar & Jambi';
  }

  // KEPWIL III: Sumsel, Babel, Bengkulu, Lampung
  if (/palembang|prabumulih|pagar alam|lubuklinggau|baturaja|lahat|muara enim|sekayu|ogan|banyuasin|empat lawang|penukal|musirawas|bengkulu|curup|manna|mukomuko|rejang|lebong|kaur|seluma|lampung|bandar lampung|metro|kotabumi|kalianda|pringsewu|mesuji|tulang bawang|tanggamus|pesawaran|way kanan|pangkal|bangka|belitung|tobali|muntok/i.test(name)) {
    return 'KEPWIL III - Sumsel, Babel, Bengkulu & Lampung';
  }

  // KEPWIL IV: DKI Jakarta & Banten
  if (/jakarta|seribu|gambir|kebayoran|rawamangun|jatinegara|tanah abang|priok|grogol|cilandak|tangerang|tangsel|bsd|serang|cilegon|pandeglang|lebak|rangkasbitung|tigaraksa/i.test(name)) {
    return 'KEPWIL IV - DKI Jakarta & Banten';
  }

  // KEPWIL V: Jawa Barat
  if (/bandung|cimahi|soreang|ngamprah|padalarang|bogor|cibinong|depok|bekasi|cikarang|sukabumi|cianjur|karawang|purwakarta|subang|sumedang|garut|tasikmalaya|ciamis|banjar|pangandaran|cirebon|kuningan|majalengka|indramayu/i.test(name)) {
    return 'KEPWIL V - Jawa Barat';
  }

  // KEPWIL VI: Jawa Tengah & D.I. Yogyakarta
  if (/semarang|salatiga|kendal|demak|kudus|jepara|pati|rembang|blora|grobogan|purwodadi|pekalongan|batang|pemalang|tegal|brebes|solo|surakarta|boyolali|klaten|sukoharjo|wonogiri|karanganyar|sragen|magelang|temanggung|wonosobo|purworejo|kebumen|purwokerto|banyumas|cilacap|purbalingga|banjarnegara|yogyakarta|jogja|sleman|bantul|kulon progo|wates|gunungkidul|wonosari/i.test(name)) {
    return 'KEPWIL VI - Jawa Tengah & D.I. Yogyakarta';
  }

  // KEPWIL VII: Jawa Timur
  if (/surabaya|sidoarjo|gresik|mojokerto|jombang|bojonegoro|tuban|lamongan|madiun|magetan|ngawi|ponorogo|pacitan|kediri|nganjuk|blitar|tulungagung|trenggalek|malang|batu|pasuruan|probolinggo|lumajang|bondowoso|situbondo|jember|banyuwangi|bangkalan|sampang|pamekasan|sumenep/i.test(name)) {
    return 'KEPWIL VII - Jawa Timur';
  }

  // KEPWIL VIII: Bali & Nusa Tenggara (NTB, NTT)
  if (/denpasar|singaraja|buleleng|tabanan|gianyar|ubud|klungkung|semarapura|bangli|karangasem|amlapura|negara|jembrana|badung|mangupura|kuta|mataram|lombok|praya|selong|gerung|sumbawa|taliwang|dompu|bima|raba|kupang|soe|kefamenanu|atambua|belu|kalabahi|alor|larantuka|lewoleba|lembata|maumere|sikka|ende|bajawa|ngada|mbay|nagekeo|ruteng|manggarai|borong|labuan bajo|waingapu|sumba|waikabubak|tambolaka|baa|rote|sabu|malaka/i.test(name)) {
    return 'KEPWIL VIII - Bali & Nusa Tenggara';
  }

  // KEPWIL IX: Kalimantan
  if (/pontianak|singkawang|sambas|bengkayang|landak|sanggau|sekadau|sintang|kapuas|putussibau|ketapang|sukadana|mempawah|kubu raya|palangka|palangkaraya|pangkalan bun|sampit|buntok|muara teweh|katingan|seruyan|sukamara|lamandau|pulang pisau|murung raya|barito|banjarmasin|banjarbaru|martapura|pelaihari|batulicin|kotabaru|marabahan|tapin|kandangan|barabai|amuntai|balangan|tabalong|samarinda|balikpapan|bontang|tenggarong|kukar|kutai|sendawar|sangatta|berau|penajam|ppu|paser|nusantara|ikn|tanjung selor|bulungan|tarakan|malinau|nunukan|tana tidung/i.test(name)) {
    return 'KEPWIL IX - Kalimantan';
  }

  // KEPWIL X: Sulawesi & Maluku Utara
  if (/makassar|gowa|takalar|jeneponto|bantaeng|bulukumba|selayar|sinjai|maros|pangkep|barru|parepare|bone|watampone|soppeng|wajo|sengkang|sidrap|pinrang|enrekang|palopo|luwu|masamba|malili|toraja|manado|bitung|tomohon|kotamobagu|minahasa|sangihe|talaud|sitaro|palu|donggala|sigi|parigi|poso|ampana|tojo una-una|tolitoli|buol|luwuk|banggai|morowali|kendari|baubau|bau-bau|kolaka|konawe|muna|buton|wakatobi|bombana|gorontalo|limboto|bone bolango|kwandang|boalemo|pohuwato|mamuju|tobadak|pasangkayu|polman|polewali|majene|mamasa|ternate|tidore|jailolo|weda|maba|labuha|tobelo|sanana|daruba|morotai|bobong/i.test(name)) {
    return 'KEPWIL X - Sulawesi & Maluku Utara';
  }

  // KEPWIL XI: Papua & Maluku
  if (/ambon|tual|masohi|langgur|saumlaki|tanimbar|namlea|buru|namrole|dobo|aru|piru|bula|tiakur|jayapura|sentani|sarmi|keerom|biak|supiori|serui|yapen|waropen|manokwari|ransiki|anggi|arfak|bintuni|rasiei|wondama|kaimana|fakfak|fak-fak|sorong|aimas|teminabuan|waisai|raja ampat|kumurkek|maybrat|merauke|tanah merah|boven digoel|kepi|mappi|agats|asmat|nabire|paniai|enarotali|timika|mimika|wamena|jayawijaya|oksibil|dekai|yahukimo|tolikara|karubaga|intan jaya|deiyai|dogiyai|punca|nduga|yalimo|mamberamo/i.test(name)) {
    return 'KEPWIL XI - Papua & Maluku';
  }

  return 'KEPWIL IV - DKI Jakarta & Banten';
}

