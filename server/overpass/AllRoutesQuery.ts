import BaseQuery, { OsmRelation, OsmTags, PT_Stop } from './BaseQuery';

export type SlaveRoute = {
	id: number;
	ref: string;
	name: string;
	stops: PT_Stop[];
	tags: OsmTags;
}

export type MasterRoute = {
	id: number;
	ref: string;
	name: string;
	tags: OsmTags;
}

type RoutesInfo = {
	masters: MasterRoute[];
	routes: SlaveRoute[];
}

export type RoutesQueried = {
	bus: RoutesInfo;
	tram: RoutesInfo;
	trolleybus: RoutesInfo;
}

class AllRoutesQuery extends BaseQuery<RoutesQueried> {
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
							`node(r.sta)[public_transport=platform];` +
							`way(r.sta)[public_transport=platform];` +
						`);out;`
					)).join('')
			);

			return this.execute(query, (elements) => {
				const data: Partial<RoutesQueried> = {};

				['bus', 'tram', 'trolleybus'].forEach((transport) => {
					data[transport] = {
						masters: elements.filter(x => x.tags.type === 'route_master' && x.tags['route_master'] === transport).map((x: OsmRelation) => ({
							id: x.id,
							ref: x.tags.ref,
							name: x.tags.name,
							tags: x.tags,
						})),
						routes: elements.filter(x => x.tags.type === 'route' && x.tags['route'] === transport).map((x: OsmRelation) => ({
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

				return data as RoutesQueried;
			});
		});
	}
}

export default new AllRoutesQuery();
