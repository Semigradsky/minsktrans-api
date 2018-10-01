import BaseQuery from './BaseQuery';

export default new class extends BaseQuery {
	do() {
		return this.fetch(`all-stops`, () => {
			const query = (
				`[out:json];` +
				`(` +
					`(` +
						`node[public_transport=platform](53.709307173772835,27.249526977539062,54.07550572224815,27.927932739257812);` +
						`node[public_transport=stop_position](53.709307173772835,27.249526977539062,54.07550572224815,27.927932739257812);` +
					`);` +
					`way(bn)[minsk_PT=entrance_pass];` +
				`);out;`
			);

			return this.execute(query, (elements) => {
				const data = {};

				elements.filter(x => x.tags['public_transport'] === 'platform' && x.tags['ref:minsktrans']).forEach((platform) => {
					const stopPosition = elements.find(x => x.tags['public_transport'] === 'stop_position' && x.tags['ref:minsktrans'] === platform.tags['ref:minsktrans']);
					let entrancePass = null;

					if (stopPosition) {
						entrancePass = elements.find(x => x.nodes && x.nodes.includes(stopPosition.id) && x.nodes.includes(platform.id));
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
