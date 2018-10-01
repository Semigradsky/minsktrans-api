import BaseQuery from './BaseQuery';

export default new class extends BaseQuery {
	do(routeNum, transport) {
		return this.fetch(`route-${transport}-${routeNum}`, () => {
			const query = (
				`[out:json];` +
				`area(3600059195) -> .searchArea;` +
				`rel[route=${transport}][ref="${routeNum}"](area.searchArea);out;` +
				`node(r);out;`
			);

			return this.execute(query, (elements) => {
				return elements.filter(e => e.type === 'relation').map(r => ({
					relation: r,
					stops: r.members.filter(m =>
						m.type === 'node'
					).map(m =>
						elements.find(e => e.id === m.ref)
					)
				}));
			});
		});
	}
}
