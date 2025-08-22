// routes/reportRoutes.js
import express from 'express';
import { getReports } from '../controllers/reportController.js';
import  verifyJWT  from '../middleware/verifyJWT.js';
import { reportItem,dismissReport,banUser,changeCredibility ,getEditHistory} from '../controllers/reportController.js';
import checkSuspended from '../middleware/checkSuspended.js';
import { checkRole } from '../middleware/checkRole.js';

const router = express.Router();

router.get('/reports', getReports);
router.post('/report/:itemId', verifyJWT,checkSuspended,  reportItem);
router.delete('/dismiss/:reportId', verifyJWT, dismissReport);
router.patch('/ban/:userId', banUser);
router.patch('/credibility', verifyJWT,checkRole('admin'), changeCredibility);
router.get('/get-edit-history/:targetType/:targetId', getEditHistory);
export default router;
