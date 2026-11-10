# 05. 경쟁 엔진 실측 분해 (REA 정적 분석)

> 기준일 2026-11-10. ChemDraw 자체 바이너리는 분석할 수 없었다([03](03-chemdraw-functional-decomposition.md) 머리말 참고). 대신 ChemDraw와 **같은 기능 블록을 구현한 공개 엔진 9종**을 npm 레지스트리에서 받아 REA로 정적 분석했다. *어떤 부품으로 ChemDraw급 제품이 만들어지는지*를 실측한 것이다.
>
> - 도구: REA `rea-agents@6.7.0`(이 저장소, `node scripts/rea.mjs`), WABT 1.0.42
> - 실행 방식: 실행하지 않는 정적 분석만 했다. 대상 코드는 별도의 untrusted 디렉터리에 풀었다.
> - 원본 Evidence(합계 약 400 MB JSON)는 커밋하지 않았다. 요약과 `evidence_id`만 [`evidence/rea/*.summary.json`](evidence/rea/)에 남겼다. 요약 스크립트는 [`tools/summarize_rea_js.py`](tools/summarize_rea_js.py)다.

## 1. 대상과 실행 결과

| 대상(npm)                | 버전      | 라이선스   | 선택 소스                                       | REA 결과                             | 소요  | 의미 노드 | 관계   | 함수 지문 | unknown |
| ------------------------ | --------- | ---------- | ----------------------------------------------- | ------------------------------------ | ----- | --------- | ------ | --------- | ------- |
| `ketcher-core`           | 3.14.0¹   | Apache-2.0 | `dist/index.modern.js` (6.9 MB)                 | complete                             | 198 s | 20,488    | 3,938  | 6,696     | 25,856  |
| `ketcher-react`          | 3.14.0¹   | Apache-2.0 | `dist/index.modern-435976ac.js` (3.3 MB)        | complete                             | 40 s  | 21,045    | 13,287 | 2,116     | 32,540  |
| `indigo-ketcher`         | 1.46.0    | Apache-2.0 | `indigo-ketcher-separate-wasm.js` (JS 글루)     | complete                             | 19 s  | 19,304    | 17,750 | 557       | 6,254   |
| `@rdkit/rdkit`           | 2026.9.2  | BSD-3      | `dist/RDKit_minimal.js` (JS 글루)               | complete                             | 19 s  | 15,922    | 19,788 | 479       | 5,067   |
| `jsme-editor`            | 2024.4.29 | BSD-3      | `jsme.nocache.js` + GWT 퍼뮤테이션 1개 (1.2 MB) | complete                             | 174 s | 23,080    | 47,348 | 1,134     | 20,843  |
| `kekule`                 | 1.0.4     | MIT²       | `src/core/*`, `src/io/*` 14 파일                | complete                             | 25 s  | 36,145    | 27,833 | 1,246     | 16,525  |
| `smiles-drawer`          | 2.4.1     | MIT        | `src/*.js` 26 파일                              | complete                             | 35 s  | 31,444    | 24,863 | 487       | 11,682  |
| `openchemlib`            | 9.25.2    | BSD-3      | 패키지 전체(GWT 산출물 포함)                    | **partial** (provider_timeout 300 s) | 301 s | 929       | 104    | 0         | 45      |
| WASM: InChI(kekule 번들) | —         | —          | `inchi.wasm` 0.6 MB                             | complete                             | <5 s  | —         | —      | —         | —       |
| WASM: RDKit/Indigo       | —         | —          | 7.4–11.8 MB                                     | REA 한도 초과 → WABT 직접            | —     | —         | —      | —         | —       |

¹ 분석 시점의 `npm pack`은 3.14.0을 받았다. `npm view`가 보고하는 최신판은 3.18.0이다. 차이 기능은 검증하지 않았다.
² kekule `package.json`에 license 필드가 없다. MIT 표기는 프로젝트 사이트 기준이다(미확인).

**REA 관찰 한계(재현 시 참고)**

