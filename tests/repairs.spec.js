import { expect, test } from "@playwright/test";

const STORAGE_KEY = "zfl-14-repairs";

// 每个用例都从空的本地数据开始，避免默认示例数据干扰断言
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ filter: "all", tagFilter: "all", repairs: [] }));
  }, STORAGE_KEY);
  await page.reload();
});

async function addRepair(page, { location, title, tags }) {
  await page.locator('input[name="location"]').fill(location);
  await page.locator('textarea[name="title"]').fill(title);
  if (tags !== undefined) await page.locator('input[name="tags"]').fill(tags);
  await page.locator('#repair-form button[type="submit"]').click();
}

function storedState(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
}

test("新增事项保存标签，逗号分隔解析并展示在列表中", async ({ page }) => {
  await addRepair(page, { location: "卫生间", title: "花洒出水忽冷忽热", tags: "水电, 急修，卫浴" });

  const card = page.locator(".repair", { hasText: "花洒出水忽冷忽热" });
  await expect(card.locator(".tag-chip")).toHaveText(["水电", "急修", "卫浴"]);

  const state = await storedState(page);
  expect(state.repairs[0].tags).toEqual(["水电", "急修", "卫浴"]);
});

test("按标签筛选列表，可切回查看全部", async ({ page }) => {
  await addRepair(page, { location: "厨房", title: "水龙头滴水", tags: "水电" });
  await addRepair(page, { location: "卧室", title: "衣柜门合页松动", tags: "家具" });

  await page.locator('[data-tag-filter="家具"]').click();
  await expect(page.locator(".repair")).toHaveCount(1);
  await expect(page.locator(".repair")).toContainText("衣柜门合页松动");
  await expect(page.locator('[data-tag-filter="家具"]')).toHaveClass(/active/);

  await page.locator('[data-tag-filter="all"]').click();
  await expect(page.locator(".repair")).toHaveCount(2);
});

test("空标签事项正常保存，不产生标签和空筛选项", async ({ page }) => {
  await addRepair(page, { location: "阳台", title: "晾衣架摇把卡顿", tags: "  , ， " });

  const card = page.locator(".repair", { hasText: "晾衣架摇把卡顿" });
  await expect(card).toBeVisible();
  await expect(card.locator(".tag-chip")).toHaveCount(0);
  await expect(page.locator("[data-tag-filter]")).toHaveCount(0);

  const state = await storedState(page);
  expect(state.repairs[0].tags).toEqual([]);
});

test("标签和标签筛选状态刷新后保持", async ({ page }) => {
  await addRepair(page, { location: "书房", title: "插座面板松动", tags: "电路, 墙面" });
  await addRepair(page, { location: "客厅", title: "电视柜抽屉异响", tags: "家具" });

  await page.locator('[data-tag-filter="电路"]').click();
  await expect(page.locator(".repair")).toHaveCount(1);

  await page.reload();
  await expect(page.locator('[data-tag-filter="电路"]')).toHaveClass(/active/);
  await expect(page.locator(".repair")).toHaveCount(1);
  await expect(page.locator(".repair").locator(".tag-chip")).toHaveText(["电路", "墙面"]);

  const state = await storedState(page);
  expect(state.tagFilter).toBe("电路");
});

test("原有状态筛选、状态切换与删除照常可用", async ({ page }) => {
  await addRepair(page, { location: "厨房", title: "油烟机噪音大", tags: "家电" });

  await page.locator("[data-status]").selectOption("done");
  await page.locator('[data-filter="done"]').click();
  await expect(page.locator(".repair")).toHaveCount(1);

  await page.locator('[data-filter="todo"]').click();
  await expect(page.locator(".repair")).toHaveCount(0);

  await page.locator('[data-filter="done"]').click();
  await page.locator("[data-delete]").click();
  await expect(page.locator(".repair")).toHaveCount(0);

  const state = await storedState(page);
  expect(state.repairs).toHaveLength(0);
});
