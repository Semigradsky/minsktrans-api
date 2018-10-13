import BaseQuery from './BaseQuery';

export default new class extends BaseQuery {
	do() {
		return this.fetch(`all-routes`, () => {
			const query = (
				`[out:json];` +
				`area(3600059195) -> .searchArea;` +
				['bus', 'tram', 'trolleybus']
					.map((transport) => (
						`rel[route=${transport}](area.searchArea) -> .sta;` +
						`(` +
							`rel[route_master=${transport}](br.sta);` +
							`.sta;` +
							`node(r)[public_transport=platform];` +
							`way(r)[public_transport=platform];` +
						`);out;`
					)).join('')
			);

			return this.execute(query, (elements) => {
				const data = {};

				['bus', 'tram', 'trolleybus'].forEach((transport) => {
					data[transport] = {
						masters: elements.filter(x => x.tags.type === 'route_master' && x.tags['route_master'] === transport).map(x => ({
							id: x.id,
							ref: x.tags.ref,
							name: x.tags.name,
							tags: x.tags,
						})),
						routes: elements.filter(x => x.tags.type === 'route' && x.tags['route'] === transport).map(x => ({
							id: x.id,
							ref: x.tags.ref,
							name: x.tags.name,
							stops: x.members.map(m =>
								elements.find(e => e.id === m.ref)
							).filter(x => !!x),
							tags: x.tags,
						})),
					};
				});

				return data;
			});
		});
	}
}
