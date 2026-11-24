/* 豆屿 · 拼豆小岛 —— 微信小游戏 Canvas 版核心
 * 这是一套独立的小游戏代码：game.js + game.json，不使用 WXML / web-view。
 * 先实现最核心的：29×29 拼板、选色、放豆/收豆、撤销、熨烫、清空。
 */
const sys = wx.getSystemInfoSync();
const W = sys.windowWidth;
const H = sys.windowHeight;
const DPR = Math.min(2, sys.pixelRatio || 1);
const SAFE_TOP = (sys.safeArea && sys.safeArea.top) || 20;
const SAFE_BOTTOM = sys.safeArea ? sys.safeArea.bottom : H;

const canvas = wx.createCanvas();
canvas.width = W * DPR;
canvas.height = H * DPR;
const ctx = canvas.getContext('2d');
ctx.scale(DPR, DPR);

const N = 29;
const COLORS = [
  { code: "P08", name: "朱红", hex: "#E0582F" },
  { code: "P05", name: "柠黄", hex: "#F5C24F" },
  { code: "P21", name: "薄荷", hex: "#8ECFBB" },
  { code: "P18", name: "天蓝", hex: "#4DA7D9" },
  { code: "P12", name: "藕花", hex: "#F5B0C0" },
  { code: "P15", name: "薰衣草", hex: "#B49AD9" },
  { code: "P17", name: "钴蓝", hex: "#2C5FBF" },
  { code: "P30", name: "墨黑", hex: "#20222A" },
  { code: "P01", name: "雪白", hex: "#F6F3EA" },
  { code: "P02", name: "奶油", hex: "#F2E6CC" },
  { code: "P03", name: "象牙", hex: "#E4D4AE" },
  { code: "P28", name: "岩灰", hex: "#8B9097" },
  { code: "P29", name: "炭灰", hex: "#444A54" },
  { code: "P31", name: "银亮", hex: "#C6CBD1" },
  { code: "P32", name: "鎏金", hex: "#C9A227" },
  { code: "P04", name: "柠檬", hex: "#F6DB57" },
  { code: "P06", name: "姜黄", hex: "#E5A03C" },
  { code: "P07", name: "橙色", hex: "#EE8835" },
  { code: "P09", name: "正红", hex: "#D6393B" },
  { code: "P10", name: "樱桃", hex: "#BF2A45" },
  { code: "P11", name: "玫粉", hex: "#E5487E" },
  { code: "P13", name: "蜜桃", hex: "#F7CCB3" },
  { code: "P25", name: "咖啡", hex: "#6B4328" },
  { code: "P26", name: "驼色", hex: "#B8895C" },
  { code: "P27", name: "沙色", hex: "#D8BC98" },
  { code: "P14", name: "葡萄紫", hex: "#78499B" },
  { code: "P16", name: "深海蓝", hex: "#1F376D" },
  { code: "P19", name: "雾蓝", hex: "#A7CEE7" },
  { code: "P20", name: "孔雀", hex: "#1E8E8B" },
  { code: "P22", name: "森林", hex: "#2C6A4E" },
  { code: "P23", name: "草绿", hex: "#5EA24B" },
  { code: "P24", name: "青柠", hex: "#AECC47" },
  { code: "P33", name: "荧光粉", hex: "#FF5EA8" },
  { code: "P34", name: "荧光绿", hex: "#9BF24D" },
  { code: "P35", name: "夜光", hex: "#E4F6C6" },
  { code: "P36", name: "透蓝", hex: "#BFE7F6" },
  { code: "H01", name: "White", hex: "#ECEDED", brand: "HAMA" },
  { code: "H02", name: "Cream", hex: "#F0E8B9", brand: "HAMA" },
  { code: "H03", name: "Yellow", hex: "#F0B901", brand: "HAMA" },
  { code: "H04", name: "Orange", hex: "#E64F27", brand: "HAMA" },
  { code: "H05", name: "Red", hex: "#B63136", brand: "HAMA" },
  { code: "H06", name: "Pink", hex: "#E1889F", brand: "HAMA" },
  { code: "H07", name: "Purple", hex: "#694A82", brand: "HAMA" },
  { code: "H08", name: "Blue", hex: "#2C4690", brand: "HAMA" },
  { code: "H09", name: "Light Blue", hex: "#305CB0", brand: "HAMA" },
  { code: "H10", name: "Green", hex: "#256847", brand: "HAMA" },
  { code: "H11", name: "Light Green", hex: "#49AE89", brand: "HAMA" },
  { code: "H12", name: "Brown", hex: "#534137", brand: "HAMA" },
  { code: "H13", name: "Translucent Red", hex: "#C02435", brand: "HAMA" },
  { code: "H14", name: "Translucent Yellow", hex: "#E4AA32", brand: "HAMA" },
  { code: "H15", name: "Translucent Blue", hex: "#487ED5", brand: "HAMA" },
  { code: "H16", name: "Translucent Green", hex: "#37B876", brand: "HAMA" },
  { code: "H17", name: "Grey", hex: "#83888A", brand: "HAMA" },
  { code: "H18", name: "Black", hex: "#2E2F31", brand: "HAMA" },
  { code: "H19", name: "Clear", hex: "#D8D2CE", brand: "HAMA" },
  { code: "H20", name: "Reddish Brown", hex: "#7F332A", brand: "HAMA" },
  { code: "H21", name: "Light Brown", hex: "#A5693F", brand: "HAMA" },
  { code: "H22", name: "Dark Red", hex: "#A52D36", brand: "HAMA" },
  { code: "H24", name: "Translucent Purple", hex: "#683E9A", brand: "HAMA" },
  { code: "H25", name: "Translucent Brown", hex: "#87593D", brand: "HAMA" },
  { code: "H26", name: "Matt Rose", hex: "#DE9B90", brand: "HAMA" },
  { code: "H27", name: "Beige", hex: "#DEB48B", brand: "HAMA" },
  { code: "H28", name: "Dark Green", hex: "#363F38", brand: "HAMA" },
  { code: "H29", name: "Claret", hex: "#B9395E", brand: "HAMA" },
  { code: "H30", name: "Burgundy", hex: "#592F38", brand: "HAMA" },
  { code: "H31", name: "Turquoise", hex: "#6797AE", brand: "HAMA" },
  { code: "H32", name: "Neon Fuchsia", hex: "#FF208D", brand: "HAMA" },
  { code: "H33", name: "Cerise", hex: "#FF3956", brand: "HAMA" },
  { code: "H34", name: "Neon Yellow", hex: "#E5EF13", brand: "HAMA" },
  { code: "H35", name: "Neon Red", hex: "#FF2833", brand: "HAMA" },
  { code: "H36", name: "Neon Blue", hex: "#2353B0", brand: "HAMA" },
  { code: "H37", name: "Neon Green", hex: "#06B73C", brand: "HAMA" },
  { code: "H38", name: "Neon Orange", hex: "#FD8600", brand: "HAMA" },
  { code: "H39", name: "Fluorescent Yellow", hex: "#F1F21C", brand: "HAMA" },
  { code: "H40", name: "Fluorescent Orange", hex: "#FE630B", brand: "HAMA" },
  { code: "H41", name: "Fluorescent Blue", hex: "#2659B2", brand: "HAMA" },
  { code: "H42", name: "Fluorescent Green", hex: "#0CBD51", brand: "HAMA" },
  { code: "H43", name: "Pastel Yellow", hex: "#F0EA37", brand: "HAMA" },
  { code: "H44", name: "Pastel Red", hex: "#EE6972", brand: "HAMA" },
  { code: "H45", name: "Pastel Purple", hex: "#886DB9", brand: "HAMA" },
  { code: "H46", name: "Pastel Blue", hex: "#629ED7", brand: "HAMA" },
  { code: "H47", name: "Pastel Green", hex: "#83CB70", brand: "HAMA" },
  { code: "H48", name: "Pastel Pink", hex: "#CF70B7", brand: "HAMA" },
  { code: "H49", name: "Azure", hex: "#4998BC", brand: "HAMA" },
  { code: "H55", name: "Glow In The Dark - Green", hex: "#FAF8ED", brand: "HAMA" },
  { code: "H56", name: "Glow In The Dark - Red", hex: "#EDBF9F", brand: "HAMA" },
  { code: "H57", name: "Blue (Glow In The Dark)", hex: "#C4D0E3", brand: "HAMA" },
  { code: "H60", name: "Teddybear Brown", hex: "#F49422", brand: "HAMA" },
  { code: "H61", name: "Gold", hex: "#D99350", brand: "HAMA" },
  { code: "H62", name: "Silver", hex: "#48474A", brand: "HAMA" },
  { code: "H63", name: "Bronze", hex: "#42312F", brand: "HAMA" },
  { code: "H64", name: "Pearl", hex: "#EFEBE4", brand: "HAMA" },
  { code: "H70", name: "Light Grey", hex: "#B6B6D4", brand: "HAMA" },
  { code: "H71", name: "Dark Grey", hex: "#464541", brand: "HAMA" },
  { code: "H72", name: "Translucent Pink", hex: "#F097B0", brand: "HAMA" },
  { code: "H73", name: "Translucent Aqua", hex: "#59AEF5", brand: "HAMA" },
  { code: "H74", name: "Translucent Lilac", hex: "#5B55BD", brand: "HAMA" },
  { code: "H75", name: "Light Nougat", hex: "#BF7B4D", brand: "HAMA" },
  { code: "H76", name: "Nougat", hex: "#663317", brand: "HAMA" },
  { code: "H77", name: "Cloudy White", hex: "#EDE7DF", brand: "HAMA" },
  { code: "H78", name: "Light Peach", hex: "#FFC99A", brand: "HAMA" },
  { code: "H79", name: "Apricot", hex: "#F08643", brand: "HAMA" },
  { code: "H82", name: "Plum", hex: "#962F5C", brand: "HAMA" },
  { code: "H83", name: "Petrol Blue", hex: "#0178A4", brand: "HAMA" },
  { code: "H84", name: "Olive Green", hex: "#8B924C", brand: "HAMA" },
  { code: "H95", name: "Pastel Rose", hex: "#F8CCE0", brand: "HAMA" },
  { code: "H96", name: "Pastel Lilac", hex: "#D4B1E3", brand: "HAMA" },
  { code: "H97", name: "Pastel Ice Blue", hex: "#A2D3FE", brand: "HAMA" },
  { code: "H98", name: "Pastel Mint", hex: "#9ADBB1", brand: "HAMA" },
  { code: "H101", name: "Eucalyptus", hex: "#A9C39B", brand: "HAMA" },
  { code: "H102", name: "Forest Green", hex: "#356B2D", brand: "HAMA" },
  { code: "H103", name: "Light Yellow", hex: "#FFE660", brand: "HAMA" },
  { code: "H104", name: "Lime", hex: "#BCD122", brand: "HAMA" },
  { code: "H105", name: "Light Apricot", hex: "#FFAC78", brand: "HAMA" },
  { code: "H106", name: "Light Lavender", hex: "#CCC5ED", brand: "HAMA" },
  { code: "H107", name: "Lavender", hex: "#6A87C1", brand: "HAMA" },
  { code: "H108", name: "Aubergine", hex: "#2A2536", brand: "HAMA" },
  { code: "H109", name: "Cloudy Grey", hex: "#8A847F", brand: "HAMA" },
  { code: "H110", name: "Matcha", hex: "#838956", brand: "HAMA" },
  { code: "H111", name: "Dark Blush", hex: "#835854", brand: "HAMA" },
  { code: "H112", name: "Blush", hex: "#AD8A82", brand: "HAMA" },
  { code: "H113", name: "Aqua", hex: "#5F887B", brand: "HAMA" },
  { code: "H114", name: "Cherry Red", hex: "#9A2C31", brand: "HAMA" },
  { code: "H115", name: "Bright Green", hex: "#6E975F", brand: "HAMA" },
  { code: "H116", name: "Midnight Blue", hex: "#222838", brand: "HAMA" },
  { code: "H117", name: "Taupe Grey", hex: "#777169", brand: "HAMA" },
  { code: "H118", name: "Maroon Red", hex: "#612932", brand: "HAMA" },
  { code: "H119", name: "Sky Blue", hex: "#4167B4", brand: "HAMA" },
  { code: "H90A", name: "Stripe Mix - Red & White", hex: "#B63136", brand: "HAMA" },
  { code: "H90B", name: "Stripe Mix - Black & White", hex: "#191919", brand: "HAMA" },
  { code: "H90C", name: "Stripe Mix - Azure & White", hex: "#4998BC", brand: "HAMA" },
  { code: "H90D", name: "Stripe Mix - Yellow & Red", hex: "#F0B901", brand: "HAMA" },
  { code: "H90E", name: "Stripe Mix - Purple & Pink", hex: "#694A82", brand: "HAMA" },
  { code: "H90F", name: "Stripe Mix - Blue & Green", hex: "#305CB0", brand: "HAMA" },
  { code: "H120", name: "Dusty Blue", hex: "#ECF4F8", brand: "HAMA" },
  { code: "H121", name: "Fuchsia Pink", hex: "#D0357B", brand: "HAMA" },
  { code: "H122", name: "Mustard", hex: "#CCA23B", brand: "HAMA" },
  { code: "P01", name: "White", hex: "#F1F1F1", brand: "PERLER" },
  { code: "P02", name: "Cream", hex: "#E0DEA9", brand: "PERLER" },
  { code: "P03", name: "Yellow", hex: "#ECD800", brand: "PERLER" },
  { code: "P04", name: "Orange", hex: "#ED6120", brand: "PERLER" },
  { code: "P05", name: "Red", hex: "#F01820", brand: "PERLER" },
  { code: "P06", name: "Bubblegum", hex: "#DD669B", brand: "PERLER" },
  { code: "P07", name: "Purple", hex: "#604089", brand: "PERLER" },
  { code: "P08", name: "Dark Blue", hex: "#2B3F87", brand: "PERLER" },
  { code: "P09", name: "Light Blue", hex: "#3370C0", brand: "PERLER" },
  { code: "P10", name: "Dark Green", hex: "#1C753E", brand: "PERLER" },
  { code: "P11", name: "Light Green", hex: "#56BA9F", brand: "PERLER" },
  { code: "P12", name: "Brown", hex: "#513931", brand: "PERLER" },
  { code: "P17", name: "Grey", hex: "#8A8D91", brand: "PERLER" },
  { code: "P18", name: "Black", hex: "#2E2F32", brand: "PERLER" },
  { code: "P20", name: "Rust", hex: "#8C372C", brand: "PERLER" },
  { code: "P21", name: "Light Brown", hex: "#815D34", brand: "PERLER" },
  { code: "P33", name: "Peach", hex: "#EEBAB2", brand: "PERLER" },
  { code: "P35", name: "Tan", hex: "#BC9371", brand: "PERLER" },
  { code: "P38", name: "Magenta", hex: "#F22A7B", brand: "PERLER" },
  { code: "P47", name: "Neon Yellow", hex: "#DCE002", brand: "PERLER" },
  { code: "P48", name: "Neon Orange", hex: "#FF7700", brand: "PERLER" },
  { code: "P49", name: "Neon Green", hex: "#019E43", brand: "PERLER" },
  { code: "P50", name: "Neon Pink", hex: "#FF3991", brand: "PERLER" },
  { code: "P52", name: "Pastel Blue", hex: "#5390D1", brand: "PERLER" },
  { code: "P53", name: "Pastel Green", hex: "#76C882", brand: "PERLER" },
  { code: "P54", name: "Pastel Lavender", hex: "#8A72C1", brand: "PERLER" },
  { code: "P56", name: "Pastel Yellow", hex: "#FEF875", brand: "PERLER" },
  { code: "P57", name: "Cheddar", hex: "#F1AA0C", brand: "PERLER" },
  { code: "P58", name: "Toothpaste", hex: "#93C8D4", brand: "PERLER" },
  { code: "P59", name: "Hot Coral", hex: "#FF3851", brand: "PERLER" },
  { code: "P60", name: "Plum", hex: "#A24B9C", brand: "PERLER" },
  { code: "P61", name: "Kiwi Lime", hex: "#6CBE13", brand: "PERLER" },
  { code: "P62", name: "Turquoise", hex: "#2B89C6", brand: "PERLER" },
  { code: "P63", name: "Blush", hex: "#FF8285", brand: "PERLER" },
  { code: "P70", name: "Periwinkle Blue", hex: "#647CBE", brand: "PERLER" },
  { code: "P75", name: "Glow Green", hex: "#BEC696", brand: "PERLER" },
  { code: "P79", name: "Light Pink", hex: "#F6B3DD", brand: "PERLER" },
  { code: "P80", name: "Bright Green", hex: "#4FAD42", brand: "PERLER" },
  { code: "P81", name: "Light Gray", hex: "#EEE3CF", brand: "PERLER" },
  { code: "P82", name: "Light Lavender", hex: "#AD98D4", brand: "PERLER" },
  { code: "P83", name: "Pink", hex: "#E44892", brand: "PERLER" },
  { code: "P85", name: "Gold", hex: "#BB7634", brand: "PERLER" },
  { code: "P88", name: "Raspberry", hex: "#A53061", brand: "PERLER" },
  { code: "P89", name: "Neon Blue", hex: "#406AE1", brand: "PERLER" },
  { code: "P90", name: "Butterscotch", hex: "#D48437", brand: "PERLER" },
  { code: "P91", name: "Parrot Green", hex: "#067C81", brand: "PERLER" },
  { code: "P92", name: "Dark Grey", hex: "#4D5156", brand: "PERLER" },
  { code: "P93", name: "Blueberry Cream", hex: "#8297D9", brand: "PERLER" },
  { code: "P96", name: "Cranapple", hex: "#801922", brand: "PERLER" },
  { code: "P97", name: "Prickly Pear", hex: "#BDDA01", brand: "PERLER" },
  { code: "P98", name: "Sand", hex: "#E4B690", brand: "PERLER" },
  { code: "P100", name: "Pearl Coral", hex: "#F97E79", brand: "PERLER" },
  { code: "P101", name: "Pearl Light Blue", hex: "#7AAEA2", brand: "PERLER" },
  { code: "P102", name: "Pearl Green", hex: "#84B791", brand: "PERLER" },
  { code: "P103", name: "Pearl Yellow", hex: "#CAC033", brand: "PERLER" },
  { code: "P104", name: "Pearl Light Pink", hex: "#D7A8A2", brand: "PERLER" },
  { code: "P105", name: "Silver", hex: "#777B81", brand: "PERLER" },
  { code: "P179", name: "Evergreen", hex: "#114938", brand: "PERLER" },
  { code: "P181", name: "Light Grey", hex: "#B3BAB8", brand: "PERLER" },
  { code: "P182", name: "Lavender", hex: "#AF9FCE", brand: "PERLER" },
  { code: "P199", name: "Shamrock", hex: "#008F53", brand: "PERLER" },
  { code: "P200", name: "Cobalt", hex: "#0065B1", brand: "PERLER" },
  { code: "P201", name: "Midnight", hex: "#2F3C55", brand: "PERLER" },
  { code: "P202", name: "Robin's Egg", hex: "#A9CDD5", brand: "PERLER" },
  { code: "P203", name: "Flamingo", hex: "#F2AFB7", brand: "PERLER" },
  { code: "P204", name: "Salmon", hex: "#E1747A", brand: "PERLER" },
  { code: "P205", name: "Fawn", hex: "#C9A385", brand: "PERLER" },
  { code: "P206", name: "Pewter", hex: "#94A19D", brand: "PERLER" },
  { code: "P207", name: "Charcoal", hex: "#4F595A", brand: "PERLER" },
  { code: "P208", name: "Toasted Marshmallow", hex: "#DEDACE", brand: "PERLER" },
  { code: "P210", name: "Orchid", hex: "#B1628E", brand: "PERLER" },
  { code: "P211", name: "Tomato", hex: "#D14337", brand: "PERLER" },
  { code: "P212", name: "Spice", hex: "#D9593A", brand: "PERLER" },
  { code: "P213", name: "Apricot", hex: "#F5A168", brand: "PERLER" },
  { code: "P214", name: "Sherbet", hex: "#D8E47C", brand: "PERLER" },
  { code: "P215", name: "Mist", hex: "#93B0BD", brand: "PERLER" },
  { code: "P216", name: "Sky", hex: "#4AC0D8", brand: "PERLER" },
  { code: "P217", name: "Lagoon", hex: "#00A4AC", brand: "PERLER" },
  { code: "P218", name: "Teal", hex: "#047F8A", brand: "PERLER" },
  { code: "P219", name: "Fern", hex: "#7F971A", brand: "PERLER" },
  { code: "P220", name: "Olive", hex: "#696E31", brand: "PERLER" },
  { code: "P239", name: "Mocha", hex: "#C8B693", brand: "PERLER" },
  { code: "P240", name: "Mint", hex: "#B3EED5", brand: "PERLER" },
  { code: "P241", name: "Sour Apple", hex: "#A3DE6F", brand: "PERLER" },
  { code: "P242", name: "Cotton Candy", hex: "#F479B0", brand: "PERLER" },
  { code: "P243", name: "Grape", hex: "#503B9C", brand: "PERLER" },
  { code: "P244", name: "Rose", hex: "#D25D72", brand: "PERLER" },
  { code: "P245", name: "Iris", hex: "#4E56A3", brand: "PERLER" },
  { code: "P246", name: "Tangerine", hex: "#FD5918", brand: "PERLER" },
  { code: "P247", name: "Forest", hex: "#005D57", brand: "PERLER" },
  { code: "P248", name: "Eggplant", hex: "#6F3255", brand: "PERLER" },
  { code: "P249", name: "Honey", hex: "#DA8C2C", brand: "PERLER" },
  { code: "P250", name: "Gingerbread", hex: "#7E5446", brand: "PERLER" },
  { code: "P251", name: "Thistle", hex: "#8C8CA7", brand: "PERLER" },
  { code: "P252", name: "Denim", hex: "#4C6388", brand: "PERLER" },
  { code: "P253", name: "Sage", hex: "#9AA98E", brand: "PERLER" },
  { code: "P254", name: "Orange Cream", hex: "#EFB79B", brand: "PERLER" },
  { code: "P255", name: "Fruit Punch", hex: "#CA3B65", brand: "PERLER" },
  { code: "P256", name: "Fuchsia", hex: "#CB59B9", brand: "PERLER" },
  { code: "P257", name: "Mulberry", hex: "#714875", brand: "PERLER" },
  { code: "P258", name: "Slime", hex: "#C8C85C", brand: "PERLER" },
  { code: "P259", name: "Stone", hex: "#988C8C", brand: "PERLER" },
  { code: "P260", name: "Dark Spruce", hex: "#14313B", brand: "PERLER" },
  { code: "P261", name: "Cocoa", hex: "#392928", brand: "PERLER" },
  { code: "P262", name: "Slate Blue", hex: "#5E6D7B", brand: "PERLER" },
  { code: "P263", name: "Celery", hex: "#BED4A6", brand: "PERLER" },
  { code: "P265", name: "Twilight Plum", hex: "#C685B1", brand: "PERLER" },
  { code: "P266", name: "Caribbean Sea", hex: "#6CC8AD", brand: "PERLER" },
  { code: "P267", name: "Frosted Lilac", hex: "#CDB7C3", brand: "PERLER" },
  { code: "P268", name: "Sunflower", hex: "#DEBA0B", brand: "PERLER" },
  { code: "P269", name: "Lemon", hex: "#F6D901", brand: "PERLER" },
  { code: "P272", name: "Coral", hex: "#FF9A8B", brand: "PERLER" },
  { code: "P273", name: "Brick", hex: "#FC9574", brand: "PERLER" },
  { code: "P274", name: "Rich Butter", hex: "#F6CA69", brand: "PERLER" },
  { code: "P275", name: "Peacock", hex: "#0090AC", brand: "PERLER" },
  { code: "P276", name: "Carnation Pink", hex: "#F8C7C9", brand: "PERLER" },
  { code: "P961", name: "Cherry", hex: "#9D2B3A", brand: "PERLER" },
  { code: "P19", name: "Clear", hex: "#F5FAFD", brand: "PERLER" },
  { code: "P39A", name: "Glitter Mix - Red", hex: "#FA413D", brand: "PERLER" },
  { code: "P39B", name: "Glitter Mix - Green", hex: "#19B4BE", brand: "PERLER" },
  { code: "P39C", name: "Glitter Mix - Blue", hex: "#3380DC", brand: "PERLER" },
  { code: "P39D", name: "Glitter Mix - Yellow", hex: "#FFEB17", brand: "PERLER" },
  { code: "P39E", name: "Glitter Mix - Purple", hex: "#78639C", brand: "PERLER" },
  { code: "P39F", name: "Glitter Mix - Clear", hex: "#F5FAFD", brand: "PERLER" },
  { code: "P72", name: "Coral", hex: "#FF9683", brand: "PERLER" },
  { code: "P73", name: "Brick", hex: "#F98E66", brand: "PERLER" },
  { code: "P74", name: "Rich Butter", hex: "#F8C961", brand: "PERLER" },
  { code: "P75G", name: "Glow in the Dark - Green", hex: "#E6FAE6", brand: "PERLER" },
  { code: "P76", name: "Carnation", hex: "#FED8D8", brand: "PERLER" },
  { code: "P165A", name: "Newsprint Stripe Mix - Black", hex: "#191919", brand: "PERLER" },
  { code: "P165B", name: "Newsprint Stripe Mix - Grey", hex: "#8A8D91", brand: "PERLER" },
  { code: "P167A", name: "Glow in the Dark Mix - Green", hex: "#E6FAE6", brand: "PERLER" },
  { code: "P167B", name: "Glow in the Dark Mix - Blue", hex: "#87C8E6", brand: "PERLER" },
  { code: "P167C", name: "Glow in the Dark Mix - Pink", hex: "#FAAFC8", brand: "PERLER" },
  { code: "P167D", name: "Glow in the Dark Mix - Orange", hex: "#FAD28C", brand: "PERLER" },
  { code: "P184", name: "Clear Blue", hex: "#A0BEDC", brand: "PERLER" },
  { code: "P185A", name: "Metallic Mix - Gold Metallic", hex: "#E6B45A", brand: "PERLER" },
  { code: "P185B", name: "Metallic Mix - Pearl Silver", hex: "#777B81", brand: "PERLER" },
  { code: "P185C", name: "Metallic Mix - Bronze", hex: "#966E5A", brand: "PERLER" },
  { code: "P186A", name: "Neon Mix - Blue", hex: "#4664AA", brand: "PERLER" },
  { code: "P186B", name: "Neon Mix - Green", hex: "#06B73C", brand: "PERLER" },
  { code: "P186C", name: "Neon Mix - Yellow", hex: "#E5EF13", brand: "PERLER" },
  { code: "P186D", name: "Neon Mix - Orange", hex: "#FD8600", brand: "PERLER" },
  { code: "P186E", name: "Neon Mix - Fuchsia", hex: "#DC6496", brand: "PERLER" },
  { code: "P187", name: "Clear Glitter", hex: "#F5FAFD", brand: "PERLER" },
  { code: "P191", name: "Pink Glitter", hex: "#DC5078", brand: "PERLER" },
  { code: "P193", name: "Black Glitter", hex: "#191919", brand: "PERLER" },
  { code: "P646", name: "Toffee", hex: "#8F562A", brand: "PERLER" },
  { code: "P647", name: "Amber", hex: "#C5572C", brand: "PERLER" },
  { code: "P648", name: "Jade", hex: "#05C07E", brand: "PERLER" },
  { code: "P649", name: "Shark", hex: "#6F8675", brand: "PERLER" },
  { code: "P650", name: "Capri Blue", hex: "#23C9DB", brand: "PERLER" },
  { code: "P651", name: "Seafoam", hex: "#A2C1BD", brand: "PERLER" },
  { code: "P652", name: "Violet Frost", hex: "#C8C9D8", brand: "PERLER" },
  { code: "P653", name: "Indigo", hex: "#3A4160", brand: "PERLER" },
  { code: "P654", name: "Oyster", hex: "#D8C68F", brand: "PERLER" },
  { code: "P655", name: "Khaki", hex: "#A9955D", brand: "PERLER" },
  { code: "P656", name: "Seaweed", hex: "#957338", brand: "PERLER" },
  { code: "P657", name: "Steel", hex: "#44494C", brand: "PERLER" },
  { code: "P658", name: "Champagne", hex: "#E2B984", brand: "PERLER" },
  { code: "P659", name: "Wheat", hex: "#E0B47E", brand: "PERLER" },
  { code: "P660", name: "Colonial Blue", hex: "#60AAC2", brand: "PERLER" },
  { code: "P661", name: "Faded Rose", hex: "#A85F7E", brand: "PERLER" },
  { code: "P662", name: "Teaberry", hex: "#C2789A", brand: "PERLER" },
  { code: "P663", name: "Persimmon", hex: "#D97F6F", brand: "PERLER" },
  { code: "P664", name: "Violet", hex: "#984BBC", brand: "PERLER" },
  { code: "P665", name: "Deep Purple", hex: "#4C2459", brand: "PERLER" },
  { code: "P666", name: "Beige", hex: "#AD734F", brand: "PERLER" },
  { code: "P667", name: "Iron", hex: "#332E28", brand: "PERLER" },
  { code: "P668", name: "Lipstick", hex: "#F4363B", brand: "PERLER" },
  { code: "S01", name: "White", hex: "#FFFFFF", brand: "ARTKAL" },
  { code: "S02", name: "Burning Sand", hex: "#EDA277", brand: "ARTKAL" },
  { code: "S03", name: "Tangerine", hex: "#FF9F1A", brand: "ARTKAL" },
  { code: "S04", name: "Orange", hex: "#FF671F", brand: "ARTKAL" },
  { code: "S05", name: "Tall Poppy", hex: "#E10600", brand: "ARTKAL" },
  { code: "S06", name: "Raspberry Pink", hex: "#EC86D0", brand: "ARTKAL" },
  { code: "S07", name: "Gray", hex: "#9B9B9B", brand: "ARTKAL" },
  { code: "S08", name: "Emerald", hex: "#24DE5B", brand: "ARTKAL" },
  { code: "S09", name: "Dark Green", hex: "#00685E", brand: "ARTKAL" },
  { code: "S10", name: "Baby Blue", hex: "#68BBF2", brand: "ARTKAL" },
  { code: "S11", name: "Dark Blue", hex: "#0033A3", brand: "ARTKAL" },
  { code: "S12", name: "Pastel Lavender", hex: "#A05EB5", brand: "ARTKAL" },
  { code: "S13", name: "Black", hex: "#000000", brand: "ARTKAL" },
  { code: "S14", name: "Sandstorm", hex: "#FAE03F", brand: "ARTKAL" },
  { code: "S15", name: "Redwood", hex: "#7A3E2C", brand: "ARTKAL" },
  { code: "S16", name: "Brown", hex: "#401310", brand: "ARTKAL" },
  { code: "S17", name: "Light Brown", hex: "#7B4D35", brand: "ARTKAL" },
  { code: "S18", name: "Sand", hex: "#CC9966", brand: "ARTKAL" },
  { code: "S19", name: "Bubble Gun", hex: "#FCBFA9", brand: "ARTKAL" },
  { code: "S20", name: "Green", hex: "#609E6B", brand: "ARTKAL" },
  { code: "S21", name: "Pastel Green", hex: "#87D839", brand: "ARTKAL" },
  { code: "S22", name: "Purple", hex: "#330072", brand: "ARTKAL" },
  { code: "S23", name: "Royal Purple", hex: "#64359B", brand: "ARTKAL" },
  { code: "S24", name: "True Blue", hex: "#165AA8", brand: "ARTKAL" },
  { code: "S25", name: "Hot Pink", hex: "#FF34B3", brand: "ARTKAL" },
  { code: "S26", name: "Magenta", hex: "#FF2185", brand: "ARTKAL" },
  { code: "S27", name: "Yellow", hex: "#FFD100", brand: "ARTKAL" },
  { code: "S28", name: "Lily Pink", hex: "#EAB8E4", brand: "ARTKAL" },
  { code: "S29", name: "Pastel Yellow", hex: "#FFFF7D", brand: "ARTKAL" },
  { code: "S30", name: "Shadow Green", hex: "#99D6EA", brand: "ARTKAL" },
  { code: "S31", name: "Sea Mist", hex: "#9EE5B0", brand: "ARTKAL" },
  { code: "S32", name: "Beeswax", hex: "#F7D679", brand: "ARTKAL" },
  { code: "S33", name: "Maverick", hex: "#C5B4E3", brand: "ARTKAL" },
  { code: "S34", name: "Red", hex: "#D11F25", brand: "ARTKAL" },
  { code: "S35", name: "Mona Lisa", hex: "#F7CED7", brand: "ARTKAL" },
  { code: "S36", name: "Old Pink", hex: "#C9809E", brand: "ARTKAL" },
  { code: "S37", name: "Blue-Green", hex: "#71D8BF", brand: "ARTKAL" },
  { code: "S38", name: "Burgundy", hex: "#A8395B", brand: "ARTKAL" },
  { code: "S39", name: "Yellow Orange", hex: "#FF963B", brand: "ARTKAL" },
  { code: "S40", name: "Carnation Pink", hex: "#F1A7DC", brand: "ARTKAL" },
  { code: "S41", name: "Copper", hex: "#9A5516", brand: "ARTKAL" },
  { code: "S42", name: "Silver", hex: "#A09F9D", brand: "ARTKAL" },
  { code: "S43", name: "Dark Gray", hex: "#767777", brand: "ARTKAL" },
  { code: "S44", name: "Sky Blue", hex: "#A6E7FF", brand: "ARTKAL" },
  { code: "S45", name: "Medium Turquoise", hex: "#00B2A9", brand: "ARTKAL" },
  { code: "S46", name: "Bright Green", hex: "#73D33C", brand: "ARTKAL" },
  { code: "S47", name: "Marigold", hex: "#B47E00", brand: "ARTKAL" },
  { code: "S48", name: "Corn", hex: "#FFC72C", brand: "ARTKAL" },
  { code: "S49", name: "Mulberry Wood", hex: "#72195F", brand: "ARTKAL" },
  { code: "S50", name: "Mandys Pink", hex: "#FAAA72", brand: "ARTKAL" },
  { code: "S51", name: "Spring Sun", hex: "#FCFBCD", brand: "ARTKAL" },
  { code: "S52", name: "Picasso", hex: "#F2F0A1", brand: "ARTKAL" },
  { code: "S53", name: "Turquoise", hex: "#69B3E7", brand: "ARTKAL" },
  { code: "S54", name: "Light Blue", hex: "#0090DA", brand: "ARTKAL" },
  { code: "S55", name: "Pistachio", hex: "#ADDC91", brand: "ARTKAL" },
  { code: "S56", name: "Bright Carrot", hex: "#FF6A13", brand: "ARTKAL" },
  { code: "S57", name: "Buccaneer", hex: "#B35749", brand: "ARTKAL" },
  { code: "S58", name: "Paprika", hex: "#A50034", brand: "ARTKAL" },
  { code: "S59", name: "Butterfly Bush", hex: "#320F89", brand: "ARTKAL" },
  { code: "S60", name: "Lavender", hex: "#A77BCA", brand: "ARTKAL" },
  { code: "S61", name: "Key Lomen Pie", hex: "#CEDC00", brand: "ARTKAL" },
  { code: "S62", name: "Green Tea", hex: "#007C44", brand: "ARTKAL" },
  { code: "S63", name: "Metallic Gold", hex: "#585735", brand: "ARTKAL" },
  { code: "S64", name: "Black Rock", hex: "#1D115D", brand: "ARTKAL" },
  { code: "S65", name: "Canary", hex: "#F3EA5D", brand: "ARTKAL" },
  { code: "S66", name: "Blaze Orange", hex: "#F45A3A", brand: "ARTKAL" },
  { code: "S67", name: "Vanilla", hex: "#F3CFB3", brand: "ARTKAL" },
  { code: "S68", name: "Tan", hex: "#E7C7AC", brand: "ARTKAL" },
  { code: "S69", name: "Mine Shaft", hex: "#4D4D4F", brand: "ARTKAL" },
  { code: "S70", name: "Drark Algae", hex: "#9BBC11", brand: "ARTKAL" },
  { code: "S71", name: "Jade Green", hex: "#00852B", brand: "ARTKAL" },
  { code: "S72", name: "Light Sea Blue", hex: "#59D5D8", brand: "ARTKAL" },
  { code: "S73", name: "Steel Blue", hex: "#48A9C5", brand: "ARTKAL" },
  { code: "S74", name: "Azure", hex: "#00AED6", brand: "ARTKAL" },
  { code: "S75", name: "Dark Steel Blue", hex: "#0085AD", brand: "ARTKAL" },
  { code: "S76", name: "Sea Blue", hex: "#00AEC7", brand: "ARTKAL" },
  { code: "S77", name: "Ghost While", hex: "#EFEFEF", brand: "ARTKAL" },
  { code: "S78", name: "Ash Grey", hex: "#D1D1D1", brand: "ARTKAL" },
  { code: "S79", name: "Light Gray", hex: "#BBBCBC", brand: "ARTKAL" },
  { code: "S80", name: "Dark Olive", hex: "#999B30", brand: "ARTKAL" },
  { code: "S81", name: "Deer", hex: "#CDB276", brand: "ARTKAL" },
  { code: "S82", name: "Clay", hex: "#BB8F63", brand: "ARTKAL" },
  { code: "S83", name: "Sienna", hex: "#B86125", brand: "ARTKAL" },
  { code: "S84", name: "Deep Chestnut", hex: "#AA5761", brand: "ARTKAL" },
  { code: "S85", name: "Red Wine", hex: "#5C131B", brand: "ARTKAL" },
  { code: "S86", name: "Goldenrod", hex: "#F7BD1B", brand: "ARTKAL" },
  { code: "S87", name: "Coral Red", hex: "#E68082", brand: "ARTKAL" },
  { code: "S88", name: "Dark Pink", hex: "#DA1884", brand: "ARTKAL" },
  { code: "S89", name: "Charcoal Gray", hex: "#484955", brand: "ARTKAL" },
  { code: "S90", name: "Pastel Orange", hex: "#FFC50B", brand: "ARTKAL" },
  { code: "S91", name: "Brunswick Green", hex: "#183028", brand: "ARTKAL" },
  { code: "S92", name: "Dandelion", hex: "#DEB947", brand: "ARTKAL" },
  { code: "S93", name: "Pale Skin", hex: "#DAB698", brand: "ARTKAL" },
  { code: "S94", name: "Warm Blush", hex: "#F4A999", brand: "ARTKAL" },
  { code: "S95", name: "Salmon", hex: "#EE7D67", brand: "ARTKAL" },
  { code: "S96", name: "Apricot", hex: "#F08661", brand: "ARTKAL" },
  { code: "S97", name: "Papaya", hex: "#D4722A", brand: "ARTKAL" },
  { code: "S98", name: "Himalaya Blue", hex: "#64ACDF", brand: "ARTKAL" },
  { code: "S99", name: "Waterfall", hex: "#64C2DC", brand: "ARTKAL" },
  { code: "S100", name: "Lagoon", hex: "#4F9FB3", brand: "ARTKAL" },
  { code: "S101", name: "Electric Blue", hex: "#46ADF2", brand: "ARTKAL" },
  { code: "S102", name: "Pool Blue", hex: "#2272E3", brand: "ARTKAL" },
  { code: "S103", name: "Caribbian Blue", hex: "#083980", brand: "ARTKAL" },
  { code: "S104", name: "Deep Water", hex: "#0A668B", brand: "ARTKAL" },
  { code: "S105", name: "Petrol Blue", hex: "#227B9C", brand: "ARTKAL" },
  { code: "S106", name: "Wegdewood Blue", hex: "#004E78", brand: "ARTKAL" },
  { code: "S107", name: "Pond Blue", hex: "#005574", brand: "ARTKAL" },
  { code: "S108", name: "Seashell Beige", hex: "#CCBE80", brand: "ARTKAL" },
  { code: "S109", name: "Beige", hex: "#A49350", brand: "ARTKAL" },
  { code: "S110", name: "Beach Beige", hex: "#9E883C", brand: "ARTKAL" },
  { code: "S111", name: "Caffe Latté", hex: "#766C2B", brand: "ARTKAL" },
  { code: "S112", name: "Oaktree Brown", hex: "#877749", brand: "ARTKAL" },
  { code: "S113", name: "Khaki", hex: "#BAB8A2", brand: "ARTKAL" },
  { code: "S114", name: "Light Greengray", hex: "#728C54", brand: "ARTKAL" },
  { code: "S115", name: "Mossy Green", hex: "#7E7C44", brand: "ARTKAL" },
  { code: "S116", name: "Earth Green", hex: "#64692E", brand: "ARTKAL" },
  { code: "S117", name: "Sage Green", hex: "#4E582C", brand: "ARTKAL" },
  { code: "S118", name: "Pinetree Green", hex: "#4A5E2D", brand: "ARTKAL" },
  { code: "S119", name: "Frosty Blue", hex: "#BEEBE7", brand: "ARTKAL" },
  { code: "S120", name: "Polar Mint", hex: "#66CC99", brand: "ARTKAL" },
  { code: "S121", name: "Celadon Green", hex: "#569A83", brand: "ARTKAL" },
  { code: "S122", name: "Eucalyptus", hex: "#14C25B", brand: "ARTKAL" },
  { code: "S123", name: "Clover Field", hex: "#58DE4B", brand: "ARTKAL" },
  { code: "S124", name: "Pooltable Felt", hex: "#04552E", brand: "ARTKAL" },
  { code: "S125", name: "Snake Green", hex: "#136B5A", brand: "ARTKAL" },
  { code: "S126", name: "Dark Eucalyptus", hex: "#054641", brand: "ARTKAL" },
  { code: "S127", name: "Marsmallow Rose", hex: "#D9B6D6", brand: "ARTKAL" },
  { code: "S128", name: "Light Grape", hex: "#AD62A4", brand: "ARTKAL" },
  { code: "S129", name: "Rosebud Pink", hex: "#E68CA3", brand: "ARTKAL" },
  { code: "S130", name: "Fuschia", hex: "#FC81B2", brand: "ARTKAL" },
  { code: "S131", name: "Candy Violet", hex: "#CABAF7", brand: "ARTKAL" },
  { code: "S132", name: "Flamingo", hex: "#E8416B", brand: "ARTKAL" },
  { code: "S133", name: "Pink Plum", hex: "#B7388F", brand: "ARTKAL" },
  { code: "S134", name: "Amethyst", hex: "#581F7E", brand: "ARTKAL" },
  { code: "S135", name: "Moonlight Blue", hex: "#8CA3D4", brand: "ARTKAL" },
  { code: "S136", name: "Summer Rain", hex: "#9A9ACC", brand: "ARTKAL" },
  { code: "S137", name: "Azur Blue", hex: "#5981C1", brand: "ARTKAL" },
  { code: "S138", name: "Cornflower Blue", hex: "#4166B0", brand: "ARTKAL" },
  { code: "S139", name: "Forget Me Not", hex: "#475FAB", brand: "ARTKAL" },
  { code: "S140", name: "Indigo", hex: "#1644DB", brand: "ARTKAL" },
  { code: "S141", name: "Horizon Blue", hex: "#3D56A5", brand: "ARTKAL" },
  { code: "S142", name: "Cobolt", hex: "#0142C3", brand: "ARTKAL" },
  { code: "S143", name: "Royal Blue", hex: "#25268A", brand: "ARTKAL" },
  { code: "S144", name: "Marine", hex: "#1A2F6F", brand: "ARTKAL" },
  { code: "S145", name: "Pale Yellow Moss", hex: "#D3C95D", brand: "ARTKAL" },
  { code: "S146", name: "Bloodrose Red", hex: "#510918", brand: "ARTKAL" },
  { code: "S147", name: "Spearmint", hex: "#64B39E", brand: "ARTKAL" },
  { code: "S148", name: "Mocha", hex: "#634338", brand: "ARTKAL" },
  { code: "S149", name: "Creme", hex: "#EDD39E", brand: "ARTKAL" },
  { code: "S150", name: "Iris Violet", hex: "#6963AB", brand: "ARTKAL" },
  { code: "S151", name: "Forrest Green", hex: "#2B3F1F", brand: "ARTKAL" },
  { code: "S152", name: "Lilac", hex: "#9791C5", brand: "ARTKAL" },
  { code: "S153", name: "Pale Lilac", hex: "#C3BDFF", brand: "ARTKAL" },
  { code: "S154", name: "Sahara Sand", hex: "#F9C898", brand: "ARTKAL" },
  { code: "S155", name: "Sunkissed Teint", hex: "#CCA47C", brand: "ARTKAL" },
  { code: "S156", name: "Steel Grey", hex: "#5A6263", brand: "ARTKAL" },
  { code: "S157", name: "Iron Grey", hex: "#3E4955", brand: "ARTKAL" },
  { code: "S158", name: "Pepper", hex: "#202830", brand: "ARTKAL" },
  { code: "S159", name: "Oslo Gray", hex: "#888B8D", brand: "ARTKAL" },
  { code: "SE01", name: "Moon", hex: "#D7DDDE", brand: "ARTKAL" },
  { code: "SE02", name: "Raincloud", hex: "#9BB8E3", brand: "ARTKAL" },
  { code: "SE03", name: "Winter", hex: "#5E8AB4", brand: "ARTKAL" },
  { code: "SE04", name: "Tide", hex: "#6AD1E3", brand: "ARTKAL" },
  { code: "SE05", name: "Aquamarine", hex: "#2CD5C4", brand: "ARTKAL" },
  { code: "SE06", name: "Neptune", hex: "#147BD1", brand: "ARTKAL" },
  { code: "SE07", name: "Rose Quartz", hex: "#C2AFC9", brand: "ARTKAL" },
  { code: "SE08", name: "Mauve", hex: "#9B7793", brand: "ARTKAL" },
  { code: "SE09", name: "Dark Mauve", hex: "#693C5E", brand: "ARTKAL" },
  { code: "SE10", name: "Wild Berry", hex: "#C964CF", brand: "ARTKAL" },
  { code: "SE11", name: "Sugar Plum", hex: "#8C1AC7", brand: "ARTKAL" },
  { code: "SE12", name: "Desert", hex: "#FFB25B", brand: "ARTKAL" },
  { code: "SE13", name: "Peanut", hex: "#E6A65D", brand: "ARTKAL" },
  { code: "SE14", name: "Toffee", hex: "#D38235", brand: "ARTKAL" },
  { code: "SE15", name: "Bark", hex: "#C16C18", brand: "ARTKAL" },
  { code: "SE16", name: "Extended Light Pink", hex: "#F5B6CD", brand: "ARTKAL" },
  { code: "SE17", name: "Extended Maroon", hex: "#5D2A2C", brand: "ARTKAL" },
  { code: "SG1", name: "Glow Yellow", hex: "#EEF6E5", brand: "ARTKAL" },
  { code: "SG2", name: "Glow Pink", hex: "#F9DDE5", brand: "ARTKAL" },
  { code: "SG3", name: "Glow Blue", hex: "#D8F7F9", brand: "ARTKAL" },
  { code: "SG4", name: "SG4", hex: "#D0B2E9", brand: "ARTKAL" },
  { code: "SG5", name: "SG5", hex: "#F7BD85", brand: "ARTKAL" },
  { code: "SG6", name: "SG6", hex: "#DAFCDB", brand: "ARTKAL" },
  { code: "SG7", name: "SG7", hex: "#C85E66", brand: "ARTKAL" },
  { code: "SN1", name: "Neon Orange", hex: "#FF8921", brand: "ARTKAL" },
  { code: "SN2", name: "Neon Green", hex: "#0DBF39", brand: "ARTKAL" },
  { code: "SN3", name: "Neon Yellow", hex: "#F3FF0D", brand: "ARTKAL" },
  { code: "SN4", name: "Neon Rose", hex: "#FF3472", brand: "ARTKAL" },
  { code: "SP1", name: "Pearlescent Green", hex: "#BAF57B", brand: "ARTKAL" },
  { code: "SP2", name: "Pearlescent Tangerine", hex: "#FF8A50", brand: "ARTKAL" },
  { code: "SP3", name: "Pearlescent Orange", hex: "#FFC445", brand: "ARTKAL" },
  { code: "SP4", name: "Pearlescent Pink", hex: "#FFB4D6", brand: "ARTKAL" },
  { code: "SP5", name: "Pearlescent Red", hex: "#B6284D", brand: "ARTKAL" },
  { code: "SP6", name: "Pearlescent Blue", hex: "#1D1F95", brand: "ARTKAL" },
  { code: "SP7", name: "Pearlescent Purple", hex: "#5C2086", brand: "ARTKAL" },
  { code: "SP8", name: "Pearlescent White", hex: "#FFFFFF", brand: "ARTKAL" },
  { code: "ST1", name: "Transparent", hex: "#FFFFFF", brand: "ARTKAL" },
  { code: "ST2", name: "Transparent Pink", hex: "#FF71D2", brand: "ARTKAL" },
  { code: "ST3", name: "Transparent Tangering", hex: "#FF8324", brand: "ARTKAL" },
  { code: "ST4", name: "Transparent Yellow", hex: "#F2FF20", brand: "ARTKAL" },
  { code: "ST5", name: "Transparent Green", hex: "#1DD14A", brand: "ARTKAL" },
  { code: "ST6", name: "Transparent Purple", hex: "#B083E7", brand: "ARTKAL" },
  { code: "ST7", name: "ST7", hex: "#171717", brand: "ARTKAL" },
  { code: "ST8", name: "ST8", hex: "#3D0304", brand: "ARTKAL" },
  { code: "SUV1", name: "SUV1", hex: "#FA55AF", brand: "ARTKAL" },
  { code: "SUV2", name: "SUV2", hex: "#FFD47F", brand: "ARTKAL" },
  { code: "SUV3", name: "SUV3", hex: "#7F61E4", brand: "ARTKAL" },
  { code: "SUV4", name: "SUV4", hex: "#E352CE", brand: "ARTKAL" },
  { code: "SL5", name: "Glitter Purple", hex: "#7E58BA", brand: "ARTKAL" },
  { code: "SL6", name: "Glitter Clear", hex: "#F5FAFD", brand: "ARTKAL" },
  { code: "SD1", name: "Black & White Stripe", hex: "#191919", brand: "ARTKAL" },
  { code: "SD2", name: "Grey & White Stripe", hex: "#8A8D91", brand: "ARTKAL" },
  { code: "SD3", name: "Light Blue Stripe", hex: "#4696FA", brand: "ARTKAL" },
  { code: "SD4", name: "Blue & White Stripe", hex: "#4B91FA", brand: "ARTKAL" },
  { code: "SD5", name: "Green Stripe", hex: "#288C28", brand: "ARTKAL" },
  { code: "SD6", name: "Turquoise Stripe", hex: "#46BEB4", brand: "ARTKAL" },
  { code: "SD7", name: "Red & White Stripe", hex: "#E12D32", brand: "ARTKAL" },
  { code: "SD8", name: "Pink Stripe", hex: "#FA50AA", brand: "ARTKAL" },
  { code: "SD9", name: "Purple Stripe", hex: "#AF7DDC", brand: "ARTKAL" },
  { code: "SD10", name: "Yellow Stripe", hex: "#E1BE05", brand: "ARTKAL" },
  { code: "SD11", name: "Orange & White Stripe", hex: "#FF691E", brand: "ARTKAL" },
  { code: "SD12", name: "Dark Green Stripe", hex: "#328C78", brand: "ARTKAL" },
  { code: "SU1", name: "UV - Rose", hex: "#FA64B4", brand: "ARTKAL" },
  { code: "SU2", name: "UV - Yellow", hex: "#F0C882", brand: "ARTKAL" },
  { code: "SU3", name: "UV - Purple", hex: "#8255D7", brand: "ARTKAL" },
  { code: "SU4", name: "UV - Pink", hex: "#E346C8", brand: "ARTKAL" },
];
const BASE_COLORS = COLORS.slice(0, 8);

