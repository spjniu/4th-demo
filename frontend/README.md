# Frontend

WooriPort 프론트엔드. React + Vite + TypeScript + Tailwind.

---

## 빠른 시작

```bash
docker compose run --rm frontend npm install
docker compose up -d
```

- 접속: http://localhost:5173/
- 백엔드: http://localhost:8080/api/v1 ([src/api/client.ts](src/api/client.ts)의 `BASE_URL` 참고)

> 처음 실행할 때만 `npm install`이 필요해요. 이후엔 `docker compose up -d`만 하면 돼요.

---

## 폴더 구조

```
src/
├── api/                    # 백엔드 API 호출 레이어
│   ├── client.ts           # ⭐ JWT 자동 첨부 fetch wrapper (모든 API는 이걸 통해 호출)
│   ├── authApi.ts          # 인증 (login, signup)
│   ├── transferApi.ts      # 이체 관련 (미연동)
│   └── reportApi.ts        # 리포트 관련 (미연동)
├── contexts/               # 전역 상태 (Context API)
│   └── AuthContext.tsx     # ⭐ 인증 상태 (token, login, logout)
├── components/             # 재사용 UI
│   ├── common/             # 공통 (Spinner 등)
│   └── layout/             # 레이아웃 (PageLayout 등)
├── hooks/                  # 커스텀 훅
├── screens/                # 페이지 컴포넌트
│   ├── _TEMPLATE.tsx       # ⭐ 새 페이지 만들 때 복사할 템플릿
│   ├── Login.tsx
│   ├── Welcome.tsx
│   └── ...
├── utils/                  # 헬퍼 함수
├── data/                   # mock 데이터
├── App.jsx                 # 라우트 정의
└── main.jsx                # 진입점 (Provider 등 글로벌 wrapper)
```

---

## 새 페이지 만들기 (3단계)

### 1. 템플릿 복사

[src/screens/\_TEMPLATE.tsx](src/screens/_TEMPLATE.tsx)를 같은 폴더에 새 이름으로 복사.

```bash
cp src/screens/_TEMPLATE.tsx src/screens/Profile.tsx
```

내부의 컴포넌트 이름과 텍스트 수정.

### 2. 라우트 등록

[src/App.jsx](src/App.jsx)의 `MainApp` 또는 인증 `Routes`에 추가:

```jsx
import Profile from './screens/Profile';

// MainApp 안에
<Route path="/profile" element={<Profile />} />
```

### 3. 화면에서 이동

```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/profile');
```

---

## API 호출 패턴

**모든 API는 [src/api/client.ts](src/api/client.ts)의 `api` 객체를 통해 호출하세요.** JWT 토큰이 자동으로 헤더에 첨부되고, 401 응답 시 자동 로그아웃됩니다.

### 인증이 필요한 API (기본)

```ts
// src/api/userApi.ts
import { api } from './client';

type Profile = { id: string; email: string; name: string };

export async function getProfile(): Promise<Profile> {
  const body = await api.get<{ data: Profile }>('/users/me');
  return body.data;
}
```

### 인증 불필요 (login, signup 등)

```ts
await api.post('/auth/login', { email, password }, { auth: false });
```

### 에러 처리

```ts
import { ApiError } from './client';

try {
  await api.post('/foo', payload);
} catch (err) {
  if (err instanceof ApiError && err.status === 409) {
    // 충돌 처리
  }
  throw err;
}
```

### 페이지에서 사용

```tsx
import { useEffect, useState } from 'react';
import { getProfile } from '../api/userApi';

const [profile, setProfile] = useState(null);

useEffect(() => {
  getProfile().then(setProfile);
}, []);
```

---

## 인증 흐름

```
브라우저 접속
    ↓
AuthContext가 localStorage의 'token' 읽음
    ↓
토큰 있음 ─→ MainApp 렌더
토큰 없음 ─→ /, /login, /signup만 접근 가능
    ↓
로그인 성공 → useAuth().login(token) 호출 → 자동으로 MainApp으로 전환
    ↓
401 응답 → client.ts에서 dispatch한 'auth:logout' 이벤트
        → AuthContext가 받아서 자동 로그아웃 → 인증 페이지로 복귀
```

### 컴포넌트에서 인증 정보 쓰기

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyPage() {
  const { token, isAuthenticated, login, logout } = useAuth();
  // token: 현재 JWT (null이면 미인증)
  // isAuthenticated: boolean
  // login(newToken): 토큰 저장 + 상태 갱신
  // logout(): 토큰 제거 + 상태 갱신
}
```

---

## 전역 상태 추가하기

인증처럼 여러 페이지에서 공유하는 상태가 생기면 Context로 분리하세요. [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)를 참고해서 같은 패턴으로 작성.

```tsx
// src/contexts/GoalsContext.tsx
const GoalsContext = createContext<GoalsContextValue | null>(null);

export function GoalsProvider({ children }) {
  const [goals, setGoals] = useState([]);
  // ...
  return <GoalsContext.Provider value={...}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals는 GoalsProvider 안에서만 사용 가능');
  return ctx;
}
```

[src/main.jsx](src/main.jsx)에서 `<GoalsProvider>`로 감싸기.

---

## 코드 작성 컨벤션

| 항목 | 규칙 |
|---|---|
| 페이지 컴포넌트 | `src/screens/`, PascalCase `.tsx` (예: `Profile.tsx`) |
| API 모듈 | `src/api/`, 도메인별 분리 (예: `userApi.ts`) |
| Context | `src/contexts/`, `FooContext.tsx` + `useFoo` hook export |
| 공통 UI | `src/components/common/` 또는 `layout/` |
| 커스텀 훅 | `src/hooks/`, `useFoo.ts` |
| 페이지 이동 | `useNavigate` (props로 setAppState 같은 거 받지 말 것) |
| API 호출 | `src/api/client.ts`의 `api` 객체 사용 (직접 fetch 금지) |
| 인증 상태 | `useAuth()` (localStorage 직접 접근 금지) |

---

## 트러블슈팅

### Vite가 파일 변경을 감지 못 함
- [vite.config.js](vite.config.js)에 `usePolling: true` 설정되어 있음
- 그래도 안 되면 `docker compose restart frontend`

### IDE에서 "모듈을 찾을 수 없습니다" 에러
- 호스트에 `node_modules`가 없는 경우. 다음 실행:
  ```bash
  docker compose run --rm frontend npm install
  ```

### 패키지 추가
```bash
docker compose exec frontend npm install <package-name>
```
- 컨테이너 내부에 설치 → bind mount로 호스트에도 반영됨

### 401 에러가 자동 처리 안 됨
- API 호출 시 `src/api/client.ts`의 `api` 객체를 썼는지 확인
- 직접 `fetch()` 쓰면 자동 처리 안 됨
