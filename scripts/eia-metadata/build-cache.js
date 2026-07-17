import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  access,
  mkdir,
  rename,
  stat,
  writeFile
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { finished } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";
import { fileURLToPath } from "node:url";

import { loadPhase1aFixtures, loadPhase4aDomesticFixtures } from "./discover-routes.js";
import {
  isElectricityPlantSeries,
  normalizeBulkSeries,
  normalizePlantDirectoryEntry,
  normalizeRouteFixture,
  parseElectricityPlantDirectorySource,
  sha256,
  shouldIncludeBulkSeries,
  stableStringify
} from "./normalize.js";
import {
  validateManifest,
  validatePlantDirectoryRecord,
  validateRouteRecord,
  validateSeriesRecord
} from "./validate-build.js";

const BUILD_VERSION = "phase1b";
const API_VERSION = "2.1.13";
const GITHUB_FILE_LIMIT = 100 * 1024 * 1024;
const PLANT_DIRECTORY_OUTPUT = "plants.jsonl.gz";

export const BULK_BUILD_SOURCES = Object.freeze([
  {
    archive: "ELEC.zip",
    family: "domestic",
    output: "domestic.jsonl.gz",
    buildPlantDirectory: true,
    sourceUrl: "https://www.eia.gov/opendata/bulk/ELEC.zip"
  },
  {
    archive: "NG.zip",
    family: "domestic",
    output: "natural-gas.jsonl.gz",
    buildPlantDirectory: false,
    sourceUrl: "https://www.eia.gov/opendata/bulk/NG.zip"
  },
  {
    archive: "INTL.zip",
    family: "international",
    output: "international.jsonl.gz",
    sourceUrl: "https://www.eia.gov/opendata/bulk/INTL.zip"
  },
  {
    archive: "SEDS.zip",
    family: "seds",
    output: "seds.jsonl.gz",
    sourceUrl: "https://www.eia.gov/opendata/bulk/SEDS.zip"
  }
]);

