const GAS_URL = 'https://script.google.com/macros/s/AKfycby5OHbsA3cVhtfazzl26R8jiYdvfOkonJb7iQErQW-yJPjkwiOnno9n0L1P03_lcenf/exec';

export const fetchInitialData = async () => {
  const response = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'getInitialData' }),
  });
  return response.json();
};

export const saveAttendance = async (records: any[]) => {
  const response = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveAttendance', records }),
  });
  return response.json();
};

export const updateStudentsOnServer = async (students: any[]) => {
  const response = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'updateStudents', students }),
  });
  return response.json();
};

export const fetchFilteredAttendance = async (filters: { room?: string; startDate?: string; endDate?: string }) => {
  const response = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'getFilteredAttendance', ...filters }),
  });
  return response.json();
};