const BG = '#F7EFE2';
const INK = '#2B2117';
const MUTED = '#8A7C68';
const BOARD = '#1B1D23';
const GRID = 'rgba(255,255,255,0.07)';
const CORAL = '#E0582F';
const MINT = '#8ECFBB';

function emptyBoard() {
  return Array.from({ length: N }, () => Array(N).fill(-1));
}

const STARTER = [
  [-1, -1, 2, 2, 2, -1, -1],
  [-1, 2, 2, 1, 2, 2, -1],
  [2, 2, 1, 1, 1, 2, 2],
  [2, 1, 1, 0, 1, 1, 2],
  [2, 2, 1, 1, 1, 2, 2],
  [-1, 2, 2, 1, 2, 2, -1],
  [-1, -1, 2, 2, 2, -1, -1],
];

function starterBoard() {
  const b = emptyBoard();
  const ox = Math.floor((N - STARTER.length) / 2);
  for (let y = 0; y < STARTER.length; y++) {
    for (let x = 0; x < STARTER[y].length; x++) {
      const c = STARTER[y][x];
      if (c >= 0) b[oy(y, ox)][x + ox] = c;
    }
  }
  return b;
}
function oy(y, ox) {
  return Math.floor((N - STARTER.length) / 2) + y;
}

const boardSize = Math.min(W - 28, Math.max(240, Math.min(H * 0.52, 360)));
const cell = boardSize / N;
const boardX = (W - boardSize) / 2;
const boardY = Math.max(SAFE_TOP + 68, 82);
const paletteY = boardY + boardSize + 34;
const paletteItem = (W - 32) / BASE_COLORS.length;
const toolbarY = H - 80;
const toolbarH = 44;
const toolbarItem = (W - 36) / 6;

