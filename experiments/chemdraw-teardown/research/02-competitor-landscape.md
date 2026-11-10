# 02. ChemDraw 경쟁/유사 제품 지형도 (Competitor Landscape)

- 작성일: 2026-11-10
- 범위: 화학 구조 그리기(sketcher/editor)와 그 주변 도구(name↔structure, image→structure, 3D 편집, 웹 컴포넌트, 모바일, AI 신규 진입자)
- 조사 방법: WebSearch/WebFetch, npm registry API(버전·라이선스·최종 배포일), ungh.cc GitHub 미러 API(스타 수·최종 push일, 2026-11-10 기준)
- 표기 규칙: 출처로 확인하지 못한 주장은 **"미확인"**으로 표시했다. 기술 스택 중 공식 문서로 확인하지 못하고 일반 지식으로 적은 항목도 "(미확인)"을 붙였다.
- 비교 기준(baseline): **Revvity Signals ChemDraw** (Desktop 26.x, Signals ChemDraw, ChemDraw+ 웹, ChemDraw JS)

---

## 0. 핵심 요약 (TL;DR)

1. **업계 재편이 크다.** 2024년 Certara가 Chemaxon을 인수했다. 2025년 7월에는 Siemens가 Dotmatics 인수를 마쳤다(EV $5.1B). 2026년 1분기에는 **Revvity가 ACD/Labs를 인수**했다($72M + 조건부 최대 $8M). 그 결과 ChemDraw와 ChemSketch를 같은 회사(Revvity)가 갖게 되었다. ACD/Labs 사이트의 "ChemSketch 구매" 페이지는 이제 Revvity ChemDraw 페이지로 301 리다이렉트된다.
2. **ChemDraw는 2025-01-01부로 영구 라이선스를 중단하고 구독 전용이 되었다.** 이 결정이 무료·저가 대안으로 옮겨 갈 동기를 키웠다.
3. **Chemaxon Marvin JS는 EOL이 확정됐다.** 신규 구매는 2026-12-31, 지원은 2027-12-31에 끝난다. 후속 제품은 웹 전용의 "새 Marvin"(Marvin Cloud, 2026-09-29 전 세계 출시 / Enterprise / Partners)이다. Benchling과 Reaxys처럼 Marvin JS를 넣은 서비스는 2027년까지 교체를 결정해야 한다. **임베더블 웹 스케처 시장의 공백**이 생긴다.
4. **오픈소스 웹 스케처는 사실상 Ketcher(EPAM, Apache-2.0)가 표준이다.** npm `ketcher-react` 3.18.0(2026-09-02)이 최신이고, CDD Vault·Chemotion·Datagrok·Labii 등이 채택했다. 2026년에는 Schrödinger가 RDKit 기반 **Sketcher를 BSD-3로 공개**해 새 경쟁 축이 생겼다.
5. **무료 "ChemDraw 대체" 데스크톱/웹이 늘고 있다.** Zoho ChemStudio(무료, CDX/CDXML 내보내기, NMR, ADME, 이름→구조), KingDraw(중국, 무료, CDX 저장), MolDraw(무료 웹, CDXML 내보내기, AI 보조)가 대표적이다.
6. **AI 쪽은 "그리기"보다 주변 기능에 몰려 있다.** image→structure(Mathpix, DECIMER, MolScribe, MolNexTR, KingDraw AI 인식), 대화형 보조(ChemStitch, MolDraw AI, ChatGPT 앱 "Draw molecular structures"), LLM 기반 합성 전략(EPFL Synthegy, Revvity Xynthetica MaaS)이 이에 해당한다. **ChemDraw 자체의 AI 기능은 2025-09 기준 "제안형 AI(반응 조건 제안)" 단계적 개발 중**이다. ChemDraw에 OCSR(image→structure)이 내장됐다는 공식 근거는 찾지 못했다(미확인).

---

## 1. 대형 비교 매트릭스

범례: ● 지원 / ◐ 부분·제한 / ○ 미지원 / ? 미확인. "CDX/CDXML"은 R=읽기, W=쓰기.

### 1-A. 상용·프리웨어 제품 (데스크톱/웹/플랫폼 내장)

