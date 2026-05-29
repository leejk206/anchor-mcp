import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const BIG_INTS = new Set(["u64", "i64", "u128", "i128", "u256", "i256"]);
const SMALL_INTS = new Set(["u8", "i8", "u16", "i16", "u32", "i32"]);

/** Coerce a JSON value from an MCP tool input into the type the Anchor IDL expects. */
export function coerceArg(value: any, type: any): any {
  if (type === undefined || value === undefined || value === null) return value;
  if (typeof type === "string") {
    if (BIG_INTS.has(type)) return new BN(value);
    if (SMALL_INTS.has(type)) return Number(value);
    if (type === "bool") return Boolean(value);
    if (type === "pubkey" || type === "publicKey") return new PublicKey(value);
    if (type === "bytes") return Buffer.from(value, "base64");
    return value; // string and unknowns pass through
  }
  if (type.option) return value === null ? null : coerceArg(value, type.option);
  if (type.coption) return value === null ? null : coerceArg(value, type.coption);
  if (type.vec) return Array.isArray(value) ? value.map((v) => coerceArg(v, type.vec)) : value;
  if (type.array) return Array.isArray(value) ? value.map((v) => coerceArg(v, type.array[0])) : value;
  // defined structs/enums: best-effort pass-through (caller supplies matching JSON)
  return value;
}

/** Human-readable label for an IDL type (for tool descriptions). */
export function typeLabel(type: any): string {
  if (typeof type === "string") return type;
  if (!type) return "unknown";
  if (type.option) return `option<${typeLabel(type.option)}>`;
  if (type.coption) return `coption<${typeLabel(type.coption)}>`;
  if (type.vec) return `vec<${typeLabel(type.vec)}>`;
  if (type.array) return `array<${typeLabel(type.array[0])};${type.array[1]}>`;
  if (type.defined) return `defined:${type.defined?.name ?? type.defined}`;
  return JSON.stringify(type);
}

/** Anchor 0.30 IDL names are snake_case; methods/account namespaces are camelCase. */
export function camel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => String(c).toUpperCase()).replace(/^(.)/, (m) => m.toLowerCase());
}

/** Make Anchor return values (BN, PublicKey, bigint) JSON-serializable. */
export function jsonSafe(v: any): any {
  return JSON.parse(
    JSON.stringify(v, (_k, val) => {
      if (val && typeof val === "object") {
        if (typeof val.toBase58 === "function") return val.toBase58(); // PublicKey
        if (BN.isBN(val)) return val.toString();
      }
      if (typeof val === "bigint") return val.toString();
      return val;
    })
  );
}
