import type { EmoteKind } from "../src/interfaces.ts";
export const emoteConfig = {
  chord: "G",
  items: [
    { id: "six-seven", name: "67", key: "1", duration: 4 },
    { id: "macarena", name: "Macarena", key: "2", duration: 8 },
    { id: "teabag", name: "Teabag", key: "3", duration: 4 },
    { id: "dab", name: "Dab", key: "4", duration: 3 },
    { id: "floss", name: "Floss", key: "5", duration: 6 },
  ] satisfies { id: EmoteKind; name: string; key: string; duration: number }[],
};
