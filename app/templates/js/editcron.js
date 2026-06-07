function loadCronSettings(computerName, wolSchedule, solSchedule, macAddress, schedulesPaused, excludedDays, vacationUntil, wolUntil, solUntil) {
  // Update header text in the drawer
  document.getElementById('cronSettingsDrawerLabel').innerHTML = `
    <div class="d-flex flex-column">
      <span style="font-size: 16px; font-weight: 700; color: var(--stripe-text-primary);">${computerName}</span>
      <span style="font-size: 12px; font-weight: 500; font-family: var(--bs-font-monospace); color: var(--stripe-text-secondary); margin-top: 2px;">${macAddress}</span>
    </div>
  `;

  const helpSection = `
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px dashed var(--stripe-border); font-size: 13px;">
      <div class="fw-bold mb-1" style="color: var(--stripe-text-primary);">Documentation & Helpers:</div>
      <div>- <a class="text-decoration-none fw-semibold" href="https://www.freetool.dev/crontab-generator/" target="_blank" rel="noopener noreferrer">Cron Schedule Expression Generator <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 10px;"></i></a></div>
    </div>
  `;

  // Render Schedule item or Builder form
  function getCronSection(type, activeSchedule, activeUntil, actionUrl) {
    if (activeSchedule) {
      return `
        <div class="cron-active-item">
          <span class="cron-active-label d-flex align-items-center">
            <i class="fa-solid ${type === 'wol' ? 'fa-circle-arrow-up text-success' : 'fa-circle-arrow-down text-danger'} me-2" style="font-size: 16px;"></i>
            <span>${type === 'wol' ? 'Wake' : 'Sleep'}:</span>
          </span>
          <span class="cron-active-val">${activeSchedule}</span>
          ${activeUntil ? `<span class="badge bg-secondary-subtle text-secondary border ms-2" style="font-size: 11px;">until ${activeUntil}</span>` : ''}
          <button class="row-action-btn delete ms-auto" type="button" title="Delete Schedule" onclick="deleteCron('${macAddress}', '${type}')">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>`;
    }

    const formHtml = `
      <div class="cron-builder-container py-2">
        <!-- Mode selector tabs -->
        <div class="btn-group w-100 mb-3" role="group">
          <input type="radio" class="btn-check" name="${type}_cron_mode" id="${type}_mode_simple" value="simple" checked onclick="toggleCronMode('${type}', 'simple')">
          <label class="btn btn-stripe-secondary py-1.5" for="${type}_mode_simple" style="font-size: 11px; font-weight: 600; width: 50%;">Simple Builder</label>
          
          <input type="radio" class="btn-check" name="${type}_cron_mode" id="${type}_mode_advanced" value="advanced" onclick="toggleCronMode('${type}', 'advanced')">
          <label class="btn btn-stripe-secondary py-1.5" for="${type}_mode_advanced" style="font-size: 11px; font-weight: 600; width: 50%;">Advanced (Cron)</label>
        </div>

        <form method="POST" action="${actionUrl}" id="${type}_cron_form" onsubmit="beforeCronSubmit('${type}')">
          <input type="hidden" name="mac_address" value="${macAddress}">
          <input type="hidden" name="cron_request" id="${type}_final_cron" value="">
          <input type="hidden" name="cron_until" id="${type}_final_until" value="">

          <!-- Simple Mode -->
          <div id="${type}_builder_simple" class="mb-3">
            <div class="form-group mb-3">
              <label class="form-label fw-semibold" style="font-size: 12.5px;">Trigger Time</label>
              <input type="time" class="form-control" id="${type}_time" value="09:00" onchange="buildCronExpression('${type}')">
            </div>
            
            <div class="form-group mb-3">
              <label class="form-label fw-semibold" style="font-size: 12.5px;">Trigger Days</label>
              <div class="day-pills-container" id="${type}_day_pills">
                <div class="day-pill active" data-val="1" onclick="toggleBuilderDayPill(this, '${type}')">Mon</div>
                <div class="day-pill active" data-val="2" onclick="toggleBuilderDayPill(this, '${type}')">Tue</div>
                <div class="day-pill active" data-val="3" onclick="toggleBuilderDayPill(this, '${type}')">Wed</div>
                <div class="day-pill active" data-val="4" onclick="toggleBuilderDayPill(this, '${type}')">Thu</div>
                <div class="day-pill active" data-val="5" onclick="toggleBuilderDayPill(this, '${type}')">Fri</div>
                <div class="day-pill" data-val="6" onclick="toggleBuilderDayPill(this, '${type}')">Sat</div>
                <div class="day-pill" data-val="0" onclick="toggleBuilderDayPill(this, '${type}')">Sun</div>
              </div>
            </div>
          </div>

          <!-- Advanced Mode -->
          <div id="${type}_builder_advanced" class="d-none mb-3">
            <div class="form-group">
              <label class="form-label fw-semibold" style="font-size: 12.5px;">Cron Expression</label>
              <input class="form-control font-monospace" type="text" id="${type}_raw_cron" placeholder="0 9 * * 1-5" oninput="buildCronExpression('${type}')">
            </div>
          </div>

          <!-- Expiry Duration -->
          <div class="form-group mb-3">
            <label class="form-label fw-semibold" style="font-size: 12.5px;">Active Duration</label>
            <select class="form-select" id="${type}_duration" onchange="updateCronDuration('${type}')">
              <option value="indefinite">Indefinitely</option>
              <option value="1d">For 1 day</option>
              <option value="3d">For 3 days</option>
              <option value="1w">For 1 week</option>
              <option value="2w">For 2 weeks</option>
              <option value="1m">For 1 month</option>
              <option value="3m">For 3 months</option>
              <option value="custom">Custom Date...</option>
            </select>
          </div>

          <!-- Custom End Date Selection -->
          <div class="form-group d-none mb-3" id="${type}_custom_date_container">
            <label class="form-label fw-semibold" style="font-size: 12.5px;">Expiry Date</label>
            <input type="date" class="form-control" id="${type}_custom_date" onchange="buildCronExpression('${type}')">
          </div>

          <!-- Live Preview -->
          <div class="mb-3 p-3 rounded border" id="${type}_preview_box" style="font-size: 12px; background-color: var(--stripe-bg); border-color: var(--stripe-border) !important;">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-secondary font-semibold">Cron:</span>
              <code id="${type}_preview_cron" style="font-weight: 700; color: var(--stripe-primary);">0 9 * * 1,2,3,4,5</code>
            </div>
            <div class="d-flex justify-content-between align-items-center d-none" id="${type}_preview_until_container">
              <span class="text-secondary font-semibold">Expires:</span>
              <strong id="${type}_preview_until" style="color: var(--stripe-text-primary);">Indefinite</strong>
            </div>
          </div>

          <button type="submit" class="btn-stripe-primary w-100 justify-content-center py-2">
            <i class="fa-solid fa-plus me-1"></i> Add Automation
          </button>
        </form>
      </div>`;

    if (type === 'sol') {
      return `
        <details class="cron-collapsible-section" style="border: none;">
          <summary class="fw-bold d-flex align-items-center justify-content-between py-2" style="font-size: 13px; color: var(--stripe-text-primary); cursor: pointer; list-style: none; user-select: none;">
            <div class="d-flex align-items-center gap-2">
              <i class="fa-solid fa-circle-arrow-down text-danger"></i>
              <span>Configure Sleep Automation</span>
            </div>
            <i class="fa-solid fa-chevron-down transition-transform summary-chevron" style="font-size: 11px; color: var(--stripe-text-secondary); transition: transform 0.2s ease;"></i>
          </summary>
          <div style="margin-top: 8px;">
            ${formHtml}
          </div>
        </details>`;
    }

    return `
      <div class="fw-bold mb-2" style="font-size: 13px; color: var(--stripe-text-primary); display: flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-circle-arrow-up text-success"></i>
        <span>Configure Wake Automation</span>
      </div>
      ${formHtml}`;
  }

  const wolSectionHtml = getCronSection('wol', wolSchedule, wolUntil, add_wol_cron_url);
  const solSectionHtml = getCronSection('sol', solSchedule, solUntil, add_sol_cron_url);

  const automationsSection = `
    <div class="drawer-section-title">Automations</div>
    <div class="drawer-card">
      <div style="display: flex; flex-direction: column; gap: 20px;">
        ${wolSectionHtml}
        <div style="height: 1px; background-color: var(--stripe-border); width: 100%;"></div>
        ${solSectionHtml}
      </div>
    </div>
  `;

  const excludedDaysList = excludedDays ? excludedDays.split(',') : [];

  const settingsSection = `
    <div class="drawer-section-title">Schedule Policies</div>
    <form id="scheduleSettingsForm" method="POST" action="/update_schedule_settings">
      <input type="hidden" name="mac_address" value="${macAddress}">
      
      <!-- Pause Schedules Switch -->
      <div class="drawer-card p-3 mb-3">
        <div class="form-check form-switch d-flex align-items-center justify-content-between p-0 m-0">
          <label class="form-check-label fw-semibold" for="schedules_paused" style="font-size: 14px; color: var(--stripe-text-primary); cursor: pointer;">Pause All Schedules</label>
          <input class="form-check-input m-0" type="checkbox" id="schedules_paused" name="schedules_paused" ${schedulesPaused ? 'checked' : ''} style="cursor: pointer; width: 36px; height: 18px;">
        </div>
      </div>
      
      <!-- Excluded Days Pills -->
      <div class="drawer-card mb-3">
        <label class="form-label fw-semibold mb-1" style="font-size: 14px; color: var(--stripe-text-primary);">Exclude Days</label>
        <div class="text-muted mb-3" style="font-size: 12px;">Exclude selected days from all scheduled cycles.</div>
        
        <!-- Hidden checkboxes for form submit -->
        <div class="d-none">
          <input type="checkbox" name="exclude_day" value="0" id="ex_mon" ${excludedDaysList.includes('0') ? 'checked' : ''}>
          <input type="checkbox" name="exclude_day" value="1" id="ex_tue" ${excludedDaysList.includes('1') ? 'checked' : ''}>
          <input type="checkbox" name="exclude_day" value="2" id="ex_wed" ${excludedDaysList.includes('2') ? 'checked' : ''}>
          <input type="checkbox" name="exclude_day" value="3" id="ex_thu" ${excludedDaysList.includes('3') ? 'checked' : ''}>
          <input type="checkbox" name="exclude_day" value="4" id="ex_fri" ${excludedDaysList.includes('4') ? 'checked' : ''}>
          <input type="checkbox" name="exclude_day" value="5" id="ex_sat" ${excludedDaysList.includes('5') ? 'checked' : ''}>
          <input type="checkbox" name="exclude_day" value="6" id="ex_sun" ${excludedDaysList.includes('6') ? 'checked' : ''}>
        </div>

        <div class="day-pills-container">
          <div class="day-pill ${excludedDaysList.includes('0') ? 'active' : ''}" onclick="toggleDayPill('ex_mon', this)">Mon</div>
          <div class="day-pill ${excludedDaysList.includes('1') ? 'active' : ''}" onclick="toggleDayPill('ex_tue', this)">Tue</div>
          <div class="day-pill ${excludedDaysList.includes('2') ? 'active' : ''}" onclick="toggleDayPill('ex_wed', this)">Wed</div>
          <div class="day-pill ${excludedDaysList.includes('3') ? 'active' : ''}" onclick="toggleDayPill('ex_thu', this)">Thu</div>
          <div class="day-pill ${excludedDaysList.includes('4') ? 'active' : ''}" onclick="toggleDayPill('ex_fri', this)">Fri</div>
          <div class="day-pill ${excludedDaysList.includes('5') ? 'active' : ''}" onclick="toggleDayPill('ex_sat', this)">Sat</div>
          <div class="day-pill ${excludedDaysList.includes('6') ? 'active' : ''}" onclick="toggleDayPill('ex_sun', this)">Sun</div>
        </div>
      </div>
      
      <!-- Vacation Mode -->
      <div class="drawer-card mb-4">
        <label for="vacation_until" class="form-label fw-semibold mb-1" style="font-size: 14px; color: var(--stripe-text-primary);">Vacation Mode</label>
        <div class="text-muted mb-3" style="font-size: 12px;">Pause schedules temporarily until the end of the selected date.</div>
        <div class="input-group">
          <input type="date" class="form-control" id="vacation_until" name="vacation_until" value="${vacationUntil || ''}">
          <button class="btn btn-stripe-secondary" type="button" onclick="document.getElementById('vacation_until').value = ''">Clear</button>
        </div>
      </div>
      
      <button type="submit" class="btn-stripe-primary w-100 justify-content-center py-2 mb-2">
        <i class="fa-solid fa-save me-1"></i> Save Policy Settings
      </button>
    </form>
  `;

  document.getElementById('cronSettingsContent').innerHTML = automationsSection + settingsSection + helpSection;

  // Initialize live cron preview compilers for forms not yet active
  if (!wolSchedule) buildCronExpression('wol');
  if (!solSchedule) buildCronExpression('sol');

  // Slide-in drawer
  openCronSettingsDrawer();
}