- 첫 시도로 패키지 *전체*를 분석했을 때, OpenChemLib은 GWT로 컴파일된 `openchemlib.debug.js`(3.5 MB)에서 소스당 300 s 기한에 걸렸다. 결과는 partial Evidence로만 남았다. 이후 진입 파일을 `--source-path`로 골라 재실행하자 나머지는 모두 complete였다.
- `inspect-wasm-artifact`에는 입력 8 MiB와 WABT 출력 32 MiB라는 고정 예산이 있다(런타임 재정의 불가). 그래서 RDKit과 Indigo 같은 대형 화학 커널은 이 경로로 다룰 수 없었다. 이들은 같은 WABT 바이너리로 섹션 헤더만 수집했다([`evidence/wasm-inspection.md`](evidence/wasm-inspection.md)).
- `ketcher-core`의 관계(relations)가 `captures` 3,938개뿐인 것은 6.9 MB 단일 번들에서 의미 그래프 노드 상한(파일당 20,000)에 걸렸기 때문으로 보인다(요약의 limitations 참조). 함수 지문 6,696개는 온전히 수집됐다.

## 2. 엔진별 분해

### 2.1 Ketcher (EPAM) — "UI ↔ 화학 커널" 분리의 교과서

```
ketcher-react (React 18, Redux, MUI, Emotion, Draft.js, react-dropzone, miew-react(3D))
   │  Editor / MicromoleculesEditor / MacromoleculesEditor
   ▼
ketcher-core
   ├ domain/entities    : Struct, Atom, Bond, SGroup, RGroup, RxnArrow, MultitailArrow, Text, Image,
   │                      + Macromolecule: Peptide, Sugar, Phosphate, RNABase, Nucleotide, PolymerBond…
   ├ domain/serializers : KET(JSON), MOL, SMILES …
   ├ application/editor : tools(Bond, Erase, Hand, Select, Monomer, RnaPreset, Zoom…), Command/Operation(Undo)
   ├ application/render : Raphael(SVG) + d3(select/zoom/drag) + paper.js + svgpath
   └ domain/services/struct : StructService 인터페이스 (15 연산, 아래)
   ▼  (Web Worker 메시지: Command enum 0..13)
ketcher-standalone → indigo-ketcher (C++ Indigo → Emscripten WASM, render/norender 2빌드)
```

- **StructService 15 연산**(`structService.types.d.ts`, 관찰): `info, convert, layout, clean, aromatize, dearomatize, calculateCip, automap, check, calculate, recognize, getInChIKey, generateImageAsBase64, toggleExplicitHydrogens, calculateMacromoleculeProperties`.
  → ChemDraw ④ 화학 지능과 ⑧ I/O 블록에 1:1로 대응한다. `recognize`(이미지→구조)는 원격 Imago 서비스용이다(standalone에서는 미지원으로 보임, 추론).
- **지원 포맷 20종**(`SupportedFormat`, 관찰): rxnfile, molfile, smiles, smarts, cml, inchi, inchi-aux, inchi-key, ket, **cdx, cdxml**, sdf, fasta, sequence, peptide-sequence-3-letter, idt, axo-labs, helm, rdf, monomer-library.
- **ChemDraw 연동 관찰**(ketcher-react `dist/index.js` 14809–14850행): 파일 이름이 `.cdx`이면 DataURL(base64)로 읽는다. `.pptx`이면 `cfb`(Compound File Binary) 라이브러리로 ZIP 안의 `*.bin` OLE를 열고, `CONTENTS` 스트림의 base64가 `VmpDRDAxMDAEAw`로 시작하면 ChemDraw 구조로 판단한다. 그 결과를 `CDXStructuresViewer`로 여러 개 미리 보여 준다. **PowerPoint 속 ChemDraw 객체를 꺼내는 기능을 경쟁 제품이 이미 구현하고 있다.**
- REA 의존성 관찰(`import_specifiers`): ketcher-core는 `d3, paper, svgpath, lodash/fp, file-saver, assert, react-device-detect`(25개). ketcher-react는 `@mui/material, @emotion/*, react-redux, redux-thunk, reselect, react-contexify, react-dropzone, react-intersection-observer`(34개).

