export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface ListParams {
  sort?: string;
  filter?: string;
  expand?: string;
  page?: number;
  perPage?: number;
}