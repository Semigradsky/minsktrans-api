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
							countMembers: (x.members || []).length,
						})),
						routes: elements.filter(x => x.tags.type === 'route' && x.tags['route'] === transport).map(x => ({
							id: x.id,
							ref: x.tags.ref,
							name: x.tags.name,
							countMembers: (x.members || []).length,
							stops: x.members.map(m => m.ref),
						})),
					};
				});

				return data;
			});
		});
	}
}