### 2.2 Indigo WASM 글루 / RDKit MinimalLib — 화학 커널의 API 표면

- **RDKit MinimalLib**(`RDKit_minimal.d.ts`, 관찰) 공개 메서드는 약 110개다. 대표 메서드:
  `get_smiles/get_cxsmiles/get_molblock/get_inchi/get_json`, `get_svg(_with_highlights)/draw_to_canvas`, `get_descriptors`, `get_morgan_fp/get_pattern_fp/get_maccs_fp/get_atom_pair_fp/get_topological_torsion_fp`, `get_substruct_match(es)`, `get_mcs_as_*`, `get_rgd/get_rgroups_as_*`, `get_mmpa_frags`, `generate_aligned_coords/set_new_coords/straighten_depiction/normalize_depiction`, `condense_abbreviations`, `get_stereo_tags`, `run_reactants`, `add_to_png_blob/get_mol_from_png_blob`(**PNG 메타데이터에 분자 삽입**). ChemDraw가 PNG/EMF에 CDX를 넣는 방식과 같은 발상이다.
- **WASM 구조**([`evidence/wasm-inspection.md`](evidence/wasm-inspection.md)): RDKit은 7,357개 함수, Code 6.1 MB, Export 12개. Indigo(렌더 포함)는 11,432개 함수, Code 8.9 MB, Export 15개. 공개 API 전부가 Embind 테이블을 통해 노출된다.
- REA 의미 그래프로 보면 두 글루 모두 `awaits / creates-promise / schedules-timer / constructs-request`가 소수 존재한다. WASM을 `fetch`로 비동기 로드하는 부트스트랩이다(관찰: relation_kinds). **네트워크 엔드포인트 리터럴은 없다.** 로컬 실행이다.

### 2.3 OpenChemLib (Idorsia / DataWarrior) — 단일 Java 코드베이스의 GWT 트랜스파일

- `.d.ts`에서 19개 공개 클래스를 확인했다: `Molecule, SmilesParser, RingCollection, Canonizer, CanonizerUtil, Reaction, ReactionEncoder, Reactor, SDFileParser, SSSearcher(WithIndex), MCS, Transformer, MoleculeProperties, DruglikenessPredictor, ToxicityPredictor, ConformerGenerator, ForceFieldMMFF94, CanvasEditor`.
- **물성·독성·약물유사성 예측 + 3D 형태(MMFF94) + 편집기**가 의존성 0개, 1.1 MB JS 하나에 들어 있다. ChemDraw의 ⑥과 ⑩ 블록을 가장 작게 대체하는 후보다.
- REA로는 GWT 출력의 크기와 구조 때문에 partial이었다(§1).

### 2.4 JSME — GWT 퍼뮤테이션형 경량 에디터

- `compilation-mappings.txt`(관찰): 브라우저 user agent(`gecko1_8`, `safari` 등)별로 서로 다른 `*.cache.js` 퍼뮤테이션을 내려보낸다. 3개 파일, 각 0.4–1.2 MB다.
- REA 관계 47,348개 중 `captures` 29,453개, `returns-to-call` 9,617개다. 클로저 중심의 GWT 출력 패턴이다(도출).
- 단일 분자 편집과 SMILES/MOL 출력에 집중한다. 반응·그래픽·문서 기능은 제한적이다.

### 2.5 Kekule.js — 플러그인형 화학 프레임워크

- 모듈: `core, chemdoc, algorithm, calculation, io, render, reaction, spectroscopy, widgets, webComponents, localization(en/zh)` 등 190개 JS다.
- IO 리더(관찰): MDL(V2000/V3000, MOL/RXN), **CML 전체 계열(분광 데이터 포함)**, **JCAMP-DX**(분광), Kekule 고유 KCJ/KCX. **CDX 리더는 없다**(관찰: `Kekule.IO.*Reader` 목록).
- 외부 엔진은 WASM 3종(OpenBabel, Indigo, InChI)을 _선택적으로_ 로드한다.
- ChemDraw의 "문서(chemdoc) + 분광"과 가장 비슷한 구조다. 단 출판 품질 렌더와 포맷 왕복은 약하다(추론).

