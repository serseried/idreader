
const SCAN_MIN_LENGTH = 30;
const SCAN_GAP_THRESHOLD = 120;
const SCAN_FINALIZE_DELAY = 60;

const GRID_TYPES = {
    AG_GRID: 'ag',
    KENDO_GRID: 'kendo'
};

const FIELD_MAPPINGS = {
    TITLE: 'TITLEID_TITLE',
    FIRST_NAME: 'NAME',
    LAST_NAME: 'LNAME',
    NATIONALITY: 'NATIONALITYID_NAMECODE',
    NATIONAL_ID: 'NATIONALIDNO',
    PASSPORT: 'PASSPORTNO',
    BIRTH_DATE: 'BIRTHDATE',
    GENDER: 'GENDER'
};

const GENDER_VALUES = {
    MALE: 'Erkek',
    FEMALE: 'Kadin'
};

const COUNTRY_OPTION_MAP = {
    TUR: 'Turkey (TUR)',
    USA: 'United States (USA)',
    CZE: 'Czech Republic (CZE)',
    HUN: 'Hungary (HUN)',
    AUT: 'Austria (AUT)',
    POL: 'Poland (POL)',
    CHE: 'Switzerland (CHE)',
    RUS: 'Russia (RUS)',
    ROU: 'Romania (ROU)',
    NLD: 'Netherlands (NLD)'
};

const GENDER_OPTION_MAP = {
    M: 'Erkek',
    MALE: 'Erkek',
    ERKEK: 'Erkek',
    F: 'Kadın',
    FEMALE: 'Kadın',
    KADIN: 'Kadın',
    X: 'Belirtilmemiş',
    OTHER: 'Belirtilmemiş'
};

const TITLE_VALUES = {
    MR: 'Bay',
    MRS: 'Bayan'
};

const scannerState = {
    buffer: '',
    timer: null,
    lastKeyTime: 0
};

function initializeScannerState() {
    scannerState.buffer = '';
    scannerState.timer = null;
    scannerState.lastKeyTime = 0;
}

function clearBufferTimer() {
    if (scannerState.timer) {
        clearTimeout(scannerState.timer);
        scannerState.timer = null;
    }
}

function resetScannerBuffer() {
    scannerState.buffer = '';
    scannerState.lastKeyTime = 0;
    clearBufferTimer();
}

function isTimestampExpired(currentTime, previousTime) {
    const timeDifference = currentTime - previousTime;
    return timeDifference > SCAN_GAP_THRESHOLD;
}

function isModifierKeyPressed(event) {
    return event.ctrlKey || event.altKey || event.metaKey;
}

function isEnterKey(keyValue) {
    return keyValue === 'Enter';
}

function isSingleCharacter(keyValue) {
    return keyValue.length === 1;
}

function isBufferComplete(bufferContent) {
    return bufferContent.length >= SCAN_MIN_LENGTH;
}

function containsNewline(text) {
    return text.includes('\n');
}

function appendToBuffer(character) {
    scannerState.buffer += character;
}

function updateLastKeyTime(timestamp) {
    scannerState.lastKeyTime = timestamp;
}

function scheduleBufferProcessing(callback, delay) {
    clearBufferTimer();
    scannerState.timer = setTimeout(callback, delay);
}

function handlePotentialScan(event) {
    if (isModifierKeyPressed(event)) {
        return;
    }

    const currentTimestamp = event.timeStamp;

    if (scannerState.lastKeyTime && isTimestampExpired(currentTimestamp, scannerState.lastKeyTime)) {
        resetScannerBuffer();
    }

    updateLastKeyTime(currentTimestamp);

    if (isEnterKey(event.key)) {
        if (!containsNewline(scannerState.buffer)) {
            appendToBuffer('\n');
            return;
        }

        if (isBufferComplete(scannerState.buffer)) {
            processScan(scannerState.buffer);
        }

        resetScannerBuffer();
        return;
    }

    if (isSingleCharacter(event.key)) {
        appendToBuffer(event.key);

        scheduleBufferProcessing(() => {
            if (isBufferComplete(scannerState.buffer)) {
                processScan(scannerState.buffer);
            }
            resetScannerBuffer();
        }, SCAN_FINALIZE_DELAY);
    }
}

