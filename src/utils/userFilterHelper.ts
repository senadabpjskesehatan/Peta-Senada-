import { AppUser, CityData } from '../types';
import { isKepwilMatching, isKantorCabangMatching } from './monthHelper';
import { getKepwilForCity } from '../data/defaultData';

export interface UserDefaultFilterResult {
  kepwil: string;
  kantorCabang: string;
}

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
  7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII',
  13: 'XIII', 14: 'XIV',
};

const NUMBER_FROM_ROMAN: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
  'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12,
  'XIII': 13, 'XIV': 14,
};

/**
 * Resolves the default filter parameters (Kepwil & Kantor Cabang)
 * based on the role and identity of the currently logged-in user.
 * - Admin: 'Semua' (nasional)
 * - Kepwil: Default Kepwil of that user
 * - Kantor Cabang: Default Kantor Cabang of that user (and associated Kepwil)
 */
export function getUserDefaultFilters(
  user: AppUser | null | undefined,
  availableKepwilList: string[] = [],
  availableKantorCabangList: string[] = [],
  citiesData: CityData[] = []
): UserDefaultFilterResult {
  if (!user || user.role === 'admin' || user.role === 'kantor_pusat') {
    return { kepwil: 'Semua', kantorCabang: 'Semua' };
  }

  // 1. USER ROLE: KEPWIL
  if (user.role === 'kepwil') {
    const combinedStr = `${user.username || ''} ${user.displayName || ''}`;
    const romanOrNumMatch = combinedStr.match(/\b(XI|XII|VIII|VII|VI|IV|IX|III|II|V|X|I|\d+)\b/i);
    let targetNum: number | null = null;

    if (romanOrNumMatch) {
      const token = romanOrNumMatch[1].toUpperCase();
      if (/^\d+$/.test(token)) {
        targetNum = parseInt(token, 10);
      } else if (NUMBER_FROM_ROMAN[token]) {
        targetNum = NUMBER_FROM_ROMAN[token];
      }
    }

    let matchedKepwil = '';

    // Search in availableKepwilList by number / roman numeral
    if (targetNum !== null && availableKepwilList.length > 0) {
      for (const opt of availableKepwilList) {
        const optMatch = opt.match(/\b(XI|XII|VIII|VII|VI|IV|IX|III|II|V|X|I|\d+)\b/i);
        if (optMatch) {
          const optToken = optMatch[1].toUpperCase();
          const optNum = /^\d+$/.test(optToken) ? parseInt(optToken, 10) : NUMBER_FROM_ROMAN[optToken];
          if (optNum === targetNum) {
            matchedKepwil = opt;
            break;
          }
        }
      }
    }

    // Try matching using isKepwilMatching helper
    if (!matchedKepwil && availableKepwilList.length > 0) {
      const found = availableKepwilList.find(opt => 
        isKepwilMatching(opt, user.username) || isKepwilMatching(opt, user.displayName || '')
      );
      if (found) matchedKepwil = found;
    }

    // Try finding matching kepwil in citiesData
    if (!matchedKepwil && citiesData.length > 0) {
      const foundCity = citiesData.find(c => {
        const kw = c.kepwil || '';
        return isKepwilMatching(kw, user.username) || isKepwilMatching(kw, user.displayName || '');
      });
      if (foundCity && foundCity.kepwil) {
        matchedKepwil = foundCity.kepwil;
      }
    }

    // Fallback: format name cleanly
    if (!matchedKepwil) {
      if (targetNum !== null) {
        matchedKepwil = `KEPWIL ${ROMAN_NUMERALS[targetNum] || targetNum}`;
      } else {
        matchedKepwil = user.displayName || user.username || 'Semua';
      }
    }

    return {
      kepwil: matchedKepwil,
      kantorCabang: 'Semua',
    };
  }

  // 2. USER ROLE: KANTOR CABANG (KC)
  if (user.role === 'kantor_cabang') {
    const rawName = user.displayName || user.username || '';
    const cleanUserKc = rawName.replace(/^(kantor\s*cabang|kc|cabang)\s+/i, '').trim().toLowerCase();

    let matchedKC = '';

    // Step A: Exact clean match in availableKantorCabangList
    if (availableKantorCabangList.length > 0) {
      for (const opt of availableKantorCabangList) {
        const cleanOpt = opt.replace(/^(kantor\s*cabang|kc|cabang)\s+/i, '').trim().toLowerCase();
        if (cleanOpt === cleanUserKc) {
          matchedKC = opt;
          break;
        }
      }
    }

    // Step B: Partial match in availableKantorCabangList
    if (!matchedKC && availableKantorCabangList.length > 0) {
      for (const opt of availableKantorCabangList) {
        const cleanOpt = opt.replace(/^(kantor\s*cabang|kc|cabang)\s+/i, '').trim().toLowerCase();
        if (cleanOpt.includes(cleanUserKc) || cleanUserKc.includes(cleanOpt)) {
          matchedKC = opt;
          break;
        }
      }
    }

    // Step C: Match in citiesData
    if (!matchedKC && citiesData.length > 0) {
      const foundCity = citiesData.find(c => {
        const rowKc = (c.kantorCabang || c.name || '').replace(/^(kantor\s*cabang|kc|cabang)\s+/i, '').trim().toLowerCase();
        return rowKc === cleanUserKc || rowKc.includes(cleanUserKc) || cleanUserKc.includes(rowKc);
      });
      if (foundCity) {
        matchedKC = foundCity.kantorCabang || foundCity.name;
      }
    }

    // Fallback KC name
    if (!matchedKC) {
      matchedKC = user.displayName || `KC ${user.username}`;
    }

    // Step D: Find associated parent Kepwil for this Kantor Cabang
    let matchedKepwil = '';
    const matchedCity = citiesData.find(c => isKantorCabangMatching(c.kantorCabang || c.name || '', matchedKC));

    if (matchedCity && matchedCity.kepwil) {
      // Find matching Kepwil option in availableKepwilList
      const opt = availableKepwilList.find(k => isKepwilMatching(k, matchedCity.kepwil!));
      matchedKepwil = opt || matchedCity.kepwil;
    }

    if (!matchedKepwil) {
      const inferredKepwil = getKepwilForCity(cleanUserKc || matchedKC);
      if (inferredKepwil) {
        const opt = availableKepwilList.find(k => isKepwilMatching(k, inferredKepwil));
        matchedKepwil = opt || inferredKepwil;
      }
    }

    return {
      kepwil: matchedKepwil || 'Semua',
      kantorCabang: matchedKC,
    };
  }

  return { kepwil: 'Semua', kantorCabang: 'Semua' };
}

