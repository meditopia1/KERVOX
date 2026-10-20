const fs = require('fs/promises')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BROCHURE_FILE_BY_SLUG = {
  'comprehensive-executive': 'comprehensive-executive-plan.md',
  'comprehensive-platinum': 'comprehensive-platinum-plan.md',
  'comprehensive-value-plus': 'comprehensive-value-plus-plan.md',
  'day-to-day': 'day-to-day-plan.md',
  'hospital-executive': 'hospital-executive-plan.md',
  'hospital-platinum': 'hospital-platinum-plan.md',
  'hospital-value-plus': 'hospital-value-plus-plan.md',
  'senior-comprehensive': 'senior-comprehensive-plan.md',
  'senior-day-to-day': 'senior-day-to-day-plan.md',
  'senior-hospital': 'senior-hospital-plan.md',
}

const DEFAULT_DEFINITIONS = [
  ['Accident or Accidental', 'A sudden unforeseen and unintended event arising from a source external to the insured person.'],
  ['Admission', 'Admission into hospital as an inpatient for at least 24 hours under the care of a qualified medical practitioner.'],
  ['Application Form', 'The form completed by the principal insured to apply for cover and nominate dependants where applicable.'],
  ['Beneficiary', 'The person nominated by the principal insured to receive the funeral benefit, subject to the policy terms.'],
  ['Benefit', 'The cover or amount payable under the policy schedule and wording.'],
  ['Commencement Date', 'The date shown on the policy schedule from which the policy starts.'],
  ['Dependant Child', 'A qualifying child linked to the principal member according to the product rules and age limits.'],
  ['Emergency', 'The sudden onset of a health condition that requires immediate medical or surgical treatment.'],
  ['Family', 'The principal member together with the insured spouse and dependant children covered under the policy.'],
  ['Hospital', 'A licensed establishment primarily operating for the reception, diagnosis, treatment, or care of sick or injured persons as inpatients.'],
  ['Illness', 'The onset of an acute, unforeseeable, and medically necessary condition requiring covered treatment.'],
  ['Inception Date', 'The date stated in the policy schedule from which waiting periods and benefits are measured.'],
  ['Insured Persons', 'The principal member and any approved spouse or dependant children listed for cover under the policy.'],
  ['Insurer', 'African Unity Life Limited, the underwriter of the Day1 Health medical insurance products.'],
  ['Policy Schedule', 'The policy schedule issued to the principal member recording the selected plan and premium.'],
  ['Pre-Authorisation Services', 'The authorisation process or call-centre service used to approve benefits before treatment where required.'],
  ['Pre-Existing Condition', 'A condition for which advice, diagnosis, or treatment was received before the inception date, subject to the applicable exclusion period.'],
  ['Premium', 'The monthly amount payable to keep the policy and its benefits active.'],
  ['Principal Member', 'The person who applies for and holds the policy.'],
  ['Spouse', 'The named spouse of the principal member covered under the policy where the selected option allows it.'],
  ['Waiting Period', 'The period after the inception date during which specified benefits are not yet payable.'],
]

function decodeSourceText(value) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/â€“|–|—/g, '-')
    .replace(/â€™|’/g, "'")
    .replace(/â€œ|“/g, '"')
    .replace(/â€|”/g, '"')
    .replace(/â€¦/g, '...')
    .replace(/ /g, ' ')
}

function normalizeParagraph(value) {
  return decodeSourceText(value)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractSection(markdown, startHeading, endHeading) {
  const escapedStart = startHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedEnd = endHeading ? endHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null
  const pattern = escapedEnd
    ? new RegExp(`## ${escapedStart}\\n\\n([\\s\\S]*?)\\n\\n## ${escapedEnd}`)
    : new RegExp(`## ${escapedStart}\\n\\n([\\s\\S]*)$`)

  const match = markdown.match(pattern)
  return match && match[1] ? match[1].trim() : ''
}

function parseBenefitsSection(markdown) {
  return [...markdown.matchAll(/### (.+)\n([\s\S]*?)(?=\n### |\n## |$)/g)].map((match) => ({
    title: normalizeParagraph(match[1]),
    content: normalizeParagraph(match[2]),
  }))
}

