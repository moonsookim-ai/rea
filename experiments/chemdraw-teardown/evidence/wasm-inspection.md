# WASM 엔진 정적 검사 결과

REA `inspect-wasm-artifact`(WABT 1.0.42)로 검사했다. REA 한도를 넘는 아티팩트는 같은 WABT의 `wasm-objdump -h`로 직접 수집했다.

## REA로 완료: InChI (kekule 1.0.4 `dist/extra/inchi.wasm`)

- evidence_id: `ev_e2dd7bbfe9a98ae91e06415bd5e74ebf814a8232855275de1000e41a1d136584`
- sha256: `efbc28a63bf45a1a172df47d915a2a86ae0bbc6d6db284c613f0aef88511d27b`, bytes: 637422, validation: valid
- sections: Type(count: 49), Import(count: 16), Function(count: 670), Global(count: 1), Export(count: 7), Elem(count: 1), Code(count: 670), Data(count: 260)
- exports(WAT 원문): `(export "l" (func 416))`; `(export "m" (func 424))`; `(export "n" (func 24))`; `(export "o" (func 425))`; `(export "p" (func 680))`; `(export "q" (func 628))`; `(export "r" (func 679))`
- imports: 16개, 모두 `env` 모듈의 1글자 이름(최소화된 Emscripten 런타임 함수)

## REA 한도 초과 → WABT 직접 수집

| 아티팩트                                   | 크기    | REA 결과                   | Type | Import | Function | Export | Data seg | Code    | Data    |
| ------------------------------------------ | ------- | -------------------------- | ---- | ------ | -------- | ------ | -------- | ------- | ------- |
| RDKit_minimal.wasm (@rdkit/rdkit 2026.9.2) | 7.4 MB  | WABT 출력 32 MiB 예산 초과 | 149  | 49     | 7357     | 12     | 1399     | 6.11 MB | 1.27 MB |
| indigo-ketcher-1.46.0.wasm (렌더 포함)     | 11.8 MB | 입력 8 MiB 한도 초과       | 214  | 133    | 11432    | 15     | 3131     | 8.87 MB | 2.90 MB |
| indigo-ketcher-norender-1.46.0.wasm        | 7.5 MB  | WABT 출력 32 MiB 예산 초과 | 151  | 113    | 7749     | 14     | 460      | 6.80 MB | 0.71 MB |
| openbabel.wasm (kekule 번들)               | 4.1 MB  | REA 미실행(직접 수집)      | 109  | 64     | 5191     | 60     | 2200     | 3.58 MB | 0.50 MB |
| indigo.wasm (kekule 번들)                  | 5.5 MB  | REA 미실행(직접 수집)      | 146  | 109    | 6607     | 421    | 527      | 5.02 MB | 0.42 MB |

**해석**

- RDKit MinimalLib, Ketcher용 Indigo, InChI 빌드는 Export가 7–15개뿐이고 이름도 축약형(`X, Y, Z, $, aa…`)이다. Emscripten 최소화 빌드의 전형이다. 반면 Kekule에 번들된 Indigo(421개)와 OpenBabel(60개)은 C API를 export로 직접 노출한다. 같은 Indigo라도 바인딩 방식이 다르다. 실제 화학 API는 **Embind 등록**을 통해 JS 글루에 노출된다. 따라서 API 표면은 `.d.ts`와 JS 글루에서 복원해야 한다([05 문서](../05-engine-teardown-rea.md) §2).
- 렌더러가 포함된 Indigo 빌드(11.8 MB)와 norender 빌드(7.5 MB)의 차이 약 4.3 MB는 서버측 렌더링 스택(Cairo 계열)이 차지하는 비용으로 추정한다(추론). Ketcher는 화면은 브라우저 SVG로 그리고, 이미지 생성(`generateImageAsBase64`)용으로만 render 빌드를 따로 둔다.
- Kekule.js는 OpenBabel(4.1 MB), Indigo(5.5 MB), InChI(0.6 MB)를 각각 별도 WASM 모듈로 *선택 로드*한다. 반면 Ketcher는 Indigo 하나에 모든 화학 연산을 몰아넣었다. *플러그인형*과 *단일 커널형*의 대비다.
