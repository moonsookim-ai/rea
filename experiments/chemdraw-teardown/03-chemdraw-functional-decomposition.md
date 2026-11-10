# 03. ChemDraw 기능·아키텍처 역공학 분해

> 기준일 2026-11-10. ChemDraw 데스크톱/웹 바이너리는 라이선스가 필요하고, 웹 제품(ChemDraw JS, ChemDraw+)은 이 분석 환경에서 접근할 수 없었다(revvitysignals.com은 Akamai 403, chemdrawdirect.* 호스트는 CONNECT 502). 그래서 이 문서는 **블랙박스 역공학**이다. 다음 자료를 교차해서 기능 블록을 재구성했다.
>
> - 공개 산출물: 파일 포맷 C++ 코드와 CDX SDK([04](04-cdx-format-teardown.md))
> - 공식 문서: 릴리스 노트, Dot Chart, 하드웨어 가이드([01](research/01-chemdraw-deep-research.md))
> - 같은 기능을 구현한 오픈소스 엔진을 REA로 정적 분석한 결과([05](05-engine-teardown-rea.md))
>
> 각 블록에 근거 수준을 표시한다. **관찰**(공개 코드·문서에서 직접 확인) / **도출** / **추론**(외부 행동과 유사 구현에서 유추) / **미확인**.

---

## 1. 제품 구조 한 장 요약

```
                         ┌──────────────── Signals 클라우드 (SaaS) ────────────────┐
                         │ Signals Notebook · ChemDraw+ (web) · Collections · HELM   │
                         │ Monomer Library · 라이선스(sign-in, 30일 오프라인)         │
                         │ Xynthetica(AI 예측 MaaS) · Signals AI(에이전트) · MCP      │
                         └──────────────▲───────────────────────────▲───────────────┘
                                        │ 저장/동기화/라이선스            │ 웹 SDK
┌─────────────────────── ChemDraw 데스크톱 (Win/Mac) ───────────┐   ┌──┴─────────────────┐
│ ① UI 셸: 툴바·팔레트·템플릿·핫키·스타일시트(ACS 1996 등)       │   │ ChemDraw JS        │
│ ② 문서 모델: CDX 객체 트리(Document→Page→Fragment/Node/Bond… │   │ (TypeScript, 임베드│
│    + Graphic/Arrow/TLC/GEP/Plasmid/Spectrum/Table)           │   │  가능한 웹 에디터;  │
│ ③ 렌더러: 1/65536 pt 고정소수점 → 화면/인쇄/EMF/PDF/SVG/PNG   │   │  Reaxys 등에 내장)  │
│ ④ 화학 지능: 원자가 검사·방향족성·CIP/enhanced stereo·반응 인식│   └────────────────────┘
│ ⑤ 이름 엔진: Struct=Name / Name=Struct (+ChemACX, CAS RN)      │
│ ⑥ 예측 엔진: 1H/13C NMR(가산 증분), MS 단편, 물성(ClogP/CMR,   │
│    Molecular Networks pKa/LogP/LogS, tPSA, 원소분석)          │
│ ⑦ 바이오: HELM·단량체 라이브러리·서열·플라스미드·TLC/겔       │
│ ⑧ I/O: CDX/CDXML/MOL V2000·V3000/SDF/RXN/SMILES/InChI/HELM/  │
│    FASTA/3MF, 클립보드·OLE(CONTENTS 스트림=CDX)               │
│ ⑨ 연동: Office 애드인(Word/PPT/Excel), SciFinder-n·Reaxys·   │
│    PubChem GHS·Google 애드인(WebView2), ChemScript(.NET/Py)  │
│ ⑩ Chem3D(Win): MM2/MMFF94, Gaussian·MOPAC·GAMESS·CONFLEX·    │
│    AutoDock 인터페이스                                        │
└──────────────────────────────────────────────────────────────┘
```

## 2. 블록별 분해

