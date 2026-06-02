const GAS_URL = 'https://script.google.com/macros/s/AKfycbxjLeoYUeo5wnjFw1oA-A1KV7Wf6eHMa6FozizgbATUdtcmRTwa4bkIM6ppwWywXumm/exec';

export const fetchInitialData = async () => {
  const response = await fetch(GAS_URL, {
    redirect: "follow",
    method: 'POST',
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ action: 'getInitialData' }),
  });
  return response.json();
};

export const saveAttendance = async (records: any[]) => {
  const response = await fetch(GAS_URL, {
    redirect: "follow",
    method: 'POST',
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ action: 'saveAttendance', records }),
  });
  return response.json();
};

export const updateStudentsOnServer = async (students: any[]) => {
  const response = await fetch(GAS_URL, {
    redirect: "follow",
    method: 'POST',
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ action: 'updateStudents', students }),
  });
  return response.json();
};

export const fetchFilteredAttendance = async (filters: { room?: string; startDate?: string; endDate?: string }) => {
  const response = await fetch(GAS_URL, {
    redirect: "follow",
    method: 'POST',
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ action: 'getFilteredAttendance', ...filters }),
  });
  return response.json();
};

// --- New Modules ---

export const fetchLogs = async (action: string, filterData: any) => {
  const response = await fetch(GAS_URL, {
    redirect: "follow",
    method: 'POST',
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ action, ...filterData }),
  });
  return response.json();
};

export const saveLogs = async (action: string, records: any[]) => {
  const response = await fetch(GAS_URL, {
    redirect: "follow",
    method: 'POST',
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ action, records }),
  });
  return response.json();
};