| #   | 제품                                                   | 벤더(소유)                          | 라이선스/가격                                                      | 플랫폼                                                              | 기술 스택(렌더링/엔진)                                          | 이름↔구조                        | NMR 예측                 | 물성 계산      | 바이오폴리머                   | 반응             | 3D               | CDX / CDXML                           | SDK/API                                | 상태                                                |
| --- | ------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------- | ------------------------ | -------------- | ------------------------------ | ---------------- | ---------------- | ------------------------------------- | -------------------------------------- | --------------------------------------------------- |
| 0   | **ChemDraw** (기준)                                    | Revvity Signals                     | 구독 전용(2025-01~), 가격 비공개                                   | Win/Mac, 웹(ChemDraw+), ChemDraw JS                                 | C++ 데스크톱(미확인), 웹 JS                                     | ●                                | ●(Professional)          | ●              | ●(HELM, 26.x 다중가닥 cleanup) | ●                | ●(Chem3D)        | R/W 네이티브                          | ChemScript(Python), ChemDraw JS        | 활성(26.4, 2026-05)                                 |
| 1   | Marvin (Desktop Suite / Cloud / Enterprise / Partners) | Chemaxon(Certara)                   | 개인 비상업 무료(데스크톱), Cloud 구독(14일 체험), Enterprise 견적 | Java 데스크톱, 웹                                                   | MarvinSketch=Java Swing(미확인), 신규 Marvin=웹                 | ●(이름→구조)                     | ●(1H/13C)                | ●              | ◐(폴리머·Markush)              | ●                | ◐                | R/W(MarvinSketch 문서)                | Enterprise 임베드, Partners API, JChem | 활성                                                |
| 2   | Marvin JS                                              | Chemaxon(Certara)                   | 상용(FreeWeb 2년 등)                                               | 웹                                                                  | JS(구 GWT 계열, 미확인)                                         | ◐(서버 경유)                     | ○                        | ◐              | ◐                              | ●                | ○                | 서버 변환 시 R/W(미확인)              | JS API                                 | **EOL**(판매 종료 2026-12-31, 지원 종료 2027-12-31) |
| 3   | ACD/ChemSketch (Freeware / 상용)                       | ACD/Labs(**Revvity**, 2026 Q1 인수) | 프리웨어(비상업 전용), 상용 → 신규 판매 중단 추정                  | Windows                                                             | Win32 네이티브(미확인)                                          | ●(상용 Name, 프리웨어 제한)      | ◐(별도 제품)             | ●              | ◐                              | ●                | ◐(3D Viewer)     | R(미확인)                             | ○                                      | 2025 버전, 신규 고객 판매 종료 정황                 |
| 4   | ChemDoodle 2D/3D                                       | iChemLabs                           | 유료 영구 라이선스(홈페이지에 2D+3D "$29" 표기, 조건 미확인)       | Win/Mac/Linux, Mobile 포함                                          | Java 데스크톱(미확인)                                           | ●(IUPAC 생성·파싱)               | ●(1H/13C 시뮬)           | ●              | ◐                              | ●                | ●(ChemDoodle 3D) | **R/W "thorough"**                    | ○(Web Components 별도)                 | 활성(v12.12.1)                                      |
| 5   | ChemDoodle Web Components                              | iChemLabs                           | **GPLv3** 또는 상용                                                | 웹                                                                  | JS, HTML5 Canvas + WebGL, v11에서 jQuery 제거                   | ◐(서버 연동)                     | ◐                        | ◐              | ○                              | ●                | ●                | R(CDX 뷰어 데모)                      | JS 라이브러리(npm 공식 배포 없음)      | 활성                                                |
| 6   | BIOVIA Draw                                            | Dassault Systèmes                   | 학계 무료(등록), 상용 유료                                         | Windows                                                             | Windows 네이티브(미확인), add-in SDK                            | ?                                | ○                        | ◐              | ●(서열 편집기, 커스텀 잔기)    | ●                | ○                | ?                                     | Add-in 개발 가능                       | 활성(2025 SP1)                                      |
| 7   | Schrödinger Sketcher                                   | Schrödinger                         | **BSD-3-Clause(OSS)** / LiveDesign 내장                            | 웹(WASM), 데스크톱(Maestro)                                         | C++20 + RDKit, CMake, wasm 디렉터리(Qt 여부 미확인)             | ?                                | ○                        | ◐              | ?                              | ●                | ○                | ?                                     | 웹 컴포넌트                            | 활성(GitHub 43★, 2026-11-10 push)                   |
| 8   | ChemWindow (KnowItAll)                                 | Wiley Science Solutions             | 유료, 캠퍼스 라이선스                                              | Windows                                                             | Windows 네이티브(미확인)                                        | ?                                | ◐(KnowItAll 스펙트럼 DB) | ◐              | ○                              | ●                | ○                | ?                                     | ReportIt 연동                          | 활성(KnowItAll 2025)                                |
| 9   | ISIS/Draw → Symyx Draw → Accelrys Draw                 | MDL → Symyx → Accelrys → BIOVIA     | 과거 학계 무료                                                     | Windows                                                             | —                                                               | —                                | —                        | —              | —                              | —                | —                | —                                     | —                                      | **단종**(BIOVIA Draw로 계승)                        |
| 10  | JSDraw (Scilligence)                                   | Scilligence                         | 상용 SDK(견적), JSDraw.Lite=LGPL-3                                 | 웹                                                                  | JS                                                              | ?                                | ○                        | ◐              | ●(HELM 모노머 관리)            | ●                | ○                | ?                                     | JS SDK, ELN/등록 시스템                | 활성(Lite 저장소는 2024 이후 정체)                  |
| 11  | Reaxys 구조 편집기                                     | Elsevier                            | Reaxys 구독에 포함                                                 | 웹                                                                  | **Marvin JS(기본) 또는 ChemDraw JS** 내장                       | ●                                | ○                        | ○              | ○                              | ●(반응 검색)     | ○                | 엔진에 따름                           | ○                                      | 활성. Marvin JS EOL 영향 받음                       |
| 12  | CAS SciFinder(-n) CAS Draw                             | CAS(ACS)                            | SciFinder 구독에 포함                                              | 웹                                                                  | 자체 CAS Draw + ChemDoodle 선택                                 | ●(이름/CAS RN/SMILES/InChI→구조) | ○                        | ○              | ○                              | ●(반응 질의)     | ○                | ◐(.cxf/.mol, ChemDraw 붙여넣기)       | ChemDraw add-in 연동                   | 활성                                                |
| 13  | Mnova (구조 편집)                                      | Mestrelab                           | 상용                                                               | Win/Mac/Linux                                                       | Qt(미확인)                                                      | ?                                | ●(Mnova NMRPredict)      | ◐              | ○                              | ○                | ○                | ?(ChemDraw 붙여넣기 일반적, 미확인)   | 스크립팅                               | 활성. 구조 편집은 보조 기능(미확인)                 |
| 14  | **KingDraw**                                           | 중국 KingDraw                       | 무료 주장(AlternativeTo는 Freemium 표기)                           | Win, Android, iOS, iPad                                             | 네이티브 앱(미확인)                                             | ●(구조↔IUPAC)                    | ?                        | ●              | ?                              | ●                | ●(3D 모델)       | **W(cdx 저장), CDX 호환성 개선 기록** | ○                                      | 활성                                                |
| 15  | InDraw                                                 | Integle(중국)                       | 미확인                                                             | 웹/데스크톱(미확인)                                                 | 미확인                                                          | ?                                | ?                        | ?              | ?                              | ?                | ?                | ?                                     | Labii 위젯 통합 언급                   | 활성(OCSR 내장, 원클릭 미화)                        |
| 16  | **Zoho ChemStudio**                                    | Zoho                                | **현재 무료**                                                      | 웹 + Win/macOS(AS·Intel)/Linux 데스크톱(오프라인), Zoho Writer 확장 | 미확인(Electron 추정, 미확인)                                   | ●(이름→구조, CAS ID 조회)        | ●(1H/13C 시프트 도구)    | ●(ADME 리포트) | ?                              | ●(화학량론 라벨) | ?                | **R/W CDXML, W CDX**                  | Writer 확장                            | 활성                                                |
| 17  | Molsoft ICM / MolEdit                                  | Molsoft                             | ICM 상용, MolEdit 웹                                               | Win/Mac/Linux, 웹                                                   | ICM 네이티브, MolEdit HTML5                                     | ?                                | ○                        | ●              | ?                              | ?                | ●(2D/3D 편집)    | ?                                     | ICM 스크립트                           | 활성                                                |
| 18  | StarDrop 2D sketcher                                   | Optibrium                           | 상용                                                               | Win/Mac/Linux                                                       | 미확인                                                          | ?                                | ○                        | ●(ADMET)       | ○                              | ○                | ◐                | ?                                     | Python                                 | 활성(스케처 엔진 미확인)                            |
| 19  | CDD Vault                                              | Collaborative Drug Discovery        | SaaS 구독                                                          | 웹                                                                  | **Ketcher**(이전에는 Marvin JS)                                 | ◐                                | ○                        | ●              | ?                              | ●                | ○                | Ketcher/Indigo에 따름                 | REST API                               | 활성                                                |
| 20  | Benchling Molecules                                    | Benchling                           | SaaS(애드온)                                                       | 웹                                                                  | **Marvin JS**                                                   | ◐                                | ○                        | ◐              | ●(생물학 엔티티는 별도)        | ?                | ○                | ?                                     | REST API                               | 활성. Marvin JS EOL 영향 받음                       |
| 21  | Elemental                                              | Dotmatics(**Siemens**)              | iOS 무료, 데스크톱·JS 플러그인은 Dotmatics 제품에 번들             | iOS, 데스크톱, JS                                                   | JS 플러그인                                                     | ?                                | ○                        | ●              | ○                              | ?                | ○                | ?                                     | Dotmatics 플랫폼                       | iOS 앱 정체(v2.1, 미확인)                           |
| 22  | Datagrok Chem                                          | Datagrok                            | 플랫폼 상용, 패키지 소스 공개                                      | 웹                                                                  | **OpenChemLib / Ketcher / Marvin JS 중 선택**, 렌더링 RDKit/OCL | ◐                                | ○                        | ●              | ●(Bio, HELM 패키지)            | ●                | ◐(NGL)           | 엔진에 따름                           | JS API(`datagrok-api`)                 | 활성                                                |
| 23  | PubChem Sketcher                                       | NCBI(Xemistry CACTVS)               | 무료                                                               | 웹                                                                  | **서버 사이드 CACTVS 스크립트**                                 | ●(이름/SMILES/InChI 입력)        | ○                        | ◐              | ○                              | ◐                | ○                | ?                                     | URL API                                | 활성(UI 노후)                                       |
| 24  | Mathpix Snip / API                                     | Mathpix                             | Freemium, API 종량제                                               | Win/Mac/모바일/웹/API                                               | 클라우드 OCR                                                    | ○                                | ○                        | ○              | ○                              | ○                | ○                | **"Image to ChemDraw"**(SMILES 경유)  | API(`include_smiles`)                  | 활성                                                |
| 25  | ChemWriter                                             | Metamolecular                       | 상용(과거)                                                         | 웹(JS)                                                              | JS                                                              | ?                                | ○                        | ○              | ○                              | ?                | ○                | ?                                     | JS                                     | 정체/단종 추정(미확인)                              |
| 26  | Chemix                                                 | chemix.org                          | 무료 웹                                                            | 웹                                                                  | —                                                               | —                                | —                        | —              | —                              | —                | —                | —                                     | —                                      | 실험 기구 도식 도구(구조식 편집기 아님, 인접 시장)  |

### 1-B. 오픈소스 (에디터 / 툴킷 / 변환·인식)

