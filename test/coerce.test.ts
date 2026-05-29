import { describe, it, expect } from "vitest";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { coerceArg, typeLabel, camel } from "../src/coerce.js";

describe("coerceArg", () => {
  it("passes through undefined/null without a type", () => {
    expect(coerceArg(undefined, "u64")).toBeUndefined();
    expect(coerceArg(null, "u64")).toBeNull();
    expect(coerceArg(5, undefined)).toBe(5);
  });

  it("coerces big integers to BN", () => {
    const v = coerceArg("12345678901234567890", "u64");
    expect(BN.isBN(v)).toBe(true);
    expect(v.toString()).toBe("12345678901234567890");
    expect(BN.isBN(coerceArg(42, "i128"))).toBe(true);
  });

  it("coerces small integers to JS numbers", () => {
    expect(coerceArg("7", "u8")).toBe(7);
    expect(coerceArg("256", "u32")).toBe(256);
    expect(typeof coerceArg("7", "u8")).toBe("number");
  });

  it("coerces bool", () => {
    expect(coerceArg(1, "bool")).toBe(true);
    expect(coerceArg(0, "bool")).toBe(false);
    expect(coerceArg("", "bool")).toBe(false);
  });

  it("coerces pubkey strings to PublicKey (both spellings)", () => {
    const base58 = "11111111111111111111111111111111";
    const a = coerceArg(base58, "pubkey");
    const b = coerceArg(base58, "publicKey");
    expect(a).toBeInstanceOf(PublicKey);
    expect(b).toBeInstanceOf(PublicKey);
    expect(a.toBase58()).toBe(base58);
  });

  it("coerces bytes from base64 to Buffer", () => {
    const v = coerceArg(Buffer.from("hi").toString("base64"), "bytes");
    expect(Buffer.isBuffer(v)).toBe(true);
    expect(v.toString()).toBe("hi");
  });

  it("passes strings and unknown scalar types through", () => {
    expect(coerceArg("hello", "string")).toBe("hello");
    expect(coerceArg("x", "weirdType")).toBe("x");
  });

  it("handles option<T> (null stays null, value is coerced)", () => {
    expect(coerceArg(null, { option: "u64" })).toBeNull();
    const v = coerceArg("10", { option: "u64" });
    expect(BN.isBN(v)).toBe(true);
    expect(v.toString()).toBe("10");
  });

  it("handles coption<T> like option<T>", () => {
    expect(coerceArg(null, { coption: "u64" })).toBeNull();
    expect(BN.isBN(coerceArg("3", { coption: "u64" }))).toBe(true);
  });

  it("coerces each element of a vec<T>", () => {
    const v = coerceArg(["1", "2", "3"], { vec: "u64" });
    expect(Array.isArray(v)).toBe(true);
    expect(v.every((x: any) => BN.isBN(x))).toBe(true);
    expect(v.map((x: any) => x.toString())).toEqual(["1", "2", "3"]);
  });

  it("passes a vec value through unchanged when not an array", () => {
    expect(coerceArg("nope", { vec: "u64" })).toBe("nope");
  });

  it("coerces each element of an array<T;N>", () => {
    const v = coerceArg([true, 0], { array: ["bool", 2] });
    expect(v).toEqual([true, false]);
  });

  it("passes defined structs/enums through untouched", () => {
    const obj = { foo: 1 };
    expect(coerceArg(obj, { defined: { name: "MyStruct" } })).toBe(obj);
  });
});

describe("typeLabel", () => {
  it("labels scalar and missing types", () => {
    expect(typeLabel("u64")).toBe("u64");
    expect(typeLabel(undefined)).toBe("unknown");
    expect(typeLabel(null)).toBe("unknown");
  });

  it("labels option / coption / vec", () => {
    expect(typeLabel({ option: "u64" })).toBe("option<u64>");
    expect(typeLabel({ coption: "pubkey" })).toBe("coption<pubkey>");
    expect(typeLabel({ vec: "u8" })).toBe("vec<u8>");
  });

  it("labels array with its length", () => {
    expect(typeLabel({ array: ["u8", 32] })).toBe("array<u8;32>");
  });

  it("labels defined types by name (object and string forms)", () => {
    expect(typeLabel({ defined: { name: "Counter" } })).toBe("defined:Counter");
    expect(typeLabel({ defined: "Counter" })).toBe("defined:Counter");
  });

  it("falls back to JSON for unrecognized type shapes", () => {
    expect(typeLabel({ mystery: true })).toBe(JSON.stringify({ mystery: true }));
  });
});

describe("camel", () => {
  it("converts snake_case to camelCase", () => {
    expect(camel("system_program")).toBe("systemProgram");
    expect(camel("read_account")).toBe("readAccount");
    expect(camel("a_b_c")).toBe("aBC");
  });

  it("lowercases the leading character", () => {
    expect(camel("Counter")).toBe("counter");
    expect(camel("Initialize")).toBe("initialize");
  });

  it("leaves already-camelCase strings intact", () => {
    expect(camel("increment")).toBe("increment");
    expect(camel("feePayer")).toBe("feePayer");
  });
});
