import { expect, test } from "@playwright/test";

test("the existing side cast has textured PBR surfaces and distinct details", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const characters = await page.evaluate(async () => {
    const moduleUrl: string = "/src/game/characters.ts";
    const { makeCharacter } = await import(moduleUrl);
    return (["patrick", "sandy", "squid", "krabs"] as const).map((kind) => {
      const character = makeCharacter(kind);
      let meshes = 0;
      let texturedSurfaces = 0;
      const details: string[] = [];
      character.traverse(
        (object: { name: string; isMesh?: boolean; material?: unknown }) => {
          const item = object as {
            name: string;
            isMesh?: boolean;
            material?: unknown;
          };
          if (item.name) details.push(item.name);
          if (!item.isMesh) return;
          meshes++;
          const materials = Array.isArray(item.material)
            ? item.material
            : [item.material];
          if (
            (materials as { map?: unknown }[]).some((material) => material.map)
          )
            texturedSurfaces++;
        },
      );
      return { kind, meshes, texturedSurfaces, details };
    });
  });

  const signatures: Record<string, string> = {
    patrick: "Patrick_Freckle",
    sandy: "Sandy_Chest_Panel",
    squid: "Thaddaeus_Tentacle_Sucker",
    krabs: "Krabs_Claw_Pincer",
  };
  for (const character of characters) {
    expect(character.meshes).toBeGreaterThan(10);
    expect(character.texturedSurfaces).toBeGreaterThan(5);
    expect(character.details).toContain(signatures[character.kind]);
  }
  await page.locator("#play").click();
  await page.locator("#story-start").click();
  await expect(page.locator("#crosshair")).toBeVisible();
  await page.screenshot({ path: "/tmp/spongebob-side-cast.png" });
});