function isFormField(element) {
    if (!element) {
        return false;
    }

    if (element.isContentEditable) {
        return true;
    }

    const tagName = element.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

function extractPastedText(clipboardData) {
    return clipboardData?.getData('text') || '';
}

function handlePaste(event) {
    if (isFormField(event.target)) {
        return;
    }

    const pastedText = extractPastedText(event.clipboardData);

    if (pastedText.length >= SCAN_MIN_LENGTH) {
        processScan(pastedText);
    }
}

function processScan(rawInput) {
    try {
        const parsedData = parseMRZ(rawInput);
        fillData(parsedData);
    } catch (error) {
        logParseWarning(rawInput, error);
    }
}

function logParseWarning(input, error) {

}

function findAgGridRow() {
    const selector = '.ag-row.ag-row-selected, .ag-row.ag-row-focus';
    return document.querySelector(selector);
}

function findKendoGridRow() {
    const selector = '.k-state-selected, .k-grid-edit-row';
    return document.querySelector(selector);
}

function findRowNodeFromCell(cell) {
    if (!cell) return null;
    for (const name of Object.getOwnPropertyNames(cell)) {
        try {
            const v = cell[name];
            if (v?.rowNode) return v.rowNode;
            if (v?.rowCtrl?.rowNode) return v.rowCtrl.rowNode;
            if (v?.cellCtrl?.rowCtrl?.rowNode) return v.cellCtrl.rowCtrl.rowNode;
        } catch (_) {}
    }
    return null;
}

function getActiveRow() {
    const agRow = findAgGridRow();
    if (agRow) {
        const anyCell = agRow.querySelector('[col-id], [colid]');
        const rowNode = findRowNodeFromCell(anyCell);
        return createRowReference(GRID_TYPES.AG_GRID, agRow, rowNode);
    }

    const kendoRow = findKendoGridRow();
    if (kendoRow) {
        return createRowReference(GRID_TYPES.KENDO_GRID, kendoRow, null);
    }

    return null;
}

function createRowReference(gridType, domNode, rowNode) {
    return {
        type: gridType,
        node: domNode,
        rowNode: rowNode
    };
}

function fillData1(fields) {
    const activeRow = getActiveRow();

    if (!activeRow) {
        logNoActiveRowWarning();
        return;
    }

    if (isAgGrid(activeRow.type)) {
        fillAgGridRow(activeRow.node, fields);
    } else {
        fillKendoRow(activeRow.node, fields);
    }
}
function fillData(fields) {
    window.postMessage({
        type: 'mrz-fill-data',
        payload: fields
    }, '*');

}


function logNoActiveRowWarning() {

}

function isAgGrid(gridType) {
    return gridType === GRID_TYPES.AG_GRID;
}

function handleRuntimeMessage(message, _sender, sendResponse) {
    if (message && message.type === 'mrzData' && message.payload) {

        
        sendResponse && sendResponse({ ok: true });
        return true;
    }
}

function injectFillScript(fields) {
    window.postMessage({
        type: 'mrz-fill-data',
        payload: fields
    }, '*');

}

function fillInPageContext(fields) {
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
    if (!row) return ;

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

    const genderLower = (fields.gender || '').toLowerCase();
    const titleVal = genderLower.includes('erkek') ? 'Bay'
                   : genderLower.includes('kad') ? 'Bayan'
                   : '';

    if (rowNode?.setDataValue) {

        if (titleVal) rowNode.setDataValue(COL.TITLE, titleVal);
        if (fields.givenName) rowNode.setDataValue(COL.FIRST_NAME, fields.givenName);
        if (fields.surname) rowNode.setDataValue(COL.LAST_NAME, fields.surname);
        if (fields.nationality) rowNode.setDataValue(COL.NATIONALITY, fields.nationality);
        if (fields.personalNumber) rowNode.setDataValue(COL.NATIONAL_ID, fields.personalNumber);
        if (fields.passportNumber) rowNode.setDataValue(COL.PASSPORT, fields.passportNumber);

        // Birthdate  delay
        if (fields.birthDate) {
            setTimeout(() => {
                rowNode.setDataValue(COL.BIRTH_DATE, fields.birthDate);

            }, 300);
        }
    } else {

    }

    const genderCell = row.querySelector('[col-id="GENDER"], [colid="GENDER"]');
    if (genderCell && fields.gender) {
        genderCell.tabIndex = 0;
        genderCell.focus({ preventScroll: true });
        genderCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        genderCell.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

        const trigger = genderCell.querySelector('mat-select .mat-mdc-select-trigger, .mat-mdc-select-trigger');
        if (trigger) trigger.click(); else genderCell.click();

        const targetText = fields.gender.trim().toLowerCase();
        const pickOption = attempt => {
            const panel = document.querySelector('.mat-mdc-select-panel');
            if (!panel) return attempt < 20 && setTimeout(() => pickOption(attempt + 1), 30);

            const options = Array.from(panel.querySelectorAll('mat-option .mdc-list-item__primary-text'));
            const match = options.find(o => o.textContent.trim().toLowerCase() === targetText);
            if (match) match.click();
        };
        setTimeout(() => pickOption(0), 50);
    }
}

if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
}

