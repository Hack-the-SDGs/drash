/**
 * Determine the default Minecraft skin type from a player UUID.
 *
 * Minecraft uses Java's UUID.hashCode() to decide Steve (classic) vs Alex (slim):
 *   hashCode = (int)(msb ^ (msb >>> 32)) ^ (int)(lsb ^ (lsb >>> 32))
 *   odd → Alex (slim), even → Steve (classic)
 */
export function getDefaultSkinType(uuid: string): "classic" | "slim" {
  const hex = uuid.replace(/-/g, "");
  const msb = BigInt("0x" + hex.substring(0, 16));
  const lsb = BigInt("0x" + hex.substring(16, 32));

  const msbHash = Number((msb ^ (msb >> BigInt(32))) & BigInt(0xFFFFFFFF));
  const lsbHash = Number((lsb ^ (lsb >> BigInt(32))) & BigInt(0xFFFFFFFF));
  const hash = (msbHash ^ lsbHash) | 0;

  return (hash & 1) === 1 ? "slim" : "classic";
}

export function getDefaultSkinUrl(uuid: string): string {
  return getDefaultSkinType(uuid) === "slim" ? "/alex.png" : "/steve.png";
}
