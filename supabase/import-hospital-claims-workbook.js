const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: 'apps/frontend/.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXTRACTED_DIR = process.env.XLSX_EXTRACTED_DIR || '/tmp/day1claimsxlsx';
const WORKBOOK_FILE =
  process.env.HOSPITAL_CLAIMS_WORKBOOK ||
  '/home/megatron/Projects/day1main/day1main-design/dashboard/johan/johan claims/docsasdiscussed/Copy of Claims Register APR 2026 AS AT 2 June F.xlsx';
const SHEET_NAME = process.env.HOSPITAL_CLAIMS_SHEET || '2026';

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/frontend/.env.local');
}

if (!fs.existsSync(path.join(EXTRACTED_DIR, 'xl', 'workbook.xml'))) {
  throw new Error(`Workbook XML not found at ${EXTRACTED_DIR}. Run: unzip -oq "${WORKBOOK_FILE}" -d ${EXTRACTED_DIR}`);
}

function decodeXml(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function columnNumber(cellRef) {
  const match = cellRef.match(/[A-Z]+/);
  if (!match) return 0;
  return [...match[0]].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0);
}

function readXml(relativePath) {
  return fs.readFileSync(path.join(EXTRACTED_DIR, relativePath), 'utf8');
}

function readSharedStrings() {
  const file = path.join(EXTRACTED_DIR, 'xl', 'sharedStrings.xml');
  if (!fs.existsSync(file)) return [];
  const xml = fs.readFileSync(file, 'utf8');

  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((textMatch) => textMatch[1]).join(''))
  );
}

function sheetTargets() {
  const workbook = readXml('xl/workbook.xml');
  const rels = readXml('xl/_rels/workbook.xml.rels');
  const relMap = {};

  for (const match of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    relMap[match[1]] = match[2];
  }

  return [...workbook.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*sheetId="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((match) => ({
    name: decodeXml(match[1]),
    sheetId: match[2],
    rid: match[3],
    target: relMap[match[3]],
  }));
}

function parseCell(cellXml, sharedStrings) {
  const type = (cellXml.match(/ t="([^"]+)"/) || [])[1];
  const formula = (cellXml.match(/<f[^>]*>([\s\S]*?)<\/f>/) || [])[1];
  const value = (cellXml.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
  const inline = (cellXml.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/) || [])[1];

  if (type === 's' && value !== undefined) {
    return { value: sharedStrings[Number(value)] || '', formula: formula ? decodeXml(formula) : '' };
  }

  if (inline !== undefined) {
    return { value: decodeXml(inline), formula: formula ? decodeXml(formula) : '' };
  }

  return { value: value !== undefined ? decodeXml(value) : '', formula: formula ? decodeXml(formula) : '' };
}

function parseRows(sheetXml, sharedStrings) {
  const rows = [];

  for (const rowMatch of sheetXml.matchAll(/<row[^>]* r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(rowMatch[1]);
    const cells = {};
    const formulas = {};
    let nonEmpty = false;

    for (const cellMatch of rowMatch[2].matchAll(/<c\b[^>]* r="([^"]+)"[^>]*>[\s\S]*?<\/c>/g)) {
      const col = columnNumber(cellMatch[1]);
      const parsed = parseCell(cellMatch[0], sharedStrings);
      if (parsed.value !== '' || parsed.formula) {
        nonEmpty = true;
        cells[col] = parsed.value;
        if (parsed.formula) formulas[col] = parsed.formula;
      }
    }

    if (nonEmpty) rows.push({ rowNumber, cells, formulas });
  }

  return rows;
}