function getCellsByIndex(row) {
    return row.querySelectorAll('td');
}

function createCellMapping(index, value) {
    return {
        index: index,
        value: value
    };
}

function fillKendoRow2(row, fields) {
    const cells = getCellsByIndex(row);
    const cellMappings = buildKendoCellMappings(fields);

    processCellMappings(cells, cellMappings);
}
function fillKendoRow(row, fields) {
    const cells = getCellsByIndex(row);
    const cellMappings = buildKendoCellMappings(fields);

    const nonBirthMappings = [];
    let birthMapping = null;

    for (let i = 0; i < cellMappings.length; i++) {
        const m = cellMappings[i];
        if (m.value !== undefined && (m.colId === FIELD_MAPPINGS.BIRTH_DATE || String(m.value).toLowerCase().includes('birth') || i === 6 || i === 7)) {
        }
        if (m.index === 8) {
            birthMapping = m;
        } else {
            nonBirthMappings.push(m);
        }
    }

    processCellMappings(cells, nonBirthMappings);

    if (birthMapping && birthMapping.value !== undefined) {
        setTimeout(() => {
            processCellMappings(cells, [birthMapping]);
        }, 280);
    }
}

function buildKendoCellMappings(fields) {
    return [
        createCellMapping(3, fields.givenName),
        createCellMapping(4, fields.surname),
        createCellMapping(5, fields.nationality),
        createCellMapping(6, fields.personalNumber),
        createCellMapping(7, fields.passportNumber),
        createCellMapping(8, fields.birthDate),
        createCellMapping(9, fields.gender)
    ];
}

function processCellMappings(cells, mappings) {
    for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i];
        const cell = cells[mapping.index];

        if (isCellValid(cell, mapping.value)) {
            writeCellValue(cell, mapping.value);
        }
    }
}

function isCellValid(cell, value) {
    return cell && value !== undefined;
}

function createColumnMapping(columnId, value) {
    return {
        colId: columnId,
        value: value
    };
}

function buildGenderTitle(gender) {
    if (gender === GENDER_VALUES.MALE) {
        return TITLE_VALUES.MR;
    }

    if (gender === GENDER_VALUES.FEMALE) {
        return TITLE_VALUES.MRS;
    }

    return '';
}

function concatenateWithSeparator(parts, separator) {
    const validParts = [];

    for (let i = 0; i < parts.length; i++) {
        if (parts[i]) {
            validParts.push(parts[i]);
        }
    }

    let result = '';
    for (let i = 0; i < validParts.length; i++) {
        if (i > 0) {
            result += separator;
        }
        result += validParts[i];
    }

    return result;
}

function formatTitle(gender) {
    return buildGenderTitle(gender);
}

function buildAgGridColumnMappings(fields) {

    const title = formatTitle(fields.gender);

    return [
        createColumnMapping(FIELD_MAPPINGS.TITLE, title),
        createColumnMapping(FIELD_MAPPINGS.FIRST_NAME, fields.givenName),
        createColumnMapping(FIELD_MAPPINGS.LAST_NAME, fields.surname),
        createColumnMapping(FIELD_MAPPINGS.NATIONALITY, fields.nationality),
        createColumnMapping(FIELD_MAPPINGS.NATIONAL_ID, fields.personalNumber),
        createColumnMapping(FIELD_MAPPINGS.PASSPORT, fields.passportNumber),
        createColumnMapping(FIELD_MAPPINGS.BIRTH_DATE, formatDateToDDMMYYYY(fields.birthDate)),
            createColumnMapping(FIELD_MAPPINGS.GENDER, fields.gender)

    ];
}

