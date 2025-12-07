const scanInput = document.getElementById('scanInput');
const clearButton = document.getElementById('clearButton');
const statusMessage = document.getElementById('statusMessage');
const resultBody = document.getElementById('resultBody');

const fieldConfig = [
    { key: 'documentType', label: 'Document Type' },
    { key: 'issuingCountry', label: 'Issuing Country' },
    { key: 'surname', label: 'Surname' },
    { key: 'givenName', label: 'Given Name' },
    { key: 'passportNumber', label: 'Passport Number' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'birthDate', label: 'Birth Date' },
    { key: 'gender', label: 'Gender' },
    { key: 'expiryDate', label: 'Expiry Date' },
    { key: 'personalNumber', label: 'Personal Number' }
];

const MIN_SCAN_LENGTH = 30;

ensureRows();
scanInput.focus();

clearButton.addEventListener('click', handleClear);

let debounceTimer;
let lastParsedData = null;

scanInput.addEventListener('input', () => {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => handleParse('input'), 80);
});

scanInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        handleParse('scan');
    }
});

scanInput.addEventListener('paste', () => {
    setTimeout(() => handleParse('paste'), 0);
});

function handleParse(trigger) {
    const raw = scanInput.value;
    const trimmed = raw.trim();
    if (!trimmed) {
        setStatus('No scanner data detected yet.', 'error');
        updateResults(null);
        return;
    }

    if (trimmed.length < MIN_SCAN_LENGTH) {
        setStatus('Waiting for the scanner to finish...', 'info');
        return;
    }

    try {
        const parsed = parseMRZ(raw);
        lastParsedData = parsed;
        updateResults(parsed);
        setStatus(`Parsed successfully (${trigger}).`, 'success');
    } catch (error) {
        setStatus(`Parsing failed: ${error.message}`, 'error');
        updateResults(null);
        lastParsedData = null;
    }
}

function handleClear() {
    scanInput.value = '';
    updateResults(null);
    lastParsedData = null;
    setStatus('Cleared. Ready for a new scan.', 'info');
    scanInput.focus();
}


// Build injection code string - exactly like exampleInjection.js
function buildnsertCode(data) {
    return `(() => {
  const sample = {
    documentType: ${JSON.stringify(data.documentType || '')},
    givenName: ${JSON.stringify(data.givenName || '')},
    surname: ${JSON.stringify(data.surname || '')},
    nationality: ${JSON.stringify(data.nationality || '')},
    personalNumber: ${JSON.stringify(data.personalNumber || '')},
    passportNumber: ${JSON.stringify(data.passportNumber || '')},
    birthDate: ${JSON.stringify(data.birthDate || '')},
    gender: ${JSON.stringify(data.gender || '')}
  };

  const COL = {
    TITLE: 'TITLEID_TITLE',
    FIRST_NAME: 'NAME',
    LAST_NAME: 'LNAME',
    NATIONALITY: 'NATIONALITYID_NAMECODE',
    NATIONAL_ID: 'NATIONALIDNO',
    PASSPORT: 'PASSPORTNO',
    BIRTH_DATE: 'BIRTHDATE',
    GENDER: 'GENDER'
  };

  const row = document.querySelector('.ag-row.ag-row-selected, .ag-row.ag-row-focus');
  if (!row) return;
  const anyCell = row.querySelector('[col-id], [colid]');
  if (!anyCell) return;

  const findRowNodeFromCell = cell => {
    for (const name of Object.getOwnPropertyNames(cell)) {
      try {
        const v = cell[name];
        if (v?.rowNode) return v.rowNode;
        if (v?.rowCtrl?.rowNode) return v.rowCtrl.rowNode;
        if (v?.cellCtrl?.rowCtrl?.rowNode) return v.cellCtrl.rowCtrl.rowNode;
      } catch (_) {}
    }
    return null;
  };

  const rowNode = findRowNodeFromCell(anyCell);
  const titleVal = sample.gender.toLowerCase().includes('erkek') ? 'Mr'
                : sample.gender.toLowerCase().includes('kad')   ? 'Mrs'
                : '';

  // Fill via API except gender (set by select)
  if (rowNode?.setDataValue) {
    const updates = {
      ...(titleVal && { [COL.TITLE]: titleVal }),
      ...(sample.givenName && { [COL.FIRST_NAME]: sample.givenName }),
      ...(sample.surname && { [COL.LAST_NAME]: sample.surname }),
      ...(sample.nationality && { [COL.NATIONALITY]: sample.nationality }),
      ...(sample.personalNumber && { [COL.NATIONAL_ID]: sample.personalNumber }),
      // Only write passportNumber when document type is Passport (P)
      ...(sample.documentType === 'P' && sample.passportNumber && { [COL.PASSPORT]: sample.passportNumber })
    };
    for (const [k,v] of Object.entries(updates)) rowNode.setDataValue(k, v);
    if (sample.birthDate) setTimeout(() => rowNode.setDataValue(COL.BIRTH_DATE, sample.birthDate), 300);
  }

  // Gender via mat-select
  const genderCell = row.querySelector('[col-id="GENDER"], [colid="GENDER"]');
  if (!genderCell) return;

  genderCell.tabIndex = 0;
  genderCell.focus({ preventScroll: true });
  genderCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  genderCell.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

  const trigger = genderCell.querySelector('mat-select .mat-mdc-select-trigger, .mat-mdc-select-trigger');
  if (trigger) trigger.click(); else genderCell.click();

  const targetText = sample.gender.trim().toLowerCase();
  const pickOption = attempt => {
    const panel = document.querySelector('.mat-mdc-select-panel');
    if (!panel) return attempt < 20 && setTimeout(() => pickOption(attempt + 1), 30);

    // Find the mat-option element, not just the text
    const options = Array.from(panel.querySelectorAll('mat-option'));
    const match = options.find(o => o.textContent.trim().toLowerCase() === targetText);
    if (match) {
      match.click();
      // Close dropdown by pressing Escape
      setTimeout(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        document.body.click();
      }, 100);
    }
    else {
        
        }
  };
  setTimeout(() => pickOption(0), 50);
})();`;
}

