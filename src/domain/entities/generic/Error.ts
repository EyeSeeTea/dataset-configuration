import i18n from "$/utils/i18n";

export type ValidationErrorKey = "field_cannot_be_blank" | "positive_number" | "org_unit_required";

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
