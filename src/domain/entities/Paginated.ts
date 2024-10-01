export type Paginated<T> = {
    page: number;
    total: number;
    pageSize: number;
    pageCount: number;
    data: T[];
};
