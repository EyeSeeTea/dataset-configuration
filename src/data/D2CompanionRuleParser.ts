import { CompanionRule } from "$/domain/entities/CompanionRule";
import { Maybe } from "$/utils/ts-utils";

type RuleToken =
    | {
          value: "AND";
          type: "operand";
      }
    | {
          value: "OR";
          type: "operand";
      }
    | {
          value: "(";
          type: "operand";
      }
    | {
          value: ")";
          type: "operand";
      }
    | {
          type: "atomic";
          code: string;
      };

type CompanionRuleToken = [CompanionRule, RuleToken[]];

export class D2CompanionRuleParser {
    public readonly rule: string;

    constructor(rule: string) {
        this.rule = rule;
    }

    public buildCompanionRule(): Maybe<CompanionRule> {
        if (!this.rule) return undefined;

        try {
            const tokens = this.extractTokens(this.rule);
            const [companionRules, ruleTokens] = this.parseOrOperator(tokens);
            if (ruleTokens.length > 0) return undefined;
            return companionRules;
        } catch (error) {
            console.error(`Error in rule ${this.rule}: ${error}`);
            return undefined;
        }
    }

    private extractTokens(value: string): RuleToken[] {
        const parsedTokens = value.match(/\(|\)|AND|OR|[^()\s]+/gi) ?? [];
        return parsedTokens.map(parsedToken => {
            if (parsedToken === "(" || parsedToken === ")")
                return { value: parsedToken, type: "operand" };

            const uppercaseToken = parsedToken.toUpperCase();
            if (uppercaseToken === "AND" || uppercaseToken === "OR")
                return { value: uppercaseToken, type: "operand" };

            return { type: "atomic", code: parsedToken.trim() };
        });
    }

    private parseAndOperator(tokens: RuleToken[]): CompanionRuleToken {
        const [left, rest] = this.parseFactor(tokens);
        const andToken: RuleToken = { value: "AND", type: "operand" };
        const firstValue = rest[0];
        if (firstValue?.type === "operand" && firstValue.value === andToken.value) {
            const [right, tail] = this.parseAndOperator(rest.slice(1));
            const leftOperators = left.type === andToken.value ? left.operators : [left];
            const rightOperators = right.type === andToken.value ? right.operators : [right];
            return [
                { type: andToken.value, operators: leftOperators.concat(rightOperators) },
                tail,
            ];
        }
        return [left, rest];
    }

    private parseFactor(tokens: RuleToken[]): CompanionRuleToken {
        const [first, ...rest] = tokens;
        if (first?.type === "operand" && first?.value === "(") {
            const [expr, afterExpr] = this.parseOrOperator(rest);
            if (afterExpr[0]?.type !== "operand") throw new Error('Expected ")"');
            return [expr, afterExpr.slice(1)];
        } else if (first?.type === "atomic") {
            return [{ type: "atomic", code: first.code.trim() }, rest];
        } else {
            throw new Error(`Unexpected token in factor: ${first}`);
        }
    }

    private parseOrOperator(tokens: RuleToken[]): CompanionRuleToken {
        const [leftRule, rest] = this.parseAndOperator(tokens);
        const orToken: RuleToken = { value: "OR", type: "operand" };
        const firstValue = rest[0];
        if (firstValue?.type === "operand" && firstValue.value === orToken.value) {
            const [rightRule, ruleTokens] = this.parseOrOperator(rest.slice(1));
            const leftOps = leftRule.type === orToken.value ? leftRule.operators : [leftRule];
            const rightOps = rightRule.type === orToken.value ? rightRule.operators : [rightRule];
            return [{ type: orToken.value, operators: [...leftOps, ...rightOps] }, ruleTokens];
        }
        return [leftRule, rest];
    }
}
