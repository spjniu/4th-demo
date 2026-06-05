import { api } from './client';
import type { CommonResponse } from './userApi';

export interface Product {
  id: string;
  productType: string | null;   // SAVING / DEPOSIT / STOCK / BOND / IRP
  institution: string | null;
  name: string | null;
  interestRate: number | null;
  description: string | null;
}

export interface ProductListResponse {
  products: Product[];
}

/**
 * GET /products — 전체 상품 카탈로그 (soft delete 제외)
 */
export async function getProducts(): Promise<ProductListResponse> {
  const res = await api.get<CommonResponse>('/products');
  if (!res.success) {
    throw new Error(res.message || '상품 조회 중 오류가 발생했습니다.');
  }
  return res.data as ProductListResponse;
}
