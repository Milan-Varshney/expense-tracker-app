// Accent colors are shared across both themes — only surfaces/text adapt.
export const shared = {
  amber:   '#E8A33D', // primary accent / warnings / FAB
  teal:    '#3FA796', // positive / on-track
  coral:   '#D66853', // overspend / high alert
  violet:  '#8B7FD1', // secondary accent (bills, subscriptions)
  neutral: '#8B93AA', // neutral category accent (subscriptions, other)
};

export const dark = {
  ...shared,
  void:     '#0E1424', // app background
  panel:    '#161E33', // card surface
  panelAlt: '#1D2740', // secondary surface / track backgrounds
  hairline: '#2A3552', // borders/dividers
  bone:     '#EDEAE0', // primary text
  boneDim:  '#9AA3BD', // secondary text
};

export const light = {
  ...shared,
  void:     '#F5F3EC', // app background (warm ledger paper)
  panel:    '#FFFFFF', // card surface
  panelAlt: '#ECE8DC', // secondary surface / track backgrounds
  hairline: '#DAD5C4', // borders/dividers
  bone:     '#1B2233', // primary text
  boneDim:  '#5B6478', // secondary text
};

export default dark;
