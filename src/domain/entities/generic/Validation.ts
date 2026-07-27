import { OrgUnit } from "$/domain/entities/DataSet";
import { ValidationErrorKey } from "$/domain/entities/generic/Error";

export const periodsTypes = ["CUSTOM", "ANNUAL", "SEMIANNUAL"] as const;

export function validateRequired(value: any): ValidationErrorKey[] {
    const isBlank = !value || (value.length !== undefined && value.length === 0);

    return isBlank ? ["field_cannot_be_blank"] : [];
}

export function isPositive(value: number): ValidationErrorKey[] {
    return value >= 0 ? [] : ["positive_number"];
}

export function validateOrgUnits(value: OrgUnit[]): ValidationErrorKey[] {
    return value.length > 0 ? [] : ["org_unit_required"];
}
