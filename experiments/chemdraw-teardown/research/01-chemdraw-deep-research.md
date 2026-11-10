# ChemDraw 심층 리서치 (Revvity Signals) — 2026-11-10 기준

> 작성 기준일: 2026-11-10. 공식 제품 페이지(revvitysignals.com/products/research/chemdraw)와 support.revvitysignals.com 대부분이 자동 접근에 403을 반환하여, (a) 대학/재판매사가 미러링한 공식 PDF(릴리스 노트, Hardware & Software Guide, Dot Chart 데이터시트), (b) Revvity IR 보도자료 PDF, (c) Wikipedia, (d) 검색 엔진 스니펫을 교차 사용했다.
> 각 사실 뒤 `[S#]`는 문서 끝 출처 목록 번호. **"미확인"** 표시는 1차 출처로 검증하지 못한 항목. "(스니펫)"은 원문 페이지를 직접 열지 못하고 검색 결과 요약으로만 확인한 항목이다.

---

## 0. 핵심 요약 (TL;DR)

- **계보**: Harvard의 David & Sally Evans, Stewart Rubenstein이 1985년 Mac용으로 구상하고 7월 Gordon Research Conference에서 시연 → 1986년 ChemDraw 1.0(Mac) → Cambridge Scientific Computing(이후 CambridgeSoft) → 2011년 PerkinElmer 인수 → PerkinElmer Informatics → 2023년 5월 Revvity Signals Software로 이름이 바뀜 [S1][S2][S3][S8].
- **소유 구조 변화(2025–2026)**: Revvity Signals를 **매각하거나 분사했다는 증거는 찾지 못했다(미확인/부정)**. 오히려 Revvity는 2025-11-10 ACD/Labs 인수를 발표했고(2026-01 완료로 보임), Signals를 성장 축으로 키우고 있다. 2026년 3분기 Signals 매출은 10%대 후반 성장, ARR은 20% 넘게 성장했다 [S20][S21][S22].
- **현재 버전**: 데스크톱 ChemDraw **26.0**(2026 상반기)과 **26.1**(2026-09-28 발표, 스니펫)이 나와 있다. 웹 Signals ChemDraw+는 26.3(2026-04), 26.4(2026-05) 등 월 단위 수준으로 업데이트된다. ChemDraw JS는 25.0.1(2025-06-27)에서 무한 캔버스 UI로 개편되었다 [S1][S5][S6][S7][S13].
- **패키징**: ChemDraw Prime / ChemDraw Professional / **Signals ChemDraw**(SaaS: 데스크톱 전체 앱 + 웹 ChemDraw+ + ChemDraw Collections) 3단 구성이다. 2025-01-01부터 Prime/Professional **영구 라이선스 신규 판매가 중단**되었고, 2026-07-01부터는 영구 라이선스 유지보수 갱신도 중단되어 사실상 구독 전용이다 [S5][S15][S16].
- **AI**: "ChemDraw Copilot"이라는 제품은 **확인되지 않음**. 제품군 차원에서는 Signals Xynthetica(2025-12 발표, AI 예측 모델 MaaS로 Signals ChemDraw 내부 제공), Signals AI(2026-06-22, 에이전트형 프레임워크), Anthropic Claude MCP 커넥터(2026-07-01, ChemDraw를 지식원으로 명시)가 있다. 과거의 "Enhanced Retrosynthesis" 도구는 23.0에서 **제거**되었다 [S4][S23][S24][S25][S26].
- **포맷**: 네이티브 포맷은 바이너리 **CDX**(little-endian TLV, 헤더 `VjCD0100`)와 XML 기반 **CDXML**이다. 공식 SDK 문서는 Revvity가 더 이상 호스팅하지 않으며(2024-10-23 기준), IUPAC FAIRSpec 프로젝트가 아카이브를 보존하고 있다 [S9][S10][S11].

---

## 1. 회사·제품 역사

### 1.1 탄생 (1984–1986)

- 1984년 1월 Apple Macintosh가 출시되자 Stewart Rubenstein과 David·Sally Evans 부부가 MacDraw를 화학 구조 프로그램의 토대로 삼을 수 있다고 판단했다. 당시 박사과정생이던 Rubenstein이 몇 주 만에 초기 프로그램을 만들었다 [S3](스니펫, ChemistryViews).
- 1985년 7월 New Hampshire에서 열린 Gordon Research Conference on Reactions & Processes에서 David Evans가 시연했다 [S1][S3].
- 1985년 말 Stewart의 동생 Michael Rubenstein이 3D 동반 프로그램 **Chem3D** 개발을 시작했다 [S1].
- 1986년 Cambridge Scientific Computing이 설립되어 Macintosh용 ChemDraw 1.0을 내놓았다 [S2](Compound Interest 40주년 타임라인).
- 1차 문헌: David A. Evans, "History of the Harvard ChemDraw Project," _Angew. Chem. Int. Ed._ 2014, 53(42), 11140–11145, DOI 10.1002/anie.201405820 [S3]. 원문 전문은 열람하지 못했다(초록/2차 요약만 확인).
- 연도 표기는 출처마다 다르다. Wikipedia는 1985년 "구상", 다른 출처는 1986년 "출시"로 적는다. CambridgeSoft 설립 연도를 1986년(CB Insights)으로 적는 출처와 1998년으로 적는 출처가 충돌한다 [S1][S3]. 참고로 Revvity의 현행 문서 저작권 표기는 "© 1998-2026 Revvity Signals Software, Inc."로 1998년을 기점으로 쓴다 [S6].

### 1.2 성장기 마일스톤 (Compound Interest 타임라인, 2025)

| 연도       | 사건                                                     |
| ---------- | -------------------------------------------------------- |
| 1985       | 첫 공개 시연                                             |
| 1986       | ChemDraw 1.0 (Mac)                                       |
| 1993       | 첫 Windows 버전                                          |
| 1997       | NMR, pKa, logP 예측과 Struct→Name, Name→Struct 기능 탑재 |
| 2004       | 질량분석(MS) fragmentation 도구                          |
| 2014       | CAS SciFinder 연동                                       |
| 2016       | ChemDraw Cloud 출시(온라인 협업)                         |
| 2017       | HELM(거대분자 표기) 통합                                 |
| 2019       | 고리 채우기 색(ring fill)                                |
| 2020       | 원자/결합 색 하이라이트, 3D clean-up, perspective 도구   |
| 2024       | Signals ChemDraw (클라우드 기반)                         |
| 출처: [S2] |

### 1.3 소유권 변천

