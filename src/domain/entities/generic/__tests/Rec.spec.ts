import { Rec } from "$/domain/entities/generic/Rec";
import { expectTypeOf } from "expect-type";

const rec1 = Rec.from({ x: 1, s: "hello", n: null });

describe("Rec", () => {
    test("keys", () => {
        const keys = rec1.keys();
        expectTypeOf(keys).toEqualTypeOf<Array<"x" | "s" | "n">>();
        expect(keys).toEqual(["x", "s", "n"]);
    });

    test("values", () => {
        const values = rec1.values();
        expectTypeOf(values).toEqualTypeOf<Array<number | string | null>>();
        expect(values).toEqual([1, "hello", null]);
    });

    test("pick", () => {
        const picked = rec1.pick(["x", "n"]);
        expectTypeOf(picked).toEqualTypeOf<Rec<{ x: number; n: null }>>();
        expect(picked.toObject()).toEqual({ x: 1, n: null });
    });

    test("pickBy", () => {
        expect(rec1.pickBy(key => key === "x").toObject()).toEqual({ x: 1 });
    });

    test("omit", () => {
        expect(rec1.omit(["x", "n"]).toObject()).toEqual({ s: "hello" });
    });

    test("omitBy", () => {
        expect(rec1.omitBy(key => key === "x").toObject()).toEqual({ s: "hello", n: null });
    });

    test("merge", () => {
        const rec2 = Rec.from({ n: true, z: 123 });
        const merged = rec1.merge(rec2);
        expectTypeOf(merged).toEqualTypeOf<Rec<{ x: number; s: string; n: boolean; z: number }>>();
        expect(merged.toObject()).toEqual({ x: 1, s: "hello", n: true, z: 123 });
    });

    test("mapValues", () => {
        const rec1 = Rec.from({ a: 1, b: 2, c: 3 });
        const result = rec1.mapValues(([_key, value]) => value * 2).value();
        expect(result).toEqual({ a: 2, b: 4, c: 6 });

        const result2 = rec1.mapValues(([key, value]) => `${value * 2}_${key}`).value();
        expectTypeOf(result2).toEqualTypeOf<{ a: string; b: string; c: string }>();
        expect(result2).toEqual({ a: "2_a", b: "4_b", c: "6_c" });

        const emptyObj = Rec.from({})
            .mapValues(([_key, value]) => value)
            .value();

        expect(emptyObj).toEqual({});
    });
});