function toggleCronMode(type, mode) {
  const simpleDiv = document.getElementById(`${type}_builder_simple`);
  const advancedDiv = document.getElementById(`${type}_builder_advanced`);
  
  if (mode === 'simple') {
    simpleDiv.classList.remove('d-none');
    advancedDiv.classList.add('d-none');
  } else {
    simpleDiv.classList.add('d-none');
    advancedDiv.classList.remove('d-none');
  }
  buildCronExpression(type);
}

function toggleBuilderDayPill(element, type) {
  element.classList.toggle('active');
  buildCronExpression(type);
}

function updateCronDuration(type) {
  const durationVal = document.getElementById(`${type}_duration`).value;
  const customDateContainer = document.getElementById(`${type}_custom_date_container`);
  
  if (durationVal === 'custom') {
    customDateContainer.classList.remove('d-none');
  } else {
    customDateContainer.classList.add('d-none');
  }
  buildCronExpression(type);
}

function buildCronExpression(type) {
  const modeVal = document.querySelector(`input[name="${type}_cron_mode"]:checked`).value;
  let cronStr = '';

  if (modeVal === 'simple') {
    const timeVal = document.getElementById(`${type}_time`).value;
    if (!timeVal) return;
    const parts = timeVal.split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);

    const activePills = document.querySelectorAll(`#${type}_day_pills .day-pill.active`);
    let dayStr = '*';
    if (activePills.length > 0 && activePills.length < 7) {
      const dayValues = Array.from(activePills).map(pill => pill.getAttribute('data-val'));
      dayStr = dayValues.join(',');
    }
    cronStr = `${minute} ${hour} * * ${dayStr}`;
  } else {
    cronStr = document.getElementById(`${type}_raw_cron`).value || '* * * * *';
  }

  // Update hidden final input and preview box
  document.getElementById(`${type}_preview_cron`).textContent = cronStr;
  document.getElementById(`${type}_final_cron`).value = cronStr;

  // Handle active duration calculation
  const durationVal = document.getElementById(`${type}_duration`).value;
  let expiryDateStr = '';

  if (durationVal === 'custom') {
    expiryDateStr = document.getElementById(`${type}_custom_date`).value || '';
  } else if (durationVal !== 'indefinite') {
    const today = new Date();
    if (durationVal === '1d') {
      today.setDate(today.getDate() + 1);
    } else if (durationVal === '3d') {
      today.setDate(today.getDate() + 3);
    } else if (durationVal === '1w') {
      today.setDate(today.getDate() + 7);
    } else if (durationVal === '2w') {
      today.setDate(today.getDate() + 14);
    } else if (durationVal === '1m') {
      today.setMonth(today.getMonth() + 1);
    } else if (durationVal === '3m') {
      today.setMonth(today.getMonth() + 3);
    }

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    expiryDateStr = `${yyyy}-${mm}-${dd}`;
  }

  const previewCont = document.getElementById(`${type}_preview_until_container`);
  const previewText = document.getElementById(`${type}_preview_until`);
  
  if (expiryDateStr) {
    previewCont.classList.remove('d-none');
    previewText.textContent = expiryDateStr;
  } else {
    previewCont.classList.add('d-none');
    previewText.textContent = 'Indefinite';
  }
  document.getElementById(`${type}_final_until`).value = expiryDateStr;
}

