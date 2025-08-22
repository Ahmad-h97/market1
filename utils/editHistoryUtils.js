import EditHistory from '../models/EditHistory.js';

export async function addEditRecord({ userId, targetId, targetType, field, oldValue, newValue }) {
  try {
    const edit = new EditHistory({
      userId,
      targetId,
      targetType,
      field,
      oldValue,
      newValue,
      timestamp: new Date(),
    });
    
    await edit.save();
    console.log('Edit history record saved.');
  } catch (err) {
    console.error('Failed to save edit record:', err);
  }
}
