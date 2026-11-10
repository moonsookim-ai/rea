# 04. ChemDraw 네이티브 포맷(CDX/CDXML) 역공학 분해

> 기준일 2026-11-10. ChemDraw 바이너리를 직접 실행하거나 디컴파일하지 않았다. 대신 다음 세 가지 1차 자료를 썼다.
>
> 1. **Revvity가 BSD-3로 공개한 ChemDraw 파일 포맷 C++ 코드**. 저장소는 `github.com/Glysade/chemdraw`(커밋 `5dd7432`, 2026-06-21)이고, RDKit의 `External/ChemDraw`가 이 코드로 빌드된다. 실제 ChemDraw 제품에서 떼어 낸 코드라서, ChemDraw의 **내부 문서 객체 모델**을 그대로 보여 준다. `chemdraw/` 디렉터리의 C++/H 파일 92개, 30,675줄이다.
> 2. 같은 저장소의 `docs/`에 있는 **CDX SDK 문서 아카이브**(문서·그림 파일 327개, 샘플 `.cdx` 3개 포함). Revvity는 2024-10부터 이 SDK를 직접 호스팅하지 않는다([01 리서치 §4.4](research/01-chemdraw-deep-research.md)).
> 3. 이번에 만든 도구 `tools/extract_tags.py`(헤더의 enum을 컴파일러 규칙대로 평가)와 `tools/cdx_dump.py`(의존성 없는 CDX 트리 덤퍼)의 실행 결과. 증거 파일은 [`evidence/cdx-sample-dumps.txt`](evidence/cdx-sample-dumps.txt)와 [`evidence/cdx-class-hierarchy.txt`](evidence/cdx-class-hierarchy.txt)이다.
>
> 표기: **관찰** = 파일이나 코드에서 직접 본 사실 · **도출** = 관찰에서 기계적으로 계산한 값 · **추론** = 해석 · **미확인** = 검증하지 못함.

---

## 1. 결론 요약

| #   | 발견                                                                                                                                                                                                                                                                                                                                                         | 근거 수준                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| 1   | CDX는 **little-endian TLV 트리**다. 헤더 28바이트 뒤에 _객체_(태그 bit15=1, 4바이트 ID, 0x0000으로 닫음)와 _속성_(태그, 길이, 데이터)이 재귀적으로 이어진다.                                                                                                                                                                                                 | 관찰(SDK, 샘플 바이트)           |
| 2   | 실제 파일에서 **Document 객체의 태그와 ID는 생략**된다. 헤더 직후 곧바로 Document 속성(`CreationProgram="ChemDraw 7.0"` 등)이 나오고, 파일 끝의 `00 00`이 Document를 닫는다. SDK 본문은 "document object로 시작한다"고만 적어서 오해하기 쉽다.                                                                                                               | 관찰(샘플 3종 바이트 덤프)       |
| 3   | 객체 타입은 **52종**(0x8000–0x8032와 Unknown 0x8FFF)이고, 속성 태그는 **400개**다(별칭 포함, 섹션 27개).                                                                                                                                                                                                                                                     | 도출(`CDXConstants.h` enum 평가) |
| 4   | 헤더 주석의 hex 값은 **일부 틀렸다**. 예: `kCDXProp_Transparent`의 주석은 0x0011이지만 enum 값은 0x0012다. 주석으로 태그 표를 만드는 파서는 오동작할 수 있다.                                                                                                                                                                                                | 관찰                             |
| 5   | 객체 모델은 `CDXObject → CDXGraphicObject → {Node, Bond, Text, Arrow, Spectrum, TLCPlate, PlasmidMap, …}`로 이어지는 **단일 상속 트리**이고, 클래스 관계는 67개다. 화학(분자)과 그림(도형, 화살표, TLC, 겔, 플라스미드)이 **같은 장면 그래프(scene graph)** 안에 함께 산다. 이 구조가 ChemDraw를 "분자 편집기"이면서 "과학 일러스트 도구"로 만드는 핵심이다. | 관찰 + 추론                      |
| 6   | 원자(Node) 타입은 15종이다. Element 외에 ElementList, Nickname, Fragment, Formula, GenericNickname, Named/Anonymous AlternativeGroup, MultiAttachment, VariableAttachment, LinkNode, **Monomer**가 있다. Markush, 축약어, 바이오폴리머가 모두 *원자 노드의 변형*으로 표현된다.                                                                               | 관찰                             |
| 7   | 결합 차수(BondOrder)는 26개 값이다. 1/2/3/4/5/6중, ½·1½·2½ 등 분수 차수, Dative, Ionic, Hydrogen, ThreeCenter, 쿼리용 SingleOrDouble/…/Any가 모두 **비트 플래그 조합**으로 들어 있다. 결합 표시(BondDisplay)는 차수와 **분리**되어 16종(Wedge, Hash, Wavy, Hollow, Dot 등)이다. 화학 의미와 렌더링 표현을 분리한 설계다.                                     | 관찰 + 추론                      |
| 8   | 좌표 단위는 **1/65536 pt 고정소수점**(`CDXCoordinate`, INT32)이고, `CDXPoint2D`는 **y가 x보다 먼저** 저장된다. ACS 1996 스타일의 결합 길이 14.4 pt가 정수 943,718 단위로 정확히 표현된다.                                                                                                                                                                    | 관찰 + 도출                      |
| 9   | ChemDraw를 Office에 OLE로 넣으면, OLE 저장소의 `CONTENTS` 스트림에 **CDX 바이트가 그대로** 저장된다. Ketcher가 PPTX를 열 때 `.bin` OLE 안의 `CONTENTS`를 꺼낸 뒤 base64 접두사 `VmpDRDAxMDAEAw`(= `VjCD0100\x04\x03`)로 ChemDraw 객체를 식별하는 코드가 이를 보여 준다(ketcher-react 3.14.0 `dist/index.js` 14809–14850행).                                  | 관찰(제3자 코드) + 추론          |