let board = starterBoard();
let fused = Array.from({ length: N }, () => Array(N).fill(false));
let selected = 0;
let eraser = false;
let history = [];
let view3d = false;
let angle = -0.38;
let pitch = 0.62;
let dragX = null;
let dragY = null;
let glCanvas = null;
let gl = null;
let glProgram = null;
let glBuffer = null;
let glLoc = null;
let glFailed = false;
let pieces3d = [];
let selectedPiece = 0;
let dragPiece = -1;
let dragCamera = false;
let pieceScreens = [];
let pieceHistory = [];
let overlay = null; // 'menu' | 'inventory' | 'colors'
let colorResults = [];
let colorQuery = '';
let colorCards = [];
let rowMode = false;
let rowFocus = 0;
let stock = COLORS.map(() => 0);

/* ------------------------------ mini game API ---------------------------- */
// 开发者工具默认；真机请换成电脑局域网 IP 或 HTTPS 域名。
const API_BASE = 'http://127.0.0.1:8787';
let screen = 'studio'; // studio | gallery | detail
let token = '';
let me = null;
let works = [];
let worksLoading = false;
let galleryPage = 0;
let galleryFilter = 'latest';
let detail = null;
let comments = [];
let detailLoading = false;
let busyAction = '';
const coverCache = {};