function parseBrochure(markdown) {
  const cleanMarkdown = decodeSourceText(markdown)
  const title = normalizeParagraph((cleanMarkdown.match(/^# (.+)$/m) || [])[1] || 'Policy Wording')
  const overviewSection = extractSection(cleanMarkdown, 'Overview', 'Benefits')
  const pricingSection = extractSection(cleanMarkdown, 'Pricing', 'Legal')
  const legalSection = extractSection(cleanMarkdown, 'Legal')
  const benefitsSection = extractSection(cleanMarkdown, 'Benefits', 'Pricing')
  const coverIncludesMatch = overviewSection.match(/\*\*Cover includes:\*\*\n([\s\S]*)/i)
  const coverIncludes = coverIncludesMatch
    ? coverIncludesMatch[1].split('\n').map((line) => line.replace(/^- /, '').trim()).filter(Boolean)
    : []
  const overview = normalizeParagraph(
    overviewSection
      .replace(/\*\*Cover includes:\*\*[\s\S]*/i, '')
      .replace(/\*\*Price range:\*\*\s*/i, 'Price range: ')
  )

  return {
    title,
    overview,
    coverIncludes,
    benefits: parseBenefitsSection(benefitsSection),
    pricing: normalizeParagraph(pricingSection),
    legal: normalizeParagraph(legalSection),
  }
}

function formatWaitingPeriod(days) {
  if (days === 365) return '12 month waiting period'
  if (days % 30 === 0) return `${days / 30} month waiting period`
  return `${days} day waiting period`
}

function normalizeExclusions(exclusions) {
  if (!exclusions) return []
  if (Array.isArray(exclusions)) return exclusions.map(String).map((value) => value.trim()).filter(Boolean)
  if (typeof exclusions === 'string') {
    try {
      const parsed = JSON.parse(exclusions)
      if (Array.isArray(parsed)) return parsed.map(String).map((value) => value.trim()).filter(Boolean)
    } catch {
      return exclusions.split('\n').map((value) => value.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
    }
  }
  return []
}

function dedupeByTitle(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = `${item.title}::${item.content}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildWaitingPeriodItems(benefits, productBenefits) {
  const fromBrochure = benefits
    .filter((benefit) => /waiting period|immediate cover/i.test(benefit.content))
    .map((benefit) => ({
      title: benefit.title,
      content: (benefit.content.match(/[^.]*?(waiting period applies|Immediate cover\.?)/gi) || [benefit.content]).join(' '),
    }))

  const fromBenefits = productBenefits
    .filter((benefit) => benefit.waiting_period_days || benefit.pre_existing_exclusion_days)
    .map((benefit) => {
      const parts = []
      if (benefit.waiting_period_days && benefit.waiting_period_days > 0) parts.push(formatWaitingPeriod(benefit.waiting_period_days))
      else parts.push('Immediate cover')
      if (benefit.pre_existing_exclusion_days && benefit.pre_existing_exclusion_days > 0) {
        parts.push(`Pre-existing conditions exclusion: ${formatWaitingPeriod(benefit.pre_existing_exclusion_days)}`)
      }
      return {
        title: benefit.name,
        content: `${benefit.description || benefit.name}. ${parts.join('. ')}.`,
      }
    })

  return dedupeByTitle(fromBrochure.concat(fromBenefits))
}

function buildGeneralConditionItems(benefits, brochure) {
  const items = benefits
    .filter((benefit) => /pre-authorisation|required|subject to|referral|network|plan members/i.test(benefit.content))
    .map((benefit) => ({ title: benefit.title, content: benefit.content }))

  if (brochure.legal) {
    items.push({ title: 'Regulatory and Membership Conditions', content: brochure.legal })
  }

  return dedupeByTitle(items)
}

function buildExclusionItems(benefits, productBenefits) {
  const brochureExclusions = benefits
    .filter((benefit) => /pre-existing|benefit only available|excludes|excluding|not available/i.test(benefit.content))
    .map((benefit) => ({ title: benefit.title, content: benefit.content }))

  const dbExclusions = productBenefits.flatMap((benefit) =>
    normalizeExclusions(benefit.exclusions).map((exclusion, index) => ({
      title: `${benefit.name} Exclusion ${index + 1}`,
      content: exclusion,
    }))
  )

  return dedupeByTitle(brochureExclusions.concat(dbExclusions))
}

function buildSectionRows(product, brochure, productBenefits) {
  const sections = {
    definitions: DEFAULT_DEFINITIONS.map(([title, content]) => ({ title, content })),
    'waiting-periods': buildWaitingPeriodItems(brochure.benefits, productBenefits),
    'general-provisions': [{
      title: `${brochure.title} Overview`,
      content: [brochure.overview, brochure.coverIncludes.length ? `Cover includes:\n- ${brochure.coverIncludes.join('\n- ')}` : '']
        .filter(Boolean)
        .join('\n\n'),
    }],
    'payment-premium': [{
      title: 'Pricing and Premium Table',
      content: brochure.pricing || `Monthly premium from the product record: ${product.monthly_premium || 'Not recorded'}`,
    }],
    'exclusions-limitations': buildExclusionItems(brochure.benefits, productBenefits),
    'general-conditions': buildGeneralConditionItems(brochure.benefits, brochure),
    'insuring-section': brochure.benefits.filter((benefit) => !/funeral/i.test(benefit.title)),
    'funeral-benefit': brochure.benefits.filter((benefit) => /funeral/i.test(benefit.title)),
    'critical-illness-definitions': brochure.benefits.filter((benefit) => /critical illness|cancer|heart attack|stroke|kidney failure|major organ/i.test(`${benefit.title} ${benefit.content}`)),
  }

  return Object.entries(sections).flatMap(([sectionType, items]) =>
    items
      .filter((item) => item.content && item.content.trim())
      .map((item, index) => ({
        product_id: product.id,
        section_type: sectionType,
        title: item.title || null,
        content: item.content.trim(),
        display_order: index + 1,
      }))
  )
}

async function buildRowsForProduct(product, productBenefits) {
  const fileName = BROCHURE_FILE_BY_SLUG[product.slug]
  if (!fileName) return []
  const brochurePath = path.join(__dirname, '..', 'public', 'brochures as text', fileName)
  const brochureText = await fs.readFile(brochurePath, 'utf8')
  return buildSectionRows(product, parseBrochure(brochureText), productBenefits)
}

async function main() {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id,name,slug,monthly_premium,status')
    .eq('status', 'published')
    .order('name')

  if (productsError) throw productsError

  for (const product of products || []) {
    const { count } = await supabase
      .from('policy_section_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', product.id)

    if ((count || 0) > 0) {
      console.log(`Skipping ${product.name} - already has ${count} policy section items`)
      continue
    }

    const { data: benefitRows, error: benefitsError } = await supabase
      .from('product_benefits')
      .select('name,description,waiting_period_days,pre_existing_exclusion_days,exclusions')
      .eq('product_id', product.id)

    if (benefitsError) throw benefitsError

    const rows = await buildRowsForProduct(product, benefitRows || [])
    if (rows.length === 0) {
      console.log(`No brochure mapping found for ${product.name}`)
      continue
    }

    const { error: insertError } = await supabase.from('policy_section_items').insert(rows)
    if (insertError) throw insertError

    console.log(`Backfilled ${rows.length} policy section items for ${product.name}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