---

## 2. 바이너리 레이아웃

```
offset  size  내용
0x00    8     "VjCD0100"            magic (56 6A 43 44 30 31 30 30)
0x08    4     04 03 02 01           reserved (엔디언 확인용으로 보임, 추론)
0x0C    16    00 × 16               reserved
0x1C    …     Document의 속성/자식이 바로 이어짐 (Document 태그/ID 생략 — 관찰)
              item := property | object
              property := tag:u16 (bit15=0) · len:u16 [len==0xFFFF → len:u32] · data[len]
              object   := tag:u16 (bit15=1) · id:u32 · item* · 0x0000
…       2     00 00                 Document 종료
```

`dimethylamine.cdx`(820바이트)의 첫 40바이트를 관찰한 결과다.

```
56 6a 43 44 30 31 30 30 04 03 02 01 00×16 | 03 00 0e 00 "ChemDraw 7.0"...
                                            ^ 0x0003 = CreationProgram, len 14 (CDXString)
```

**태그 공간 설계**(SDK 원문)

- bit15: 객체/속성 구분. bit14: 사용자 정의 여부. 따라서 미리 정의된 객체와 속성이 각각 16,383개, 사용자 정의 태그가 16,384개다.
- `CDXConstants.h`는 사용자 정의 영역의 앞 1,024개(`kCDXUser_TemporaryBegin..End`)를 **런타임 임시 태그**로 예약한다(관찰). 저장할 때 걸러야 하는 태그다.
- 길이 0의 속성은 "존재 자체가 참"이다(`CDXBooleanImplied`, 19개 속성).

### 2.1 속성 데이터 타입 분포 (도출, 400개)

| 타입                             | 개수 | 타입             | 개수 |
| -------------------------------- | ---- | ---------------- | ---- |
| INT16                            | 67   | CDXObjectIDArray | 19   |
| (주석에 타입 없음)               | 53   | Unformatted      | 15   |
| CDXBoolean                       | 36   | UINT16           | 12   |
| INT8                             | 34   | CDXPoint2D       | 11   |
| CDXString(스타일 런 포함 텍스트) | 28   | FLOAT64          | 11   |
| CDXCoordinate(1/65536 pt)        | 26   | 기타             | 69   |
| CDXBooleanImplied                | 19   |                  |      |

