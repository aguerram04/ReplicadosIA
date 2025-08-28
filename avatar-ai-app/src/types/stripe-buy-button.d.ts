// Allow using the Stripe Buy Button custom element in TSX without type errors
declare namespace JSX {
  interface IntrinsicElements {
    "stripe-buy-button": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      "buy-button-id"?: string;
      "publishable-key"?: string;
      "client-reference-id"?: string;
      "customer-email"?: string;
    };
  }
}
