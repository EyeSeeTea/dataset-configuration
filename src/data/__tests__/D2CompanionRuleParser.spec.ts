import { describe, expect, it } from "vitest";
import { D2CompanionRuleParser } from "$/data/D2CompanionRuleParser";

describe("D2CompanionRuleParser", () => {
    it("should parse rule with AND operator", () => {
        const result = new D2CompanionRuleParser("a AND b").buildCompanionRule();
        expect(result).toEqual({
            type: "AND",
            operators: [
                { type: "atomic", code: "a" },
                { type: "atomic", code: "b" },
            ],
        });
    });

    it("should parse rule with OR operator", () => {
        const result = new D2CompanionRuleParser("a OR b").buildCompanionRule();
        expect(result).toEqual({
            type: "OR",
            operators: [
                { type: "atomic", code: "a" },
                { type: "atomic", code: "b" },
            ],
        });
    });

    it("should parse rule with nested operators", () => {
        const result = new D2CompanionRuleParser("(a AND b) OR c").buildCompanionRule();
        expect(result).toEqual({
            type: "OR",
            operators: [
                {
                    type: "AND",
                    operators: [
                        { type: "atomic", code: "a" },
                        { type: "atomic", code: "b" },
                    ],
                },
                { type: "atomic", code: "c" },
            ],
        });
    });

    it("should parse nested rules without parentheses", () => {
        const result = new D2CompanionRuleParser("A AND B OR X AND Z").buildCompanionRule();
        expect(result).toEqual({
            type: "OR",
            operators: [
                {
                    type: "AND",
                    operators: [
                        { type: "atomic", code: "A" },
                        { type: "atomic", code: "B" },
                    ],
                },
                {
                    type: "AND",
                    operators: [
                        { type: "atomic", code: "X" },
                        { type: "atomic", code: "Z" },
                    ],
                },
            ],
        });
    });

    it("should return undefined if value can't be parsed", () => {
        const parser = new D2CompanionRuleParser("a AND b OR");
        expect(parser.buildCompanionRule()).toBeUndefined();
    });
});
