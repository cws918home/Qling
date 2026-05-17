import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const registryPath = path.join(root, "screen-registry.json");
const allowedStatuses = new Set(["matched", "missing-png", "ambiguous"]);
const allowedReadiness = new Set(["ready", "missing-reference-png", "reference-only"]);
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function exists(relativePath) {
  try {
    await stat(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function listPngs(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  try {
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
      .map((entry) => path.posix.join(relativeDir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function readPngDimensions(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const buffer = await readFile(absolutePath);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  if (buffer.length < 24 || !signature.every((byte, index) => buffer[index] === byte)) {
    throw new Error(`Invalid PNG signature: ${relativePath}`);
  }

  if (buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`Missing PNG IHDR chunk: ${relativePath}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

let registry;

try {
  registry = JSON.parse(await readFile(registryPath, "utf8"));
} catch (error) {
  fail(`screen-registry.json is not valid JSON: ${error.message}`);
}

if (registry) {
  if (registry.version === undefined) {
    fail("screen-registry.json version must exist");
  }

  if (!registry.sourceOfTruthPolicy) {
    fail("screen-registry.json sourceOfTruthPolicy must exist");
  }

  if (registry.canvas?.width !== 393) {
    fail(`screen-registry.json canvas.width must be 393, got ${registry.canvas?.width}`);
  }

  if (registry.canvas?.height !== 852) {
    fail(`screen-registry.json canvas.height must be 852, got ${registry.canvas?.height}`);
  }

  const screens = Array.isArray(registry.screens) ? registry.screens : [];
  const extraReferences = Array.isArray(registry.extraReferences) ? registry.extraReferences : [];

  if (!Array.isArray(registry.screens)) {
    fail("screen-registry.json screens must be an array");
  }

  if (!Array.isArray(registry.extraReferences)) {
    fail("screen-registry.json extraReferences must be an array");
  }

  const screenIds = new Set();
  const orders = new Set();
  const referencedPngs = new Set();
  const duplicatePngs = new Set();

  for (const screen of screens) {
    const label = screen?.id ?? "(missing id)";

    if (screenIds.has(screen.id)) {
      fail(`Duplicate screen id: ${screen.id}`);
    }
    screenIds.add(screen.id);

    if (orders.has(screen.order)) {
      fail(`Duplicate screen order ${screen.order} at screen ${label}`);
    }
    orders.add(screen.order);

    if (!allowedStatuses.has(screen.matchStatus)) {
      fail(`Screen ${label} has invalid matchStatus: ${screen.matchStatus}`);
    }

    if (screen.referencePriority !== "png-first") {
      fail(`Screen ${label} referencePriority must be png-first`);
    }

    if (!allowedReadiness.has(screen.comparisonReadiness)) {
      fail(`Screen ${label} has invalid comparisonReadiness: ${screen.comparisonReadiness}`);
    }

    if (!Object.hasOwn(screen, "currentAppMapping")) {
      fail(`Screen ${label} currentAppMapping must exist`);
    }

    if (!Object.hasOwn(screen, "pixelPerfectNotes") || typeof screen.pixelPerfectNotes !== "string") {
      fail(`Screen ${label} pixelPerfectNotes must exist`);
    }

    if (!(await exists(screen.sourceFolder))) {
      fail(`Screen ${label} sourceFolder does not exist: ${screen.sourceFolder}`);
    }

    if (!(await exists(screen.componentPath))) {
      fail(`Screen ${label} componentPath does not exist: ${screen.componentPath}`);
    }

    if (screen.matchStatus === "missing-png" && screen.referencePng !== null) {
      fail(`Screen ${label} is missing-png but referencePng is not null`);
    }

    if (screen.referencePng !== null) {
      if (screen.referencePngDimensions === null || typeof screen.referencePngDimensions !== "object") {
        fail(`Screen ${label} has referencePng but referencePngDimensions is null or invalid`);
      }

      if (!(await exists(screen.referencePng))) {
        fail(`Screen ${label} referencePng does not exist: ${screen.referencePng}`);
      } else {
        try {
          const dimensions = await readPngDimensions(screen.referencePng);
          if (
            screen.referencePngDimensions?.width !== dimensions.width ||
            screen.referencePngDimensions?.height !== dimensions.height
          ) {
            fail(
              `Screen ${label} referencePngDimensions ${JSON.stringify(screen.referencePngDimensions)} does not match actual PNG ${dimensions.width}x${dimensions.height}: ${screen.referencePng}`
            );
          }

          if (dimensions.width !== registry.canvas.width || dimensions.height !== registry.canvas.height) {
            warn(
              `Screen ${label} PNG dimension ${dimensions.width}x${dimensions.height} differs from canvas ${registry.canvas.width}x${registry.canvas.height}: ${screen.referencePng}`
            );
          }
        } catch (error) {
          fail(`Screen ${label} PNG dimension read failed: ${error.message}`);
        }
      }

      if (referencedPngs.has(screen.referencePng)) {
        duplicatePngs.add(screen.referencePng);
      }
      referencedPngs.add(screen.referencePng);
    } else if (screen.referencePngDimensions !== null) {
      fail(`Screen ${label} has null referencePng but referencePngDimensions is not null`);
    }

    if (screen.id === "loading") {
      if (screen.matchStatus !== "missing-png") {
        fail("Screen loading must have matchStatus missing-png");
      }

      if (screen.comparisonReadiness !== "missing-reference-png") {
        fail("Screen loading must have comparisonReadiness missing-reference-png");
      }

      if (screen.referencePng !== null) {
        fail("Screen loading must have referencePng null");
      }

      if (screen.referencePngDimensions !== null) {
        fail("Screen loading must have referencePngDimensions null");
      }
    }
  }

  for (const pngPath of duplicatePngs) {
    fail(`Duplicate referencePng reference: ${pngPath}`);
  }

  const screenPngs = await listPngs("pngs/screens");
  for (const pngPath of screenPngs) {
    if (!referencedPngs.has(pngPath)) {
      fail(`pngs/screens PNG is not referenced by screens registry: ${pngPath}`);
    }
  }

  const extraPaths = new Set(extraReferences.map((reference) => reference.path));
  const extraPngs = await listPngs("pngs/extra");
  for (const pngPath of extraPngs) {
    if (!extraPaths.has(pngPath)) {
      fail(`pngs/extra PNG is not referenced by extraReferences: ${pngPath}`);
    }
  }

  for (const reference of extraReferences) {
    if (!(await exists(reference.path))) {
      fail(`Extra reference ${reference.id ?? "(missing id)"} path does not exist: ${reference.path}`);
    }
  }
}

const filesToScan = [
  "README.md",
  "CODEX_USAGE.md",
  "screen-registry.json",
  "screen-registry.md",
  "package.json"
];

for (const file of filesToScan) {
  if (!(await exists(file))) {
    continue;
  }

  const text = await readFile(path.join(root, file), "utf8");
  const pathLikeReference = /(?:^|[\s"`'([{])(?:\.{1,2}\/|[A-Za-z0-9_-]+\/)[^\s"`')\]}]*wire_frame\.css\b/m;
  if (pathLikeReference.test(text)) {
    fail(`${file} contains a path-like reference to deleted wire_frame.css`);
  }
}

if (errors.length > 0) {
  console.error("Reference validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

for (const warning of warnings) {
  console.warn(`Reference validation warning: ${warning}`);
}

console.log("Reference validation passed.");
