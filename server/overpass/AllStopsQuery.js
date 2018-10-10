import BaseQuery from './BaseQuery';
import { isPlatform, isStopPosition } from './filters';

export default new class extends BaseQuery {
	do() {
		return this.fetch(`all-stops`, () => {
			const query = (
				`[out:json];` +
				`(` +
					`(` +
						`node[public_transport=platform](53.709307173772835,27.249526977539062,54.07550572224815,27.927932739257812);` +
						`way[public_transport=platform](53.709307173772835,27.249526977539062,54.07550572224815,27.927932739257812);>;` +
						`node[public_transport=stop_position](53.709307173772835,27.249526977539062,54.07550572224815,27.927932739257812);` +
					`);` +
					`way(bn)[minsk_PT=entrance_pass];` +
				`);out;`
			);

			return this.execute(query, (elements) => {
				const data = {};

				elements.filter(x => isPlatform(x) && x.tags['ref:minsktrans']).forEach((platform) => {
					const minsktransRef = platform.tags['ref:minsktrans'];
					const stopPosition = elements.find(x => isStopPosition(x) && x.tags['ref:minsktrans'] === minsktransRef);
					let entrancePass = null;

					if (stopPosition) {
						const stopPositionPathes = elements.filter(x => x.nodes && x.nodes.includes(stopPosition.id));

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

					data[platform.tags['ref:minsktrans']] = {
						platform,
						stopPosition,
						entrancePass,
					};
				});

				return data;
			});
		});
	}
}

3047241414