function beforeCronSubmit(type) {
  // Sync last changes one final time
  buildCronExpression(type);
}

function toggleDayPill(checkboxId, element) {
  const checkbox = document.getElementById(checkboxId);
  checkbox.checked = !checkbox.checked;
  if (checkbox.checked) {
    element.classList.add('active');
  } else {
    element.classList.remove('active');
  }
}

function openCronSettingsDrawer() {
  document.getElementById('cronSettingsDrawerBackdrop').classList.add('show');
  document.getElementById('cronSettingsDrawer').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeCronSettingsDrawer() {
  document.getElementById('cronSettingsDrawerBackdrop').classList.remove('show');
  document.getElementById('cronSettingsDrawer').classList.remove('show');
  document.body.style.overflow = '';
}

// ESC key listener to dismiss drawer
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeCronSettingsDrawer();
  }
});

function deleteCron(macAddress, type) {
  const url = type === 'wol' ? delete_wol_cron_url : delete_sol_cron_url;

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'mac_address';
  input.value = macAddress;

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

document.addEventListener('DOMContentLoaded', function() {
  document.body.addEventListener('click', function(event) {
    const button = event.target.closest('.btn-configure-schedule');
    if (button) {
      const name = button.getAttribute('data-name');
      const wolSchedule = button.getAttribute('data-cron-wol-schedule') || '';
      const solSchedule = button.getAttribute('data-cron-sol-schedule') || '';
      const macAddress = button.getAttribute('data-mac-address');
      const schedulesPaused = button.getAttribute('data-schedules-paused') === 'true';
      const excludedDays = button.getAttribute('data-excluded-days') || '';
      const vacationUntil = button.getAttribute('data-vacation-until') || '';
      const wolUntil = button.getAttribute('data-cron-wol-until') || '';
      const solUntil = button.getAttribute('data-cron-sol-until') || '';

      loadCronSettings(name, wolSchedule, solSchedule, macAddress, schedulesPaused, excludedDays, vacationUntil, wolUntil, solUntil);
    }
  });
});