function findCellByColumnId(row, columnId) {
    const selector = `[col-id="${columnId}"], [data-field="${columnId}"]`;
    return row.querySelector(selector);
}

function fillAgGridRow2(row, fields) {
    const columnMappings = buildAgGridColumnMappings(fields);

    for (let i = 0; i < columnMappings.length; i++) {
        const mapping = columnMappings[i];
        if (mapping.value === undefined) {
            continue;
        }

        const cell = findCellByColumnId(row, mapping.colId);
        if (!cell) {
            continue;
        }

        editAgGridCell(cell, mapping.value);
    }
}


function fillAgGridRow(rowNode, fields) {
    if (!gridApi || !rowNode?.data) {
        // fallback old method
        const mappings = buildAgGridColumnMappings(fields);
        for (const m of mappings) {
            if (m.value === undefined) continue;
            const cell = findCellByColumnId(rowNode, m.colId);
            if (cell) editAgGridCell(cell, m.value);
        }
        return;
    }

    const currentData = rowNode.data;
    const title = formatTitle(fields.gender);
    const birthDateValue = fields.birthDate ? formatDateToDDMMYYYY(fields.birthDate) : null;
    const genderValue = fields.gender;

    // s1
    if (title) rowNode.setDataValue(FIELD_MAPPINGS.TITLE, title);
    if (fields.givenName) rowNode.setDataValue(FIELD_MAPPINGS.FIRST_NAME, fields.givenName);
    if (fields.surname) rowNode.setDataValue(FIELD_MAPPINGS.LAST_NAME, fields.surname);
    if (fields.nationality) rowNode.setDataValue(FIELD_MAPPINGS.NATIONALITY, fields.nationality);
    if (fields.personalNumber) rowNode.setDataValue(FIELD_MAPPINGS.NATIONAL_ID, fields.personalNumber);
    if (fields.passportNumber) rowNode.setDataValue(FIELD_MAPPINGS.PASSPORT, fields.passportNumber);

    if (genderValue) {
        let domRow = null;
        if (typeof rowNode?.querySelector === 'function') {
            domRow = rowNode;
        } else if (rowNode?.rowIndex != null) {
            domRow =
                document.querySelector(`.ag-row[row-index="${rowNode.rowIndex}"]`) ||
                document.querySelector(`.ag-row[row-id="${rowNode.id}"]`);
        }
        if (!domRow) {
            domRow = document.querySelector('.ag-row.ag-row-selected, .ag-row.ag-row-focus');
        }
        const genderCell = domRow ? findCellByColumnId(domRow, FIELD_MAPPINGS.GENDER) : null;
        if (genderCell) {
            editAgGridCell(genderCell, genderValue);
        }
    }

    // s2
    if (birthDateValue) {
        setTimeout(() => {
            const step2Row = { ...currentData, [FIELD_MAPPINGS.BIRTH_DATE]: birthDateValue };
            gridApi.applyTransaction({ update: [step2Row] });

        }, 700); 
    }
}

function findInputElement(cell) {
    return cell.querySelector('input, textarea, select, .ag-input-field-input');
}

function editAgGridCell2(cell, value) {
    if (!cell || value === undefined) return;

    cell.setAttribute('tabindex', '0');
    cell.focus({ preventScroll: true });
    // cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
                        cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
                        cell.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
let attempts = 0;
    const tryWrite = (attempt) => {
        attempts++;
        const input = cell.querySelector('input, textarea, select, .ag-input-field-input');

            if (input) {
                setInputValue(input, value);

                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));

                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

                setTimeout(() => cell.blur(), 1000);
                return;
            }

        if (attempt < 15) {
            setTimeout(() => tryWrite(attempt + 1), 20);
            return;
        } else {
            const colId = cell.getAttribute('col-id') || cell.getAttribute('colid');
            const rowNode = cell.parentElement?.__agComponent?.rowNode;
            if (rowNode && colId) rowNode.setDataValue(colId, value);
        }

        setCellTextContent(cell, value);
        notifyCellValueChanged(cell);
    };

    setTimeout(() => tryWrite(0), 30);
}