| #   | 블록      | 내부 구조(재구성)                                                                                                                                                                                                | 근거                                       | 대응 오픈소스 구현(분해 근거)                                                                                                    |
| --- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| ①   | UI 셸     | 도구 팔레트(결합, 고리, 체인, 텍스트, 펜, 화살표, 괄호, 궤도, 실험기구 템플릿), 상태 머신 기반 도구 전환, 핫키(“magic hotkeys”, `g` 핫스팟 22.0), 스타일시트(결합 길이 14.4 pt, 선폭 0.6 pt 등)                  | 관찰(Dot Chart, 릴리스 노트)               | Ketcher `application/editor/tools`(Bond, Erase, Hand, Monomer, RnaPreset, Select, Zoom…)                                         |
| ②   | 문서 모델 | `CDXObject` 단일 상속 트리, 52 객체 타입·400 속성. 분자와 그림이 같은 장면 그래프에 있음. 반응은 ObjectID 참조로 사후 해석                                                                                       | **관찰**(Revvity 공개 코드)                | Ketcher `domain/entities`(Struct, Atom, Bond, SGroup, RxnArrow, MultitailArrow, Text, Image…) + KET JSON                         |
| ③   | 렌더러    | 페이지 좌표(pt), 서식 런 텍스트, 인쇄 여백·트림 마크·페이지 분할(`WidthPages/HeightPages`) 속성 → 출판·인쇄 중심                                                                                                 | 관찰(Document 속성) + 추론                 | Ketcher: Raphael(SVG) + d3(zoom/drag) + paper.js; RDKit/Indigo: C++에서 SVG/PNG 생성                                             |
| ④   | 화학 지능 | 원자가·전하·동위원소·stereo 경고(26.0에 non-stereo 원자에서 시작하는 stereo bond 경고 추가), CIP R/S/r/s/M/P, enhanced stereo(Abs/And/Or), atropisomer, 반응 인식(시약만 있어도 반응)                            | 관찰(enum + 릴리스 노트)                   | Indigo `check / calculateCip / aromatize / automap`(Ketcher StructService) · RDKit `get_stereo_tags`                             |
| ⑤   | 이름 엔진 | Struct=Name 1997년 무렵 도입. Name=Struct는 ChemACX 사전·CAS RN 조회와 결합                                                                                                                                      | 관찰(01 리서치) · 내부 알고리즘 **미확인** | OPSIN(이름→구조, 규칙 기반), STOUT(신경망 양방향)                                                                                |
| ⑥   | 예측 엔진 | NMR: ChemNMR 계열 가산 증분(1H 기준값 700·증분 2,000, 13C 파라미터 4,000. 2004 도움말 기준). 물성: ClogP/CMR, Molecular Networks(pKa/LogP/LogS, Windows 전용), 26.0 Predicted pKa. 큰 분자 상한 heavy atom 150개 | 관찰(문서) · 현행 엔진 동일성 **미확인**   | OpenChemLib `MoleculeProperties`, `DruglikenessPredictor`, `ToxicityPredictor`; RDKit `get_descriptors`; nmrshiftdb·NMRium(외부) |
| ⑦   | 바이오    | Node 타입 `Monomer`, 객체 `Sequence/BioShape/PlasmidMap/TLC/GEP`, HELM 직렬화, Pistoia 라이브러리, hairpin·상보 가닥(25–26)                                                                                      | **관찰**(enum) + 문서                      | Ketcher Macromolecules 모드(Peptide/Sugar/Phosphate/RNABase/PolymerBond 엔티티, HELM/IDT/FASTA/AxoLabs 포맷)                     |
| ⑧   | I/O       | CDX↔CDXML 이중 직렬화(`WriteAttributesTo` / `XMLWriteAttributes`), MOL V3000 기본(23.0), OLE `CONTENTS`=CDX                                                                                                      | **관찰**                                   | Indigo convert(cdx, cdxml, base64-cdx, ket, mol, rxn, smiles, smarts, cml, inchi…)                                               |
| ⑨   | 연동      | 애드인 SDK와 WebView2 호스팅(23.0, IE11 대체), ChemScript(Python 3.9–3.14, .NET), Office OLE in-place 편집                                                                                                       | 관찰                                       | Ketcher의 PPTX→OLE→CDX 추출(cfb 라이브러리)                                                                                      |
| ⑩   | 3D        | Chem3D(Windows 전용), MM2/MMFF94, 외부 QM 엔진 인터페이스, 3MF 내보내기                                                                                                                                          | 관찰                                       | OpenChemLib `ConformerGenerator`/`ForceFieldMMFF94`, Avogadro 2, miew(Ketcher 3D 뷰)                                             |
| ⑪   | 클라우드  | ChemDraw+ ↔ Signals Notebook 저장, 데스크톱 Open/Save에서 클라우드 접근, Collections(Office 문서 속 구조 색인)                                                                                                   | 관찰                                       | Chemotion ELN + Ketcher, CDD Vault + Ketcher                                                                                     |
| ⑫   | 라이선스  | 2025-01-01 영구 판매 종료 → 구독 전용, sign-in, 30일 오프라인 허용                                                                                                                                               | 관찰                                       | (해당 없음)                                                                                                                      |

## 3. 데이터 흐름 (재구성)

```
사용자 입력(마우스/핫키/붙여넣기)
   │
   ▼
도구 상태 머신 ──► 편집 명령(Command/Undo 스택) ──► CDX 객체 트리 변경
                                                     │
            ┌────────────────────────────────────────┼─────────────────────────────┐
            ▼                                        ▼                             ▼
  화학 해석(Fragment→분자 그래프)           렌더러(pt 좌표→화면/인쇄)          직렬화(CDX/CDXML/OLE)
   ├ 원자가/stereo 경고 → 빨간 박스               └ 스타일시트 적용                 └ MOL/SMILES/InChI 변환
   ├ CIP/enhanced stereo 라벨
   ├ Analysis 패널(MW, 식, tPSA, LogP, pKa…)
   ├ Struct=Name
   └ NMR/MS 예측 창
```

