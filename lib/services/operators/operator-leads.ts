import { prisma } from "@/lib/db/prisma";

export type OperatorLeadImportRow = {
  slug: string;
  name: string;
  category?: string;
  region?: string;
  email?: string;
  phone?: string;
  claimUrl?: string;
  websiteUrl?: string;
};

const csvHeaders = ["slug", "name", "category", "region", "email", "phone", "claim_url"];

export function parseOperatorLeadCsv(csv: string): OperatorLeadImportRow[] {
  const rows = parseCsvRows(csv).filter((row) => row.some((cell) => cell.trim()));

  if (!rows.length) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headerIndex = new Map(
    headerRow.map((header, index) => [normalizeHeader(header), index]),
  );

  for (const requiredHeader of ["slug", "name"]) {
    if (!headerIndex.has(requiredHeader)) {
      throw new Error(`CSV is missing required ${requiredHeader} column.`);
    }
  }

  return dataRows.map((row, index) => {
    const source = Object.fromEntries(
      csvHeaders.map((header) => [header, getCsvCell(row, headerIndex, header)]),
    );
    const lead = normalizeOperatorLeadRow({
      slug: source.slug,
      name: source.name,
      category: source.category,
      region: source.region,
      email: source.email,
      phone: source.phone,
      claimUrl: source.claim_url,
    });

    if (!lead.slug || !lead.name) {
      throw new Error(`CSV row ${index + 2} is missing slug or name.`);
    }

    return lead;
  });
}

export async function upsertOperatorLeads(
  rows: OperatorLeadImportRow[],
  options: { source?: string } = {},
) {
  const source = options.source ?? "csv";

  for (const row of rows) {
    const lead = normalizeOperatorLeadRow(row);

    if (!lead.slug || !lead.name) {
      throw new Error("Operator lead requires slug and name.");
    }

    await prisma.operatorLead.upsert({
      where: { slug: lead.slug },
      create: {
        slug: lead.slug,
        name: lead.name,
        category: lead.category,
        region: lead.region,
        email: lead.email,
        phone: lead.phone,
        claimUrl: lead.claimUrl,
        websiteUrl: lead.websiteUrl,
        source,
        status: "IMPORTED",
      },
      update: {
        name: lead.name,
        category: lead.category,
        region: lead.region,
        email: lead.email,
        phone: lead.phone,
        claimUrl: lead.claimUrl,
        websiteUrl: lead.websiteUrl,
        source,
      },
    });
  }

  return { imported: rows.length };
}

export async function findOperatorLeadBySlug(slug: string) {
  return prisma.operatorLead.findUnique({
    where: { slug: normalizeSlug(slug) },
  });
}

export function normalizeOperatorLeadRow(
  row: OperatorLeadImportRow,
): OperatorLeadImportRow {
  return {
    slug: normalizeSlug(row.slug),
    name: row.name.trim(),
    category: optionalString(row.category),
    region: optionalString(row.region),
    email: optionalEmail(row.email),
    phone: optionalString(row.phone),
    claimUrl: optionalString(row.claimUrl),
    websiteUrl: optionalString(row.websiteUrl),
  };
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

function getCsvCell(
  row: string[],
  headerIndex: Map<string, number>,
  header: string,
) {
  const index = headerIndex.get(header);
  return index === undefined ? "" : row[index] ?? "";
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function optionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function optionalEmail(value?: string) {
  return optionalString(value)?.toLowerCase();
}