- **CambridgeSoft → PerkinElmer (2011)**: Xconomy와 CB Insights는 2011-03-24 인수 발표로 기록하며, 금액은 비공개다(스니펫) [S1][S3].
- **2015-06-22**: PerkinElmer가 ChemDraw 30주년에 맞춰 **Prime / Professional / ChemOffice Professional** 3단 패키징을 도입했다. 같은 시기 macOS 10.10과 Retina를 지원했고 iPad 앱(Flick-to-Share)을 냈다. 보도자료는 ChemDraw를 미국 특허청(USPTO)에 화합물을 제출하고 심사할 때 쓰는 표준 도구로 소개한다 [S12]. ChemDraw Professional은 이전 이름이 "ChemBioDraw Ultra"였다(Duke OIT, 스니펫) [S12].
- **2022**: PerkinElmer가 사업을 분할했다. Life Science·Diagnostics 부문이 Revvity, Inc.가 되었고, Analytical/Food/Enterprise 부문은 New Mountain Capital에 약 24.5억 달러에 매각되어 PerkinElmer 이름을 유지했다(스니펫) [S1][S8].
- **2023-05**: PerkinElmer Informatics가 **Revvity Signals Software, Inc.**로 이름을 바꿨고, Revvity는 2023-05-16 NYSE: RVTY로 거래를 시작했다. ChemDraw, E-Notebook, Signals가 Revvity Signals로 넘어갔다 [S8](스니펫, LIMSwiki·Revvity 보도자료).
- **23.0(2024-01 릴리스 노트)**: 앱 아이콘, 파일명, 설치 경로까지 Revvity 브랜드로 교체되었다 [S4].
- **2025-11-10**: Revvity가 **ACD/Labs 인수**를 발표했다(금액 비공개, 2025년 4분기 말 완료 예정). ACD/Labs는 이후 "2026년 1월 Revvity Signals가 인수"했다고 공지했다. 그 결과 **ChemSketch는 신규 고객 판매가 중단**되었고, acdlabs.com의 ChemSketch 구매 페이지와 "ChemDraw is better with ACD/Labs Essentials" 페이지는 현재 Revvity ChemDraw 제품 페이지로 301 리다이렉트된다(직접 확인) [S20][S27].
- **매각·분사 여부**: "Revvity Signals 매각(예: Symphony Technology Group 등)" 관련 보도는 **검색되지 않았다(미확인, 근거 없음)**. 2026년 Revvity가 매각을 추진한 사업은 중국 면역진단(최대 2억 달러)이다. 3분기 실적 발표에서 경영진은 "2026년은 (Signals) 역사상 신제품 출시가 가장 많은 해"라고 했다 [S21][S22]. 2026-11-13 Investor Day에서 소프트웨어 KPI가 공개될 예정이었다 [S22].

### 1.4 버전 타임라인 (확인된 범위)

| 버전                          | 시기                              | 비고                                                                                         | 출처      |
| ----------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- | --------- |
| 15.x                          | 2015                              | Prime/Professional 체계 도입, 현재 Sunset                                                    | [S12]     |
| 20.x                          | 2020–21                           | 2026-09-30 EOL                                                                               | [S16]     |
| 21.0                          | 2022-03-02 발표                   | PowerPoint 3D 구조 삽입/애니메이션, 3D 프린팅(3MF), ChemOffice+ Cloud                        | [S14]     |
| 22.0                          | 2022-09                           | 수소결합 도구, FASTA, HELM cartoon, 64-bit Chem3D, Flexera 활성화                            | [S17]     |
| 22.2                          | 2022–23                           | 이후 버전과 side-by-side 설치 불가                                                           | [S4]      |
| 23.0                          | 2024-01-18 노트                   | Signals ChemDraw/ChemDraw+, Revvity 리브랜딩, MOL V3000 기본값, Enhanced Retrosynthesis 제거 | [S4]      |
| 23.1                          | 2024                              | HELM, 문서 수준 annotation 개선(스니펫)                                                      | [S5]      |
| 24.0                          | 2024–25                           | 대학 배포 페이지만 확인됨, 릴리스 노트 **미확인**                                            | [S28]     |
| 25.0                          | 2025                              | ARM Mac 네이티브, coordination/dative 결합 통합, 상보 가닥, 대분자                           | [S5]      |
| ChemDraw JS 25.0.1            | 2025-06-27                        | 무한 캔버스, UI 전면 재설계                                                                  | [S1][S13] |
| 25.5                          | 2025 하반기                       | 물성 계산, HELM, ChemScript Python 확장                                                      | [S5]      |
| 26.0                          | 2026 상반기(HW 가이드 2026-04-23) | 물성 계산 비동기/고속화, pKa 예측, hairpin, IUPAC 2024 원자량                                | [S6][S7]  |
| 26.1                          | 2026-09-28                        | Prime/Professional/Signals ChemDraw 업데이트, 상세 **미확인**(스니펫)                        | [S26]     |
| Signals ChemDraw+ 26.3 / 26.4 | 2026-04 / 2026-05                 | 웹. 설치 파일 checksum, HELM 구조검색, 컬럼 필터, 다중가닥 cleanup                           | [S5]      |

---

## 2. 에디션·패키징·라이선스

### 2.1 현행 3단 구성 (Dot Chart, 2026-05)

Revvity 데이터시트 "ChemDraw Suite of Products"(2026년 5월판)의 열은 **ChemDraw Prime / ChemDraw Professional / Signals ChemDraw** 세 개다. 데이터시트 원문은 "Signals ChemDraw는 ChemDraw 데스크톱 애플리케이션 전체와, Signals 생태계에 통합된 클라우드 네이티브 웹앱 ChemDraw+를 제공한다"고 설명한다 [S7].

| 구성요소                                                                                                                                                                                    | Prime | Professional | Signals ChemDraw                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ | ---------------------------------------------------- |
| ChemDraw Desktop (Win/Mac)                                                                                                                                                                  | O     | O            | O                                                    |
| ChemDraw+ (Web)                                                                                                                                                                             | –     | –            | O                                                    |
| ChemDraw for Excel (Win)                                                                                                                                                                    | –     | O            | O                                                    |
| Chem3D Professional (Win)                                                                                                                                                                   | –     | O            | O                                                    |
| Chem3D Ultra (CONFLEX, AutoDock, GAMESS, Gaussian 16W, MOPAC 2016 인터페이스)                                                                                                               | –     | –            | O                                                    |
| ChemFinder Standard / Ultra (Win)                                                                                                                                                           | –     | Std          | Std+Ultra(ChemFinder for Oracle, BioViz, Clustering) |
| ChemScript (Win)                                                                                                                                                                            | –     | O            | O                                                    |
| ChemDraw Collections(구 ChemOffice+) 계열 기능: 파일/Office 문서/Signals Notebook 구조 검색, PowerPoint 리포트 슬라이드                                                                     | –     | –            | O                                                    |
| 라이선스 관리·인증(Signals), 자동 업데이트                                                                                                                                                  | –     | –            | O                                                    |
| 출처: [S7]. 주의: PDF를 텍스트로 추출하면 점(⬢)이 어느 열에 속하는지가 일부 모호해진다. 점이 2개인 항목은 Professional과 Signals ChemDraw, 1개인 항목은 Signals ChemDraw 전용으로 해석했다. |

- 이전 체계에서는 ChemOffice Professional이 최상위 스위트였고 [S12], 이후 ChemOffice+ Cloud가 등장했다. 2024-03-18 보도자료는 "ChemOffice와 ChemOffice+ Cloud Standard에서 Signals ChemDraw로 전환"한다고 밝혔다 [S18]. 23.0 노트에 따르면 ChemDraw Collections가 ChemOffice+의 새 이름이다 [S4].
- 재판매사 ADDITIVE(독일)는 Prime에 구조 분석, pKa/LogP/LogS/tPSA, TLC/gel 도구, OLE/ActiveX를 넣고, Professional에 BioDraw, NMR 예측, 고급 Name-to-Structure, SciFinder 연동, Stoichiometry grid, ChemDraw for Excel, ChemFinder Std, ChemScript를 넣는다. 다만 이 페이지에는 "Enhanced retrosynthesis tool"과 "ChemDraw Cloud access"가 아직 남아 있는데, 이는 공식 23.0 노트(두 기능 모두 제거/대체)와 맞지 않는 **구 정보**다 [S19][S4].
- **ChemDraw Cloud와 Signals Notebook Individual Edition 종료**: 2025-03-25 종료되었고, 데이터를 백업하지 않으면 삭제되었다. 대체 제품은 Signals ChemDraw다(Pitt IT 공지) [S29].
- iPad용 ChemDraw/Chem3D/CDSL 앱은 App Store에서 철수했다(Revvity 지원 문서 제목, 스니펫) [S16].