`CDXString`은 `u16 스타일런 수` 다음에 `10바이트 × 런`(시작 위치, 폰트, 스타일, 크기, 색), 그다음 텍스트가 온다. **서식 있는 텍스트**가 포맷 수준에서 1급 시민이라는 뜻이다. 화학식 아래첨자, 라벨 위첨자 전하 같은 표현이 여기서 나온다.

### 2.2 속성 섹션별 분포 (도출)

Atom 53 · Document 52 · Graphic 42 · ChemicalProperty 30 · General 21 · Bond 20 · Embedded pictures 20 · TLC 17 · Coordinates 16 · BioShape 16 · Reaction 13 · Text 10 · Spectrum 10 · Colors 9 · Molecule 9 · Geometry/Constraint 9 · ObjectTag 9 · StoichiometryGrid 9 · Plasmid 8 · Annotation 7 · CrossReference 4 · Misc 4 · RLogic 4 · Window 3 · AltGroup 3 · Fonts 1 · Sequence 1

→ **추론**: 400개 속성 중 순수 "분자 그래프"(Atom, Bond, Molecule)는 82개, 약 20%다. 나머지 80%는 문서, 레이아웃, 그래픽, 실험 도구(TLC, 겔, 플라스미드, 스펙트럼), 메타데이터다. ChemDraw의 가치 대부분이 *화학 계산*이 아니라 *출판 품질의 과학 문서 표현*에 있다는 정량적 증거다.

---

## 3. 객체 모델 (클래스 계층)

```
CDXObject (가상: GetTag, XMLObjectName, Clone, StoreAttribute, WriteAttributesTo, XMLWrite*)
├── CDXDocument ── CDXPage ── (모든 그리기 객체의 컨테이너)
├── CDXGraphicObject                       ← 위치/경계/Z순서/색을 가진 모든 시각 객체
│   ├── CDXGroupOrFragment ─┬─ CDXGroup     (그룹)
│   │                       └─ CDXFragment  (= 분자. Node/Bond 컨테이너)
│   ├── CDXNode            (원자/축약어/R-그룹/단량체…)
│   ├── CDXBond
│   ├── CDXText ── CDXRLogic
│   ├── CDXGraphic         (Line/Arc/Rect/Oval/Orbital/Bracket/Symbol)
│   ├── CDXArrow ── CDXPlasmidRegion
│   ├── CDXCurve, CDXBioShape, CDXEmbeddedObject, CDXTable, CDXSpectrum
│   ├── CDXSequence, CDXCrossReference, CDXNamedAlternativeGroup
│   ├── CDXGeometry, CDXConstraint            (3D 기하 제약)
│   ├── CDXStoichiometryGrid, CDXSGComponent, CDXSGDatum
│   ├── CDXPlasmidMap, CDXObjectTag ─┬─ CDXPlasmidMarker
│   │                                └─ CDXBandMarker
│   ├── CDXPlateBase ─┬─ CDXTLCPlate        CDXPlateLane ─┬─ CDXTLCLane
│   │                 └─ CDXGEPPlate                      └─ CDXGEPLane
│   └── CDXPlateItemBase ─┬─ CDXTLCSpot
│                         └─ CDXGEPBand
├── CDXReactionScheme, CDXReactionStep    (반응: ID 배열로 Fragment를 참조)
├── CDXBracketedGroup, CDXBracketAttachment, CDXCrossingBond  (폴리머/반복단위)
├── CDXChemicalProperty, CDXAnnotation, CDXColoredMolecularArea
├── CDXDocumentProperty(Collection), CDXObjectDefinition, CDXTemplateGrid, CDXSplitter, CDXBorder
└── CDXUnknownObject   (모르는 태그 보존 → 상위 버전 파일 왕복 보존)
```

전체 관계 목록은 [`evidence/cdx-class-hierarchy.txt`](evidence/cdx-class-hierarchy.txt)에 있다.

**설계 해석 (추론)**

