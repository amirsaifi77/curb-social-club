import theme from '@curb/design-tokens/tailwind.theme';

// Tailwind reads this through @config in app/app.css. Every value is a
// var(--token) from @curb/design-tokens/tokens.css, so themes and schemes
// switch through the data attributes on <html>, not through class swaps.
export default {
  theme: { extend: theme },
};
