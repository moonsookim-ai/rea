# 01. 위고페어 (WEGOFAIR) REA 분해

- 대상: https://www.wegofair.com (Next.js Pages Router) · 블로그 https://www.wegofair.com/blog/ (Ghost 5.66)
- 분석일: 2026-11-10
- REA Evidence: `inspect_web_page` `ev_957d7890…88258`, `analyze_web_bundle` `ev_c0d9958f…cdf58d`, `export_web_scripts` `ev_65a60040…3dc0d`. 요약본은 [evidence/wegofair.summary.json](evidence/wegofair.summary.json)에 있습니다.
- 표기: **[관찰]**은 REA나 HTTP로 직접 본 것, **[도출]**은 관찰에서 기계적으로 끌어낸 것, **[추론]**은 해석, **[미상]**은 확인하지 못한 것입니다.

## 1. 한 줄 요약

공개 마케팅 사이트가 **로그인 뒤 SaaS(`/app/*`)와 같은 Next.js 빌드를 공유**합니다. 그래서 `_buildManifest.js`에 제품 전체의 화면 라우트 121개(그중 로그인 후 `/app/*` 93개)가 그대로 드러납니다. 홈페이지 문구보다 이 라우트 목록이 제품 구조를 더 정확히 보여 줍니다.

## 2. 프론트엔드·인프라 지문

| 항목           | 내용                                                                                                                                                                      | 근거                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 프레임워크     | Next.js(Pages Router)와 React                                                                                                                                             | [관찰] REA `vendor_fingerprint` Next.js high·React medium, `/_next/static/<buildId>/_buildManifest.js` |
| 웹서버         | `nginx/1.18.0 (Ubuntu)`. www와 api 모두 같습니다                                                                                                                          | [관찰] HTTP 응답 헤더                                                                                  |
| API            | `https://api.wegofair.com`. axios 인스턴스(`withCredentials: true`)로 쿠키 세션 인증을 쓰고, 요청마다 `x-locale` 헤더를 붙이며, 업로드는 `multipart/form-data`로 보냅니다 | [관찰] `_app` 청크 리터럴 · [관찰] 크롤 중 `POST /auth/me` 호출                                        |
| 파일 저장소    | `wegofair.s3.ap-northeast-2.amazonaws.com` (AWS 서울 리전 S3)                                                                                                             | [관찰] 번들 리터럴                                                                                     |
| 백엔드 작업 큐 | `/app/lab/celery`, `/app/lab/celery/[celery_id]` 화면이 있습니다                                                                                                          | [관찰] 라우트 → [추론] Python(Django/FastAPI)과 Celery 비동기 작업 큐로 수집·분석 잡을 돌리는 구조     |
| 에러 모니터링  | Sentry (`browser.sentry-cdn.com`, DSN 리터럴, `sentry.dsc` 엔드포인트 후보)                                                                                               | [관찰]                                                                                                 |
| 고객 상담      | Channel.io(채널톡). `/app`·`/auth`·`/evidence`에서는 버튼을 숨깁니다                                                                                                      | [관찰] 번들 로직, localStorage `Channel.plugin_info.*`                                                 |
| 마케팅 도구    | GTM/GA4, Google Ads(doubleclick), Ahrefs Analytics, 코드앤버터(`buttr.dev`, 팝업·캠페인)                                                                                  | [관찰] 크롤 네트워크 호스트                                                                            |
| 동의 관리      | `get.geojs.io`로 IP 국가를 판정합니다. EEA·영국이면 Consent Mode v2 기본값을 deny로, 그 외 국가는 grant로 설정하고 결과를 `localStorage.wgf_cc`에 캐시합니다              | [관찰] 인라인 스크립트와 번들                                                                          |
| 다국어         | ko/en (`x-locale`, Next i18n 라우팅 `/en`)                                                                                                                                | [관찰]                                                                                                 |

## 3. 제품 구조 — 라우트 매니페스트 분해

REA가 내보낸 `_buildManifest.js`의 `sortedPages`를 기능별로 묶었습니다. 각 화면의 실제 동작은 로그인해야 보이므로 확인하지 않았고, 기능명은 라우트 이름에서 해석한 **[추론]**입니다.

