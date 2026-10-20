const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const INPUT_DIR = path.join(__dirname, '..', 'docs', 'collection', 'eft payment groups');

const ALIASES = {
  buddycentralmanagement: 'Buddy',
  buddystaff: 'Buddy',
  kmg: 'Konika Minolta',
  legalgeneral: 'Legal and General',
  redalert: 'Red Alert',
  redalertsecurity: 'Red Alert',
  tcsmeltersday1: 'TC Smelters',
  tfd: 'TFD Network',
  afrit: 'Afrit',
  aogheadoffice: 'AOG Head Office',
  aoglimpopo: 'AOG Limpopo',
  aogwesternreef: 'AOG Western Reef',
  actomswitchgear: 'Actom Switchgear',
  almarinvestment: 'Almar Investments',
  bidvest: 'Bidvest',
  coactivate: 'Coactivate',
  globalprecast: 'Global Precast',
  healthwealthgroup: 'Health Wealth Group',
  jgelectronics: 'JG Electronics',
  lbxgroup: 'LBX Group',
  neweralifeinsurance: 'New Era Life Insurance',
  partnershairdesign: 'Partners Hair Design',
  pioneerplastic: 'Pioneer Plastics',
  primediainstore: 'Primedia Instore',
  primediaoutdoor: 'Primedia Outdoor',
  prydetrusses: 'Pryde Trusses',
  rgsheetmetal: 'R&G Sheet Metal',
  rovos: 'Rovos Rail Tours',
  sanitech: 'Sanitech',
  sdl: 'SDL',
  spheros: 'Spheros',
  steelpoort: 'Steelpoort',
  stellenboschblinds: 'Stellenbosch Blinds',
  tshenoloodandcrew: 'Tshenolo Insurance Brokers',
  zutari: 'Zutari',
};

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function parseWorkbookLabel(a1Value, fileName) {
  const fromA1 = String(a1Value || '')
    .split(/\r?\n/)
    .pop()
    .trim();

  const fromFile = path
    .basename(fileName, path.extname(fileName))
    .replace(/\b(february|january|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/ig, '')
    .replace(/\bbilling(?:_revised)?\b/ig, '')
    .replace(/\bday1\b/ig, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return [fromA1, fromFile].filter(Boolean);
}

function getMemberStats(rows) {
  let memberCount = 0;
  let totalPremium = 0;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const firstCell = row[0];
    const memberNumber = String(firstCell || '').trim();
    if (!/^[A-Z]{2,}\d+$/i.test(memberNumber)) continue;

    const premiumRaw = row[5];
    const premium = typeof premiumRaw === 'number'
      ? premiumRaw
      : parseFloat(String(premiumRaw || '').replace(/,/g, '').replace(/\s/g, '')) || 0;

    memberCount += 1;
    totalPremium += premium;
  }

  return {
    memberCount,
    totalPremium: Number(totalPremium.toFixed(2)),
  };
}

function scoreCandidate(candidate, group) {
  const candidateNorm = normalize(candidate);
  if (!candidateNorm) return 0;

  const groupNorms = [
    normalize(group.group_name),
    normalize(group.company_name),
    normalize(group.group_code),
  ].filter(Boolean);

  if (groupNorms.includes(candidateNorm)) return 100;

  let best = 0;
  for (const groupNorm of groupNorms) {
    if (!groupNorm) continue;
    if (candidateNorm.includes(groupNorm) || groupNorm.includes(candidateNorm)) {
      const overlap = Math.min(candidateNorm.length, groupNorm.length) / Math.max(candidateNorm.length, groupNorm.length);
      best = Math.max(best, 80 + Math.round(overlap * 15));
    }
  }

  const candidateTokens = candidateNorm.match(/[a-z]+|[0-9]+/g) || [];
  const groupTokens = new Set(
    groupNorms
      .flatMap((value) => (value.match(/[a-z]+|[0-9]+/g) || []))
  );

  const overlapCount = candidateTokens.filter((token) => groupTokens.has(token)).length;
  best = Math.max(best, overlapCount * 10);

  return best;
}

function resolveGroupMatch(candidates, groups) {
  const aliasGroupName = candidates
    .map((candidate) => ALIASES[normalize(candidate)])
    .find(Boolean);

  if (aliasGroupName) {
    const exactAliasMatch = groups.find(
      (group) =>
        normalize(group.group_name) === normalize(aliasGroupName) ||
        normalize(group.company_name) === normalize(aliasGroupName) ||
        normalize(group.group_code) === normalize(aliasGroupName)
    );

    if (exactAliasMatch) return exactAliasMatch;
  }

  let best = null;
  let bestScore = 0;

  for (const group of groups) {
    const score = Math.max(...candidates.map((candidate) => scoreCandidate(candidate, group)));
    if (score > bestScore) {
      best = group;
      bestScore = score;
    }
  }

  return bestScore >= 70 ? best : null;
}

async function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    throw new Error(`Input folder not found: ${INPUT_DIR}`);
  }

  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((file) => file.toLowerCase().endsWith('.xlsx'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log('No workbook files found.');
    return;
  }

  const { data: groups, error: groupsError } = await supabase
    .from('payment_groups')
    .select('id, group_name, company_name, group_code, total_members, total_monthly_premium');

  if (groupsError) throw groupsError;

  const updates = [];
  const unmatched = [];

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const candidates = parseWorkbookLabel(sheet.A1 && sheet.A1.v, file);
    const group = resolveGroupMatch(candidates, groups);
    const stats = getMemberStats(rows);

    if (!group) {
      unmatched.push({ file, candidates, stats });
      continue;
    }

    updates.push({
      file,
      groupName: group.group_name,
      memberCount: stats.memberCount,
      totalPremium: stats.totalPremium,
    });

    const { error } = await supabase
      .from('payment_groups')
      .update({
        total_members: stats.memberCount,
        total_monthly_premium: stats.totalPremium,
      })
      .eq('id', group.id);

    if (error) {
      throw new Error(`Failed updating ${group.group_name} from ${file}: ${error.message}`);
    }
  }

  console.log('Updated payment groups:');
  for (const update of updates) {
    console.log(`- ${update.groupName}: ${update.memberCount} members, R${update.totalPremium.toFixed(2)} (${update.file})`);
  }

  if (unmatched.length > 0) {
    console.log('\nUnmatched files:');
    for (const item of unmatched) {
      console.log(`- ${item.file} => ${item.candidates.join(' | ')} (${item.stats.memberCount} members, R${item.stats.totalPremium.toFixed(2)})`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
