-- ============================================================
-- taehyung_seed.sql — 서태형 계정 통합 테스트용 시드 (멱등, 원샷)
--
-- 계정:  이름: 서태형 / 이메일: taehyung@wooriport.com / 비번: Test1234!
--
-- 실행 순서:
--   1) 프론트에서 회원가입 (이름/이메일/비번 위와 동일)
--   2) 이 SQL 실행 → dummy_mydata 적재 + 이미 계좌가 있으면 transactions까지 한 번에 들어감
--   3) 프론트 /linking → 모든 계좌 선택 → /salary-select → 우리은행 급여통장 지정
--   4) 이 SQL 다시 실행 → transactions + tax_benefit 적재 (멱등)
--   5) /porti-survey → /asset-prescription → /dashboard 순서로 테스트
--
-- 실행 명령 (PowerShell):
--   $sql = [System.IO.File]::ReadAllText("C:\ITstudy\final_project\4th-demo\backend\sql\taehyung_seed.sql", [System.Text.Encoding]::UTF8); $sql | docker exec -i wooriport-db psql -U wooriport -d wooriport
-- ============================================================


SET client_encoding = 'UTF8';

-- ============================================================
-- PART 0. 글로벌 상품 카탈로그
-- ============================================================
INSERT INTO products (id, product_type, institution, name, ticker, interest_rate, description, updated_at, created_at) VALUES
    ('bb111111-1111-1111-1111-111111111111', 'ETF',             'KODEX',    'KODEX 200',        '069500.KS', 2.9,  'KOSPI200 추종 ETF',       NOW(), NOW()),
    ('bb222222-2222-2222-2222-222222222222', 'BOND',            '삼성자산', '국채 3년',          '148070.KS', -1.1, '국채 3년물 ETF',           NOW(), NOW()),
    ('bb333333-3333-3333-3333-333333333333', 'DEPOSIT',         '우리은행', 'WON 정기예금',      NULL,        3.50, '12개월 만기 정기예금',      NOW(), NOW()),
    ('bb444444-4444-4444-4444-444444444444', 'SAVING',          '카카오뱅크','26주 적금',        NULL,        7.00, '매주 늘려 모으는 단기 적금', NOW(), NOW()),
    ('bb555555-5555-5555-5555-555555555555', 'STOCK',           '미래에셋', 'TIGER 미국S&P500',  '360750.KS', 10.50,'미국 S&P500 추종 ETF',    NOW(), NOW()),
    ('bb666666-6666-6666-6666-666666666666', 'IRP',             '미래에셋', '미래에셋 TDF2045',  NULL,        6.20, '은퇴시점 자동배분 IRP',    NOW(), NOW()),
    ('bb777777-7777-7777-7777-777777777777', 'SAVING',          '토스뱅크', '토스 자유적금',     NULL,        4.50, '자유 입금 가능한 적금',     NOW(), NOW())
ON CONFLICT (id) DO UPDATE
    SET ticker        = EXCLUDED.ticker,
        interest_rate = EXCLUDED.interest_rate,
        updated_at    = EXCLUDED.updated_at;


-- ============================================================
-- PART 1. dummy_mydata — Linking 화면 연동 대상 계좌
--   회원가입 전에 실행해도 무방 (email 기반 매핑)
-- ============================================================
DELETE FROM dummy_mydata WHERE email = 'taehyung@wooriport.com';

INSERT INTO dummy_mydata
    (email, institution, asset_type, account_name, account_purpose, asset_number, balance, bank_type, is_salary)
VALUES
    ('taehyung@wooriport.com', '우리은행',   'CHECKING',    '우리 WON 급여통장',   '생활비', '1002-222-222222',     3500000, 'WOORI', false),
    ('taehyung@wooriport.com', '토스뱅크',   'PARKING',     '토스 파킹통장',       '현금성', '4444-33-333333',      2500000, 'OTHER', false),
    ('taehyung@wooriport.com', '카카오뱅크', 'SAVINGS',     '카뱅 26주 적금',      '적금',   '3333-44-444444',      1800000, 'OTHER', false),
    ('taehyung@wooriport.com', '우리은행',   'STOCK',       'TIGER 미국S&P500',    '투자',   '5555-55-555555',      5000000, 'WOORI', false),
    ('taehyung@wooriport.com', '미래에셋',   'IRP',         '미래에셋 IRP',        '투자',   '6666-66-666666',      2000000, 'OTHER', false),
    ('taehyung@wooriport.com', '우리카드',   'CREDIT_CARD', '우리 카드의정석',     '카드',   '5570-2222-3333-4444', 0,       'WOORI', false);


