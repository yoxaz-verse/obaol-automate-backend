export function generateCustomId(location: { nation: string; city: string; region: string; province: string }): string {
  const { nation, city, region, province } = location;
  const customId = `${nation.slice(0, 2).toUpperCase()}${city.slice(0, 2).toUpperCase()}${region.slice(0, 2).toUpperCase()}${province.slice(0, 2).toUpperCase()}`;
  return customId;
}