### 3.1 탐지·모니터링 (위고페어 본 서비스)

| 라우트                                                                                                            | 해석                                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/app/request`, `/app/request/keyword`, `/app/request/image`, `/app/request/scheduled`, `/app/request/trash`      | 모니터링 요청을 키워드로 또는 이미지로 생성합니다. 예약(주기) 수집과 휴지통이 있습니다        |
| `/app/monitor`, `/app/monitor/[request_id]`, `/app/monitor/image/[request_id]`, `/app/monitor/multi/[request_id]` | 요청별 결과 화면으로, 이미지 기반과 멀티 요청을 지원합니다                                    |
| `/app/monitor/eland`, `/app/monitor/eland/[id]`                                                                   | **고객 전용 화면**입니다. 이랜드 계열 브랜드를 위한 커스텀 모니터링으로 추정됩니다 **[추론]** |
| `/app/overall-monitor`, `/app/overall-seller`, `/app/dashboard`                                                   | 브랜드 전체 현황과 셀러 현황 대시보드                                                         |
| `/app/search`, `/app/similar`, `/app/lookup`, `/app/seller-lookup`                                                | 검색, 유사 이미지 검색, 셀러 조회                                                             |
| `/app/monitoring-usage`                                                                                           | 사용량을 미터링합니다. 셀프서비스 월정액 플랜의 쿼터와 연결됩니다                             |
| `/app/setting/schedule`                                                                                           | 수집 스케줄 설정                                                                              |

### 3.2 판정·처리 워크플로

| 라우트                                                                                              | 해석                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/app/process`, `/app/process/brand/[brand_id]`, `/app/process/trash`                               | 브랜드별로 탐지 결과를 판정하는 큐(위조/정품/보류). `useProcessFilter`, `useProcessUtils` 훅이 있습니다                                                                              |
| `/app/check/brand/[brand_id]`                                                                       | 브랜드별 검수(전문가 리뷰)                                                                                                                                                           |
| `/app/illegal-sellers`, `/app/seller`, `/app/seller/[id]`                                           | 불법 셀러 DB와 셀러 상세. 회사 자료에서 밝힌 사업자번호·전화·이메일 기반 **셀러 클러스터링**의 화면으로 보입니다                                                                     |
| `/app/ai/image`, `/app/ai/poc`                                                                      | AI 이미지 판정과 PoC 실험 화면                                                                                                                                                       |
| `/app/image-library/[homepage_id]`, `/app/official-homepage`, `/app/official-homepage/[request_id]` | **공식 이미지 라이브러리**입니다. 브랜드 공식몰의 이미지를 수집해 두고, 이를 기준으로 무단 이미지 도용을 탐지합니다(홈페이지의 "공식 이미지 무단 사용 자동 차단" 신규 서비스와 일치) |

### 3.3 신고·단속

