export interface ShippingCalculation {
  originCep: string;
  originAddress: string;
  destCep: string;
  destNeighborhood: string;
  distanceKm: number;
  ratePerKm: number; // R$ 1,00
  shippingFee: number;
  isWithinTeresina: boolean;
  message: string;
}

export const ORIGIN_CONFIG = {
  cep: '64099-000',
  address: 'Base Operacional Vitale (Lourival Parente / Polo Sul)',
  city: 'Teresina',
  state: 'PI',
  lat: -5.1438,
  lng: -42.7845,
  ratePerKm: 1.0, // R$ 1,00 por KM conforme regra do cliente
};

// Known coordinates and road distance approximations for Teresina neighborhoods from CEP 64099-000
const TERESINA_NEIGHBORHOODS: Record<string, { lat: number; lng: number; approxKm?: number }> = {
  // Zona Sul (Perto da base 64099-000)
  'lourival parente': { lat: -5.1438, lng: -42.7845, approxKm: 2 },
  'esplanada': { lat: -5.1480, lng: -42.7820, approxKm: 2 },
  'saci': { lat: -5.1370, lng: -42.7930, approxKm: 3 },
  'morada nova': { lat: -5.1410, lng: -42.7750, approxKm: 3 },
  'promorar': { lat: -5.1580, lng: -42.7890, approxKm: 4 },
  'bela vista': { lat: -5.1320, lng: -42.7860, approxKm: 4 },
  'parque piaui': { lat: -5.1450, lng: -42.7980, approxKm: 4 },
  'sao pedro': { lat: -5.1180, lng: -42.8020, approxKm: 5 },
  'tabuleta': { lat: -5.1220, lng: -42.7880, approxKm: 4 },
  'vermelha': { lat: -5.1080, lng: -42.8050, approxKm: 6 },
  'macauba': { lat: -5.1050, lng: -42.8010, approxKm: 6 },
  'tres andares': { lat: -5.1100, lng: -42.7800, approxKm: 5 },
  'porto alegre': { lat: -5.1750, lng: -42.7950, approxKm: 6 },
  'areias': { lat: -5.1490, lng: -42.8050, approxKm: 3 },

  // Centro / Zona Sul-Centro
  'centro': { lat: -5.0890, lng: -42.8120, approxKm: 8 },
  'picarra': { lat: -5.0990, lng: -42.8010, approxKm: 7 },
  'ilha grande': { lat: -5.0920, lng: -42.8060, approxKm: 8 },
  'monte castelo': { lat: -5.1040, lng: -42.8140, approxKm: 6 },

  // Zona Leste (Área nobre / Clínica concierge)
  'ilhotas': { lat: -5.0870, lng: -42.7980, approxKm: 9 },
  'joquei': { lat: -5.0740, lng: -42.7870, approxKm: 11 },
  'joquei clube': { lat: -5.0740, lng: -42.7870, approxKm: 11 },
  'fatima': { lat: -5.0780, lng: -42.7820, approxKm: 11 },
  'sao cristovao': { lat: -5.0680, lng: -42.7790, approxKm: 12 },
  'ininga': { lat: -5.0590, lng: -42.7840, approxKm: 13 },
  'horto': { lat: -5.0710, lng: -42.7720, approxKm: 13 },
  'horto florestal': { lat: -5.0710, lng: -42.7720, approxKm: 13 },
  'morros': { lat: -5.0520, lng: -42.7680, approxKm: 15 },
  'pedra mole': { lat: -5.0350, lng: -42.7620, approxKm: 17 },
  'uruguai': { lat: -5.0620, lng: -42.7480, approxKm: 14 },
  'planalto': { lat: -5.0820, lng: -42.7550, approxKm: 12 },
  'vale quem tem': { lat: -5.0510, lng: -42.7490, approxKm: 16 },

  // Zona Sudeste
  'dirceu': { lat: -5.1140, lng: -42.7520, approxKm: 7 },
  'dirceu arcoverde': { lat: -5.1140, lng: -42.7520, approxKm: 7 },
  'itarare': { lat: -5.1190, lng: -42.7450, approxKm: 8 },
  'renascenca': { lat: -5.1270, lng: -42.7400, approxKm: 8 },
  'parque ideal': { lat: -5.1080, lng: -42.7410, approxKm: 9 },
  'sao joao': { lat: -5.0930, lng: -42.7730, approxKm: 9 },
  'recanto das palmeiras': { lat: -5.0910, lng: -42.7630, approxKm: 10 },
  'gurupi': { lat: -5.1050, lng: -42.7280, approxKm: 10 },
  'todos os santos': { lat: -5.1280, lng: -42.7310, approxKm: 9 },

  // Zona Norte
  'piriperi': { lat: -5.0580, lng: -42.8250, approxKm: 12 },
  'buenos aires': { lat: -5.0620, lng: -42.8180, approxKm: 12 },
  'aeroporto': { lat: -5.0610, lng: -42.8220, approxKm: 12 },
  'marquês': { lat: -5.0740, lng: -42.8140, approxKm: 10 },
  'marques': { lat: -5.0740, lng: -42.8140, approxKm: 10 },
  'primavera': { lat: -5.0650, lng: -42.8110, approxKm: 11 },
  'mocambinho': { lat: -5.0380, lng: -42.8280, approxKm: 15 },
  'rondon': { lat: -5.0450, lng: -42.8150, approxKm: 14 },
  'alameda': { lat: -5.0550, lng: -42.8050, approxKm: 12 },
  'agua mineral': { lat: -5.0510, lng: -42.8120, approxKm: 13 },
  'santa maria da codipi': { lat: -4.9850, lng: -42.8420, approxKm: 23 },
  'poty velho': { lat: -5.0420, lng: -42.8360, approxKm: 15 },
};

