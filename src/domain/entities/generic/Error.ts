import i18n from "$/utils/i18n";

export type ValidationErrorKey =
    | "field_cannot_be_blank"
    | "positive_number"
    | "org_unit_required"
    | "indicators_required"
    | "regions_required"
    | "not_found"
    | "invalid_value";

export const validationErrorMessages: Record<
    ValidationErrorKey,
    (fieldName: string, value: unknown) => string
> = {
    field_cannot_be_blank: (fieldName: string, value: unknown) =>
        i18n.t(`Cannot be blank: {{fieldName}} {{value}}`, {
            fieldName: fieldName,
            value: String(value),
            nsSeparator: false,
        }),
    positive_number: (fieldName: string) => {
        return i18n.t(`{{fieldName}} must be a positive number`, {
            fieldName: fieldName,
        });
    },
    org_unit_required: () => i18n.t("At least one org. unit is required"),
    indicators_required: () => i18n.t("At least one indicator is required"),
    regions_required: () => i18n.t("Select at least one country"),
    not_found: (fieldName: string, value: unknown) =>
        i18n.t(`{{fieldName}} not found: {{value}}`, {
            fieldName: fieldName,
            value: String(value),
            nsSeparator: false,
        }),
    invalid_value: (fieldName: string, value: unknown) =>
        i18n.t(`Invalid value for {{fieldName}}: {{value}}`, {
            fieldName: fieldName,
            value: String(value),
            nsSeparator: false,
        }),
};

export function getErrorMessageFromErrors<T>(errors: ValidationError<T>[]): string {
    return errors
        .map(error => {
            return error.errors.map(err =>
                validationErrorMessages[err](error.property, error.value)
            );
        })
        .flat()
        .join("\n");
}

export function getErrors<T>(errors: ValidationError<T>[]): string[] {
    return errors.flatMap(error => {
        return error.errors.map(err => validationErrorMessages[err](error.property, error.value));
    });
}

export type ValidationError<T> = {
    property: keyof T & string;
    value: unknown;
    errors: ValidationErrorKey[];
};
