import BaseQuery, { PT_Platform, PT_Stop, PT_EntrancePass } from './BaseQuery';
import { isPlatform, isStopPosition } from './filters';

export type StopsQueried = {
	[minsktransReference: string]: Array<{
		platform: PT_Platform;
		stopPosition: PT_Stop | undefined;
		entrancePass: PT_EntrancePass | undefined;
	}>
}

const MINSK_BOUNDARIES = '53.721904099567,27.249526977539062,54.05616356873164,28.093414306640625';

class AllStopsQuery extends BaseQuery<StopsQueried> {
	do() {
		return this.fetch(`all-stops`, () => {
			const query = (
				`[out:json];` +
				`(` +
					`(` +
						`node[public_transport=platform](${MINSK_BOUNDARIES});` +
						`way[public_transport=platform](${MINSK_BOUNDARIES});>;` +
						`node[public_transport=stop_position](${MINSK_BOUNDARIES});` +
					`);` +
					`way(bn)[minsk_PT=entrance_pass];` +
				`);out;`
			);

			return this.execute(query, (elements: Array<PT_Stop | PT_Platform>) => {
				const data: StopsQueried = {};

				elements.filter(x => isPlatform(x) && x.tags['ref:minsktrans']).forEach((platform) => {
					const minsktransRef = platform.tags['ref:minsktrans'];
					const stopPosition = elements.find(x => isStopPosition(x) && x.tags['ref:minsktrans'] === minsktransRef);
					let entrancePass: PT_EntrancePass | undefined = undefined;

					if (stopPosition) {
						const stopPositionPathes = elements.filter(x => x.type === 'way' && x.nodes.includes(stopPosition.id)) as PT_EntrancePass[];

						if (platform.type === 'node') {
							entrancePass = stopPositionPathes.find(x => x.nodes.includes(platform.id));
						} else {
							for (const node of platform.nodes) {
								entrancePass = stopPositionPathes.find(x => x.nodes.includes(node));
								if (entrancePass) {
									break;
								}
							}
						}
					}

					data[platform.tags['ref:minsktrans']] = data[platform.tags['ref:minsktrans']] || [];

					data[platform.tags['ref:minsktrans']].push({
						platform,
						stopPosition,
						entrancePass,
					});
				});

				return data;
			});
		});
	}
}

export default new AllStopsQuery();
