export type Schedules = Record<string, string>;

interface PersonLike {
  id?: string;
  name?: string;
}

export function getPersonStatusForDate(
  schedulesObj: Schedules | null | undefined,
  person: PersonLike | null | undefined,
  dateStr: string | null | undefined
): string {
  if (!schedulesObj || !person || !dateStr) return '';
  const dateSuffix = `_${dateStr}`;
  const pId = person.id ? String(person.id) : '';
  const pName = person.name ? String(person.name) : '';

  if (pId && schedulesObj[`${pId}_${dateStr}`]) {
    const s = schedulesObj[`${pId}_${dateStr}`];
    return (s && s !== 'Clear') ? s : '';
  }
  if (pName && schedulesObj[`${pName}_${dateStr}`]) {
    const s = schedulesObj[`${pName}_${dateStr}`];
    return (s && s !== 'Clear') ? s : '';
  }

  for (const [k, status] of Object.entries(schedulesObj)) {
    if (!status || status === 'Clear') continue;
    if (k.endsWith(dateSuffix) || k.includes(dateStr)) {
      const rawId = k.includes(dateSuffix) ? k.substring(0, k.lastIndexOf(dateSuffix)) : k.split('_')[0];
      if (rawId === pId || rawId === pName || (pId && String(rawId) === pId)) {
        return status;
      }
    }
  }
  return '';
}

export function removePersonStatusForDate(
  schedulesObj: Schedules | null | undefined,
  personId: string | null | undefined,
  dateStr: string | null | undefined,
  personnelList: PersonLike[] = []
): Schedules {
  if (!schedulesObj || !dateStr) return schedulesObj || {};
  const target = personnelList.find(p => String(p.id) === String(personId) || p.name === personId);
  const targetId = target?.id ? String(target.id) : (personId ? String(personId) : '');
  const targetName = target?.name ? String(target.name) : (personId ? String(personId) : '');
  const dateSuffix = `_${dateStr}`;

  const updated = { ...schedulesObj };
  Object.keys(updated).forEach(k => {
    if (k.endsWith(dateSuffix) || k.includes(dateStr)) {
      const rawId = k.includes(dateSuffix) ? k.substring(0, k.lastIndexOf(dateSuffix)) : k.split('_')[0];
      if (
        rawId === targetId || 
        rawId === targetName || 
        (targetId && String(rawId) === targetId) || 
        (targetName && rawId === targetName) ||
        (personId && String(rawId) === String(personId))
      ) {
        delete updated[k];
      }
    }
  });
  return updated;
}

export function setPersonStatusForDate(
  schedulesObj: Schedules | null | undefined,
  personId: string | null | undefined,
  dateStr: string | null | undefined,
  status: string | null | undefined,
  personnelList: PersonLike[] = []
): Schedules {
  const cleaned = removePersonStatusForDate(schedulesObj, personId, dateStr, personnelList);
  if (!status || status === 'Clear') {
    return cleaned;
  }
  const target = personnelList.find(p => String(p.id) === String(personId) || p.name === personId);
  const canonicalId = target?.id || personId;
  const canonicalKey = `${canonicalId}_${dateStr}`;
  cleaned[canonicalKey] = status;
  return cleaned;
}
