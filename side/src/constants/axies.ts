// Axie metadata - single source of truth
export const AXIES = [
  { id: '001', name: 'Krio', sound: 'Oot OOt', emoji: '<:001:1388020388709273650>' },
  { id: '002', name: 'Machito', sound: 'Hissss ~ hisss', emoji: '<:002:1388020404274331730>' },
  { id: '003', name: 'Olek', sound: 'HMMM! HMMM!', emoji: '<:003:1388020413782687885>' },
  { id: '004', name: 'Puff', sound: 'Waah waah waah', emoji: '<:004:1388020422670422086>' },
  { id: '005', name: 'Buba', sound: 'Bubububu', emoji: '<:005:1388020433357639803>' },
  { id: '006', name: 'Hope', sound: 'Eghhhh o(TヘTo)', emoji: '<:006:1388020443671433307>' },
  { id: '007', name: 'Rouge', sound: '(・人・)	', emoji: '<:007:1388020453788090450>' },
  { id: '008', name: 'Noir', sound: '(・人・)	', emoji: '<:008:1388020464940482610>' },
  { id: '009', name: 'Ena', sound: 'Zzzz', emoji: '<:009:1388020474948358144>' },
  { id: '010', name: 'Xia', sound: 'Gawf ?', emoji: '<:010:1388020485857738832>' },
  { id: '011', name: 'Tripp', sound: 'Yeaghhh', emoji: '<:011:1388020496913924156>' },
  { id: '012', name: 'Momo', sound: 'Vewww', emoji: '<:012:1388020507835764838>' },
] as const

export const AXIE_LOOKUP = Object.fromEntries(AXIES.map((axie) => [axie.id, axie]))

export const AXIE_NAMES = Object.fromEntries(AXIES.map((axie) => [axie.id, axie.name]))
