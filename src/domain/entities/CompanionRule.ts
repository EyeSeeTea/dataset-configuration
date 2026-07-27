import { HashMap } from "$/domain/entities/generic/HashMap";
import { Indicator } from "$/domain/entities/Indicator";
import { Code } from "$/domain/entities/Ref";
import { LowercaseString, Maybe, toLowercaseString } from "$/utils/ts-utils";

export type CompanionRule =
    | { type: "atomic"; code: Code }
    | { type: "AND"; operators: CompanionRule[] }
    | { type: "OR"; operators: CompanionRule[] };

export function evaluateRule(
    rule: CompanionRule,
    indicatorByCodes: HashMap<LowercaseString, Indicator>
): boolean {
    switch (rule.type) {
        case "atomic":
            return indicatorByCodes.hasKey(toLowercaseString(rule.code));
        case "AND":
            return rule.operators.every(sub => evaluateRule(sub, indicatorByCodes));
        case "OR":
            return rule.operators.some(sub => evaluateRule(sub, indicatorByCodes));
    }
}

export function getIndicatorCodes(rule: CompanionRule): Code[] {
    if (rule.type === "atomic") {
        return [rule.code];
    } else if (rule.type === "AND" || rule.type === "OR") {
        return rule.operators.flatMap(getIndicatorCodes);
    }
    return [];
}

export function buildCompanionRuleMessage(rule: Maybe<CompanionRule>): string {
    if (!rule) return "";

    switch (rule.type) {
        case "atomic":
            return rule.code;
        case "AND": {
            return rule.operators.map(buildCompanionRuleMessage).join(" AND ");
        }
        case "OR": {
            return rule.operators.map(buildCompanionRuleMessage).join(" OR ");
        }
    }
}
