import { PackageType, Procedure, CartItem } from '../types';

export interface PackageOption {
  type: PackageType;
  title: string;
  shortLabel: string;
  sessions: number;
  originalPrice: number;
  discountPercent: number; // 15% for 3 sessions, 25% for 5 sessions
  finalPrice: number;
  pricePerSession: number;
  savings: number;
  badge?: string;
  description: string;
}

/**
 * Calculates package options based on procedure session price:
 * - 1 single session: standard price (0% OFF)
 * - 3 sessions: price * 3 with 15% OFF (multiplica por 3 e aplica 15% de desconto)
 * - 5 sessions: price * 5 with 25% OFF (multiplica por 5 e aplica 25% de desconto)
 */
export function calculatePackages(basePrice: number): Record<PackageType, PackageOption> {
  // If basePrice is very small (like test 0.01), keep it simple without packages
  if (basePrice < 1) {
    const pSingle: PackageOption = {
      type: 'single',
      title: 'Teste Único',
      shortLabel: 'Teste R$ 0,01',
      sessions: 1,
      originalPrice: basePrice,
      discountPercent: 0,
      finalPrice: basePrice,
      pricePerSession: basePrice,
      savings: 0,
      description: 'Cobrança teste para validação de checkout no Mercado Pago.',
    };
    return {
      single: pSingle,
      package_3: pSingle,
      package_5: pSingle,
    };
  }

  // 3 sessões: multiplica por 3 e aplica 15% de desconto
  const p3Original = Number((basePrice * 3).toFixed(2));
  const p3Final = Number((p3Original * 0.85).toFixed(2));
  const p3Savings = Number((p3Original - p3Final).toFixed(2));

  // 5 sessões: multiplica por 5 e aplica 25% de desconto
  const p5Original = Number((basePrice * 5).toFixed(2));
  const p5Final = Number((p5Original * 0.75).toFixed(2));
  const p5Savings = Number((p5Original - p5Final).toFixed(2));

  return {
    single: {
      type: 'single',
      title: '1 Sessão (Avulsa)',
      shortLabel: '1 Sessão',
      sessions: 1,
      originalPrice: basePrice,
      discountPercent: 0,
      finalPrice: basePrice,
      pricePerSession: basePrice,
      savings: 0,
      description: 'Atendimento pontual completo com kit cirúrgico e maca a domicílio.',
    },
    package_3: {
      type: 'package_3',
      title: 'Pacote 3 Sessões',
      shortLabel: '3 Sessões (-15%)',
      sessions: 3,
      originalPrice: p3Original,
      discountPercent: 15,
      finalPrice: p3Final,
      pricePerSession: Number((p3Final / 3).toFixed(2)),
      savings: p3Savings,
      badge: '15% OFF',
      description: 'Protocolo recomendado com 3 visitas domiciliares programadas.',
    },
    package_5: {
      type: 'package_5',
      title: 'Pacote 5 Sessões',
      shortLabel: '5 Sessões (-25%)',
      sessions: 5,
      originalPrice: p5Original,
      discountPercent: 25,
      finalPrice: p5Final,
      pricePerSession: Number((p5Final / 5).toFixed(2)),
      savings: p5Savings,
      badge: 'Super Oferta - 25% OFF',
      description: 'Tratamento intensivo contínuo com a maior economia por sessão.',
    },
  };
}

export function isTestProcedure(proc?: { id?: string; name?: string; price?: number } | null): boolean {
  if (!proc) return false;
  const id = (proc.id || '').toLowerCase();
  const name = (proc.name || '').toLowerCase();
  return (
    id === 'teste-checkout-centavo' ||
    id.includes('teste') ||
    name.includes('teste') ||
    (typeof proc.price === 'number' && proc.price <= 0.05)
  );
}

export function isAvaliacaoProcedure(proc?: { id?: string; name?: string } | null): boolean {
  if (!proc) return false;
  const id = (proc.id || '').toLowerCase();
  const name = (proc.name || '').toLowerCase();
  return (
    id === 'consulta-avaliacao' ||
    id.includes('avaliacao') ||
    id.includes('avaliação') ||
    id.includes('consulta') ||
    name.includes('avaliação') ||
    name.includes('avaliacao') ||
    name.includes('consulta')
  );
}

export function isSinglePricingProcedure(proc?: { id?: string; name?: string; price?: number } | null): boolean {
  return isAvaliacaoProcedure(proc) || isTestProcedure(proc);
}

/**
 * Helper to build a CartItem from a procedure and a package type
 */
export function buildCartItem(procedure: Procedure, packageType: PackageType = 'single'): CartItem {
  if (isSinglePricingProcedure(procedure)) {
    return {
      ...procedure,
      id: procedure.id,
      name: procedure.name,
      price: procedure.price,
      quantity: 1,
      packageType: 'single',
      packageSessions: 1,
      originalPrice: procedure.price,
      discountPercent: 0,
    };
  }

  const packages = calculatePackages(procedure.price);
  const selectedPkg = packages[packageType] || packages.single;

  const uniqueId = packageType === 'single' ? procedure.id : `${procedure.id}__${packageType}`;
  const nameWithPackage = packageType === 'single' 
    ? procedure.name 
    : `${procedure.name} (${selectedPkg.title} - ${selectedPkg.discountPercent}% OFF)`;

  return {
    ...procedure,
    id: uniqueId,
    name: nameWithPackage,
    price: selectedPkg.finalPrice,
    quantity: 1,
    packageType: selectedPkg.type,
    packageSessions: selectedPkg.sessions,
    originalPrice: selectedPkg.originalPrice,
    discountPercent: selectedPkg.discountPercent,
  };
}
