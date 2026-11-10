# 03. 마크비전 (MarqVision) REA 분해

- 대상: https://www.marqvision.com (Astro 정적 사이트, nginx) · 무료 진단 마크레이더 https://www.marqvision.com/marqradar
- 분석일: 2026-11-10
- REA Evidence: `inspect_web_page` `ev_d2883390…845a6`, `analyze_web_bundle` `ev_5a803af7…67d7546`, `export_web_scripts` `ev_ed98826f…3432`. 요약본은 [evidence/marqvision.summary.json](evidence/marqvision.summary.json)에 있습니다.
- 표기: **[관찰]** / **[도출]** / **[추론]** / **[미상]**

## 1. 한 줄 요약

마케팅 사이트는 **Astro로 만든 정적 사이트**입니다. 제품 UI를 흉내 낸 인터랙티브 데모(장면 컴포넌트)를 많이 쓰고, 실제 SaaS는 별도 앱(로그인 후)에 있습니다. 메시지의 축은 "Detect → Verify → Enforce → Go offline → Prosecute → Prove"라는 **6단계 풀스택**과, 이를 대화형으로 다루는 **Brand Intelligence Agent**입니다.

## 2. 프론트엔드·인프라 지문

| 항목       | 내용                                                                                                | 근거                                                            |
| ---------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 프레임워크 | **Astro**(`/_astro/*.astro_astro_type_script_index_0_lang.*.js`). 아일랜드 단위로 스크립트를 씁니다 | [관찰] REA export 목록 33개 스크립트                            |
| 웹서버     | `nginx/1.18.0 (Ubuntu)`                                                                             | [관찰]                                                          |
| 과거 흔적  | `cdn.prod.website-files.com`(Webflow 에셋 CDN) 호출이 남아 있습니다                                 | [관찰] → [추론] Webflow에서 Astro로 옮긴 뒤 일부 에셋이 남은 것 |
| 리드 수집  | HubSpot Forms (`forms.hsforms.com`, `js.hsforms.net`)                                               | [관찰]                                                          |
| 분석·광고  | GTM, Microsoft Clarity(세션 리플레이), Bing UET(`_uetsid`/`_uetvid`), reCAPTCHA                     | [관찰] 네트워크와 localStorage 키                               |
| 동의 관리  | CookieYes (IAB TCF v3 GVL, 1,037개 파트너 고지)                                                     | [관찰]                                                          |
| 다국어     | en / kr / jp / de / fr / es / pt / it / zh                                                          | [관찰] 크롤 링크                                                |
| 보안 인증  | SOC 2 Type II 표기                                                                                  | [관찰] 홈페이지                                                 |

### 2.1 장면(데모) 컴포넌트 = 제품 기능 지도

REA가 내보낸 Astro 아일랜드 이름은 사이트가 강조하는 제품 기능을 그대로 보여 줍니다.

| 컴포넌트                                                      | 대응 기능                                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `HeroCommand`, `AgentChat`, `AgentsPipeline`                  | Brand Intelligence Agent(대화형 질의)와 Operation Agents                   |
| `CounterfeitScene`, `SaturationField`                         | 위조품 탐지와 **Saturation Rate** 지표                                     |
| `ImpersonationScene`, `DomainPipeline`                        | 사칭 계정, 피싱·타이포스쿼팅 도메인 탐지                                   |
| `UnauthorizedScene`                                           | 무단 판매(그레이마켓)                                                      |
| `PiracyScene`                                                 | 콘텐츠 불법복제                                                            |
| `TrademarkScene`                                              | MarqFolio(상표 포트폴리오)                                                 |
| `OfflineScene`, `CourtFiling`                                 | MarqLaw(오프라인 단속, 소송)                                               |
| `AsiaMarkets`, `WorldDots`, `PlatformTicker`, `Constellation` | 커버리지(118개국, 1,500개 이상의 플랫폼)와 **셀러 네트워크 그래프** 시각화 |

## 3. 데모 UI에서 읽히는 제품 데이터 모델 [도출]

홈페이지의 제품 목업 텍스트에서 SaaS의 내비게이션과 필드를 복원했습니다.

