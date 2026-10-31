export const CATEGORIES = ['ID Card', 'Wallet', 'Water Bottle', 'Earphones', 'Keys', 'Umbrella', 'Book', 'Bag', 'Watch', 'Mobile Accessory', 'USB Drive', 'Calculator', 'Other'];
// Campus reference data is seeded into MongoDB; clients read it from /api/locations.
export const LOCATIONS = [
  ...['A Block', 'B Block', 'C Block', 'D Block', 'M Block', 'G Block', 'H Block', 'Polytechnic Block'].map(name => ({ name, type: 'academic_block' })),
  ...['CCD', 'Food Court', 'Mangalore Canteen', 'Basketball Court', 'Parking Space'].map(name => ({ name, type: 'common_area' })),
  ...["Girls' Hostel", 'Bank of Baroda', 'Engineering Gate', 'Polytechnic Gate'].map(name => ({ name, type: 'other' }))
];
export const MATCH_CONFIG = Object.freeze({
 weights: { text:.40, category:.15, attributes:.15, location:.15, date:.10, image:.05 },
 high:.80, medium:.60, limit:5, embeddingModel:'Xenova/all-MiniLM-L6-v2', embeddingDtype:'q8',
 semanticWeight:.90, lexicalWeight:.10, locationCampusWeight:.85, locationSpecificWeight:.15,
 dateDecayDays:14, imageAvailable:false, version:2
});
