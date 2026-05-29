# anchor-mcp — v1 SPEC (lean, council-reviewed)

_scope = "Anchor IDL 있는 프로그램의 read/simulate". "모든 프로그램·쓰기"는 v2 로드맵._

## 기술적 타당성 (검증됨 — 새 기술 없음, 전부 기존 API)
1. IDL fetch: `@coral-xyz/anchor` `Program.fetchIdl(programId, provider)` (온체인) / 로컬 파일 fallback. ✅
2. IDL → 툴 스키마: IDL의 instruction별 args(타입)·accounts를 MCP 입력 스키마로 기계적 매핑. ✅
3. instruction 빌드: `program.methods.<ix>(args).accounts({...}).instruction()` (Anchor `Program`이 IDL로 인코딩). ✅
4. simulate: `connection.simulateTransaction(tx)` → logs + 계정 상태. 서명 없음. ✅
5. MCP 노출: `@modelcontextprotocol/sdk`로 런타임 툴 등록, stdio + Streamable-HTTP. ✅
- 증거: EVM에 동일 패턴(UCAI/abi-to-mcp, IQAIcom/mcp-abi)이 라이브. ABI↔IDL 대응 → 포팅(엔지니어링) 문제.

## 까다롭지만 되는 부분
- arg 인코딩: enum/option/중첩 struct 등은 손이 감(BorshCoder가 IDL 기반 처리).
- PDA: 0.30+ IDL은 `pda.seeds` 메타데이터로 자동 해결; 이전 버전은 seed 정보 없음 → 명시 주소 fallback.

## 스코프 아웃 (정직)
- 비-Anchor 네이티브 프로그램, IDL 미발행 프로그램.
- 구버전 IDL의 PDA 자동(→ fallback).
- write/서명 (v1 제외, 안전상 — v2 opt-in).

## 컴포넌트 (파일 단위)
- `src/idl.ts` — IDL 로드(온체인 fetch / 로컬 파일), 0.30+ 정규화(필요시 `anchor idl convert`).
- `src/tools.ts` — IDL instruction → MCP 툴 스키마(args + accounts) 매핑.
- `src/pda.ts` — IDL seed로 PDA 도출(0.30+); 없으면 account를 명시 입력으로.
- `src/simulate.ts` — instruction 빌드 + `simulateTransaction`, logs/account diff 반환.
- `src/server.ts` — MCP 서버(stdio + Streamable-HTTP), 런타임 툴 등록.
- `examples/` — 명명된 devnet 0.30+ 프로그램 1~2개 + Claude/Cursor config 스니펫.
- `README.md` — 설치/설정/데모.
- (선택) Codama 렌더러로 구현 검토 → 잠식 리스크 완화.

## 안전 (필수 설계)
- simulate-default, 서명 없음(v1). write 노출 = 지갑 드레인 위험.
- 데모는 실제 온체인 read + simulate(로그/account diff 표시).
