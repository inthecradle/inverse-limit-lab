import { expect, test, type Page } from "@playwright/test";

async function close(page: Page) {
  await page.getByRole("button", { name: "閉じる", exact: false }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function chooseFirstThread(page: Page) {
  await page.getByRole("button", { name: "別の糸を選ぶ", exact: true }).click();
  await page
    .getByRole("button", { name: "整合した糸 1 を選ぶ", exact: true })
    .click();
}

test("rewind, layer changes and full reset keep iteration state consistent", async ({
  page,
}) => {
  await page.goto("./");
  const first = page.getByRole("slider", { name: "層0の実点", exact: true });
  const initial = await first.getAttribute("aria-valuenow");
  await chooseFirstThread(page);
  const start = await first.getAttribute("aria-valuenow");
  await page.getByRole("tab", { name: /落ち着く/ }).click();
  const step = page.getByRole("button", { name: "1回進める", exact: true });
  for (let count = 0; count < 3; count += 1) await step.click();
  await expect(page.getByTestId("iteration")).toHaveText("n = 3");
  expect(await first.getAttribute("aria-valuenow")).not.toBe(start);
  const rewind = page.getByRole("button", {
    name: "開始点へ戻す",
    exact: true,
  });
  await rewind.click();
  await expect(page.getByTestId("iteration")).toHaveText("n = 0");
  await expect(first).toHaveAttribute("aria-valuenow", start!);
  await expect(rewind).toBeDisabled();

  await step.click();
  const advanced = await first.getAttribute("aria-valuenow");
  await page.getByRole("button", { name: "条件を変える", exact: true }).click();
  await page.getByLabel("層数", { exact: true }).selectOption("8");
  await close(page);
  await expect(page.getByTestId("iteration")).toHaveText("n = 0");
  await expect(first).toHaveAttribute("aria-valuenow", advanced!);
  await expect(rewind).toBeDisabled();
  await expect(page.getByRole("slider", { name: /^層/ })).toHaveCount(8);

  await page.getByRole("tab", { name: /自分を表す/ }).click();
  await page
    .getByRole("button", { name: "基準固定点を表示", exact: true })
    .click();
  await page
    .getByRole("button", { name: "自己表象を加える", exact: true })
    .click();
  await page.getByRole("button", { name: "条件を変える", exact: true }).click();
  await page
    .getByRole("button", { name: "全て初期状態に戻す", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /つなぐ/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("slider", { name: /^層/ })).toHaveCount(6);
  await expect(first).toHaveAttribute("aria-valuenow", initial!);
  await expect(page.getByTestId("coherence-status")).toContainText(
    "整合していない",
  );
  await page.getByRole("tab", { name: /落ち着く/ }).click();
  await expect(page.getByTestId("iteration")).toHaveText("n = 0");
  await expect(
    page.getByLabel("縮小率のパラメータ", { exact: false }),
  ).toHaveValue("0.65");
  await page.getByRole("tab", { name: /自分を表す/ }).click();
  await expect(page.getByTestId("representation-status")).toContainText(
    "固定点を確認",
  );
});

test("compact chapters preserve states; layers and feedback keep their invariants", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.getByRole("tab")).toHaveCount(4);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "1回進める", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId("coherence-status")).toContainText(
    "整合していない",
  );
  await page
    .getByRole("button", { name: "上の層に整合させる", exact: true })
    .click();
  await page.getByRole("button", { name: "条件を変える", exact: true }).click();
  await page.getByLabel("層数", { exact: true }).selectOption("12");
  await close(page);
  await expect(page.getByRole("slider", { name: /^層/ })).toHaveCount(12);
  await expect(page.getByTestId("coherence-status")).toContainText("✓ 整合");
  await chooseFirstThread(page);
  const first = page.getByRole("slider", { name: "層0の実点", exact: true });
  const start = await first.getAttribute("aria-valuenow");
  await page.getByRole("tab", { name: /落ち着く/ }).click();
  await expect(first).toHaveAttribute("aria-valuenow", start!);
  await page.getByRole("button", { name: "1回進める", exact: true }).click();
  await expect(page.getByTestId("iteration")).toHaveText("n = 1");
  await page.getByRole("button", { name: "条件を変える", exact: true }).click();
  await page.getByRole("button", { name: "L = 1", exact: true }).click();
  await close(page);
  await page.getByRole("button", { name: "1回進める", exact: true }).click();
  await expect(first).toHaveAttribute("aria-valuenow", start!);
  await expect(page.getByTestId("contraction-status")).toContainText(
    "保証なし",
  );
  await page.getByRole("button", { name: "条件を変える", exact: true }).click();
  await page.getByRole("button", { name: "L = 0", exact: true }).click();
  await close(page);
  await page.getByRole("button", { name: "1回進める", exact: true }).click();
  expect(Number(await first.getAttribute("aria-valuenow"))).toBeCloseTo(0.2);
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "整合して反復を準備" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /つなぐ/ }).click();
  await expect(page.getByTestId("coherence-status")).toContainText(
    "整合していない",
  );
  expect(errors).toEqual([]);
});