- **반응은 그래프 소유자가 아니라 참조자다.** `ReactionStep`은 `Reactants`, `Products`, `Arrows`, `ObjectsAboveArrow` 등의 **ObjectID 배열**만 갖고, 실제 분자는 Page 아래 Fragment로 따로 존재한다. 그래서 "그림으로 그린 반응"을 사후에 화학 반응으로 해석하는 ChemDraw의 동작(23.0: 시약만 있어도 반응 인식)이 가능하다.
- **CDXUnknownObject**와 사용자 태그 영역 덕분에, 이전 버전이 새 버전 파일을 열고 저장해도 모르는 객체가 사라지지 않는다. 40년 동안 하위 호환을 지킨 장치다.
- 직렬화는 이중이다. `WriteAttributesTo(CDXDataSink)`는 바이너리, `XMLWriteAttributes(XMLDataSink)`는 CDXML을 쓴다. **CDX와 CDXML은 같은 객체 모델을 두 가지로 직렬화한 것**이다. CDXML 이름표는 `CDXMLNames.h`에 따로 있다(관찰).

---

## 4. 화학 의미 계층 (enum 분해, 관찰)

| enum                              | 값 수 | 값                                                                                                                                                                                                                                              |
| --------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NodeType                          | 15    | Unspecified, **Element**, ElementList, ElementListNickname, Nickname, Fragment, Formula, GenericNickname, AnonymousAlternativeGroup, NamedAlternativeGroup, MultiAttachment, VariableAttachment, ExternalConnectionPoint, LinkNode, **Monomer** |
| BondOrder                         | 26    | Single…Sextuple, Half, OneHalf…FiveHalf, **Dative, Ionic, Hydrogen, ThreeCenter**, 쿼리 조합(SingleOrDouble, SingleOrAromatic, DoubleOrAromatic, Any)                                                                                           |
| BondDisplay                       | 16    | Solid, Dash, Hash, WedgedHash(Begin/End), Bold, Wedge(Begin/End), Wavy, HollowWedge, WavyWedge, Dot, DashDot, DottedHydrogen                                                                                                                    |
| AtomCIPType                       | 15    | R, S, r, s, **M, P**(축 키랄), Atropisomer, Allene M/P 등                                                                                                                                                                                       |
| BondCIPType                       | 4     | E, Z 등                                                                                                                                                                                                                                         |
| EnhancedStereoType                | 5     | Absolute, Or, And 등                                                                                                                                                                                                                            |
| ArrowType                         | 9     | NoHead, HalfHead, FullHead, Resonance, Equilibrium, Hollow, **RetroSynthetic, NoGo**, Dipole                                                                                                                                                    |
| BracketUsage                      | 20    | SRU, Copolymer(Alternating/Block/Random), Crosslink, Graft, Mixture, MultipleGroup 등(MDL Sgroup 호환)                                                                                                                                          |
| ExternalConnectionType            | 14    | Diamond, Star, PolymerBead, Wavy, Residue, Peptide, DNA, RNA, Nucleotide 등                                                                                                                                                                     |
| GraphicType                       | 8     | Line, Arc, Rectangle, Oval, **Orbital**, Bracket, Symbol                                                                                                                                                                                        |
| GeometricFeature / ConstraintType | 9 / 4 | 거리, 각도, 평면, 중심점, 배제 구(3D 약물작용단 질의)                                                                                                                                                                                           |
| SpectrumYType                     | 6     | Absorbance, Transmittance 등                                                                                                                                                                                                                    |

**추론**

- **축약어(Nickname)와 Markush(AlternativeGroup, VariableAttachment, MultiAttachment)가 원자 노드의 종류**다. 화면에서는 "OMe"나 "R1" 하나로 보이지만, 그 안에 Fragment를 품을 수 있는 재귀 구조다. ChemDraw의 "라벨 확장/축약"과 "Generic Structure Enumeration" 기능이 이 위에 구현된다.
- 단량체(Monomer)도 Node 타입 중 하나다. HELM이나 바이오폴리머를 *별도 엔진*이 아니라 *같은 그래프의 노드 확장*으로 처리한다. 반대로 Ketcher는 `ketcher-core`의 `domain/entities`를 `Peptide`, `Sugar`, `Phosphate`, `RNABase`, `PolymerBond` 등 **별도의 macromolecule 엔티티 체계**로 나눠 두었다. 두 제품의 설계 철학이 갈리는 지점이다([05 문서](05-engine-teardown-rea.md)).
- 결합 *차수*와 *표시*를 분리했기 때문에, "화학적으로는 단일결합이지만 굵게 그린다" 같은 출판용 표현이 화학 의미를 해치지 않는다. 경쟁 제품 대부분(MOL 기반)은 stereo 플래그와 표시가 섞여 있다(추론, MOL V2000 bond stereo 필드).

