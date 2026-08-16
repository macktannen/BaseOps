/**
 * Unified schedule management service for CrewSchedules
 * Normalizes date keys, multi-variant person matching, and Firestore synchronization.
 */

/**
 * Gets the duty status for a person on a specific date (YYYY-MM-DD)
 */
export function getPersonStatusForDate(schedulesObj, person, dateStr) {
  if (!schedulesObj || !person || !dateStr) return '';
  const dateSuffix = `_${dateStr}`;
  const pId = person.id ? String(person.id) : '';
  const pName = person.name ? String(person.name) : '';

  // 1. Direct key lookups
  if (pId && schedulesObj[`${pId}_${dateStr}`]) {
    const s = schedulesObj[`${pId}_${dateStr}`];
    return (s && s !== 'Clear') ? s : '';
  }
  if (pName && schedulesObj[`${pName}_${dateStr}`]) {
    const s = schedulesObj[`${pName}_${dateStr}`];
    return (s && s !== 'Clear') ? s : '';
  }

  // 2. Scan keys matching date suffix
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

/**
 * Removes all scheduled status entries for a person on a date
 */
export function removePersonStatusForDate(schedulesObj, personId, dateStr, personnelList = []) {
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

/**
 * Sets or clears the status for a person on a date
 */
export function setPersonStatusForDate(schedulesObj, personId, dateStr, status, personnelList = []) {
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
