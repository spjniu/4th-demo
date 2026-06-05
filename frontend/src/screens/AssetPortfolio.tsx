import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getPortfolioFlows, getAvailableAssets, updatePortfolioFlow,
  type PortfolioFlow, type AvailableAsset, type PortfolioFlowUpdateRequest,
} from '../api/portfolioFlowApi';
import { getProducts, type Product } from '../api/productApi';
import pillImg from '../assets/pill.png';
import kakaoImg from '../assets/banks/kakao.png';
import tossImg from '../assets/banks/toss.png';
import shinhanImg from '../assets/banks/shinhan.png';
import hanaImg from '../assets/banks/hana.png';
import wooriImg from '../assets/banks/woori.png';
import kbImg from '../assets/banks/kb.png';
import miraeImg from '../assets/banks/mirae.png';


const STEP_COLORS = [
  { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#EAF3DE', color: '#3B6D11' },
];

// ─── 카탈로그 ───────────────────────────────────────

interface HubItem {
  id: string;
  logo: string;
  logoBg: string;
  logoColor: string;
  name: string;          // 통장 이름
  number: string;        // 계좌번호 (마스킹)
  sub: string;
  cardBg: string;
  border: string;
  nameColor: string;
  subColor: string;
  kind: '일반' | 'IRP' | 'ISA';
  hubLabel: string;
  imgSrc?: string;
}

// HUB_CATALOG (mock) 는 GET /portfolio-flows/available-assets 응답으로 대체됨
// (모으기 통장 후보 = 사용 가능한 통장 = available-assets)
const PLACEHOLDER_HUB: HubItem = {
  id: '', logo: '?', logoBg: '#94a3b8', logoColor: '#fff',
  name: '-', number: '-', sub: '-',
  cardBg: '#f1f5f9', border: '#e2e8f0', nameColor: '#0f172a', subColor: '#64748b',
  kind: '일반', hubLabel: '-',
};

interface ProductItem {
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

// PRODUCT_CATALOG (mock) 는 GET /products 응답으로 대체됨
const PLACEHOLDER_PRODUCT: ProductItem = {
  id: '', type: 'ETF', name: '-', description: '-',
  recommended: false, icon: 'trending-up', iconColor: '#94a3b8',
  badgeBg: '#f1f5f9', badgeColor: '#64748b',
};

// ─── Flow 타입 ───────────────────────────────────────

interface FlowProduct { productId: string; pct: number; barColor: string; productType: string; comment?: string; }   // productType = API 원본 (STOCK/BOND/DEPOSIT/SAVING/IRP)

type FlowTerm = '단기' | '중기' | '장기';

interface Flow {
  id: string;                // API: portfolio_flows.id (UUID) — flow 식별자
  title: string;
  summary: string;
  term: FlowTerm;            // 색상/그룹용 base 기간 (단기/중기/장기)
  termRaw: string;           // 표시용 원본 (단기/중기/장기1/장기2 …)
  kind: '일반' | 'IRP' | 'ISA';
  hubId: string;
  rate: string;
  projected: string;
  projectedPeriod: string;   // '6개월' | '1년' | '4년'
  badgeBg: string;
  badgeColor: string;
  amount: number;            // 흐름별 월 납입 금액 (만원)
  hubAssetType?: string;     // 모을 통장 원본 assetType (상품 매수 가능 여부 판단)
  isRecommendation: boolean; // true = 계좌 추천 / false = 보유 계좌
  accountComment?: string;   // 모을 통장(추천) 이유
  rrComment?: string;        // 수익률 코멘트
  products: FlowProduct[];
}

const TERM_STYLE: Record<FlowTerm, { bg: string; color: string }> = {
  단기: { bg: '#FECACA', color: '#991B1B' },
  중기: { bg: '#FDE68A', color: '#92400E' },
  장기: { bg: '#BBF7D0', color: '#166534' },
};

// ─── 동적 라벨/매핑 헬퍼 ─────────────────────────────────
// 'all' 또는 flow.id 직접 진입
type TermTab = 'all' | string;

// 색상/그룹용 base 기간 파생 — '장기1','장기2'는 '장기'로 묶음 (표시는 termRaw 원본 사용)
const apiTermToFlowTerm = (t?: string | null): FlowTerm =>
  t?.startsWith('단') ? '단기' : t?.startsWith('장') ? '장기' : '중기';

// 기관명 → Logo 표시 메타
interface BankMeta { logo: string; bg: string; color: string; imgSrc?: string }
const BANK_META: Record<string, BankMeta> = {
  '카카오뱅크': { logo: 'K', bg: '#FEE500', color: '#3C1E1E', imgSrc: kakaoImg },
  '토스뱅크': { logo: 'T', bg: '#3182F6', color: '#fff', imgSrc: tossImg },
  '토스증권': { logo: 'T', bg: '#3182F6', color: '#fff', imgSrc: tossImg },
  '신한은행': { logo: 'S', bg: '#0046FF', color: '#fff', imgSrc: shinhanImg },
  '하나은행': { logo: 'H', bg: '#009F6B', color: '#fff', imgSrc: hanaImg },
  '우리은행': { logo: 'W', bg: '#0067AC', color: '#fff', imgSrc: wooriImg },
  '국민은행': { logo: 'K', bg: '#FFCD00', color: '#3C1E1E', imgSrc: kbImg },
  'KB증권': { logo: 'K', bg: '#FFCD00', color: '#3C1E1E', imgSrc: kbImg },
  '미래에셋': { logo: '미래', bg: '#FF8200', color: '#fff', imgSrc: miraeImg },
};
const bankMeta = (inst: string): BankMeta =>
  BANK_META[inst] ?? { logo: (inst || '?')[0], bg: '#94a3b8', color: '#fff' };

// API productType → ProductItem 표시 메타
interface ProductTypeMeta {
  type: ProductItem['type'];
  icon: ProductItem['icon'];
  iconColor: string;
  badgeBg: string;
  badgeColor: string;
  barColor: string;
}
const PRODUCT_TYPE_META: Record<string, ProductTypeMeta> = {
  STOCK: { type: 'ETF', icon: 'trending-up', iconColor: '#A32D2D', badgeBg: '#FCEBEB', badgeColor: '#A32D2D', barColor: '#E24B4A' },
  BOND: { type: '채권', icon: 'piggy-bank', iconColor: '#185FA5', badgeBg: '#E6F1FB', badgeColor: '#185FA5', barColor: '#378ADD' },
  SAVING: { type: '적금', icon: 'piggy-bank', iconColor: '#185FA5', badgeBg: '#E6F1FB', badgeColor: '#185FA5', barColor: '#378ADD' },
  DEPOSIT: { type: '적금', icon: 'piggy-bank', iconColor: '#185FA5', badgeBg: '#E6F1FB', badgeColor: '#185FA5', barColor: '#378ADD' },
  IRP: { type: 'TDF', icon: 'trending-up', iconColor: '#534AB7', badgeBg: '#EEEDFE', badgeColor: '#534AB7', barColor: '#534AB7' },
};
const productTypeMeta = (t: string | null | undefined): ProductTypeMeta =>
  PRODUCT_TYPE_META[t ?? ''] ?? PRODUCT_TYPE_META.STOCK;

// assetType → 흐름 kind 파생 (모으기 통장 종류로 판단)
const assetTypeToKind = (t: string | null | undefined): '일반' | 'IRP' | 'ISA' =>
  t === 'IRP' ? 'IRP' : t === 'ISA' ? 'ISA' : '일반';

// 모으기 후보 — 현금성 + 절세/투자 계좌
const HUB_ASSET_TYPES = new Set(['CHECKING', 'PARKING', 'SAVINGS', 'DEPOSIT', 'CMA', 'IRP', 'ISA', 'PENSION_SAVINGS', 'STOCK']);

// 상품 매수가 가능한 모을 통장 — 증권/ISA/IRP/연금저축. 그 외(예적금·파킹 등)는 '넣기'를 비움
const INVESTABLE_HUB_TYPES = new Set(['STOCK', 'ISA', 'IRP', 'PENSION_SAVINGS']);
const isInvestableHub = (t?: string | null): boolean => INVESTABLE_HUB_TYPES.has(t ?? '');

// 편집 모달의 lookup*과 호환되도록 API 응답을 catalog 형태로 동적 등록
const dynamicHubs = new Map<string, HubItem>();
const dynamicProducts = new Map<string, ProductItem>();
// 화면 매핑 시 손실되는 원본 API productType 보존 (handleProductPick에서 사용)
const productApiTypeById = new Map<string, string>();

const lookupHub = (id: string): HubItem =>
  dynamicHubs.get(id) ?? PLACEHOLDER_HUB;
const lookupProduct = (id: string): ProductItem =>
  dynamicProducts.get(id) ?? PLACEHOLDER_PRODUCT;

// API DTO → Flow (편집 모달에서 lookup 가능하도록 dynamic catalog도 채움)
function apiToFlow(dto: PortfolioFlow): Flow {
  const term = apiTermToFlowTerm(dto.term);
  const termRaw = dto.term ?? term;   // 표시용 원본 (장기1/장기2 등 그대로)
  const kind = assetTypeToKind(dto.gatheringAsset?.assetType);

  // hub 동적 등록 (보유 계좌면 asset_id, 계좌 추천이면 dyn id)
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
      // 추천이면 잔액 대신 금리 위주로 표시
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

  // 수익률/예상값 — API 신규 필드에서 (만원 단위로 변환)
  const rate = dto.expectedRrPct != null
    ? `${dto.expectedRrPct >= 0 ? '+' : ''}${dto.expectedRrPct}%`
    : '+0.0%';
  const projectedPeriod = dto.investmentMonths != null ? `${dto.investmentMonths}개월` : '1년';
  const projected = dto.expectedAmount != null
    ? `${Math.round(dto.expectedAmount / 10000)}만 원`
    : '-';

  return {
    id: dto.id,
    title: dto.title ?? '',
    summary: dto.summary ?? '',
    term, termRaw, kind, hubId,
    rate, projected, projectedPeriod,
    badgeBg: kind === 'IRP' ? '#F1F5F9' : kind === 'ISA' ? '#F8FAFC' : '#EEEDFE',
    badgeColor: kind === 'IRP' ? '#475569' : kind === 'ISA' ? '#64748B' : '#534AB7',
    amount: Math.round((dto.amount ?? 0) / 10000), // 원 → 만원
    hubAssetType: dto.gatheringAsset?.assetType ?? undefined,
    isRecommendation: dto.isRecommendation,
    accountComment: dto.accountComment ?? undefined,
    rrComment: dto.rrComment ?? undefined,
    // 증권/ISA/IRP/연금저축이 아니면 상품(넣기)은 비움
    products: isInvestableHub(dto.gatheringAsset?.assetType) ? products : [],
  };
}

// available-assets DTO → HubPickerModal 의 HubItem (모으기 통장 후보)
//   동시에 dynamicHubs 에도 등록해서 lookupHub 호환 유지
function assetToHubItem(a: AvailableAsset): HubItem {
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

// products DTO → ProductPickerModal 의 ProductItem
//   동시에 dynamicProducts 와 productApiTypeById 에도 등록해서 lookup/저장 호환 유지
function productToCatalogItem(p: Product): ProductItem {
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

// flow.id → 표시 라벨. termRaw(에이전트 원본)를 그대로 쓰되, 같은 라벨이 중복되면 번호 부여
//   예) 에이전트가 '장기1','장기2'를 주면 그대로 / 그냥 '장기'를 둘 주면 '장기1','장기2'로 자동 부여
function buildFlowTabLabels(flows: Flow[]): Record<string, string> {
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

// ─── 공통 서브컴포넌트 ─────────────────────────────

function Logo({ letter, bg, color, size = 20, imgSrc }: { letter: string; bg: string; color: string; size?: number; imgSrc?: string }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: imgSrc ? '#fff' : bg, color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.44, fontWeight: 500, flexShrink: 0, overflow: 'hidden',
      border: imgSrc ? '0.5px solid #e2e8f0' : 'none',
    }}>
      {imgSrc
        ? <img src={imgSrc} alt={letter} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
        : letter}
    </span>
  );
}


function Connector() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0' }}>
      <div style={{ width: 1, height: 10, background: '#e2e8f0' }} />
      <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
        <path d="M1 1l5 6 5-6" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function StepCard({ num, title, sub, children, action }: { num: number; title: string; sub: string; children: ReactNode; action?: ReactNode }) {
  const c = STEP_COLORS[num - 1];
  return (
    <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '14px 14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', background: c.bg, color: c.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{num}</span>
        <span style={{ fontSize: 15, fontWeight: 500, color: '#0f172a' }}>{title}</span>
        <span style={{ marginLeft: 'auto' }}>{action}</span>
      </div>
      <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px', paddingLeft: 28 }}>{sub}</p>
      <div>{children}</div>
    </div>
  );
}

function ProductIcon({ icon, color, size = 18 }: { icon: 'trending-up' | 'piggy-bank'; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {icon === 'trending-up' ? (
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      ) : (
        <>
          <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z" />
          <path d="M2 9v1c0 1.1.9 2 2 2h1" />
        </>
      )}
    </svg>
  );
}

// ─── 편집 모달 상태 ─────────────────────────────────

type EditorMode =
  | null
  | { type: 'hub-pick'; flowId: string }
  | { type: 'product-pick'; flowId: string; productIdx: number | 'new' };

const BAR_COLORS = ['#E24B4A', '#378ADD', '#534AB7', '#3B6D11', '#C45500', '#639922', '#0F6E56'];

// ─── 흐름 상세 (A/B/C/D) ─────────────────────────────

interface FlowDetailProps {
  flow: Flow;
  termLabel: string;
  onEdit: (mode: EditorMode) => void;
  onPct: (productIdx: number, pct: number) => void;
  onFlowAmount: (amount: number) => void;
  onRemoveProduct: (productIdx: number) => void;
}

function FlowDetail({ flow, termLabel, onEdit, onPct, onFlowAmount, onRemoveProduct }: FlowDetailProps) {
  const hub = lookupHub(flow.hubId);
  const total = flow.amount;   // 상품 비율 기준 = 모을 통장 월 납입 금액(만원)
  const investable = isInvestableHub(flow.hubAssetType);  // 증권/ISA/IRP/연금저축만 상품 매수 가능

  return (
    <div>
      {/* 흐름 헤더 */}
      <div style={{ marginBottom: 14, padding: '12px 14px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, background: TERM_STYLE[flow.term].bg, color: TERM_STYLE[flow.term].color, padding: '3px 8px', borderRadius: 99 }}>{termLabel}</span>
          {flow.kind !== '일반' && (
            <span style={{ fontSize: 10, background: flow.badgeBg, color: flow.badgeColor, padding: '3px 8px', borderRadius: 99, fontWeight: 700 }}>{flow.kind}</span>
          )}
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 3px', lineHeight: 1.35 }}>{flow.title}</p>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{flow.summary}</p>
      </div>

      {/* 1. 모으기 */}
      <StepCard
        num={1}
        title="모으기"
        sub={flow.kind === '일반' ? '여기에 한 번 모아둬요' : `${flow.kind} 계좌로 모아둬요`}
        action={
          <button
            onClick={() => onEdit({ type: 'hub-pick', flowId: flow.id })}
            style={{ fontSize: 11, fontWeight: 600, color: '#3182F6', background: '#EFF6FF', border: 'none', borderRadius: 99, padding: '4px 10px', cursor: 'pointer' }}
          >
            변경
          </button>
        }
      >
        {flow.isRecommendation && (
          <div style={{ marginBottom: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: '#3182F6', padding: '3px 8px', borderRadius: 99 }}>✨ 추천 계좌 (아직 미보유)</span>
          </div>
        )}
        <button
          onClick={() => onEdit({ type: 'hub-pick', flowId: flow.id })}
          style={{ width: '100%', cursor: 'pointer', background: hub.cardBg, border: `1px solid ${hub.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left', gap: 12 }}
        >
          <Logo letter={hub.logo} bg={hub.logoBg} color={hub.logoColor} size={36} imgSrc={hub.imgSrc} />
          <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: hub.nameColor }}>{hub.name}</div>
            <div style={{ fontSize: 10, color: hub.subColor, fontFamily: 'monospace', marginTop: 1 }}>{hub.number}</div>
            <div style={{ fontSize: 11, color: hub.subColor, marginTop: 2 }}>{hub.sub}</div>
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>월 납입 금액</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              value={flow.amount}
              onChange={(e) => onFlowAmount(Math.max(0, parseInt(e.target.value || '0', 10)))}
              style={{ width: 76, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#0f172a', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', outline: 'none' }}
            />
            <span style={{ fontSize: 12, color: '#64748b' }}>만 원</span>
          </div>
        </div>
        {flow.accountComment && (
          <p style={{ fontSize: 11, color: '#64748b', margin: '8px 2px 0', lineHeight: 1.5, textAlign: 'center' }}>💬 {flow.accountComment}</p>
        )}
      </StepCard>
      <Connector />

      {/* 2. 넣기 */}
      <StepCard
        num={2}
        title="넣기"
        sub={investable ? '상품을 탭하면 변경할 수 있어요' : '예·적금/파킹 통장은 상품 없이 그대로 모아요'}
        action={investable ? (
          <button
            onClick={() => onEdit({ type: 'product-pick', flowId: flow.id, productIdx: 'new' })}
            style={{ fontSize: 11, fontWeight: 600, color: '#3182F6', background: '#EFF6FF', border: 'none', borderRadius: 99, padding: '4px 10px', cursor: 'pointer' }}
          >
            + 상품 추가
          </button>
        ) : undefined}
      >
        {flow.products.length > 0 ? (
          <div style={{ display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
            {flow.products.map((p, i) => <div key={i} style={{ width: `${p.pct}%`, background: p.barColor }} />)}
          </div>
        ) : investable ? (
          <div style={{ padding: '10px 0 4px', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
            아직 담은 상품이 없어요. <span style={{ color: '#3182F6', fontWeight: 600 }}>+ 상품 추가</span>로 시작해보세요.
          </div>
        ) : (
          <div style={{ padding: '12px 0 4px', fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
            예·적금/파킹 통장은 상품 없이 그대로 모아요.<br />증권·ISA·IRP·연금저축 계좌일 때만 상품을 넣을 수 있어요.
          </div>
        )}
        {flow.products.map((p, i, arr) => {
          const prod = lookupProduct(p.productId);
          const amt = Math.round(total * p.pct / 100);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', gap: 8 }}>
              <button
                onClick={() => onEdit({ type: 'product-pick', flowId: flow.id, productIdx: i })}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', minWidth: 0, flex: 1, textAlign: 'left' }}
              >
                <ProductIcon icon={prod.icon} color={prod.iconColor} size={16} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, background: prod.badgeBg, color: prod.badgeColor, padding: '1px 6px', borderRadius: 99 }}>{prod.type}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', borderBottom: '1px dashed #cbd5e1' }}>{prod.name}</span>
                  </div>
                  {p.comment && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, lineHeight: 1.4, whiteSpace: 'normal' }}>{p.comment}</div>}
                </div>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  value={p.pct}
                  onChange={(e) => onPct(i, Math.max(0, Math.min(100, parseInt(e.target.value || '0', 10))))}
                  style={{ width: 44, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#0f172a', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 6px', outline: 'none' }}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>%</span>
                <input
                  type="number"
                  value={amt}
                  onChange={(e) => onPct(i, total > 0 ? Math.round(Math.max(0, parseInt(e.target.value || '0', 10)) / total * 100) : 0)}
                  style={{ width: 52, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#0f172a', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 6px', outline: 'none', marginLeft: 6 }}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>만</span>
                <button
                  onClick={() => onRemoveProduct(i)}
                  aria-label="상품 제거"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, marginLeft: 2 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </StepCard>
      <Connector />

      {/* 3. 불리기 */}
      <StepCard num={3} title="불리기" sub="이렇게 불어나요">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 7 }}>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 11, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>예상 수익률</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#3B6D11' }}>{flow.rate}</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 11, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>{flow.projectedPeriod} 후 예상</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a' }}>{flow.projected}</div>
          </div>
        </div>
        {flow.rrComment && (
          <p style={{ fontSize: 11, color: '#64748b', margin: '10px 2px 0', lineHeight: 1.5, textAlign: 'center' }}>💬 {flow.rrComment}</p>
        )}
      </StepCard>
    </div>
  );
}

// ─── 전체 한눈에 ─────────────────────────────

const parseRatePct = (s: string) => parseFloat(s.replace(/[^0-9.\-]/g, '')) || 0;

// 파스텔 톤
const PIE_TERM_COLORS: Record<FlowTerm, string> = { 단기: '#FECACA', 중기: '#FDE68A', 장기: '#BBF7D0' };

// 탭·배지 색상 (FlowTerm 기준 — 라벨에 숫자 붙어도 prefix로 매칭)
const TERM_COLORS: Record<string, { bg: string; text: string }> = {
  all: { bg: '#ffffff', text: '#0f172a' },
  단기: { bg: '#FECACA', text: '#991B1B' },
  중기: { bg: '#FDE68A', text: '#92400E' },
  장기: { bg: '#BBF7D0', text: '#166534' },
};

function PieChart({ data }: { data: { pct: number; color: string; label: string; amt: number }[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const cx = 50, cy = 50, R = 44, r = 21;

  const toXY = (pct: number, radius: number) => {
    const a = (pct / 100) * 2 * Math.PI - Math.PI / 2;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)] as const;
  };

  let cum = 0;
  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <svg width="72" height="72" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      {data.map((d, i) => {
        const start = cum;
        cum += d.pct;
        const [ox1, oy1] = toXY(start, R);
        const [ox2, oy2] = toXY(cum, R);
        const [ix2, iy2] = toXY(cum, r);
        const [ix1, iy1] = toXY(start, r);
        const large = d.pct > 50 ? 1 : 0;
        const path = `M ${ox1} ${oy1} A ${R} ${R} 0 ${large} 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z`;
        return (
          <path
            key={i}
            d={path}
            fill={d.color}
            opacity={hoveredIdx === null || hoveredIdx === i ? 1 : 0.3}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: 'default', transition: 'opacity 0.15s' }}
          />
        );
      })}
      {/* 도넛 중앙 원 */}
      <circle cx={cx} cy={cy} r={r} fill="white" />
      {/* 중앙 텍스트 — 호버 시 기간명 + % */}
      {hovered ? (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0f172a">{hovered.label}</text>
          <text x={cx} y={cy + 8} textAnchor="middle" fontSize="9" fontWeight="600" fill="#64748b">{hovered.pct.toFixed(0)}%</text>
        </>
      ) : null}
    </svg>
  );
}

function ProductBar({ products }: { products: FlowProduct[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const hoveredName = hoveredIdx !== null ? lookupProduct(products[hoveredIdx].productId).name : null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 4 }}>
        {products.map((p, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ width: `${p.pct}%`, background: p.barColor, cursor: 'default' }}
          />
        ))}
      </div>
      <div style={{ fontSize: 10, minHeight: 14, color: '#64748b' }}>
        {hoveredName && (
          <span style={{ background: '#f1f5f9', padding: '1px 7px', borderRadius: 4 }}>
            {hoveredName}
          </span>
        )}
      </div>
    </div>
  );
}

function AllOverview({ flows, flowLabels, monthlyInvestAmount, onSelectFlow }: { flows: Flow[]; flowLabels: Record<string, string>; monthlyInvestAmount: number; onSelectFlow: (id: string) => void }) {
  // 흐름 amount 합계 (수익률 가중평균/파이 계산용)
  const totalFlowAmount = flows.reduce((sum, f) => sum + f.amount, 0);
  // 투자액 가중 평균 수익률 — 각 플로우의 연 수익률을 흐름 비중으로 가중
  const weightedRate = totalFlowAmount > 0
    ? flows.reduce((sum, f) => sum + parseRatePct(f.rate) * f.amount, 0) / totalFlowAmount
    : 0;

  // 파이 차트 — 기간별 비중 (흐름 amount 기준)
  const termAmounts: Record<FlowTerm, number> = { 단기: 0, 중기: 0, 장기: 0 };
  flows.forEach(f => { termAmounts[f.term] += f.amount; });
  const pieData = (['단기', '중기', '장기'] as FlowTerm[])
    .filter(t => termAmounts[t] > 0)
    .map(t => ({ pct: totalFlowAmount > 0 ? (termAmounts[t] / totalFlowAmount) * 100 : 0, color: PIE_TERM_COLORS[t], label: t, amt: termAmounts[t] }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* 요약 카드 */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PieChart data={pieData} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 72 }}>
            {/* 통계: 2열 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 1 }}>월 총 투자액</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{monthlyInvestAmount}만 원</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 1 }}>예상 1년 수익</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', lineHeight: 1.2 }}>+{weightedRate.toFixed(1)}%</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#16a34a' }}>약 {Math.round(monthlyInvestAmount * weightedRate / 100)}만 원</div>
              </div>
            </div>
            {/* 범례 */}
            <div style={{ display: 'flex', gap: 8 }}>
              {pieData.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 흐름 카드 목록 */}
      {flows.map(f => {
        const hub = lookupHub(f.hubId);
        const termLabel = flowLabels[f.id] ?? f.term;
        const tc = TERM_COLORS[f.term] ?? TERM_COLORS.all;
        return (
          <button
            key={f.id}
            onClick={() => onSelectFlow(f.id)}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 16, padding: '12px 14px' }}
          >
            {/* Row 1: 기간 배지 + kind 배지 | 자세히 보기 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: tc.bg, color: tc.text, padding: '3px 9px', borderRadius: 99 }}>
                  {termLabel}
                </span>
                {f.kind !== '일반' && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: f.badgeBg, color: f.badgeColor, padding: '2px 7px', borderRadius: 99 }}>
                    {f.kind}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>자세히 보기 ›</span>
            </div>

            {/* Row 2: 소스 → 허브 | 월 금액 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Logo letter={hub.logo} bg={hub.logoBg} color={hub.logoColor} size={20} imgSrc={hub.imgSrc} />
                <span style={{ fontSize: 11, color: '#64748b' }}>{hub.hubLabel}</span>
                {f.isRecommendation && (
                  <span style={{ fontSize: 9, fontWeight: 700, background: '#EFF6FF', color: '#3182F6', padding: '1px 6px', borderRadius: 99 }}>추천</span>
                )}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>월 {f.amount}만 원</span>
            </div>

            {/* Row 3: 상품 바 */}
            <ProductBar products={f.products} />

            {/* Row 4: 수익률 | 기간 후 금액 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>{f.rate}</span>
              <span style={{ fontSize: 10, color: '#cbd5e1' }}>·</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {f.projectedPeriod} 후 <strong style={{ color: '#0f172a' }}>{f.projected}</strong>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── 모달들 ─────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 360, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{title}</h3>
          <button onClick={onClose} aria-label="닫기" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function HubPickerModal({ catalog, currentId, onClose, onPick }: { catalog: HubItem[]; currentId: string; onClose: () => void; onPick: (h: HubItem) => void }) {
  const [filter, setFilter] = useState<'전체' | '일반' | 'IRP' | 'ISA'>('전체');
  const filtered = filter === '전체' ? catalog : catalog.filter(h => h.kind === filter);
  return (
    <ModalShell title="모으는 계좌 선택" onClose={onClose}>
      <div style={{ padding: '10px 14px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {(['전체', '일반', 'IRP', 'ISA'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                border: 'none', cursor: 'pointer',
                background: filter === f ? '#0f172a' : '#f1f5f9',
                color: filter === f ? '#fff' : '#64748b',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 14px 14px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(h => {
            const isCurrent = h.id === currentId;
            return (
              <button
                key={h.id}
                onClick={() => onPick(h)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: isCurrent ? '#EFF6FF' : '#fff',
                  border: `1.5px solid ${isCurrent ? '#3182F6' : '#e2e8f0'}`,
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <Logo letter={h.logo} bg={h.logoBg} color={h.logoColor} size={36} imgSrc={h.imgSrc} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{h.name}</span>
                    {h.kind !== '일반' && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 99 }}>{h.kind}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginTop: 1 }}>{h.number}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{h.sub}</div>
                </div>
                {isCurrent && <span style={{ fontSize: 11, color: '#3182F6', fontWeight: 700 }}>현재</span>}
              </button>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}

function ProductPickerModal({ catalog, currentId, mode, onClose, onPick }: { catalog: ProductItem[]; currentId?: string; mode: 'add' | 'replace'; onClose: () => void; onPick: (p: ProductItem) => void }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'전체' | ProductItem['type']>('전체');
  const [selected, setSelected] = useState<ProductItem | null>(currentId ? lookupProduct(currentId) : null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter(p => {
      if (typeFilter !== '전체' && p.type !== typeFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
    });
  }, [catalog, query, typeFilter]);

  const recommended = filtered.filter(p => p.recommended);
  const others = filtered.filter(p => !p.recommended);

  const renderItem = (p: ProductItem) => {
    const isSelected = selected?.id === p.id;
    return (
      <button
        key={p.id}
        onClick={() => setSelected(p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          background: isSelected ? '#EFF6FF' : '#fff',
          border: `1.5px solid ${isSelected ? '#3182F6' : '#e2e8f0'}`,
          borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
        }}
      >
        <ProductIcon icon={p.icon} color={p.iconColor} size={20} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: p.badgeBg, color: p.badgeColor, padding: '1px 6px', borderRadius: 99 }}>{p.type}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
          </div>
        </div>
        {p.id === currentId && <span style={{ fontSize: 11, color: '#3182F6', fontWeight: 700 }}>현재</span>}
      </button>
    );
  };

  return (
    <ModalShell title="상품 선택" onClose={onClose}>
      <div style={{ padding: '10px 14px 0' }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="상품명·유형·설명으로 검색"
            style={{
              width: '100%', padding: '9px 12px 9px 32px', fontSize: 12, borderRadius: 10,
              border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          {(['전체', 'ETF', 'TDF', '채권', '리츠', '주식'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                border: 'none', cursor: 'pointer',
                background: typeFilter === t ? '#0f172a' : '#f1f5f9',
                color: typeFilter === t ? '#fff' : '#64748b',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
        {recommended.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <span style={{ fontSize: 12 }}>⭐</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>추천 상품</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recommended.map(renderItem)}
            </div>
          </div>
        )}
        {others.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>전체 상품</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {others.map(renderItem)}
            </div>
          </div>
        )}
        {filtered.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            검색 결과가 없어요
          </div>
        )}
      </div>

      {/* 선택된 상품 상세 + 확정 버튼 */}
      {selected && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: 14, background: '#f8fafc' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>선택한 상품</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: selected.badgeBg, color: selected.badgeColor, padding: '1px 6px', borderRadius: 99 }}>{selected.type}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{selected.name}</span>
            {selected.recommended && <span style={{ fontSize: 11 }}>⭐</span>}
          </div>
          <p style={{ fontSize: 11, color: '#475569', margin: '0 0 10px', lineHeight: 1.5 }}>{selected.description}</p>
          <button
            onClick={() => onPick(selected)}
            style={{
              width: '100%', padding: '11px 0', fontSize: 13, fontWeight: 700,
              background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
            }}
          >
            {mode === 'add' ? '이 상품 추가하기' : '이 상품으로 변경'}
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────

export default function AssetPortfolio() {
  const { userName: USER_NAME } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // 햄버거 → '포트폴리오 재설정' 으로 진입한 경우만 'edit' — 헤더 문구가 달라짐
  const isEditMode = (location.state as { mode?: string } | null)?.mode === 'edit';
  const [termTab, setTermTab] = useState<TermTab>('all');        // 'all' 또는 flow.id
  const [detailFlowId, setDetailFlowId] = useState<string | null>(null);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [monthlyInvestAmount, setMonthlyInvestAmount] = useState<number>(0);   // 만원 단위
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [productCatalog, setProductCatalog] = useState<ProductItem[]>([]);
  const [editor, setEditor] = useState<EditorMode>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // API 병렬: 흐름 / 통장 후보 / 상품 카탈로그
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getPortfolioFlows(), getAvailableAssets(), getProducts()])
      .then(([flowsRes, assetsRes, productsRes]) => {
        if (cancelled) return;
        setFlows(flowsRes.flows.map(apiToFlow));
        setMonthlyInvestAmount(Math.round((flowsRes.monthlyInvestAmount ?? 0) / 10000));
        setAvailableAssets(assetsRes.assets);
        // dynamicHubs/Products 캐시 미리 채워두기 (lookup 호환)
        assetsRes.assets.forEach(assetToHubItem);
        setProductCatalog(productsRes.products.map(productToCatalogItem));
      })
      .catch(e => {
        if (cancelled) return;
        console.error('포트폴리오 조회 실패:', e);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // flow.id → 탭 라벨 (단기/단기1/단기2 …)
  const flowLabels = useMemo(() => buildFlowTabLabels(flows), [flows]);

  // 동적 탭: 전체 + 각 흐름
  const tabs = useMemo<{ key: TermTab; label: string }[]>(() => [
    { key: 'all', label: '전체' },
    ...flows.map(f => ({ key: f.id, label: flowLabels[f.id] ?? f.term })),
  ], [flows, flowLabels]);

  const updateFlow = (id: string, patch: (prev: Flow) => Flow) => {
    setFlows(prev => prev.map(f => f.id === id ? patch(f) : f));
  };

  const handlePct = (id: string, productIdx: number, pct: number) => {
    updateFlow(id, f => ({ ...f, products: f.products.map((p, i) => i === productIdx ? { ...p, pct } : p) }));
  };

  const handleFlowAmount = (id: string, amount: number) => {
    updateFlow(id, f => ({ ...f, amount }));
  };

  const handleHubPick = (h: HubItem) => {
    if (!editor || editor.type !== 'hub-pick') return;
    const investable = isInvestableHub(h.sub);  // 모으기 후보의 sub = 원본 assetType
    updateFlow(editor.flowId, f => ({
      ...f,
      hubId: h.id,
      kind: h.kind,
      hubAssetType: h.sub,
      products: investable ? f.products : [],  // 비투자 계좌면 상품 비움
    }));
    setEditor(null);
  };

  const handleProductPick = (p: ProductItem) => {
    if (!editor || editor.type !== 'product-pick') return;
    const { flowId, productIdx } = editor;
    const apiType = productApiTypeById.get(p.id) ?? 'STOCK';
    updateFlow(flowId, f => {
      if (productIdx === 'new') {
        const barColor = BAR_COLORS[f.products.length % BAR_COLORS.length];
        return { ...f, products: [...f.products, { productId: p.id, pct: 0, barColor, productType: apiType }] };
      }
      return {
        ...f,
        products: f.products.map((prod, i) => i === productIdx ? { ...prod, productId: p.id, productType: apiType } : prod),
      };
    });
    setEditor(null);
  };

  const handleRemoveProduct = (id: string, productIdx: number) => {
    updateFlow(id, f => ({ ...f, products: f.products.filter((_, i) => i !== productIdx) }));
  };

  // "관리 시작하기" — 모든 흐름 일괄 PATCH 후 대시보드로
  const buildRequest = (f: Flow): PortfolioFlowUpdateRequest => ({
    amount: f.amount * 10000,  // 만원 → 원
    // 추천(dyn) 허브는 실제 계좌가 아니므로 null → 백엔드가 기존 추천 통장 정보 유지
    gatheringAssetId: f.hubId && !f.hubId.startsWith('dyn-') ? f.hubId : null,
    products: f.products.map(p => ({
      productId: p.productId.startsWith('dyn-') ? null : p.productId,
      productType: p.productType,
      productRatio: p.pct,
      assetId: null,
    })),
  });

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updatedList = await Promise.all(
        flows.map(f => updatePortfolioFlow(f.id, buildRequest(f))),
      );
      setFlows(updatedList.map(apiToFlow));
      navigate('/dashboard');
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장 실패');
      setSaving(false);
    }
  };

  // 활성 흐름: 탭에서 흐름 선택했으면 그 흐름, 아니면 카드 클릭으로 들어간 detailFlowId
  const activeFlowId = termTab !== 'all' ? termTab : detailFlowId;
  const activeFlow = activeFlowId ? flows.find(f => f.id === activeFlowId) ?? null : null;
  const showDetail = activeFlow != null;

  // 편집 모달에서 참조할 flow
  const editorFlow = editor && 'flowId' in editor ? flows.find(f => f.id === editor.flowId) ?? null : null;

  // 현재 모든 흐름에서 사용 중인 모으기 통장 id 집합
  const usedAssetIds = useMemo(() => {
    const s = new Set<string>();
    flows.forEach(f => {
      if (f.hubId) s.add(f.hubId);
    });
    return s;
  }, [flows]);

  // 변경 중인 자기 자신은 후보에서 빼지 말고 그대로 보여주기 위한 예외 id
  const exceptionAssetId: string | null = useMemo(() => {
    if (!editor || !editorFlow) return null;
    if (editor.type === 'hub-pick') {
      return editorFlow.hubId || null;
    }
    return null;
  }, [editor, editorFlow]);

  // 모달용 동적 카탈로그 — hubCatalog(모으기): 통장 + 절세 계좌 (STOCK 제외)
  //   이미 다른 곳에서 쓰이는 통장은 제외, 단 변경 중인 자기 자신은 예외로 포함
  const hubCatalog = useMemo(() =>
    availableAssets
      .filter(a => HUB_ASSET_TYPES.has(a.assetType ?? ''))
      .filter(a => !usedAssetIds.has(a.id) || a.id === exceptionAssetId)
      .map(assetToHubItem),
    [availableAssets, usedAssetIds, exceptionAssetId]);

  const handleBack = () => {
    if (termTab !== 'all') setTermTab('all');
    else if (detailFlowId) setDetailFlowId(null);
    else navigate(-1);
  };

  // 로딩 / 에러 / 빈 상태
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0f172a', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }
  if (flows.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#f8fafc', fontFamily: "'Pretendard', sans-serif" }}>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>아직 만들어진 포트폴리오 흐름이 없어요.</p>
        <button onClick={() => navigate(-1)} style={{ fontSize: 12, fontWeight: 600, padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>뒤로가기</button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Pretendard', sans-serif", background: '#f8fafc', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '0 0 48px' }}>
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      <div style={{ width: '100%', maxWidth: 390 }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '16px 16px 0' }}>
          <button
            onClick={handleBack}
            style={{ position: 'absolute', left: 16, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b', display: 'flex', alignItems: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {isEditMode ? '포트폴리오 재설정' : '투자 가이드'}
          </h1>
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          {!showDetail && (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', lineHeight: 1.4, margin: 0 }}>
                {isEditMode
                  ? <>흐름과 상품 구성을<br />원하는 대로 수정해보세요</>
                  : <>{USER_NAME}님의 자산<br />이렇게 설계되었어요</>}
              </p>
              <img src={pillImg} alt={isEditMode ? '재설정' : '처방전'} style={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0, marginTop: -24 }} />
            </div>
          )}

          {/* 탭 — 상세 뷰일 때 숨김 */}
          {!showDetail && (
            <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 14, marginBottom: 16, gap: 2 }}>
              {tabs.map(({ key, label }) => {
                const isActive = termTab === key;
                const flowOfTab = key === 'all' ? null : flows.find(f => f.id === key);
                const c = flowOfTab ? (TERM_COLORS[flowOfTab.term] ?? TERM_COLORS.all) : TERM_COLORS.all;
                return (
                  <button
                    key={key}
                    onClick={() => { setTermTab(key); setDetailFlowId(null); }}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700, transition: 'all .15s',
                      background: key === 'all'
                        ? (isActive ? '#fff' : 'transparent')
                        : (isActive ? c.bg : 'transparent'),
                      color: key === 'all'
                        ? (isActive ? '#0f172a' : '#94a3b8')
                        : (isActive ? c.text : '#b0b8c4'),
                      boxShadow: isActive ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 개요 — 전체 탭에서 상세 미선택 */}
          {!showDetail && (
            <AllOverview flows={flows} flowLabels={flowLabels} monthlyInvestAmount={monthlyInvestAmount} onSelectFlow={setDetailFlowId} />
          )}

          {/* 상세 — 탭 직접 진입 or 카드 클릭 진입 */}
          {showDetail && activeFlow && (
            <FlowDetail
              flow={activeFlow}
              termLabel={flowLabels[activeFlow.id] ?? activeFlow.term}
              onEdit={setEditor}
              onPct={(idx, pct) => handlePct(activeFlow.id, idx, pct)}
              onFlowAmount={(amt) => handleFlowAmount(activeFlow.id, amt)}
              onRemoveProduct={(idx) => handleRemoveProduct(activeFlow.id, idx)}
            />
          )}

          {/* 하단 버튼 — overview일 때만 (모든 흐름 일괄 저장 후 대시보드 이동) */}
          {!showDetail && (
            <div style={{ marginTop: 24 }}>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                style={{
                  width: '100%', padding: '16px 0', fontSize: 15, fontWeight: 700,
                  background: saving ? '#94a3b8' : '#3182F6', color: '#fff',
                  border: 'none', borderRadius: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(49,130,246,0.2)',
                }}
              >
                {saving ? '저장 중…' : '관리 시작하기'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 편집 모달들 */}
      {editor?.type === 'hub-pick' && editorFlow && (
        <HubPickerModal
          catalog={hubCatalog}
          currentId={editorFlow.hubId}
          onClose={() => setEditor(null)}
          onPick={handleHubPick}
        />
      )}
      {editor?.type === 'product-pick' && (
        <ProductPickerModal
          catalog={productCatalog.filter(p => p.type !== '적금')}
          mode={editor.productIdx === 'new' ? 'add' : 'replace'}
          currentId={editor.productIdx === 'new' ? undefined : editorFlow?.products[editor.productIdx]?.productId}
          onClose={() => setEditor(null)}
          onPick={handleProductPick}
        />
      )}
    </div>
  );
}