| #   | 프로젝트                                              | 주체                         | 라이선스               | 유형                       | 언어/렌더링                                                        | 핵심 기능                                                                           | CDX/CDXML                                   | GitHub ★(2026-11-10)                                 | npm 패키지(최신)                                                                                  | 상태                        |
| --- | ----------------------------------------------------- | ---------------------------- | ---------------------- | -------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------- |
| 27  | **Ketcher**                                           | EPAM                         | Apache-2.0             | 웹 에디터                  | TypeScript/React, SVG(Raphael 계열, 미확인), Indigo WASM 또는 원격 | 분자·반응·S-group·enhanced stereo, **Macromolecules 모드(3.0~)**: 펩타이드/RNA/HELM | Indigo 경유 CDXML R/W, CDX R(쓰기는 미확인) | epam/ketcher 933                                     | ketcher-core / ketcher-react / ketcher-standalone / ketcher-macromolecules **3.18.0**(2026-09-02) | 매우 활발                   |
| 28  | Indigo                                                | EPAM                         | Apache-2.0             | 툴킷                       | C++ (+Python/Java/.NET/WASM)                                       | 변환, 레이아웃, 검색, 렌더링                                                        | CDXML R/W, CDX R(미확인)                    | epam/Indigo 415                                      | indigo-ketcher 1.46.0                                                                             | 활발                        |
| 29  | JSME                                                  | Bienfait & Ertl              | BSD-3                  | 웹 에디터                  | Java→GWT→JS(렌더링 방식 미확인)                                    | 경량 편집, SMILES/MOL, 반응                                                         | ○                                           | jsme-editor.github.io 110                            | jsme-editor 2024.4.29, jsme(구), @loschmidt/jsme-react                                            | 유지보수 모드               |
| 30  | Kekule.js                                             | Partridge Jiang 외           | MIT(미확인)            | 웹 툴킷+에디터             | 순수 JS, Canvas/SVG/WebGL(Three.js)                                | 2D/3D 편집·표시, OpenBabel.js 연동                                                  | ◐(OpenBabel 경유, 미확인)                   | partridgejiang/Kekule.js 280                         | kekule 1.0.4, kekule-react 0.1.1                                                                  | 활성                        |
| 31  | OpenChemLib (Java/JS) + DataWarrior                   | Idorsia(Actelion) / cheminfo | BSD-3                  | 툴킷+에디터                | Java, JS 포트(GWT 계열), Canvas/SVG                                | 에디터, 물성, 반응, IDCode                                                          | ○(미확인)                                   | Actelion/openchemlib 136, cheminfo/openchemlib-js 94 | openchemlib **9.25.2**, openchemlib-utils, react-ocl 8.7.2                                        | 매우 활발                   |
| 32  | RDKit / MinimalLib(WASM)                              | RDKit 커뮤니티               | BSD-3                  | 툴킷(에디터 없음)          | C++ → Emscripten WASM, SVG/Canvas 묘화                             | 묘화, 정규화, 서브구조, 설명자                                                      | CDXML R(MolsFromCDXML), CDX(미확인)         | rdkit/rdkit 3,675, rdkit/rdkit-js 257                | @rdkit/rdkit 2026.9.2, rdkit-structure-renderer 1.2.25                                            | 매우 활발                   |
| 33  | CDK + JChemPaint                                      | CDK 커뮤니티                 | LGPL-2.1               | 툴킷 + 데스크톱 에디터     | Java, Swing                                                        | 묘화(CDK Depict), 설명자                                                            | ○(미확인)                                   | cdk/cdk 612, JChemPaint 149, cdk/depict 71           | —                                                                                                 | CDK 활발, JChemPaint 저활동 |
| 34  | BKChem                                                | 커뮤니티                     | GPL                    | 데스크톱                   | Python/Tkinter, SVG 기본 포맷                                      | 출판용 2D                                                                           | ○                                           | 미확인                                               | —                                                                                                 | 저활동                      |
| 35  | XDrawChem                                             | 커뮤니티                     | GPL                    | 데스크톱                   | C++/Qt, OpenBabel                                                  | ChemDraw 기능 모방                                                                  | ◐(ChemDraw 파일 호환 주장)                  | 미확인                                               | —                                                                                                 | 정체                        |
| 36  | Molsketch                                             | H. Vennekate                 | GPL                    | 데스크톱                   | C++/Qt                                                             | 2D 편집                                                                             | ○                                           | hvennekate/Molsketch 20                              | —                                                                                                 | 저활동(2025-10 push)        |
| 37  | Avogadro 2                                            | OpenChemistry                | BSD-3                  | 3D 데스크톱                | C++/Qt, OpenGL                                                     | 3D 빌드, 최적화, QM 입력                                                            | ○                                           | avogadrolibs 702, avogadroapp 273                    | —                                                                                                 | 활발                        |
| 38  | MolView                                               | H. Bergwerf                  | AGPL(미확인)           | 웹 앱                      | PHP/JS, 2D=자체 MolPad 캔버스(미확인), 3D=GLmol/JSmol/ChemDoodle   | 그리기→3D, PubChem 검색                                                             | ○                                           | molview/molview 242                                  | —                                                                                                 | 저활동                      |
| 39  | WebMolKit / SketchEl / MMDS                           | Alex Clark(MMI)              | Apache-2               | 웹 툴킷+스케처             | TypeScript                                                         | 스케처, 렌더링                                                                      | ○                                           | aclarkxyz/web_molkit 38                              | webmolkit 2.0.13                                                                                  | 활성                        |
| 40  | SmilesDrawer                                          | Reymond group                | MIT                    | 렌더러                     | 순수 JS, Canvas/SVG                                                | SMILES→2D 그림(편집 없음)                                                           | ○                                           | reymond-group/smilesDrawer 620                       | smiles-drawer 2.4.1                                                                               | 활성                        |
| 41  | Chemozart                                             | 개인                         | 미확인                 | 웹 3D 에디터               | JS/WebGL                                                           | 3D 빌드                                                                             | ○                                           | 미확인                                               | —                                                                                                 | 정체                        |
| 42  | Open Babel                                            | 커뮤니티                     | GPL-2                  | 변환 툴킷                  | C++                                                                | 100+ 포맷 변환                                                                      | **CDX R, CDXML R/W**(미확인)                | openbabel 1,407                                      | —                                                                                                 | 유지보수                    |
| 43  | Chemotion ELN                                         | KIT(ComPlat)                 | AGPL-3                 | ELN                        | Ruby/React, **Ketcher** 내장                                       | 반응·시료 관리                                                                      | Ketcher에 따름                              | chemotion_ELN 192                                    | —                                                                                                 | 활발                        |
| 44  | OPSIN                                                 | D. Lowe                      | MIT                    | 이름→구조                  | Java                                                               | IUPAC 이름 파싱                                                                     | —                                           | dan2097/opsin 246                                    | —                                                                                                 | 활성                        |
| 45  | STOUT (v2)                                            | Kohulan Rajan 외             | MIT(미확인)            | 구조↔이름(신경망)          | Python/TF                                                          | SMILES→IUPAC 번역                                                                   | —                                           | 미확인                                               | —                                                                                                 | 활성(미확인)                |
| 46  | OSRA                                                  | NIH/CADD                     | GPL                    | image→structure(규칙 기반) | C++                                                                | OCSR                                                                                | —                                           | 미확인(SourceForge)                                  | —                                                                                                 | 정체                        |
| 47  | DECIMER (Image Transformer, Segmentation, decimer.ai) | Jena 대학                    | MIT                    | image→structure(DL)        | Python/TF                                                          | 손그림 포함 OCSR, 문헌 세그멘테이션                                                 | —                                           | Image_Transformer 416, Segmentation 157              | —                                                                                                 | 활발                        |
| 48  | MolScribe / RxnScribe                                 | MIT(Coley group)             | MIT                    | image→graph(DL)            | Python/PyTorch                                                     | 분자·반응 다이어그램 파싱                                                           | —                                           | MolScribe 348, RxnScribe 121                         | —                                                                                                 | 정체(2025-01 이후)          |
| 49  | MolNexTR / MolGrapher                                 | 학계 / IBM DS4SD             | 오픈                   | image→structure            | Python                                                             | OCSR                                                                                | —                                           | MolNexTR 171, MolGrapher 100                         | —                                                                                                 | 활성                        |
| 50  | chemfig                                               | LaTeX 커뮤니티               | LPPL                   | 조판                       | TeX                                                                | 텍스트 기반 구조식                                                                  | ○                                           | —                                                    | —                                                                                                 | 활성                        |
| 51  | MolPad (@chemistry)                                   | V. Vreshch                   | MIT                    | React 에디터(신규)         | TS/React/Zustand                                                   | 경량 편집                                                                           | ○                                           | chemistry/molpad 8                                   | @chemistry/molpad 3.2.14                                                                          | 신규·활발                   |
| 52  | chematic                                              | kent-tokyo                   | MIT OR Apache-2.0      | Rust 툴킷(+WASM)           | Rust                                                               | RDKit 동등 기능 목표, 2D 묘화                                                       | CDXML 편집은 "실험적"                       | kent-tokyo/chematic 31                               | @kent-tokyo/chematic 1.2.1                                                                        | 신규·활발                   |
| 53  | HELM Web Editor                                       | Pistoia Alliance             | MIT(+JSDraw.Lite LGPL) | 바이오폴리머 웹 에디터     | JS                                                                 | HELM                                                                                | ○                                           | PistoiaHELM/HELMWebEditor 25                         | —                                                                                                 | 정체(2024)                  |

### 1-C. 모바일

| #   | 앱                                | 벤더                            | 가격                       | 플랫폼      | 특징                                                                      | 상태                           |
| --- | --------------------------------- | ------------------------------- | -------------------------- | ----------- | ------------------------------------------------------------------------- | ------------------------------ |
| 54  | ChemDraw for iPad / Chem3D / CDSL | PerkinElmer → Revvity           | —                          | iPad        | 공식 지원 문서에 "discontinued"로 명시. 대안으로 클라우드 ChemDraw를 안내 | **단종(App Store에서 내려감)** |
| 55  | KingDraw                          | KingDraw                        | 무료(주장)                 | iOS/Android | AI 이미지 인식, 제스처 그리기, 이름↔구조, CDX 저장                        | 활성                           |
| 56  | Chirys Draw                       | Integrated Chemistry Design     | 무료                       | iPad        | 반응식, PDF 벡터 내보내기, MOL 입출력, 분자식·질량                        | 활성(미확인)                   |
| 57  | MolPrime+ / MMDS                  | Molecular Materials Informatics | 무료                       | iOS         | ChEBI/PubChem 검색, R/S·E/Z 표시                                          | 정체(v1.2.7, 2018)             |
| 58  | Elemental                         | Dotmatics(Siemens)              | 무료                       | iOS         | 탭 그리기, 물성 계산                                                      | 정체                           |
| 59  | ChemDoodle Mobile                 | iChemLabs                       | ChemDoodle 라이선스에 포함 | iOS/Android | 데스크톱과 연계                                                           | 활성                           |
| 60  | ChemGraphic - Chemical Editor     | 미확인                          | 미확인                     | iOS         | 구조 편집기                                                               | 미확인                         |

### 1-D. AI 네이티브 / 신규 진입자 (2023–2026)

| #   | 제품                                    | 형태                     | 핵심                                                                                                                  | 근거 수준                         |
| --- | --------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 61  | ChemStitch                              | 웹 캔버스 + AI 챗        | 화면 위 분자에 대한 물성·반응 예측, 역합성 단절, IUPAC 명명. SMILES/InChI/MOL/SDF 내보내기, Freemium                  | AlternativeTo 등록 정보뿐(미확인) |
| 62  | MolDraw (Scidart Academy)               | 무료 웹(+Windows 앱)     | 그리기·3D·PubChem 조회. SVG/PDF/PNG/MOL/SDF/**CDXML**/RXN/chemfig 내보내기, AI 메커니즘 그리기, 125개 기구 라이브러리 | 자사 About 페이지                 |
| 63  | ChatGPT 앱 "Draw molecular structures"  | Apps SDK(MCP) 기반 앱    | SMILES로 분자 생성, 원자·결합 추가, 다양한 형식 내보내기                                                              | 앱 목록만 확인, 개발사 미확인     |
| 64  | Mathpix "Image to ChemDraw/SMILES"      | OCR SaaS                 | 입체화학·Markush 인식 알고리즘                                                                                        | 자사 블로그                       |
| 65  | ConceptViz / WaveSpeed structure drawer | 무료 웹 도구(SEO형)      | 설명→분자 생성, 로컬 처리 주장                                                                                        | 마케팅 페이지                     |
| 66  | EPFL Synthegy                           | 연구(Matter, 2026-04-24) | 자연어 전략 → 합성 경로 평가(LLM-as-judge)                                                                            | 논문·보도자료                     |
| 67  | Revvity Signals Xynthetica (MaaS)       | 플랫폼 AI                | Signals 플랫폼 안의 모델 서비스                                                                                       | 블로그 언급                       |
| 68  | ChemCrow 류 에이전트                    | OSS 에이전트             | LLM + 화학 도구 체인                                                                                                  | ur-whitelab/chemcrow-public 971★  |
| 69  | KingDraw / InDraw AI 인식               | 기존 제품의 AI 기능      | 사진·이미지 → 구조                                                                                                    | 자사 페이지 / 중국 리뷰           |

> 합계: 기준 제품(ChemDraw) 외에 **69개 항목**(일부는 엔진·플랫폼 단위로 묶음)

---

## 2. 제품별 상세

### 2.0 기준점: Revvity Signals ChemDraw