function imageUrl(url) {
  if (!url) return '';
  return /^https?:\/\//.test(url) ? url : `${API_BASE}${url}`;
}

function cover(url) {
  const u = imageUrl(url);
  if (!u) return null;
  if (!coverCache[u]) {
    const img = wx.createImage();
    const entry = { img, ready: false };
    img.onload = () => {
      entry.ready = true;
      draw();
    };
    img.onerror = () => {};
    img.src = u;
    coverCache[u] = entry;
  }
  return coverCache[u];
}

function toast(title) {
  if (wx.showToast) wx.showToast({ title, icon: 'none' });
}

function request(path, method = 'GET', data = null, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (!wx.request) return reject(new Error('当前环境不支持网络请求'));
    wx.request({
      url: `${API_BASE}${path}`,
      method,
      data: data || undefined,
      timeout,
      header: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject({ status: res.statusCode, data: res.data });
      },
      fail: reject,
    });
  });
}

function ensureSession() {
  if (me && token) return Promise.resolve(me);
  try {
    token = wx.getStorageSync('douyu.game.token') || '';
  } catch (e) {}
  const body = token ? { token } : {};
  return request('/api/session', 'POST', body)
    .then((data) => {
      token = data.token;
      me = data.user;
      try {
        wx.setStorageSync('douyu.game.token', token);
      } catch (e) {}
      return me;
    })
    .catch(() => null);
}

function apiError(err) {
  const msg = err && err.data && (err.data.message || err.data.error);
  if (err && err.status === 402) return '豆币不够，先去攒一点';
  return msg || '网络没有连上';
}

function openGallery() {
  screen = 'gallery';
  overlay = null;
  rowMode = false;
  view3d = false;
  draw();
  loadGallery();
}

function loadGallery() {
  worksLoading = true;
  galleryPage = 0;
  draw();
  ensureSession()
    .then(() => request(`/api/works?filter=${encodeURIComponent(galleryFilter)}`))
    .then((data) => {
      works = data.works || [];
      worksLoading = false;
      draw();
    })
    .catch((err) => {
      worksLoading = false;
      toast(apiError(err));
      draw();
    });
}

function openDetail(id) {
  screen = 'detail';
  detail = works.find((w) => w.id === id) || null;
  comments = [];
  detailLoading = true;
  draw();
  ensureSession()
    .then(() =>
      Promise.all([
        request(`/api/works/${encodeURIComponent(id)}`),
        request(`/api/works/${encodeURIComponent(id)}/comments`),
      ]),
    )
    .then(([w, c]) => {
      detail = w.work;
      comments = c.comments || [];
      detailLoading = false;
      draw();
    })
    .catch((err) => {
      detailLoading = false;
      toast(apiError(err));
      draw();
    });
}

function doAction(kind) {
  if (!detail || busyAction) return;
  const id = detail.id;
  if (kind === 'comment') {
    if (!wx.showModal) return;
    wx.showModal({
      title: '写留言',
      editable: true,
      placeholderText: '留一句给作者或下一位复刻的人…',
      success(res) {
        const body = String((res && (res.content || res.value)) || '').trim();
        if (!res.confirm || !body) return;
        busyAction = 'comment';
        ensureSession()
          .then(() => request(`/api/works/${encodeURIComponent(id)}/comments`, 'POST', { body }))
          .then(() => request(`/api/works/${encodeURIComponent(id)}/comments`))
          .then((c) => {
            comments = c.comments || [];
            detail.commentCount = comments.length;
            busyAction = '';
            draw();
          })
          .catch((err) => {
            busyAction = '';
            toast(apiError(err));
          });
      },
    });
    return;
  }

  const path =
    kind === 'like' ? 'like' : kind === 'collect' ? 'collect' : kind === 'unlock' ? 'unlock' : '';
  if (!path) return;
  if (kind === 'unlock' && detail.price > 0 && !detail.unlocked) {
    wx.showModal({
      title: '解锁这张图纸',
      content: `需要 ${detail.price} 豆币，解锁后可以继续改造。`,
      success(res) {
        if (res.confirm) runAction(kind, id);
      },
    });
    return;
  }
  runAction(kind, id);
}

function runAction(kind, id) {
  busyAction = kind;
  ensureSession()
    .then(() => request(`/api/works/${encodeURIComponent(id)}/${kind}`, 'POST', {}))
    .then((data) => {
      busyAction = '';
      if (kind === 'like') {
        detail.liked = data.liked;
        detail.likes = data.likes;
      } else if (kind === 'collect') {
        detail.collected = data.collected;
        detail.collects = data.collects;
      } else if (kind === 'unlock') {
        detail = data.work;
        if (me && typeof data.points === 'number') me.points = data.points;
        const imported = importSceneToBoard(data.work.scene);
        busyAction = '';
        if (imported) {
          screen = 'studio';
          overlay = null;
          rowMode = false;
          view3d = false;
          toast('图纸已铺到拼板，可以继续改');
        } else {
          toast('图纸已解锁');
        }
        draw();
        return;
      }
      draw();
    })
    .catch((err) => {
      busyAction = '';
      toast(apiError(err));
      draw();
    });
}

function save() {
  try {
    wx.setStorageSync('douyu.game.board', {
      board: board.map((row) => row.join(',')),
      fused: fused.map((row) => row.map((v) => (v ? 1 : 0)).join(',')),
    });
  } catch (e) {}
}

function load() {
  try {
    const raw = wx.getStorageSync('douyu.game.board');
    if (!raw || !raw.board) return;
    const b = raw.board.map((row) => row.split(',').map(Number));
    if (b.length !== N) return;
    board = b;
    if (raw.fused) {
      fused = raw.fused.map((row) => row.split(',').map((v) => v === '1'));
    }
  } catch (e) {}
}

function loadStock() {
  try {
    const raw = wx.getStorageSync('douyu.game.stock');
    if (Array.isArray(raw) && raw.length === COLORS.length) {
      stock = raw.map((n) => Math.max(0, Number(n) || 0));
    }
  } catch (e) {}
}

function saveStock() {
  try {
    wx.setStorageSync('douyu.game.stock', stock);
  } catch (e) {}
}

function snap() {
  history.push({
    board: board.map((r) => r.slice()),
    fused: fused.map((r) => r.slice()),
  });
  if (history.length > 40) history.shift();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBead(cx, cy, r, color, isFused) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(0.6, r * 0.08);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.stroke();
  const hole = r * (isFused ? 0.16 : 0.25);
  ctx.beginPath();
  ctx.arc(cx, cy, hole, 0, Math.PI * 2);
  ctx.fillStyle = isFused ? 'rgba(20,20,22,0.55)' : BOARD;
  ctx.fill();
  if (r > 5) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, Math.PI * 1.08, Math.PI * 1.56);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(0.7, r * 0.1);
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function countBeads() {
  let n = 0;
  let f = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (board[y][x] >= 0) {
        n++;
        if (fused[y][x]) f++;
      }
    }
  }
  return { n, f };
}