function editAgGridCell(cell, value) {
    if (!cell || value === undefined) return;

    cell.tabIndex = 0;
    cell.focus({ preventScroll: true });

    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    cell.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

    let attempts = 0;
    const maxAttempts = 30;
    const colId = cell.getAttribute('col-id') || cell.getAttribute('colid');

    const tryWrite = () => {
        attempts++;
        const input = cell.querySelector('input, textarea, select, .ag-input-field-input, mat-input-element');

        if (input) {
            // pass angular
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
                                 Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
            if (nativeSetter) nativeSetter.call(input, value);
            else input.value = value;

            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // exit
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

            setTimeout(() => cell.blur(), 1000);
            return;
        }

        if (attempts < maxAttempts) {
            setTimeout(tryWrite, 30); 
        } else {
            const rowNode = cell.closest('.ag-row')?.__agComponent?.rowNode;
            if (rowNode && colId) {
                rowNode.setDataValue(colId, value);
            }
        }
    };

    let genderSelectResolved = false;
    if (colId === FIELD_MAPPINGS.GENDER) {
        const started = trySelectMatOptionInCell(cell, value, () => {
            genderSelectResolved = true;
        });
        if (started) {
            setTimeout(() => {
                if (!genderSelectResolved) {
                    tryWrite();
                }
            }, 400);
            return;
        }
    }

    setTimeout(tryWrite, 50);
}

function trySelectMatOptionInCell(cell, optionText, onSuccess) {
    if (!optionText) return false;

    const trigger = cell.querySelector('.mat-mdc-select-trigger, mat-select .mat-mdc-select-trigger');
    if (trigger) {
        trigger.click();
    } else {
        cell.click();
    }

    let attempts = 0;
    const maxAttempts = 20;
    const normalizedTarget = String(optionText).trim().toLowerCase();

    const pick = () => {
        const panel = document.querySelector('.mat-mdc-select-panel');
        if (!panel) {
            if (attempts++ < maxAttempts) {
                return setTimeout(pick, 25);
            }
            return;
        }

        const options = panel.querySelectorAll('mat-option .mdc-list-item__primary-text');
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const text = opt.textContent.trim().toLowerCase();
            if (text === normalizedTarget) {
                opt.click();
                onSuccess && onSuccess();
                setTimeout(() => cell.blur(), 200);
                return;
            }
        }
    };

    setTimeout(pick, 30);
    return true;
}

function notifyCellValueChanged(cell) {
    cell.dispatchEvent(new Event('input', { bubbles: true }));
    cell.dispatchEvent(new Event('change', { bubbles: true }));
}

function triggerInputEvent(element) {
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);
}

function triggerChangeEvent(element) {
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);
}

function setInputValue(input, value) {
    input.value = value;
    triggerInputEvent(input);
    triggerChangeEvent(input);
}

function setCellTextContent(cell, value) {

        let renderer = cell.querySelector('ang-key-value-renderer');

    if (renderer) {
        renderer.textContent = value;
        return;
    }

    renderer = document.createElement('ang-key-value-renderer');
    renderer.classList.add('ng-star-inserted');
    renderer.textContent = value;

    if (cell.childElementCount === 0) {
        cell.textContent = '';
    }

    cell.appendChild(renderer);
    
}

function findDialogRecordRoot() {
    return document.querySelector('.lazy-dialog-content ang-record');
}

function setElementFieldValue(root, elementFieldName, value) {
    if (value === undefined || value === null || value === '') return;

    const container = root.querySelector(
        `.element-container[element-field="${elementFieldName}"]`
    );
    if (!container) return;

    const lookupInput = container.querySelector('input.mat-mdc-autocomplete-trigger, input[role="combobox"].mat-mdc-input-element');
    if (lookupInput) {
        setLookupValue(lookupInput, value);
        return;
    }

    const input = container.querySelector('input[matinput], input.mat-mdc-input-element');
    if (input) {
        setInputValue(input, value);
        return;
    }

    const checkbox = container.querySelector('input[type="checkbox"]');
    if (checkbox) {
        const shouldBeChecked = !!value;
        if (checkbox.checked !== shouldBeChecked) {
            checkbox.checked = shouldBeChecked;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            checkbox.dispatchEvent(new Event('input', { bubbles: true }));
            checkbox.dispatchEvent(new Event('click', { bubbles: true }));
        }
        return;
    }

    const matSelect = container.querySelector('mat-select');
    if (matSelect) {
        const resolvedValue = resolveSelectValue(elementFieldName, value);
        setMatSelectValue(matSelect, resolvedValue);
        return;
    }
}

