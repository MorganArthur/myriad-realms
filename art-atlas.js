"use strict";

// 原创插图图集映射：界面只消费稳定 id，不关心图集坐标。

(() => {
  const atlas = (columns, rows, cells) => Object.freeze({ columns, rows, cells: Object.freeze(cells) });
  const atlases = Object.freeze({
    heroes: atlas(3, 2, { statesman: [0, 0], warden: [1, 0], artificer: [2, 0], champion: [0, 1], healer: [1, 1], explorer: [2, 1] }),
    artifacts: atlas(4, 2, { star_compass: [0, 0], titan_hammer: [1, 0], verdant_crown: [2, 0], oath_tablet: [3, 0] }),
    wonders: atlas(4, 2, { grand_library: [0, 1], worldroot_garden: [1, 1], eternal_forge: [2, 1], sky_citadel: [3, 1] }),
    events: atlas(4, 3, { starfall: [0, 0], council: [1, 0], blight: [2, 0], empty_throne: [3, 0], guild_revolution: [0, 1], sacred_schism: [1, 1], border_exodus: [2, 1], sea_road: [3, 1], ancient_beast: [0, 2], fire_mountain: [1, 2], lost_city: [2, 2], iron_doctrine: [3, 2] })
  });

  function cellStyle(group, id) {
    const definition = atlases[group], cell = definition?.cells?.[id]; if (!definition || !cell) return "";
    const x = definition.columns > 1 ? cell[0] / (definition.columns - 1) * 100 : 0, y = definition.rows > 1 ? cell[1] / (definition.rows - 1) * 100 : 0;
    return `--art-x:${Number(x.toFixed(3))}%;--art-y:${Number(y.toFixed(3))}%`;
  }

  globalThis.RealmArtAtlas = Object.freeze({ atlases, cellStyle });
})();
