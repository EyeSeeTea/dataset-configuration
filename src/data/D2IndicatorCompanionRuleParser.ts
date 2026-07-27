import _ from "$/domain/entities/generic/Collection";
import { Maybe } from "$/utils/ts-utils";
import { Indicator, IndicatorCompanionRule } from "$/domain/entities/Indicator";
import { D2CompanionRuleParser } from "$/data/D2CompanionRuleParser";

const SCOPE_DELIMITER = ";";
const SCOPE_RULE_DELIMITER = "=>";

export class D2IndicatorCompanionRuleParser {
    constructor(private readonly ruleText: string) {}

    public parse(): Maybe<IndicatorCompanionRule> {
        if (!this.ruleText?.trim()) return undefined;

        return this.ruleText.includes(SCOPE_RULE_DELIMITER)
            ? this.parseScoped()
            : this.parseGlobal();
    }

    private parseScoped(): IndicatorCompanionRule {
        const entries = this.ruleText
            .split(SCOPE_DELIMITER)
            .map(s => s.trim())
            .filter(Boolean);

        const parsedEntries = _(entries)
            .compactMap(entry => {
                const [scopePart, rulePart] = entry.split(SCOPE_RULE_DELIMITER).map(s => s.trim());
                if (!scopePart || !rulePart) return undefined;

                const parsed = new D2CompanionRuleParser(rulePart).buildCompanionRule();
                return parsed ? ([scopePart, parsed] as const) : undefined;
            })
            .value();

        return Object.fromEntries(parsedEntries);
    }

    private parseGlobal(): Maybe<IndicatorCompanionRule> {
        const parsed = new D2CompanionRuleParser(this.ruleText).buildCompanionRule();

        if (!parsed) return undefined;

        const scope = Indicator.buildCompanionScope();
        return { [scope]: parsed };
    }
}
