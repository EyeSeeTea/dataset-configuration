import { DataSetOrderFields } from "$/domain/repositories/DataSetRepository";

export function parseSortField(sortFieldName: string): DataSetOrderFields {
    switch (sortFieldName) {
        case "name":
            return "name";
        case "lastUpdated":
            return "lastUpdated";
        default:
            throw new Error(`Unknown sort field: ${sortFieldName}`);
    }
}
