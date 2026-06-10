import kakaoImg from '../../assets/banks/kakao.png';
import tossImg from '../../assets/banks/toss.png';
import shinhanImg from '../../assets/banks/shinhan.png';
import hanaImg from '../../assets/banks/hana.png';
import wooriImg from '../../assets/banks/woori.png';
import kbImg from '../../assets/banks/kb.png';
import miraeImg from '../../assets/banks/mirae.png';
import samsungImg from '../../assets/banks/samsung.png';
import type { PortfolioFlow, AvailableAsset } from '../../api/portfolioFlowApi';
import type { Product } from '../../api/productApi';

// ─── 타입 ─────────────────────────────────────────────────

export interface HubItem {
  id: string;
  logo: string;
  logoBg: string;
  logoColor: string;
  name: string;
  number: string;
  sub: string;
  cardBg: string;
  border: string;
  nameColor: string;
  subColor: string;
  kind: '일반' | 'IRP' | 'ISA';
  hubLabel: string;
  imgSrc?: string;
}

export interface ProductItem {
  id: string;
  type: 'ETF' | '적금' | 'TDF' | '채권' | '리츠' | '주식';
  name: string;
  description: string;
  recommended?: boolean;
  icon: 'trending-up' | 'piggy-bank';
  iconColor: string;
  badgeBg: string;
  badgeColor: string;
}

export interface FlowProduct {
  productId: string;
  pct: number;
  barColor: string;
  productType: string;
  comment?: string;
}

export type FlowTerm = '단기' | '중기' | '장기';

export interface Flow {
  id: string;
  title: string;
  summary: string;
  term: FlowTerm;
  termRaw: string;
  kind: '일반' | 'IRP' | 'ISA';
  hubId: string;
  rate: string;
  projected: string;
  projectedPeriod: string;
  projectedMonths: number;
  badgeBg: string;
  badgeColor: string;
  amount: number;
  hubAssetType?: string;
  isRecommendation: boolean;
  accountComment?: string;
  rrComment?: string;
  products: FlowProduct[];
}

// ─── 유틸 ─────────────────────────────────────────────────