function buildPieces3d() {
  const seen = Array.from({ length: N }, () => Array(N).fill(false));
  const next = [];
  for (let sy = 0; sy < N; sy++) {
    for (let sx = 0; sx < N; sx++) {
      if (board[sy][sx] < 0 || seen[sy][sx]) continue;
      const cells = [];
      const q = [[sx, sy]];
      seen[sy][sx] = true;
      while (q.length) {
        const [x, y] = q.pop();
        cells.push({ x, y, c: board[y][x] });
        const around = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ];
        for (const [nx, ny] of around) {
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          if (seen[ny][nx] || board[ny][nx] < 0) continue;
          seen[ny][nx] = true;
          q.push([nx, ny]);
        }
      }
      let cx = 0;
      let cz = 0;
      for (const c of cells) {
        cx += c.x + 0.5;
        cz += c.y + 0.5;
      }
      cx /= cells.length;
      cz /= cells.length;
      next.push({ cells, cx, cz, ox: 0, oz: 0, lift: 0, rot: 0 });
    }
  }
  pieces3d = next;
  selectedPiece = next.length ? 0 : -1;
  dragPiece = -1;
}

function toggle3DView() {
  view3d = !view3d;
  overlay = null;
  rowMode = false;
  dragX = null;
  dragY = null;
  dragPiece = -1;
  dragCamera = false;
  pieceHistory = [];
  if (view3d) buildPieces3d();
  draw();
}

function pushPieceHistory() {
  pieceHistory.push({
    selectedPiece,
    pieces: pieces3d.map((p) => ({ ox: p.ox, oz: p.oz, lift: p.lift, rot: p.rot })),
  });
  if (pieceHistory.length > 30) pieceHistory.shift();
}

function undoPiece() {
  const prev = pieceHistory.pop();
  if (!prev) return;
  selectedPiece = prev.selectedPiece;
  prev.pieces.forEach((t, i) => {
    if (!pieces3d[i]) return;
    pieces3d[i].ox = t.ox;
    pieces3d[i].oz = t.oz;
    pieces3d[i].lift = t.lift;
    pieces3d[i].rot = t.rot;
  });
  draw();
}

function pieceWorldKeys(p, ox = p.ox, oz = p.oz, rot = p.rot) {
  const a = (rot * Math.PI) / 2;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const keys = [];
  for (const cell of p.cells) {
    const dx = cell.x + 0.5 - p.cx;
    const dz = cell.y + 0.5 - p.cz;
    const wx = p.cx + ox + dx * ca - dz * sa;
    const wz = p.cz + oz + dx * sa + dz * ca;
    keys.push(`${Math.round(wx * 2)},${Math.round(wz * 2)}`);
  }
  return keys;
}

function collidesPiece(index) {
  const p = pieces3d[index];
  if (!p) return false;
  const mine = new Set(pieceWorldKeys(p));
  for (let i = 0; i < pieces3d.length; i++) {
    if (i === index) continue;
    const other = pieces3d[i];
    if (Math.abs((other.lift || 0) - (p.lift || 0)) > 0.55) continue;
    for (const key of pieceWorldKeys(other)) {
      if (mine.has(key)) return true;
    }
  }
  return false;
}

