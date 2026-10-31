import mongoose from 'mongoose';
const schema = new mongoose.Schema({
 lost_item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem', required: true },
 found_item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', required: true },
 text_similarity: Number, category_match: Number, attribute_match: Number, location_score: Number, date_score: Number,
 image_similarity: {type:Number,default:null}, image_available: {type:Boolean,default:false},
 text_method:String, model:String, scoring_version:Number, effective_weights:{type:Map,of:Number},
 final_score: Number, match_level: { type: String, enum: ['High', 'Medium', 'Low'] }, reasons: [String]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
schema.index({ lost_item_id: 1, found_item_id: 1 }, { unique: true });
schema.index({ final_score: -1 });
export default mongoose.model('Match', schema, 'matches');