/**
 * Returns formatted display label for the user's default data scope
 */
export function getUserDefaultScopeLabel(user: AppUser | null | undefined): string {
  if (!user || user.role === 'admin') {
    return 'Nasional (Seluruh Indonesia)';
  }
  if (user.role === 'kepwil') {
    return user.displayName || user.username;
  }
  return user.displayName || `KC ${user.username}`;
}

/**
 * Returns detailed identity labels for the logged-in user:
 * - userName: User login / username (e.g. 'KEPWIL 1' or '101')
 * - officeName: Nama Kantor Cabang / Kedeputian Wilayah (e.g. 'KEDEPUTIAN WILAYAH 1' or 'KC BANDA ACEH')
 * - typeLabel: Short category badge ('Kepwil', 'Kantor Cabang', or 'Pusat')
 */
export function getUserOfficeOrWilayahLabel(user: AppUser | null | undefined): {
  userName: string;
  officeName: string;
  typeLabel: string;
} {
  if (!user) {
    return {
      userName: 'Tamu',
      officeName: 'Umum',
      typeLabel: 'Tamu',
    };
  }

  const userName = user.username || 'senada';

  if (user.role === 'admin' || user.role === 'kantor_pusat') {
    return {
      userName,
      officeName: user.displayName || 'Kantor Pusat (Nasional)',
      typeLabel: user.role === 'admin' ? 'Pusat / Admin' : 'Kantor Pusat',
    };
  }

  if (user.role === 'kepwil') {
    let office = user.displayName;
    if (!office) {
      const numOnly = userName.replace(/[^0-9]/g, '');
      office = numOnly ? `KEDEPUTIAN WILAYAH ${numOnly}` : `KEDEPUTIAN WILAYAH (${userName})`;
    }
    return {
      userName,
      officeName: office,
      typeLabel: 'Kedeputian Wilayah',
    };
  }

  // kantor_cabang
  let office = user.displayName;
  if (!office) {
    office = `KC ${userName}`;
  } else if (!/^kc\b/i.test(office) && !/kantor\s*cabang/i.test(office)) {
    office = `KC ${office}`;
  }

  return {
    userName,
    officeName: office,
    typeLabel: 'Kantor Cabang',
  };
}