### 2.2 라이선스 모델 변화

- **Flexera 활성화**(22.0에서 도입)와 **Signals 로그인 라이선스**(23.0)가 공존한다. Signals 라이선스는 Flexera 코드 없이 Signals 테넌트에 로그인해 인증한다. 인증 후 최대 **30일 오프라인 사용**이 가능하며, ChemDraw, Chem3D, ChemFinder, ChemFinder for Office, ChemDraw for Excel, ChemScript 모두에 적용된다. 조직 관리자가 라이선스를 할당한다 [S4][S17].
- **2025-01-01**: ChemDraw Prime/Professional **영구 라이선스 신규 판매 중단**, 구독 전용으로 전환(Revvity 지원 공지, 스니펫) [S15].
- **2026-07-01**: 모든 ChemDraw 제품의 **영구 라이선스 유지보수 갱신 중단**. 기존 영구 사용자는 갱신 시점에 구독으로 옮겨야 한다(스니펫) [S16].
- **2026-09-30**: ChemDraw 20.x/21.x/22.x **EOL**. 이후 기술지원, 업데이트, 활성화 코드 발급이 모두 중단된다 [S16].
- **2026-04-02 포털 개편**: 하이델베르크대는 Revvity의 ChemDraw 소프트웨어 포털이 개편되어 4월 2일 이후에도 쓰려면 재등록과 라이선스 갱신이 필요하다고 공지했다 [S30]. Michigan 등에서는 "ChemDraw 25 활성화에 새 로그인/인증 절차가 필요해 사용자들이 낯설어한다"고 안내했다(스니펫) [S31].
- 학계에서는 **사이트 구독(Academic Site Subscription)** 이 주를 이룬다. 학교 이메일로 Revvity 포털에 등록하고 "My Site Subscription"에서 내려받는 방식이며, Strathclyde·Duke 등은 구성원에게 무료로 배포한다 [S28][S32]. 라이선스가 사용자 단위(per-user)로 바뀌었다는 대학 공지도 있다(Franklin, 스니펫) [S16].

### 2.3 공개 가격 (단편적)

- 공식 정가는 **비공개**다. 재판매사도 "영업 문의"로만 안내한다 [S19].
- 대학 재판매가: 한 대학은 Signals ChemDraw 1라이선스 연 **$64**, MGB(매사추세츠 병원 계열) 연구 포털은 사용자당 연 **$70**(스니펫, 정확한 출처 페이지는 **미확인**) [S32].
- 개인 사용자 리뷰 인용: 최저 티어 단일 사용자 연 **$525**(스니펫, 리뷰 작성 시점 불명, **미확인**) [S33].
- ConceptViz 비교 글: 월 $70+, 연 $420+로 표기했는데 두 수치가 서로 맞지 않는다. 같은 글은 영구 라이선스가 2025-01-01에 종료되었다고 적었다 [S33].
- AlternativeTo의 오래된 정보: 영구 라이선스 $660–$1,280(시점 불명, 스니펫) [S32].

---

## 3. 기능 전체 목록 (분류별)

> 기본 출처는 2026-05 Dot Chart [S7]이다. 23.0/22.0 릴리스 노트 [S4][S17]와 26.0 노트 [S5]로 보강했다.

### 3.1 드로잉/편집

- 결합·고리·텍스트 도구, 정렬, Join/merge, 180° 대칭 회전, 라벨 확장/축약, nickname 정의, 펜·도형 도구, 실험기구(lab equipment) 템플릿, 구조 템플릿, 주기율표에서 원자 선택, 줌/스크롤 [S7].
- **Smart copy/paste**(SMILES/InChI/HELM). **Smart paste**(23.0): 붙여넣을 때 뷰포트 중앙을 먼저 시도하고, 겹치면 좌상단 쪽 빈 공간에 놓는다 [S4][S7].
- **Hotkeys / "Magic hotkeys"**: 22.0에서 'g' 핫키가 추가되었다(선택한 결합/원자에 drawing hotspot 배치). Shift+Alt/Option+방향키는 X/Y축 ±12° 3D 회전이다 [S7][S17].
- **Atom ID**(23.0): 캔버스 전체에서 유일하고 단조 증가하는 정수다. MOL 파일의 N번째 atom record와 1:1로 대응하지만, 편집하면 다시 매겨질 수 있다 [S4].
- 스타일시트: **ACS Document 1996**이 기본이다(고정 결합 길이 14.4 pt ≈ 0.508 cm, line width 0.6 pt, bold width 2 pt, margin 1.6 pt, hash spacing 2.5 pt, chain angle 120°, bond spacing 18%) [S34]. 23.0에서 **Dark Mode** 스타일시트와 "Labeled Monomers" 스타일시트가 추가되었다 [S4].
- 웹(ChemDraw+/JS): 무한 캔버스, 패닝, 상황별 플로팅 툴바, 접고 펼 수 있는 Properties/Query/Guided Stereo 패널, Join 도구 [S7][S13].
- 웹 접근성: WCAG 2.1 AA 대응(대비, 키보드 내비게이션, 스크린리더, 폼, 줌/리플로우) [S7].

### 3.2 화학 지능 (Chemical Intelligence)

- **Chemical warnings**: 원자가, 전하, 잘못된 동위원소, 잘못된 stereo bond. 26.0에서는 "non-stereo 원자에서 시작하는 stereo bond" 경고가 추가되었다 [S5][S7].
- **입체화학**: show stereochemistry(CIP R/S 표시), 상대 입체(ISIS 호환), **atropisomer 인식**, 알렌·atropisomer의 **M/P**, **Enhanced stereochemistry**(Prime 제외, 웹에는 annotation 도구), top-level chiral flag 무시 옵션 [S7]. 23.0에서 enhanced stereo 오류 경고를 켜고 끄는 토글이 생겼다 [S4].
- 수소결합 전용 도구(22.0): MOL 파일에 정확히 기록된다 [S17]. 25.0에서 **coordination/dative 결합 처리를 통합**했다(coordination bond가 화학 인식상 dative처럼 동작) [S5].
- 반응 인식/해석과 reaction mapping. 23.0부터 반응물·생성물 없이 화살표 위아래에 시약만 있어도 반응으로 인식한다 [S4][S7].
- **Struct→Name / Name→Struct**: Professional 이상이며 웹에도 있다. ChemACX.com을 통한 이름→구조, CAS RN→구조 변환도 된다 [S7]. 기원은 1997년경이다 [S2].
- 원소 원자량은 IUPAC 2024 기준으로 갱신되었다(Gd, Lu, Zr; 26.0) [S5].

### 3.3 분광 예측

- **1H / 13C NMR 예측**(Win/Mac, Professional 이상) [S7]. 엔진의 뿌리는 CS ChemNMR Pro(Upstream Solutions 개발)다. 증분(additivity) 기반으로 1H는 기준값 700개와 증분 약 2,000개, 13C는 파라미터 약 4,000개를 쓴다. CHx의 약 90%를 표준편차 0.2–0.3 ppm으로 추정하며, 헤테로원자에 붙은 H는 추정하지 않는다(2004년판 도움말 기준이며, 현행 엔진도 같은지는 **미확인**) [S35].
- **MS**: m/z 계산, Mass fragmentation 도구(2004 도입) [S2][S7].
- 외부 비교: Anthropic이 2026-06 공개한 평가에서 ChemDraw 25.0.2를 MestReNova 17.0.0과 함께 1H/13C 예측 기준선으로 썼다(스니펫, 벤더 발표 자료) [S36].