export async function buildPhase1bCache({ bulkDir, outputDir, checkedAt = new Date().toISOString() }) {
  const resolvedBulkDir = resolve(bulkDir);
  const resolvedOutputDir = resolve(outputDir);
  const stageDir = join(dirname(resolvedOutputDir), `.${basename(resolvedOutputDir)}.build-${randomUUID()}`);
  await mkdir(stageDir, { recursive: true });

  const artifacts = [];
  for (const source of BULK_BUILD_SOURCES) {
    const archivePath = join(resolvedBulkDir, source.archive);
    await access(archivePath);
    artifacts.push(await buildFamilyArtifact({ ...source, archivePath, stageDir }));
  }
  const plantArtifact = artifacts.find(artifact => artifact.plant_directory)?.plant_directory;
  if (!plantArtifact) throw new Error("Domestic build did not produce the plant directory.");
  const seriesArtifacts = artifacts.map(({ plant_directory: ignored, ...artifact }) => artifact);

  const routeEntries = [...await loadPhase1aFixtures(), ...await loadPhase4aDomesticFixtures()];
  const routes = routeEntries.map(entry => normalizeRouteFixture(entry.fixture));
  const routeErrors = routes.flatMap(record => validateRouteRecord(record).map(error => `${record.route}: ${error}`));
  if (routeErrors.length) throw new Error(`Route validation failed:\n${routeErrors.join("\n")}`);

  const routesJson = `${JSON.stringify(routes, null, 2)}\n`;
  await writeFile(join(stageDir, "routes.json"), routesJson, "utf8");
  const routesHash = sha256(routesJson);
  const counts = { domestic: 0, international: 0, seds: 0 };
  for (const artifact of seriesArtifacts) counts[artifact.family] = (counts[artifact.family] || 0) + artifact.records;
  counts.total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const contentHash = sha256(stableStringify({
    artifacts: seriesArtifacts.map(artifact => ({ family: artifact.family, content_hash: artifact.content_hash })),
    plant_directory_hash: plantArtifact.content_hash,
    routes_hash: routesHash
  }));

  const manifest = {
    schema_version: "1.0.0",
    source: "EIA",
    api_version: API_VERSION,
    checked_at: checkedAt,
    content_updated_at: checkedAt,
    content_hash: contentHash,
    routes_checked: routes.map(route => route.route),
    routes_succeeded: routes.map(route => route.route),
    routes_failed: [],
    refresh_status: "partial",
    record_counts: counts,
    directory_counts: { plants: plantArtifact.records },
    change_counts: { added: counts.total, removed: 0, changed: 0 },
    diff_summary: {
      routes: routes.length,
      facets: seriesArtifacts.reduce((sum, artifact) => sum + artifact.facets, 0),
      measures: seriesArtifacts.reduce((sum, artifact) => sum + artifact.measures, 0),
      frequencies: seriesArtifacts.reduce((sum, artifact) => sum + artifact.frequencies, 0),
      units: seriesArtifacts.reduce((sum, artifact) => sum + artifact.units, 0),
      geographies: seriesArtifacts.reduce((sum, artifact) => sum + artifact.geographies, 0),
      coverage: seriesArtifacts.length
    },
    rollback_snapshot_reference: null,
    update_schedule_state: "not_configured",
    warnings: [
      "Phase 1B staging cache only; it is not active production metadata.",
      "Domestic coverage includes Electricity and Natural Gas; other Domestic product families remain outside this partial cache.",
      "Full ELEC.PLANT series are replaced by a compact plant directory for later on-demand lookup.",
      "International dataFlagId is treated as an observation annotation, not candidate identity.",
      "Artifacts are gzip-compressed because uncompressed normalized files are not GitHub-safe."
    ],
    errors: [],
    build_version: BUILD_VERSION
  };
  const manifestErrors = validateManifest(manifest);
  if (manifestErrors.length) throw new Error(`Manifest validation failed:\n${manifestErrors.join("\n")}`);

  const validationArtifacts = [];
  for (const artifact of seriesArtifacts) {
    const validation = await validateCompressedArtifact(join(stageDir, artifact.output));
    if (validation.errors.length) {
      throw new Error(`${artifact.output} validation failed:\n${validation.errors.join("\n")}`);
    }
    if (validation.records !== artifact.records || validation.content_hash !== artifact.content_hash) {
      throw new Error(`${artifact.output} changed between build and validation.`);
    }
    validationArtifacts.push({ ...artifact, ...validation });
  }

  const plantValidation = await validateCompressedPlantDirectory(join(stageDir, plantArtifact.output));
  if (plantValidation.errors.length) {
    throw new Error(`${plantArtifact.output} validation failed:\n${plantValidation.errors.join("\n")}`);
  }
  if (
    plantValidation.records !== plantArtifact.records ||
    plantValidation.source_records !== plantArtifact.source_records ||
    plantValidation.content_hash !== plantArtifact.content_hash
  ) {
    throw new Error(`${plantArtifact.output} changed between build and validation.`);
  }
  const validatedPlantArtifact = { ...plantArtifact, ...plantValidation };

  await writeFile(join(stageDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const validationReport = {
    phase: "1B",
    valid: true,
    checked_at: checkedAt,
    production_activated: false,
    scope: {
      domestic: "Electricity and Natural Gas bulk series plus a compact plant directory; full ELEC.PLANT series are on-demand only",
      international: "All INTL bulk series",
      seds: "All SEDS bulk series",
      comprehensive_domestic: false
    },
    artifacts: validationArtifacts,
    directories: [validatedPlantArtifact],
    totals: {
      records: counts.total,
      excluded_records: seriesArtifacts.reduce((sum, artifact) => sum + artifact.excluded_records, 0),
      directory_records: plantArtifact.records,
      compressed_bytes: validationArtifacts.reduce((sum, artifact) => sum + artifact.compressed_bytes, 0) +
        validatedPlantArtifact.compressed_bytes
    },
    errors: []
  };
  await writeFile(
    join(stageDir, "validation-report.json"),
    `${JSON.stringify(validationReport, null, 2)}\n`,
    "utf8"
  );

  const rollbackPath = await activateBuildDirectory(stageDir, resolvedOutputDir);
  return { outputDir: resolvedOutputDir, rollbackPath, manifest, validationReport };
}

export async function buildFamilyArtifact({ archivePath, family, output, sourceUrl, stageDir, buildPlantDirectory = false }) {
  const outputPath = join(stageDir, output);
  const archiveProcess = spawn("tar", ["-xOf", archivePath], { stdio: ["ignore", "pipe", "pipe"] });
  const closePromise = once(archiveProcess, "close");
  let stderr = "";
  archiveProcess.stderr.setEncoding("utf8");
  archiveProcess.stderr.on("data", chunk => { stderr += chunk; });

  const gzip = createGzip({ level: 9 });
  const outputStream = createWriteStream(outputPath, { flags: "wx" });
  gzip.pipe(outputStream);
  const lines = createInterface({ input: archiveProcess.stdout, crlfDelay: Infinity });
  const contentHash = createHash("sha256");
  const candidateIds = new Set();
  const seriesIds = new Set();
  const facets = new Set();
  const measures = new Set();
  const frequencies = new Set();
  const units = new Set();
  const geographies = new Set();
  const plantDirectory = buildPlantDirectory ? new Map() : null;
  let missingGeographies = 0;
  let records = 0;
  let excludedRecords = 0;

  try {
    for await (const line of lines) {
      if (!line.startsWith('{"series_id"')) continue;
      const metadataEnd = line.lastIndexOf(',"data":[');
      if (metadataEnd < 0) throw new Error(`${family} bulk series is missing its data boundary.`);
      const metadata = JSON.parse(`${line.slice(0, metadataEnd)}}`);
      if (!shouldIncludeBulkSeries(metadata, family)) {
        if (plantDirectory && isElectricityPlantSeries(metadata)) {
          addPlantDirectorySource(plantDirectory, metadata);
        }
        excludedRecords += 1;
        continue;
      }

      const record = normalizeBulkSeries(metadata, { routeFamily: family, sourceUrl });
      const errors = validateSeriesRecord(record);
      if (errors.length) throw new Error(`${record.series_id}: ${errors.join("; ")}`);
      if (candidateIds.has(record.candidate_id)) throw new Error(`Duplicate candidate ID: ${record.candidate_id}`);
      if (seriesIds.has(record.series_id)) throw new Error(`Duplicate series ID: ${record.series_id}`);
      candidateIds.add(record.candidate_id);
      seriesIds.add(record.series_id);

      Object.keys(record.selector.facets).forEach(value => facets.add(value));
      measures.add(record.selector.measure);
      frequencies.add(record.frequency);
      if (record.unit) units.add(record.unit);
      if (record.geography?.code) geographies.add(record.geography.code);
      else missingGeographies += 1;

      const serialized = `${JSON.stringify(record)}\n`;
      contentHash.update(serialized);
      if (!gzip.write(serialized)) await once(gzip, "drain");
      records += 1;
    }

    const [exitCode] = await closePromise;
    if (exitCode !== 0) throw new Error(`tar exited with ${exitCode}: ${stderr.trim()}`);
    gzip.end();
    await finished(outputStream);
  } catch (error) {
    archiveProcess.kill();
    gzip.destroy();
    outputStream.destroy();
    throw error;
  }

  const outputStat = await stat(outputPath);
  if (outputStat.size >= GITHUB_FILE_LIMIT) {
    throw new Error(`${output} is ${outputStat.size} bytes and exceeds the GitHub file limit.`);
  }

  const plantDirectoryArtifact = plantDirectory
    ? await writePlantDirectoryArtifact(plantDirectory, stageDir)
    : null;

  return {
    family,
    output,
    source_url: sourceUrl,
    records,
    excluded_records: excludedRecords,
    content_hash: contentHash.digest("hex"),
    compressed_bytes: outputStat.size,
    facets: facets.size,
    measures: measures.size,
    frequencies: frequencies.size,
    units: units.size,
    geographies: geographies.size,
    missing_geographies: missingGeographies,
    ...(plantDirectoryArtifact ? { plant_directory: plantDirectoryArtifact } : {})
  };
}

async function writePlantDirectoryArtifact(directory, stageDir) {
  const outputPath = join(stageDir, PLANT_DIRECTORY_OUTPUT);
  const gzip = createGzip({ level: 9 });
  const outputStream = createWriteStream(outputPath, { flags: "wx" });
  gzip.pipe(outputStream);
  const contentHash = createHash("sha256");
  let sourceRecords = 0;
  let missingStates = 0;
  let missingCoordinates = 0;

  for (const accumulator of [...directory.values()].sort(comparePlantIds)) {
    const name = selectDominantValue(accumulator.names);
    const stateCode = selectDominantValue(accumulator.states);
    const coordinates = selectDominantValue(accumulator.coordinates);
    const record = normalizePlantDirectoryEntry({
      plant_id: accumulator.plant_id,
      name,
      aliases: [...accumulator.names.keys()].filter(value => value !== name),
      state_code: stateCode,
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      series_count: accumulator.series_count
    });
    const errors = validatePlantDirectoryRecord(record);
    if (errors.length) throw new Error(`Plant ${record.plant_id}: ${errors.join("; ")}`);
    if (!record.state_code) missingStates += 1;
    if (record.latitude == null || record.longitude == null) missingCoordinates += 1;
    sourceRecords += record.series_count;
    const serialized = `${JSON.stringify(record)}\n`;
    contentHash.update(serialized);
    if (!gzip.write(serialized)) await once(gzip, "drain");
  }

  gzip.end();
  await finished(outputStream);
  const outputStat = await stat(outputPath);
  return {
    family: "plant_directory",
    output: PLANT_DIRECTORY_OUTPUT,
    source_url: "https://www.eia.gov/opendata/bulk/ELEC.zip",
    records: directory.size,
    source_records: sourceRecords,
    content_hash: contentHash.digest("hex"),
    compressed_bytes: outputStat.size,
    missing_states: missingStates,
    missing_coordinates: missingCoordinates,
    lookup_mode: "official_eia_api_v2_on_demand"
  };
}

function addPlantDirectorySource(directory, record) {
  const source = parseElectricityPlantDirectorySource(record);
  let accumulator = directory.get(source.plant_id);
  if (!accumulator) {
    accumulator = {
      plant_id: source.plant_id,
      names: new Map(),
      states: new Map(),
      coordinates: new Map(),
      series_count: 0
    };
    directory.set(source.plant_id, accumulator);
  }

  incrementCount(accumulator.names, source.name, source.name);
  if (source.state_code) incrementCount(accumulator.states, source.state_code, source.state_code);
  if (source.latitude != null && source.longitude != null) {
    const key = `${source.latitude},${source.longitude}`;
    incrementCount(accumulator.coordinates, key, {
      latitude: source.latitude,
      longitude: source.longitude
    });
  }
  accumulator.series_count += 1;
}

function incrementCount(values, key, value) {
  const current = values.get(key);
  values.set(key, { value, count: (current?.count || 0) + 1 });
}

function selectDominantValue(values) {
  if (!values?.size) return null;
  return [...values.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))[0][1].value;
}

function comparePlantIds(left, right) {
  return Number(left.plant_id) - Number(right.plant_id) || left.plant_id.localeCompare(right.plant_id);
}

export async function validateCompressedArtifact(path) {
  const input = createReadStream(path).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  const hash = createHash("sha256");
  const candidateIds = new Set();
  const seriesIds = new Set();
  const errors = [];
  let records = 0;

  for await (const line of lines) {
    if (!line) continue;
    hash.update(`${line}\n`);
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      errors.push(`Line ${records + 1} is not valid JSON.`);
      continue;
    }
    for (const error of validateSeriesRecord(record)) {
      if (errors.length < 20) errors.push(`Line ${records + 1}: ${error}`);
    }
    if (candidateIds.has(record.candidate_id) && errors.length < 20) errors.push(`Duplicate candidate ID at line ${records + 1}.`);
    if (seriesIds.has(record.series_id) && errors.length < 20) errors.push(`Duplicate series ID at line ${records + 1}.`);
    candidateIds.add(record.candidate_id);
    seriesIds.add(record.series_id);
    records += 1;
  }

  return {
    records,
    content_hash: hash.digest("hex"),
    compressed_bytes: (await stat(path)).size,
    errors
  };
}

