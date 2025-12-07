(() => {
    const CHAR_MAPPINGS = {
        ANGLE_BRACKET: '<',
        SPACE: ' ',
        EMPTY: '',
        NEWLINE: '\n',
        DOUBLE_ANGLE: '<<'
    };

    const DOCUMENT_FORMATS = {
        PASSPORT_LINE_LENGTH: 44,
        ID_CARD_LINE_LENGTH: 30,
        PASSPORT_TOTAL_LENGTH: 88,
        ID_CARD_TOTAL_LENGTH: 90,
        MIN_LINE_COUNT: 2,
        ID_CARD_LINE_COUNT: 3
    };

    const FIELD_POSITIONS = {
        PASSPORT: {
            LINE1_DOC_TYPE_START: 0,
            LINE1_DOC_TYPE_END: 2,
            LINE1_COUNTRY_START: 2,
            LINE1_COUNTRY_END: 5,
            LINE1_NAME_START: 5,
            LINE2_PASSPORT_START: 0,
            LINE2_PASSPORT_END: 9,
            LINE2_NATIONALITY_START: 10,
            LINE2_NATIONALITY_END: 13,
            LINE2_BIRTH_START: 13,
            LINE2_BIRTH_END: 19,
            LINE2_GENDER_POS: 20,
            LINE2_EXPIRY_START: 21,
            LINE2_EXPIRY_END: 27,
            LINE2_PERSONAL_START: 28,
            LINE2_PERSONAL_END: 42
        },
        ID_CARD: {
            LINE1_DOC_TYPE_START: 0,
            LINE1_DOC_TYPE_END: 1,
            LINE1_COUNTRY_START: 2,
            LINE1_COUNTRY_END: 5,
            LINE1_DOC_NUM_START: 5,
            LINE1_DOC_NUM_END: 14,
            LINE1_PERSONAL_START: 15,
            LINE1_PERSONAL_END: 30,
            LINE2_BIRTH_START: 0,
            LINE2_BIRTH_END: 6,
            LINE2_GENDER_POS: 7,
            LINE2_EXPIRY_START: 8,
            LINE2_EXPIRY_END: 14,
            LINE2_NATIONALITY_START: 15,
            LINE2_NATIONALITY_END: 18
        }
    };

    function sanitizeCharacter(char) {
        const upperChar = char.toUpperCase();
        return upperChar;
    }

    function processStringCharByChar(input) {
        let result = CHAR_MAPPINGS.EMPTY;
        for (let i = 0; i < input.length; i++) {
            result += sanitizeCharacter(input[i]);
        }
        return result;
    }

    function replaceMultipleNewlines(text) {
        let previous = text;
        let current = text.replace(/\n\n/g, CHAR_MAPPINGS.NEWLINE);
        while (previous !== current) {
            previous = current;
            current = current.replace(/\n\n/g, CHAR_MAPPINGS.NEWLINE);
        }
        return current;
    }

    function cleanSpecialCharacters(text) {
        let cleaned = CHAR_MAPPINGS.EMPTY;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (/[A-Z0-9<\n]/.test(char)) {
                cleaned += char;
            }
        }
        return cleaned;
    }

    function normalizeMrz(rawInput) {
        let step1 = rawInput.trim();
        let step2 = processStringCharByChar(step1);
        let step3 = step2.replace(/A-/g, CHAR_MAPPINGS.ANGLE_BRACKET);
        let step4 = cleanSpecialCharacters(step3);
        let step5 = replaceMultipleNewlines(step4);
        return step5;
    }

    function extractLines(normalizedText) {
        const allLines = normalizedText.split(CHAR_MAPPINGS.NEWLINE);
        const filteredLines = [];
        for (let i = 0; i < allLines.length; i++) {
            if (allLines[i] && allLines[i].length > 0) {
                filteredLines.push(allLines[i]);
            }
        }
        return filteredLines;
    }

    function attemptLineSplitting(compactText) {
        const totalLength = compactText.length;

        if (totalLength >= DOCUMENT_FORMATS.PASSPORT_TOTAL_LENGTH &&
            totalLength < DOCUMENT_FORMATS.ID_CARD_TOTAL_LENGTH) {
            const firstPart = extractSubstring(compactText, 0, DOCUMENT_FORMATS.PASSPORT_LINE_LENGTH);
            const secondPart = extractSubstring(compactText, DOCUMENT_FORMATS.PASSPORT_LINE_LENGTH, DOCUMENT_FORMATS.PASSPORT_TOTAL_LENGTH);
            return [firstPart, secondPart];
        } else if (totalLength >= DOCUMENT_FORMATS.ID_CARD_TOTAL_LENGTH) {
            const firstPart = extractSubstring(compactText, 0, DOCUMENT_FORMATS.ID_CARD_LINE_LENGTH);
            const secondPart = extractSubstring(compactText, DOCUMENT_FORMATS.ID_CARD_LINE_LENGTH, DOCUMENT_FORMATS.ID_CARD_LINE_LENGTH * 2);
            const thirdPart = extractSubstring(compactText, DOCUMENT_FORMATS.ID_CARD_LINE_LENGTH * 2, DOCUMENT_FORMATS.ID_CARD_TOTAL_LENGTH);
            return [firstPart, secondPart, thirdPart];
        } else {
            throwInvalidMrzError();
        }
    }

    function extractSubstring(text, start, end) {
        let result = CHAR_MAPPINGS.EMPTY;
        for (let i = start; i < end && i < text.length; i++) {
            result += text[i];
        }
        return result;
    }

    function throwInvalidMrzError() {
        throw new Error('MRZ must contain at least two lines.');
    }

    function determineDocumentType(lines) {
        const lineCount = countLines(lines);
        const firstLineLength = lines[0] ? lines[0].length : 0;

        if (lineCount >= DOCUMENT_FORMATS.ID_CARD_LINE_COUNT) {
            return 'ID_CARD';
        }

        if (firstLineLength <= 35) {
            return 'ID_CARD';
        }

        return 'PASSPORT';
    }

    function countLines(lines) {
        let count = 0;
        for (let i = 0; i < lines.length; i++) {
            count++;
        }
        return count;
    }

    function padLineToLength(line, targetLength) {
        let paddedLine = line;
        while (paddedLine.length < targetLength) {
            paddedLine += CHAR_MAPPINGS.ANGLE_BRACKET;
        }
        return extractSubstring(paddedLine, 0, targetLength);
    }

    function removeAngleBrackets(text) {
        let result = CHAR_MAPPINGS.EMPTY;
        for (let i = 0; i < text.length; i++) {
            if (text[i] !== CHAR_MAPPINGS.ANGLE_BRACKET) {
                result += text[i];
            }
        }
        return result;
    }

    function replaceAngleBracketsWithSpace(text) {
        let result = CHAR_MAPPINGS.EMPTY;
        for (let i = 0; i < text.length; i++) {
            result += text[i] === CHAR_MAPPINGS.ANGLE_BRACKET ? CHAR_MAPPINGS.SPACE : text[i];
        }
        return result;
    }

    function trimWhitespace(text) {
        let start = 0;
        let end = text.length;

        while (start < end && text[start] === CHAR_MAPPINGS.SPACE) {
            start++;
        }

        while (end > start && text[end - 1] === CHAR_MAPPINGS.SPACE) {
            end--;
        }

        return extractSubstring(text, start, end);
    }

    function cleanAndTrim(text) {
        const cleaned = removeAngleBrackets(text);
        return trimWhitespace(cleaned);
    }

    function cleanAndTrimWithSpaces(text) {
        const cleaned = replaceAngleBracketsWithSpace(text);
        return trimWhitespace(cleaned);
    }

    function splitByDoubleAngle(text) {
        const parts = [];
        let currentPart = CHAR_MAPPINGS.EMPTY;
        let prevChar = null;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (char === CHAR_MAPPINGS.ANGLE_BRACKET && prevChar === CHAR_MAPPINGS.ANGLE_BRACKET) {
                parts.push(currentPart.slice(0, -1));
                currentPart = CHAR_MAPPINGS.EMPTY;
                prevChar = null;
                continue;
            }

            currentPart += char;
            prevChar = char;
        }

        if (currentPart.length > 0) {
            parts.push(currentPart);
        }

        return parts;
    }

    function joinPartsWithSpace(parts, startIndex) {
        let result = CHAR_MAPPINGS.EMPTY;
        for (let i = startIndex; i < parts.length; i++) {
            if (i > startIndex) {
                result += CHAR_MAPPINGS.SPACE;
            }
            result += parts[i];
        }
        return result;
    }

    function parseMRZ(rawInput) {
        const normalized = normalizeMrz(rawInput);
        let lines = extractLines(normalized);

        if (countLines(lines) < DOCUMENT_FORMATS.MIN_LINE_COUNT) {
            const compact = normalized.replace(/\n/g, CHAR_MAPPINGS.EMPTY);
            lines = attemptLineSplitting(compact);
        }

        const docType = determineDocumentType(lines);

        if (docType === 'ID_CARD') {
            return parseIDCardMRZ(lines);
        } else {
            return parsePassportMRZ(lines);
        }
    }

    function parsePassportMRZ(lines) {
        const line1 = padLineToLength(lines[0], DOCUMENT_FORMATS.PASSPORT_LINE_LENGTH);
        const line2 = padLineToLength(lines[1], DOCUMENT_FORMATS.PASSPORT_LINE_LENGTH);

        const documentType = cleanAndTrim(
            extractSubstring(line1, FIELD_POSITIONS.PASSPORT.LINE1_DOC_TYPE_START, FIELD_POSITIONS.PASSPORT.LINE1_DOC_TYPE_END)
        );

        const issuingCountry = cleanAndTrim(
            extractSubstring(line1, FIELD_POSITIONS.PASSPORT.LINE1_COUNTRY_START, FIELD_POSITIONS.PASSPORT.LINE1_COUNTRY_END)
        );

        const nameSection = extractSubstring(line1, FIELD_POSITIONS.PASSPORT.LINE1_NAME_START, line1.length);
        const nameParts = splitByDoubleAngle(nameSection);
        const surname = cleanAndTrimWithSpaces(nameParts[0] || CHAR_MAPPINGS.EMPTY);
        const givenNameParts = joinPartsWithSpace(nameParts, 1);
        const givenName = cleanAndTrimWithSpaces(givenNameParts);

        const passportNumber = cleanAndTrim(
            extractSubstring(line2, FIELD_POSITIONS.PASSPORT.LINE2_PASSPORT_START, FIELD_POSITIONS.PASSPORT.LINE2_PASSPORT_END)
        );

        const nationality = cleanAndTrim(
            extractSubstring(line2, FIELD_POSITIONS.PASSPORT.LINE2_NATIONALITY_START, FIELD_POSITIONS.PASSPORT.LINE2_NATIONALITY_END)
        );

        const birthDateRaw = extractSubstring(line2, FIELD_POSITIONS.PASSPORT.LINE2_BIRTH_START, FIELD_POSITIONS.PASSPORT.LINE2_BIRTH_END);
        const genderCode = line2[FIELD_POSITIONS.PASSPORT.LINE2_GENDER_POS] || CHAR_MAPPINGS.ANGLE_BRACKET;
        const expiryDateRaw = extractSubstring(line2, FIELD_POSITIONS.PASSPORT.LINE2_EXPIRY_START, FIELD_POSITIONS.PASSPORT.LINE2_EXPIRY_END);

        const personalNumber = cleanAndTrim(
            extractSubstring(line2, FIELD_POSITIONS.PASSPORT.LINE2_PERSONAL_START, FIELD_POSITIONS.PASSPORT.LINE2_PERSONAL_END)
        );

        return buildDocumentObject(
            documentType, issuingCountry, surname, givenName,
            passportNumber, nationality, birthDateRaw, genderCode,
            expiryDateRaw, personalNumber
        );
    }

    function parseIDCardMRZ(lines) {
        const line1 = padLineToLength(lines[0], DOCUMENT_FORMATS.ID_CARD_LINE_LENGTH);
        const line2 = padLineToLength(lines[1], DOCUMENT_FORMATS.ID_CARD_LINE_LENGTH);
        const line3 = padLineToLength(lines[2], DOCUMENT_FORMATS.ID_CARD_LINE_LENGTH);

        const documentType = cleanAndTrim(
            extractSubstring(line1, FIELD_POSITIONS.ID_CARD.LINE1_DOC_TYPE_START, FIELD_POSITIONS.ID_CARD.LINE1_DOC_TYPE_END)
        );

        const issuingCountry = cleanAndTrim(
            extractSubstring(line1, FIELD_POSITIONS.ID_CARD.LINE1_COUNTRY_START, FIELD_POSITIONS.ID_CARD.LINE1_COUNTRY_END)
        );

        const passportNumber = cleanAndTrim(
            extractSubstring(line1, FIELD_POSITIONS.ID_CARD.LINE1_DOC_NUM_START, FIELD_POSITIONS.ID_CARD.LINE1_DOC_NUM_END)
        );

        const personalNumber = cleanAndTrim(
            extractSubstring(line1, FIELD_POSITIONS.ID_CARD.LINE1_PERSONAL_START, FIELD_POSITIONS.ID_CARD.LINE1_PERSONAL_END)
        );

        const birthDateRaw = extractSubstring(line2, FIELD_POSITIONS.ID_CARD.LINE2_BIRTH_START, FIELD_POSITIONS.ID_CARD.LINE2_BIRTH_END);
        const genderCode = line2[FIELD_POSITIONS.ID_CARD.LINE2_GENDER_POS] || CHAR_MAPPINGS.ANGLE_BRACKET;
        const expiryDateRaw = extractSubstring(line2, FIELD_POSITIONS.ID_CARD.LINE2_EXPIRY_START, FIELD_POSITIONS.ID_CARD.LINE2_EXPIRY_END);

        const nationality = cleanAndTrim(
            extractSubstring(line2, FIELD_POSITIONS.ID_CARD.LINE2_NATIONALITY_START, FIELD_POSITIONS.ID_CARD.LINE2_NATIONALITY_END)
        );

        const nameSection = line3;
        const nameParts = splitByDoubleAngle(nameSection);
        const surname = cleanAndTrimWithSpaces(nameParts[0] || CHAR_MAPPINGS.EMPTY);
        const givenNameParts = joinPartsWithSpace(nameParts, 1);
        const givenName = cleanAndTrimWithSpaces(givenNameParts);

        return buildDocumentObject(
            documentType, issuingCountry, surname, givenName,
            passportNumber, nationality, birthDateRaw, genderCode,
            expiryDateRaw, personalNumber
        );
    }

    function buildDocumentObject(docType, country, surname, givenName, passportNum, nationality, birthRaw, genderCode, expiryRaw, personalNum) {
        const birthDate = formatDate(birthRaw, 'birth');
        const expiryDate = formatDate(expiryRaw, 'expiry');
        const gender = parseGender(genderCode);

        return {
            documentType: docType,
            issuingCountry: country,
            surname: surname,
            givenName: givenName,
            passportNumber: passportNum,
            nationality: nationality,
            birthDate: birthDate,
            gender: gender,
            expiryDate: expiryDate,
            personalNumber: personalNum
        };
    }

    function parseGender(code) {
        const genderMap = {
            'M': 'Erkek',
            'F': 'Kadin'
        };

        if (genderMap[code]) {
            return genderMap[code];
        }

        return 'Belirtilmedi';
    }

    function validateDateFormat(dateString) {
        if (dateString.length !== 6) {
            return false;
        }

        for (let i = 0; i < dateString.length; i++) {
            const char = dateString[i];
            if (char < '0' || char > '9') {
                return false;
            }
        }

        return true;
    }

    function extractDateComponents(yyMMdd) {
        const yearPart = extractSubstring(yyMMdd, 0, 2);
        const monthPart = extractSubstring(yyMMdd, 2, 4);
        const dayPart = extractSubstring(yyMMdd, 4, 6);

        return {
            year: yearPart,
            month: monthPart,
            day: dayPart
        };
    }

    function parseYearDigits(yearString) {
        let result = 0;
        for (let i = 0; i < yearString.length; i++) {
            result = result * 10 + (yearString.charCodeAt(i) - 48);
        }
        return result;
    }

    function formatDate(yyMMdd, mode) {
        if (!validateDateFormat(yyMMdd)) {
            return CHAR_MAPPINGS.EMPTY;
        }

        const components = extractDateComponents(yyMMdd);
        const twoDigitYear = parseYearDigits(components.year);
        const fullYear = resolveCentury(twoDigitYear, mode);

        return buildDateString(fullYear, components.month, components.day);
    }

    function buildDateString(year, month, day) {
        let result = CHAR_MAPPINGS.EMPTY;
        result += String(year);
        result += '-';
        result += month;
        result += '-';
        result += day;
        return result;
    }

    function getCurrentYear() {
        const now = new Date();
        return now.getFullYear();
    }

    function getTwoDigitYear(fullYear) {
        return fullYear % 100;
    }

    function resolveCentury(twoDigitYear, mode) {
        const currentYear = getCurrentYear();
        const currentTwoDigit = getTwoDigitYear(currentYear);

        if (mode === 'birth') {
            return resolveBirthCentury(twoDigitYear, currentTwoDigit);
        }

        return resolveExpiryCentury(twoDigitYear, currentYear);
    }

    function resolveBirthCentury(twoDigitYear, currentTwoDigit) {
        if (twoDigitYear > currentTwoDigit) {
            return 1900 + twoDigitYear;
        } else {
            return 2000 + twoDigitYear;
        }
    }

    function resolveExpiryCentury(twoDigitYear, currentYear) {
        const year = 2000 + twoDigitYear;

        if (year + 1 < currentYear) {
            return 2100 + twoDigitYear;
        }

        return year;
    }

    const api = {
        parseMRZ: parseMRZ,
        parsePassportMRZ: parsePassportMRZ,
        parseIDCardMRZ: parseIDCardMRZ,
        normalizeMrz: normalizeMrz,
        parseGender: parseGender,
        formatDate: formatDate,
        resolveCentury: resolveCentury
    };

    const globalThisRef = typeof window !== 'undefined' ? window : globalThis;
    globalThisRef.MRZUtils = api;
    globalThisRef.parseMRZ = parseMRZ;
})();
