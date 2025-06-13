export function cleanObjectIdFields(obj: any, fields: string[]) {
  for (const field of fields) {
    if (obj[field] === "") obj[field] = undefined;
  }
}