test("representation is additional, faithful and independent of history comparison", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /自分を表す/ }).click();
  await page
    .getByRole("button", { name: "基準固定点を表示", exact: true })
    .click();
  await expect(page.getByTestId("representation-status")).toContainText(
    "自己表象は未追加",
  );
  await page
    .getByRole("button", { name: "自己表象を加える", exact: true })
    .click();
  await expect(page.getByTestId("representation-status")).toContainText(
    "自己表象の条件が成立",
  );
  await page.getByRole("button", { name: "条件を変える", exact: true }).click();
  await page.getByLabel("自己表象", { exact: true }).selectOption("mismatch");
  await close(page);
  await expect(page.getByTestId("representation-status")).toContainText(
    "不一致",
  );
  await page
    .getByRole("button", { name: "自己表象を加える", exact: true })
    .click();
  await page
    .getByRole("button", { name: "自己表象を外す", exact: true })
    .click();
  await expect(page.getByTestId("representation-status")).toContainText(
    "固定点あり",
  );
  await page.getByRole("tab", { name: /履歴を変える/ }).click();
  const initialPath = await page
    .locator(".il-state-point")
    .first()
    .getAttribute("cx");
  await expect(page.getByTestId("history-status")).toContainText("変化");
  await page
    .getByRole("button", { name: "Aと同じにする", exact: true })
    .click();
  await expect(page.getByTestId("history-status")).toContainText("同じ履歴");
  expect(
    await page.locator(".il-state-point").first().getAttribute("cx"),
  ).not.toBe(initialPath);
  await page
    .getByRole("button", { name: "別の履歴にする", exact: true })
    .click();
  await page
    .getByRole("button", { name: "いまの履歴をAに保存", exact: true })
    .click();
  await expect(page.getByTestId("history-status")).toContainText("同じ履歴");
  await page.getByRole("tab", { name: /自分を表す/ }).click();
  await expect(page.getByTestId("representation-status")).toContainText(
    "固定点あり",
  );
});

test("condition counterexamples are explicit and do not mutate the main experiment", async ({
  page,
}) => {
  await page.goto("./");
  const first = page.getByRole("slider", { name: "層0の実点", exact: true });
  const initial = await first.getAttribute("aria-valuenow");
  await page.getByRole("button", { name: "条件を変える", exact: true }).click();
  await page
    .getByLabel("試す条件", { exact: true })
    .selectOption("composition");
  await expect(page.getByTestId("condition-witness")).toContainText("0.300");
  await page.getByRole("slider", { name: /入力座標/ }).fill("0.6");
  await expect(page.getByTestId("condition-witness")).toContainText("0.600");
  for (const id of [
    "empty",
    "noncompact",
    "discontinuousProjection",
    "finiteCompatibility",
    "outsideSelfMap",
    "discontinuousFeedback",
  ]) {
    await page.getByLabel("試す条件", { exact: true }).selectOption(id);
    await expect(page.getByTestId("condition-guarantee")).not.toBeEmpty();
    await expect(page.locator(".katex-error")).toHaveCount(0);
  }
  await close(page);
  await expect(first).toHaveAttribute("aria-valuenow", initial!);
});