- **현황**: Desktop 25.0에서 편집기를 전면 재설계했다(Properties/Query/Guided Stereo 패널, 배위·dative 결합 통합, 알렌·아트로프 이성질체 M/P 표기). 25.5에서는 물성 계산, HELM, ChemScript Python을 확장했다. 26.0과 26.4(2026-05)에서는 ChemDraw+ 컬럼 필터와 다중 가닥 바이오폴리머 cleanup이 들어갔다.
- **라이선스**: Prime·Professional의 영구 라이선스를 2025-01-01에 종료하고 구독 전용으로 바꿨다. 가격은 비공개(상담 필요)다. Capterra에 "1회 $4,000"으로 올라온 값은 미확인이다.
- **웹**: ChemDraw+(클라우드 네이티브, Signals ChemDraw 라이선스로 접근), ChemDraw JS(Reaxys 등에 임베드).
- **AI**: ACS 웨비나(2025-09)에 따르면 "단계적 접근, 근시일 초점은 제안형 AI(반응 조건 제안)"이다. 이미지→구조 내장 기능은 미확인이다.
- **업계 변화**: Revvity가 ACD/Labs를 인수해 ChemSketch, Spectrus(스펙트럼), Percepta(물성 예측)를 흡수했다.
- 출처: https://support.revvitysignals.com/hc/en-us/articles/43934842634004 , https://revvitysignals.com/whats-new/Signals%20ChemDraw?expand=all , https://revvitysignals.com/chemdraw , https://www.acs.org/content/dam/acsorg/acs-webinars/2025/labnotes/2025-09-17-labnotes-chemdraw-insider-secrets-every-chemist-should-know.pdf , https://revvitysignals.com/blog/2025-year-review-science-revvity-signals

### 2.1 Chemaxon Marvin (Certara)

- **제품군(2026)**: Marvin Cloud(브라우저, 개인 구독, 14일 체험, 2026-09-29 전 세계 출시), Marvin Enterprise(자체 인프라·임베드, Essential/Advanced/Elite), Marvin for Partners(호스팅 + API, 재판매·임베드용), Marvin Desktop Suite(MarvinSketch/MarvinView/Molconvert, 계속 지원), JChem for Office(Word/PPT/Excel 플러그인).
- **기능**: 범용 검색창, 이름→구조, 캔버스에 고정 가능한 실시간 계산 박스, CIP 계산, 1H/13C NMR 예측, 폴리머·Markush·R-group 열거, CXON 포맷.
- **CDX/CDXML**: MarvinSketch 문서에 ChemDraw CDX/CDXML 지원 항목이 있다. 새 웹 Marvin의 지원 여부는 미확인이다.
- **라이선스**: 무료판은 비상업 개인 사용자 전용이다. 라이선스 체크 후 오프라인 15일 사용 가능. 학계 프로그램은 2025-26년에 개편됐고 Chemicalize는 은퇴했다.
- **고객 사례**: Thieme가 신규 Marvin을 Science of Synthesis에 통합했다(2026-04-14). Reaxys와 Benchling은 Marvin JS를 쓴다.
- **ChemDraw 대비**: 강점은 계산·플러그인 생태계(JChem), 엔터프라이즈 임베드, Markush 열거다. 약점은 Marvin JS EOL에 따른 고객 이탈 위험, 학계 무료 정책 축소, 출판용 그래픽 완성도(주관적, 미확인)다.
- 출처: https://www.certara.com/marvin/ , https://www.certara.com/cxn/blog/marvin-js-end-of-life-and-transition-notice , https://certara.com/announcement/certara-launches-marvin-cloud-worldwide-bringing-professional-chemical-structure-drawing-to-scientists-researchers-teachers-and-students/ , https://www.certara.com/announcement/thieme-integrates-certara-chemaxons-new-generation-chemical-sketcher-marvin-into-its-chemical-databases-science-of-synthesis-and-pharmaceutical-substances/ , https://dl.chemaxon.com/docs/HTML/docs171230/ChemDraw_sketch_file_CDX_CDXML.html , https://chemaxon.com/discounted-licenses

### 2.2 Marvin JS (EOL)

- 2025-09-16 공지 기준으로 Marvin JS 25가 마지막 메이저 버전이다. 신규 판매는 2026-12-31, EOL은 2027-12-31이다. 영구 라이선스 보유자는 계속 쓸 수 있지만 보안 업데이트가 없다.
- **시사점**: Marvin JS를 임베드한 SaaS(Benchling, Reaxys, 다수의 사내 ELN·등록 시스템)는 2027년까지 다른 엔진으로 옮겨야 한다. 후보는 새 Marvin, Ketcher, ChemDraw JS, Schrödinger Sketcher다. **ChemDraw 경쟁자 입장에서는 가장 큰 단기 기회**다.
- 출처: https://www.certara.com/cxn/blog/marvin-js-end-of-life-and-transition-notice

### 2.3 ACD/ChemSketch (→ Revvity)

- Revvity가 2025-11-10에 인수 계약을 발표하고 FY2026 1분기에 완료했다($72.0M + 최대 $8.0M 조건부). ACD/Labs는 토론토 소재, 약 200명 규모다.
- ChemSketch 2025의 변경점은 π-complex 검색 인식 개선과 사전 보강 정도로 적다. 프리웨어는 상업 조직에서 명시적으로 사용이 금지된다.
- "ChemSketch is no longer available to new customers" 공지 제목이 검색되었다. `buy-chemsketch-online` URL은 Revvity ChemDraw 페이지로 301 리다이렉트된다. 프리웨어 다운로드가 계속 제공되는지는 미확인이다.
- **ChemDraw 대비**: 그동안 가장 널리 쓰인 무료 대안이었다(다운로드 250만 이상). 이제 같은 회사 소유가 되어 **무료 대안 시장에서 사실상 이탈**하는 흐름이다.
- 출처: https://www.businesswire.com/news/home/20251110692197/en , https://www.sec.gov/Archives/edgar/data/0000031791/000003179126000027/revv-20260705.htm , https://www.acdlabs.com/technical-support/current-software-versions/chemsketch/ , https://www.acdlabs.com/?p=18442 , https://www.acdlabs.com/?p=15917

### 2.4 ChemDoodle 2D/3D (iChemLabs)

- v12.12.1, Windows/macOS(Intel·Apple Silicon)/Linux 지원. ChemDoodle 3D와 Mobile이 같은 라이선스에 포함된다.
- IUPAC 이름 생성(전통명과 PIN 시도)과 이름 파싱, 1H/13C NMR 시뮬레이션, NMR SignalSeek, Multiplet 도구, JCAMP-DX 읽기, **CDX/CDXML 읽기·쓰기를 "thorough"하게 지원**한다고 밝힌다.
- 가격: 홈페이지에 "2D+3D $29" 문구가 있으나 대상과 조건은 미확인이다(학생 대상일 가능성).
- **ChemDraw 대비**: 저가 영구 라이선스, Linux 네이티브, CDX 호환성이 강점이다. 약점은 엔터프라이즈 통합과 바이오폴리머 기능 부족(미확인)이다. CAS SciFinder에도 편집기로 들어가 있다.
- 출처: https://www.chemdoodle.com/ , https://www.ichemlabs.com/store

### 2.5 ChemDoodle Web Components

- v11에서 jQuery와 jQuery UI를 완전히 제거하고 UI를 라이브러리 안에 직접 구현했다. HTML5 Canvas(2D)와 WebGL(3D)을 쓴다.
- 라이선스는 **GPLv3**이며, 독점 제품에 넣으려면 상용 라이선스를 사야 한다. npm 공식 배포는 없다(래퍼 `react-chemdoodle`, `chemdoodle-next`, `@wcmc/ng-chemdoodle`이 있다).
- "ChemDraw CDX Viewer" 데모가 있어 CDX 파싱 능력이 확인된다.
- 출처: https://web.chemdoodle.com/installation/license , https://web.chemdoodle.com/store/proprietary-licensing , https://web.chemdoodle.com/demos/chemdraw-cdx-viewer , https://macinchem.org/?p=2562

### 2.6 BIOVIA Draw (Dassault Systèmes)

- 2025 버전은 2024-11에 출시됐고 이후 SP1이 나왔다. 학계 사용자(학생·교수·연구자)는 등록하면 무료로 쓸 수 있다.
- 서열 편집기(커스텀 잔기·링커), Markush, haptic·수소결합 도구를 제공한다. 3DSwym 커뮤니티에 무료 add-in 라이브러리가 있고 add-in을 직접 개발할 수도 있다.
- 계보: MDL ISIS/Draw → Symyx Draw → Accelrys Draw → BIOVIA Draw.
- 출처: https://www.3ds.com/products/biovia/draw , https://discover.3ds.com/biovia-draw-academic , https://3dswym.3dexperience.3ds.com/post/biovia-drug-discovery-development/biovia-announces-the-release-of-draw-2025-sp1_ZvsLGCryT1aWOD6_BslGQA

### 2.7 Schrödinger Sketcher (OSS) / LiveDesign

- GitHub `schrodinger/sketcher`, **BSD-3-Clause**, 커밋 2,346개, 43★. 2026-11-10에도 push가 있었다. C++20/CMake 3.24+로 빌드하고 **RDKit을 화학 모델로 쓴다**. `wasm` 디렉터리와 온라인 버전, 웹 컴포넌트 형태가 있다. npm 배포는 확인하지 못했다.
- LiveDesign에는 별도의 "2D Sketcher"가 있다. 이것이 OSS 버전과 같은 코드인지는 미확인이다.
- **의미**: 대형 상용 벤더가 **RDKit 네이티브 스케처를 퍼미시브 라이선스로 공개**한 것은 Ketcher 독점 구도를 흔드는 요인이다.
- 출처: https://github.com/schrodinger/sketcher , https://www.schrodinger.com/platform/products/livedesign/

### 2.8 Wiley ChemWindow (KnowItAll)

