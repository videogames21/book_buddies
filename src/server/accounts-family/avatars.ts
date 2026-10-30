// The fixed avatar set a child is shown as (BR-kid-anonymous-profile). Each key is the
// name of a drawn character image in public/avatars; a child never uploads a picture
// (design/par.md, Key decisions). Not `server-only`: the form and its schema read it too.
export const AVATAR_KEYS = [
  "1", "1-1", "2", "2-1", "3", "3-1", "4", "4-1", "5", "5-1",
  "6", "7", "8", "9", "10", "11", "12", "13", "14", "15",
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

export function avatarSrc(key: AvatarKey): string {
  return `/avatars/${key}.png`;
}
