// Server-side only. Read at call time for identical-code comparisons.
export const typoRepairEnabled = () => String(process.env.EIA_REPAIR_G1 || '').toLowerCase() !== 'off';
export const placeInjectionEnabled = () => String(process.env.EIA_REPAIR_G2 || '').toLowerCase() !== 'off';
export const namedPartRestoreEnabled = () => String(process.env.EIA_REPAIR_G3 || '').toLowerCase() !== 'off';
