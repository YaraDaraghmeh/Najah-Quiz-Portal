import { Router } from 'express';
import authRoutes from './auth.routes';
import studentRoutes from './student.routes';
import teacherRoutes from './teacher.routes';
import adminRoutes from './admin.routes';
import importRoutes from './import.routes';
import statusRoutes from './status.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/student', studentRoutes);
apiRouter.use('/teacher', teacherRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/admin/import', importRoutes);
apiRouter.use('/status', statusRoutes);

export default apiRouter;