- KnowItAll 2025 안의 2D 그리기 도구로, 입체화학 인식과 ReportIt 출판 도구를 제공한다. 대학은 KnowItAll Campus-Wide 라이선스로 받는 경우가 많다. 개인 무료판은 확인되지 않았다.
- 강점은 Wiley 스펙트럼 DB(IR/NMR/MS)와의 결합이다.
- 출처: https://sciencesolutions.wiley.com/chemwindow-chemical-structure-drawing-software , https://sciencesolutions.wiley.com/whats-new-in-knowitall-2025/

### 2.9 ISIS/Draw · Symyx Draw (역사적 제품)

- 2000년대 학계 무료 표준이었다. 켄트 대학 등은 지금도 Symyx Draw를 무료 소프트웨어로 안내한다. 현재 계승 제품은 BIOVIA Draw다.
- 출처: https://www.kent.ac.uk/software/symyx-draw

### 2.10 Scilligence JSDraw / JSDraw.Lite / HELM Web Editor

- 화학 구조와 바이오로직스(HELM 모노머 관리)를 함께 다루는 JS 에디터다. 상용 SDK는 이메일로 요청해야 한다. JSDraw.Lite(LGPL-3)는 Pistoia Alliance HELM Web Editor(MIT)의 기반이다.
- 강점: 저분자와 펩타이드·올리고 혼합 모달리티, 등록 시스템 통합.
- 출처: https://scilligence.com/ , https://pistoiaalliance.atlassian.net/wiki/x/BQCmo , https://github.com/PistoiaHELM/HELMWebEditor

### 2.11 Elsevier Reaxys 구조 편집기

- 2025-09 사용자 가이드 기준으로 **MarvinJS(기본·권장)와 ChemDrawJS 중 하나를 고를 수 있다**. 외부 편집기에서 붙여넣기도 지원한다. Ketcher는 옛 자료에만 나온다.
- Marvin JS EOL에 따라 엔진 교체가 불가피하다(시점은 미확인).
- 출처: https://www.elsevier.support/reaxys/answer/how-can-i-draw-a-reaction-or-structure , https://supportcontent.elsevier.com/RightNow%20Next%20Gen/Reaxys/Reaxys_-_User_guide_-_September_2025%20(1).pdf

### 2.12 CAS SciFinder — CAS Draw

- 자체 CAS Draw에 ChemDoodle을 함께 제공하며, 한쪽에서 그린 구조가 다른 쪽으로 이어진다. 반복기, R-group, 가변 부착점, 반응 질의를 지원한다. 이름·CAS RN·SMILES·InChI에서 구조를 만들 수 있다. .cxf/.mol을 가져오고 .sdf/.mol/.cxf/.png로 내보낸다. ChemDraw 구조 붙여넣기와 ChemDraw → SciFinder 검색 add-in도 있다.
- 출처: https://cas.org/training/lesson/drawing-structures-cas-scifinder , https://origin-www.cas.org/sites/default/files/documents/SCIGENENGREF101245-SciFinder-Quick-Reference-Guide-Commercial-A4.pdf , https://prnewswire.com/news-releases/scifinder-and-chemdraw-software-connection-now-available-to-customers-263621351.html

### 2.13 Mestrelab Mnova

- NMR·LC/MS 처리용 소프트웨어다. 구조 편집기 세부와 CDX 지원은 공식 출처로 확인하지 못했다(**미확인**). NMR 예측(Mnova NMRPredict)은 ChemDraw Professional의 NMR 예측과 직접 겹친다.
- 출처: 미확인(Mestrelab 공식 문서 추가 조사 필요)

### 2.14 KingDraw (중국)

- 무료(공식 주장)이며 Windows/Android/iOS/iPad를 지원한다. AI 이미지 인식, 제스처 그리기, clean up, 3D 모델, 이름↔구조, 구조 검색, 물성 분석, 내장 그룹을 내세운다. **cdx/mol/SMILES로 저장**하고 Office·ChemDraw·이미지와 상호 변환한다. 3.0.2.20에서 CDX 호환성을 개선했다. 클라우드 계정으로 여러 플랫폼에서 동기화한다. macOS 지원은 미확인이다.
- 출처: https://kingdraw.com/en , https://www.softpedia.com/progChangelog/KingDraw-Changelog-264416.html , https://alternativeto.net/software/kingdraw/about , https://apps.apple.com/us/app/id1336806206

### 2.15 Integle InDraw (중국)

- 중국어 리뷰에 따르면 OCSR(이미지→구조)과 구조 편집, "원클릭 미화"를 갖췄다. 복잡한 구조(다환·스피로·키랄) 인식은 Collector보다 떨어진다는 평가가 있다. Labii ELN 위젯에서도 언급된다. 가격·플랫폼·포맷은 **미확인**이다.
- 출처: https://www.bilibili.com/opus/1102367153978343431 , https://www.pharnexcloud.com/zixun/sd_3812 , https://docs.labii.com/widgets/chemistry/chemical-drawing

### 2.16 Zoho ChemStudio

- 브라우저 앱과 Windows/macOS/Linux 데스크톱(오프라인)을 제공하고 Zoho Writer 확장도 있다. FAQ에 "현재 무료"라고 명시돼 있다.
- 입체화학(R/S, stereogroup), Clean Up, superatom, 템플릿, **ACS 정렬 저널 템플릿 10종 이상**, 화학량론 라벨, 1H/13C NMR 시프트, ADME 리포트, 주기율표, 이름→구조, CAS ID 조회를 지원한다.
- **포맷: CDXML/MOL/RXN/SMILES/SDF, CDX 내보내기.** ChemDraw의 출판 워크플로(ACS 스타일)를 정면으로 겨냥한 무료 대안이다.
- 출처: https://www.zoho.com/chemstudio

### 2.17 Molsoft ICM / MolEdit

- ICM-Chemist(-Pro)에 2D/3D 분자 편집기가 들어 있다. MolEdit는 플러그인 없는 HTML5 웹 2D 편집기다.
- 출처: https://www.molsoft.com/chemist/molecule-editor.html

### 2.18 Optibrium StarDrop

- 화학 인식 데이터 분석 패키지(ADMET 예측, 다목적 최적화)에 스케처가 들어 있다. 스케처 엔진은 **미확인**이다.
- 출처: https://www.cambridgemedchemconsulting.com/resources/lead_identification/computational_chemistry_tools.html

### 2.19 OpenEye(Cadence Molecular Sciences)

- Orion 등 플랫폼 안에 스케처가 있을 것으로 추정되지만 엔진·사양은 **미확인**이다. 묘화 툴킷 OEDepict는 강력하다(일반 지식).

### 2.20 CDD Vault

- 구조 편집기를 **Marvin JS에서 Ketcher로 교체**했다(Search, ELN, 분자 생성 폼). enhanced stereo, Insert Structure, 회전 도구를 지원하고, ELN에서는 전체 R-group 도구를 쓸 수 있다.
- **Marvin JS → Ketcher 이전의 선례**다.
- 출처: https://support.collaborativedrug.com/hc/en-us/articles/10734495504148-Using-Ketcher-to-Draw-Chemical-Structures , https://www.collaborativedrug.com/cdd-vault-update-improved-structure-editor

### 2.21 Benchling

- Registry의 Molecule 엔티티를 **Marvin JS 스케처로 그린다**. SMILES 일괄 등록, 서브구조·유사도 검색을 제공하며 애드온 계약이 필요하다.
- Marvin JS EOL 때문에 2027년 말 전에 엔진을 바꿔야 할 것으로 보인다(Benchling의 계획은 미확인).
- 출처: https://help.benchling.com/hc/en-us/articles/9684240553997-Creating-and-importing-molecules

### 2.22 Dotmatics Elemental (Siemens)

- Dotmatics 제품군에 들어 있는 스케처다. 데스크톱, iOS 앱, 경량 JS 플러그인 형태가 있다. Siemens가 2025-07-01에 Dotmatics 인수를 마쳤다($5.1B).
- 출처: https://apps.apple.com/app/id518655328 , https://scientific-computing.com/press-releases/elemental-draw , https://news.siemens.com/de-ch/dotmatics-closing/

### 2.23 Datagrok Chem

- 스케처를 플러그인으로 고를 수 있다(**OpenChemLib, Ketcher, MarvinJS**). 렌더링은 RDKit 또는 OCL을 쓴다. SMILES, MOLBLOCK, InChI 붙여넣기를 지원한다. npm `@datagrok/chem` 1.17.18, `@datagrok/ketcher-sketcher` 2.4.9가 있다.
- 출처: https://datagrok.ai/help/datagrok/solutions/domains/chem/ , https://www.npmjs.com/package/%40datagrok%2Fchem

### 2.24 PubChem Sketcher

- CACTVS 툴킷 스크립트를 서버 측에서 돌리는 구조로, Java와 플러그인이 필요 없다. 이름·SMILES·InChI·이미지 파일에서 구조를 불러온다.
- 출처: https://pubchem.ncbi.nlm.nih.gov/sketch , https://pmc.ncbi.nlm.nih.gov/articles/PMC2820498

### 2.25 Mathpix (image → SMILES / ChemDraw)

- Snip 앱과 API(`include_smiles`)로 인쇄물과 손그림 구조를 SMILES로 바꾼다. 입체화학과 Markush 인식을 지원한다. "Image to ChemDraw"는 SMILES를 ChemDraw에 붙여넣는 방식이다.
- 출처: https://mathpix.com/image-to-smiles , https://mathpix.com/image-to-chemdraw , https://mathpix.com/blog/new-algorithm-for-stereochemistry-and-markush-structures

### 2.26 ChemWriter (Metamolecular)

- 초기 상용 JS 스케처였다. 현재 상태는 **미확인**(정체 또는 단종 추정)이다.

### 2.27 Chemix

- 실험 기구 도식을 그리는 무료 웹 도구로, 구조식 편집기가 아니다. ChemDraw의 "Templates(유리기구)" 기능과 겹치는 인접 시장이다. MolDraw와 ChemDoodle도 기구 라이브러리를 제공한다.