### 3.4 물성 계산 (ChemDraw/ChemProp)

- 모든 에디션: MW, exact mass, 분자식, **원소분석**, m/z, **tPSA**, LogP/MR(Win/Mac), **pKa/LogS(Windows 전용)**. cLogP는 Professional 이상이며 Windows 전용이다 [S7].
- 엔진 출처: Dot Chart의 ChemDraw for Excel/Chem3D 항목에 "**Molecular Networks** (pKa/LogP/LogS)", "**ClogP/CMR**", "Molecular Topology", "ChemProp Std/Pro Properties"가 명시되어 있다 [S7]. ClogP가 BioByte 계열 알고리즘이라는 점은 업계에서 널리 알려져 있으나 이번 조사에서 1차 출처로 확인하지는 못했다(**미확인**).
- 26.0: 물성 계산을 효율화해 큰 구조에서도 편집이 끊기지 않는다. LogP 한도는 heavy atom 150개 또는 불소 50개, 기타 물성은 원자 1,000개까지다. **Predicted pKa**가 Analysis 패널에 추가되었다 [S5].
- 웹(ChemDraw+): Analysis 패널에서 LogP와 pKa를 계산할 수 있다 [S7].

### 3.5 바이오폴리머 / HELM

- HELM 통합(2017~). FASTA(OR 단량체 포함) 붙여넣기와 FASTA/HELM으로 복사 [S2][S17].
- 단량체 cartoon 렌더링(22.0 도입, 23.0부터 ACS 1996 기본 적용): 모양으로 단량체 종류를, 색으로 natural analog를 나타낸다. 삽입 위치는 워드프로세서처럼 깜박이는 커서로 표시된다 [S4][S17].
- 단량체 라이브러리: Natural Monomers, User, PerkinElmer/Signals, **Pistoia Alliance**. 23.0에서 기본 Blob(Abody, GoldP, Sfc)이 추가되었다 [S4][S17].
- 25.x/26.x: 상보 가닥 생성과 Auto-pair(Watson–Crick 수소결합: A–U/T 2개, C–G 3개), 하나의 서열에 여러 상보 가닥 연결, **hairpin** 지원(단량체 펼침/접기, pendant 화학/펩타이드 부착), 가교(crosslink) 렌더링 개선, HELM 문자열에 pairing 정보 포함, BILN 펩타이드 표기(웹), HELM 단량체 구조검색(웹), 단량체 버전 관리, 단량체 deprecate/restore와 일괄 import(웹), 중앙 공유 HELM 라이브러리(Signals) [S5][S7].
- BioDraw 툴바(Win/Mac), **TLC 판·Gel 전기영동** 도구(모든 에디션), 플라스미드 전용 도구는 **미확인**(Dot Chart에 별도 항목 없음) [S7].

### 3.6 R-group / Markush / 쿼리

- Generic structure: **atom list**, variable attachment(가변 부착점), label/polymer 반복 단위, **R-group table**(Prime 제외), **Generic Structure Enumeration**, multicenter attachment(합토 결합 등) [S7].
- 고분자 브래킷 도구(평균 MW 매개변수화) [S7]. 웹 JS 25.0.1에는 Query 패널이 있다 [S13].

### 3.7 3D — Chem3D

- 64-bit Chem3D는 22.0부터 제공된다. ChemDraw의 Chem3D Hotlink 창도 64-bit로 완성되었다 [S17].
- 계산 엔진 인터페이스(23.0 검증 목록): **Gaussian 16 Rev C.01, MOPAC2016, CONFLEX 9.C, AutoDock 4.2.6 / MGL Tools 1.5.64, GAMESS 2021 R2 Patch2(64-bit만), msroll** [S4]. MM2(최소화/분자동역학)와 MMFF94(Ultra 전용)는 Revvity 지원 문서에 나온다(스니펫) [S37].
- ChemDraw 내부 3D 기능: 3D clean-up, perspective 도구, 3D clean-up 시 수소결합 반영. **3MF 내보내기**(3D 프린팅, 50–150 mm 스케일 보정, 링 채우기 색과 하이라이트 전달) [S7][S17].
- Chem3D는 **Windows 전용**이다. Mac에서는 ChemDraw만 지원한다 [S4][S6].

### 3.8 DB 검색 / 외부 연동

- **CAS SciFinder**(SciFinder-n. Classic SciFinder는 23.0에서 제거), **Elsevier Reaxys** 검색, ChemACX Explorer, Google Patents/Scholar 애드인, **PubChem GHS Safety 애드인**, **ChemDraw Add-ins SDK** 및 Dynamic Download [S4][S7].
- 애드인 뷰는 IE11 기반에서 **WebView2(Edge)** 로 바뀌었다(23.0) [S4].
- Reaxys 웹 UI 자체도 ChemDraw JS를 구조 편집기로 쓴다(Elsevier 지원 문서 "Introduction to ChemDraw JS", 스니펫) [S13].

### 3.9 Microsoft Office 연동

- **OLE 객체**로 복사/삽입(Windows). Word/PowerPoint 안에 OLE로 묻힌 ChemDraw를 제자리에서 편집 [S7][S19].
- 21.0: PowerPoint에 3D 구조를 원클릭으로 넣고 애니메이션으로 공유 [S14].
- ChemDraw Collections(Signals ChemDraw 전용): Word/PowerPoint/Excel 문서와 클라우드 Office 문서 안의 구조를 검색하고 drill-down, Signals Notebook 실험 검색, PowerPoint 반응·분자 리포트 슬라이드 자동 생성, SD(v2000/v3000) 내보내기 [S7].
- **ChemDraw for Excel**(Windows): CombiChem, Name↔Structure, ClogP/CMR, Molecular Networks 물성 [S7].
- 지원 Office(26.0): Windows는 Office 365/2021/2024(32/64-bit), Mac은 Office 365/2021/2024 [S6].

### 3.10 클라우드·협업

- **ChemDraw+**(23.0 도입): 대시보드(최근 항목/즐겨찾기), Drawings·Notebooks·Favorites 탭을 갖추고, 그림은 **Signals Notebook**에 저장된다. 데스크톱과 왕복 편집하며, 데스크톱 Open/Save 대화상자에서 Signals 클라우드와 로컬을 오갈 수 있다 [S4][S7].
- Signals 메뉴: 구독에 따라 ChemDraw+, Signals Notebook, Inventory, HELM Monomer Curation 등을 띄운다 [S4].
- **실시간 동시 편집**(Google Docs식)은 공식 자료에서 **확인되지 않음(미확인)**. 확인되는 협업 방식은 Signals 노트북/공유 라이브러리 기반의 비동기 공유다.
- 2026-11-19 웹세미나 예고: **Collections가 ChemDraw+에 곧 들어간다**(스니펫) [S26].

### 3.11 AI 기능

