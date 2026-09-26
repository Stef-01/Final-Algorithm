/** Today (or `d`) as YYYY-MM-DD in local time. toISOString() would give yesterday's date before
 * 10 am in Australia. */
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