### 2.6 SmilesDrawer — 렌더러 전용

- 26개 소스 모듈: `Parser`(SMILES) → `Graph/Ring/SSSR/CycleBasis` → `Drawer/SvgDrawer/CanvasWrapper`, `ReactionParser/ReactionDrawer`, `CIP.ts`, `GaussDrawer`(가중치 히트맵), `ThemeManager`.
- **편집 없이 SMILES를 2D로 배치하고 그리는 데만** 특화되어 있다. ChemDraw ③ 렌더러의 최소 대체물이다.

## 3. 블록 대응표 (ChemDraw ↔ 실측 엔진)

| ChemDraw 블록([03](03-chemdraw-functional-decomposition.md)) | Ketcher+Indigo                         | RDKit MinimalLib                           | OpenChemLib          | Kekule     | JSME | SmilesDrawer |
| ------------------------------------------------------------ | -------------------------------------- | ------------------------------------------ | -------------------- | ---------- | ---- | ------------ |
| ① 편집 UI                                                    | ●(React)                               | ○                                          | ◐(CanvasEditor)      | ●(widgets) | ●    | ○            |
| ② 장면/문서 모델                                             | ●(KET: 분자+화살표+텍스트+이미지+도형) | ○                                          | ○                    | ◐(chemdoc) | ○    | ○            |
| ③ 렌더(SVG/Canvas)                                           | ●                                      | ●(SVG/Canvas)                              | ●                    | ●          | ●    | ●            |
| ④ 화학 지능(원자가/CIP/방향족/매핑)                          | ●                                      | ●                                          | ●                    | ◐          | ◐    | ◐(CIP)       |
| ⑤ Struct↔Name                                                | ○                                      | ○                                          | ○                    | ○          | ○    | ○            |
| ⑥ 물성/예측                                                  | ◐(calculate)                           | ●(descriptors/FP)                          | ●(물성·독성·약물성)  | ◐          | ○    | ○            |
| ⑦ 바이오폴리머(HELM 등)                                      | ●(Macromolecules 모드)                 | ○                                          | ○                    | ○          | ○    | ○            |
| ⑧ CDX/CDXML I/O                                              | ●(읽기/쓰기)                           | ◐(RDKit 본체 선택 빌드, MinimalLib 미확인) | ○                    | ○          | ○    | ○            |
| ⑩ 3D                                                         | ◐(miew 뷰어)                           | ○                                          | ●(Conformer, MMFF94) | ◐          | ○    | ○            |

●=제공 · ◐=부분 · ○=없음/미확인. 근거는 위 §2의 관찰 항목이다.

**결론**: 오픈소스만으로도 ChemDraw의 ①②③④⑥⑦⑧(읽기) 블록을 꽤 높은 수준으로 조립할 수 있다. 비어 있는 곳은 **⑤ 구조→IUPAC 이름**, **출판 품질의 스타일시트·인쇄**, **Office OLE 쓰기와 in-place 편집**이다. 이 세 가지가 ChemDraw의 실질적인 해자다([06](06-capability-matrix.md), [07](07-clone-blueprint.md)).

## 4. 재현 명령

```bash
npm ci && npm run build:cached                      # REA 빌드
mkdir -p /tmp/t && cd /tmp/t && npm pack ketcher-core ketcher-react indigo-ketcher @rdkit/rdkit openchemlib jsme-editor kekule smiles-drawer
for f in *.tgz; do mkdir -p x/${f%.tgz}; tar xzf $f -C x/${f%.tgz}; done
cd - && node scripts/rea.mjs analyze-javascript-application /tmp/t/x/rdkit-rdkit-2026.9.2/package \
  --source-path dist/RDKit_minimal.js --format json --full-output > rdkit.json
python3 -I experiments/chemdraw-teardown/tools/summarize_rea_js.py /tmp/summ rdkit.json
REA_WABT_BIN_DIRECTORY=/abs/wabt-1.0.42/bin node scripts/rea.mjs inspect-wasm-artifact /tmp/t/x/kekule-1.0.4/package/dist/extra/inchi.wasm --format json
```
