# cdx-core — CDX 왕복 코어 (로드맵 P0)

[07 재구성 설계도](../07-clone-blueprint.md) §3의 **P0 "CDX 왕복 코어"** 구현이다. ChemDraw 네이티브 바이너리 포맷(CDX)을 **바이트 하나 잃지 않고** 읽고 쓰는, 의존성 없는 TypeScript 라이브러리다. Node 22 이상에서 빌드 없이 `.ts`를 바로 실행한다(type stripping).

## 완료 기준 대비 결과 (2026-11-10)

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
CDX_CORPUS_LIST=corpus-list.txt node --test test/*.test.ts   # + 코퍼스 테스트
node scripts/gen-tags.ts               # tools/cdx_tags.json → src/tags.generated.ts
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

## 한계와 다음 단계

- CDXML 읽기/쓰기는 아직 없다(P1 후보). CDXML 속성명(`CDXMLNames.h`)과 값 텍스트 표현의 매핑이 필요하다.
- 화학 의미 검증(원자가, 방향족성, SMILES 변환)은 하지 않는다. P1에서 RDKit/Indigo WASM 커널과 연결한다.
- **Revvity C++ 코드를 직접 빌드한 오라클과의 비교는 하지 않았다.** 이 세션에서는 외부 C++ 코드 빌드/실행이 자동 승인 정책에 막혀, 독립 구현 2개(TS, Python)의 일치와 바이트 동일성으로 대신 검증했다. 로컬에서 `cmake -S cdx-src -B build && cmake --build build`로 빌드한 뒤 `CDXReadDocFromStorage → CDXWriteDocToStorage` 결과와 비교하면 의미 수준 검증을 보강할 수 있다.