/**
 * Calculates straight line distance using Haversine formula
 */
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Clean neighborhood name for lookup
 */
function normalizeName(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Calculates shipping fee:
 * Base CEP: 64099-000
 * Rate: R$ 1,00 per KM
 */
export function calculateShippingFee(
  destCep: string,
  destNeighborhood?: string,
  coords?: { lat: number; lng: number }
): ShippingCalculation {
  const cleanCep = (destCep || '').replace(/\D/g, '');
  const normNeigh = normalizeName(destNeighborhood || '');

  // Verify Teresina CEP range (64000-000 to 64099-999)
  const cepNum = parseInt(cleanCep, 10);
  const isTeresinaCep = !isNaN(cepNum) && cepNum >= 64000000 && cepNum <= 64099999;

  let distanceKm = 8; // Default fallback distance within Teresina

  // 1. Direct neighborhood lookup
  const foundNeigh = Object.keys(TERESINA_NEIGHBORHOODS).find(k => 
    normNeigh.includes(k) || k.includes(normNeigh)
  );

  if (foundNeigh && TERESINA_NEIGHBORHOODS[foundNeigh]) {
    const neighData = TERESINA_NEIGHBORHOODS[foundNeigh];
    if (neighData.approxKm) {
      distanceKm = neighData.approxKm;
    } else {
      // Calculate Haversine + 1.25 urban road factor
      const straight = haversineDistanceKm(ORIGIN_CONFIG.lat, ORIGIN_CONFIG.lng, neighData.lat, neighData.lng);
      distanceKm = Math.max(2, Math.round(straight * 1.25));
    }
  } else if (coords?.lat && coords?.lng) {
    // 2. Exact coordinates provided
    const straight = haversineDistanceKm(ORIGIN_CONFIG.lat, ORIGIN_CONFIG.lng, coords.lat, coords.lng);
    distanceKm = Math.max(2, Math.round(straight * 1.25));
  } else if (isTeresinaCep) {
    // 3. Estimate by CEP prefix in Teresina
    const prefix3 = parseInt(cleanCep.substring(0, 5), 10);
    if (prefix3 >= 64090 && prefix3 <= 64099) {
      distanceKm = 3; // Southern / Lourival Parente region
    } else if (prefix3 >= 64010 && prefix3 <= 64039) {
      distanceKm = 5; // South/Center
    } else if (prefix3 >= 64000 && prefix3 <= 64009) {
      distanceKm = 7; // Centro / Vermelha
    } else if (prefix3 >= 64070 && prefix3 <= 64089) {
      distanceKm = 8; // Dirceu / Sudeste
    } else if (prefix3 >= 64040 && prefix3 <= 64059) {
      distanceKm = 11; // Leste / Jóquei / Fátima
    } else if (prefix3 >= 64060 && prefix3 <= 64069) {
      distanceKm = 14; // Norte / Buenos Aires / Mocambinho
    } else {
      distanceKm = 9;
    }
  }

  // Distance calculation in kilometers
  distanceKm = Math.max(1, Math.round(distanceKm));

  // Isento até 5 km. Acima de 5 km: taxa somente sobre a distância excedente
  const billableKm = Math.max(0, distanceKm - 5);
  const shippingFee = Math.round(billableKm * ORIGIN_CONFIG.ratePerKm);

  return {
    originCep: ORIGIN_CONFIG.cep,
    originAddress: ORIGIN_CONFIG.address,
    destCep: cleanCep,
    destNeighborhood: destNeighborhood || 'Teresina - PI',
    distanceKm,
    ratePerKm: ORIGIN_CONFIG.ratePerKm,
    shippingFee,
    isWithinTeresina: isTeresinaCep,
    message: shippingFee === 0 
      ? 'Atendimento domiciliar em Teresina' 
      : `Deslocamento: R$ ${shippingFee.toFixed(2)}`,
  };
}
