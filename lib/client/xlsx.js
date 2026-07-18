import { formatCoverage, getCleanPoints } from "./formatting.js";

export function downloadSeriesWorkbook(series) {
  const objectUrl = URL.createObjectURL(buildXlsx(series));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = workbookFileName(series);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function downloadComparisonWorkbook(comparisons) {
  const objectUrl = URL.createObjectURL(buildComparisonXlsx(comparisons));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = comparisonWorkbookFileName(comparisons);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function comparisonWorkbookFileName(comparisons) {
  const countries = uniqueComparisonCountries(comparisons).map(country => country.name || country.code).filter(Boolean);
  const suffix = countries.length <= 3 ? countries.join("_") : `${countries.slice(0, 3).join("_")}_and_${countries.length - 3}_more`;
  return `${safeFileName(`EIA_Comparison_${suffix || "Countries"}`)}.xlsx`;
}

export function buildComparisonXlsx(comparisons) {
  const definitions = Array.isArray(comparisons) ? comparisons : [comparisons].filter(Boolean);
  const dataRows = [[
    "Variable rank", "Definition ID", "Series ID", "Variable name", "Country", "Country code",
    "Period", "Value", "Original value", "Units", "Original units", "Converted units", "Frequency",
    "Source", "Available coverage", "Comparability status", "Warning type", "Warning details"
  ]];
  const variableRows = [[
    "Variable rank", "Definition ID", "Variable name", "Product", "Activity", "Gross/net treatment",
    "Frequency", "Source", "Requested countries", "Available countries"
  ]];
  const comparabilityRows = [[
    "Variable rank", "Definition ID", "Country", "Country code", "Series ID", "Status", "Coverage",
    "Original units", "Converted units", "Warning type", "Warning details"
  ]];
  const warningRows = [["Variable rank", "Definition ID", "Country", "Warning type", "Warning details"]];

  for (const definition of definitions) {
    variableRows.push([
      definition.rank ?? "", definition.definitionId || "", definition.title || "",
      definition.definition?.product || "", definition.definition?.activity || "",
      definition.definition?.grossNetTreatment || "", definition.definition?.frequency || "",
      definition.definition?.source || "EIA", definition.requestedCountryCount ?? definition.countries?.length ?? 0,
      definition.availableCountryCount ?? definition.countries?.filter(country => country.series).length ?? 0
    ]);
    for (const country of definition.countries || []) {
      const series = country.series;
      const coverage = series ? formatCoverage(series.coverage) : country.coverage || "";
      const originalUnit = series?.originalUnit || series?.unit || country.unit || "";
      const convertedUnit = series?.convertedUnit || "";
      comparabilityRows.push([
        definition.rank ?? "", definition.definitionId || "", country.geography?.name || "", country.geography?.code || "",
        country.seriesId || series?.seriesId || "", country.status || "", coverage, originalUnit, convertedUnit,
        country.warningType || "", country.warning || ""
      ]);
      if (country.warning) warningRows.push([
        definition.rank ?? "", definition.definitionId || "", country.geography?.name || "",
        country.warningType || country.status || "warning", country.warning
      ]);
      const points = getCleanPoints(series?.points);
      if (points.length === 0) {
        dataRows.push(comparisonDataRow(definition, country, null, coverage, originalUnit, convertedUnit));
      } else {
        for (const point of points) {
          dataRows.push(comparisonDataRow(definition, country, point, coverage, originalUnit, convertedUnit));
        }
      }
    }
  }

  const notesRows = [
    ["Field", "Value"],
    ["Source", "U.S. Energy Information Administration"],
    ["Export type", "Multi-country variable-definition comparison"],
    ["Missing values", "Blank values are missing or unavailable; they are never replaced with zero."],
    ["Ranking", "Variable definitions are ranked once. Country availability does not change the rank."],
    ["Unit conversion", "Only deterministic allowlisted conversions are applied. Original values and units remain recorded."],
    ["Generated", new Date().toISOString()]
  ];

  return buildWorkbookBlob([
    ["All_Data", dataRows],
    ["Variables", variableRows],
    ["Comparability", comparabilityRows],
    ["Warnings", warningRows],
    ["Notes", notesRows]
  ]);
}

export function workbookFileName(series) {
  const country = series.country || series.countryCode || "EIA";
  const product = series.product || String(series.title || "").split(/\s+-\s+/)[0] || series.productId || "Series";
  const activity = series.activity || "";
  const shortProduct = shortenVariableName(product);
  const shortActivity = activity ? shortenVariableName(activity) : "";
  return `${safeFileName([country, shortProduct, shortActivity].filter(Boolean).join("_"))}.xlsx`;
}

export function buildXlsx(series) {
  const seriesId = series.seriesId || `${series.productId || ""} / ${series.activityId || ""} / ${series.unitFacet || ""}`;
  const dataRows = [
    ["Observation period", "Observation value", "Country"],
    ...getCleanPoints(series.points).map(point => [point.period, point.value, series.country || ""])
  ];
  const metadataRows = [
    ["Field", "Value"],
    ["Series name", series.title || ""],
    ["Series ID", seriesId],
    ["Country", series.country || ""],
    ["Country code", series.countryCode || ""],
    ["Units", series.unit || ""],
    ["Frequency", series.frequency || ""],
    ["Coverage", formatCoverage(series.coverage)],
    ["Latest period", series.latestPeriod || ""],
    ["Latest value", Number.isFinite(Number(series.latestValue)) ? Number(series.latestValue) : ""],
    ["Product", series.product || ""],
    ["Activity", series.activity || ""]
  ];
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="All_Data" sheetId="1" r:id="rId1"/><sheet name="Metadata" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": worksheetXml(dataRows),
    "xl/worksheets/sheet2.xml": worksheetXml(metadataRows)
  };
  return new Blob([zipStore(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

function worksheetXml(rows) {
  const sheetData = rows.map((row, rowIndex) => {
    const cells = row.map((cell, columnIndex) => cellXml(cell, columnName(columnIndex) + (rowIndex + 1))).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`;
}

function comparisonDataRow(definition, country, point, coverage, originalUnit, convertedUnit) {
  return [
    definition.rank ?? "", definition.definitionId || "", country.seriesId || country.series?.seriesId || "",
    definition.title || "", country.geography?.name || "", country.geography?.code || "", point?.period || "",
    point?.value ?? "", point?.originalValue ?? point?.value ?? "", country.series?.unit || country.unit || "",
    originalUnit, convertedUnit, country.series?.frequency || country.frequency || definition.definition?.frequency || "",
    definition.definition?.source || "EIA", coverage, country.status || "", country.warningType || "", country.warning || ""
  ];
}

function uniqueComparisonCountries(comparisons) {
  const countries = new Map();
  for (const definition of Array.isArray(comparisons) ? comparisons : [comparisons].filter(Boolean)) {
    for (const country of definition.countries || []) {
      if (country.geography?.code) countries.set(country.geography.code, country.geography);
    }
  }
  return [...countries.values()];
}

function buildWorkbookBlob(sheets) {
  const overrides = sheets.map(([,], index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const sheetEntries = sheets.map(([name], index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const relationships = sheets.map(([,], index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`
  };
  sheets.forEach(([, rows], index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = worksheetXml(rows); });
  return new Blob([zipStore(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function cellXml(value, ref) {
  const number = Number(value);
  if (typeof value === "number" && Number.isFinite(number)) return `<c r="${ref}"><v>${number}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = zipHeader(0x04034b50, nameBytes, data.length, crc, offset);
    parts.push(local, nameBytes, data);
    central.push(zipHeader(0x02014b50, nameBytes, data.length, crc, offset));
    offset += local.length + nameBytes.length + data.length;
  }

  const centralOffset = offset;
  for (const record of central) {
    parts.push(record.bytes, record.nameBytes);
    offset += record.bytes.length + record.nameBytes.length;
  }

  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, central.length, true);
  view.setUint16(10, central.length, true);
  view.setUint32(12, offset - centralOffset, true);
  view.setUint32(16, centralOffset, true);
  parts.push(end);
  return new Blob(parts);
}

function zipHeader(signature, nameBytes, size, crc, offset) {
  const isCentral = signature === 0x02014b50;
  const bytes = new Uint8Array(isCentral ? 46 : 30);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, signature, true);

  if (isCentral) {
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint32(42, offset, true);
    return { bytes, nameBytes };
  }

  view.setUint16(4, 20, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameBytes.length, true);
  return bytes;
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function columnName(index) {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function safeFileName(value) {
  return String(value || "eia-series")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "eia-series";
}

function shortenVariableName(value) {
  const words = String(value || "")
    .replace(/^total\s+/i, "")
    .split(/[^a-z0-9]+/i)
    .filter(word => word && !["and", "including", "of", "other", "the"].includes(word.toLowerCase()))
    .map(word => word === word.toUpperCase() ? word : word[0].toUpperCase() + word.slice(1).toLowerCase());
  return words.slice(0, 4).join("_") || "Series";
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
