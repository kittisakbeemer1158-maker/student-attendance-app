// Google Apps Script for Student Attendance System

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // User must replace this
const SHEET_STUDENTS = 'นักเรียน';
const SHEET_ATTENDANCE = 'การเช็คชื่อ';

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "API is active" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'getInitialData':
        return getInitialData();
      case 'saveAttendance':
        return saveAttendance(data.records);
      case 'updateStudents':
        return updateStudents(data.students);
      case 'getFilteredAttendance':
        return getFilteredAttendance(data);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getInitialData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const studentSheet = ss.getSheetByName(SHEET_STUDENTS);
  const attendanceSheet = ss.getSheetByName(SHEET_ATTENDANCE);
  
  const students = studentSheet.getDataRange().getValues();
  
  // Convert arrays to objects
  const studentHeaders = students[0];
  const studentList = students.slice(1).map(row => {
    let obj = {};
    studentHeaders.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  const tz = ss.getSpreadsheetTimeZone();
  const attRaw = attendanceSheet.getDataRange().getValues();
  let recentAttendance = [];
  
  if (attRaw.length > 1) {
    const rawAttHeaders = attRaw[0];
    const attHeadersClean = rawAttHeaders.map(h => h.toString().toLowerCase().replace(/\s+/g, ''));
    let dCol = 1;
    attHeadersClean.forEach((h, i) => {
      if (h.includes('date') || h.includes('วัน')) dCol = i;
    });

    const attHeaders = rawAttHeaders.map((h, i) => {
      if (h && h.toString().trim() !== '') return h.toString().trim();
      return `Col${i}`;
    });

    // Get today minus 3 days
    let threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0,0,0,0);

    for(let i = attRaw.length - 1; i >= 1; i--) {
      const row = attRaw[i];
      let cellD = row[dCol];
      let rowDateObj = null;

      if (Object.prototype.toString.call(cellD) === '[object Date]') {
        rowDateObj = new Date(Utilities.formatDate(cellD, tz, "yyyy-MM-dd"));
      } else {
        let rowDateStr = String(cellD).split('T')[0].trim();
        if (rowDateStr.includes('/')) {
           let parts = rowDateStr.split('/');
           if (parts.length === 3 && parts[2].length === 4) {
              rowDateStr = parts[2] + '-' + ('0'+parts[1]).slice(-2) + '-' + ('0'+parts[0]).slice(-2);
           }
        }
        rowDateObj = new Date(rowDateStr);
      }

      if (rowDateObj >= threeDaysAgo) {
        let obj = {};
        attHeaders.forEach((h, idx) => {
          let val = row[idx];
          if (Object.prototype.toString.call(val) === '[object Date]') {
            val = Utilities.formatDate(val, tz, "yyyy-MM-dd'T'HH:mm:ss");
          }
          obj[h] = val;
        });
        recentAttendance.push(obj);
      } else {
        // Since it's usually sorted chronologically, we could break early, but let's just scan all or stop if we know it's sorted
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    students: studentList,
    attendance: recentAttendance
  })).setMimeType(ContentService.MimeType.JSON);
}

function getFilteredAttendance(data) {
  const { room, startDate, endDate } = data;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Get Students to build ID -> Room map
  const studentSheet = ss.getSheetByName(SHEET_STUDENTS);
  const studentsRaw = studentSheet.getDataRange().getValues();
  const studentHeaders = studentsRaw[0].map(h => h.toString().toLowerCase().trim());
  let sIdCol = 0, sGradeCol = 2, sRoomCol = 3;
  studentHeaders.forEach((h, i) => {
    if (h.includes('studentid') || h === 'id' || h.includes('รหัส') || h.includes('เลข')) sIdCol = i;
    if (h === 'grade' || h.includes('ชั้น')) sGradeCol = i;
    if (h === 'room' || h.includes('ห้อง')) sRoomCol = i;
  });

  const studentMap = {};
  for(let i=1; i<studentsRaw.length; i++) {
    const r = studentsRaw[i];
    const id = String(r[sIdCol]).replace(/[^a-zA-Z0-9]/g, '');
    const g = String(r[sGradeCol] || '').trim();
    const rm = String(r[sRoomCol] || '').trim();
    studentMap[id] = `${g} ${rm}`.trim();
  }

  // 2. Get Attendance
  const attendanceSheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const attRaw = attendanceSheet.getDataRange().getValues();
  if (attRaw.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ status: "success", logs: [] })).setMimeType(ContentService.MimeType.JSON);
  }

  const tz = ss.getSpreadsheetTimeZone();
  const rawAttHeaders = attRaw[0];
  const attHeadersClean = rawAttHeaders.map(h => h.toString().toLowerCase().replace(/\s+/g, ''));
  let dCol=1, aIdCol=4;
  attHeadersClean.forEach((h, i) => {
    if (h.includes('date') || h.includes('วัน')) dCol = i;
    if (h.includes('studentid') || h === 'id' || h.includes('รหัส') || h.includes('เลข')) aIdCol = i;
  });

  const attHeaders = rawAttHeaders.map((h, i) => {
    if (h && h.toString().trim() !== '') return h.toString().trim();
    return `Col${i}`;
  });

  let start = startDate ? new Date(startDate) : null;
  let end = endDate ? new Date(endDate) : null;
  if(start) start.setHours(0,0,0,0);
  if(end) end.setHours(23,59,59,999);

  const filteredLogs = [];
  for(let i=1; i<attRaw.length; i++) {
    const row = attRaw[i];
    let rowDateStr = '';
    let cellD = row[dCol];
    let rowDateObj = null;

    if (Object.prototype.toString.call(cellD) === '[object Date]') {
      rowDateStr = Utilities.formatDate(cellD, tz, "yyyy-MM-dd");
      rowDateObj = new Date(rowDateStr);
    } else {
      rowDateStr = String(cellD).split('T')[0].trim();
      if (rowDateStr.includes('/')) {
         let parts = rowDateStr.split('/');
         if (parts.length === 3 && parts[2].length === 4) {
            rowDateStr = parts[2] + '-' + ('0'+parts[1]).slice(-2) + '-' + ('0'+parts[0]).slice(-2);
         }
      }
      rowDateObj = new Date(rowDateStr);
    }

    const sId = String(row[aIdCol]).replace(/[^a-zA-Z0-9]/g, '');
    const sRoom = studentMap[sId] || '';

    // Apply filters
    let matchRoom = true;
    if (room && room !== '') {
      matchRoom = (sRoom === room);
    }

    let matchDate = true;
    if (start && end) {
      if (rowDateObj < start || rowDateObj > end) matchDate = false;
    } else if (start) {
      if (rowDateObj < start) matchDate = false;
    } else if (end) {
      if (rowDateObj > end) matchDate = false;
    }

    if (matchRoom && matchDate) {
      let obj = {};
      attHeaders.forEach((h, idx) => {
        let val = row[idx];
        if (Object.prototype.toString.call(val) === '[object Date]') {
          val = Utilities.formatDate(val, tz, "yyyy-MM-dd'T'HH:mm:ss");
        }
        obj[h] = val;
      });
      obj['normalizedDate'] = rowDateStr;
      filteredLogs.push(obj);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "success", logs: filteredLogs }))
    .setMimeType(ContentService.MimeType.JSON);
}

