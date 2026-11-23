export const brand = {
  name: '瑞軒花生糖',
  phone: '0906-239-338',
  lineId: '@487ubosi',
  facebook: 'https://www.facebook.com/profile.php?id=100064057418878',
  announcement: 'https://www.facebook.com/100064057418878/videos/858216057386150/',
  film: 'https://www.youtube.com/watch?v=o_c5xxYMn6o',
  maps: 'https://www.google.com/maps/search/?api=1&query=%E7%91%9E%E8%BB%92%E8%8A%B1%E7%94%9F%E7%B3%96'
};

export const shipping = { estimate: 60, freeFrom: 1000 };
export const maxQuantity = 99;

export const products = [
  { id: 1, group: 'peanut', weight: 300, image: 'item-1.webp',
    names: ['芝麻花生糖', 'Sesame peanut brittle', 'ごまピーナッツ飴'],
    notes: ['花生和芝麻裹上麥芽糖，香酥爽口。', 'Peanuts and sesame in a crisp malt-syrup brittle.', '落花生とごまを麦芽糖でまとめた、香ばしい飴菓子。'] },
  { id: 2, group: 'peanut', weight: 300, image: 'item-2.webp',
    names: ['黑金剛花生糖', 'Black peanut brittle', '黒落花生飴'],
    notes: ['黑金剛花生做成的傳統脆糖，凸顯花生香。', 'Traditional brittle with the deep flavor of black peanuts.', '黒落花生のコクが楽しめる伝統的な飴菓子。'] },
  { id: 3, group: 'brittle', weight: 250, image: 'item-3.webp',
    names: ['芝麻杏仁酥', 'Sesame almond crunch', 'ごまアーモンドクリスプ'],
    notes: ['杏仁與芝麻搭配，帶出清脆口感。', 'A crisp bite with almonds and sesame.', 'アーモンドとごまを合わせた、さくっとしたお菓子。'] },
  { id: 4, group: 'brittle', weight: 220, image: 'item-4.webp',
    names: ['養生堅果酥', 'Mixed nut crunch', 'ミックスナッツクリスプ'],
    notes: ['不同堅果組成的脆口點心。', 'A crunchy snack made with a mix of nuts.', 'いろいろなナッツの食感を楽しめるお菓子。'] },
  { id: 5, group: 'brittle', weight: 250, image: 'item-5.webp',
    names: ['黑芝麻酥', 'Black sesame crunch', '黒ごまクリスプ'],
    notes: ['帶有黑芝麻香氣的酥脆點心。', 'A crisp snack with a rich black sesame aroma.', '黒ごまの香りが広がる、さくっとしたお菓子。'] },
  { id: 6, group: 'cashew', weight: 150, image: 'item-6.webp',
    names: ['腰果酥', 'Cashew crunch', 'カシューナッツクリスプ'],
    notes: ['腰果做成的酥脆點心，適合配茶。', 'Crisp cashew bites to enjoy with tea.', 'お茶と相性のよい、カシューナッツのクリスプ。'] },
  { id: 7, group: 'cashew', weight: null, image: 'item-7.webp',
    names: ['蔓越莓腰果酥', 'Cranberry cashew crunch', 'クランベリーカシューナッツクリスプ'],
    notes: ['腰果搭配蔓越莓，帶一點果酸。', 'Cashew crunch with a tart cranberry note.', 'カシューナッツにクランベリーの酸味を合わせました。'] },
  { id: 8, group: 'cashew', weight: 150, image: 'item-8.webp',
    names: ['腰果糖霜', 'Sugar-coated cashews', '砂糖がけカシューナッツ'],
    notes: ['糖霜裹住腰果，香甜爽脆。', 'Crunchy cashews with a sweet sugar coating.', 'カシューナッツに砂糖をまとわせた、香ばしいおやつ。'] },
  { id: 9, group: 'cashew', weight: 150, image: 'item-9.webp',
    names: ['原味腰果', 'Plain cashews', 'プレーンカシューナッツ'],
    notes: ['保留腰果原本的風味。', 'Enjoy the natural flavor of cashews.', 'カシューナッツそのものの風味を楽しめます。'] }
].map(product => ({ price: 150, ...product }));
