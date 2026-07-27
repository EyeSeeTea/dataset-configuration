import { IndicatorMatch } from "$/domain/entities/IndicatorMatch";
import { Maybe } from "$/utils/ts-utils";

export class D2IndicatorMatchingParser {
    private readonly expressions: string;

    constructor(expressions: string) {
        this.expressions = expressions;
    }

    public buildIndicatorMatching(): Maybe<IndicatorMatch[]> {
        if (!this.expressions) return undefined;

        try {
            return this.parseExpressions(this.expressions);
        } catch (error) {
            console.error(`Error parsing expression ${this.expressions}: ${error}`);
            return undefined;
        }
    }

    private parseExpressions(expression: string): IndicatorMatch[] {
        return expression
            .split(";")
            .map(matching => matching.trim())
            .filter(matching => matching)
            .map(matching => this.parseMatching(matching));
    }

    private parseMatching(matching: string): IndicatorMatch {
        const [target, expressionPart] = matching.split("=").map(part => part.trim());

        if (!target || !expressionPart) {
            throw new Error(`Invalid matching format: ${matching}`);
        }

        return IndicatorMatch.create({
            target,
            source: expressionPart,
        });
    }

    public static parseIndicatorMatching(indicatorMatching: IndicatorMatch[]): string {
        return indicatorMatching.reduce((acc, match) => {
            if (!match.target || !match.source) {
                console.warn(`Skipping invalid match: ${JSON.stringify(match)}`);
                return acc;
            }
            const expression = `${match.target}=${match.source}`;
            return acc ? `${acc};${expression}` : expression;
        }, "");
    }
}
