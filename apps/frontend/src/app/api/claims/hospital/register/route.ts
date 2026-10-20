import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient, requireAnyRole } from '@/lib/auth-server';
import { deriveBrokerCodeFromMemberNumber, normalizeBrokerCode } from '@/lib/broker-identity';

export const dynamic = 'force-dynamic';

const registerSelect = `
  id,
  row_type,
  workbook_row_number,
  workspace_year,
  workspace_month,
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
  member_id
`;

const intakeSelect = `
  id,
  intake_number,
  source_type,
  source_reference,
  document_type,
  file_name,
  file_size_bytes,
  status,
  notification_status,
  ocr_confidence,
  ocr_fields,
  raw_text,
  matched_register_id,
  review_notes,
  created_at
`;

const editableRegisterFields = new Set([
  'auth_number',
  'date_of_claim_reported_received',
  'dol',
  'claim_number',
  'member_number',
  'surname',
  'initials',
  'patient_name',
  'id_number_principal_member',
  'gender',
  'patient_dob',
  'relationship',
  'total_claims_incurred',
  'finalised_paid_to_date',
  'claims_outstanding',
  'actual_costs_invoices_received',
  'member_costs',
  'accident',
  'illness',
  'death',
  'dread',
  'extension',
  'casualty_admitted_hospital',
  'ex_gratia',
  'repudiation_claim_amount',
  'status',
  'group_name',
  'cause',
  'hospital',
  'length_of_stay',
  'beneficiary',
  'beneficiary_death_payment_id',
  'beneficiary_death_surname_initials',
  'payment_date',
  'plan',
  'inception_date',
  'icd10_code',
  'province',
  'policy_period',
  'practice_number',
]);

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ['claims', 'admin', 'system_admin', 'operations_manager', 'finance_manager']);

    const searchParams = request.nextUrl.searchParams;
    const year = Number(searchParams.get('year') || '2026');
    const includeSubtotals = searchParams.get('include_subtotals') === 'true';
    const supabase = createServiceRoleSupabaseClient();

    let query = supabase
      .from('hospital_claims_register')
      .select(registerSelect)
      .eq('workspace_year', year)
      .order('workbook_row_number', { ascending: true });

    if (!includeSubtotals) {
      query = query.eq('row_type', 'claim');
    }

    const [registerResult, intakeResult] = await Promise.all([
      query,
      supabase
        .from('hospital_claim_intakes')
        .select(intakeSelect)
        .or('status.eq.new,notification_status.eq.new')
        .order('created_at', { ascending: false }),
    ]);

    if (registerResult.error) throw registerResult.error;
    if (intakeResult.error) throw intakeResult.error;

    const rows = await enrichRegisterRows(supabase, registerResult.data || []);
    const newIntakes = enrichIntakesWithComparison(rows, intakeResult.data || []);

    return NextResponse.json({
      rows,
      count: rows.length,
      newIntakes,
    });
  } catch (error) {
    console.error('Failed to fetch hospital claims register:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hospital claims register', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAnyRole(request, ['claims', 'admin', 'system_admin', 'operations_manager', 'finance_manager']);
    const body = await request.json();
    const intakeId = typeof body.intakeId === 'string' ? body.intakeId : '';

    if (!intakeId) {
      return NextResponse.json({ error: 'Missing intake id' }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data: intake, error: intakeError } = await supabase
      .from('hospital_claim_intakes')
      .select(`${intakeSelect}, matched_register_id`)
      .eq('id', intakeId)
      .single();

    if (intakeError || !intake) {
      return NextResponse.json({ error: 'Hospital intake not found' }, { status: 404 });
    }

    if (intake.document_type === 'claim_form') {
      const matchedRowId = intake.matched_register_id || null;
      if (!matchedRowId) {
        return NextResponse.json(
          {
            error: 'Claim form could not be matched to an existing HCR claim',
            details: 'Please open the claim form and review it personally before making any claim changes.',
          },
          { status: 422 }
        );
      }

      const { data: matchedRow } = await supabase
        .from('hospital_claims_register')
        .select(registerSelect)
        .eq('id', matchedRowId)
        .maybeSingle();

      if (!matchedRow) {
        return NextResponse.json(
          {
            error: 'Matched HCR claim could not be found',
            details: 'Please open the claim form and review it personally before making any claim changes.',
          },
          { status: 404 }
        );
      }

      const comparison = buildClaimFormComparison(matchedRow, Array.isArray(intake.ocr_fields) ? intake.ocr_fields : []);

      await Promise.all([
        supabase.from('hospital_claim_intakes').update({
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          status: 'reviewed',
          notification_status: 'processed',
          updated_at: new Date().toISOString(),
        }).eq('id', intake.id),
        supabase.from('hosp_claim_audit').insert({
          register_id: matchedRow.id,
          action: 'claim_form_review_requested',
          performed_by: user.id,
          previous_status: intake.status,
          new_status: 'reviewed',
          new_values: {
            claim_number: matchedRow.claim_number,
            intake_number: intake.intake_number,
            document_type: intake.document_type,
          },
          notes: comparison.requiresManualReview
            ? 'Claim form reported major differences. Admin must open the claim form and review it personally.'
            : 'Claim form matched an existing HCR claim. Admin should open the claim form and review it personally.',
        }),
        supabase.from('hosp_claim_history').insert({
          register_id: matchedRow.id,
          event_type: 'claim_form_review',
          event_title: 'Claim form submitted for review',
          event_detail: comparison.adminPrompt,
          event_data: {
            intake_id: intake.id,
            intake_number: intake.intake_number,
            major_differences: comparison.majorDifferences,
          },
          created_by: user.id,
        }),
      ]);

      return NextResponse.json({
        row: matchedRow,
        action: 'review_existing_claim',
        comparison,
        intake: {
          ...intake,
          status: 'reviewed',
          notification_status: 'processed',
        },
      });
    }

    if (intake.matched_register_id) {
      const { data: existingRow } = await supabase
        .from('hospital_claims_register')
        .select(registerSelect)
        .eq('id', intake.matched_register_id)
        .maybeSingle();

      return NextResponse.json(
        {
          error: 'This intake is already in the workspace',
          row: existingRow || null,
        },
        { status: 409 }
      );
    }

    const { data: existingRegister } = await supabase
      .from('hospital_claims_register')
      .select(registerSelect)
      .eq('intake_id', intake.id)
      .maybeSingle();

    if (existingRegister) {
      await supabase
        .from('hospital_claim_intakes')
        .update({
          matched_register_id: existingRegister.id,
          status: 'inserted',
          notification_status: 'processed',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', intake.id);

      return NextResponse.json(
        {
          error: 'This intake is already in the workspace',
          row: existingRegister,
        },
        { status: 409 }
      );
    }

    const ocrFields = Array.isArray(intake.ocr_fields) ? intake.ocr_fields : [];
    const field = (...labels: string[]) => {
      for (const label of labels) {
        const match = ocrFields.find((item: any) => item?.label === label);
        if (match?.value) return String(match.value).trim();
      }
      return '';
    };

    const claimNumber = intake.source_reference || field('Generated Claim Number') || intake.intake_number;
    const rawPatientName = field('Name Of Patient', 'Full name of Patient', 'Member Name and Surname');
    const rawMemberName = field('Member Name and Surname', 'Name of Principal Member');
    const memberNumber = field('Policy Number', 'Membership Number', 'Detected Member Number');
    const idNumber = field('Detected ID Number', 'Member ID', 'Patient ID');
    const hospitalName = field('Hospital Name');
    const practiceNumber = field('Hospital Practice Number', 'Practice Number');
    const authNumber = field('Auth Number', 'Africa-Assist Ref Number');
    const cause = field('Diagnosis', 'Diagnosis (Initial Request)', 'Incident Description') || 'Hospital Claim';
    const benefitType = field('Benefit Type');
    const planNameFromIntake = field('Policy Number');
    const dateOfAdmission = field('Date Of Admission', 'Date of Incident');
    const inceptionDate = field('Policy Inception Date');
    const totalGuaranteed = parseAmount(field('Authorised Amount', 'Total Guaranteed Amount', 'Maximum GOP Amount'));
    const issuedAt = formatStoredDate(intake.created_at);
    const normalisedDol = formatStoredDate(normaliseDate(dateOfAdmission) || intake.created_at);
    const currentDate = new Date();
    const workspaceYear = currentDate.getFullYear();
    const workspaceMonth = currentDate.getMonth() + 1;

    const matchedMember = await findMatchedMember(supabase, {
      memberNumber,
      idNumber,
      patientName: rawPatientName,
      memberName: rawMemberName,
    });

    const matchedProvider = practiceNumber
      ? await findMatchedProvider(supabase, practiceNumber, hospitalName)
      : null;

    const matchedBroker = await findMatchedBroker(supabase, matchedMember?.broker_code || null, matchedMember?.member_number || memberNumber || null);
    const patientParts = splitPatientName(rawPatientName || rawMemberName || matchedMember?.first_name || '');
    const surname = matchedMember?.last_name || patientParts.surname || '-';
    const patientName = matchedMember?.first_name || patientParts.firstName || rawPatientName || rawMemberName || '-';
    const initials = initialsFromValues(matchedMember?.first_name || patientParts.firstName, surname);
    const principalId = matchedMember?.id_number || idNumber || '-';
    const plan = matchedMember?.plan_name || planNameFromIntake || '-';
    const policyPeriod = formatPolicyPeriod(matchedMember?.start_date || null, currentDate);

    const bucketAmount = totalGuaranteed > 0 ? totalGuaranteed : 0;
    const isDeath = /death/i.test(`${benefitType} ${cause}`);
    const isDread = /(dread|stroke|heart)/i.test(`${benefitType} ${cause}`);
    const isAccident = /accident/i.test(`${benefitType} ${cause}`);
    const accident = isAccident ? bucketAmount : 0;
    const illness = !isAccident && !isDeath && !isDread ? bucketAmount : 0;
    const death = isDeath ? bucketAmount : 0;
    const dread = isDread ? bucketAmount : 0;

    const { data: rowSequence } = await supabase
      .from('hospital_claims_register')
      .select('workbook_row_number')
      .eq('workspace_year', workspaceYear)
      .order('workbook_row_number', { ascending: false })
      .limit(1);

    const nextWorkbookRowNumber = Number(rowSequence?.[0]?.workbook_row_number || 0) + 1;

    const registerInsert = {
      hcr_claim_number: claimNumber,
      intake_id: intake.id,
      member_id: matchedMember?.id || null,
      provider_id: matchedProvider?.id || null,
      workspace_year: workspaceYear,
      workspace_month: workspaceMonth,
      row_type: 'claim',
      workbook_sheet: String(workspaceYear),
      workbook_row_number: nextWorkbookRowNumber,
      source_workbook_file: intake.file_name || 'gop intake',
      auth_number: authNumber || null,
      date_of_claim_reported_received: issuedAt,
      dol: normalisedDol,
      claim_number: claimNumber,
      member_number: matchedMember?.member_number || memberNumber || null,
      surname: surname === '-' ? null : surname,
      initials: initials === '-' ? null : initials,
      patient_name: patientName === '-' ? null : patientName,
      id_number_principal_member: principalId === '-' ? null : principalId,
      gender: matchedMember?.gender || null,
      patient_dob: matchedMember?.date_of_birth || null,
      relationship: rawPatientName && rawMemberName && rawPatientName !== rawMemberName ? 'Dependent' : 'Principal',
      total_claims_incurred: bucketAmount,
      finalised_paid_to_date: 0,
      claims_outstanding: bucketAmount,
      actual_costs_invoices_received: 0,
      member_costs: 0,
      accident,
      illness,
      death,
      dread,
      extension: 0,
      casualty_admitted_hospital: 0,
      ex_gratia: 0,
      repudiation_claim_amount: 0,
      status: 'Open',
      group_name: matchedBroker?.name || null,
      cause: cause || null,
      hospital: matchedProvider?.name || hospitalName || null,
      length_of_stay: null,
      beneficiary: null,
      beneficiary_death_payment_id: null,
      beneficiary_death_surname_initials: null,
      payment_date: null,
      plan: plan || null,
      inception_date: inceptionDate || null,
      icd10_code: null,
      province: null,
      policy_period: policyPeriod,
      practice_number: matchedProvider?.prno || practiceNumber || null,
      source_row: {
        intake_id: intake.id,
        intake_number: intake.intake_number,
        document_type: intake.document_type,
        file_name: intake.file_name,
      },
      calculation_snapshot: {
        inserted_from_intake: true,
        ocr_confidence: intake.ocr_confidence,
      },
      extra_columns: {
        ocr_fields: ocrFields,
      },
    };

    const { data: insertedRow, error: insertError } = await supabase
      .from('hospital_claims_register')
      .insert(registerInsert)
      .select(registerSelect)
      .single();

    if (insertError || !insertedRow) {
      throw insertError || new Error('Failed to insert hospital claim row');
    }

    await Promise.all([
      supabase.from('hospital_claim_intakes').update({
        matched_register_id: insertedRow.id,
        matched_member_id: matchedMember?.id || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        status: 'inserted',
        notification_status: 'processed',
        updated_at: new Date().toISOString(),
      }).eq('id', intake.id),
      supabase.from('hosp_claims').insert({
        register_id: insertedRow.id,
        intake_id: intake.id,
        hcr_claim_number: claimNumber,
        status: 'open',
        member_id: matchedMember?.id || null,
        provider_id: matchedProvider?.id || null,
        auth_number: authNumber || null,
        service_date: normalisedDol,
        reported_date: issuedAt,
        claimed_amount: bucketAmount,
        paid_amount: 0,
        outstanding_amount: bucketAmount,
        claim_type: benefitType || 'Hospital Claim',
        benefit_bucket: isAccident ? 'accident' : isDeath ? 'death' : isDread ? 'dread' : 'illness',
      }),
      supabase.from('hosp_claim_audit').insert({
        register_id: insertedRow.id,
        action: 'intake_inserted_into_workspace',
        performed_by: user.id,
        previous_status: intake.status,
        new_status: 'inserted',
        new_values: {
          claim_number: claimNumber,
          intake_number: intake.intake_number,
        },
        notes: 'GOP intake accepted into hospital claims workspace',
      }),
      supabase.from('hosp_claim_history').insert({
        register_id: insertedRow.id,
        event_type: 'workspace_insert',
        event_title: 'Inserted from GOP intake',
        event_detail: `${intake.file_name || 'GOP intake'} was accepted into the hospital claims workspace.`,
        event_data: {
          intake_id: intake.id,
          intake_number: intake.intake_number,
          claim_number: claimNumber,
        },
        created_by: user.id,
      }),
    ]);

    return NextResponse.json({
      row: insertedRow,
      intake: {
        ...intake,
        matched_register_id: insertedRow.id,
        status: 'inserted',
        notification_status: 'processed',
      },
    });
  } catch (error) {
    console.error('Failed to insert hospital intake into workspace:', error);
    return NextResponse.json(
      {
        error: 'Failed to insert hospital intake into workspace',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAnyRole(request, ['claims', 'admin', 'system_admin', 'operations_manager', 'finance_manager']);

    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const incomingUpdates = body.updates && typeof body.updates === 'object' ? body.updates : {};

    if (!id) {
      return NextResponse.json({ error: 'Missing register row id' }, { status: 400 });
    }

    const updates = Object.fromEntries(
      Object.entries(incomingUpdates).filter(([key]) => editableRegisterFields.has(key))
    );

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('hospital_claims_register')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(registerSelect)
      .single();

    if (error) throw error;

    return NextResponse.json({ row: data });
  } catch (error) {
    console.error('Failed to update hospital claims register:', error);
    return NextResponse.json(
      { error: 'Failed to update hospital claims register', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function parseAmount(value: string | null | undefined) {
  if (!value) return 0;
  const amount = Number(String(value).replace(/[^\d.,-]/g, '').replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function normaliseDate(value: string | null | undefined) {
  if (!value) return '';
  const clean = value.trim();
  const date = new Date(clean);
  if (!Number.isNaN(date.getTime())) return date.toISOString();

  const slashMatch = clean.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!slashMatch) return '';

  const [, day, month, year] = slashMatch;
  const fullYear = year.length === 2 ? `20${year}` : year;
  const parsed = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function formatStoredDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function splitPatientName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', surname: '' };
  if (parts.length === 1) return { firstName: parts[0], surname: '' };
  return {
    firstName: parts[0],
    surname: parts.slice(1).join(' '),
  };
}

function initialsFromValues(firstName?: string | null, surname?: string | null) {
  return [firstName?.[0], surname?.[0]].filter(Boolean).join('').toUpperCase() || '-';
}

async function findMatchedMember(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  search: { memberNumber: string; idNumber: string; patientName: string; memberName: string }
) {
  if (search.memberNumber) {
    const { data } = await supabase
      .from('members')
      .select('id, member_number, first_name, last_name, id_number, plan_name, gender, start_date, broker_code, date_of_birth')
      .eq('member_number', search.memberNumber)
      .maybeSingle();
    if (data) return data;
  }

  if (search.idNumber) {
    const { data } = await supabase
      .from('members')
      .select('id, member_number, first_name, last_name, id_number, plan_name, gender, start_date, broker_code, date_of_birth')
      .eq('id_number', search.idNumber)
      .maybeSingle();
    if (data) return data;
  }

  const candidateName = (search.patientName || search.memberName).trim();
  if (candidateName) {
    const parts = candidateName.split(/\s+/).filter(Boolean);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    if (firstName && lastName) {
      const { data } = await supabase
        .from('members')
        .select('id, member_number, first_name, last_name, id_number, plan_name, gender, start_date, broker_code, date_of_birth')
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .limit(1);
      if (data?.[0]) return data[0];
    }
  }

  return null;
}

async function enrichRegisterRows(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  rows: any[]
) {
  const memberIds = [...new Set(rows.map((row) => row.member_id).filter(Boolean))];
  if (memberIds.length === 0) {
    return rows.map((row) => ({
      ...row,
      status: row.status?.toLowerCase() === 'pending' ? 'Open' : row.status,
    }));
  }

  const [{ data: members }, { data: brokers }] = await Promise.all([
    supabase
      .from('members')
      .select('id, member_number, gender, start_date, broker_code, date_of_birth')
      .in('id', memberIds),
    supabase
      .from('brokers')
      .select('code, name, policy_prefix'),
  ]);

  const memberMap = new Map((members || []).map((member) => [member.id, member]));

  return rows.map((row) => {
    const member = row.member_id ? memberMap.get(row.member_id) : null;
    const broker = member ? resolveBroker(member.broker_code, member.member_number, brokers || []) : null;

    return {
      ...row,
      status: row.status?.toLowerCase() === 'pending' ? 'Open' : row.status,
      gender: row.gender || member?.gender || null,
      patient_dob: row.patient_dob || member?.date_of_birth || null,
      policy_period: row.policy_period || formatPolicyPeriod(member?.start_date || null, new Date()),
      group_name: row.group_name && row.group_name !== '-' ? row.group_name : broker?.name || row.group_name,
    };
  });
}

function resolveBroker(
  brokerCode: string | null | undefined,
  memberNumber: string | null | undefined,
  brokers: Array<{ code: string; name: string; policy_prefix?: string | null }>
) {
  const explicitCode = normalizeBrokerCode(brokerCode);
  const derivedCode = explicitCode || deriveBrokerCodeFromMemberNumber(memberNumber, brokers) || '';

  if (!derivedCode) return null;

  return (
    brokers.find(
      (broker) =>
        normalizeBrokerCode(broker.code) === derivedCode ||
        normalizeBrokerCode(broker.policy_prefix) === derivedCode
    ) || null
  );
}

async function findMatchedBroker(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  brokerCode: string | null | undefined,
  memberNumber: string | null | undefined
) {
  const { data: brokers } = await supabase
    .from('brokers')
    .select('code, name, policy_prefix');

  if (!brokers || brokers.length === 0) return null;
  return resolveBroker(brokerCode, memberNumber, brokers);
}

async function findMatchedProvider(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  practiceNumber: string,
  hospitalName: string
) {
  const { data: exact } = await supabase
    .from('providers')
    .select('id, name, prno')
    .eq('prno', practiceNumber)
    .limit(1);
  if (exact?.[0]) return exact[0];

  if (hospitalName) {
    const { data: byName } = await supabase
      .from('providers')
      .select('id, name, prno')
      .ilike('name', hospitalName)
      .limit(1);
    if (byName?.[0]) return byName[0];
  }

  return null;
}

function formatPolicyPeriod(startDate: string | null | undefined, now: Date) {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();

  if (now.getDate() < start.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) return null;

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} year${years === 1 ? '' : 's'}`);
  }
  if (months > 0 || parts.length === 0) {
    parts.push(`${months} month${months === 1 ? '' : 's'}`);
  }

  return parts.join(' ');
}

function enrichIntakesWithComparison(rows: any[], intakes: any[]) {
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  return intakes.map((intake) => {
    if (intake.document_type !== 'claim_form') return intake;
    const matchedRow = intake.matched_register_id ? rowMap.get(intake.matched_register_id) : null;
    return {
      ...intake,
      comparison: matchedRow
        ? buildClaimFormComparison(matchedRow, Array.isArray(intake.ocr_fields) ? intake.ocr_fields : [])
        : {
            matchedRegisterId: null,
            matchedClaimNumber: null,
            requiresManualReview: true,
            majorDifferences: [
              {
                label: 'Claim match',
                existingValue: 'No existing HCR claim matched',
                formValue: intake.source_reference || intake.intake_number,
              },
            ],
            adminPrompt: 'Major differences detected. Please open the claim form and review it personally before making any claim changes.',
          },
    };
  });
}

function buildClaimFormComparison(matchedRow: any, ocrFields: any[]) {
  const field = (...labels: string[]) => {
    for (const label of labels) {
      const match = ocrFields.find((item: any) => item?.label === label);
      if (match?.value) return String(match.value).trim();
    }
    return '';
  };

  const differences: Array<{ label: string; existingValue: string; formValue: string }> = [];
  pushDifferenceIfChanged(differences, 'Policy / Member Number', matchedRow.member_number, field('Policy Number', 'Membership Number', 'Detected Member Number'), areEquivalentTokenValues);
  pushDifferenceIfChanged(differences, 'Authorization Number', matchedRow.auth_number, field('Auth Number', 'Africa-Assist Ref Number'), areEquivalentTokenValues);
  pushDifferenceIfChanged(differences, 'Patient Name', matchedRow.patient_name, field('Name Of Patient', 'Full name of Patient', 'Member Name and Surname'), areEquivalentNames);
  pushDifferenceIfChanged(differences, 'Hospital', matchedRow.hospital, field('Hospital Name'), areEquivalentNames);
  pushDifferenceIfChanged(differences, 'Admission Date', matchedRow.dol, field('Date Of Admission', 'Date of Incident'), areEquivalentDates);
  pushDifferenceIfChanged(differences, 'Diagnosis / Cause', matchedRow.cause, field('Diagnosis', 'Diagnosis (Initial Request)', 'Incident Description'), areEquivalentDiagnosis);

  return {
    matchedRegisterId: matchedRow.id,
    matchedClaimNumber: matchedRow.claim_number || null,
    requiresManualReview: differences.length > 0,
    majorDifferences: differences,
    adminPrompt: differences.length > 0
      ? 'Major differences detected. Please open the claim form and review it personally before making any claim changes.'
      : 'Claim form matched an existing HCR claim. Please open the claim form and review it personally before making any claim changes.',
  };
}

function pushDifferenceIfChanged(
  differences: Array<{ label: string; existingValue: string; formValue: string }>,
  label: string,
  existingValue: string | null | undefined,
  formValue: string | null | undefined,
  comparator: (left: string | null | undefined, right: string | null | undefined) => boolean
) {
  const left = (existingValue || '').trim();
  const right = (formValue || '').trim();
  if (!left || !right) return;
  if (comparator(left, right)) return;
  differences.push({ label, existingValue: left, formValue: right });
}

function areEquivalentTokenValues(left: string | null | undefined, right: string | null | undefined) {
  return normalizeToken(left) === normalizeToken(right);
}

function areEquivalentNames(left: string | null | undefined, right: string | null | undefined) {
  const a = normalizeName(left);
  const b = normalizeName(right);
  return a === b || a.includes(b) || b.includes(a);
}

function areEquivalentDiagnosis(left: string | null | undefined, right: string | null | undefined) {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return true;
  if (a === b) return true;
  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));
  return [...aTokens].filter((token) => bTokens.has(token)).length >= Math.min(2, Math.min(aTokens.size, bTokens.size));
}

function areEquivalentDates(left: string | null | undefined, right: string | null | undefined) {
  return normalizeComparableDate(left) === normalizeComparableDate(right);
}

function normalizeComparableDate(value: string | null | undefined) {
  if (!value) return '';
  const clean = value.trim();
  const direct = new Date(clean);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);
  const match = clean.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!match) return clean;
  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function normalizeToken(value: string | null | undefined) {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeName(value: string | null | undefined) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