// 개월 수를 "N년 M개월" 형태로 변환 (12개월 미만은 "N개월")
export function formatMonths(months: number): string {
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years}년` : `${years}년 ${rest}개월`;
}

// ─── 상수 ─────────────────────────────────────────────────

export const STEP_COLORS = [
  { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#EAF3DE', color: '#3B6D11' },
];

export const TERM_STYLE: Record<FlowTerm, { bg: string; color: string }> = {
  단기: { bg: '#FECACA', color: '#991B1B' },
  중기: { bg: '#FDE68A', color: '#92400E' },
  장기: { bg: '#BBF7D0', color: '#166534' },
};

export const BAR_COLORS = ['#E24B4A', '#378ADD', '#534AB7', '#3B6D11', '#C45500', '#639922', '#0F6E56'];

export const HUB_ASSET_TYPES = new Set(['CHECKING', 'PARKING', 'SAVINGS', 'DEPOSIT', 'CMA', 'IRP', 'ISA', 'PENSION_SAVINGS', 'STOCK']);

export const INVESTABLE_HUB_TYPES = new Set(['STOCK', 'ISA', 'IRP', 'PENSION_SAVINGS']);

const PLACEHOLDER_HUB: HubItem = {
  id: '', logo: '?', logoBg: '#94a3b8', logoColor: '#fff',
  name: '-', number: '-', sub: '-',
  cardBg: '#f1f5f9', border: '#e2e8f0', nameColor: '#0f172a', subColor: '#64748b',
  kind: '일반', hubLabel: '-',
};

const PLACEHOLDER_PRODUCT: ProductItem = {
  id: '', type: 'ETF', name: '-', description: '-',
  recommended: false, icon: 'trending-up', iconColor: '#94a3b8',
  badgeBg: '#f1f5f9', badgeColor: '#64748b',
};

// ─── 레지스트리 (모듈 수준 캐시) ─────────────────────────

export const dynamicHubs = new Map<string, HubItem>();
export const dynamicProducts = new Map<string, ProductItem>();
export const productApiTypeById = new Map<string, string>();

export const lookupHub = (id: string): HubItem =>
  dynamicHubs.get(id) ?? PLACEHOLDER_HUB;

export const lookupProduct = (id: string): ProductItem =>
  dynamicProducts.get(id) ?? PLACEHOLDER_PRODUCT;

// ─── 뱅크 메타 ────────────────────────────────────────────

interface BankMeta { logo: string; bg: string; color: string; imgSrc?: string }

const BANK_META: Record<string, BankMeta> = {
  '카카오뱅크': { logo: 'K', bg: '#FEE500', color: '#3C1E1E', imgSrc: kakaoImg },
  '토스뱅크':   { logo: 'T', bg: '#3182F6', color: '#fff',    imgSrc: tossImg  },
  '토스증권':   { logo: 'T', bg: '#3182F6', color: '#fff',    imgSrc: tossImg  },
  '신한은행':   { logo: 'S', bg: '#0046FF', color: '#fff',    imgSrc: shinhanImg },
  '하나은행':   { logo: 'H', bg: '#009F6B', color: '#fff',    imgSrc: hanaImg  },
  '우리은행':   { logo: 'W', bg: '#0067AC', color: '#fff',    imgSrc: wooriImg },
  '국민은행':   { logo: 'K', bg: '#FFCD00', color: '#3C1E1E', imgSrc: kbImg    },
  'KB증권':     { logo: 'K', bg: '#FFCD00', color: '#3C1E1E', imgSrc: kbImg    },
  '미래에셋':   { logo: '미래', bg: '#FF8200', color: '#fff', imgSrc: miraeImg  },
  '삼성증권':   { logo: 'S',   bg: '#1428A0', color: '#fff', imgSrc: samsungImg },
};

export const bankMeta = (inst: string): BankMeta =>
  BANK_META[inst] ?? { logo: (inst || '?')[0], bg: '#94a3b8', color: '#fff' };

// ─── 상품 타입 메타 ───────────────────────────────────────

interface ProductTypeMeta {
  type: ProductItem['type'];
  icon: ProductItem['icon'];
  iconColor: string;
  badgeBg: string;
  badgeColor: string;
  barColor: string;
}

const PRODUCT_TYPE_META: Record<string, ProductTypeMeta> = {
  STOCK:   { type: 'ETF',  icon: 'trending-up', iconColor: '#A32D2D', badgeBg: '#FCEBEB', badgeColor: '#A32D2D', barColor: '#E24B4A' },
  BOND:    { type: '채권', icon: 'piggy-bank',   iconColor: '#185FA5', badgeBg: '#E6F1FB', badgeColor: '#185FA5', barColor: '#378ADD' },
  SAVING:  { type: '적금', icon: 'piggy-bank',   iconColor: '#185FA5', badgeBg: '#E6F1FB', badgeColor: '#185FA5', barColor: '#378ADD' },
  DEPOSIT: { type: '적금', icon: 'piggy-bank',   iconColor: '#185FA5', badgeBg: '#E6F1FB', badgeColor: '#185FA5', barColor: '#378ADD' },
  IRP:     { type: 'TDF',  icon: 'trending-up', iconColor: '#534AB7', badgeBg: '#EEEDFE', badgeColor: '#534AB7', barColor: '#534AB7' },
};

export const productTypeMeta = (t: string | null | undefined): ProductTypeMeta =>
  PRODUCT_TYPE_META[t ?? ''] ?? PRODUCT_TYPE_META.STOCK;

// ─── 헬퍼 함수 ────────────────────────────────────────────

export const isInvestableHub = (t?: string | null): boolean =>
  INVESTABLE_HUB_TYPES.has(t ?? '');

export const assetTypeToKind = (t: string | null | undefined): '일반' | 'IRP' | 'ISA' =>
  t === 'IRP' ? 'IRP' : t === 'ISA' ? 'ISA' : '일반';

export const apiTermToFlowTerm = (t?: string | null): FlowTerm =>
  t?.startsWith('단') ? '단기' : t?.startsWith('장') ? '장기' : '중기';

export function buildFlowTabLabels(flows: Flow[]): Record<string, string> {
  const total: Record<string, number> = {};
  flows.forEach(f => { total[f.termRaw] = (total[f.termRaw] ?? 0) + 1; });
  const seen: Record<string, number> = {};
  const labels: Record<string, string> = {};
  flows.forEach(f => {
    seen[f.termRaw] = (seen[f.termRaw] ?? 0) + 1;
    labels[f.id] = total[f.termRaw] > 1 ? `${f.termRaw}${seen[f.termRaw]}` : f.termRaw;
  });
  return labels;
}

// ─── API DTO → 내부 모델 변환 ────────────────────────────

export function apiToFlow(dto: PortfolioFlow): Flow {
  const term = apiTermToFlowTerm(dto.term);
  const termRaw = dto.term ?? term;
  const kind = assetTypeToKind(dto.gatheringAsset?.assetType);

  const hubId = dto.gatheringAsset?.id ?? `dyn-hub-${dto.id}`;
  if (dto.gatheringAsset && !dynamicHubs.has(hubId)) {
    const ga = dto.gatheringAsset;
    const m = bankMeta(ga.institution ?? '');
    const rateText = ga.interestRate != null ? `연 ${ga.interestRate}%` : '';
    dynamicHubs.set(hubId, {
      id: hubId,
      logo: m.logo, logoBg: m.bg, logoColor: m.color, imgSrc: m.imgSrc,
      name: ga.accountName ?? '모으기 통장',
      number: ga.assetNumber ?? '',
      sub: dto.isRecommendation
        ? [ga.assetType, rateText].filter(Boolean).join(' · ') || '추천 계좌'
        : (ga.assetType ?? ''),
      cardBg: kind === 'IRP' ? '#F1F5F9' : kind === 'ISA' ? '#F8FAFC' : '#EEEDFE',
      border: kind === 'IRP' ? '#94A3B8' : kind === 'ISA' ? '#CBD5E1' : '#AFA9EC',
      nameColor: kind === 'IRP' ? '#1E293B' : kind === 'ISA' ? '#334155' : '#3C3489',
      subColor: kind === 'IRP' ? '#475569' : kind === 'ISA' ? '#64748B' : '#534AB7',
      kind,
      hubLabel: ga.institution ?? '',
    });
  }

  const products: FlowProduct[] = dto.products.map((p, i) => {
    const meta = productTypeMeta(p.productType);
    const productId = p.productId ?? `dyn-prod-${dto.id}-${i}`;
    if (!dynamicProducts.has(productId)) {
      dynamicProducts.set(productId, {
        id: productId,
        type: meta.type,
        name: p.productName ?? '',
        description: p.interestRate != null ? `연 ${p.interestRate}%` : '',
        recommended: false,
        icon: meta.icon,
        iconColor: meta.iconColor,
        badgeBg: meta.badgeBg,
        badgeColor: meta.badgeColor,
      });
    }
    if (p.productType) productApiTypeById.set(productId, p.productType);
    return {
      productId,
      pct: p.productRatio ?? 0,
      barColor: meta.barColor,
      productType: p.productType ?? 'STOCK',
      comment: p.comment ?? undefined,
    };
  });

  const rate = dto.expectedRrPct != null
    ? `${dto.expectedRrPct >= 0 ? '+' : ''}${dto.expectedRrPct}%`
    : '+0.0%';
  const projectedMonths = dto.investmentMonths ?? 12;
  const projectedPeriod = formatMonths(projectedMonths);
  const projected = dto.expectedAmount != null
    ? `${Math.round(dto.expectedAmount / 10000)}만 원`
    : '-';

  return {
    id: dto.id,
    title: dto.title ?? '',
    summary: dto.summary ?? '',
    term, termRaw, kind, hubId,
    rate, projected, projectedPeriod, projectedMonths,
    badgeBg: kind === 'IRP' ? '#F1F5F9' : kind === 'ISA' ? '#F8FAFC' : '#EEEDFE',
    badgeColor: kind === 'IRP' ? '#475569' : kind === 'ISA' ? '#64748B' : '#534AB7',
    amount: Math.round((dto.amount ?? 0) / 10000),
    hubAssetType: dto.gatheringAsset?.assetType ?? undefined,
    isRecommendation: dto.isRecommendation,
    accountComment: dto.accountComment ?? undefined,
    rrComment: dto.rrComment ?? undefined,
    products: isInvestableHub(dto.gatheringAsset?.assetType) ? products : [],
  };
}

export function assetToHubItem(a: AvailableAsset): HubItem {
  const m = bankMeta(a.institution ?? '');
  const kind = assetTypeToKind(a.assetType);
  const hub: HubItem = {
    id: a.id,
    logo: m.logo, logoBg: m.bg, logoColor: m.color, imgSrc: m.imgSrc,
    name: a.accountName ?? '모으기 통장',
    number: a.assetNumber ?? '',
    sub: a.assetType ?? '',
    cardBg: kind === 'IRP' ? '#FFF4E6' : kind === 'ISA' ? '#FEF3C7' : '#EEEDFE',
    border: kind === 'IRP' ? '#FFB873' : kind === 'ISA' ? '#F59E0B' : '#AFA9EC',
    nameColor: kind === 'IRP' ? '#9A4D00' : kind === 'ISA' ? '#92400E' : '#3C3489',
    subColor: kind === 'IRP' ? '#C45500' : kind === 'ISA' ? '#B45309' : '#534AB7',
    kind,
    hubLabel: a.institution ?? '',
  };
  dynamicHubs.set(a.id, hub);
  return hub;
}

export function productToCatalogItem(p: Product): ProductItem {
  const meta = productTypeMeta(p.productType);
  const item: ProductItem = {
    id: p.id,
    type: meta.type,
    name: p.name ?? '',
    description: p.description ?? (p.interestRate != null ? `연 ${p.interestRate}%` : ''),
    recommended: false,
    icon: meta.icon,
    iconColor: meta.iconColor,
    badgeBg: meta.badgeBg,
    badgeColor: meta.badgeColor,
  };
  dynamicProducts.set(p.id, item);
  if (p.productType) productApiTypeById.set(p.id, p.productType);
  return item;
}