### 2.28 Ketcher (EPAM) — 오픈소스 웹 스케처의 사실상 표준

- npm: `ketcher-core`, `ketcher-react`, `ketcher-standalone`(Indigo WASM 내장), `ketcher-macromolecules`. 모두 **3.18.0(2026-09-02), Apache-2.0**이며 beta 3.21.0-rc.2가 나와 있다. GitHub 933★, 264 fork, 2026-11-09 push.
- Ketcher 3.0부터 **Macromolecules 모드**(펩타이드·RNA·HELM, 라이브러리 드래그앤드롭, lasso 선택)를 제공한다. 이 모드에서는 일부 export와 SMARTS API를 쓸 수 없다.
- 채택처: CDD Vault, Chemotion ELN, Datagrok, Labii, RCSB 화학 스케치 도구(미확인), 다수의 중국 래퍼 패키지(chem-ketcher-viewer 등).
- **ChemDraw 대비**: 무료이면서 임베드가 쉽고 React 친화적이며, 거대분자도 다룬다. 약점은 출판용 그래픽(화살표·주석·스타일 템플릿), 이름 생성(Indigo는 IUPAC 생성이 제한적), NMR이 없다는 점이다.
- 출처: https://github.com/epam/ketcher , https://lifescience.opensource.epam.com/ketcher/release-notes/ketcher-3.0.0.html , https://lifescience.opensource.epam.com/ketcher/release-notes/ketcher-3.8.0.html , https://registry.npmjs.org/ketcher-react

### 2.29 Indigo Toolkit

- C++ 툴킷으로 Python/Java/.NET/WASM 바인딩이 있다. Ketcher의 백엔드이며 `indigo-ketcher` 1.46.0(WASM)으로 배포된다. CDXML을 지원하고 CDX 범위는 미확인이다. GitHub 415★.
- 출처: https://github.com/epam/Indigo , https://registry.npmjs.org/indigo-ketcher

### 2.30 JSME (Peter Ertl & Bruno Bienfait)

- JME 애플릿을 GWT로 옮긴 JS 버전으로 BSD-3다. npm `jsme-editor` 2024.4.29(2024-07)가 최신이다. 작고 단순해서 교육용·DB 질의 입력용으로 널리 쓰인다. 출판용 기능은 없다.
- 출처: https://registry.npmjs.org/jsme-editor , https://github.com/jsme-editor/jsme-editor.github.io

### 2.31 Kekule.js

- 순수 JS 툴킷에 2D/3D 위젯과 에디터를 갖췄다. npm `kekule` 1.0.4(2026-05)와 React 래퍼가 있다. GitHub 280★.
- 출처: https://github.com/partridgejiang/Kekule.js , https://registry.npmjs.org/kekule

### 2.32 OpenChemLib (Idorsia) / DataWarrior

- Java 원본에 JS 포트가 있고 에디터(캔버스)를 포함한다. npm `openchemlib` **9.25.2(2026-10-27)**는 배포가 매우 잦다. `react-ocl`, `openchemlib-utils`(HOSE 코드 등)가 있다. 무료 데이터 분석 도구 DataWarrior의 기반이며 Datagrok과 NMRium(cheminfo)에서도 쓴다.
- 출처: https://github.com/cheminfo/openchemlib-js , https://registry.npmjs.org/openchemlib

### 2.33 RDKit (MinimalLib JS/WASM)

- 에디터는 없고 묘화·정규화·검색을 제공한다. `@rdkit/rdkit` 2026.9.2(2026-11-05)와 `rdkit-structure-renderer`가 있다. Schrödinger Sketcher가 RDKit 위에 만들어졌다. CDXML 리더(MolsFromCDXML)가 있다.
- 출처: https://github.com/rdkit/rdkit , https://github.com/rdkit/rdkit-js , https://registry.npmjs.org/@rdkit/rdkit

### 2.34 CDK + JChemPaint

- CDK는 Java 툴킷(612★)이고 묘화 서비스 CDK Depict(71★)가 있다. JChemPaint는 Swing 기반 2D 에디터(149★)다.
- 출처: https://github.com/cdk/cdk , https://github.com/JChemPaint/jchempaint

### 2.35 BKChem / XDrawChem / Molsketch (리눅스 데스크톱 OSS)

- BKChem은 Python/Tk 기반이며 SVG가 기본 포맷이다. XDrawChem은 C++/Qt 기반으로 ChemDraw 파일 호환을 주장하고 OpenBabel을 쓴다. Molsketch는 Qt 기반으로 20★이다. 셋 다 활동이 적다. Debian DebiChem 패키지로 제공된다.
- 출처: https://blends.debian.org/debichem/tasks/view-edit-2d.ko.html , https://www.linuxlinks.com/best-free-open-source-chemical-structure-drawing-tools/ , https://github.com/hvennekate/Molsketch

### 2.36 Avogadro 2

- 3D 분자 편집기로 C++/Qt/OpenGL 기반이다. avogadrolibs 702★. ChemDraw의 Chem3D에 대응한다.
- 출처: https://github.com/OpenChemistry/avogadrolibs

### 2.37 MolView

- 웹에서 2D로 그리면 3D로 보여 준다(GLmol 기본, Jmol, ChemDoodle 엔진). PubChem·RCSB 검색을 붙였다. 242★, 2026-07 push.
- 출처: https://molview.org/ , https://github.com/molview/molview

### 2.38 WebMolKit / SketchEl / MMDS / MolPrime+ (Alex Clark)

- TypeScript 툴킷과 스케처다. npm `webmolkit` 2.0.13(2026-11-03)이 있다. iOS 앱 MolPrime+와 MMDS의 계보다.
- 출처: https://github.com/aclarkxyz/web_molkit , https://apps.apple.com/us/app/molprime/id497295446

### 2.39 SmilesDrawer

- SMILES를 2D 그림으로 그리는 경량 렌더러로, 편집 기능은 없다. 620★, npm `smiles-drawer` 2.4.1.
- 출처: https://github.com/reymond-group/smilesDrawer

### 2.40 Chemozart

- 웹 기반 3D 분자 빌더다. 상태는 미확인이다.

### 2.41 Open Babel

- 포맷 변환 툴킷으로 1,407★다. ChemDraw 포맷 지원 범위(CDX 읽기, CDXML 읽기/쓰기)는 미확인이므로 정밀 검증이 필요하다.
- 출처: https://github.com/openbabel/openbabel

### 2.42 Chemotion ELN

- KIT의 오픈소스 ELN(AGPL)으로 Ketcher를 내장했다. 192★, 2026-11 활발.
- 출처: https://github.com/ComPlat/chemotion_ELN

### 2.43 OPSIN / STOUT — 이름↔구조 (ChemDraw Name=Struct / Struct=Name과 비교)

- **OPSIN**: 규칙 기반 IUPAC 이름→구조 변환기(Java, MIT, 246★)다. Name=Struct에 대응하는 대표 OSS다.
- **STOUT v2**: 신경망 SMILES→IUPAC 번역기다. Struct=Name의 OSS 대안이지만 정확도 보장이 없다.
- 상용 대안: ChemDoodle, Marvin(이름→구조), ACD/Name(현재 Revvity), KingDraw, Zoho ChemStudio.
- 출처: https://github.com/dan2097/opsin

### 2.44 OSRA / DECIMER / MolScribe / MolNexTR / MolGrapher — image→structure (OCSR)

