# cdx-core — ChemDraw 호환 코어와 CDX Bench (로드맵 P0–P5)

[07 재구성 설계도](../07-clone-blueprint.md) §3의 로드맵을 구현한 결과물이다. 의존성 없는 TypeScript 라이브러리이고, Node 22 이상에서 빌드 없이 `.ts`를 바로 실행한다(type stripping). 그 위에 웹 편집기 **CDX Bench**를 올려 배포했다.

- **배포:** [CDX Bench](https://claude.ai/artifact/527hBGkZYsy82zK9kKNtVL) (claude.ai Artifact, 비공개. 공유는 페이지의 Share 메뉴에서 한다)
- **단계별 현황:**

| 단계              | 상태   | 내용                                                                    |
| ----------------- | ------ | ----------------------------------------------------------------------- |
| P0 CDX 왕복       | 완료   | 무손실 리더/라이터, 타입 코덱(아래 결과)                                |
| P1 CDXML·편집 MVP | 구현   | `cdxml.ts`, `chem.ts`, 웹 편집기                                        |
| P2 렌더러         | 부분   | `render.ts`: ACS 1996 수치를 쓴 SVG. ChemDraw와의 픽셀 비교는 하지 못함 |
| P3 Office         | 읽기만 | `office.ts`: PPTX/DOCX/XLSX → OLE → CDX 추출. 다시 써넣기는 없음        |
| P4 바이오·Markush | 기초   | `bio.ts`: HELM 파싱/쓰기/렌더, R-group 열거                             |
| P5 차별화         | 일부   | 브라우저(Linux·모바일). OCSR·LLM·실시간 협업은 없음                     |

## P1–P5 검증 결과 (2026-11-10)

| 항목                                                       | 결과                                                                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CDX → CDXML → CDX (코퍼스 80개)                            | 80/80 화학 일치(원자 ID·원소·전하·노드 타입·결합·좌표 ±0.006 pt)                                                                                                                                 |
| CDXML → CDX → CDXML (코퍼스 247개)                         | 246 안정 · 1 거부(RDKit의 의도된 `malformed.cdxml`). 해석하지 못한 속성 232개(`ResidueZigZag` 등 시퀀스 설정, `<represent>`)                                                                     |
| ChemDraw가 직접 저장한 CDX/CDXML 짝                        | 2/2 엄밀 일치(`test-multi` CD 13↔12, `ring-stereo1` CD 23.1↔21.0). 같은 문서의 ChemDraw CDXML과 속성 단위로 비교하면 약 78%가 같은 텍스트이고, 차이는 대부분 저장 버전 차이(Z 순서, 경고 문구)다 |
| CDXML 표                                                   | `tools/extract_cdxml.py`가 Revvity 소스에서 추출: 요소 51, 속성 이름 377, enum 표 50(값 462), 속성↔enum 연결 54, 값 스케일 46                                                                    |
| 화학 계산                                                  | 아스피린 180.159/180.0423, 카페인 194.194/194.0804, 이부프로펜 206.285/206.1307(평균/모노아이소토픽) — 테스트로 고정                                                                             |
| SMILES·MOL·CDX 변환                                        | 피롤 `[nH]`, 동위원소, 염, 나프톨 등에서 화학식 보존(테스트). 케쿨레화는 최대 매칭 방식                                                                                                          |
| 2D 배치                                                    | 고리계 정다각형, 융합 고리 반사, 스피로, 120° 지그재그, 충돌 시 가지 뒤집기. 시험한 분자(아스피린, 스테로이드, 스피로)에서 결합 길이 14.4±1.5 pt, 원자 간 겹침 없음                              |
| Office 추출                                                | 합성 PPTX(stored/deflate 엔트리)와 순수 OLE 파일에서 `CONTENTS`의 CDX를 바이트 동일하게 회수(테스트). 실제 Office 파일 표본으로는 검증하지 못함                                                  |
| 웹 앱 스모크(Playwright, 데스크톱 1360 px와 휴대폰 400 px) | 도구·단축키·SMILES 추가·되돌리기·HELM·R-group·파일 열기(CDX, CDXML, 객체 2개가 든 PPTX) 동작, 페이지 오류 0                                                                                      |
| 테스트                                                     | `node --test` 27개 통과(코퍼스 포함). `tsc` 무오류                                                                                                                                               |

## P0 결과 (2026-11-10)

| 기준                                         | 결과                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 코퍼스 전체에서 `read → write`가 바이트 동일 | **80/80 파일 동일**(980,513 B). 손상 헤더 파일 1개는 `not-cdx`로 거부                                           |
| 타입 디코드 → 인코드 역변환                  | 속성 **36,941개 전부 바이트 동일**. 그중 36,814개(99.66%)를 타입으로 해석했고 127개는 의도적으로 raw 유지(아래) |
| 독립 구현과 트리 일치                        | Python `tools/cdx_dump.py --canonical`과 canonical 트리 **80/80 일치**                                          |
| 합성 회귀 테스트                             | `node --test` 12개 통과(신·구 헤더, long-length, 사용자 태그, big-endian, 손상 입력 4종, base64)                |
| 성능(참고, 1회 측정)                         | 코퍼스 980 KB 읽기+쓰기 119 ms(콜드, JIT 포함, 4 vCPU 컨테이너)                                                 |

### 코퍼스 구성 (바이너리는 커밋하지 않음)

| 출처                                 | 파일 수 | CreationProgram                                                                                   |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------- |
| Revvity 공개 코드 `docs/`            | 3       | ChemDraw 7.0 등                                                                                   |
| RDKit `Code/GraphMol/test_data/CDX*` | 7       | ChemDraw                                                                                          |
| Indigo `api/tests/**`, `api/wasm/**` | 70      | ChemDraw 데스크톱·ChemDraw JS·CS CDX driver 3.0·ChemDraw 5.1.3, 그리고 없음(Indigo 생성으로 추정) |
| (거부 대상) Indigo `bad-header.cdx`  | 1       | 매직 `XXXX0100`                                                                                   |

Revvity·CambridgeSoft 계열 프로그램이 쓴 파일은 31개다(ChemDraw 데스크톱 21, ChemDraw JS 3, ChemDraw 5.1.3 1, CS CDX driver 6). 나머지 49개는 CreationProgram이 없다. **최신 ChemDraw 26.x 저장본으로는 검증하지 못했다.**

코퍼스 재구성 방법:

```bash
git clone --depth 1 https://github.com/Glysade/chemdraw.git cdx-src
git clone --depth 1 --filter=blob:none --sparse https://github.com/rdkit/rdkit.git
git -C rdkit sparse-checkout set --no-cone '*.cdx' '*.cdxml'
git clone --depth 1 --filter=blob:none --sparse https://github.com/epam/Indigo.git indigo
git -C indigo sparse-checkout set --no-cone '*.cdx' '*.cdxml' '*.b64cdx'
find cdx-src/docs rdkit indigo -name '*.cdx' -o -name '*.b64cdx' | sort > corpus-list.txt
```

## 사용법

```bash
cd experiments/chemdraw-teardown/cdx-core
node src/cli.ts dump FILE.cdx          # 들여쓴 객체 트리 + 타입 해석 값
node src/cli.ts molecules FILE.cdx     # Fragment별 원자/결합 수, 골격 화학식
node src/cli.ts canonical FILE.cdx     # 교차 검증용 canonical JSON
node src/cli.ts roundtrip FILE...      # 바이트 왕복 검사(불일치 시 exit 1)
node --test test/*.test.ts             # 합성 테스트
CDX_CORPUS_LIST=corpus-list.txt CDXML_CORPUS_LIST=cdxml-list.txt node --test test/*.test.ts  # + 코퍼스
node scripts/gen-tags.ts               # tools/cdx_tags.json + cdxml_tables.json → src/*.generated.ts
node scripts/build-web.ts              # web/app.ts → web/dist/index.html (한 파일, ~140 KiB)
```

```ts
import { readCdx, writeCdx, unwrapCdx } from "./src/binary.ts";
import { molecules, getProperty } from "./src/model.ts";

const bytes = unwrapCdx(fileBytes); // CDX 또는 base64 CDX
if (bytes.ok) {
  const doc = readCdx(bytes.value); // Result<CdxDocument>, 예외 없음
  if (doc.ok) {
    molecules(doc.value); // [{ atoms, bonds, ... }]
    writeCdx(doc.value); // 원본과 바이트 동일
  }
}
```

## 구조

| 파일                    | 역할                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/binary.ts`         | TLV 리더/라이터. 28바이트 헤더, long-length(0xFFFF+u32) 여부, 객체·속성 순서, 트레일러를 모두 보존한다. 재귀 없이 명시적 스택으로 처리하고 깊이 상한은 4096              |
| `src/values.ts`         | `CDXConstants.h`가 선언한 타입별 코덱 테이블(정수 폭 보존, CDXString 스타일 런, 폰트/색 표, 날짜, 곡선, 카운트 리스트 등). 길이가 맞지 않으면 추측하지 않고 `raw`로 둔다 |
| `src/model.ts`          | 이름 조회, 순회, 분자 그래프 투영(Fragment → atoms/bonds. 노드 안에 중첩된 약어 Fragment는 분자로 세지 않는다)                                                           |
| `src/dump.ts`           | 텍스트 덤프와 canonical 트리                                                                                                                                             |
| `src/tags.generated.ts` | 객체 52종, 속성 400개 태그 표(생성물)                                                                                                                                    |
| `src/result.ts`         | 태그드 `Result`. 예상 가능한 포맷 오류는 값으로 돌려준다                                                                                                                 |
| `src/xml.ts`            | 의존성 없는 XML 리더/라이터(DOCTYPE·CDATA·엔티티, 속성 순서 보존, ChemDraw식 줄바꿈)                                                                                     |
| `src/cdxml.ts`          | CDX ⇄ CDXML. 이름·enum·스케일은 Revvity 표, `<s>` 스타일 런, 폰트/색 표, LabelStyle 분해, `auto`/`variable` 줄 높이. CDXML 철자가 없는 속성은 `x-cdx-XXXX` 16진으로 보존 |
| `src/chem.ts`           | 편집용 분자 모델, 원소 표, 원자가·암시적 H·경고, 화학식·질량, SMILES 읽기/쓰기, MOL V2000, 케쿨레화, 2D 배치, CDX ⇄ 장면 변환                                            |
| `src/render.ts`         | ACS 1996 SVG 렌더러(쐐기·해시·물결, 고리 안쪽 이중결합, H 위치, 전하·동위원소 첨자)                                                                                      |
| `src/office.ts`         | ZIP 읽기/쓰기, CFB(OLE2) 리더, Office 문서 속 ChemDraw 객체 추출                                                                                                         |
| `src/bio.ts`            | HELM v2 핵심, 펩타이드 질량, 비드 SVG, R-group 열거                                                                                                                      |
| `web/`                  | CDX Bench 편집기(`app.ts`, `page.html`). `scripts/build-web.ts`가 한 HTML로 묶는다                                                                                       |

## 이번 구현에서 새로 확인한 사실

1. **헤더 22–27바이트는 Document 객체 자리다.** Revvity `CDXWriteHeader`는 헤더를 22바이트만 쓰고 이어서 Document 태그(`00 80`)와 ID를 쓴다. 리더는 28바이트를 헤더로 건너뛴 뒤 "pretend there was a document object"로 처리한다. 구형(CD5 호환) writer는 이 6바이트를 0으로 둔다. 코퍼스에서는 최신형 28개, 구형 52개였다. 초판 04 문서의 "Document 태그/ID 생략"은 이 내용으로 정정했다.
2. **Boolean 속성**은 길이 0이면 참이고, 그 외에는 `GetUINT(size)` 값이다. `CDXBooleanImplied`로 선언됐지만 1바이트 값(`00`/`01`)을 가진 경우가 실제 파일에 909건 있었다(예: `InterpretChemically`).
3. **ChemicalProperty\*** 속성 23종은 헤더 주석에 타입이 없지만, Revvity 리더(`CDXDocument.cpp`)가 `CDXString::Read`로 읽는다. 그래서 문자열로 해석한다.
4. raw로 남긴 127개의 내역:
   - `Name`이 스타일 런 카운트 없이 평문으로 쓰인 경우(51건, 예: `"stereo"`, `"query"`). 앞 2바이트를 카운트로 읽어야 할지 평문으로 읽어야 할지 모호하므로 해석하지 않는다.
   - obsolete 태그(38건)
   - 임베디드 원본 `PNG`와 GZIP으로 압축된 EMF(`Compressed_EnhancedMetafile`)
   - `MacPrintInfo`
   - `ObjectTag_Value`(타입 "varies")
   - 사용자 정의 태그 `0x4000`

## 한계

- **편집기는 화학 구조, 반응 화살표, 캡션만 편집한다.** TLC, 스펙트럼, 플라스미드, 표 같은 ChemDraw 그래픽은 편집 대상이 아니다. 열어 놓고 아무것도 바꾸지 않았다면 내보낼 때 원본 문서를 그대로 쓰지만, 한 번이라도 편집하면 편집 모델에서 다시 만든다.
- 정규(canonical) SMILES, CIP/입체 인식, 쿼리 결합·원자, 구조→IUPAC 이름, NMR 예측은 구현하지 않았다.
- Artifact 안에서는 `.cdx`/`.cdxml`/`.mol` 확장자로 저장할 수 없다(다운로드 허용 목록 제한). 그래서 `.zip` 번들(모든 형식)과 `.svg`로 저장하고, 텍스트 형식은 클립보드로 복사한다.
- `chem.ts`(약 1,100줄)와 일부 함수는 oxlint의 복잡도·길이 **경고**를 넘는다(오류는 아님). 모듈 분리는 남은 정리 과제다.
- **Revvity C++ 코드를 직접 빌드한 오라클과의 비교는 하지 않았다.** 이 세션에서는 외부 C++ 코드 빌드/실행이 자동 승인 정책에 막혀, 독립 구현 2개(TS, Python)의 일치와 바이트 동일성으로 대신 검증했다. 로컬에서 `cmake -S cdx-src -B build && cmake --build build`로 빌드한 뒤 `CDXReadDocFromStorage → CDXWriteDocToStorage` 결과와 비교하면 의미 수준 검증을 보강할 수 있다.
