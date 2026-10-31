// Server-side only. Read at call time so the runner can compare identical code.
export const textRepairEnabled = () => String(process.env.EIA_TEXT_REPAIR || '').toLowerCase() !== 'off';