- **Enhanced Retrosynthesis**: 과거 Professional에 있던 역합성 도구로, 23.0에서 **제거**되었다 [S4].
- **"ChemDraw Copilot"**: 이런 이름의 제품이나 기능은 **찾지 못함(미확인/존재 근거 없음)**.
- **Signals Xynthetica**(2025-12 발표): AI 증강 분자·소재 설계 플랫폼(de novo 생성, 물성 예측, 다목적 최적화)이다. Signals One, Signals Synergy와 함께 **Signals ChemDraw 내부에서 Models-as-a-Service로 제공**된다고 했다. 역합성 언급은 없다(스니펫) [S23].
- **Signals AI**(2026-06-22): Signals One에 내장된 "native agentic framework"다. 자연어 검색·질의, 분자·서열 인터랙티브 뷰, 추적 가능한 출력을 내세운다. 보도자료에 ChemDraw 직접 언급은 없다 [S24].
- **Claude MCP 커넥터**(2026-07-01): Revvity Signals가 Anthropic MCP 커넥터 디렉터리에 합류했다. Claude 커넥터 페이지는 이 서버가 "Signals, **ChemDraw**, BioDesign 등의 과학 지식"을 활용한다고 설명한다 [S25][S38].
- 대학 배포 페이지(Strathclyde, ChemDraw 24.0)에는 "제3자 AI 기능이 포함될 수 있음"이라는 고지가 붙어 있다. 그러나 이 고지가 ChemDraw의 특정 AI 기능을 가리키는지는 **미확인**이며, 대학 공통 문구일 가능성이 높다 [S28].
- 2026 신제품군(실적 발표): Signals Logistics(AI 네이티브), Xynthetica, BioDesign, Signals AI, Anthropic 커넥터 [S22].
- ACD/Labs Essentials 번들: Revvity Signals 홈페이지가 "ChemDraw를 ACD/Labs의 설계·예측·분석 도구로 강화"하는 번들을 홍보한다. 기존 ChemDraw 사용자에게는 할인을 제공한다(스니펫) [S27].

---

## 4. 기술 사실

### 4.1 플랫폼과 시스템 요구사항 (26.0 Hardware & Software Guide, 2026-04-23)

- **Windows 10/11 64-bit**와 .NET Framework 4.8. **macOS Sequoia 15.7.4, Tahoe 26.4.1**(Mac은 ChemDraw만) [S6].
- RAM 최소 2 GB(권장 3 GB), CPU 1.6 GHz(권장 3.0 GHz 듀얼), 디스크 1–4 GB(전체 앱 4 GB, 권장 10 GB), 해상도 1024×768 [S6].
- 25.0부터 **ARM(Apple Silicon) Mac 네이티브**를 지원한다(스니펫) [S5]. Sequoia 클린 설치에서 라이선스 활성화가 안 되던 문제가 있었다(Michigan KB, 시점 불명) [S31].
- 23.0 설치 관리자는 3종(ChemDraw_Suite / ChemDraw / ChemDraw_Applications)이고, Mac은 `cd23.0.0.dmg` 하나다. All Users와 Current User 설치를 고를 수 있고, Signals 계정이면 **자동 업데이트**된다 [S4].
- 일본어 현지화가 제공된다(릴리스 검증 범위에 포함) [S4][S17].

### 4.2 구현 단서

- Revvity 채용공고("Principal Software Engineer, ChemDraw (C++, Web Development, TypeScript)", 2026-05 마감)의 요구 기술은 데스크톱 **C/C++/C#/Python**, 웹 **HTML/JS/TypeScript/CSS**이고, 우대 항목은 Win32, WinForms, **Cocoa**, SwiftUI, **Qt**, GTK, IDE는 Visual Studio Code와 **Xcode**다. 업무는 "데스크톱 기능을 Signals 온라인 환경으로 확장"하는 것이다 [S39].
  - 해석: 코어는 C++이고, Mac은 Cocoa 네이티브일 가능성이 있다. **MFC/Qt 사용 여부는 미확인**(Qt는 우대 항목일 뿐).
- 23.0의 Chem3D 메뉴는 125% 이상 스케일에서 왜곡되는 알려진 이슈가 있어 "Chem3D 컴포넌트 업데이트로 수정 예정"이라고 했다. 제3자 UI 컴포넌트를 쓴다는 단서다 [S4].
- 64-bit와 32-bit ChemDraw 실행 파일이 함께 설치된다(22.0/23.0) [S4][S17].
- **ChemDraw JS**: HTML5/JavaScript 구현으로 최종 사용자 설치가 필요 없다. Structure clean-up과 포맷·이미지 변환에는 **별도 서버 측 컴포넌트(REST)** 가 필요하다. 17.1부터 초기화할 때 **라이선스 파일**이 있어야 한다. API 예로 `findReactions`, `getProperties`, `getSVG`, `getMolecularWeight`, `nameToStructure`, `structureToName`이 있다(Revvity FAQ, 스니펫) [S13]. **WebAssembly 사용 여부는 미확인**.
- ChemDraw JS(구 ChemDraw Direct)는 2022년까지 웹앱이 무료였고, 라이브러리로 쓰려면 별도 라이선스가 필요했다 [S1].
- **ActiveX 컨트롤/플러그인**: 23.0 검증 대상에 "Browsers for ActiveX Controls: MS Edge 120 (IE Mode)"가 있다 [S4].

### 4.3 파일 포맷

- 네이티브: **CDX**(바이너리)와 **CDXML**(XML, Revvity가 권장) [S1].
- 읽기/쓰기: SKC(ISIS Sketch), MOL/SDF(V2000/V3000), RXN(V2000/V3000), RDF, CIF(읽기, 22.0부터 `chem_comp_atom` 리간드 스키마 지원), JCAMP/Galactic 스펙트럼(읽기) [S7][S17][S19].
- 이미지: GIF, JPEG, BMP, PNG, TIFF, **SVG**, **EPS**, 3D 프린팅용 **3MF** [S1][S7].
- 클립보드: CDXML, MOL(V2000/V3000), SMILES, **SLN(SYBYL)**, InChI/InChIKey(복사), HELM, FASTA(펩타이드/DNA/RNA), OLE [S7].
- **MOL V3000이 기본 MOL 내보내기 형식**이 되었다(23.0) [S4].
- CDXML DTD 위치: 원래 `camsoft.com/xml/cdxml.dtd`였고 23.0부터 **`https://static.chemistry.revvitycloud.com/cdxml/CDXML.dtd`** 로 옮겨 doctype에 기록한다 [S4][S11].
- PNG/EMF 안에 cdx를 심는 방식(OLE 그림 안에 원본 데이터 보존)은 업계에 널리 알려진 관행이지만 이번 조사에서 공식 문서로는 **미확인**.

### 4.4 CDX 바이너리 포맷 세부 (공식 SDK 아카이브)

- 헤더 28바이트: 시그니처 `VjCD0100`(56 6A 43 44 30 31 30 30) + 예약 `04 03 02 01` + 0으로 채운 16바이트 [S9].
- **Little-endian**. Mac(빅엔디언 시절)은 바이트를 뒤집어야 했다 [S9].
- **Property**: 2바이트 태그(bit15=0, bit14=0은 사전정의, 1은 사용자 정의) + 2바이트 길이(0xFFFF면 뒤따르는 4바이트가 실제 길이) + 데이터. 예: `06 00 02 00 02 00` = Bond Order 2(이중결합) [S9].
- **Object**: 2바이트 태그(bit15=1) + 4바이트 ID(0이면 ID 없음, 문서 전체에서 유일하게 쓰기를 권장) + 하위 property/object + `00 00` (EndObject). 파일 끝도 `00 00` [S9].
- 태그 공간: 사전정의 property 16,383개, 사용자 정의 16,384개(object도 같음) [S9].
- 객체 예: `kCDXObj_Fragment = 0x8003`(CDXML "fragment"), `kCDXObj_ObjectTag = 0x8011`(임의 객체에 붙이는 이름 태그, "/CS/CD/" 접두사는 내부 예약), `kCDXProp_ObjectTag_Tracking = 0x0D03` [S10].
- CDXML은 같은 객체/속성 트리를 XML로 쓴 것이다. 객체명은 대소문자를 구분하고 숫자는 따옴표로 감싼 텍스트로 저장한다. 예: `<b id=".." B=".." E=".." Order="2" DoublePosition=".."/>` [S11].
- **SDK 상태**: "ChemDraw SDK는 더 이상 Revvity Signals가 호스팅·유지·제공하지 않는다(2024-10-23)". 2019년 Wayback 아카이브에서 복원한 사본을 St. Olaf(chemapps.stolaf.edu)와 IUPAC FAIRSpec GitHub이 보존하고 있으며, Revvity는 그 내용과 무관하다고 밝혔다 [S10].