- **추론 근거**: Ketcher의 `StructService`는 `info, convert, layout, clean, aromatize, dearomatize, calculateCip, automap, check, calculate, recognize, getInChIKey, generateImageAsBase64, toggleExplicitHydrogens, calculateMacromoleculeProperties`의 15개 연산을 **Web Worker 너머의 C++(WASM) 엔진**에 위임한다. 화학 앱이 "편집 UI ↔ 화학 커널"을 메시지 경계로 분리하는 전형적인 구조다. ChemDraw JS 역시 TypeScript UI와 서버/엔진을 분리한다(채용 공고상 웹 = TypeScript). 다만 엔진이 WASM으로 로컬에서 도는지 서버에서 도는지는 **미확인**이다.
- ChemDraw 데스크톱은 이 경계가 프로세스 내부 C++ 호출일 것으로 추정한다(추론). 공개된 `CoreChemistryAPI.h`의 이름 자체가 "Core Chemistry" 라이브러리를 DLL 경계(export 매크로)로 분리하는 구조임을 보여 준다(관찰: Glysade가 "RDKit의 export 매커니즘으로 재구현"했다고 명시).

## 4. 경쟁 해자 분석 (블록별 모방 난이도)

| 블록                        | 오픈소스로 대체 가능한 정도                                                                              | 근거 / 비고                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| ② 문서 모델·⑧ 포맷          | **높음**. CDX 읽기는 Revvity 공개 코드·Indigo·RDKit으로 가능. 완전한 왕복(그래픽 포함)은 어려움          | 400개 속성 중 80%가 비화학(그래픽/문서) → 렌더링 충실도가 실질 난관 |
| ④ 화학 지능                 | **높음**. Indigo/RDKit/OCL이 CIP, 방향족성, 원자가, 반응 매핑 제공                                       | 경고 UX의 세밀함은 별개                                             |
| ⑤ 이름 엔진                 | **중간**. 이름→구조는 OPSIN이 강함. 구조→IUPAC 이름은 오픈소스에 성숙한 규칙 엔진이 부족(STOUT는 확률적) | ChemDraw·ACD/Name(이제 둘 다 Revvity 소유)이 사실상 양강            |
| ⑥ NMR/물성 예측             | **중간**. 오픈 데이터(nmrshiftdb2) 기반 예측은 가능하지만 상용 엔진 대비 검증 부족                       | Revvity는 ACD/Labs 인수로 NMR 예측·분석까지 확보                    |
| ③ 출판 품질 렌더·스타일시트 | **낮음~중간**. 저널 스타일·인쇄·OLE in-place 편집의 40년 축적                                            | 사용자 습관과 저널 제출 관행이 진짜 해자                            |
| ⑨ Office/ELN 연동           | **낮음**. OLE 객체 생태계(기존 문서에 박힌 수백만 개 CDX)가 락인을 만든다                                | Ketcher도 PPTX 속 CDX를 _읽기만_ 한다                               |
| ⑫ 브랜드·교육               | **매우 낮음**                                                                                            | 대학 사이트 라이선스, 교재·저널 관행                                |

## 5. 핵심 통찰

1. **ChemDraw는 "화학 계산 소프트웨어"가 아니라 "화학 의미를 가진 벡터 출판 도구"다.** 포맷 속성의 80%가 그래픽·문서 쪽이고, 화학 커널은 상당 부분 외부 라이선스 엔진(Molecular Networks, ClogP, ChemNMR 계열)으로 채웠다(관찰 + 도출).
2. **락인의 핵심은 파일과 Office 임베딩이다.** OLE `CONTENTS` 스트림에 CDX가 그대로 들어가므로, 기존 PPT/Word 문서를 편집하려면 CDX를 다룰 수 있어야 한다. 경쟁자들이 CDX *읽기*부터 지원하는 이유다(Ketcher, KingDraw, Zoho ChemStudio, ChemDoodle).
3. **2025–2026 전략 변화**: 구독 전환, ACD/Labs 인수로 ChemSketch 신규 판매 종료(이름·NMR 경쟁자 흡수), AI는 Signals 플랫폼(Xynthetica, Signals AI, MCP) 쪽에 두고 ChemDraw 본체에는 두지 않는 구조. 과거 역합성 도구는 23.0에서 제거했다.
4. **시장 공백**: Marvin JS EOL(신규 판매 2026-12-31 종료), 저가·무료 대체재 수요(구독 반발), 완전한 CDX 왕복을 지원하는 _임베드 가능한_ 웹 라이브러리 부재([02 §4](research/02-competitor-landscape.md)).
