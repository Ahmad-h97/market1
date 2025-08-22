import Report from '../models/Report.js';
import User from '../models/User.js';
import House from '../models/House.js';
import EditHistory from '../models/EditHistory.js';

const reportItem = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { itemId } = req.params;
    const { itemType, reason } = req.body;

    if (!itemType || !reason) {
      return res.status(400).json({ message: 'itemType and reason are required' });
    }

    if (!itemId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid itemId format' });
    }

    const reporter = await User.findById(reporterId);
    if (!reporter) return res.status(404).json({ message: 'Reporter user not found' });

    let report = await Report.findOne({ itemType, itemId });

    if (report) {
      // Prevent duplicate reports
      const alreadyReported = report.reportedBy.some(entry => entry.user.toString() === reporterId);
      if (alreadyReported) {
        return res.status(400).json({ message: 'You have already reported this item' });
      }

      report.reportedBy.push({ user: reporterId, reason, credibility: reporter.credibilityScore  || 0 });
    } else {
      report = new Report({
        itemType,
        itemId,
        reportedBy: [{ user: reporterId, reason, credibility: reporter.credibilityScore  || 0 }]
      });
    }

    report.totalReports = report.reportedBy.length;

    console.log('Total reports:', report.totalReports);
    console.log('Reported by credibility:', report.reportedBy.map(r => r.credibility));

    if (report.totalReports > 4) {
      const totalCredibility = report.reportedBy.reduce((sum, entry) => sum + (entry.credibility || 0), 0);
      const avgCredibility = totalCredibility / report.totalReports;

      console.log('Average credibility:', avgCredibility);

      if (avgCredibility >= 60) {
        let action = '';
        if (itemType === 'house') {
          await House.findByIdAndUpdate(itemId, { hidden: true });
          action = 'hide_house';
        } else if (itemType === 'user') {
          await User.findByIdAndUpdate(itemId, { hidden: true });
          action = 'hide_user';
        }

        console.log('Auto-hiding item. Action:', action);

        report.actionsTaken.push({
          action,
          by: null, // system
          note: 'Auto-hide due to credible reports'
        });
        report.status = 'action_taken';
      } else {
        console.log('Average credibility too low, not hiding');
      }
    }

    await report.save(); // ✅ Save once, after everything

    res.status(201).json({
      message: 'Report submitted successfully',
      totalReports: report.totalReports
    });
  } catch (error) {
    console.error('Error reporting item:', error);
    res.status(500).json({ message: 'Server error while reporting item' });
  }
};



