import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../../src/database/knex";
import { CategoryRepository } from "../../../src/database/repositories/category.repository";
import { cleanDatabase } from "../../helpers/database";

describe("CategoryRepository", () => {
  const repository = new CategoryRepository(db);

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it("should create a root category", async () => {
    const category = await repository.create({
      name: "Beauté",
      slug: "beaute",
    });

    expect(category).toBeDefined();
    expect(category.name).toBe("Beauté");
    expect(category.slug).toBe("beaute");
    expect(category.parent_id).toBeNull();
    expect(category.status).toBe("active");
  });

  it("should create a child category", async () => {
    const parent = await repository.create({
      name: "Beauté",
      slug: "beaute",
    });

    const child = await repository.create({
      parent_id: parent.id,
      name: "Cheveux",
      slug: "cheveux",
    });

    expect(child.parent_id).toBe(parent.id);
    expect(child.name).toBe("Cheveux");
  });

  it("should find a category by id", async () => {
    const created = await repository.create({
      name: "Mode",
      slug: "mode",
    });

    const category = await repository.findById(created.id);

    expect(category).toBeDefined();
    expect(category?.id).toBe(created.id);
  });

  it("should find a category by slug", async () => {
    await repository.create({
      name: "Cosmétiques",
      slug: "cosmetiques",
    });

    const category = await repository.findBySlug("cosmetiques");

    expect(category).toBeDefined();
    expect(category?.name).toBe("Cosmétiques");
  });

  it("should find child categories", async () => {
    const parent = await repository.create({
      name: "Beauté",
      slug: "beaute",
    });

    await repository.create({
      parent_id: parent.id,
      name: "Cheveux",
      slug: "cheveux",
    });

    await repository.create({
      parent_id: parent.id,
      name: "Soins",
      slug: "soins",
    });

    const children = await repository.findChildren(parent.id);

    expect(children).toHaveLength(2);
    expect(children.map((category) => category.slug)).toEqual([
      "cheveux",
      "soins",
    ]);
  });

  it("should find root categories", async () => {
    const root = await repository.create({
      name: "Beauté",
      slug: "beaute",
    });

    await repository.create({
      parent_id: root.id,
      name: "Cheveux",
      slug: "cheveux",
    });

    await repository.create({
      name: "Mode",
      slug: "mode",
    });

    const roots = await repository.findRootCategories();

    expect(roots).toHaveLength(2);
    expect(roots.map((category) => category.slug)).toEqual([
      "beaute",
      "mode",
    ]);
  });

  it("should update a category", async () => {
    const category = await repository.create({
      name: "Ancien nom",
      slug: "ancien-nom",
    });

    const updated = await repository.update(category.id, {
      name: "Nouveau nom",
      slug: "nouveau-nom",
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe("Nouveau nom");
    expect(updated?.slug).toBe("nouveau-nom");
  });

  it("should reject duplicate slugs", async () => {
    await repository.create({
      name: "Beauté",
      slug: "beaute",
    });

    await expect(
      repository.create({
        name: "Beauté 2",
        slug: "beaute",
      }),
    ).rejects.toThrow();
  });

  it("should reject a category as its own parent", async () => {
    const category = await repository.create({
      name: "Beauté",
      slug: "beaute",
    });

    await expect(
      repository.update(category.id, {
        parent_id: category.id,
      }),
    ).rejects.toThrow();
  });

  it("should reject deleting a parent category with children", async () => {
    const parent = await repository.create({
      name: "Beauté",
      slug: "beaute",
    });

    await repository.create({
      parent_id: parent.id,
      name: "Cheveux",
      slug: "cheveux",
    });

    await expect(
      db("categories").where({ id: parent.id }).del(),
    ).rejects.toThrow();
  });
});
