import { Router } from 'express';
import { list, read, create, update, remove } from '../controllers/itemController.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';
export default function itemRoutes(type) {
 const router = Router();
 router.route('/').get(wrap(list(type))).post(auth, wrap(create(type)));
 router.route('/:id').get(wrap(read(type))).put(auth, wrap(update(type))).delete(auth, wrap(remove(type)));
 return router;
}
