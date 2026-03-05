export interface FilterableField<T> {
  field: keyof T;
  type: 'string' | 'number' | 'boolean' | 'date';
  nullable?: boolean;
}
