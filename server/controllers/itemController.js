import mongoose from 'mongoose';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import CampusLocation from '../models/CampusLocation.js';
import { CATEGORIES } from '../config/constants.js';
import { fail } from '../utils/asyncHandler.js';
import { rebuildMatches, withReportLock } from '../services/matchPersistence.js';
import { validDate } from '../utils/date.js';
import { DEMO_IMAGES } from '../config/demoImages.js';
export const modelFor = type => type === 'lost' ? LostItem : FoundItem;
export function checkId(id) { if (!mongoose.isValidObjectId(id)) fail(400, 'Invalid item ID.'); }
export function filters(query, type) {
 const filter = {};
 for (const key of ['category', 'campus_location', 'status', 'reported_by']) {
   if (query[key] !== undefined) { if (typeof query[key] !== 'string') fail(400, `Invalid ${key}`); filter[key] = query[key]; }
 }
 if (filter.category && !CATEGORIES.includes(filter.category)) fail(400, 'Unknown category.');
 if (filter.status && !['active', 'returned', 'all'].includes(filter.status)) fail(400, 'Unknown status.');
 if (filter.status === 'all') delete filter.status;
 else if (!filter.status) filter.status = 'active';
 if (filter.reported_by) checkId(filter.reported_by);
 if (query.q) {
   if (typeof query.q !== 'string' || query.q.length > 200) fail(400, 'Invalid keyword search.');
   filter.$text = { $search: query.q };
 }
 if (query.date) {
   if (!validDate(query.date)) fail(400, 'Invalid date.');
   const start = new Date(query.date); filter[type === 'lost' ? 'date_lost' : 'date_found'] = { $gte: start, $lt: new Date(+start + 86400000) };
 }
 return filter;
}
export function pagination(query) {
 const page = Number(query.page || 1), limit = Number(query.limit || 12);
 if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(limit) || limit < 1 || limit > 100) fail(400, 'Invalid pagination.');
 return { page, limit };
}
async function payload(body, type) {
 const allowed = ['title', 'description', 'category', 'color', 'brand', 'model', 'unique_features', 'campus_location', 'specific_location', 'image_url', 'extra_attributes', 'status', type === 'lost' ? 'date_lost' : 'date_found'];
 const data = {};
 for (const key of allowed) if (body[key] !== undefined) {
   if (key !== 'extra_attributes' && typeof body[key] !== 'string') fail(400, `${key} must be text.`);
   data[key] = body[key];
 }
 if (data.campus_location !== undefined && !await CampusLocation.exists({ name: data.campus_location, active: true })) fail(400, 'Select an active campus location.');
 const dateKey = type === 'lost' ? 'date_lost' : 'date_found';
 if (data[dateKey] !== undefined && (!validDate(data[dateKey]) || data[dateKey] > new Date().toISOString().slice(0, 10))) fail(400, 'Choose a valid date that is not in the future.');
 if (data.image_url && !DEMO_IMAGES.includes(data.image_url) && !/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(data.image_url)) fail(400, 'Use an image uploaded through this application.');
 if (data.extra_attributes && (typeof data.extra_attributes !== 'object' || Array.isArray(data.extra_attributes) || Object.keys(data.extra_attributes).length > 20 || Object.entries(data.extra_attributes).some(([k,v]) => !/^[a-zA-Z0-9_ -]{1,50}$/.test(k) || typeof v !== 'string' || v.length > 300))) fail(400, 'Provide up to 20 simple text attributes.');
 return data;
}
export const list = type => async (req, res) => {
 const filter = filters(req.query, type); const { page, limit } = pagination(req.query); const Model = modelFor(type);
 const [items, total] = await Promise.all([Model.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).lean(), Model.countDocuments(filter)]);
 res.json({ items, total, page, pages: Math.ceil(total / limit) });
};
export const read = type => async (req, res) => {
 checkId(req.params.id); const item = await modelFor(type).findById(req.params.id).populate('reported_by', 'name role').lean();
 if (!item) fail(404, 'Report not found.'); res.json(item);
};
export const create = type => async (req, res) => withReportLock(async () => {
 const data = await payload(req.body, type);
 const item = await modelFor(type).create({ ...data, reported_by: req.user._id });
 await rebuildMatches(); res.status(201).json(item);
});
export const update = type => async (req, res) => withReportLock(async () => {
 checkId(req.params.id); const item = await modelFor(type).findById(req.params.id);
 if (!item) fail(404, 'Report not found.');
 if (!item.reported_by.equals(req.user._id) && req.user.role !== 'admin') fail(403, 'Only the reporter can change this item.');
 Object.assign(item, await payload(req.body, type)); await item.save(); await rebuildMatches(); res.json(item);
});
export const remove = type => async (req, res) => withReportLock(async () => {
 checkId(req.params.id); const item = await modelFor(type).findById(req.params.id);
 if (!item) fail(404, 'Report not found.');
 if (!item.reported_by.equals(req.user._id) && req.user.role !== 'admin') fail(403, 'Only the reporter can delete this item.');
 await item.deleteOne(); await rebuildMatches(); res.status(204).end();
});
