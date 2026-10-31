export const demoImage = index => `/demo-items/item-${index}.svg`;
export const DEMO_IMAGES = Array.from({length:17},(_,index)=>demoImage(index));