// This function is no longer used but kept for reference
function fillGridInPage(sample) {

    
    const COL = {
        TITLE: 'TITLEID_TITLE',
        FIRST_NAME: 'NAME',
        LAST_NAME: 'LNAME',
        NATIONALITY: 'NATIONALITYID_NAMECODE',
        NATIONAL_ID: 'NATIONALIDNO',
        PASSPORT: 'PASSPORTNO',
        BIRTH_DATE: 'BIRTHDATE',
        GENDER: 'GENDER'
    };

    const row = document.querySelector('.ag-row.ag-row-selected, .ag-row.ag-row-focus');
    if (!row) {

        return;
    }

    const anyCell = row.querySelector('[col-id], [colid]');
    if (!anyCell) return;

    const findRowNodeFromCell = cell => {
        for (const name of Object.getOwnPropertyNames(cell)) {
            try {
                const v = cell[name];
                if (v?.rowNode) return v.rowNode;
                if (v?.rowCtrl?.rowNode) return v.rowCtrl.rowNode;
                if (v?.cellCtrl?.rowCtrl?.rowNode) return v.cellCtrl.rowCtrl.rowNode;
            } catch (_) {}
        }
        return null;
    };

    const rowNode = findRowNodeFromCell(anyCell);

    // Determine title from gender (Bay/Bayan)
    const genderLower = (sample.gender || '').toLowerCase();
    const titleVal = genderLower.includes('erkek') ? 'Bay'
                   : genderLower.includes('kad') ? 'Bayan'
                   : '';

    // Fill via API except gender (set by select)
    if (rowNode?.setDataValue) {

        const updates = {
            ...(titleVal && { [COL.TITLE]: titleVal }),
            ...(sample.givenName && { [COL.FIRST_NAME]: sample.givenName }),
            ...(sample.surname && { [COL.LAST_NAME]: sample.surname }),
            ...(sample.nationality && { [COL.NATIONALITY]: sample.nationality }),
            ...(sample.personalNumber && { [COL.NATIONAL_ID]: sample.personalNumber }),
            ...(sample.passportNumber && { [COL.PASSPORT]: sample.passportNumber })
        };
        for (const [k, v] of Object.entries(updates)) {

            rowNode.setDataValue(k, v);
        }
        // Birthdate LAST
        if (sample.birthDate) {
            setTimeout(() => {

                rowNode.setDataValue(COL.BIRTH_DATE, sample.birthDate);
            }, 300);
        }
    } else {

    }

    // Gender via mat-select (only for gender column)
    const genderCell = row.querySelector('[col-id="GENDER"], [colid="GENDER"]');
    if (!genderCell || !sample.gender) return;

    genderCell.tabIndex = 0;
    genderCell.focus({ preventScroll: true });
    genderCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    genderCell.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

    const trigger = genderCell.querySelector('mat-select .mat-mdc-select-trigger, .mat-mdc-select-trigger');
    if (trigger) trigger.click(); else genderCell.click();

    const targetText = sample.gender.trim().toLowerCase();
    const pickOption = attempt => {
        const panel = document.querySelector('.mat-mdc-select-panel');
        if (!panel) return attempt < 20 && setTimeout(() => pickOption(attempt + 1), 30);

        const options = Array.from(panel.querySelectorAll('mat-option .mdc-list-item__primary-text'));
        const match = options.find(o => o.textContent.trim().toLowerCase() === targetText);
        if (match) {

            match.click();
        } else {

        }
    };
    setTimeout(() => pickOption(0), 50);
}

function setStatus(message, state) {
    statusMessage.textContent = message;
    statusMessage.dataset.state = state;
}

function updateResults(data) {
    fieldConfig.forEach(({ key }) => {
        const cell = resultBody.querySelector(`[data-field="${key}"]`);
        if (!cell) {
            return;
        }
        cell.textContent = data ? data[key] || '-' : '-';
    });
}

function ensureRows() {
    if (resultBody.children.length) {
        return;
    }
    fieldConfig.forEach(({ key, label }) => {
        const row = document.createElement('tr');
        const labelCell = document.createElement('td');
        labelCell.textContent = label;
        const valueCell = document.createElement('td');
        valueCell.dataset.field = key;
        valueCell.textContent = '-';
        row.append(labelCell, valueCell);
        resultBody.appendChild(row);
    });
}