### 4.5 ChemScript / API

- ChemScript는 21.0부터 실행 파일에 통합되었다(별도 설치 불필요) [S4].
- Python 지원: 22.0/23.0은 3.9·3.10. 2026-05 Dot Chart 기준으로는 **3.14, 3.13, 3.12, 3.10, 3.9**를 지원한다. 25.5의 "ChemScript Python 지원 확장"이 이에 해당한다 [S4][S5][S7].
- .NET: 검증 대상에 "Visual C# for ChemScript: 2022, Visual Studio 2022"가 있어 C# API가 존재함을 알 수 있다 [S4]. 구체적인 클래스 API(StructureData 등)는 **미확인**.
- ChemFinder의 Python 스크립팅 버튼이 동작하지 않는 문제가 23.0의 알려진 이슈였다 [S4].
- ChemDraw Add-ins SDK(애드인 생태계)가 있다 [S7]. Signals 플랫폼 API(REST)는 Signals Notebook 차원에 존재하는 것으로 알려져 있으나, ChemDraw+ 전용 공개 API는 **미확인**.

---

## 5. 시장 위치

- **사용자 수 주장**: Revvity Signals 웹사이트는 "1M worldwide users", 블로그는 "millions of other ChemDraw users"라고 쓴다(스니펫) [S40]. 2022년 V21 보도자료는 "PerkinElmer 인포매틱스 포트폴리오 사용자 200만+ 과학자"라고 했는데, 이는 ChemDraw 단독 수치가 아니다 [S14]. 2015년 보도자료는 "No. 1 Chemical Structure Drawing Tool"이라고 했다 [S12]. Evans의 2014년 에세이는 유기화학계의 "dominant vehicle"이라고 표현했다 [S3]. 독립적인 시장점유율 데이터는 **미확인**.
- **고객층**: 학계(사이트 구독), 제약·바이오, 화학, 정부. USPTO 화합물 제출 표준 도구로 언급되며, 2015년 당시 E-Notebook, Elements, Lead Discovery(Spotfire)에 내장되었다 [S12].
- **Revvity 재무 맥락**: Revvity 2025년 매출 29억 달러, 직원 약 11,000명 [S25]. Signals 소프트웨어는 2026년 3분기 10%대 후반 성장, ARR 20%+ 성장, ACD/Labs가 2026년 매출 성장에 약 0.75%p를 보탤 것으로 예상된다 [S22].
- **경쟁/대안**: ChemDoodle(기관 무제한 연 $999), MarvinSketch(ChemAxon, 학계 무료), MolView(무료), ChemSketch(ACD/Labs, 이제 Revvity 소유이며 신규 판매 중단) [S27][S33].
- **불만·비판**:
  - 가격: "ridiculously expensive" 같은 리뷰(스니펫) [S33].
  - 라이선스 강제 전환: 영구 라이선스 종료(2025-01), 영구 유지보수 갱신 종료(2026-07), 구버전 EOL(2026-09), 포털 재등록(2026-04), 새 로그인 활성화 절차(v25) 등 사용자 부담이 잇따랐다 [S15][S16][S30][S31].
  - 서비스 종료에 따른 데이터 이전 부담: ChemDraw Cloud/Signals Notebook Individual이 2025-03-25 종료되었고, 백업하지 않으면 데이터가 삭제되었다 [S29].
  - Mac 기능 격차: Chem3D, ChemFinder, ChemDraw for Excel, ChemScript가 Windows 전용이고, pKa/LogS와 cLogP도 Windows 전용이다 [S4][S7]. Sequoia 활성화 문제도 있었다 [S31].
  - 23.0 출시 당시 SciFinder-n 애드인이 동작하지 않았다(제3자 업데이트 대기) [S4].
  - 경쟁 제품 흡수: ACD/Labs 인수 직후 무료/저가 대안이던 ChemSketch 신규 판매를 중단했다 [S27]. 이에 대한 커뮤니티 반응(논란 규모)은 **미확인**.
  - Reddit 등 커뮤니티 불만 스레드는 직접 확인하지 못했다(**미확인**).

---

## 6. 최신 릴리스 노트 상세와 로드맵

### 6.1 23.0 (노트 2024-01-18) — 큰 전환점

Signals ChemDraw와 ChemDraw+를 도입했고 Signals 라이선스(30일 오프라인)를 시작했다. 그 밖에 Revvity 리브랜딩, 자동 업데이트, 사용자별 설치, MOL V3000 기본값, smart paste, CDXML DTD 이전, Classic SciFinder 제거, HELM cartoon 기본화와 Labeled Monomers 스타일, 기본 Blob, Dark Mode, Atom ID, ChemDraw Cloud 메뉴 제거, WebView2, 반응 인식 개선, enhanced stereo 경고 토글, **Enhanced Retrosynthesis 제거**, ChemDraw Collections(구 ChemOffice+) 설치 파일 동봉이 포함되었다. 검증 환경은 Win10/11, macOS 13.6/14.2, Office 2019/2021/365다 [S4].

### 6.2 23.1 (2024)

HELM과 문서 수준 annotation을 개선했다. 세부는 **미확인**(스니펫) [S5].

### 6.3 24.0

공식 릴리스 노트는 **미확인**. 대학 배포 페이지(Strathclyde)에서 존재만 확인했다 [S28].

### 6.4 25.0 (2025)

대분자 그리기와 상보 가닥, 웹 편집기 사용성 개선, coordination/dative 결합 통합, 사용자 단량체 라이브러리에 단일 단량체 추가, ARM Mac 네이티브를 담았다(스니펫) [S5].

- ChemDraw JS 25.0.1(2025-06-27): 무한 캔버스, UI 전면 재설계, Properties/Query/Guided Stereo 패널, Join 도구 [S1][S13].

### 6.5 25.5

물성 계산, HELM 처리, ChemScript Python 확장, 버그 수정. 검증 OS는 macOS 15.7.2와 Tahoe 26.0.1이다(스니펫) [S5].

### 6.6 26.0 (2026 상반기)

물성 계산 효율화(LogP 150 heavy atoms / 50 F, 기타 1,000 atoms), Analysis 패널 pKa 예측, hairpin 서열(펼침/접기, pendant 부착; Professional·Signals), 다중 상보 가닥 연결, 가교 렌더링 개선, IUPAC 2024 원자량, stereo bond 경고, ChemScript Python 3.9–3.14 지원 [S5][S7].

### 6.7 26.1 (2026-09-28)

Prime/Professional/Signals ChemDraw 업데이트로 발표되었다. 세부 내용은 **미확인**(지원 사이트 403) [S26].

### 6.8 Signals ChemDraw+ (웹) 2026

- 26.3(2026-04): ChemDraw 설치 파일 checksum을 Signals Home 포털에서 제공, HELM Monomer Curation 구조검색 버튼 [S5].
- 26.4(2026-05): 노트북 속성, 그림·노트북 목록 컬럼 필터, 다중가닥·분지 바이오폴리머 cleanup [S5].
- 2026-05 Dot Chart의 웹 신기능: MOL/SD/RXN/RD import, MOL/SD/RXN export, 드래그앤드롭, Atom Number 표시, 하이라이트 색, hairpin 생성, 노트북·그림 설명 편집, WCAG 2.1 AA [S7].

