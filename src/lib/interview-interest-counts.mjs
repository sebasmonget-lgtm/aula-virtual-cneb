/** Presentation aliases only: never rewrite historical answers; count each family once. */
export function countInterviewInterests(rows, options) {
  return options.filter(option => option.id !== 'nature').map(({id,label}) => ({
    key:id,label,count:rows.filter(row => {
      const tags=row.details?.interest_tags ?? [];
      return id === 'plants' ? tags.includes('plants') || tags.includes('nature') : tags.includes(id);
    }).length,
  })).filter(item => item.count > 0);
}
