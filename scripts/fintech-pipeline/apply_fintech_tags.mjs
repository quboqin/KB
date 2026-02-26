#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.env.HOME, 'magic/KB');
const DIR = path.join(ROOT, 'src/content/posts/fintech');

const TAGS = {
  'payment-system-architecture.mdx': ['fintech', '支付'],
  'payment-clearing-recon-accounting-overview.mdx': ['fintech', '支付'],
  'trade-clearing-settlement-recon-one-graphic.mdx': ['fintech', '支付'],
  'acquiring-business-deep-dive.mdx': ['fintech', '支付'],
  'acquiring-business-interactions-2.mdx': ['fintech', '支付'],

  'bank-card-business-overview.mdx': ['fintech', '银行卡', '支付'],

  'guarantee-assist-loan-credit-reporting.mdx': ['fintech', '融担', '借贷', '风险'],
  'china-india-financing-guarantee-comparison.mdx': ['fintech', '融担', '风险'],

  'apr-vs-irr-in-lending.mdx': ['fintech', '借贷'],
  'kredivo-card-bnpl-deep-dive.mdx': ['fintech', '借贷'],
  'compliant-lending-credit-architecture.mdx': ['fintech', '借贷', '风险'],

  'in-loan-management-silent-war.mdx': ['fintech', '借贷', '风险'],
  'mob-vintage-explained.mdx': ['fintech', '借贷', '风险'],
  'seven-day-product-in-indonesia.mdx': ['fintech', '借贷', '风险'],
};

function uniq(arr) {
  return [...new Set(arr)];
}

async function main() {
  const files = (await fs.readdir(DIR)).filter(f => f.endsWith('.mdx'));
  for (const f of files) {
    const full = path.join(DIR, f);
    let s = await fs.readFile(full, 'utf8');
    if (!s.startsWith('---')) continue;
    const tags = TAGS[f];
    if (!tags) continue;
    const line = `tags: [${uniq(tags).map(t => `"${t}"`).join(', ')}]`;
    if (/\ntags:\s*\[[^\]]*\]\n/.test(s)) {
      s = s.replace(/\ntags:\s*\[[^\]]*\]\n/, `\n${line}\n`);
    } else {
      // insert before draft
      s = s.replace(/\ndraft:\s*(true|false)\n/, `\n${line}\n\ndraft: $1\n`);
    }
    await fs.writeFile(full, s, 'utf8');
  }
  console.log('ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