function saveAttendance(records) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  
  // Ensure basic headers exist if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Date', 'Grade', 'Subject', 'StudentID', 'Status', 'Remark']);
  } else {
    // Check if column 7 (Remark) has a header, if not add it
    const header7 = sheet.getRange(1, 7).getValue();
    if (!header7 || header7.toString().trim() === '') {
      sheet.getRange(1, 7).setValue('Remark');
    }
  }

  const data = sheet.getDataRange().getValues();
  const tz = ss.getSpreadsheetTimeZone(); // Use spreadsheet timezone, not script timezone
  // Find column indices robustly
  const headers = data[0].map(h => h.toString().toLowerCase().replace(/\s+/g, ''));
  let dCol=1, sCol=3, idCol=4, statusCol=5, remarkCol=6; // default 0-based indices
  headers.forEach((h, i) => {
    if (h.includes('date') || h.includes('วัน')) dCol = i;
    if (h.includes('subject') || h.includes('วิชา')) sCol = i;
    if (h.includes('studentid') || h === 'id' || h.includes('รหัส') || h.includes('เลข')) idCol = i;
    if (h.includes('status') || h.includes('สถานะ')) statusCol = i;
    if (h.includes('remark') || h.includes('เหตุ')) remarkCol = i;
  });

  records.forEach(record => {
    let rowIndex = -1;
    // Search for existing record to update
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      let rowDate = '';
      let cellD = row[dCol];
      
      if (Object.prototype.toString.call(cellD) === '[object Date]') {
        rowDate = Utilities.formatDate(cellD, tz, "yyyy-MM-dd");
      } else {
        rowDate = String(cellD).split('T')[0].trim();
        // Fallback for DD/MM/YYYY
        if (rowDate.includes('/')) {
           let parts = rowDate.split('/');
           if (parts.length === 3 && parts[2].length === 4) {
              rowDate = parts[2] + '-' + ('0'+parts[1]).slice(-2) + '-' + ('0'+parts[0]).slice(-2);
           }
        }
      }
      const recDate = String(record.date).split('T')[0].trim();
      
      // Force clean comparisons
      const cleanRowDate = rowDate.replace(/[^0-9-]/g, '');
      const cleanRecDate = recDate.replace(/[^0-9-]/g, '');
      const sheetId = String(row[idCol]).replace(/[^a-zA-Z0-9]/g, '');
      const payloadId = String(record.studentId).replace(/[^a-zA-Z0-9]/g, '');
      
      if (cleanRowDate === cleanRecDate && sheetId === payloadId && sheetId !== '') {
        rowIndex = i + 1; // 1-based index for Google Sheets
        break;
      }
    }
    
    if (rowIndex !== -1) {
      // Update existing record (re-timestamp, update status and remark)
      sheet.getRange(rowIndex, 1).setValue(new Date());
      sheet.getRange(rowIndex, statusCol + 1).setValue(record.status);
      sheet.getRange(rowIndex, remarkCol + 1).setValue(record.remark || '');
    } else {
      // Append new record
      let newRow = [];
      for(let i=0; i<=remarkCol; i++) newRow.push('');
      newRow[0] = new Date();
      newRow[dCol] = record.date;
      
      let gradeCol = headers.findIndex(h => h === 'grade' || h === 'ชั้น');
      if(gradeCol === -1) gradeCol = 2;
      newRow[gradeCol] = record.grade;
      
      newRow[sCol] = record.subject;
      newRow[idCol] = record.studentId;
      newRow[statusCol] = record.status;
      newRow[remarkCol] = record.remark || '';
      
      sheet.appendRow(newRow);
      data.push(newRow); // update in-memory array
    }
  });

  return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateStudents(students) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_STUDENTS);
  
  // Clear and rewrite headers
  sheet.clear();
  sheet.appendRow(['ID', 'Name', 'Grade', 'Room']);
  
  students.forEach(s => {
    sheet.appendRow([s.ID, s.Name, s.Grade, s.Room]);
  });

  return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
