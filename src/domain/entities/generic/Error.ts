import i18n from "$/utils/i18n";

export type ValidationErrorKey =
    | "field_cannot_be_blank"
    | "positive_number"
    | "org_unit_required"
    | "indicators_required"
    | "regions_required";

export const validationErrorMessages: Record<
    ValidationErrorKey,
    (fieldName: string, value: unknown) => string
> = {
    field_cannot_be_blank: (fieldName: string) =>
        i18n.t(`Cannot be blank: {{fieldName}}`, { fieldName: fieldName, nsSeparator: false }),
    positive_number: (fieldName: string) => {
        return i18n.t(`{{fieldName}} must be a positive number`, {
            fieldName: fieldName,
        });
    },
    org_unit_required: () => i18n.t("At least one org. unit is required"),
    indicators_required: () => i18n.t("At least one indicator is required"),
    regions_required: () => i18n.t("Select at least one country"),
};

export function getErrorMessageFromErrors<T>(errors: ValidationError<T>[]): string {
    return errors
        .map(error => {
            return error.errors.map(err =>
                validationErrorMessages[err](error.property as string, error.value)
            );
        })
        .flat()
        .join("\n");
}

export function getErrors<T>(errors: ValidationError<T>[]): string[] {
    return errors
        .map(error => {
            return error.errors.map(err =>
                validationErrorMessages[err](error.property as string, error.value)
            );
        })
        .flat();
}

export type ValidationError<T> = {
    property: keyof T;
    value: unknown;
    errors: ValidationErrorKey[];
};