function pieceAt(x, y) {
  let best = -1;
  let bestD = 42 * 42;
  for (let i = 0; i < pieceScreens.length; i++) {
    const p = pieceScreens[i];
    if (!p) continue;
    const d = (x - p.x) ** 2 + (y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function nearestColorIndex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < COLORS.length; i++) {
    const q = parseInt(COLORS[i].hex.slice(1), 16);
    const qr = (q >> 16) & 255;
    const qg = (q >> 8) & 255;
    const qb = q & 255;
    const d = (r - qr) ** 2 * 2 + (g - qg) ** 2 * 4 + (b - qb) ** 2 * 3;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** 解锁后的 scene 可能大于 29×29：整体缩到板内并居中。 */
function importSceneToBoard(scene) {
  if (!scene || !Array.isArray(scene.pieces)) return false;
  const points = [];
  for (const p of scene.pieces) {
    const px = Array.isArray(p.pos) ? p.pos[0] : 0;
    const py = Array.isArray(p.pos) ? p.pos[1] : 0;
    for (const b of p.beads || []) {
      if (Array.isArray(b) && b.length >= 3) {
        points.push({ x: px + Number(b[0] || 0), y: py + Number(b[1] || 0), c: b[2] });
      }
    }
  }
  if (!points.length) return false;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const sw = maxX - minX + 1;
  const sh = maxY - minY + 1;
  const scale = Math.min(1, (N - 2) / Math.max(sw, sh));
  const outW = Math.max(1, Math.ceil(sw * scale));
  const outH = Math.max(1, Math.ceil(sh * scale));
  const offX = Math.floor((N - outW) / 2);
  const offY = Math.floor((N - outH) / 2);
  const next = emptyBoard();
  for (const p of points) {
    const x = Math.min(outW - 1, Math.max(0, Math.floor((p.x - minX) * scale)));
    const y = Math.min(outH - 1, Math.max(0, Math.floor((p.y - minY) * scale)));
    next[offY + y][offX + x] = nearestColorIndex(p.c);
  }
  snap();
  board = next;
  fused = Array.from({ length: N }, () => Array(N).fill(false));
  save();
  return true;
}

function draw() {
  if (screen === 'gallery') {
    drawGallery();
    return;
  }
  if (screen === 'detail') {
    drawDetail();
    return;
  }
  if (view3d) initWebGL();
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // header
  ctx.beginPath();
  ctx.arc(23, SAFE_TOP + 18, 10, 0, Math.PI * 2);
  ctx.fillStyle = CORAL;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(23, SAFE_TOP + 18, 3.6, 0, Math.PI * 2);
  ctx.fillStyle = BOARD;
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = 'bold 23px sans-serif';
  ctx.fillText(view3d ? '豆屿 · 立体' : '豆屿', 40, SAFE_TOP + 26);
  ctx.fillStyle = MUTED;
  ctx.font = '11px sans-serif';
  ctx.fillText(
    view3d
      ? gl
        ? 'WebGL 3D · 拖动旋转'
        : '2.5D 预览 · 左右拖动旋转'
      : rowMode
        ? `按行 · 第 ${rowFocus + 1} / ${N} 行`
        : '拼豆小岛 · 小游戏版',
    40,
    SAFE_TOP + 43,
  );

  const stat = countBeads();
  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`${stat.n} 颗`, W - 16, SAFE_TOP + 23);
  ctx.fillStyle = MUTED;
  ctx.font = '10px sans-serif';
  ctx.fillText(stat.f ? `已熨 ${stat.f}` : '点格子放豆', W - 16, SAFE_TOP + 39);
  ctx.textAlign = 'left';

  // menu + save
  roundRect(W - 182, SAFE_TOP + 46, 50, 22, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('集市', W - 157, SAFE_TOP + 61);
  ctx.textAlign = 'left';

  roundRect(W - 126, SAFE_TOP + 46, 50, 22, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('菜单', W - 101, SAFE_TOP + 61);
  ctx.textAlign = 'left';

  roundRect(W - 70, SAFE_TOP + 46, 54, 22, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('保存', W - 43, SAFE_TOP + 61);
  ctx.textAlign = 'left';

  if (overlay) {
    drawOverlay();
    return;
  }
  if (view3d) {
    draw3DScene();
    drawToolbar();
    drawFooter();
    return;
  }

  // board
  roundRect(boardX, boardY, boardSize, boardSize, 12);
  ctx.fillStyle = BOARD;
  ctx.fill();

  ctx.save();
  roundRect(boardX, boardY, boardSize, boardSize, 12);
  ctx.clip();
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 0.5;
  for (let i = 1; i < N; i++) {
    ctx.beginPath();
    ctx.moveTo(boardX + i * cell, boardY);
    ctx.lineTo(boardX + i * cell, boardY + boardSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(boardX, boardY + i * cell);
    ctx.lineTo(boardX + boardSize, boardY + i * cell);
    ctx.stroke();
  }

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const c = board[y][x];
      if (c < 0) continue;
      drawBead(
        boardX + (x + 0.5) * cell,
        boardY + (y + 0.5) * cell,
        cell * (fused[y][x] ? 0.47 : 0.43),
        COLORS[c].hex,
        fused[y][x],
      );
    }
  }

  if (stat.n === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText('点格子，放一颗豆', W / 2, boardY + boardSize / 2);
    ctx.textAlign = 'left';
  }

  if (rowMode) {
    const fy = boardY + rowFocus * cell;
    ctx.fillStyle = 'rgba(15,16,20,0.66)';
    ctx.fillRect(boardX, boardY, boardSize, fy - boardY);
    ctx.fillRect(boardX, fy + cell, boardSize, boardSize - (fy - boardY) - cell);
    ctx.strokeStyle = CORAL;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boardX, fy, boardSize, cell);
  }
  ctx.restore();

  // palette
  ctx.fillStyle = INK;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('色卡', 16, paletteY - 11);
  ctx.fillStyle = MUTED;
  ctx.font = '9px sans-serif';
  ctx.fillText(eraser ? '橡皮模式：点豆子收走' : '点一下换色，点板上放豆', 48, paletteY - 11);
  ctx.textAlign = 'right';
  ctx.fillStyle = CORAL;
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText(`当前 ${COLORS[selected] ? COLORS[selected].code : 'P08'}`, W - 16, paletteY - 11);
  ctx.textAlign = 'left';

  for (let i = 0; i < BASE_COLORS.length; i++) {
    const cx = 16 + paletteItem * (i + 0.5);
    const cy = paletteY + 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fillStyle = BASE_COLORS[i].hex;
    ctx.fill();
    if (selected === i && !eraser) {
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = MUTED;
    ctx.font = '8px sans-serif';
    ctx.fillText(BASE_COLORS[i].code, cx, cy + 27);
    ctx.textAlign = 'left';
  }

  // toolbar
  if (rowMode) drawRowToolbar();
  else drawToolbar();
  drawFooter();
}

function drawRowToolbar() {
  const labels = ['上一行', '下一行', '退出'];
  const item = (W - 36) / 3;
  for (let i = 0; i < 3; i++) {
    const x = 18 + i * item;
    const w = item - 6;
    roundRect(x, toolbarY, w, toolbarH, 10);
    ctx.fillStyle = i === 2 ? '#FFFFFF' : 'rgba(255,255,255,0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(53,41,27,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = i === 2 ? MUTED : INK;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(labels[i], x + w / 2, toolbarY + 27);
    ctx.textAlign = 'left';
  }
}

function drawOverlay() {
  ctx.fillStyle = 'rgba(20,18,14,0.46)';
  ctx.fillRect(0, 0, W, H);
  if (overlay === 'menu') drawMenu();
  else if (overlay === 'inventory') drawInventory();
  else if (overlay === 'colors') drawColors();
}

function drawMenu() {
  const x = W / 2 - 140;
  const y = SAFE_TOP + 120;
  const w = 280;
  const h = 458;
  roundRect(x, y, w, h, 18);
  ctx.fillStyle = BG;
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.12)';
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText('豆屿菜单', x + 20, y + 38);
  ctx.fillStyle = MUTED;
  ctx.font = '10px sans-serif';
  ctx.fillText('拼板、豆仓、按行、品牌色', x + 20, y + 55);

  const items = [
    ['豆仓 / 缺色', '查当前用豆和库存'],
    ['按行跟做', '一次亮一行'],
    ['保存图片', '把当前画面存相册'],
    ['导出 A4 图纸', '生成 29×29 图纸并保存'],
    ['品牌色号 532', '搜 Hama / Perler / Artkal'],
    ['分享小游戏', '把豆屿发给朋友'],
    ['关闭', '回到拼板'],
  ];
  for (let i = 0; i < items.length; i++) {
    const iy = y + 78 + i * 48;
    roundRect(x + 16, iy, w - 32, 38, 10);
    ctx.fillStyle = i === 6 ? 'rgba(255,255,255,0.45)' : '#FFFDF8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(53,41,27,0.10)';
    ctx.stroke();
    ctx.fillStyle = i === 6 ? MUTED : INK;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(items[i][0], x + 28, iy + 16);
    ctx.fillStyle = MUTED;
    ctx.font = '9px sans-serif';
    ctx.fillText(items[i][1], x + 28, iy + 30);
  }
}

function shareGame() {
  if (!wx.shareAppMessage) {
    toast('当前环境不支持分享');
    return;
  }
  wx.shareAppMessage({
    title: '豆屿 · 拼豆小岛',
    imageUrl: '',
  });
}

function openColorSearch() {
  if (!wx.showModal) {
    toast('当前环境不支持搜色号');
    return;
  }
  wx.showModal({
    title: '品牌色号',
    content: '',
    editable: true,
    placeholderText: 'P08 / H05 / 蓝 / Pink',
    success(res) {
      if (!res.confirm) return;
      const q = String(res.content || '').trim().toLowerCase();
      const hits = [];
      for (let i = 0; i < COLORS.length; i++) {
        const c = COLORS[i];
        if (!q || c.code.toLowerCase().includes(q) || String(c.name || '').toLowerCase().includes(q)) {
          hits.push(i);
        }
        if (hits.length >= 20) break;
      }
      if (!hits.length) {
        toast('没有找到这个色号');
        return;
      }
      colorQuery = q || '常用';
      colorResults = hits;
      overlay = 'colors';
      draw();
    },
  });
}

function drawColors() {
  const x = 16;
  const y = SAFE_TOP + 76;
  const w = W - 32;
  const h = H - SAFE_TOP - 150;
  roundRect(x, y, w, h, 16);
  ctx.fillStyle = BG;
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.12)';
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('品牌色号', x + 16, y + 32);
  ctx.fillStyle = MUTED;
  ctx.font = '9px sans-serif';
  ctx.fillText(`532 色 · 当前搜索「${colorQuery}」`, x + 16, y + 49);
  roundRect(x + w - 62, y + 14, 46, 26, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.12)';
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('关闭', x + w - 39, y + 31);
  ctx.textAlign = 'left';

  colorCards = [];
  const cols = 4;
  const gap = 6;
  const cardW = (w - 32 - gap * (cols - 1)) / cols;
  const cardH = 58;
  for (let i = 0; i < colorResults.length; i++) {
    const idx = colorResults[i];
    const col = COLORS[idx];
    const cx = x + 16 + (i % cols) * (cardW + gap);
    const cy = y + 64 + Math.floor(i / cols) * (cardH + gap);
    roundRect(cx, cy, cardW, cardH, 9);
    ctx.fillStyle = '#FFFDF8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(53,41,27,0.10)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 17, cy + 19, 10, 0, Math.PI * 2);
    ctx.fillStyle = col.hex;
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(col.code, cx + 32, cy + 22);
    ctx.fillStyle = MUTED;
    ctx.font = '7px sans-serif';
    const name = String(col.name || '').slice(0, 12);
    ctx.fillText(name, cx + 8, cy + 42);
    ctx.fillStyle = MUTED;
    ctx.font = '7px sans-serif';
    ctx.fillText(col.brand || '豆屿', cx + 8, cy + 52);
    colorCards.push({ idx, x: cx, y: cy, w: cardW, h: cardH });
  }

  roundRect(x + 16, y + h - 42, 96, 28, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.12)';
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('再搜一次', x + 64, y + h - 24);
  ctx.textAlign = 'left';
}

function handleColors(x, y) {
  const px = 16;
  const w = W - 32;
  const py = SAFE_TOP + 76;
  const h = H - SAFE_TOP - 150;
  if (x >= px + w - 62 && x <= px + w - 16 && y >= py + 14 && y <= py + 40) {
    overlay = null;
    draw();
    return;
  }
  if (x >= px + 16 && x <= px + 112 && y >= py + h - 42 && y <= py + h - 14) {
    overlay = null;
    openColorSearch();
    return;
  }
  for (const card of colorCards) {
    if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
      selected = card.idx;
      eraser = false;
      overlay = null;
      toast(`已选 ${COLORS[selected].code}`);
      draw();
      return;
    }
  }
  if (y > py + h + 10) {
    overlay = null;
    draw();
  }
}

function inventoryRows() {
  const used = COLORS.map(() => 0);
  for (let yy = 0; yy < N; yy++) {
    for (let xx = 0; xx < N; xx++) {
      if (board[yy][xx] >= 0) used[board[yy][xx]]++;
    }
  }
  const rows = [];
  for (let i = 0; i < COLORS.length; i++) {
    if (used[i] > 0 || stock[i] > 0) rows.push(i);
  }
  if (!rows.length) {
    for (let i = 0; i < Math.min(8, COLORS.length); i++) rows.push(i);
  }
  return rows;
}

function drawInventory() {
  const x = 16;
  const y = SAFE_TOP + 76;
  const w = W - 32;
  const h = H - SAFE_TOP - 150;
  roundRect(x, y, w, h, 16);
  ctx.fillStyle = BG;
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.12)';
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('豆仓 / 缺色', x + 16, y + 32);
  ctx.fillStyle = MUTED;
  ctx.font = '9px sans-serif';
  ctx.fillText('按当前拼板统计；库存点 +100 记一笔', x + 16, y + 49);

  const used = COLORS.map(() => 0);
  for (let yy = 0; yy < N; yy++) {
    for (let xx = 0; xx < N; xx++) {
      if (board[yy][xx] >= 0) used[board[yy][xx]]++;
    }
  }
  const allRows = inventoryRows();
  const maxRows = Math.max(1, Math.floor((h - 75) / 37));
  const rows = allRows.slice(0, maxRows);
  const rowH = Math.max(26, Math.min(44, (h - 75) / rows.length));
  for (let ri = 0; ri < rows.length; ri++) {
    const i = rows[ri];
    const ry = y + 64 + ri * rowH;
    ctx.beginPath();
    ctx.arc(x + 26, ry + 14, 10, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[i].hex;
    ctx.fill();

    ctx.fillStyle = INK;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${COLORS[i].code}`, x + 44, ry + 17);
    ctx.fillStyle = MUTED;
    ctx.font = '9px sans-serif';
    ctx.fillText(`用 ${used[i]}`, x + 86, ry + 17);
    const miss = Math.max(0, used[i] - stock[i]);
    ctx.fillStyle = miss ? CORAL : MUTED;
    ctx.fillText(`存 ${stock[i]}${miss ? ` · 缺 ${miss}` : ''}`, x + 132, ry + 17);

    roundRect(x + w - 68, ry + 1, 52, 26, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(53,41,27,0.14)';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('+100', x + w - 42, ry + 18);
    ctx.textAlign = 'left';
  }
  if (allRows.length > rows.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '8px sans-serif';
    ctx.fillText(`还有 ${allRows.length - rows.length} 种颜色，先在这里显示最常用的`, x + 16, y + h - 58);
  }

  roundRect(x + 16, y + h - 44, 82, 30, 9);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.14)';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('返回', x + 57, y + h - 24);
  ctx.textAlign = 'left';
}

function drawScreenHeader(title) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  roundRect(16, SAFE_TOP + 12, 52, 28, 9);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('返回', 42, SAFE_TOP + 30);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(title, 82, SAFE_TOP + 32);
  if (me) {
    ctx.textAlign = 'right';
    ctx.fillStyle = MUTED;
    ctx.font = '10px sans-serif';
    ctx.fillText(`豆币 ${me.points}`, W - 16, SAFE_TOP + 30);
    ctx.textAlign = 'left';
  }
}

function fitText(text, maxW) {
  let s = String(text || '');
  if (ctx.measureText(s).width <= maxW) return s;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

function wrapped(text, x, y, maxW, lineH, maxLines) {
  let line = '';
  let lines = 0;
  for (const ch of String(text || '')) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      lines++;
      line = ch;
      if (lines >= maxLines) return;
    } else line = test;
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineH);
}

function drawCoverBox(work, x, y, w, h, radius) {
  roundRect(x, y, w, h, radius);
  ctx.fillStyle = '#E6D8C2';
  ctx.fill();
  const entry = cover((work.images && work.images[0]) || work.coverUrl);
  if (entry && entry.ready) {
    ctx.save();
    roundRect(x, y, w, h, radius);
    ctx.clip();
    ctx.drawImage(entry.img, x, y, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(work.title || '豆').slice(0, 1), x + w / 2, y + h / 2 + 6);
    ctx.textAlign = 'left';
  }
  ctx.strokeStyle = 'rgba(43,33,23,0.12)';
  ctx.lineWidth = 1;
  roundRect(x, y, w, h, radius);
  ctx.stroke();
}

function galleryCard(i) {
  const gap = 8;
  const cw = (W - 28 - gap) / 2;
  const ch = 146;
  const top = SAFE_TOP + 92;
  return {
    x: 14 + (i % 2) * (cw + gap),
    y: top + Math.floor(i / 2) * (ch + gap),
    w: cw,
    h: ch,
  };
}

function drawGallery() {
  drawScreenHeader('集市');
  const filters = [
    ['latest', '最新'],
    ['collected', '我的收藏'],
  ];
  for (let i = 0; i < filters.length; i++) {
    const f = filters[i];
    const x = 16 + i * 76;
    roundRect(x, SAFE_TOP + 48, 70, 26, 8);
    ctx.fillStyle = galleryFilter === f[0] ? CORAL : 'rgba(255,255,255,0.65)';
    ctx.fill();
    ctx.strokeStyle = galleryFilter === f[0] ? CORAL : 'rgba(53,41,27,0.12)';
    ctx.stroke();
    ctx.fillStyle = galleryFilter === f[0] ? '#fff' : MUTED;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f[1], x + 35, SAFE_TOP + 65);
    ctx.textAlign = 'left';
  }
  if (worksLoading && !works.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('正在打开集市…', W / 2, H * 0.45);
    ctx.textAlign = 'left';
    return;
  }
  if (!works.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(galleryFilter === 'collected' ? '还没有收藏作品' : '集市还没有作品', W / 2, H * 0.45);
    ctx.textAlign = 'left';
    return;
  }

  const list = works.slice(galleryPage * 8, galleryPage * 8 + 8);
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    const r = galleryCard(i);
    drawCoverBox(w, r.x, r.y, r.w, r.h - 47, 10);
    ctx.fillStyle = INK;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(fitText(w.title, r.w), r.x, r.y + r.h - 31);
    ctx.fillStyle = MUTED;
    ctx.font = '8px sans-serif';
    ctx.fillText(fitText(w.author && w.author.name, r.w - 44), r.x, r.y + r.h - 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = w.price ? CORAL : MUTED;
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText(w.price ? `${w.price} 豆币` : '免费', r.x + r.w, r.y + r.h - 16);
    ctx.textAlign = 'left';
  }

  if (works.length > 8) {
    const y = H - 56;
    roundRect(16, y, 78, 30, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.fillStyle = galleryPage > 0 ? INK : MUTED;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('上一页', 55, y + 19);
    roundRect(W - 94, y, 78, 30, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.fillStyle = galleryPage < Math.ceil(works.length / 8) - 1 ? INK : MUTED;
    ctx.fillText('下一页', W - 55, y + 19);
    ctx.textAlign = 'left';
  }
}

function detailRects() {
  const top = SAFE_TOP + 76;
  const coverH = 200;
  const btnY = top + coverH + 104;
  const collect = { x: 16, y: btnY, w: 102, h: 38 };
  const like = { x: 126, y: btnY, w: 102, h: 38 };
  const unlock = { x: 236, y: btnY, w: W - 252, h: 38 };
  const comment = { x: 16, y: btnY + 48, w: W - 32, h: 34 };
  return { top, coverH, btnY, collect, like, unlock, comment };
}

function drawDetail() {
  drawScreenHeader('作品');
  if (!detail) {
    ctx.fillStyle = MUTED;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(detailLoading ? '正在打开作品…' : '作品不在了', W / 2, H * 0.45);
    ctx.textAlign = 'left';
    return;
  }
  const r = detailRects();
  drawCoverBox(detail, 16, r.top, W - 32, r.coverH, 14);

  let y = r.top + r.coverH + 30;
  ctx.fillStyle = INK;
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(fitText(detail.title, W - 32), 16, y);
  y += 18;
  ctx.fillStyle = MUTED;
  ctx.font = '9px sans-serif';
  ctx.fillText(
    `${detail.author ? detail.author.name : '豆友'} · ${detail.partCount || 0} 块零件 · ${detail.beadCount || 0} 颗豆`,
    16,
    y,
  );
  y += 18;
  ctx.fillStyle = '#5F5548';
  ctx.font = '10px sans-serif';
  wrapped(detail.desc || '作者还没有写介绍。', 16, y, W - 32, 15, 2);

  const buttons = [
    { r: r.collect, label: detail.collected ? `★ 已收藏 ${detail.collects}` : `☆ 收藏 ${detail.collects}` },
    { r: r.like, label: detail.liked ? `♥ 已心动 ${detail.likes}` : `♡ 心动 ${detail.likes}` },
    {
      r: r.unlock,
      label: detail.unlocked ? '已解锁' : detail.price > 0 ? `解锁 ${detail.price}` : '免费',
    },
  ];
  for (const b of buttons) {
    roundRect(b.r.x, b.r.y, b.r.w, b.r.h, 9);
    ctx.fillStyle = b.r === r.unlock && !detail.unlocked ? CORAL : 'rgba(255,255,255,0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(53,41,27,0.15)';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = b.r === r.unlock && !detail.unlocked ? '#fff' : INK;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(b.label, b.r.x + b.r.w / 2, b.r.y + 23);
    ctx.textAlign = 'left';
  }

  roundRect(r.comment.x, r.comment.y, r.comment.w, r.comment.h, 9);
  ctx.fillStyle = '#FFFDF8';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.12)';
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = '10px sans-serif';
  ctx.fillText(`留言 ${detail.commentCount || 0} · 点这里写一句`, r.comment.x + 12, r.comment.y + 22);

  const cy = r.comment.y + r.comment.h + 24;
  ctx.fillStyle = INK;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('最近留言', 16, cy);
  if (!comments.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '9px sans-serif';
    ctx.fillText('还没有留言，做第一个吧。', 16, cy + 20);
  } else {
    comments.slice(0, 3).forEach((c, i) => {
      const yy = cy + 20 + i * 35;
      ctx.fillStyle = INK;
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(fitText(c.author ? c.author.name : '豆友', 120), 16, yy);
      ctx.fillStyle = MUTED;
      ctx.font = '9px sans-serif';
      ctx.fillText(fitText(c.body, W - 32), 16, yy + 14);
    });
  }

  if (detailLoading) {
    ctx.fillStyle = MUTED;
    ctx.font = '9px sans-serif';
    ctx.fillText('正在同步…', W - 80, SAFE_TOP + 30);
  }
}
function drawToolbar() {
  if (view3d) {
    const labels = ['撤销', '旋转', '抬起', '放下', '重置', '返回'];
    for (let i = 0; i < labels.length; i++) {
      const x = 18 + i * toolbarItem;
      const w = toolbarItem - 5;
      const active = i === 5;
      roundRect(x, toolbarY, w, toolbarH, 10);
      ctx.fillStyle = active ? CORAL : 'rgba(255,255,255,0.72)';
      ctx.fill();
      ctx.strokeStyle = active ? CORAL : 'rgba(53,41,27,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = active ? '#fff' : INK;
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(labels[i], x + w / 2, toolbarY + 27);
      ctx.textAlign = 'left';
    }
    return;
  }
  const tools = ['撤销', '橡皮', '熨烫', '图纸', '3D', '清空'];
  for (let i = 0; i < tools.length; i++) {
    const x = 18 + i * toolbarItem;
    const w = toolbarItem - 5;
    const active = (i === 1 && eraser) || (i === 4 && view3d);
    roundRect(x, toolbarY, w, toolbarH, 10);
    ctx.fillStyle = active ? CORAL : 'rgba(255,255,255,0.72)';
    ctx.fill();
    ctx.strokeStyle = active ? CORAL : 'rgba(53,41,27,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = active ? '#fff' : INK;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(tools[i], x + w / 2, toolbarY + 27);
    ctx.textAlign = 'left';
  }
}

function drawFooter() {
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(43,33,23,0.42)';
  ctx.font = '9px sans-serif';
  let text = '29 × 29 标准拼板 · 5mm 中豆 · 豆屿 BEAD ISLE';
  if (view3d) {
    text = gl
      ? `WebGL 3D 拼装 · ${pieces3d.length} 块零件 · 拖动选中的零件`
      : 'Canvas 2.5D 预览 · 完整 3D 待接 WebGL';
  } else if (rowMode) {
    let n = 0;
    for (let x = 0; x < N; x++) if (board[rowFocus][x] >= 0) n++;
    text = `按行跟做 · 第 ${rowFocus + 1} 行 · 本行 ${n} 颗`;
  }
  ctx.fillText(text, W / 2, toolbarY - 12);
  ctx.textAlign = 'left';
}

/* ------------------------------- WebGL 3D -------------------------------- */
function mat4Identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function mat4Multiply(a, b) {
  const out = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function mat4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ];
}

function mat4LookAt(eye, center, up) {
  const z0 = eye[0] - center[0];
  const z1 = eye[1] - center[1];
  const z2 = eye[2] - center[2];
  let zl = Math.hypot(z0, z1, z2) || 1;
  const z = [z0 / zl, z1 / zl, z2 / zl];
  let x0 = up[1] * z[2] - up[2] * z[1];
  let x1 = up[2] * z[0] - up[0] * z[2];
  let x2 = up[0] * z[1] - up[1] * z[0];
  let xl = Math.hypot(x0, x1, x2) || 1;
  const x = [x0 / xl, x1 / xl, x2 / xl];
  const y = [
    z[1] * x[2] - z[2] * x[1],
    z[2] * x[0] - z[0] * x[2],
    z[0] * x[1] - z[1] * x[0],
  ];
  return [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
    -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
    -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
    1,
  ];
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function initWebGL() {
  if (gl) return true;
  if (glFailed || !wx.createOffscreenCanvas) return false;
  try {
    glCanvas = wx.createOffscreenCanvas({
      type: 'webgl',
      width: W * DPR,
      height: H * DPR,
    });
    gl = glCanvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error('no webgl');
    const vs = `
      attribute vec3 aPos;
      attribute vec3 aNormal;
      attribute vec3 aColor;
      uniform mat4 uMVP;
      varying vec3 vN;
      varying vec3 vC;
      void main() {
        vN = aNormal;
        vC = aColor;
        gl_Position = uMVP * vec4(aPos, 1.0);
      }
    `;
    const fs = `
      precision mediump float;
      varying vec3 vN;
      varying vec3 vC;
      void main() {
        vec3 n = normalize(vN);
        float d = max(dot(n, normalize(vec3(-0.4, 0.85, 0.5))), 0.0);
        gl_FragColor = vec4(vC * (0.58 + 0.52 * d), 1.0);
      }
    `;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) || 'shader');
      }
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'link');
    }
    glProgram = program;
    glBuffer = gl.createBuffer();
    glLoc = {
      pos: gl.getAttribLocation(program, 'aPos'),
      normal: gl.getAttribLocation(program, 'aNormal'),
      color: gl.getAttribLocation(program, 'aColor'),
      mvp: gl.getUniformLocation(program, 'uMVP'),
    };
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    return true;
  } catch (e) {
    glFailed = true;
    gl = null;
    return false;
  }
}

function pushFace(out, a, b, c, d, n, color) {
  const pts = [a, b, c, a, c, d];
  for (const p of pts) out.push(p[0], p[1], p[2], n[0], n[1], n[2], color[0], color[1], color[2]);
}

function pushBox(out, cx, cy, cz, sx, sy, sz, color) {
  const x0 = cx - sx / 2;
  const x1 = cx + sx / 2;
  const y0 = cy - sy / 2;
  const y1 = cy + sy / 2;
  const z0 = cz - sz / 2;
  const z1 = cz + sz / 2;
  pushFace(out, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], color);
  pushFace(out, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], color);
  pushFace(out, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], color);
  pushFace(out, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], color);
  pushFace(out, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], color);
  pushFace(out, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], color);
}

function projectPoint(mvp, x, y, z) {
  const cx = mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12];
  const cy = mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13];
  const cw = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
  if (cw <= 0) return null;
  return {
    x: (cx / cw * 0.5 + 0.5) * W,
    y: (1 - (cy / cw * 0.5 + 0.5)) * H,
  };
}

function renderWebGL() {
  if (!initWebGL()) return false;
  if (!pieces3d.length) buildPieces3d();
  const verts = [];
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  // 取景用原拼板范围，不跟着拖动/抬起变化，否则单零件拖动会被相机“追着”居中。
  let viewMinX = Infinity;
  let viewMinZ = Infinity;
  let viewMaxX = -Infinity;
  let viewMaxZ = -Infinity;
  const centers = [];

  for (let pi = 0; pi < pieces3d.length; pi++) {
    const p = pieces3d[pi];
    const a = (p.rot * Math.PI) / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (const cell of p.cells) {
      const dx = cell.x + 0.5 - p.cx;
      const dz = cell.y + 0.5 - p.cz;
      const wx = p.cx + p.ox + dx * ca - dz * sa;
      const wz = p.cz + p.oz + dx * sa + dz * ca;
      const wy = p.lift;
      const h = fused[cell.y][cell.x] ? 0.52 : 0.72;
      pushBox(verts, wx, wy + 0.07, wz, 0.94, 0.14, 0.94, hexRgb('#252832'));
      pushBox(
        verts,
        wx,
        wy + h / 2,
        wz,
        0.82,
        h,
        0.82,
        hexRgb(COLORS[cell.c].hex),
      );
      minX = Math.min(minX, wx - 0.5);
      maxX = Math.max(maxX, wx + 0.5);
      minY = Math.min(minY, wy);
      maxY = Math.max(maxY, wy + h);
      minZ = Math.min(minZ, wz - 0.5);
      maxZ = Math.max(maxZ, wz + 0.5);
      viewMinX = Math.min(viewMinX, cell.x + 0.5);
      viewMaxX = Math.max(viewMaxX, cell.x + 0.5);
      viewMinZ = Math.min(viewMinZ, cell.y + 0.5);
      viewMaxZ = Math.max(viewMaxZ, cell.y + 0.5);
    }
    centers.push({ x: p.cx + p.ox, y: p.lift + 0.4, z: p.cz + p.oz });
  }

  const has = Number.isFinite(minX);
  if (!has) {
    minX = 0;
    maxX = N;
    minY = 0;
    maxY = 1;
    minZ = 0;
    maxZ = N;
    centers.length = 0;
  }
  const cx = has ? (viewMinX + viewMaxX) / 2 : (minX + maxX) / 2;
  const cz = has ? (viewMinZ + viewMaxZ) / 2 : (minZ + maxZ) / 2;
  const cy = 0.5;
  const size = Math.max(
    has ? viewMaxX - viewMinX : maxX - minX,
    1,
    has ? viewMaxZ - viewMinZ : maxZ - minZ,
  );
  const target = [cx, cy, cz];
  const radius = Math.max(20, size * 2.8 + 7);
  if (has) {
    // 固定地面板：零件抬起/拖动时能看出高度和位移。
    pushBox(verts, cx, -0.22, cz, size + 3, 0.24, size + 3, hexRgb('#252832'));
  }
  const eye = [
    target[0] + Math.cos(pitch) * Math.sin(angle) * radius,
    target[1] + Math.sin(pitch) * radius,
    target[2] + Math.cos(pitch) * Math.cos(angle) * radius,
  ];
  const view = mat4LookAt(eye, target, [0, 1, 0]);
  const proj = mat4Perspective(Math.PI / 4, W / H, 0.1, 200);
  const mvp = mat4Multiply(proj, view);
  pieceScreens = centers.map((c) => projectPoint(mvp, c.x, c.y, c.z));

  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(glProgram);
  gl.uniformMatrix4fv(glLoc.mvp, false, new Float32Array(mvp));
  gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
  const stride = 9 * 4;
  gl.enableVertexAttribArray(glLoc.pos);
  gl.vertexAttribPointer(glLoc.pos, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(glLoc.normal);
  gl.vertexAttribPointer(glLoc.normal, 3, gl.FLOAT, false, stride, 3 * 4);
  gl.enableVertexAttribArray(glLoc.color);
  gl.vertexAttribPointer(glLoc.color, 3, gl.FLOAT, false, stride, 6 * 4);
  gl.drawArrays(gl.TRIANGLES, 0, verts.length / 9);
  return true;
}

function draw3DScene() {
  if (renderWebGL()) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, boardY - 6, W, H - boardY - 96);
    ctx.clip();
    ctx.drawImage(glCanvas, 0, 0, W, H);
    ctx.restore();
    if (selectedPiece >= 0 && pieceScreens[selectedPiece]) {
      const p = pieceScreens[selectedPiece];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(224,88,47,0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = CORAL;
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`零件 ${selectedPiece + 1}/${pieces3d.length}`, p.x, p.y - 30);
      ctx.textAlign = 'left';
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(43,33,23,0.55)';
    ctx.font = '10px sans-serif';
    ctx.fillText('拖动零件 · 空白处拖动旋转', W / 2, toolbarY - 38);    ctx.textAlign = 'left';
    return;
  }
  drawFallback3D();
}

function drawFallback3D() {
  const stat = countBeads();
  if (!stat.n) {
    ctx.textAlign = 'center';
    ctx.fillStyle = MUTED;
    ctx.font = '13px sans-serif';
    ctx.fillText('先回拼板放几颗豆，再来看立体', W / 2, H * 0.48);
    ctx.textAlign = 'left';
    return;
  }

  const scale = Math.min((W - 40) / (N * 1.38), (H * 0.46) / (N * 0.58));
  const cx = W / 2;
  const cy = boardY + boardSize * 0.47;
  const center = (N - 1) / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const project = (x, y) => {
    const u = x - center;
    const v = y - center;
    const X = u * cos - v * sin;
    const Z = u * sin + v * cos;
    return { x: cx + X * scale, y: cy + Z * scale * 0.55, z: Z };
  };

  // base plate
  const corners = [
    [-0.6, -0.6],
    [N - 0.4, -0.6],
    [N - 0.4, N - 0.4],
    [-0.6, N - 0.4],
  ].map(([x, y]) => project(x, y));
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(27,29,35,0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // beads, back to front
  const items = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (board[y][x] < 0) continue;
      const p = project(x, y);
      items.push({ ...p, color: COLORS[board[y][x]].hex, fused: fused[y][x] });
    }
  }
  items.sort((a, b) => a.z - b.z);

  const h = scale * (stat.f ? 0.7 : 0.9);
  const r = scale * 0.42;
  for (const it of items) {
    ctx.beginPath();
    ctx.moveTo(it.x - r, it.y - h);
    ctx.lineTo(it.x + r, it.y - h);
    ctx.lineTo(it.x + r, it.y);
    ctx.lineTo(it.x - r, it.y);
    ctx.closePath();
    ctx.fillStyle = it.color;
    ctx.globalAlpha = 0.72;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(it.x, it.y - h, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = it.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(it.x, it.y - h, r * 0.34, r * 0.19, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1B1D23';
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(43,33,23,0.55)';
  ctx.font = '10px sans-serif';
  ctx.fillText('左右拖动，转一转', W / 2, toolbarY - 38);
  ctx.textAlign = 'left';
}

function buildSheetCanvas() {
  if (!wx.createOffscreenCanvas) return null;
  const SW = 2200;
  const SH = 1556;
  const cv = wx.createOffscreenCanvas({ type: '2d', width: SW, height: SH });
  const c = cv.getContext('2d');
  if (!c) return null;
  const paper = '#FBF7EE';
  const ink = '#2B2117';
  const muted = '#706453';
  const coral = '#E0582F';
  c.fillStyle = paper;
  c.fillRect(0, 0, SW, SH);
  c.fillStyle = ink;
  c.font = 'bold 30px sans-serif';
  c.fillText('豆屿 · BEAD ISLE', 64, 66);
  c.fillStyle = muted;
  c.font = '18px sans-serif';
  c.fillText('拼豆图纸 / PATTERN CHART', 64, 98);

  c.fillStyle = ink;
  c.font = 'bold 44px sans-serif';
  c.fillText('豆屿小岛 · 29 × 29', 64, 156);
  const stat = countBeads();
  c.fillStyle = muted;
  c.font = '19px sans-serif';
  c.fillText(`${stat.n} 颗豆 · 8 色 · 成品约 ${(29 * 0.5).toFixed(1)} × ${(29 * 0.5).toFixed(1)} cm · 1 块 29×29 拼板`, 64, 190);

  const gx = 64;
  const gy = 226;
  const gw = 1400;
  const gh = 1080;
  const cs = Math.min(gw / N, gh / N);
  const gridW = cs * N;
  const gridH = cs * N;
  c.fillStyle = '#FFFDF8';
  c.fillRect(gx, gy, gridW, gridH);
  c.strokeStyle = 'rgba(43,33,23,0.10)';
  c.lineWidth = 1;
  for (let i = 0; i <= N; i++) {
    c.beginPath();
    c.moveTo(gx + i * cs, gy);
    c.lineTo(gx + i * cs, gy + gridH);
    c.stroke();
    c.beginPath();
    c.moveTo(gx, gy + i * cs);
    c.lineTo(gx + gridW, gy + i * cs);
    c.stroke();
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = board[y][x];
      if (v < 0) continue;
      c.fillStyle = COLORS[v].hex;
      c.beginPath();
      c.arc(gx + (x + 0.5) * cs, gy + (y + 0.5) * cs, cs * 0.42, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(gx + (x + 0.5) * cs, gy + (y + 0.5) * cs, cs * 0.14, 0, Math.PI * 2);
      c.fillStyle = '#FFFDF8';
      c.fill();
    }
  }
  c.strokeStyle = 'rgba(43,33,23,0.24)';
  c.lineWidth = 2;
  c.strokeRect(gx, gy, gridW, gridH);
  c.fillStyle = muted;
  c.font = '13px sans-serif';
  for (let i = 0; i < N; i += 5) {
    c.textAlign = 'center';
    c.fillText(String(i), gx + (i + 0.5) * cs, gy - 8);
    c.textAlign = 'right';
    c.fillText(String(i), gx - 8, gy + (i + 0.5) * cs + 4);
  }
  c.textAlign = 'left';

  const lx = 1540;
  const ly = 238;
  c.fillStyle = ink;
  c.font = 'bold 24px sans-serif';
  c.fillText(`色号清单 · ${stat.n} 颗`, lx, ly);
  c.fillStyle = muted;
  c.font = '15px sans-serif';
  c.fillText('每种颜色按 1000 颗/包备料，建议多备 10%', lx, ly + 24);
  const used = COLORS.map(() => 0);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) if (board[y][x] >= 0) used[board[y][x]]++;
  }
  const usedRows = [];
  for (let i = 0; i < COLORS.length; i++) if (used[i] > 0) usedRows.push(i);
  const legendRows = (usedRows.length ? usedRows : COLORS.slice(0, 8)).slice(0, 14);
  legendRows.forEach((idx, ri) => {
    const col = COLORS[idx];
    const ry = ly + 58 + ri * 40;
    c.fillStyle = col.hex;
    c.fillRect(lx, ry - 16, 28, 28);
    c.fillStyle = ink;
    c.font = 'bold 16px sans-serif';
    c.fillText(codeText(col.code), lx + 38, ry + 6);
    c.fillStyle = muted;
    c.font = '14px sans-serif';
    c.textAlign = 'right';
    c.fillText(`${used[idx]} 颗`, lx + 560, ry + 6);
    c.textAlign = 'left';
  });
  if (usedRows.length > legendRows.length) {
    c.fillStyle = muted;
    c.font = '13px sans-serif';
    c.fillText(`另有 ${usedRows.length - legendRows.length} 色，见小游戏豆仓`, lx, ly + 58 + legendRows.length * 40 + 14);
  }

  c.fillStyle = '#F4EADB';
  c.fillRect(64, 1360, 2072, 100);
  c.fillStyle = ink;
  c.font = 'bold 20px sans-serif';
  c.fillText('制作顺序', 84, 1394);
  c.fillStyle = muted;
  c.font = '16px sans-serif';
  c.fillText('01 先摆轮廓   02 按色号填   03 胶带法翻面   04 熨烫压平', 84, 1424);
  c.fillText('豆屿 BEAD ISLE · 小游戏导出图纸 · 5mm 中豆', 64, 1520);
  c.textAlign = 'right';
  c.fillText('一颗一颗，熨成一座岛。', SW - 64, 1520);
  c.textAlign = 'left';
  return cv;
}

function codeText(code) {
  return String(code || 'P').slice(0, 8);
}

function exportA4() {
  const cv = buildSheetCanvas();
  if (!cv) {
    toast('当前环境不支持导出图纸');
    return;
  }
  if (!wx.canvasToTempFilePath) {
    toast('当前环境不支持导出图纸');
    return;
  }
  if (wx.showLoading) wx.showLoading({ title: '正在生成图纸…' });
  wx.canvasToTempFilePath({
    canvas: cv,
    width: 2200,
    height: 1556,
    destWidth: 2200,
    destHeight: 1556,
    success(res) {
      if (wx.hideLoading) wx.hideLoading();
      wx.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success() {
          toast('A4 图纸已保存到相册');
        },
        fail() {
          if (wx.showModal) {
            wx.showModal({
              title: '需要相册权限',
              content: '允许保存图片后，再点一次导出。',
              showCancel: false,
            });
          }
        },
      });
    },
    fail() {
      if (wx.hideLoading) wx.hideLoading();
      toast('导出失败，稍后再试');
    },
  });
}

function saveImage() {  if (!wx.canvasToTempFilePath) {
    wx.showToast({ title: '当前环境不支持保存', icon: 'none' });
    return;
  }
  if (wx.showLoading) wx.showLoading({ title: '正在保存…' });
  wx.canvasToTempFilePath({
    canvas,
    success(res) {
      if (wx.hideLoading) wx.hideLoading();
      wx.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success() {
          wx.showToast({ title: '已保存到相册', icon: 'none' });
        },
        fail() {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置里允许保存图片到相册。',
            showCancel: false,
          });
        },
      });
    },
    fail() {
      if (wx.hideLoading) wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    },
  });
}

function choosePhotoPattern() {
  wx.showModal({
    title: '照片 / PDF 转图纸',
    content: '会按 29×29 重新配成 8 色豆图，并替换当前拼板。继续吗？',
    success(res) {
      if (!res.confirm) return;
      const done = (path) => loadPhotoPattern(path);
      const pickImage = () => {
        if (wx.chooseMedia) {
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success(r) {
              const f = r.tempFiles && r.tempFiles[0];
              if (f) done(f.tempFilePath);
            },
          });
        } else if (wx.chooseImage) {
          wx.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            success(r) {
              if (r.tempFilePaths && r.tempFilePaths[0]) done(r.tempFilePaths[0]);
            },
          });
        } else {
          wx.showToast({ title: '当前环境不支持选图', icon: 'none' });
        }
      };
      if (wx.showActionSheet) {
        wx.showActionSheet({
          itemList: ['照片 / 拍照', 'PDF 文件'],
          success(r) {
            if (r.tapIndex === 0) pickImage();
            else pickPdf();
          },
          fail() {},
        });
      } else {
        pickImage();
      }
    },
  });
}

function pickPdf() {
  if (!wx.chooseMessageFile || !wx.getFileSystemManager) {
    wx.showToast({ title: '当前环境不支持选 PDF，请用照片', icon: 'none' });
    return;
  }
  wx.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['pdf'],
    success(r) {
      const f = r.tempFiles && r.tempFiles[0];
      const filePath = f && (f.path || f.tempFilePath);
      if (!filePath) return;
      if (wx.showLoading) wx.showLoading({ title: '正在转 PDF…' });
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success(res) {
          request('/api/tools/pdf', 'POST', { data: res.data }, 30000)
            .then((data) => {
              if (wx.hideLoading) wx.hideLoading();
              loadPhotoPattern(API_BASE + data.url);
            })
            .catch(() => {
              if (wx.hideLoading) wx.hideLoading();
              wx.showToast({ title: 'PDF 转图失败，确认服务端已启动', icon: 'none' });
            });
        },
        fail() {
          if (wx.hideLoading) wx.hideLoading();
          wx.showToast({ title: 'PDF 读取失败', icon: 'none' });
        },
      });
    },
  });
}

function loadPhotoPattern(path) {
  if (wx.showLoading) wx.showLoading({ title: '正在配豆…' });
  const img = wx.createImage();
  img.onload = () => {
    try {
      const cv = wx.createOffscreenCanvas
        ? wx.createOffscreenCanvas({ type: '2d', width: N, height: N })
        : wx.createCanvas();
      const c2 = cv.getContext('2d');
      const s = Math.min(img.width || 1, img.height || 1);
      const sx = ((img.width || s) - s) / 2;
      const sy = ((img.height || s) - s) / 2;
      c2.drawImage(img, sx, sy, s, s, 0, 0, N, N);
      const data = c2.getImageData(0, 0, N, N).data;
      const palette = COLORS.map((c) => ({
        r: parseInt(c.hex.slice(1, 3), 16),
        g: parseInt(c.hex.slice(3, 5), 16),
        b: parseInt(c.hex.slice(5, 7), 16),
      }));
      const next = emptyBoard();
      let n = 0;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 4;
          if (data[i + 3] < 32) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          let best = 0;
          let bestD = Infinity;
          for (let k = 0; k < palette.length; k++) {
            const p = palette[k];
            const d = (r - p.r) ** 2 * 2 + (g - p.g) ** 2 * 4 + (b - p.b) ** 2 * 3;
            if (d < bestD) {
              bestD = d;
              best = k;
            }
          }
          next[y][x] = best;
          n++;
        }
      }
      if (!n) {
        wx.showToast({ title: '这张图没读出颜色', icon: 'none' });
        return;
      }
      snap();
      board = next;
      fused = Array.from({ length: N }, () => Array(N).fill(false));
      save();
      draw();
      wx.showToast({ title: `已转 ${n} 格`, icon: 'none' });
    } catch (e) {
      wx.showToast({ title: '转图失败，换一张试试', icon: 'none' });
    } finally {
      if (wx.hideLoading) wx.hideLoading();
    }
  };
  img.onerror = () => {
    if (wx.hideLoading) wx.hideLoading();
    wx.showToast({ title: '图片打不开', icon: 'none' });
  };
  img.src = path;
}

function handle(x, y) {
  if (screen === 'gallery') {
    handleGallery(x, y);
    return;
  }
  if (screen === 'detail') {
    handleDetail(x, y);
    return;
  }
  if (overlay) {
    handleOverlay(x, y);
    return;
  }

  // marketplace button
  if (x >= W - 182 && x <= W - 132 && y >= SAFE_TOP + 42 && y <= SAFE_TOP + 72) {
    openGallery();
    return;
  }

  // menu button
  if (x >= W - 126 && x <= W - 76 && y >= SAFE_TOP + 42 && y <= SAFE_TOP + 72) {
    overlay = 'menu';
    draw();
    return;
  }

  // save button
  if (x >= W - 74 && x <= W - 12 && y >= SAFE_TOP + 42 && y <= SAFE_TOP + 72) {
    saveImage();
    return;
  }

  // board
  if (
    !view3d &&
    x >= boardX &&
    x <= boardX + boardSize &&
    y >= boardY &&
    y <= boardY + boardSize
  ) {
    const bx = Math.floor((x - boardX) / cell);
    const by = Math.floor((y - boardY) / cell);
    if (bx >= 0 && bx < N && by >= 0 && by < N) {
      snap();
      if (eraser) {
        board[by][bx] = -1;
        fused[by][bx] = false;
      } else {
        board[by][bx] = selected;
        fused[by][bx] = false;
      }
      save();
      draw();
    }
    return;
  }

  // palette
  if (!view3d && y >= paletteY - 6 && y <= paletteY + 38) {
    for (let i = 0; i < BASE_COLORS.length; i++) {
      const cx = 16 + paletteItem * (i + 0.5);
      if (Math.abs(x - cx) <= 20) {
        selected = i;
        eraser = false;
        draw();
        return;
      }
    }
  }

  // toolbar
  if (y >= toolbarY && y <= toolbarY + toolbarH) {
    if (view3d) {
      const i = Math.floor((x - 18) / toolbarItem);
      if (i === 0) {
        undoPiece();
        return;
      } else if (i === 1) {
        if (selectedPiece >= 0 && pieces3d[selectedPiece]) {
          pushPieceHistory();
          pieces3d[selectedPiece].rot = (pieces3d[selectedPiece].rot + 1) % 4;
        }
      } else if (i === 2) {
        if (selectedPiece >= 0 && pieces3d[selectedPiece]) {
          pushPieceHistory();
          pieces3d[selectedPiece].lift = Math.min(6, pieces3d[selectedPiece].lift + 0.7);
        }
      } else if (i === 3) {
        if (selectedPiece >= 0 && pieces3d[selectedPiece]) {
          pushPieceHistory();
          pieces3d[selectedPiece].lift = Math.max(0, pieces3d[selectedPiece].lift - 0.7);
        }
      } else if (i === 4) {
        pushPieceHistory();
        for (const p of pieces3d) {
          p.ox = 0;
          p.oz = 0;
          p.lift = 0;
          p.rot = 0;
        }
        selectedPiece = pieces3d.length ? 0 : -1;
      } else if (i === 5) {
        toggle3DView();
        return;
      }
      draw();
      return;
    }
    if (rowMode) {
      const item = (W - 36) / 3;
      const ri = Math.floor((x - 18) / item);
      if (ri === 0) rowFocus = Math.max(0, rowFocus - 1);
      else if (ri === 1) rowFocus = Math.min(N - 1, rowFocus + 1);
      else if (ri === 2) rowMode = false;
      draw();
      return;
    }
    const i = Math.floor((x - 18) / toolbarItem);
    if (i < 0 || i > 5) return;
    if (i === 0) {
      const prev = history.pop();
      if (prev) {
        board = prev.board;
        fused = prev.fused;
        save();
      }
    } else if (i === 1) {
      eraser = !eraser;
    } else if (i === 2) {
      for (let yy = 0; yy < N; yy++) {
        for (let xx = 0; xx < N; xx++) {
          if (board[yy][xx] >= 0) fused[yy][xx] = true;
        }
      }
      save();
    } else if (i === 3) {
      choosePhotoPattern();
    } else if (i === 4) {
      toggle3DView();
      return;
    } else if (i === 5) {
      snap();
      board = emptyBoard();
      fused = Array.from({ length: N }, () => Array(N).fill(false));
      save();
    }
    draw();
  }
}

function handleGallery(x, y) {
  if (x >= 16 && x <= 68 && y >= SAFE_TOP + 12 && y <= SAFE_TOP + 42) {
    screen = 'studio';
    draw();
    return;
  }
  if (y >= SAFE_TOP + 48 && y <= SAFE_TOP + 74) {
    if (x >= 16 && x <= 86) {
      if (galleryFilter !== 'latest') {
        galleryFilter = 'latest';
        loadGallery();
      }
      return;
    }
    if (x >= 92 && x <= 162) {
      if (galleryFilter !== 'collected') {
        galleryFilter = 'collected';
        loadGallery();
      }
      return;
    }
  }
  const list = works.slice(galleryPage * 8, galleryPage * 8 + 8);
  for (let i = 0; i < list.length; i++) {
    const r = galleryCard(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      openDetail(list[i].id);
      return;
    }
  }
  if (works.length > 8) {
    const by = H - 56;
    if (y >= by && y <= by + 30) {
      if (x >= 16 && x <= 94) {
        galleryPage = Math.max(0, galleryPage - 1);
        draw();
      } else if (x >= W - 94 && x <= W - 16) {
        galleryPage = Math.min(Math.ceil(works.length / 8) - 1, galleryPage + 1);
        draw();
      }
    }
  }
}

function handleDetail(x, y) {
  if (x >= 16 && x <= 68 && y >= SAFE_TOP + 12 && y <= SAFE_TOP + 42) {
    screen = 'gallery';
    detail = null;
    comments = [];
    if (galleryFilter === 'collected') loadGallery();
    else draw();
    return;
  }
  if (!detail) return;
  const r = detailRects();
  if (y >= r.collect.y && y <= r.collect.y + r.collect.h) {
    if (x >= r.collect.x && x <= r.collect.x + r.collect.w) return doAction('collect');
    if (x >= r.like.x && x <= r.like.x + r.like.w) return doAction('like');
    if (x >= r.unlock.x && x <= r.unlock.x + r.unlock.w) {
      if (detail.unlocked) return;
      return doAction('unlock');
    }
  }
  if (x >= r.comment.x && x <= r.comment.x + r.comment.w && y >= r.comment.y && y <= r.comment.y + r.comment.h) {
    doAction('comment');
  }
}

function handleOverlay(x, y) {
  if (overlay === 'menu') {
    const x0 = W / 2 - 140;
    const y0 = SAFE_TOP + 120;
    for (let i = 0; i < 7; i++) {
      const iy = y0 + 78 + i * 48;
      if (x >= x0 + 16 && x <= x0 + 264 && y >= iy && y <= iy + 38) {
        if (i === 0) overlay = 'inventory';
        else if (i === 1) {
          rowMode = true;
          view3d = false;
          overlay = null;
          rowFocus = N - 1;
          for (let yy = 0; yy < N; yy++) {
            if (board[yy].some((c) => c >= 0)) {
              rowFocus = yy;
              break;
            }
          }
        } else if (i === 2) {
          overlay = null;
          saveImage();
        } else if (i === 3) {
          overlay = null;
          exportA4();
        } else if (i === 4) {
          overlay = null;
          openColorSearch();
          return;
        } else if (i === 5) {
          overlay = null;
          shareGame();
        } else overlay = null;
        draw();
        return;
      }
    }
    if (y < y0 || y > y0 + 458) overlay = null;
    draw();
    return;
  }

  if (overlay === 'colors') {
    handleColors(x, y);
    return;
  }

  if (overlay === 'inventory') {
    const x0 = 16;
    const w = W - 32;
    const h = H - SAFE_TOP - 150;
    const y0 = SAFE_TOP + 76;
    const allRows = inventoryRows();
    const maxRows = Math.max(1, Math.floor((h - 75) / 37));
    const rows = allRows.slice(0, maxRows);
    const rowH = Math.max(26, Math.min(44, (h - 75) / rows.length));
    if (x >= x0 + 16 && x <= x0 + 98 && y >= y0 + h - 44 && y <= y0 + h - 14) {
      overlay = null;
      draw();
      return;
    }
    for (let ri = 0; ri < rows.length; ri++) {
      const i = rows[ri];
      const ry = y0 + 64 + ri * rowH;
      if (x >= x0 + w - 68 && x <= x0 + w - 16 && y >= ry + 1 && y <= ry + 27) {
        stock[i] += 100;
        saveStock();
        draw();
        return;
      }
    }
    if (y > y0 + h + 10) {
      overlay = null;
      draw();
    }
  }
}

load();
loadStock();
draw();

wx.onTouchStart((e) => {
  const t = e.touches && e.touches[0];
  if (!t) return;
  if (view3d && !overlay && t.clientY < toolbarY - 6) {
    const hit = pieceAt(t.clientX, t.clientY);
    if (hit >= 0) {
      selectedPiece = hit;
      dragPiece = hit;
      dragCamera = false;
      pushPieceHistory();
      dragX = t.clientX;
      dragY = t.clientY;
    } else {
      dragPiece = -1;
      dragCamera = true;
      dragX = t.clientX;
      dragY = t.clientY;
    }
  }
  handle(t.clientX, t.clientY);
});

if (wx.onTouchMove) {
  wx.onTouchMove((e) => {
    if (!view3d || overlay) return;
    const t = e.touches && e.touches[0];
    if (!t || dragX == null) return;
    if (dragPiece >= 0 && pieces3d[dragPiece]) {
      const dx = t.clientX - dragX;
      const dy = t.clientY - dragY;
      pieces3d[dragPiece].ox += dx * 0.055;
      pieces3d[dragPiece].oz += dy * 0.055;
    } else if (dragCamera) {
      angle += (t.clientX - dragX) * 0.012;
      pitch = Math.max(0.18, Math.min(1.25, pitch + (t.clientY - dragY) * 0.008));
    }
    dragX = t.clientX;
    dragY = t.clientY;
    draw();
  });
}

if (wx.onTouchEnd) {
  wx.onTouchEnd(() => {
    if (view3d && dragPiece >= 0 && pieces3d[dragPiece]) {
      const p = pieces3d[dragPiece];
      p.ox = Math.round(p.ox * 2) / 2;
      p.oz = Math.round(p.oz * 2) / 2;
      if (collidesPiece(dragPiece)) {
        toast('这块和别的零件重叠了，已回弹');
        undoPiece();
      } else {
        draw();
      }
    }
    dragX = null;
    dragY = null;
    dragPiece = -1;
    dragCamera = false;
  });
}

// 方便排查/自动化测试，不影响正常游戏
if (typeof GameGlobal !== 'undefined') {
  GameGlobal.__douyuGame = {
    board: () => board,
    handle,
    toggle3D: () => {
      toggle3DView();
    },
    sheet: () => buildSheetCanvas(),
  };
}
