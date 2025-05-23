import { CompanionRule } from "$/domain/entities/CompanionRule";
import { Maybe } from "$/utils/ts-utils";

type RuleToken = "AND" | "OR" | "(" | ")" | { code: string };
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
            if (parsedToken === "(" || parsedToken === ")") return parsedToken;

            const uppercaseToken = parsedToken.toUpperCase();
            if (uppercaseToken === "AND" || uppercaseToken === "OR") return uppercaseToken;

            return { code: parsedToken.trim() };
        });
    }

    private parseAndOperator(tokens: RuleToken[]): CompanionRuleToken {
        const [left, rest] = this.parseFactor(tokens);
        const andToken: RuleToken = "AND";
        if (rest[0] === andToken) {
            const [right, tail] = this.parseAndOperator(rest.slice(1));
            const leftOperators = left.type === andToken ? left.operators : [left];
            const rightOperators = right.type === andToken ? right.operators : [right];
            return [{ type: andToken, operators: leftOperators.concat(rightOperators) }, tail];
        }
        return [left, rest];
    }

    private parseFactor(tokens: RuleToken[]): CompanionRuleToken {
        const [first, ...rest] = tokens;
        if (first === "(") {
            const [expr, afterExpr] = this.parseOrOperator(rest);
            if (afterExpr[0] !== ")") throw new Error('Expected ")"');
            return [expr, afterExpr.slice(1)];
        } else if (typeof first === "object") {
            return [{ type: "atomic", code: first.code.trim() }, rest];
        } else {
            throw new Error(`Unexpected token in factor: ${first}`);
        }
    }

    private parseOrOperator(tokens: RuleToken[]): CompanionRuleToken {
        const [leftRule, rest] = this.parseAndOperator(tokens);
        const orToken: RuleToken = "OR";
        if (rest[0] === orToken) {
            const [rightRule, ruleTokens] = this.parseOrOperator(rest.slice(1));
            const leftOps = leftRule.type === orToken ? leftRule.operators : [leftRule];
            const rightOps = rightRule.type === orToken ? rightRule.operators : [rightRule];
            return [{ type: orToken, operators: [...leftOps, ...rightOps] }, ruleTokens];
        }
        return [leftRule, rest];
    }
}
