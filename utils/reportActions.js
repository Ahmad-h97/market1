import Report from '../models/Report.js';

export const logActionToReport = async (reportId, action, userId, note = '') => {
   console.log('--- Logging Action to Report ---');
  console.log('Report ID:', reportId);
  console.log('Action:', action);
  console.log('User ID:', userId);
  console.log('Note:', note);
    const report = await Report.findById(reportId);
  if (!report) throw new Error('Report not found');
console.log('Existing actionsTaken:', report.actionsTaken);
  const alreadyExists = report.actionsTaken.some(a => a.action === action);
  if (alreadyExists) {
    return { skipped: true, message: 'Action already recorded' };
  }

  report.actionsTaken.push({
    action,
    by: userId,
    note,
    date: new Date()
  });

  report.status = 'action_taken';
  await report.save();

  return { skipped: false, message: 'Action logged successfully' };
};
