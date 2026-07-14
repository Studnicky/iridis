export function complianceBadgeColor(compliance: string): 'success' | 'primary' | 'neutral' {
  if (compliance.includes('AAA')) {return 'success';}
  if (compliance.includes('AA')) {return 'primary';}
  return 'neutral';
}
