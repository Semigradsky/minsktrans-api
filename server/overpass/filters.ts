export const isPlatform = (x) => x.tags && x.tags['public_transport'] === 'platform';
export const isStopPosition = (x) => x.tags && x.tags['public_transport'] === 'stop_position';
