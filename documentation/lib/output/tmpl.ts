import { readFileSync } from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

export function render(templateName, options) {
  // TODO: add cache for templates and read files async
  const template = readFileSync(
    path.join(__dirname, `/templates/${templateName}.md`),
    {
      encoding: 'utf8',
    },
  );

  return ejs.render(template, options);
}
