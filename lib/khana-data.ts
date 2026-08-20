import type { ImageSourcePropType } from "react-native";

export { formatPKR, getCartItemCount, getCartSubtotal } from "./cart-pricing";

export type AddOn = {
  id: string;
  name: string;
  price: number;
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  image: ImageSourcePropType;
  category: string;
  isPopular?: boolean;
  spiceOptions?: string[];
  addOns?: AddOn[];
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  eta: string;
  deliveryFee: number;
  offer: string;
  image: ImageSourcePropType;
  menu: MenuItem[];
};

export type CartLine = {
  id: string;
  restaurantId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  image: ImageSourcePropType;
  spice: string;
  addOns: AddOn[];
};

export const cuisineFilters = [
  { id: "all", label: "All", icon: "restaurant-menu" },
  { id: "pakistani", label: "Pakistani", icon: "restaurant" },
  { id: "fast-food", label: "Fast Food", icon: "fastfood" },
  { id: "desi", label: "Desi", icon: "whatshot" },
  { id: "grill", label: "BBQ & Grill", icon: "local-dining" },
] as const;

const karahi = require("../assets/images/food/karahi.webp") as ImageSourcePropType;
const biryani = require("../assets/images/food/biryani.jpg") as ImageSourcePropType;
const wrap = require("../assets/images/food/wrap.jpg") as ImageSourcePropType;

const deraMenu: MenuItem[] = [
  {
    id: "dera-karahi",
    restaurantId: "lahori-dera",
    name: "Chicken Karahi",
    description: "Tomato-forward karahi with ginger, green chilli, and fresh coriander.",
    price: 1140,
    image: karahi,
    category: "Popular",
    isPopular: true,
    spiceOptions: ["Mild", "Regular", "Extra spicy"],
    addOns: [
      { id: "naan", name: "Tandoori naan", price: 80 },
      { id: "raita", name: "Mint raita", price: 110 },
    ],
  },
  {
    id: "dera-makhni",
    restaurantId: "lahori-dera",
    name: "Chicken Makhni Handi",
    description: "Creamy tomato curry, roasted spices, and a balanced buttery finish.",
    price: 1080,
    image: karahi,
    category: "Mains",
    spiceOptions: ["Mild", "Regular"],
    addOns: [{ id: "roti", name: "Roghni roti", price: 90 }],
  },
  {
    id: "dera-boti",
    restaurantId: "lahori-dera",
    name: "Malai Boti",
    description: "Tender chicken skewers finished over charcoal with a mild cream marinade.",
    price: 820,
    image: karahi,
    category: "Grill",
    spiceOptions: ["Mild", "Regular"],
    addOns: [{ id: "fries", name: "Masala fries", price: 260 }],
  },
];

const biryaniMenu: MenuItem[] = [
  {
    id: "biryani-classic",
    restaurantId: "biryani-house",
    name: "Classic Chicken Biryani",
    description: "Aromatic basmati rice with a full chicken portion, aloo, and house masala.",
    price: 520,
    image: biryani,
    category: "Popular",
    isPopular: true,
    spiceOptions: ["Mild", "Regular", "Extra spicy"],
    addOns: [
      { id: "salad", name: "Fresh salad", price: 90 },
      { id: "drink", name: "Soft drink", price: 140 },
    ],
  },
  {
    id: "biryani-special",
    restaurantId: "biryani-house",
    name: "Special Biryani Box",
    description: "Chicken biryani served with raita, salad, and a chilled drink.",
    price: 690,
    image: biryani,
    category: "Value meals",
    spiceOptions: ["Mild", "Regular", "Extra spicy"],
    addOns: [{ id: "kebab", name: "Chicken seekh kebab", price: 250 }],
  },
];

const burgerMenu: MenuItem[] = [
  {
    id: "burger-wrap",
    restaurantId: "smash-town",
    name: "Smoky Chicken Wrap",
    description: "Chargrilled chicken, crunchy slaw, and smoky sauce in a toasted wrap.",
    price: 640,
    image: wrap,
    category: "Popular",
    isPopular: true,
    spiceOptions: ["Mild", "Regular", "Extra spicy"],
    addOns: [
      { id: "fries", name: "Crispy fries", price: 220 },
      { id: "drink", name: "Soft drink", price: 140 },
    ],
  },
  {
    id: "burger-loaded",
    restaurantId: "smash-town",
    name: "Loaded Chicken Burger",
    description: "Crispy chicken, pickles, lettuce, and a house-made pepper sauce.",
    price: 760,
    image: wrap,
    category: "Burgers",
    spiceOptions: ["Mild", "Regular"],
    addOns: [{ id: "cheese", name: "Extra cheese", price: 150 }],
  },
];

export const restaurants: Restaurant[] = [
  {
    id: "lahori-dera",
    name: "Lahori Dera",
    cuisine: "Pakistani · Karahi",
    rating: 4.8,
    reviewCount: 320,
    eta: "25–35 min",
    deliveryFee: 89,
    offer: "20% off up to Rs. 250",
    image: karahi,
    menu: deraMenu,
  },
  {
    id: "biryani-house",
    name: "Biryani House",
    cuisine: "Pakistani · Biryani",
    rating: 4.7,
    reviewCount: 410,
    eta: "20–30 min",
    deliveryFee: 69,
    offer: "Free delivery on Rs. 999+",
    image: biryani,
    menu: biryaniMenu,
  },
  {
    id: "smash-town",
    name: "Smash Town",
    cuisine: "Fast Food · Burgers",
    rating: 4.6,
    reviewCount: 195,
    eta: "30–40 min",
    deliveryFee: 99,
    offer: "Rs. 150 off combos",
    image: wrap,
    menu: burgerMenu,
  },
];