- **OSRA**: 규칙 기반 고전 도구로 GPL이다.
- **DECIMER**: Transformer 기반(416★), 문헌 세그멘테이션(157★), decimer.ai 웹을 제공한다.
- **MolScribe**: image-to-graph(348★). **RxnScribe**: 반응 다이어그램 파싱(121★).
- **MolNexTR**(171★), **MolGrapher**(IBM DS4SD, ICCV'23, 100★).
- 상용: Mathpix, KingDraw AI, InDraw, Collector(무료, 중국).
- **ChemDraw와의 관계**: ChemDraw 내장 OCSR은 공식 근거를 찾지 못했다(미확인). 실제 학술 이미지에서는 OCSR 성능이 크게 떨어진다는 벤치마크(MolRecBench-Wild)가 있다.
- 출처: https://github.com/Kohulan/DECIMER-Image_Transformer , https://github.com/thomas0809/MolScribe , https://github.com/CYF2000127/MolNexTR , https://github.com/DS4SD/MolGrapher , https://pubs.rsc.org/en/content/articlehtml/2024/dd/d3dd00228d

### 2.45 chemfig (LaTeX)

- 텍스트(DSL)로 구조식을 조판하는 도구다. MolDraw가 chemfig 내보내기를 지원한다.

### 2.46 신규 OSS: @chemistry/molpad, chematic

- **MolPad**: React/TS/Zustand 기반 경량 에디터(MIT, 8★, 2026)다.
- **chematic**: 순수 Rust 툴킷으로 RDKit과 동등한 기능을 목표로 하며 WASM과 Node 바인딩이 있다. "rich CDXML editing"은 실험적이라고 밝힌다(31★).
- 출처: https://github.com/chemistry/molpad , https://kent-tokyo.github.io/chematic/

### 2.47 모바일

- **ChemDraw for iPad, Chem3D, CDSL**: App Store에서 내려갔고 "discontinued"다. Revvity는 클라우드 ChemDraw를 안내한다. 출처: https://support.revvitysignals.com/hc/en-us/articles/4408268410900-iPad-iOS-apps-ChemDraw-Chem3D-and-CDSL-have-been-withdrawn-from-the-Apple-iTunes-store
- **Chirys Draw**(무료, iPad, 반응식, PDF·MOL): https://apps.apple.com/us/app/chirys-draw/id455125162
- **MolPrime+**(무료, 정체): https://apps.apple.com/us/app/molprime/id497295446
- **Elemental**(무료 iOS): https://apps.apple.com/app/id518655328
- **KingDraw**(iOS/Android, 무료): https://apps.apple.com/us/app/id1336806206
- **ChemDoodle Mobile**(라이선스 포함): https://www.chemdoodle.com/
- **ChemGraphic**(iOS, 상세 미확인): https://apps.apple.com/us/app/id1451571017
- Stanford 모바일 앱 가이드: https://guides.library.stanford.edu/mobileapps/structuredrawing

### 2.48 AI 네이티브 / 신규 진입자

- **ChemStitch**: 캔버스 + AI 챗(물성·반응 예측, 역합성, IUPAC 명명), Freemium. 정보원은 AlternativeTo 하나뿐이어서 **미확인**이다. https://alternativeto.net/software/chemstitch/about/
- **MolDraw**: 무료 웹 + Windows 앱. AI 보조(다단계 메커니즘 그리기), AI Spectroscopy 플러그인, CDXML/chemfig 내보내기. 엔진은 미확인이다(Ketcher 기반이라는 2차 언급 있음). https://moldraw2.vercel.app/pages/about.html , https://moldraw2.vercel.app/pages/ai-help.html
- **ChatGPT 앱 "Draw molecular structures"**: Apps SDK 기반 앱으로 SMILES에서 분자를 만들고 편집·내보내기를 한다. 개발사는 미확인이다. 같은 생태계에 "Interactive 3D molecules", Rowan "Chemistry & Biology Simulation" 앱이 있다. https://chatgpt.com/plugins/plugin_asdk_app_695ad726c0d08191ae5105f454a9c470
- **EPFL Synthegy**: 자연어 전략 요청을 받아 LLM이 합성 경로를 평가한다(Matter, 2026-04-24). 화학자와 판단 일치율은 약 71%다. https://actu.epfl.ch/news/ai-helps-chemists-design-molecules-step-by-step
- **Revvity Xynthetica(MaaS)**: Signals 플랫폼 AI로 예고됐다. https://revvitysignals.com/blog/future-chemical-drawing-revvity-signals-software
- **Certara**: 2026년 화학정보학 트렌드로 "AI 연구 동료"를 제시했다. https://certara.com/blog/cheminformatics-trends-in-2026-ai-is-your-new-favorite-labmate
- **범용 LLM의 한계**: 2026-07 프리프린트에 따르면 ChatGPT, Gemini, Copilot은 단순 루이스 구조는 대체로 맞혔지만 탈리도마이드 같은 과제에서는 틀린 구조를 생성했다. "LLM이 직접 그리는" 방식은 아직 신뢰도가 낮다. https://www.preprints.org/manuscript/202607.2292
- **ConceptViz, WaveSpeed structure drawer**: SEO형 무료 도구로 근거 수준이 낮다. https://conceptviz.app/blog/best-free-chemdraw-alternatives-for-teachers , https://wavespeed.ai/ko/free-tools/chemical-structure-drawer

---

## 3. 시장 세분화 분석 (누가 무엇으로 경쟁하는가)

### 3.1 세그먼트 맵

| 세그먼트                                 | 구매자/사용자                            | ChemDraw 포지션                                     | 주요 경쟁자                                                                                                                                             | 경쟁 축                                                                                                |
| ---------------------------------------- | ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **S1. 출판·문서용 데스크톱 그리기**      | 합성 화학자, 대학원생, 저널 투고         | 사실상 표준(CDX/CDXML = 저널 제출 포맷, ACS 스타일) | ChemDoodle, Zoho ChemStudio, KingDraw, BIOVIA Draw(학계 무료), ChemWindow, Marvin Desktop, ChemSketch(현재 Revvity)                                     | 가격(구독 vs 영구·무료), **CDX 호환성**, ACS 템플릿, OS 지원(Linux)                                    |
| **S2. 임베더블 웹 스케처(B2B 컴포넌트)** | ELN, LIMS, 등록 시스템, DB 벤더          | ChemDraw JS(Reaxys 등)                              | **Ketcher**, Marvin(신규)/Marvin JS(EOL), ChemDoodle Web(GPL/상용), JSDraw, OpenChemLib, JSME, Kekule.js, Schrödinger Sketcher, Elemental JS            | 라이선스(OSS 퍼미시브 vs 상용), React 친화성, 번들 크기, 바이오폴리머(HELM), 툴킷(RDKit/Indigo) 정합성 |
| **S3. 검색 질의 입력(DB 내장)**          | Reaxys, SciFinder, PubChem, ChEMBL, RCSB | ChemDraw JS 옵션 + ChemDraw→SciFinder add-in        | CAS Draw + ChemDoodle, Marvin JS, PubChem Sketcher(CACTVS), Ketcher                                                                                     | 질의 기능(R-group, 가변 부착점, 반응 매핑), 붙여넣기 호환                                              |
| **S4. 신약 R&D 플랫폼 내장 스케처**      | 제약 디자인 팀                           | Signals Notebook/Signals One 번들                   | Schrödinger LiveDesign, Certara Design Hub(Marvin), Dotmatics(Siemens) Elemental, CDD Vault(Ketcher), Benchling(Marvin JS), Datagrok, StarDrop, OpenEye | 플랫폼 락인, 데이터 연결(DMTA), 계산 통합                                                              |
| **S5. 분석/스펙트럼 연동**               | 분석 화학자                              | ChemDraw Professional NMR 예측                      | Mnova, ACD/Spectrus(현재 Revvity), Wiley KnowItAll/ChemWindow, ChemDoodle NMR, Marvin NMR, Zoho ChemStudio NMR                                          | 예측 정확도, 스펙트럼 DB, 구조 검증                                                                    |
| **S6. 교육·학생**                        | 고교·학부                                | 사이트 라이선스                                     | MolView, KingDraw, Zoho ChemStudio, MolDraw, JSME, ChemSketch Freeware, BIOVIA Draw Academic, Chemix(기구)                                              | 무료, 웹, 모바일, 3D 보기                                                                              |
| **S7. 모바일/태블릿**                    | 이동 중 그리기, 손그림                   | **철수(iPad 앱 단종)**                              | KingDraw, Chirys Draw, ChemDoodle Mobile, Elemental, MolPrime+                                                                                          | 펜·제스처 입력, 동기화                                                                                 |
| **S8. 3D 편집**                          | 계산화학                                 | Chem3D                                              | Avogadro 2, Molsoft ICM, Kekule.js, Chemozart, MolView                                                                                                  | 무료, 계산 엔진 입력 생성                                                                              |
| **S9. 변환·인식 툴(헤드리스)**           | 데이터 엔지니어, 특허·문헌 마이닝        | ChemScript, Name=Struct                             | OPSIN, STOUT, Open Babel, RDKit, Indigo, DECIMER, MolScribe, Mathpix, OSRA                                                                              | 정확도, 배치 처리, 라이선스                                                                            |
| **S10. AI 보조/대화형**                  | 전 사용자(신규)                          | 제안형 AI 개발 중                                   | ChemStitch, MolDraw AI, ChatGPT 앱, Synthegy(연구), KingDraw AI 인식                                                                                    | 자연어 → 구조/반응, 검증 가능성                                                                        |

### 3.2 경쟁 구도 해석

1. **S1(데스크톱 출판)**: ChemDraw의 해자는 **CDX/CDXML 포맷과 저널·ACS 스타일 관행**이다. 이 해자를 직접 공략하는 제품은 ChemDoodle(CDX R/W "thorough"), Zoho ChemStudio(CDXML R/W, CDX W, ACS 템플릿 10종 이상), KingDraw(cdx 저장), MolDraw(CDXML W)다. 그중 Zoho는 무료이고 3대 OS 데스크톱까지 갖춰 **2026년 가장 공격적인 진입자**다.
2. **S2(임베더블 웹)**: Marvin JS EOL로 **향후 14개월(~2027-12) 동안 재선택이 몰리는 시장**이다. Ketcher가 기본 대안이고, 새 Marvin(호스팅·Partners API)과 ChemDraw JS가 상용 대안이다. Schrödinger Sketcher(BSD, RDKit)는 RDKit 기반 백엔드를 쓰는 고객에게 매력이 크다.
3. **업계 통합**: Revvity(ChemDraw + ACD/Labs), Certara(Chemaxon + 시뮬레이션), Siemens(Dotmatics), Dassault(BIOVIA)라는 4대 진영이 굳어졌다. 독립 벤더는 iChemLabs, Scilligence, Mestrelab, Molsoft, Optibrium 정도만 남았다. 무료 측은 Zoho(빅테크 SaaS)와 중국 벤더(KingDraw, Integle)가 차지하고 있다.
4. **바이오폴리머/HELM**: ChemDraw(HELM, 26.x 다중가닥), Ketcher Macromolecules, BIOVIA Draw 서열 편집기, JSDraw/HELM Web Editor, Datagrok HELM, Marvin(폴리머)이 경쟁한다. **신규 모달리티(펩타이드, 올리고, ADC, PROTAC)가 차세대 경쟁 축**이다.

---

## 4. ChemDraw 대비 공백·기회 (Gaps & Opportunities)

### 4.1 ChemDraw가 약하거나 비어 있는 영역

| #   | 공백                                        | 근거                                                             | 기회                                                                                                                                                                             |
| --- | ------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | **모바일/태블릿 부재**                      | iPad 앱 단종, 클라우드만 안내                                    | 펜·손그림 인식 스케처(iPad/Android). KingDraw가 이미 점유 중이므로 서구 시장에 품질 높은 대안이 필요하다                                                                         |
| G2  | **영구 라이선스 종료(구독 강제)**           | 2025-01-01 정책                                                  | 저가 영구 라이선스, 오프라인 우선, 무료 기본 + 유료 고급 모델                                                                                                                    |
| G3  | **Linux 네이티브 데스크톱 없음**            | ChemDraw는 Win/Mac 전용                                          | ChemDoodle, Zoho가 Linux 지원 → 연구용 워크스테이션·HPC 사용자                                                                                                                   |
| G4  | **OCSR(image→structure) 내장 미확인**       | 공식 근거 없음, Mathpix가 "Image to ChemDraw"를 외부에서 제공    | 붙여넣기·스크린샷 → 편집 가능한 구조(+신뢰도 표시, 원본 이미지 오버레이 검증 UI)                                                                                                 |
| G5  | **자연어/LLM 보조 미성숙**                  | ChemDraw AI는 "제안형, 단계적"                                   | LLM이 직접 그리게 하지 말고 **툴킷 검증(RDKit/Indigo)을 거치는 LLM**(이름·설명 → 후보 구조 → 사용자 확인) 설계. 범용 LLM의 구조 오류가 보고돼 있으므로 검증 루프가 차별점이 된다 |
| G6  | **웹 임베드 라이선스의 높은 비용과 폐쇄성** | ChemDraw JS는 상용, Marvin JS는 EOL                              | 퍼미시브 OSS 코어 + 상용 지원 모델(Ketcher, Schrödinger Sketcher 방식). **Marvin JS 이전 수요를 노린 마이그레이션 키트**(Marvin JS API 호환 shim)                                |
| G7  | **CDX/CDXML 호환성은 ChemDraw만 완전함**    | OSS 대부분은 CDXML 부분 지원, CDX 쓰기 드묾(chematic도 "실험적") | **고충실도 CDX/CDXML 라운드트립 라이브러리**(JS/WASM)는 모든 경쟁자가 필요로 하는 인프라다. 후속 정적 분석의 핵심 대상                                                           |
| G8  | **협업/실시간 공동 편집**                   | ChemDraw+는 클라우드 저장·공유 중심(실시간 공동 편집은 미확인)   | Figma식 멀티 커서 화학 캔버스, 코멘트, 버전 diff(구조 diff)                                                                                                                      |
| G9  | **문서 도구 통합의 폭**                     | ChemDraw는 Office 중심                                           | Zoho Writer 확장처럼 Google Docs, Notion, Markdown/LaTeX(chemfig), Jupyter 위젯                                                                                                  |
| G10 | **교육 시장의 가격 장벽**                   | 사이트 라이선스 의존                                             | 무료 교육판 + 학습 기능(메커니즘 화살표 검증, 퀴즈)                                                                                                                              |
| G11 | **ChemSketch 사용자 이탈**                  | Revvity 인수 후 신규 판매 중단 정황                              | 프리웨어 사용자층(누적 250만 다운로드)을 흡수할 무료 Windows/웹 대안                                                                                                             |
| G12 | **바이오+케미 하이브리드 편집**             | ChemDraw HELM은 있으나 엔지니어링 친화 API는 제한적              | Ketcher Macromolecules 수준 이상의 혼합 모달리티 편집 + HELM/SMILES/MOL v3000 라운드트립                                                                                         |

### 4.2 ChemDraw가 여전히 우위인 영역(따라잡기 어려운 해자)

- 저널·특허 업계의 CDX/CDXML 관행, 수십 년간 쌓인 스타일 문서(ACS 1996 등)
- Name=Struct / Struct=Name 품질, ChemScript, Signals 플랫폼(ELN·등록) 결합
- 현재 Revvity는 ChemDraw + ACD/Labs(명명·NMR·물성 예측: ACD/Name, Spectrus, Percepta)를 모두 갖춰 **명명·예측 분야의 해자가 더 깊어졌다**.

### 4.3 진입 전략 시사점

1. **무료 코어 + CDX/CDXML 완전 호환**이 S1 진입의 최소 조건이다(Zoho·ChemDoodle이 기준선).
2. **임베더블 웹 SDK**는 Marvin JS EOL 창(~2027-12)이 최적의 진입 타이밍이다. Ketcher와 비교해 번들 크기, 렌더링 품질, API 인체공학에서 차별화해야 한다.
3. **AI는 "검증 가능한 보조"로 포지셔닝**한다. OCSR, 이름 해석, 자동 정렬과 스타일 교정, 반응식 자동 배치처럼 결과를 툴킷으로 검증할 수 있는 기능부터 시작한다.

---

## 5. 후속 정적 분석용: 웹 기반 스케처/관련 npm 패키지 목록

| 패키지                                                                                    | 최신 버전(날짜)                 | 라이선스                | 비고                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------- | ----------------------- | -------------------------------------- |
| ketcher-core                                                                              | 3.18.0 (2026-09-02)             | Apache-2.0              | Ketcher 코어                           |
| ketcher-react                                                                             | 3.18.0 (2026-09-02)             | Apache-2.0              | React UI                               |
| ketcher-standalone                                                                        | 3.18.0 (2026-09-02)             | Apache-2.0              | Indigo WASM 내장                       |
| ketcher-macromolecules                                                                    | 3.18.0 (2026-09-02)             | Apache-2.0              | 거대분자 모드                          |
| indigo-ketcher                                                                            | 1.46.0 (2026-08-24)             | Apache-2.0              | Indigo WASM                            |
| jsme-editor                                                                               | 2024.4.29 (2024-07-21)          | BSD-3                   | JSME                                   |
| jsme                                                                                      | 2017.2.26 (2019-10-23)          | 커스텀                  | 구버전 JSME                            |
| @loschmidt/jsme-react                                                                     | 1.0.2 (2024-05-02)              | BSD-3                   | React 래퍼                             |
| jsme-react                                                                                | 0.0.9 (2020)                    | ?                       | React 래퍼                             |
| kekule                                                                                    | 1.0.4 (2026-05-22)              | ?                       | Kekule.js                              |
| kekule-react                                                                              | 0.1.1 (2023-01-31)              | ?                       | React 래퍼                             |
| openchemlib                                                                               | 9.25.2 (2026-10-27)             | BSD-3                   | OCL JS(에디터 포함)                    |
| openchemlib-utils                                                                         | 8.20.1 (2026-10-27)             | MIT                     | 유틸                                   |
| react-ocl                                                                                 | 8.7.2 (2026-07-10)              | MIT                     | OCL React 컴포넌트                     |
| @rdkit/rdkit                                                                              | 2026.9.2 (2026-11-05)           | BSD-3                   | RDKit MinimalLib WASM                  |
| rdkit-structure-renderer                                                                  | 1.2.25 (2024-11-13)             | BSD-3                   | RDKit 렌더러                           |
| smiles-drawer                                                                             | 2.4.1 (2026-06-26)              | MIT                     | 렌더러                                 |
| webmolkit                                                                                 | 2.0.13 (2026-11-03)             | Apache-2                | Alex Clark 스케처/툴킷                 |
| @chemistry/molpad                                                                         | 3.2.14 (2026-11-07)             | MIT                     | 신규 React 에디터                      |
| @datagrok/chem                                                                            | 1.17.18 (2026-10-30)            | ?                       | Datagrok 화학(OCL 의존)                |
| @datagrok/ketcher-sketcher                                                                | 2.4.9 (2026-09-23)              | ?                       | Datagrok용 Ketcher 래퍼                |
| @datagrok/helm                                                                            | 3.0.6                           | ?                       | HELM 지원                              |
| datagrok-api                                                                              | 1.27.12 (2026-10-02)            | ?                       | Datagrok JS API                        |
| @kent-tokyo/chematic                                                                      | 1.2.1 (2026-10-23)              | MIT OR Apache-2.0       | Rust 툴킷 WASM(CDXML 실험적)           |
| react-chemdoodle                                                                          | 0.0.7 (2023-02-15)              | MIT                     | ChemDoodle Web 래퍼(본체는 npm 미배포) |
| chemdoodle-next / @wcmc/ng-chemdoodle                                                     | 1.0.1 / 1.0.0                   | ?                       | ChemDoodle 래퍼                        |
| 3dmol / molstar / ngl / miew                                                              | 2.5.5 / 5.13.1 / 2.5.0 / 0.12.0 | BSD-3 / MIT / MIT / MIT | 3D 뷰어(참고)                          |
| (Ketcher 포크) @emeraldsci/ketcher-react, chem-ketcher-viewer, chem2dview, ketjson-to-img | —                               | —                       | 커스텀 포크/래퍼 사례                  |

**npm 미배포 웹 스케처(직접 다운로드/GitHub로 확보)**: ChemDoodle Web Components(web.chemdoodle.com, GPLv3), Marvin JS(Chemaxon 배포, 상용), JSDraw.Lite(github.com/scilligence/jsdraw.lite), HELM Web Editor(github.com/PistoiaHELM/HELMWebEditor), Schrödinger Sketcher(github.com/schrodinger/sketcher, WASM 빌드), ChemDraw JS(Revvity, 상용), MolView(github.com/molview/molview), PubChem Sketcher(서버형).

---

## 6. 주요 출처 모음

- Revvity ChemDraw: https://revvitysignals.com/chemdraw , https://support.revvitysignals.com/hc/en-us/articles/43934842634004 , https://revvitysignals.com/whats-new/Signals%20ChemDraw?expand=all , https://support.revvitysignals.com/hc/en-us/articles/4408268410900-iPad-iOS-apps-ChemDraw-Chem3D-and-CDSL-have-been-withdrawn-from-the-Apple-iTunes-store
- Revvity–ACD/Labs: https://www.businesswire.com/news/home/20251110692197/en , https://www.sec.gov/Archives/edgar/data/0000031791/000003179126000027/revv-20260705.htm
- Siemens–Dotmatics: https://news.siemens.com/de-ch/dotmatics-closing/
- Certara/Chemaxon: https://www.certara.com/marvin/ , https://www.certara.com/cxn/blog/marvin-js-end-of-life-and-transition-notice
- 대안 목록: https://alternativeto.net/software/chemdraw/ , https://www.linuxlinks.com/best-free-open-source-chemical-structure-drawing-tools/ , https://blopig.com/blog/?p=10660
- npm registry: https://registry.npmjs.org/<package>
- GitHub 스타 수: https://ungh.cc/repos/<owner>/<repo> (2026-11-10 조회)
