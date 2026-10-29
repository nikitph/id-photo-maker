import { presets } from '$lib/presets';
export const prerender=true;
export function entries(){return presets.map(p=>({preset:p.id}));}
