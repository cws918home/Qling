import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const mapPath = 'design/reference/screen-map.json';
const errors = [];

function fail(message) {
  errors.push(message);
}

function pathExists(pathValue, context) {
  if (pathValue === null || pathValue === undefined) return;
  if (typeof pathValue !== 'string' || pathValue.trim() === '') {
    fail(`${context} must be a non-empty string when present.`);
    return;
  }
  if (pathValue.includes('*')) return;
  if (!existsSync(resolve(root, pathValue))) {
    fail(`${context} points to a missing path: ${pathValue}`);
  }
}

let parsed;
try {
  parsed = JSON.parse(readFileSync(resolve(root, mapPath), 'utf8'));
} catch (error) {
  fail(`${mapPath} is not valid JSON: ${error.message}`);
}

if (parsed) {
  if (!Array.isArray(parsed.screens) || parsed.screens.length === 0) {
    fail(`${mapPath} must contain a non-empty screens array.`);
  } else {
    for (const [index, screen] of parsed.screens.entries()) {
      const label = screen?.slug ?? `screens[${index}]`;

      if (!screen || typeof screen !== 'object') {
        fail(`screens[${index}] must be an object.`);
        continue;
      }

      if (typeof screen.slug !== 'string' || screen.slug.trim() === '') {
        fail(`screens[${index}].slug must be a non-empty string.`);
      }

      pathExists(screen.reference?.notes, `${label}.reference.notes`);

      if (!Array.isArray(screen.reference?.screenshots)) {
        fail(`${label}.reference.screenshots must be an array.`);
      } else {
        screen.reference.screenshots.forEach((pathValue, pathIndex) => {
          pathExists(pathValue, `${label}.reference.screenshots[${pathIndex}]`);
        });
      }

      if (!Array.isArray(screen.reference?.css)) {
        fail(`${label}.reference.css must be an array.`);
      } else {
        screen.reference.css.forEach((pathValue, pathIndex) => {
          pathExists(pathValue, `${label}.reference.css[${pathIndex}]`);
        });
      }

      for (const field of ['screen', 'container', 'contract', 'mapping']) {
        pathExists(screen.production?.[field], `${label}.production.${field}`);
      }

      if (!Array.isArray(screen.sharedDependencies) || screen.sharedDependencies.length === 0) {
        fail(`${label}.sharedDependencies must be a non-empty array.`);
      } else {
        screen.sharedDependencies.forEach((pathValue, pathIndex) => {
          pathExists(pathValue, `${label}.sharedDependencies[${pathIndex}]`);
        });
      }

      if (!Array.isArray(screen.allowedEditScope) || screen.allowedEditScope.length === 0) {
        fail(`${label}.allowedEditScope must be a non-empty array.`);
      } else {
        screen.allowedEditScope.forEach((pathValue, pathIndex) => {
          pathExists(pathValue, `${label}.allowedEditScope[${pathIndex}]`);
        });
      }

      if (!Array.isArray(screen.mustNotEditForPixelWork) || screen.mustNotEditForPixelWork.length === 0) {
        fail(`${label}.mustNotEditForPixelWork must be a non-empty array.`);
      }

      if (!Array.isArray(screen.statesToCheck) || screen.statesToCheck.length === 0) {
        fail(`${label}.statesToCheck must contain at least one state.`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Design reference validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Design reference validation passed for ${parsed.screens.length} screen mappings.`);