export async function validateCompressedPlantDirectory(path) {
  const input = createReadStream(path).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  const hash = createHash("sha256");
  const plantIds = new Set();
  const errors = [];
  let records = 0;
  let sourceRecords = 0;

  for await (const line of lines) {
    if (!line) continue;
    hash.update(`${line}\n`);
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      errors.push(`Line ${records + 1} is not valid JSON.`);
      continue;
    }
    for (const error of validatePlantDirectoryRecord(record)) {
      if (errors.length < 20) errors.push(`Line ${records + 1}: ${error}`);
    }
    if (plantIds.has(record.plant_id) && errors.length < 20) {
      errors.push(`Duplicate plant ID at line ${records + 1}.`);
    }
    plantIds.add(record.plant_id);
    sourceRecords += Number(record.series_count || 0);
    records += 1;
  }

  return {
    records,
    source_records: sourceRecords,
    content_hash: hash.digest("hex"),
    compressed_bytes: (await stat(path)).size,
    errors
  };
}

export async function activateBuildDirectory(stageDir, outputDir, { afterBackup } = {}) {
  await mkdir(dirname(outputDir), { recursive: true });
  const exists = await pathExists(outputDir);
  const rollbackPath = exists
    ? join(dirname(outputDir), `.${basename(outputDir)}.rollback-${Date.now()}-${randomUUID()}`)
    : null;

  if (rollbackPath) await rename(outputDir, rollbackPath);
  try {
    if (afterBackup) await afterBackup();
    await rename(stageDir, outputDir);
    return rollbackPath;
  } catch (error) {
    if (rollbackPath && !(await pathExists(outputDir))) await rename(rollbackPath, outputDir);
    throw error;
  }
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith("--") || !value) throw new Error("Arguments must use --name value pairs.");
    options[name.slice(2)] = value;
  }
  return options;
}

if (isMainModule()) {
  const options = parseArguments(process.argv.slice(2));
  const result = await buildPhase1bCache({
    bulkDir: options["bulk-dir"] || ".tmp/eia-phase1b",
    outputDir: options["output-dir"] || "data/eia/builds/phase1b"
  });
  process.stdout.write(`${JSON.stringify({
    output_dir: result.outputDir,
    rollback_path: result.rollbackPath,
    record_counts: result.manifest.record_counts,
    refresh_status: result.manifest.refresh_status,
    production_activated: result.validationReport.production_activated,
    compressed_bytes: result.validationReport.totals.compressed_bytes
  }, null, 2)}\n`);
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}
