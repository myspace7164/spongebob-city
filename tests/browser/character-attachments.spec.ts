import { expect, test } from "@playwright/test";

test("sponge character arms and socks stay attached in idle and walk through water states", async ({
  page,
}) => {
  await page.route("**/src/main.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/ui/style.css";',
    }),
  );
  await page.goto("/");
  await page.addStyleTag({
    content: "body > :not(canvas) { display: none !important; }",
  });
  const report = await page.evaluate(async () => {
    const source = await (await fetch("/src/game/world.ts")).text();
    const threePath = source.match(/from\s+"([^"]*three[^"]+)"/)![1];
    const assetsPath = "/src/game/assets.ts";
    const locomotionPath = "/src/game/locomotion.ts";
    const [THREE, { loadModel, updateSpongeWaterState }, { createLocomotion }] =
      await Promise.all([
        import(threePath),
        import(assetsPath),
        import(locomotionPath),
      ]);
    const model = await loadModel({
      url: "/models/spongebob.glb",
      scale: 1,
      rotationY: 0,
    });
    const rig = createLocomotion(model, true);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#9ce0eb");
    scene.add(new THREE.HemisphereLight(0xffffff, 0x55616b, 2));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(-3, 6, 5);
    scene.add(key);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: 0x85bd96 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.025;
    scene.add(floor, model);
    const canvas = document.querySelector("#game") as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(960, 720);
    const camera = new THREE.PerspectiveCamera(35, 960 / 720, 0.1, 30);
    camera.position.set(2.65, 2.1, 4.4);
    camera.lookAt(0, 0.95, 0);
    const armPairs = [
      ["right-arm", "Cube_morph_export_1"],
      ["left-arm", "Cube_morph_export_2"],
    ] as const;
    const legPairs = [
      ["right-leg", "Shoe_cube002", "right-sock-export-mesh"],
      ["left-leg", "Shoe_cube003", "left-sock-export-mesh"],
    ] as const;
    const objectCenter = (object: any) => {
      object.geometry.computeBoundingBox();
      return object.localToWorld(
        object.geometry.boundingBox.getCenter(new THREE.Vector3()),
      );
    };
    const surfaceGap = (a: any, b: any) => {
      const ap = a.geometry.attributes.position,
        bp = b.geometry.attributes.position,
        av = new THREE.Vector3(),
        bv = new THREE.Vector3();
      let closest = Number.POSITIVE_INFINITY;
      for (let i = 0; i < ap.count; i++) {
        av.fromBufferAttribute(ap, i).applyMatrix4(a.matrixWorld);
        for (let j = 0; j < bp.count; j++) {
          bv.fromBufferAttribute(bp, j).applyMatrix4(b.matrixWorld);
          closest = Math.min(closest, av.distanceTo(bv));
        }
      }
      return closest;
    };
    const relativeArmCenters = () =>
      armPairs.map(([armName, sleeveName]) => {
        const arm = model.getObjectByName(armName)!,
          sleeve = model.getObjectByName(sleeveName)!,
          upper = model.getObjectByName(`${armName}-mesh`)!;
        arm.updateWorldMatrix(true, true);
        const sleeveCenter = arm.worldToLocal(objectCenter(sleeve));
        const armCenter = arm.worldToLocal(objectCenter(upper));
        return sleeveCenter.sub(armCenter);
      });
    const sockShoeDistances = () =>
      legPairs.map(([, shoeName, sockName]) => {
        const shoe = model.getObjectByName(shoeName)!,
          sock = model.getObjectByName(sockName)!;
        return objectCenter(sock).distanceTo(objectCenter(shoe));
      });
    const render = () => {
      model.updateMatrixWorld(true);
      renderer.render(scene, camera);
    };
    updateSpongeWaterState(model, 200, 400); // Normal: both morphs at zero.
    rig.update(0, 0, true);
    render();
    const idleArms = relativeArmCenters();
    const idleFeet = sockShoeDistances();
    const rightArm = model.getObjectByName("right-arm")!,
      leftArm = model.getObjectByName("left-arm")!;
    const attachedSleeves: string[] = [];
    model.traverse((object: any) => {
      if (object.userData.attachedToLimb?.endsWith("arm"))
        attachedSleeves.push(object.userData.attachedToLimb);
    });
    const attachmentNames = [
      "right-sock-export",
      "left-sock-export",
      "right-red-ring-export",
      "left-red-ring-export",
      "right-blue-ring-export",
      "left-blue-ring-export",
    ];
    const attachmentsExist = attachmentNames.every((name) =>
      Boolean(model.getObjectByName(`${name}-mesh`)),
    );
    const armRestDown = rightArm.rotation.z > 0 && leftArm.rotation.z < 0;
    const maximumRelativeError = [0, 1].map(() => 0);
    const walkDistances = [0, 0];
    for (let frame = 0; frame <= 30; frame++) {
      rig.update(frame / 30, 2.6, true);
      render();
      const arms = relativeArmCenters();
      const feet = sockShoeDistances();
      for (let i = 0; i < 2; i++) {
        maximumRelativeError[i] = Math.max(
          maximumRelativeError[i],
          arms[i].distanceTo(idleArms[i]),
        );
        walkDistances[i] = Math.max(
          walkDistances[i],
          Math.abs(feet[i] - idleFeet[i]),
        );
      }
    }
    const walkSwing = Math.abs(rightArm.rotation.x) > 0.1;
    // Shape keys leave the attachments present and controllable in every state.
    const stateChecks = [];
    for (const sponge of [0, 200, 400]) {
      updateSpongeWaterState(model, sponge, 400);
      model.updateMatrixWorld(true);
      const keys: number[] = [];
      for (const name of ["right-sock-export-mesh", "left-sock-export-mesh"]) {
        const sock = model.getObjectByName(name) as any;
        keys.push(sock.morphTargetInfluences[sock.morphTargetDictionary.Dry]);
        keys.push(
          sock.morphTargetInfluences[sock.morphTargetDictionary.WaterFull],
        );
      }
      stateChecks.push({
        attachments: attachmentNames.every((name) =>
          Boolean(model.getObjectByName(`${name}-mesh`)),
        ),
        keyValues: keys,
      });
    }
    updateSpongeWaterState(model, 200, 400);
    rig.update(0, 0, true);
    render();
    const preview = window as any;
    preview.attachmentPreview = {
      walkFrame(frame: number) {
        rig.update(frame / 30, 2.6, true);
        render();
      },
    };
    return {
      attachedSleeves,
      attachmentsExist,
      armRestDown,
      walkSwing,
      maximumRelativeError,
      walkDistances,
      stateChecks,
      idleArmSeams: armPairs.map(([armName, sleeveName]) =>
        surfaceGap(
          model.getObjectByName(`${armName}-mesh`),
          model.getObjectByName(sleeveName),
        ),
      ),
    };
  });
  console.log("Sponge attachment measurements:", report);
  await page.screenshot({ path: "/tmp/sponge-attachments-idle.png" });
  await page.evaluate(() => (window as any).attachmentPreview.walkFrame(7));
  await page.screenshot({ path: "/tmp/sponge-attachments-walk.png" });
  expect(report.attachedSleeves.sort()).toEqual(["left-arm", "right-arm"]);
  expect(report.attachmentsExist).toBe(true);
  expect(report.armRestDown).toBe(true);
  expect(report.walkSwing).toBe(true);
  expect(report.maximumRelativeError.every((error) => error < 0.0001)).toBe(
    true,
  );
  expect(report.walkDistances.every((error) => error < 0.0001)).toBe(true);
  expect(report.stateChecks.every((state) => state.attachments)).toBe(true);
  expect(report.stateChecks.map((state) => state.keyValues)).toEqual([
    [1, 0, 1, 0],
    [0, 0, 0, 0],
    [0, 1, 0, 1],
  ]);
});