-- ============================================================
-- PART 2. 사용자 기본 정보 설정 (회원가입 후에만 적용됨, 없으면 no-op)
-- ============================================================
UPDATE users
SET salary                = 5500000,
    salary_date           = 25,
    monthly_invest_amount = 1000000
WHERE email = 'taehyung@wooriport.com';


-- ============================================================
-- PART 3. transactions — Linking + SalarySelect 완료 후 적재
--   assets가 없으면 INSERT ... SELECT 0건 → 오류 없이 스킵
--   멱등: 재실행 시 DELETE → 재삽입
-- ============================================================
DELETE FROM transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'taehyung@wooriport.com');

-- 급여 (3개월치)
INSERT INTO transactions (id, user_id, asset_id, amount, category, sender_name, transaction_at)
SELECT gen_random_uuid(), u.id, a.id, 5500000, '급여', '우리포트(주)',
       date_trunc('month', NOW()) - INTERVAL '2 month' + INTERVAL '24 day'
FROM users u
JOIN assets a ON a.user_id = u.id AND a.is_salary = TRUE AND a.deleted_at IS NULL
WHERE u.email = 'taehyung@wooriport.com';

INSERT INTO transactions (id, user_id, asset_id, amount, category, sender_name, transaction_at)
SELECT gen_random_uuid(), u.id, a.id, 5500000, '급여', '우리포트(주)',
       date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '24 day'
FROM users u
JOIN assets a ON a.user_id = u.id AND a.is_salary = TRUE AND a.deleted_at IS NULL
WHERE u.email = 'taehyung@wooriport.com';

INSERT INTO transactions (id, user_id, asset_id, amount, category, sender_name, transaction_at)
SELECT gen_random_uuid(), u.id, a.id, 5500000, '급여', '우리포트(주)',
       date_trunc('month', NOW()) + INTERVAL '24 day'
FROM users u
JOIN assets a ON a.user_id = u.id AND a.is_salary = TRUE AND a.deleted_at IS NULL
WHERE u.email = 'taehyung@wooriport.com';

-- 변동지출 이번 달
INSERT INTO transactions (id, user_id, asset_id, amount, category, sender_name, transaction_at)
SELECT gen_random_uuid(), u.id, a.id, v.amount, v.category, v.sender, v.txn_at
FROM users u
JOIN assets a ON a.user_id = u.id AND a.is_salary = TRUE AND a.deleted_at IS NULL
CROSS JOIN (VALUES
    (-480000::bigint, '식비',       '배달의민족',   date_trunc('month', NOW()) + INTERVAL '2 day'),
    (-160000::bigint, '식비',       '쿠팡이츠',     date_trunc('month', NOW()) + INTERVAL '5 day'),
    (-130000::bigint, '카페',       '스타벅스',     date_trunc('month', NOW()) + INTERVAL '7 day'),
    (-220000::bigint, '문화/여가',  'CGV',          date_trunc('month', NOW()) + INTERVAL '9 day'),
    (-290000::bigint, '온라인쇼핑', '쿠팡',         date_trunc('month', NOW()) + INTERVAL '3 day'),
    (-72000::bigint,  '교통',       '카카오T',      date_trunc('month', NOW()) + INTERVAL '4 day'),
    (-38000::bigint,  '교통',       '티머니',       date_trunc('month', NOW()) + INTERVAL '11 day')
) AS v(amount, category, sender, txn_at)
WHERE u.email = 'taehyung@wooriport.com';

-- 변동지출 1개월 전
INSERT INTO transactions (id, user_id, asset_id, amount, category, sender_name, transaction_at)
SELECT gen_random_uuid(), u.id, a.id, v.amount, v.category, v.sender, v.txn_at
FROM users u
JOIN assets a ON a.user_id = u.id AND a.is_salary = TRUE AND a.deleted_at IS NULL
CROSS JOIN (VALUES
    (-450000::bigint, '식비',       '배달의민족',   date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '2 day'),
    (-140000::bigint, '카페',       '투썸플레이스', date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '6 day'),
    (-190000::bigint, '문화/여가',  '인터파크',     date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '10 day'),
    (-320000::bigint, '온라인쇼핑', '쿠팡',         date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '13 day'),
    (-85000::bigint,  '교통',       '카카오T',      date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '15 day')
) AS v(amount, category, sender, txn_at)
WHERE u.email = 'taehyung@wooriport.com';