- **내비게이션**: Portfolio(브랜드 n개) / Home / Tickets / Analytics / Operation Agents / Channels(Marketplace · Social Media · Website Content · Domain Names · Paid Ads) / Intelligence(Seller Management · Seller Intel · Brand Intelligence)
- **리스팅 상태**: Flagged → Scanned/In progress → Awaiting platform → Removed → Case closed, `Auto-enforce on` 토글
- **리스팅 필드**: 판정 사유(예: _Logo mismatch_, _Watermark on brand photo_, _Misspelled ingredient_, _Logo blurred out_), 신뢰도 %, 분류(Counterfeit / Suspicious / Authorized), 상품명, 가격, 플랫폼·국가(Amazon·US, Shopee·ID, Coupang·KR, TikTok Shop·MY, Instagram·TH), 셀러 ID, 경과 시간
- **필터**: Platform, Country, Brand, 기간, **Confidence ≥ 80%**, 신뢰도 정렬
- **KPI**: Scanned 24h, Flagged today, Awaiting platform, Removed 7d
- **셀러 링크**: "11 linked sellers found", "Removed in 4h 12m"

판정 사유를 사람이 읽을 수 있는 문장으로 붙인다는 점이 중요합니다. 멀티모달 LLM/VLM이 **판정 근거를 생성**하는 구조로 보입니다 **[추론]**. 12-technology-stack.md의 권장 아키텍처와 일치합니다.

## 4. 모듈별 분해 (공개 페이지 기준)

| 모듈                                                    | 공개 설명 요지                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand Protection                                        | 1,500개 이상의 플랫폼(Amazon, Taobao, Shopee, TikTok Shop 등)에서 위조 리스팅과 그 뒤의 셀러 네트워크를 탐지·제거합니다. **Saturation Rate**(브랜드 검색결과 중 위조 비율)를 KPI로 씁니다. 사례로 46% → 26%(8개월)를 듭니다                                                                     |
| Brand Exposure Report                                   | 샘플 기준으로 Saturation Rate 38%, 플랫폼별 분포, **운영자 클러스터(광저우·이우·선전), 3개 네트워크가 61%**, 우선 제거 리스트, 연간 위험 매출 추정을 담습니다                                                                                                                                   |
| Brand Intelligence Agent                                | 자연어 질의를 받습니다(예: "테이크다운 후 가장 빨리 재등록하는 셀러는?", "이번 주 신규 피싱 도메인"). 마켓·도메인·셀러 데이터를 근거로 표와 다음 행동을 답합니다. 도메인 등록자·체크아웃 페이지 공유로 연결 관계를 분석합니다                                                                   |
| MarqRadar (무료 진단)                                   | 공식 URL만 넣으면 피싱, 타이포스쿼팅 복제 사이트, 위조 판매글, 그레이마켓 셀러, 허위 프로모션, 유료 검색 광고를 위험도·차단 난이도와 함께 진단합니다. 50개 이상의 채널, 10억 개 이상의 모니터링 도메인, 평균 90초, AI 검증 정확도 99.8%를 내세웁니다(회사 주장). **PLG형 리드 생성 장치**입니다 |
| Impersonation / Content Protection / Unauthorized Sales | 사칭 계정·도메인, 불법복제 콘텐츠, 무단 판매 대응                                                                                                                                                                                                                                               |
| MarqFolio                                               | 상표 포트폴리오 관리                                                                                                                                                                                                                                                                            |
| MarqLaw                                                 | 온라인에서 오프라인으로 넘어가는 단속입니다. 시험구매 → 현지 조사(공장 위치 추적) → 당국과 단속 → 세관 압류 → 소송·손해배상으로 이어지며, 중국·한국·미국·동남아 법률 인력이 맡습니다. "Tech-enabled evidence collection, court-ready evidence"                                                  |

## 5. 분해 결론

1. **구조적 우위**: 탐지 채널이 6개(마켓, SNS, 웹, 도메인, 광고, 콘텐츠)입니다. 여기에 셀러 네트워크 그래프, 오프라인 법률 집행(MarqLaw), LLM 에이전트 인터페이스, 결과 지표(Saturation Rate)를 갖췄습니다. 국내 두 회사보다 범위가 한 단계 넓습니다.
2. **GTM**: 엔터프라이즈 세일즈(HubSpot·데모 요청)와 PLG형 무료 스캔(MarqRadar)을 병행합니다. 9개 언어와 SOC 2로 글로벌 엔터프라이즈 조달 요건에 대응합니다.
3. **측정 지표의 전환**: "신고 건수"가 아니라 "검색결과 중 위조 비율"이라는 **결과 지표**를 팝니다. 위고페어·페이커즈는 아직 활동 지표(차단 건수, 성공률)를 중심으로 이야기합니다.
