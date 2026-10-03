import { registerTestAccount } from "./account-fixture";
test.beforeEach(async ({ page }) => {
  await registerTestAccount(page);
});
import { expect, test } from "@playwright/test";

// Exercise real browser keyboard and pointer-lock events without requiring a GPU.
test("browser D and W stay held during mouse-look events under pointer lock", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:5174/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `
    <canvas id="game" tabindex="0" style="width:500px;height:300px"></canvas>
    <button id="capture">Capture</button><output id="state"></output>
    <script type="module">
      import { GameInput } from '/src/game/input.ts';
      const canvas = document.querySelector('#game');
      const input = new GameInput(canvas);
      document.querySelector('#capture').onclick = () => { canvas.focus(); canvas.requestPointerLock(); };
      function frame() {
        document.querySelector('#state').textContent = JSON.stringify({ ...input.consume(), yaw: input.yaw, active: input.active });
        requestAnimationFrame(frame);
      }
      frame();
    </script>`,
    }),
  );
  await page.goto("/");
  await page.locator("#capture").click();
  await expect(page.locator("#state")).toContainText('"active":true');
  await page.keyboard.down("d");
  await expect(page.locator("#state")).toContainText('"right":1');
  await page.keyboard.down("w");
  const before = JSON.parse(await page.locator("#state").innerText()).yaw;
  // Playwright's absolute mouse moves do not reliably produce relative deltas
  // under pointer lock. Supply a movement event while keeping real keys held.
  await page.evaluate(() =>
    document.dispatchEvent(
      new MouseEvent("mousemove", {
        movementX: 120,
        movementY: 20,
        bubbles: true,
      }),
    ),
  );
  await expect
    .poll(async () => JSON.parse(await page.locator("#state").innerText()).yaw)
    .not.toBe(before);
  await expect(page.locator("#state")).toContainText('"right":1');
  await expect(page.locator("#state")).toContainText('"forward":1');
  for (const shift of ["ShiftLeft", "ShiftRight"]) {
    await page.keyboard.down(shift);
    await expect(page.locator("#state")).toContainText('"run":true');
    await page.keyboard.up(shift);
    await expect(page.locator("#state")).toContainText('"run":false');
  }
  await page.keyboard.up("d");
  await expect(page.locator("#state")).toContainText('"right":0');
  await expect(page.locator("#state")).toContainText('"forward":1');
  await page.keyboard.up("w");
  await page.keyboard.press("Escape");
  await expect(page.locator("#state")).toContainText('"active":false');
});

test("real browser Shift held before capture accelerates movement and release returns to walking", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:5174/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<canvas id="game" tabindex="0"></canvas><button id="capture">Capture</button><output id="speed"></output><script type="module">
    import {GameInput} from '/src/game/input.ts';
    import {createPlayer, updatePlayer} from '/src/game/player.ts';
    const canvas = document.querySelector('canvas'), input = new GameInput(canvas), player = createPlayer();
    document.querySelector('button').onclick = () => { canvas.focus(); canvas.requestPointerLock(); };
    function frame() { updatePlayer(player, input.consume(), input.yaw, 1/60); document.querySelector('output').textContent = Math.hypot(player.velocity.x,player.velocity.z).toFixed(2); requestAnimationFrame(frame); } frame();
  </script>`,
    }),
  );
  await page.goto("/");
  await page.keyboard.down("Shift");
  await page.locator("#capture").click({ modifiers: ["Shift"] });
  await page.waitForFunction(
    () => document.pointerLockElement === document.querySelector("#game"),
  );
  await page.keyboard.down("w");
  await expect
    .poll(async () => Number(await page.locator("#speed").innerText()))
    .toBeGreaterThan(8.5);
  await page.keyboard.up("Shift");
  await expect
    .poll(async () => Number(await page.locator("#speed").innerText()))
    .toBeLessThan(5.2);
  await expect
    .poll(async () => Number(await page.locator("#speed").innerText()))
    .toBeGreaterThan(4.8);
  await page.keyboard.up("w");
  await page.keyboard.press("Escape");
});
