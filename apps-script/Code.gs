const CONFIG = {
  calendarName: '전북현대',
  icsUrl: 'https://raw.githubusercontent.com/aassder95/Jeonbuk-Calendar/main/jeonbuk.ics',
  timeZone: 'Asia/Seoul',
  labelNames: [
    'K리그',
    '코리아컵',
    '슈퍼컵',
    '아시아챔피언스리그',
  ],
};

function syncJeonbuk() {
  const calendar = findTargetCalendar();
  const labelIds = getLabelIds(calendar.id);
  const ics = UrlFetchApp.fetch(CONFIG.icsUrl).getContentText('UTF-8');
  const fixtures = parseIcs(ics);

  let created = 0;
  let updated = 0;

  for (const fixture of fixtures) {
    const labelName = findLabelName(`${fixture.summary}\n${fixture.description}`);
    const event = {
      summary: fixture.summary,
      location: fixture.location,
      description: fixture.description || null,
      start: fixture.start,
      end: fixture.end,
      eventLabelId: labelIds[labelName],
    };
    const existing = Calendar.Events.list(calendar.id, {
      iCalUID: fixture.uid,
      maxResults: 1,
      showDeleted: false,
    }).items || [];

    if (existing.length > 0) {
      Calendar.Events.patch(event, calendar.id, existing[0].id, {
        eventLabelVersion: 1,
        sendUpdates: 'none',
      });
      updated++;
    } else {
      event.iCalUID = fixture.uid;
      Calendar.Events.import(event, calendar.id, {
        eventLabelVersion: 1,
      });
      created++;
    }
  }

  console.log(`동기화 완료: 추가 ${created}건, 수정 ${updated}건`);
  return { created, updated };
}

function doGet() {
  const result = syncJeonbuk();
  return ContentService
    .createTextOutput(`전북현대 일정 동기화 완료\n추가 ${result.created}건\n수정 ${result.updated}건`)
    .setMimeType(ContentService.MimeType.TEXT);
}

function installDailyTrigger() {
  const duplicateTriggers = ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'syncJeonbuk');
  for (const trigger of duplicateTriggers) {
    ScriptApp.deleteTrigger(trigger);
  }

  ScriptApp.newTrigger('syncJeonbuk')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
}

function findTargetCalendar() {
  const items = Calendar.CalendarList.list({
    maxResults: 250,
    minAccessRole: 'writer',
  }).items || [];
  const matches = items.filter(item => item.summary === CONFIG.calendarName);

  if (matches.length !== 1) {
    throw new Error(`쓰기 가능한 '${CONFIG.calendarName}' 캘린더가 ${matches.length}개입니다.`);
  }

  return matches[0];
}

function getLabelIds(calendarId) {
  const calendar = Calendar.Calendars.get(calendarId);
  const labels = calendar.labelProperties?.eventLabels || [];
  const labelIds = {};

  for (const label of labels) {
    labelIds[label.name] = label.id;
  }

  const missingNames = CONFIG.labelNames.filter(name => !labelIds[name]);
  if (missingNames.length > 0) {
    throw new Error(`캘린더 라벨을 찾을 수 없습니다: ${missingNames.join(', ')}`);
  }

  return labelIds;
}

function findLabelName(text) {
  if (text.includes('코리아컵')) return '코리아컵';
  if (text.includes('슈퍼컵')) return '슈퍼컵';
  if (text.includes('아시아챔피언스리그') || text.includes('ACLE') || text.includes('ACL Elite')) {
    return '아시아챔피언스리그';
  }
  if (text.includes('K리그')) return 'K리그';
  throw new Error(`대회 라벨을 판별할 수 없습니다: ${text.split('\n')[0]}`);
}

function parseIcs(ics) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

  return blocks.map(block => {
    const startLine = getPropertyLine(block, 'DTSTART');
    const endLine = getPropertyLine(block, 'DTEND');
    return {
      uid: getPropertyValue(block, 'UID'),
      summary: unescapeIcs(getPropertyValue(block, 'SUMMARY')),
      location: unescapeIcs(getPropertyValue(block, 'LOCATION', false)),
      description: unescapeIcs(getPropertyValue(block, 'DESCRIPTION', false)),
      start: parseIcsDate(startLine),
      end: parseIcsDate(endLine),
    };
  });
}

function getPropertyLine(block, name) {
  const line = block.split(/\r?\n/).find(value => value.startsWith(`${name}:`) || value.startsWith(`${name};`));
  if (!line) throw new Error(`ICS에서 ${name} 값을 찾을 수 없습니다.`);
  return line;
}

function getPropertyValue(block, name, required = true) {
  const line = block.split(/\r?\n/).find(value => value.startsWith(`${name}:`) || value.startsWith(`${name};`));
  if (!line) {
    if (required) throw new Error(`ICS에서 ${name} 값을 찾을 수 없습니다.`);
    return '';
  }
  return line.substring(line.indexOf(':') + 1);
}

function parseIcsDate(line) {
  const value = line.substring(line.indexOf(':') + 1);
  if (/^\d{8}$/.test(value)) {
    return { date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` };
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) throw new Error(`지원하지 않는 ICS 날짜 형식입니다: ${value}`);

  const dateTime = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
  return match[7] === 'Z'
    ? { dateTime: `${dateTime}Z` }
    : { dateTime, timeZone: CONFIG.timeZone };
}

function unescapeIcs(value) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}
