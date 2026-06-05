import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type ReactNode } from 'react';

type PageLayoutProps = {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  children: ReactNode;
};

// 페이지 기본 레이아웃. 그라데이션 배경 + 상단 뒤로가기 버튼 + 타이틀 영역
// 사용 예시는 src/screens/_TEMPLATE.tsx 참고
export default function PageLayout({
  title,
  subtitle,
  showBackButton = true,
  onBack,
  children,
}: PageLayoutProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-blue-900 to-gray-900 h-screen overflow-hidden flex flex-col font-sans border shadow-xl relative text-white">
      <div className="px-6 py-8 animate-in slide-in-from-right duration-300 flex-1 flex flex-col">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition mb-6 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {title && <h2 className="text-3xl font-bold mb-2">{title}</h2>}
        {subtitle && <p className="text-blue-200 text-sm mb-10">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