| 라우트                                                                                          | 해석                                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/app/one-click`, `/report-preview`                                                             | URL만 넣으면 신고하는 **원클릭 신고**. 요금은 국내 4만원·해외 10만원/건입니다                                                                  |
| `/app/auto-report`, `/app/auto-report/brand/[brand_id]`, `/app/admin/auto-report-sites`         | **플랫폼별 자동 신고**와, 관리자가 자동 신고를 지원하는 사이트 목록을 관리하는 화면                                                            |
| `/app/report-url`, `/app/report-download`, `/app/report-download/export`, `/app/dataset-export` | 신고 URL 관리, 보고서와 데이터셋 내보내기                                                                                                      |
| `/app/test-purchase`, `/app/test-purchase/[tp_id]`                                              | **시험구매**(2026-10 정식 출시)                                                                                                                |
| `/app/warrant`                                                                                  | 위임장(권리자 대리 신고에 필요한 위임 서류) 관리                                                                                               |
| `/evidence/[cd_id]`, `/evidence/brand/[public_id]`, `/evidence/olp/[public_id]`                 | **공개 증거 페이지**입니다. 플랫폼 담당자나 셀러에게 공유할 수 있는 public_id 기반 링크로, `olp`는 Online Listing Page로 추정됩니다 **[추론]** |
| `/platform-guide`                                                                               | 플랫폼별 신고 가이드(리드 수집용 게이트 콘텐츠)                                                                                                |

### 3.4 Shield — 채널 확장 모듈

`/app/shield/{marketplace, social-media, domains, ads, apps, maps, collect, library, notes, report, setting}`

마켓플레이스 밖으로 탐지 채널을 넓힌 모듈입니다. 도메인(사칭 사이트), 광고, 앱스토어, **지도(오프라인 매장·지도 리스팅)**를 다룹니다. 채널 구성은 마크비전의 Channels(Marketplace / Social / Website / Domain / Paid Ads)와 거의 같습니다 **[추론]**.

### 3.5 WegoBAM — 브랜드 자산(IP 포트폴리오) 관리

`/app/bam/{trademark, patent, design, image, new-trademark}` (각각 목록·편집·상세), `/app/tm-monitor`, `/app/ip-monitor`

상표·특허·디자인 권리를 관리하고, 신규 상표 출원과 **유사 상표 출원 감시**(TM monitor)를 합니다. 변리사가 창업한 회사라는 강점을 제품화한 부분이며, 마크비전의 MarqFolio에 대응합니다.

### 3.6 실험·내부 도구 (`/app/lab/*`)

`price-dashboard`(가격 대시보드, 그레이마켓 대응 준비 [추론]), `smart`, `report`, `celery`.

### 3.7 기타

- `/cli-authorize`: **CLI 디바이스 인증 플로**가 있습니다. 내부 운영자나 고객용 커맨드라인·자동화 도구가 존재한다는 신호입니다 **[추론]**.
- `/rid-gen`: ID 생성 유틸리티로 보이며 용도는 **[미상]**입니다.
- `/auth/register-company`: 회사 단위 계정(B2B 멀티 유저). `/app/company/*`, `/app/user/*`와 함께 씁니다.

## 4. 비즈니스 모델 (공개 요금표, /pricing)

| 플랜        | 가격                                | 핵심                                                                                  |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| 원클릭 신고 | 국내 40,000원/건, 해외 100,000원/건 | 고객이 URL을 주면 위고페어가 신고합니다. 영업일 24시간 안에 연락합니다                |
| 셀프서비스  | **월 299,000원부터**                | 데이터 수집·모니터링, AI 정렬 툴, 필터링, 플랫폼 전체 기능. 신고는 고객이 직접 합니다 |
| 위탁관리    | 별도 협의                           | 전담 브랜드 매니저가 원스톱으로 처리하고 리포트를 제공합니다                          |

부가세는 별도이고 연간 계약 시 할인됩니다. 세 회사 중 **가격을 공개한 곳은 위고페어뿐**입니다.

## 5. 홈페이지 주장 수치 (회사 주장)

1,600개 이상의 국내외 마켓플레이스·SNS를 모니터링하고, 3,000개 상품을 1분에 모니터링하며, 시간 97%·비용 70% 절감, 차단 성공률 90%라고 밝힙니다. 이 밖에 고객 100곳 이상, KIPA(한국지식재산보호원) 온라인 위조상품 대응 수행기관, TIPS, MS 프로그램 선정을 내세웁니다.

## 6. 분해 결론

1. **구조**: 수집(요청·스케줄) → AI 정렬(로고·고위험 셀러·유사 이미지) → 사람 검수(process/check) → 신고(원클릭·자동 신고·위임장) → 증거 공개 링크 → 리포트로 이어지는 **전통적 BPO형 파이프라인**입니다. 여기에 IP 포트폴리오 관리(BAM)와 채널 확장(Shield)을 덧붙였습니다.
2. **차별점**: 변리사 주도의 법률 전문성(위임장, 상표 감시, 특허), 공식 이미지 라이브러리 기반의 이미지 도용 탐지, KIPA 정부사업 레퍼런스.
3. **약점과 리스크 [추론]**: 공개 사이트 번들에 내부 라우트, 고객 전용 화면명(`eland`), 실험 화면(`lab`, `ai/poc`)이 노출됩니다. 정보보안 측면의 개선 포인트입니다. Next.js에서는 `/app` 영역을 별도 앱이나 빌드로 분리하면 막을 수 있습니다.
