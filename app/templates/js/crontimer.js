function getNextOccurrence(cronStr, fromDate, excludedDaysStr, vacationStr, expiryStr) {
  const parts = cronStr.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [minPat, hourPat, domPat, monthPat, dowPat] = parts;

  // Excluded weekdays: map OTWOL (0=Mon, ..., 6=Sun)
  const excludedList = excludedDaysStr ? excludedDaysStr.split(',').map(x => x.trim()).filter(Boolean) : [];

  // Parse vacation until date
  let vacationEnd = null;
  if (vacationStr) {
    const [vY, vM, vD] = vacationStr.split('-').map(Number);
    // Vacation mode is active until the end of this day
    vacationEnd = new Date(vY, vM - 1, vD, 23, 59, 59, 999);
  }

  // Parse expiry date
  let expiryTime = null;
  if (expiryStr) {
    const [eY, eM, eD] = expiryStr.split('-').map(Number);
    // Active duration is valid until the end of this day
    expiryTime = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
  }

  function matches(val, pat, minVal, maxVal, isDow = false) {
    function partMatches(v, p) {
      if (p === '*') return true;
      if (isDow) {
        if (v === 0 && (p === '7' || p === '0')) return true;
        if (v === 7 && (p === '7' || p === '0')) return true;
      }
      
      if (p.includes('/')) {
        const [left, stepStr] = p.split('/');
        const step = parseInt(stepStr, 10);
        let start = minVal;
        let end = maxVal;
        if (left !== '*') {
          if (left.includes('-')) {
            const [s, e] = left.split('-').map(Number);
            start = s;
            end = e;
          } else {
            start = parseInt(left, 10);
          }
        }
        return v >= start && v <= end && (v - start) % step === 0;
      }
      
      if (p.includes('-')) {
        const [s, e] = p.split('-').map(Number);
        return v >= s && v <= e;
      }
      
      return parseInt(p, 10) === v;
    }

    return pat.split(',').some(p => partMatches(val, p));
  }

  let curr = new Date(fromDate.getTime());
  curr.setSeconds(0, 0);
  curr.setMinutes(curr.getMinutes() + 1); // Start search from next minute

  // Loop at most 20,000 times (roughly 14 days of minute increments, or 50+ years of day/month jumps)
  for (let i = 0; i < 20000; i++) {
    // 1. Expiry check
    if (expiryTime && curr > expiryTime) {
      return null; // Expired
    }

    // 2. Vacation check
    if (vacationEnd && curr <= vacationEnd) {
      // Jump to the start of the day after vacation ends
      curr = new Date(vacationEnd.getTime() + 1000); // 1s past end -> next day
      curr.setHours(0, 0, 0, 0);
      continue;
    }

    // 3. Excluded days check
    const jsDay = curr.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const otwolWeekday = (jsDay === 0) ? 6 : jsDay - 1; // 0=Mon, ..., 6=Sun
    if (excludedList.includes(String(otwolWeekday))) {
      // Jump to next day
      curr.setDate(curr.getDate() + 1);
      curr.setHours(0, 0, 0, 0);
      continue;
    }

    // 4. Month match
    const month = curr.getMonth() + 1; // 1-12
    if (!matches(month, monthPat, 1, 12)) {
      curr.setMonth(curr.getMonth() + 1);
      curr.setDate(1);
      curr.setHours(0, 0, 0, 0);
      continue;
    }

    // 5. Day of month match
    const dom = curr.getDate();
    if (!matches(dom, domPat, 1, 31)) {
      curr.setDate(curr.getDate() + 1);
      curr.setHours(0, 0, 0, 0);
      continue;
    }

    // 6. Day of week match
    if (!matches(jsDay, dowPat, 0, 7, true)) {
      curr.setDate(curr.getDate() + 1);
      curr.setHours(0, 0, 0, 0);
      continue;
    }

    // 7. Hour match
    const hour = curr.getHours();
    if (!matches(hour, hourPat, 0, 23)) {
      curr.setHours(curr.getHours() + 1);
      curr.setMinutes(0, 0, 0);
      continue;
    }

    // 8. Minute match
    const min = curr.getMinutes();
    if (!matches(min, minPat, 0, 59)) {
      curr.setMinutes(curr.getMinutes() + 1);
      continue;
    }

    // All match!
    return curr;
  }
  return null;
}

function updateTimers() {
  const now = new Date();
  const timerElements = document.querySelectorAll('.schedule-badge[data-cron-expr]');

  timerElements.forEach(badge => {
    const cronStr = badge.getAttribute('data-cron-expr');
    const paused = badge.getAttribute('data-paused') === 'true';
    const excludedStr = badge.getAttribute('data-excluded');
    const vacationStr = badge.getAttribute('data-vacation');
    const expiryStr = badge.getAttribute('data-expiry');
    const timerValSpan = badge.querySelector('.cron-timer-val');

    if (!timerValSpan) return;

    if (paused) {
      timerValSpan.textContent = ' (paused)';
      return;
    }

    const nextDate = getNextOccurrence(cronStr, now, excludedStr, vacationStr, expiryStr);

    if (!nextDate) {
      timerValSpan.textContent = ' (expired)';
      return;
    }

    const diffMs = nextDate - now;
    if (diffMs <= 0) {
      timerValSpan.textContent = ' (due)';
      return;
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMins = String(mins).padStart(2, '0');

    timerValSpan.textContent = ` (in ${formattedHours}:${formattedMins})`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateTimers();
  setInterval(updateTimers, 30000);
});