const getReports = async (req, res) => {
  try {
    console.time('Total getReports duration');

    console.time('Find all reports');
    const reports = await Report.find({ status: { $ne: 'dismissed' } }).lean();
    console.timeEnd('Find all reports');

    const responseData = [];

    for (const report of reports) {
      console.time(`Processing report ${report._id}`);
      console.log('Report itemId:', report.itemId);

      console.time('Find reported user or house');
      let reportedUser = null;
      let houseHidden = null;

      if (report.itemType === 'user') {
        reportedUser = await User.findById(report.itemId).select('username hidden banned').lean();
      } else if (report.itemType === 'house') {
        const house = await House.findById(report.itemId).select('postedBy hidden banned').lean();
        if (house) {
          houseHidden = house.hidden;
          reportedUser = await User.findById(house.postedBy).select('username hidden banned').lean();
        }
      }
      console.timeEnd('Find reported user or house');

      console.time('Find reportedBy users');
      const reportedByData = [];

      for (const entry of report.reportedBy) {
        const user = await User.findById(entry.user).select('username credibilityScore').lean();
        reportedByData.push({
          userId: entry.user,
          username: user?.username || 'Unknown',
          credibility: user?.credibilityScore ?? null,
          reason: entry.reason || 'No reason provided'
        });
      }
      console.timeEnd('Find reportedBy users');

      console.log('reportedByData:', reportedByData);

      const responseItem = {
        reportId: report._id,
        itemType: report.itemType,
        reportedUserId: reportedUser?._id || null,
        reportedUserName: reportedUser?.username || 'Unknown',
        reportedBy: reportedByData,
         userHidden: reportedUser?.hidden || false,
  userBanned: reportedUser?.banned || false,
      };

      if (report.itemType === 'house') {
        responseItem.houseId = report.itemId;
        responseItem.houseHidden = houseHidden;
        responseItem.userHidden = reportedUser?.hidden || false;
      } else if (report.itemType === 'user') {
        responseItem.userHidden = reportedUser?.hidden || false;
      }

      const targetId = report.itemType === 'house' ? report.itemId : reportedUser?._id;

const hasEdits = await EditHistory.exists({
  targetId,
  targetType: report.itemType,
});
responseItem.edited = !!hasEdits;

      responseData.push(responseItem);
      console.timeEnd(`Processing report ${report._id}`);
    }

    console.log(responseData);
    console.timeEnd('Total getReports duration');

    res.json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};


export const dismissReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const moderatorId = req.user.id; // from auth middleware

    // Get user to check role
    const user = await User.findById(moderatorId).select('role');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!['admin', 'moderator'].includes(user.role)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ message: `Report already marked as ${report.status}` });
    }

    // Check hidden states depending on itemType
    if (report.itemType === 'user') {
      const reportedUser = await User.findById(report.itemId).select('hidden');
      if (!reportedUser) {
        return res.status(404).json({ message: 'Reported user not found' });
      }
      if (reportedUser.hidden) {
        return res.status(400).json({ message: 'Cannot dismiss report: reported user is hidden' });
      }
    } else if (report.itemType === 'house') {
      const house = await House.findById(report.itemId).select('hidden postedBy');
      if (!house) {
        return res.status(404).json({ message: 'Reported house not found' });
      }
      if (house.hidden) {
        return res.status(400).json({ message: 'Cannot dismiss report: house is hidden' });
      }
      const houseOwner = await User.findById(house.postedBy).select('hidden');
      if (!houseOwner) {
        return res.status(404).json({ message: 'House owner not found' });
      }
      if (houseOwner.hidden) {
        return res.status(400).json({ message: 'Cannot dismiss report: house owner is hidden' });
      }
    }

    // All checks passed, dismiss report
    report.status = 'dismissed';
    report.dismissedBy = moderatorId;
    report.dismissedAt = new Date();

    await report.save();

    res.status(200).json({ message: 'Report dismissed', report });
  } catch (error) {
    console.error('Dismiss report error:', error);
    res.status(500).json({ message: 'Server error while dismissing report' });
  }
};

export const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body; // optional reason for ban

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.banned && user.banned.isBanned) {
      return res.status(400).json({ message: 'User is already banned' });
    }

    user.banned = {
      isBanned: true,
      reason: reason || '',
      bannedAt: new Date(),
    };

   

    await user.save();

    res.status(200).json({ message: 'User has been banned', user });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ message: 'Failed to ban user' });
  }
};

export const changeCredibility = async (req, res) => {
  try {
    const { target, userId, reportId, value } = req.body;

    if (!['reportedUser', 'reportingUsers'].includes(target)) {
      return res.status(400).json({ error: 'Invalid target. Must be reportedUser or reportingUsers.' });
    }

    if (typeof value !== 'number') {
      return res.status(400).json({ error: 'Value must be a number' });
    }

    const report = await Report.findById(reportId).populate('reportedBy.user');
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (target === 'reportedUser') {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      user.credibilityScore += value;
      await user.save();
      return res.json({ message: 'Reported user credibility updated', userId, newScore: user.credibilityScore });
    }

    if (target === 'reportingUsers') {
      let updated = [];
      for (const r of report.reportedBy) {
        const user = await User.findById(r.user);
        if (user) {
          user.credibilityScore += value;
          await user.save();
          updated.push({ userId: user._id, newScore: user.credibilityScore });
        }
      }
      return res.json({ message: 'Reporting users credibility updated', updated });
    }
  } catch (error) {
    console.error('Credibility update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getEditHistory = async (req, res) => {
  try {
    const { targetId, targetType } = req.params;  // <-- use params, not query

    if (!targetId || !targetType) {
      return res.status(400).json({ message: 'targetId and targetType are required' });
    }

    const edits = await EditHistory.find({ targetId, targetType })
      .sort({ timestamp: 1 }) // oldest first
      .lean();

    res.json(edits);  // return array directly (not { edits })
  } catch (error) {
    console.error('Error fetching edit history:', error);
    res.status(500).json({ message: 'Server error fetching edit history' });
  }
};


export { reportItem ,getReports};