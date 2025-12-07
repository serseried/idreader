
(function() {
    if (window.__mrzPageInjectLoaded) return;
    window.__mrzPageInjectLoaded = true;

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

    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'mrz-fill-data' && e.data.payload) {

            fillGrid(e.data.payload);
            setTimeout(() => fillGrid(e.data.payload), 500);
        }
    });

    function fillGrid(sample) {
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

        const genderLower = (sample.gender || '').toLowerCase();
        const isMale = genderLower.includes('erkek') || genderLower.includes('male') ||
                       genderLower === 'm' || genderLower === 'bay';
        const isFemale = genderLower.includes('kadın') || genderLower.includes('kad') ||
                         genderLower.includes('female') || genderLower === 'f' || genderLower === 'bayan';
        const titleVal = isMale ? 'Mr' : isFemale ? 'Mrs' : '';

        if (rowNode?.setDataValue) {

            const updates = {
                ...(titleVal && { [COL.TITLE]: titleVal }),
                ...(sample.givenName && { [COL.FIRST_NAME]: sample.givenName }),
                ...(sample.surname && { [COL.LAST_NAME]: sample.surname }),
                ...(sample.nationality && { [COL.NATIONALITY]: sample.nationality }),
                ...(sample.personalNumber && { [COL.NATIONAL_ID]: sample.personalNumber }),
                // passport
                ...(sample.documentType === 'P' && sample.passportNumber && { [COL.PASSPORT]: sample.passportNumber })
            };
            for (const [k, v] of Object.entries(updates)) {

                rowNode.setDataValue(k, v);
            }

            if (sample.birthDate) {
                setTimeout(() => {

                    rowNode.setDataValue(COL.BIRTH_DATE, sample.birthDate);
                }, 300);
            }
        } else {

        }


        const genderCell = row.querySelector('[col-id="GENDER"], [colid="GENDER"]');
        if (!genderCell || !sample.gender) return;

        genderCell.tabIndex = 0;
        genderCell.focus({ preventScroll: true });
        genderCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        genderCell.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

        const trigger = genderCell.querySelector('mat-select .mat-mdc-select-trigger, .mat-mdc-select-trigger');
        if (trigger) trigger.click(); else genderCell.click();


        const genderSearchTerms = [];
        if (isMale) {
            genderSearchTerms.push('erkek', 'male', 'bay', 'm');
        } else if (isFemale) {
            genderSearchTerms.push('kadın', 'kadin', 'female', 'bayan', 'f');
        }

        const originalGender = sample.gender.trim().toLowerCase();
        if (originalGender && !genderSearchTerms.includes(originalGender)) {
            genderSearchTerms.unshift(originalGender);
        }

        const pickOption = attempt => {
            const panel = document.querySelector('.mat-mdc-select-panel');
            if (!panel) return attempt < 20 && setTimeout(() => pickOption(attempt + 1), 30);


            const options = Array.from(panel.querySelectorAll('mat-option'));
            let match = null;
            for (const term of genderSearchTerms) {
                match = options.find(o => o.textContent.trim().toLowerCase() === term);
                if (match) break;
            }
            if (match) {
                match.click();

                setTimeout(() => {
                    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                    document.body.click();
                }, 100);
            } else {

            }
        };
        setTimeout(() => pickOption(0), 50);
    }

})();
