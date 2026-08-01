import { readFileSync } from "fs";
import path from "path";
import Handlebars from "handlebars";

const templateCache = new Map<string, Handlebars.TemplateDelegate>();

function loadTemplate(name: string): Handlebars.TemplateDelegate {
  const cached = templateCache.get(name);
  if (cached) return cached;

  const filePath = path.join(process.cwd(), "emails", `${name}.hbs`);
  const source = readFileSync(filePath, "utf8");
  const compiled = Handlebars.compile(source);
  templateCache.set(name, compiled);
  return compiled;
}

export function renderEmailTemplate<T extends Record<string, unknown>>(
  name: string,
  data: T,
): string {
  return loadTemplate(name)(data);
}
