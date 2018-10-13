const ONE_MINUTE = 1000 * 60;
const ONE_DAY = ONE_MINUTE * 60 * 24;

export default {
	cache: {
		overpass: {
			default: ONE_MINUTE * 30,
		},
		default: ONE_DAY,
	}
};
