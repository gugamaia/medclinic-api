/** Converte camelCase/PascalCase em snake_case (ex.: "WorkShift" -> "work_shift"). */
export function snakeCase(value: string): string {
  return value
    .replace(/([A-Z])([A-Z])([a-z])/g, '$1_$2$3')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}