---

## 5. 다른 포맷과의 관계 (도출 + 추론)

| 관점         | CDX/CDXML                                        | MDL MOL/SDF (V2000/V3000) | Ketcher KET (JSON)                         | SMILES/InChI |
| ------------ | ------------------------------------------------ | ------------------------- | ------------------------------------------ | ------------ |
| 단위         | 장면(문서)                                       | 분자/반응                 | 장면 + 분자                                | 분자         |
| 좌표         | 1/65536 pt 고정소수점, 페이지 좌표               | Å 단위(관례)              | 임의 단위 float                            | 없음         |
| 그래픽       | 1급(화살표, 도형, TLC, 스펙트럼, 표, 플라스미드) | 없음                      | 일부(화살표, 플러스, 텍스트, 이미지, 도형) | 없음         |
| 텍스트 서식  | 스타일 런                                        | 없음                      | Draft.js 기반 rich text                    | 없음         |
| 바이오폴리머 | Monomer 노드 + Sequence                          | V3000 템플릿(SCSR)        | 별도 monomer 엔티티, HELM/IDT/FASTA 변환   | 없음         |
| 확장성       | 사용자 태그 16k + Unknown 보존                   | 제한적                    | JSON 키 추가                               | 없음         |

ChemDraw 22.x 이하의 기본 MOL 내보내기는 V2000이었다. 23.0부터 **MOL V3000이 기본**이 되었다([01 리서치 §6.1](research/01-chemdraw-deep-research.md)). V3000이 enhanced stereo와 템플릿을 표현할 수 있어서다(추론).

---

## 6. 오픈소스 생태계의 CDX 지원 현황 (관찰)

| 구현                                | 읽기                                         | 쓰기  | 근거                                                    |
| ----------------------------------- | -------------------------------------------- | ----- | ------------------------------------------------------- |
| Revvity 공개 코드(Glysade/chemdraw) | O(CDX/CDXML)                                 | O     | 본 문서 §3. RDKit에 선택 빌드                           |
| RDKit                               | O(Revvity 파서, 선택 빌드) / CDXML 자체 파서 | —     | `CDXMLParser.h`, `hasChemDrawCDXSupport()`              |
| Indigo / Ketcher                    | O(CDX, CDXML, base64 CDX)                    | O     | `indigoWorker.types.d.ts`의 `SupportedFormat.CDX/CDXML` |
| Open Babel                          | O(CDX 기본)                                  | CDXML | Open Babel 문서                                         |
| 이번 `cdx_dump.py`                  | O(트리/속성 덤프, 타입 기반 디코딩)          | —     | `tools/`                                                |

**검증 범위와 한계**

- `cdx_dump.py`는 SDK에 들어 있는 샘플 3개(165, 820, 그리고 `carbon.cdx`)로만 검증했다. 대형 실제 문서, 임베디드 그림(EMF/PNG), 스타일 런 여러 개짜리 텍스트, 빅엔디언(구 Mac) 파일은 **검증하지 않았다**.
- `INT16`처럼 타입이 정해진 속성만 디코딩한다. 그 밖의 속성은 hex로 남겨 _의미를 지어내지 않는다_.
- ChemDraw 데스크톱의 _렌더링_, _화학 경고_, _Struct=Name_ 같은 기능 코드는 이 공개 코드에 없다. 공개된 것은 파일 I/O 계층뿐이다.

## 7. 재현 방법

```bash
git clone --depth 1 https://github.com/Glysade/chemdraw.git /tmp/cdx-src
python3 -I experiments/chemdraw-teardown/tools/extract_tags.py /tmp/cdx-src/chemdraw/CDXConstants.h > /tmp/cdx_tags.json
diff <(python3 -c "import json;print(json.dumps(json.load(open('/tmp/cdx_tags.json')),sort_keys=True))") \
     <(python3 -c "import json;print(json.dumps(json.load(open('experiments/chemdraw-teardown/tools/cdx_tags.json')),sort_keys=True))")
python3 -I experiments/chemdraw-teardown/tools/cdx_dump.py /tmp/cdx-src/docs/dimethylamine.cdx
```