function setLookupValue(inputEl, value) {
    if (!inputEl || value === undefined || value === null || value === '') return;

    inputEl.focus();
    setInputValue(inputEl, value);

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    inputEl.dispatchEvent(enterEvent);
    inputEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));


    inputEl.dispatchEvent(new Event('blur', { bubbles: true }));
}

function resolveSelectValue(elementFieldName, rawValue) {
    if (!rawValue) return rawValue;
    const text = String(rawValue).trim();
    const upper = text.toUpperCase();

    if (elementFieldName === FIELD_MAPPINGS.NATIONALITY) {
        if (COUNTRY_OPTION_MAP[upper]) {
            return COUNTRY_OPTION_MAP[upper];
        }
        return text;
    }

    if (elementFieldName === FIELD_MAPPINGS.GENDER) {
        if (GENDER_OPTION_MAP[upper]) {
            return GENDER_OPTION_MAP[upper];
        }
        return text;
    }

    return text;
}


function setMatSelectValue(matSelect, optionText) {
    if (!optionText) return;

    const trigger = matSelect.querySelector('.mat-mdc-select-trigger');
    if (!trigger) return;

    trigger.click();

    setTimeout(() => {
        const panel = document.querySelector('.mat-mdc-select-panel');
        if (!panel) return;

        const options = panel.querySelectorAll('mat-option');
        const normalizedTarget = optionText.trim().toLowerCase();
        const isCode = /^[a-z]{3}$/i.test(optionText.trim());

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const rawText = option.textContent.trim();
            const text = rawText.toLowerCase();

            const matchesExact = text === normalizedTarget;
            const matchesContains = text.includes(normalizedTarget);
            const matchesCode = isCode && text.includes('(' + optionText.trim().toUpperCase() + ')');

            if (matchesExact || matchesCode || matchesContains) {
                option.click();
                break;
            }
        }
    }, 0);
}


function fillDialogForm(root, fields) {

    const title = formatTitle(fields.gender);
    setElementFieldValue(root, FIELD_MAPPINGS.TITLE, title);

    setElementFieldValue(root, FIELD_MAPPINGS.FIRST_NAME, fields.givenName);
    setElementFieldValue(root, FIELD_MAPPINGS.LAST_NAME, fields.surname);
    setElementFieldValue(root, FIELD_MAPPINGS.NATIONALITY, fields.nationality);
    setElementFieldValue(root, FIELD_MAPPINGS.NATIONAL_ID, fields.personalNumber);
    setElementFieldValue(root, FIELD_MAPPINGS.PASSPORT, fields.passportNumber);
    setElementFieldValue(root, FIELD_MAPPINGS.BIRTH_DATE, formatDateToDDMMYYYY(fields.birthDate));

    setElementFieldValue(root, FIELD_MAPPINGS.GENDER, fields.gender);

}

function formatDateToDDMMYYYY(rawDate) {
    if (!rawDate) return '';

    const str = String(rawDate).trim();
    if (!str) return '';

    const dotParts = str.split('.');
    if (dotParts.length === 3) {
        let [d, m, y] = dotParts.map(p => p.trim());

        if (!d || !m || !y) return str;

        d = d.padStart(2, '0');
        m = m.padStart(2, '0');

        if (y.length === 2) {
            y = '20' + y;
        }

        return `${d}.${m}.${y}`;
    }

    const normalized = str.replace(/\s+/g, '');

    let day, month, year;

    if (normalized.includes('-') || normalized.includes('/')) {
        const sep = normalized.includes('-') ? '-' : '/';
        const parts = normalized.split(sep);

        if (parts.length === 3) {
            const [p1, p2, p3] = parts;

            if (p1.length === 4) {
                year = p1;
                month = p2;
                day = p3;
            } else if (p3.length === 4) {
                day = p1;
                month = p2;
                year = p3;
            }
        }
    } else if (/^\d{8}$/.test(normalized)) {
        if (normalized.startsWith('19') || normalized.startsWith('20')) {
            year = normalized.slice(0, 4);
            month = normalized.slice(4, 6);
            day = normalized.slice(6, 8);
        } else {
            const yy = normalized.slice(0, 2);
            year = '20' + yy;
            month = normalized.slice(2, 4);
            day = normalized.slice(4, 6);
        }
    } else if (/^\d{6}$/.test(normalized)) {
        const yy = parseInt(normalized.slice(0, 2), 10);
        year = (yy < 50 ? 2000 + yy : 1900 + yy).toString();
        month = normalized.slice(2, 4);
        day = normalized.slice(4, 6);
    } else {
        return str;
    }

    if (!day || !month || !year) {
        return str;
    }

    day = day.padStart(2, '0');
    month = month.padStart(2, '0');

    return `${day}.${month}.${year}`;
}