### 6.9 로드맵 단서

1. **데스크톱 기능의 웹 이전 가속**: 채용공고의 핵심 업무이고, Dot Chart의 Web 전용 기능 수가 늘고 있다 [S7][S39].
2. **Collections의 ChemDraw+ 이식**: 2026-11 웹세미나에서 "coming soon"으로 예고되었다 [S26].
3. **AI 계층 결합**: Xynthetica 모델을 Signals ChemDraw 안에서 제공하고, Signals AI와 Claude MCP 커넥터가 ChemDraw를 지식원으로 쓴다 [S23][S25][S38].
4. **ACD/Labs 기술 통합**: 분광 예측, 명명, 물성 예측 쪽 강화가 예상되나 구체 일정은 **미확인** [S20][S27].
5. **바이오폴리머(올리고뉴클레오타이드, 펩타이드) 집중**: 25–26 릴리스에서 HELM 관련 항목이 가장 많다 [S5][S7].
6. **구독·클라우드 단일화**: 영구 라이선스 종료, 구버전 EOL, Signals 로그인 라이선스로 이어지는 흐름이다 [S15][S16].

---

## 7. 미확인 항목 정리

- Revvity Signals 매각/분사(예: Symphony Technology Group): 근거 없음.
- "ChemDraw Copilot" 또는 ChemDraw 단독 AI 기능(이미지→구조, AI 역합성): 근거 없음. Enhanced Retrosynthesis는 23.0에서 제거됨.
- ChemDraw 24.0 릴리스 노트 내용, 26.1 상세 내용.
- 데스크톱 UI 프레임워크(MFC/Qt 여부), ChemDraw JS의 WebAssembly 사용 여부.
- ClogP 엔진의 BioByte 출처, 현행 NMR 엔진이 ChemNMR 계열인지 여부.
- 실시간 동시 편집 기능.
- 공식 정가, 정확한 대학 가격 출처 페이지($64/$70), $525 리뷰 출처.
- PNG/EMF 안에 cdx를 심는 방식의 공식 문서.
- ChemScript 클래스 단위 API 문서(현행).

---

## 8. 출처 (Sources)

