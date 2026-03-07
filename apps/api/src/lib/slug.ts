import { eq } from "drizzle-orm";
import { workspaces } from "@godinez/db";
import { db } from "../db";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let attempt = 0;

  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, candidate),
    });
    if (!existing) return candidate;
    attempt++;
  }
}