function writeCellValue(cell, value) {
    const inputElement = findInputElement(cell);



    if (inputElement) {
        setInputValue(inputElement, value);
        return;
    }

    setCellTextContent(cell, value);
}

function registerKeydownListener() {
    document.addEventListener('keydown', handlePotentialScan, true);
}

function registerPasteListener() {
    document.addEventListener('paste', handlePaste, true);
}

function initializeEventListeners() {
    registerKeydownListener();
    registerPasteListener();
}

document.removeEventListener('keydown', handlePotentialScan, true);
document.removeEventListener('paste', handlePaste, true);

document.addEventListener('keydown', handlePotentialScan, true);
document.addEventListener('paste', handlePaste, true);

initializeEventListeners();


let gridApi = null;

function initAgGridApi() {
    const check = () => {
        const wrapper = document.querySelector('.ag-root-wrapper');
        if (wrapper && wrapper.__agGrid?.api) {
            gridApi = wrapper.__agGrid.api;
            gridApi.setGridOption('immutableData', true);
            gridApi.setGridOption('getRowId', params => {
                const d = params.data;
                return d.GUESTID?.toString() || d.id?.toString() || params.node.id;
            });
        } else {
            setTimeout(check, 300);
        }
    };
    check();
}

initAgGridApi();

function formatDateToISO(rawDate) {
    if (!rawDate) return null;

    const str = String(rawDate).trim();
    if (!str) return null;

    // Already ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }

    // DD.MM.YYYY format
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(str)) {
        const [d, m, y] = str.split('.');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // DD/MM/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        const [d, m, y] = str.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // YYYY-MM-DD (1980-02-01)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.substring(0, 10);
    }

    return str;
}

function fillAgGridRow(domRow, _rowNodeParam, fields) {
    const anyCell = domRow.querySelector('[col-id], [colid]');
    if (!anyCell) {

        return;
    }

    const rowNode = findRowNodeFromCell(anyCell);

    const titleVal = formatTitle(fields.gender);
    const birthDateISO = formatDateToISO(fields.birthDate);
    const genderVal = fields.gender;

    if (!rowNode?.setDataValue) {

        const mappings = buildAgGridColumnMappings(fields);
        for (const m of mappings) {
            if (m.value === undefined) continue;
            const cell = findCellByColumnId(domRow, m.colId);
            if (cell) editAgGridCell(cell, m.value);
        }
        return;
    }


    
    if (titleVal) rowNode.setDataValue(FIELD_MAPPINGS.TITLE, titleVal);
    if (fields.givenName) rowNode.setDataValue(FIELD_MAPPINGS.FIRST_NAME, fields.givenName);
    if (fields.surname) rowNode.setDataValue(FIELD_MAPPINGS.LAST_NAME, fields.surname);
    if (fields.nationality) rowNode.setDataValue(FIELD_MAPPINGS.NATIONALITY, fields.nationality);
    if (fields.personalNumber) rowNode.setDataValue(FIELD_MAPPINGS.NATIONAL_ID, fields.personalNumber);
    if (fields.passportNumber) rowNode.setDataValue(FIELD_MAPPINGS.PASSPORT, fields.passportNumber);
    if (genderVal) rowNode.setDataValue(FIELD_MAPPINGS.GENDER, genderVal);

    if (birthDateISO) {
        setTimeout(() => {

            rowNode.setDataValue(FIELD_MAPPINGS.BIRTH_DATE, birthDateISO);

        }, 300);
    }
}