function clean(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function money(value) {
  const text = clean(value);
  if (!text) return 0;
  const withoutCurrency = text.replace(/\bZAR\b/gi, '').replace(/R/g, '').trim();
  if (/[A-QS-ZA-Z]/.test(withoutCurrency)) return 0;

  const amount = Number(withoutCurrency.replace(/[^\d.,-]/g, '').replace(/,/g, ''));
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function monthFromDateText(value) {
  const text = clean(value);
  if (!text) return null;

  const dot = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dot) return Number(dot[2]);

  const ymd = text.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (ymd) return Number(ymd[2]);

  return null;
}

function dateFromExcelSerial(value) {
  const serial = Number(clean(value));
  if (!Number.isFinite(serial) || serial < 30000 || serial > 50000) return null;

  const excelEpoch = Date.UTC(1899, 11, 30);
  return new Date(excelEpoch + serial * 24 * 60 * 60 * 1000);
}

function monthFromExcelSerial(value) {
  const date = dateFromExcelSerial(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.getUTCMonth() + 1;
}

function monthMarkerFromSubtotal(record) {
  if (record.row_type !== 'subtotal') return null;
  if (Number(record.total_claims_incurred || 0) <= 0) return null;

  return (
    monthFromDateText(record.date_of_claim_reported_received) ||
    monthFromExcelSerial(record.date_of_claim_reported_received) ||
    monthFromExcelSerial(record.auth_number)
  );
}

function isActualClaimRow(record) {
  return Boolean(
    record.auth_number ||
      record.claim_number ||
      record.patient_name ||
      record.id_number_principal_member ||
      record.hospital
  );
}

function assignWorkspaceMonthsByWorkbookSection(records) {
  const pending = [];

  for (const record of records) {
    pending.push(record);

    const markerMonth = monthMarkerFromSubtotal(record);
    if (!markerMonth) continue;

    for (const pendingRecord of pending) {
      pendingRecord.workspace_month = markerMonth;
    }
    pending.length = 0;
  }

  for (const record of pending) {
    if (!record.workspace_month) {
      record.workspace_month =
        monthFromDateText(record.date_of_claim_reported_received) ||
        monthFromDateText(record.dol) ||
        monthFromExcelSerial(record.date_of_claim_reported_received);
    }
  }

  return records;
}

function classifyRow(record) {
  const hasIdentity = Boolean(
    record.claim_number ||
      record.member_number ||
      record.patient_name ||
      record.id_number_principal_member ||
      record.hospital
  );

  if (hasIdentity) return 'claim';

  const hasTotals = [
    record.total_claims_incurred,
    record.finalised_paid_to_date,
    record.claims_outstanding,
    record.accident,
    record.illness,
    record.casualty_admitted_hospital,
    record.ex_gratia,
  ].some((value) => Number(value || 0) !== 0);

  return hasTotals ? 'subtotal' : 'formula_blank';
}

function sourceHash(record) {
  return crypto
    .createHash('sha256')
    .update(`${record.workbook_sheet}:${record.workbook_row_number}:${JSON.stringify(record.source_row)}`)
    .digest('hex');
}

function rowToRecord(row, headers) {
  const sourceRow = {};
  const formulaMap = {};

  for (let col = 1; col <= 44; col += 1) {
    const header = headers[col] || `Column ${col}`;
    sourceRow[header] = clean(row.cells[col]);
    if (row.formulas[col]) formulaMap[header] = row.formulas[col];
  }

  const record = {
    workbook_sheet: SHEET_NAME,
    workbook_row_number: row.rowNumber,
    source_workbook_file: path.basename(WORKBOOK_FILE),
    auth_number: clean(row.cells[1]),
    date_of_claim_reported_received: clean(row.cells[2]),
    dol: clean(row.cells[3]),
    claim_number: null,
    member_number: clean(row.cells[5]) || clean(row.cells[4]),
    surname: clean(row.cells[6]),
    initials: clean(row.cells[7]),
    patient_name: clean(row.cells[8]),
    id_number_principal_member: clean(row.cells[9]),
    gender: clean(row.cells[10]),
    patient_dob: clean(row.cells[11]),
    relationship: clean(row.cells[12]),
    total_claims_incurred: money(row.cells[13]),
    finalised_paid_to_date: money(row.cells[14]),
    claims_outstanding: money(row.cells[15]),
    actual_costs_invoices_received: money(row.cells[16]),
    member_costs: money(row.cells[17]),
    accident: money(row.cells[18]),
    illness: money(row.cells[19]),
    death: money(row.cells[20]),
    dread: money(row.cells[21]),
    extension: money(row.cells[22]),
    casualty_admitted_hospital: money(row.cells[23]),
    ex_gratia: money(row.cells[24]),
    repudiation_claim_amount: money(row.cells[25]),
    status: clean(row.cells[26]),
    group_name: clean(row.cells[27]),
    cause: clean(row.cells[28]),
    hospital: clean(row.cells[29]),
    length_of_stay: clean(row.cells[30]),
    beneficiary: null,
    beneficiary_death_payment_id: clean(row.cells[32]),
    beneficiary_death_surname_initials: clean(row.cells[33]),
    payment_date: clean(row.cells[31]) || clean(row.cells[34]),
    plan: clean(row.cells[35]),
    inception_date: clean(row.cells[36]),
    icd10_code: clean(row.cells[37]),
    province: clean(row.cells[38]),
    policy_period: clean(row.cells[40]),
    practice_number: clean(row.cells[41]),
    extra_columns: {
      column_37: clean(row.cells[37]),
      column_42: clean(row.cells[42]),
      column_43: clean(row.cells[43]),
      column_44: clean(row.cells[44]),
      workbook_member_number_column: clean(row.cells[5]),
      workbook_claim_number_column: clean(row.cells[4]),
      candidate_member_number: clean(row.cells[5]) || clean(row.cells[4]),
    },
    formula_map: formulaMap,
    source_row: sourceRow,
  };

  record.workspace_year = 2026;
  record.workspace_month = monthFromDateText(record.date_of_claim_reported_received) || monthFromDateText(record.dol);
  record.row_type = classifyRow(record);

  if (
    record.row_type === 'claim' &&
    record.actual_costs_invoices_received > 0 &&
    record.total_claims_incurred === 0 &&
    record.finalised_paid_to_date === 0 &&
    record.claims_outstanding === 0 &&
    record.ex_gratia === 0 &&
    clean(row.cells[25])
  ) {
    record.ex_gratia = record.actual_costs_invoices_received;
    record.actual_costs_invoices_received = 0;
    record.extra_columns.ex_gratia_source_note = clean(row.cells[25]);
    record.extra_columns.ex_gratia_source_column = headers[16] || 'Actual Costs (Invoices Received)';
  }

  record.calculation_snapshot = {
    workbook_claims_outstanding_formula: formulaMap['Claims Outstanding'] || null,
    workbook_balance_check_formula: formulaMap['Practice Number'] || null,
    workbook_benefit_bucket_check_formula: formulaMap['Column 44'] || null,
  };
  record.import_hash = sourceHash(record);

  return record;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function runSql(query) {
  const response = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`SQL failed ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  const targets = sheetTargets();
  const sheet = targets.find((target) => target.name === SHEET_NAME);
  if (!sheet) throw new Error(`Sheet ${SHEET_NAME} not found`);

  const sharedStrings = readSharedStrings();
  const sheetXml = readXml(`xl/${sheet.target}`);
  const rows = parseRows(sheetXml, sharedStrings);
  const headerRow = rows.find((row) => row.rowNumber === 5);
  if (!headerRow) throw new Error('Header row 5 not found');

  const headers = {};
  for (let col = 1; col <= 44; col += 1) {
    headers[col] = clean(headerRow.cells[col]) || `Column ${col}`;
  }

  const records = assignWorkspaceMonthsByWorkbookSection(rows
    .filter((row) => row.rowNumber > 5)
    .map((row) => rowToRecord(row, headers))
    .filter((record) => isActualClaimRow(record) || record.row_type === 'subtotal'));

  const importBatchId = crypto.randomUUID();
  const payload = records.map((record) => ({ ...record, import_batch_id: importBatchId }));

  const json = JSON.stringify(payload);
  const sql = `
with incoming as (
  select *
  from jsonb_to_recordset(${sqlString(json)}::jsonb) as r(
    import_batch_id uuid,
    import_hash text,
    workspace_year integer,
    workspace_month integer,
    row_type text,
    workbook_sheet text,
    workbook_row_number integer,
    source_workbook_file text,
    auth_number text,
    date_of_claim_reported_received text,
    dol text,
    claim_number text,
    member_number text,
    surname text,
    initials text,
    patient_name text,
    id_number_principal_member text,
    gender text,
    patient_dob text,
    relationship text,
    total_claims_incurred numeric,
    finalised_paid_to_date numeric,
    claims_outstanding numeric,
    actual_costs_invoices_received numeric,
    member_costs numeric,
    accident numeric,
    illness numeric,
    death numeric,
    dread numeric,
    extension numeric,
    casualty_admitted_hospital numeric,
    ex_gratia numeric,
    repudiation_claim_amount numeric,
    status text,
    group_name text,
    cause text,
    hospital text,
    length_of_stay text,
    beneficiary text,
    beneficiary_death_payment_id text,
    beneficiary_death_surname_initials text,
    payment_date text,
    plan text,
    inception_date text,
    icd10_code text,
    province text,
    policy_period text,
    practice_number text,
    extra_columns jsonb,
    formula_map jsonb,
    source_row jsonb,
    calculation_snapshot jsonb
  )
),
matched as (
  select incoming.*, member_match.id as matched_member_id
  from incoming
  left join lateral (
    select m.id
    from public.members m
    where m.member_number = coalesce(nullif(incoming.member_number, ''), nullif(incoming.claim_number, ''))
       or m.id_number = incoming.id_number_principal_member
    order by
      case
        when m.member_number = coalesce(nullif(incoming.member_number, ''), nullif(incoming.claim_number, '')) then 1
        when m.id_number = incoming.id_number_principal_member then 2
        else 3
      end
    limit 1
  ) member_match on true
),
upserted as (
  insert into public.hospital_claims_register (
    import_batch_id,
    import_hash,
    member_id,
    workspace_year,
    workspace_month,
    row_type,
    workbook_sheet,
    workbook_row_number,
    source_workbook_file,
    auth_number,
    date_of_claim_reported_received,
    dol,
    claim_number,
    member_number,
    surname,
    initials,
    patient_name,
    id_number_principal_member,
    gender,
    patient_dob,
    relationship,
    total_claims_incurred,
    finalised_paid_to_date,
    claims_outstanding,
    actual_costs_invoices_received,
    member_costs,
    accident,
    illness,
    death,
    dread,
    extension,
    casualty_admitted_hospital,
    ex_gratia,
    repudiation_claim_amount,
    status,
    group_name,
    cause,
    hospital,
    length_of_stay,
    beneficiary,
    beneficiary_death_payment_id,
    beneficiary_death_surname_initials,
    payment_date,
    plan,
    inception_date,
    icd10_code,
    province,
    policy_period,
    practice_number,
    extra_columns,
    formula_map,
    source_row,
    calculation_snapshot,
    updated_at
  )
  select
    import_batch_id,
    import_hash,
    matched_member_id,
    workspace_year,
    workspace_month,
    row_type,
    workbook_sheet,
    workbook_row_number,
    source_workbook_file,
    auth_number,
    date_of_claim_reported_received,
    dol,
    claim_number,
    member_number,
    surname,
    initials,
    patient_name,
    id_number_principal_member,
    gender,
    patient_dob,
    relationship,
    total_claims_incurred,
    finalised_paid_to_date,
    claims_outstanding,
    actual_costs_invoices_received,
    member_costs,
    accident,
    illness,
    death,
    dread,
    extension,
    casualty_admitted_hospital,
    ex_gratia,
    repudiation_claim_amount,
    status,
    group_name,
    cause,
    hospital,
    length_of_stay,
    beneficiary,
    beneficiary_death_payment_id,
    beneficiary_death_surname_initials,
    payment_date,
    plan,
    inception_date,
    icd10_code,
    province,
    policy_period,
    practice_number,
    extra_columns,
    formula_map,
    source_row,
    calculation_snapshot,
    now()
  from matched
  on conflict (import_hash) do update set
    member_id = excluded.member_id,
    import_batch_id = excluded.import_batch_id,
    workspace_year = excluded.workspace_year,
    workspace_month = excluded.workspace_month,
    row_type = excluded.row_type,
    auth_number = excluded.auth_number,
    date_of_claim_reported_received = excluded.date_of_claim_reported_received,
    dol = excluded.dol,
    claim_number = excluded.claim_number,
    member_number = excluded.member_number,
    surname = excluded.surname,
    initials = excluded.initials,
    patient_name = excluded.patient_name,
    id_number_principal_member = excluded.id_number_principal_member,
    gender = excluded.gender,
    patient_dob = excluded.patient_dob,
    relationship = excluded.relationship,
    total_claims_incurred = excluded.total_claims_incurred,
    finalised_paid_to_date = excluded.finalised_paid_to_date,
    claims_outstanding = excluded.claims_outstanding,
    actual_costs_invoices_received = excluded.actual_costs_invoices_received,
    member_costs = excluded.member_costs,
    accident = excluded.accident,
    illness = excluded.illness,
    death = excluded.death,
    dread = excluded.dread,
    extension = excluded.extension,
    casualty_admitted_hospital = excluded.casualty_admitted_hospital,
    ex_gratia = excluded.ex_gratia,
    repudiation_claim_amount = excluded.repudiation_claim_amount,
    status = excluded.status,
    group_name = excluded.group_name,
    cause = excluded.cause,
    hospital = excluded.hospital,
    length_of_stay = excluded.length_of_stay,
    beneficiary = excluded.beneficiary,
    beneficiary_death_payment_id = excluded.beneficiary_death_payment_id,
    beneficiary_death_surname_initials = excluded.beneficiary_death_surname_initials,
    payment_date = excluded.payment_date,
    plan = excluded.plan,
    inception_date = excluded.inception_date,
    icd10_code = excluded.icd10_code,
    province = excluded.province,
    policy_period = excluded.policy_period,
    practice_number = excluded.practice_number,
    extra_columns = excluded.extra_columns,
    formula_map = excluded.formula_map,
    source_row = excluded.source_row,
    calculation_snapshot = excluded.calculation_snapshot,
    updated_at = now()
  returning *
),
claim_rows as (
  insert into public.hosp_claims (
    register_id,
    hcr_claim_number,
    status,
    member_id,
    auth_number,
    service_date,
    reported_date,
    claimed_amount,
    paid_amount,
    outstanding_amount,
    claim_type,
    benefit_bucket,
    updated_at
  )
  select
    id,
    hcr_claim_number,
    coalesce(status, 'open'),
    member_id,
    auth_number,
    dol,
    date_of_claim_reported_received,
    total_claims_incurred,
    finalised_paid_to_date,
    claims_outstanding,
    cause,
    case
      when accident > 0 then 'accident'
      when illness > 0 then 'illness'
      when death > 0 then 'death'
      when dread > 0 then 'dread'
      when casualty_admitted_hospital > 0 then 'casualty'
      else null
    end,
    now()
  from upserted
  where row_type = 'claim'
  on conflict (register_id) do update set
    status = excluded.status,
    member_id = excluded.member_id,
    auth_number = excluded.auth_number,
    service_date = excluded.service_date,
    reported_date = excluded.reported_date,
    claimed_amount = excluded.claimed_amount,
    paid_amount = excluded.paid_amount,
    outstanding_amount = excluded.outstanding_amount,
    claim_type = excluded.claim_type,
    benefit_bucket = excluded.benefit_bucket,
    updated_at = now()
  returning id
),
removed_non_claim_operational_rows as (
  delete from public.hosp_claims hc
  using upserted u
  where hc.register_id = u.id
    and u.row_type <> 'claim'
  returning hc.id
)
select
  (select count(*) from incoming) as workbook_rows,
  (select count(*) from upserted) as register_rows_upserted,
  (select count(*) from upserted where member_id is not null) as matched_members,
  (select count(*) from upserted where row_type = 'subtotal') as subtotal_rows,
  (select count(*) from claim_rows) as hosp_claim_rows_upserted,
  (select count(*) from removed_non_claim_operational_rows) as removed_non_claim_operational_rows;
`;

  const result = await runSql(sql);
  console.log(JSON.stringify({ importBatchId, sheet: SHEET_NAME, parsedRows: records.length, result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
