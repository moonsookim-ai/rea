# ChemDraw 역공학 분해 (REA teardown)

> 대상: Revvity Signals **ChemDraw** ([제품 페이지](https://revvitysignals.com/products/research/chemdraw)) 및 유사·경쟁 제품 69종
> 기준일: 2026-11-10 · 도구: REA `rea-agents@6.7.0`(이 저장소), WABT 1.0.42, 웹 조사

## 무엇을 했나

1. **ChemDraw 심층 조사**: 역사, 에디션, 라이선스, 기능, 기술, 시장, 릴리스 노트(출처 40개)를 정리했다. → [research/01-chemdraw-deep-research.md](research/01-chemdraw-deep-research.md)
2. **유사·경쟁 제품 수집**: 상용·오픈소스·모바일·AI 신규 진입자 69개 제품을 비교 매트릭스, 시장 세분화(10개 세그먼트), 공백(12개)으로 정리했다. → [research/02-competitor-landscape.md](research/02-competitor-landscape.md)
3. **기능·아키텍처 분해**: ChemDraw를 12개 기능 블록으로 재구성하고, 데이터 흐름과 블록별 해자를 분석했다. → [03-chemdraw-functional-decomposition.md](03-chemdraw-functional-decomposition.md)
4. **네이티브 포맷 분해**: Revvity가 공개한 ChemDraw 파일 포맷 C++ 코드와 CDX SDK로 객체 모델을 복원했다(52개 객체 타입, 400개 속성, 67개 클래스 관계). 직접 만든 CDX 덤퍼로 검증했다. → [04-cdx-format-teardown.md](04-cdx-format-teardown.md)
5. **경쟁 엔진 실측**: Ketcher, Indigo, RDKit, OpenChemLib, JSME, Kekule, SmilesDrawer를 REA로 정적 분석하고, WASM 커널 5종의 구조를 수집했다. → [05-engine-teardown-rea.md](05-engine-teardown-rea.md)
6. **기능 원자 매트릭스**: 기능 32개를 ChemDraw와 경쟁 제품 9종에 매핑했다. → [06-capability-matrix.md](06-capability-matrix.md)
7. **재구성 설계도**: 오픈소스 부품으로 같은 기능 블록을 독자 구현하는 아키텍처와 로드맵을 제시했다. → [07-clone-blueprint.md](07-clone-blueprint.md)
8. **P0 구현 — CDX 왕복 코어**: 의존성 없는 TypeScript 리더/라이터를 만들었다. 코퍼스 80개(980 KB)가 바이트까지 동일하게 왕복되고, 독립 Python 리더와 트리가 80/80 일치한다. → [cdx-core/README.md](cdx-core/README.md)

## 핵심 발견 10가지

1. **ChemDraw는 "화학 의미를 가진 벡터 출판 도구"다.** 네이티브 포맷 속성 400개 가운데 원자·결합·분자 속성은 약 20%다. 나머지는 문서, 그래픽, 실험 도구(TLC, 겔, 플라스미드, 스펙트럼)다(04 §2.2).
2. **CDX = little-endian TLV 객체 트리.** 28바이트 헤더의 마지막 6바이트가 Document 태그와 ID 자리다(최신 writer는 채우고 구형은 0). 헤더 주석의 hex 값 일부는 실제 enum 값과 다르다(04 §1).
3. **Office 락인 메커니즘 확인.** OLE `CONTENTS` 스트림에 CDX 바이트가 그대로 들어 있다. Ketcher가 PPTX 안의 ChemDraw 객체를 `VmpDRDAx…` 시그니처로 찾아내는 코드가 그 증거다(05 §2.1).
4. Markush·축약어·단량체가 모두 **원자 노드 타입의 변형**이다(NodeType 15종). 결합의 화학 차수(26종)와 표시(16종)는 분리되어 있다(04 §4).
5. 오픈소스 엔진만으로 ChemDraw 블록 대부분(편집, 화학 지능, 물성, 바이오폴리머, CDX 읽기)을 조립할 수 있다. 실질적인 해자는 **구조→IUPAC 이름, NMR 예측, 출판 스타일, Office OLE 편집**이다(05 §3, 06).
6. **Revvity가 2026년 1분기 ACD/Labs를 인수**해 ChemDraw와 ChemSketch(명명·NMR 경쟁자)를 같은 회사가 소유하게 됐다(01, 02).
7. **ChemDraw는 2025-01-01부터 구독 전용**이고, 2026-07-01부터 영구 라이선스 유지보수 갱신도 끝났다. iPad 앱은 단종됐다(01, 02).
8. AI는 ChemDraw 본체보다 **Signals 플랫폼 쪽**(Xynthetica MaaS, Signals AI, Claude MCP 커넥터)에 놓여 있다. 23.0에서는 기존 역합성 도구가 제거됐다(01 §3.11).
9. **Marvin JS EOL**(신규 판매 2026-12-31 종료, 지원 2027-12-31 종료)로 임베디드 웹 스케처 시장에 공백이 생긴다. Ketcher가 오픈소스 표준이고, Schrödinger가 Sketcher를 BSD-3로 공개했다(02).
10. 무료 대체재 중에서는 Zoho ChemStudio(CDXML R/W, CDX W, NMR, ADME)와 KingDraw가 CDX 호환으로 정면 공략 중이다(02 §3.2).

## 방법과 한계

- **ChemDraw 바이너리는 분석하지 않았다.** 라이선스가 필요하고, 웹 제품(revvitysignals.com, chemdrawdirect.*)은 이 환경에서 403 또는 연결 실패였다. 그래서 ChemDraw 쪽은 공개 산출물(BSD-3 포맷 코드, SDK 문서, 릴리스 노트, Dot Chart)로 하는 **블랙박스 분해**다. 렌더링, 명명, 예측 엔진의 내부 알고리즘은 미확인으로 남았다.
- 경쟁 엔진은 npm 공개 패키지를 **실행하지 않고** 정적 분석했다. 원본 REA Evidence(약 400 MB)는 커밋하지 않았고, 요약과 `evidence_id`만 [evidence/rea/](evidence/rea/)에 있다.
- REA 한도 관찰: OpenChemLib GWT 번들은 소스당 300 s 기한에 걸려 partial이었다. `inspect-wasm-artifact`는 입력 8 MiB와 WABT 출력 32 MiB 고정 예산 때문에 RDKit/Indigo WASM을 처리하지 못해 WABT로 직접 보완했다(05 §1).
- 각 문서는 **관찰 / 도출 / 추론 / 미확인**을 구분한다. 웹 조사 문서(01, 02)에서 원문 대신 검색 결과로 확인한 항목은 "(스니펫)"으로 표시했다.

## 디렉터리

```
experiments/chemdraw-teardown/
├── README.md                          ← 이 문서
├── research/01-chemdraw-deep-research.md
├── research/02-competitor-landscape.md
├── 03-chemdraw-functional-decomposition.md
├── 04-cdx-format-teardown.md
├── 05-engine-teardown-rea.md
├── 06-capability-matrix.md
├── 07-clone-blueprint.md
├── cdx-core/                CDX 왕복 코어(P0, TypeScript, 의존성 0)
├── tools/
│   ├── extract_tags.py      CDXConstants.h → cdx_tags.json (C++ enum 평가)
│   ├── cdx_tags.json        52 객체 / 400 속성 태그표(타입·설명 포함)
│   ├── cdx_dump.py          의존성 없는 CDX 트리 덤퍼(--canonical: cdx-core 교차 검증용)
│   └── summarize_rea_js.py  REA JS Evidence → 커밋 가능한 요약
└── evidence/
    ├── cdx-sample-dumps.txt
    ├── cdx-class-hierarchy.txt
    ├── wasm-inspection.md
    └── rea/*.summary.json     REA analyze-javascript-application 요약 8종
```

## 빠른 재현

```bash
git clone --depth 1 https://github.com/Glysade/chemdraw.git /tmp/cdx-src
python3 -I experiments/chemdraw-teardown/tools/cdx_dump.py /tmp/cdx-src/docs/dimethylamine.cdx
```

엔진 분석 재현 절차는 [05 §4](05-engine-teardown-rea.md#4-재현-명령)에 있다.