- [S1] Wikipedia, "ChemDraw" — https://en.wikipedia.org/wiki/ChemDraw
- [S2] Compound Interest (Andy Brunning), "Celebrating 40 years of ChemDraw" 타임라인 PDF, 2025 — https://www.compoundchem.com/wp-content/uploads/2025/07/ChemDraw-timeline.pdf
- [S3] D. A. Evans, "History of the Harvard ChemDraw Project," Angew. Chem. Int. Ed. 2014 (DOI 10.1002/anie.201405820) — https://zendy.io/title/10.1002/anie.201405820 ; ChemistryViews 요약 — https://www.chemistryviews.org/?p=37433 ; Xconomy (PerkinElmer acquires CambridgeSoft) — https://legacy.xconomy.com/?p=129067 ; CB Insights — https://www.cbinsights.com/investor/cambridgesoft
- [S4] Revvity Signals, "ChemDraw Suite 23.0 Release Notes" (2024-01-18), Univ. of Oslo 미러 — https://www.mn.uio.no/kjemi/tjenester/it/hjelp2/chemdraw/chemdraw-suite-v23.0-release-notes.pdf (원본: https://revvitysignals.com/sites/default/files/2024-02/rs-release-notes-DT-23.0-chemdraw.pdf)
- [S5] Revvity Signals 지원/What's New (검색 스니펫): 23.1 https://support.revvitysignals.com/hc/en-us/articles/26012268117780 ; 25.0 https://support.revvitysignals.com/hc/en-us/articles/38808816928788 ; 25.5 https://support.revvitysignals.com/hc/en-us/articles/43934842634004 ; 26.0 https://support.revvitysignals.com/hc/en-us/articles/49632553670676 ; What's New https://revvitysignals.com/whats-new/Signals%20ChemDraw?expand=all ; https://revvitysignals.com/signals-chemdraw-whats-new
- [S6] Revvity Signals, "ChemDraw 26.0 Hardware & Software Guide" (2026-04-23) — https://assets.revvitysignals.com/asset/455df079-8d90-4706-96b9-d9ea28b1a7ce/ChemDraw-Desktop-Requirements-Hardware-Software-Guide.pdf
- [S7] Revvity, "ChemDraw Suite of Products" Full Dot Chart 데이터시트 (2026-05) — https://assets.revvitysignals.com/asset/0b9656e8-339d-47ab-9834-6c08beb6abee/Full-Dot-Chart-ChemDraw-Suite-of-Products.pdf
- [S8] PerkinElmer/Revvity "Launching Revvity" 보도자료 — https://s202.q4cdn.com/560601150/files/doc_news/Launching-Revvity-A-Scientific-Solutions-Company-Powering-Innovation-from-Discovery-to-Cure.pdf ; BioSpectrum — https://biospectrumindia.com/news/60/23068/perkinelmer-announces-launch-of-revvity-as-new-science-based-solutions-company.html ; LIMSwiki — https://limswiki.org/index.php/Vendor:Revvity_Signals_Software,_Inc. ; MD+DI/PatSnap — https://synapse.patsnap.com/news-detail/4ba32e6b-ed6e-340d-bed4-02668bfcdb1d-a-bold-new-beginning-for-pes-life-sciences-diagnostic-units
- [S9] CambridgeSoft CDX SDK, "The CDX binary file format" (St. Olaf 아카이브) — https://chemapps.stolaf.edu/iupac/cdx/sdk/IntroCDX.htm
- [S10] CDX SDK 객체 문서 — https://chemapps.stolaf.edu/iupac/cdx/sdk/Fragment.htm , https://chemapps.stolaf.edu/iupac/cdx/sdk/AllCDXObjects.htm , https://chemapps.stolaf.edu/iupac/cdx/sdk/properties/ObjectTag_Tracking.htm ; IUPAC FAIRSpec CDX SDK 페이지 — https://bobhanson.github.io/IUPAC-FAIRSpec/cdx_sdk
- [S11] CDX SDK, "The CDXML text-based file format" — https://chemapps.stolaf.edu/iupac/cdx/sdk/IntroCDXML.htm
- [S12] PerkinElmer 보도자료, "ChemDraw Software Marks 30-Year Milestone…" (2015-06-22) — https://news.revvity.com/press-announcements/press-releases/press-release-details/2015/PerkinElmers-ChemDraw-Software-Marks-30-Year-Milestone-with-Launch-of-Enhanced-Solution-06-22-2015/default.aspx ; Duke OIT — https://oit.duke.edu/help/articles/kb0022574/
- [S13] ChemDraw JS: Revvity FAQ PDF — https://revvitysignals.com/sites/default/files/2024-12/rs-faq-ChemDraw_JavaScript.pdf ; JS v17.1 릴리스 — https://support.revvitysignals.com/hc/en-us/articles/4408268607380 ; JS 25.0.1 — https://support.revvitysignals.com/hc/en-us/articles/38809304211220 ; Elsevier "Introduction to ChemDraw JS" — https://supportcontent.elsevier.com/RightNow%20Next%20Gen/Reaxys/Introduction_to_ChemDraw_JS.pdf ; 공개 예제 — https://composarc.github.io/ChemDraw-JS-Public-Examples
- [S14] PerkinElmer 보도자료, "ChemDraw V21…PowerPoint Reports" (2022-03-02) — https://www.businesswire.com/news/home/20220302005204/en ; https://www.labmanager.com/creating-chemically-intelligent-microsoft-powerpoint-reports-27879
- [S15] Revvity 지원 공지(영구 라이선스 종료, 2025-01-01) — https://support.revvitysignals.com/hc/en-us/articles/29262741344532 ; 일본어판 https://support.revvitysignals.com/hc/en-us/articles/29601036591380
- [S16] Revvity Sunset Notice ChemDraw 20.x–22.x — https://support.revvitysignals.com/hc/en-us/articles/41748536567572 ; 영구 유지보수 종료(2026-07-01) — https://support.revvitysignals.com/hc/en-us/articles/49430557118996 ; iPad 앱 철수 — https://support.revvitysignals.com/hc/en-us/articles/4408268410900 ; Franklin OIT — https://franklinoit.atlassian.net/wiki/spaces/FOKFC/pages/582353233/Licensing+and+Installing+Revvity+Signals+ChemDraw
- [S17] PerkinElmer, "ChemOffice v22.0 Release Notes" (2022-09-14), Univ. of Oslo 미러 — https://www.mn.uio.no/kjemi/tjenester/it/hjelp2/chemdraw/chemoffice-v22.0-release-notes.pdf
- [S18] Revvity 보도자료, "Revvity Signals Software Introduces Signals ChemDraw Offering…" (2024-03-18) — https://s202.q4cdn.com/908952201/files/doc_news/Revvity-Signals-Software-Introduces-Signals-ChemDraw-Offering-to-Set-New-Standard-for-Cloud-Native-Chemistry-Communication-2024.pdf
- [S19] ADDITIVE GmbH(재판매사) ChemDraw 페이지 — https://www.additive-net.de/en/software/produkte/revvity-signals/chemdraw
- [S20] Revvity의 ACD/Labs 인수 발표 (2025-11-10) — https://www.businesswire.com/news/home/20251110692197/en ; https://www.drugdiscoverynews.com/revvity-to-acquire-acd-labs-to-expand-its-signals-software-capabilities-16798 ; https://www.nasdaq.com/articles/revvity-acquire-acd-labs-undisclosed-sum
- [S21] Lab Manager, Revvity Q1 2026 — https://www.labmanager.com/revvity-outperforms-in-q1-2026-driven-by-pharma-rebound-and-strategic-portfolio-shifts-35337 ; Simply Wall St (Signals for Startups) — https://simplywall.st/stocks/us/pharmaceuticals-biotech/nyse-rvty/revvity/news/how-revvitys-rvty-startup-software-push-and-esg-disclosures
- [S22] Revvity Q3 2026 실적 발표 녹취 — https://www.tradingkey.com/news/transcripts/262268568- ; https://finance.yahoo.com/healthcare/articles/revvity-inc-q3-2026-earnings-182748720.html
- [S23] Signals Xynthetica 발표(2025-12) — https://www.businesswire.com/news/home/20251216271078/en ; https://www.labmanager.com/revvity-introduces-signals-xynthetica-to-advance-ai-augmented-discovery-34985 ; https://biospectrumindia.com/news/16/27101/revvity-introduces-ai-augmented-design-platform-for-molecular-and-materials-discovery.html
- [S24] Revvity 보도자료, "Revvity Launches Signals AI, a Native Agentic Framework…" (2026-06-22) — https://news.revvity.com/press-announcements/press-releases/press-release-details/2026/Revvity-Launches-Signals-AI-a-Native-Agentic-Framework-for-Accelerating-Scientific-RD/default.aspx
- [S25] Revvity 보도자료, "Revvity Expands Signals AI Ecosystem Through Anthropic Claude Integration" (2026-07-01) — https://s202.q4cdn.com/908952201/files/doc_news/Revvity-Expands-Signals-AI-Ecosystem-Through-Anthropic-Claude-Integration-2026.pdf
- [S26] ChemDraw Desktop 26.1 릴리스 공지(스니펫) — https://support.revvitysignals.com/hc/en-us/articles/54009539308052-Release-Announcement-ChemDraw-Desktop-26-1 ; ChemDraw Connect 웹세미나 — https://revvitysignals.com/chemdraw-connect
- [S27] ACD/Labs, "ChemSketch Is No Longer Available to New Customers" — https://www.acdlabs.com/?p=18442 ; ACD/Labs Essentials 페이지(현재 Revvity로 301) — https://www.acdlabs.com/products/chemdraw-is-better-with-acd-labs-essentials/ ; Revvity Signals 홈 — https://revvitysignals.com/
- [S28] Univ. of Strathclyde, ChemDraw 24.0 다운로드 페이지 — https://www.strath.ac.uk/professionalservices/is/software/chemdraw240-windows/
- [S29] Univ. of Pittsburgh IT, "ChemDraw Retirement March 25; User Action Required" — https://status.pitt.edu/incidents/7xcfzrwvw07z
- [S30] Universität Heidelberg URZ, ChemDraw 포털 재등록 공지(2026-04-02) — https://www.urz.uni-heidelberg.de/en/newsroom/new-registration-on-the-chemdraw-portal-is-required-to-continue-using-the-software-beyond-april-2
- [S31] Univ. of Michigan KB(스니펫) — https://teamdynamix.umich.edu/TDClient/30/Portal/KB/Article/14094/ChemDraw-25-Activation-on-Sites-Computers ; https://miworkspace.atlassian.net/wiki/x/JAASsQ
- [S32] 대학 라이선스/가격 페이지(스니펫) — https://doit.missouri.edu/services/software/software-sales/chemoffice/ ; https://rc.partners.org/news-events/announcements/chemdraw-licenses-available-purchase ; https://webstore.illinois.edu/shop/product.aspx?zpid=7150 ; https://alternativeto.net/software/chemdraw/about
- [S33] ConceptViz, "Best free ChemDraw alternatives for teachers" — https://conceptviz.app/blog/best-free-chemdraw-alternatives-for-teachers ; Capterra — https://www.capterra.com/p/10020058/Signals-ChemDraw/ ; ChemDoodle — https://chemdoodle.com/
- [S34] Revvity 지원 (ACS 1996 설정값) — https://support.revvitysignals.com/hc/en-us/articles/4408234173332 ; Wikipedia MOS Structure drawing — https://wikipedia.com/wiki/MOS:Structure_drawing
- [S35] CS ChemDraw 2004 도움말, "ChemNMR Limitations" — https://people.stfx.ca/blynch/CS%20ChemOffice%202004/CS%20ChemDraw/CS%20ChemDraw%20Help/CD8appe2.html
- [S36] Anthropic 평가 문서(스니펫) — https://www-cdn.anthropic.com/07441e654ad3dfeb0cd090e9361511562825d012.pdf
- [S37] Revvity 지원 (Chem3D MM2/MMFF94) — https://support.revvitysignals.com/hc/en-us/articles/4408232498964 ; https://support.revvitysignals.com/hc/en-us/articles/7512809944596
- [S38] Claude 커넥터 디렉터리, "Revvity Signals AI" — https://claude.com/connectors/revvity-signals-ai
- [S39] Revvity 채용공고, "Principal Software Engineer, ChemDraw (C++, Web Development, TypeScript)" (Built In 미러) — https://builtin.com/job/principal-software-engineer-chemdraw-c-web-development-typescript-remote-us/8591730
- [S40] Revvity Signals 블로그 "The Evolution of ChemDraw"(스니펫) — https://revvitysignals.com/blog/evolution-chemdraw ; Revvity Signals 홈 — https://revvitysignals.com/