test("proof guide steps manually, teaches and returns to its diagram", async ({
  page,
}) => {
  await page.goto("./");
  const trigger = page.getByRole("button", {
    name: "証明をたどる →",
    exact: true,
  });
  await trigger.click();
  await expect(
    page.getByRole("dialog", { name: "証明をたどる", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "再生", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "前へ", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await expect(page.locator(".proof-guide-progress")).toContainText("STEP 2");
  await page.getByRole("button", { name: "前へ", exact: true }).click();
  await expect(page.locator(".proof-guide-progress")).toContainText("STEP 1");
  await page.getByText("条件と結論のつながり", { exact: true }).click();
  await page
    .getByRole("button", { name: "忠実で同変な表象を追加する", exact: true })
    .click();
  await expect(page.locator(".proof-guide-note")).toContainText(
    "M を追加していません",
  );
  await page.getByText("理解を確かめる · 5問", { exact: true }).click();
  await page.getByRole("button", { name: "一つの層", exact: true }).click();
  await expect(page.locator(".proof-guide-answer")).toContainText("もう一度");
  await page.getByRole("button", { name: "逆極限", exact: true }).click();
  await expect(page.locator(".proof-guide-answer")).toContainText("そのとおり");
  await page.getByRole("button", { name: "次の問", exact: true }).click();
  await expect(page.locator(".proof-guide-counter")).toContainText("問 2");
  await page.getByRole("button", { name: "図で確かめる", exact: true }).click();
  await expect(page.getByRole("tab", { name: /自分を表す/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page
    .getByRole("button", { name: "数式・いま何が言える？", exact: true })
    .click();
  await page
    .getByRole("button", { name: "証明の段階をたどる →", exact: true })
    .click();
  await expect
    .poll(() => page.locator(".sheet").evaluate((node) => node.scrollTop))
    .toBe(0);
});

test("touch and pointer editing, pause on reading, accessible compact layout", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  const point = page.getByRole("slider", { name: "層0の実点", exact: true });
  await point.scrollIntoViewIfNeeded();
  const before = await point.getAttribute("aria-valuenow");
  const box = await point.boundingBox();
  if (!box) throw new Error("Missing point");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 35, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  expect(await point.getAttribute("aria-valuenow")).not.toEqual(before);
  if (testInfo.project.name === "mobile") {
    const track = page.locator(".il-drag-track").first();
    const bounds = await track.boundingBox();
    if (!bounds) throw new Error("Missing touch target");
    await page.touchscreen.tap(
      bounds.x + bounds.width * 0.8,
      bounds.y + bounds.height / 2,
    );
    expect(
      await page
        .getByRole("slider", { name: "層0の実点", exact: true })
        .getAttribute("aria-valuenow"),
    ).not.toEqual(before);
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThan(testInfo.project.name === "mobile" ? 1200 : 1300);
  for (const chapter of ["つなぐ", "落ち着く", "自分を表す", "履歴を変える"]) {
    await page.getByRole("tab", { name: new RegExp(chapter) }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/${testInfo.project.name}-${chapter}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("tab", { name: /落ち着く/ }).click();
  await chooseFirstThread(page);
  await page.getByRole("button", { name: "反復を再生" }).click();
  await expect(page.getByTestId("iteration")).not.toHaveText("n = 0");
  await page.getByRole("button", { name: "距離グラフ", exact: true }).click();
  const count = await page.getByTestId("iteration").textContent();
  await page.waitForTimeout(750);
  await expect(page.getByTestId("iteration")).toHaveText(count!);
  await close(page);
  await page.goto("./#about");
  await expect(page.getByRole("dialog")).toBeVisible();
  await close(page);
  expect(await page.evaluate(() => location.hash)).toBe("");
  expect(errors).toEqual([]);
});