-- 변동지출 2개월 전
INSERT INTO transactions (id, user_id, asset_id, amount, category, sender_name, transaction_at)
SELECT gen_random_uuid(), u.id, a.id, v.amount, v.category, v.sender, v.txn_at
FROM users u
JOIN assets a ON a.user_id = u.id AND a.is_salary = TRUE AND a.deleted_at IS NULL
CROSS JOIN (VALUES
    (-410000::bigint, '식비',       '쿠팡이츠',  date_trunc('month', NOW()) - INTERVAL '2 month' + INTERVAL '3 day'),
    (-120000::bigint, '카페',       '스타벅스',  date_trunc('month', NOW()) - INTERVAL '2 month' + INTERVAL '7 day'),
    (-250000::bigint, '문화/여가',  'YES24',     date_trunc('month', NOW()) - INTERVAL '2 month' + INTERVAL '11 day'),
    (-270000::bigint, '온라인쇼핑', '11번가',    date_trunc('month', NOW()) - INTERVAL '2 month' + INTERVAL '14 day'),
    (-65000::bigint,  '교통',       '티머니',    date_trunc('month', NOW()) - INTERVAL '2 month' + INTERVAL '16 day')
) AS v(amount, category, sender, txn_at)
WHERE u.email = 'taehyung@wooriport.com';

-- 고정지출 (통신/공과금/보험료 — AgentService.FIXED_CATEGORIES) 3개월치
INSERT INTO transactions (id, user_id, asset_id, amount, category, sender_name, transaction_at)
SELECT gen_random_uuid(), u.id, a.id, v.amount, v.category, v.sender, v.txn_at
FROM users u
JOIN assets a ON a.user_id = u.id AND a.is_salary = TRUE AND a.deleted_at IS NULL
CROSS JOIN (VALUES
    (-65000::bigint,  '통신',   'SKT',      date_trunc('month', NOW()) + INTERVAL '5 day'),
    (-110000::bigint, '공과금', '한국전력', date_trunc('month', NOW()) + INTERVAL '10 day'),
    (-150000::bigint, '보험료', '삼성생명', date_trunc('month', NOW()) + INTERVAL '17 day'),
    (-65000::bigint,  '통신',   'SKT',      date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '5 day'),
    (-108000::bigint, '공과금', '한국전력', date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '10 day'),
    (-150000::bigint, '보험료', '삼성생명', date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '17 day'),
    (-65000::bigint,  '통신',   'SKT',      date_trunc('month', NOW()) - INTERVAL '2 month' + INTERVAL '5 day'),
    (-115000::bigint, '공과금', '한국전력', date_trunc('month', NOW()) - INTERVAL '2 month' + INTERVAL '10 day'),
    (-150000::bigint, '보험료', '삼성생명', date_trunc('month', NOW()) - INTERVAL '2 month' + INTERVAL '17 day')
) AS v(amount, category, sender, txn_at)
WHERE u.email = 'taehyung@wooriport.com';


-- ============================================================
-- PART 4. 세제혜택 — ISA 납입원금 (Linking 후 자동 적재, 없으면 no-op)
-- ============================================================
INSERT INTO tax_benefit_accounts (id, asset_id, principal, created_at)
SELECT gen_random_uuid(), a.id, 6500000, NOW()
FROM users u
JOIN assets a ON a.user_id = u.id AND a.asset_number = '7777-88-888888' AND a.deleted_at IS NULL
WHERE u.email = 'taehyung@wooriport.com'
ON CONFLICT (asset_id) DO UPDATE SET principal = EXCLUDED.principal;


-- ============================================================
-- 최종 확인
-- ============================================================
SELECT '=== taehyung_seed 적재 현황 ===' AS info;
SELECT 'dummy_mydata'       AS tbl, COUNT(*) AS cnt FROM dummy_mydata   WHERE email    = 'taehyung@wooriport.com'
UNION ALL
SELECT 'users',             COUNT(*) FROM users        WHERE email    = 'taehyung@wooriport.com'
UNION ALL
SELECT 'assets',            COUNT(*) FROM assets       WHERE user_id  = (SELECT id FROM users WHERE email = 'taehyung@wooriport.com') AND deleted_at IS NULL
UNION ALL
SELECT 'transactions',      COUNT(*) FROM transactions WHERE user_id  = (SELECT id FROM users WHERE email = 'taehyung@wooriport.com')
UNION ALL
SELECT 'tax_benefit',       COUNT(*) FROM tax_benefit_accounts WHERE asset_id IN (SELECT id FROM assets WHERE user_id = (SELECT id FROM users WHERE email = 'taehyung@wooriport.com'));
