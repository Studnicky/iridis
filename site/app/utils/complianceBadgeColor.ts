/** 'fail' and 'n/a' (a structural role the table can't meaningfully grade —
 * see RolesTable.vue's isStructuralRole) both fall through to 'neutral':
 * neither reads as an achievement, and 'n/a' in particular must never read
 * as alarming the way a red/error badge would for a role that was never a
 * text pairing in the first place. */
export function complianceBadgeColor(compliance: string): 'success' | 'primary' | 'neutral' {
  if (compliance.includes('AAA')) {return 'success';}
  if (compliance.includes('AA')) {return 'primary';}
  return 'neutral';
}
