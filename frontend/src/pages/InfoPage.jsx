import React from "react";
import { useParams, Link } from "react-router-dom";
import "./InfoPage.styles.css";

const PAGES = {
  about: {
    title: "About Axen Wear",
    body: [
      "Axen Wear started with a simple idea: everyday clothing should have personality. We design streetwear, pop-culture inspired apparel and essentials for people who want to stand out without trying too hard.",
      "Every piece is made from quality fabrics, printed with care, and built to last wash after wash. From oversized tees to sneakers, our collections are crafted in-house and dropped in limited runs.",
      "We're a small team obsessed with fit, comfort and detail — and we're just getting started.",
    ],
  },
  careers: {
    title: "Careers",
    body: [
      "We're always on the lookout for designers, developers, and storytellers who love fashion and culture.",
      "Open roles: Frontend Engineer, Apparel Designer, Social Media Lead, Warehouse Associate.",
      "Interested? Email your resume and portfolio to careers@axenwear.example and tell us what you'd bring to the team.",
    ],
  },
  contact: {
    title: "Contact Us",
    body: [
      "Need help with an order or have a question? We're here Mon–Sat, 10am–7pm IST.",
      "Email: support@axenwear.example",
      "Phone: +91 90000 00000",
      "For wholesale or collaboration enquiries: partnerships@axenwear.example",
    ],
  },
  shipping: {
    title: "Shipping Policy",
    body: [
      "We offer FREE shipping on all prepaid orders above ₹999. Orders below that carry a flat ₹49 shipping fee.",
      "Orders are dispatched within 24–48 hours and typically delivered within 3–7 business days depending on your location.",
      "You'll receive a tracking link by email and SMS once your order ships.",
    ],
  },
  returns: {
    title: "Returns & Exchanges",
    body: [
      "Not the right fit? You can return or exchange any unworn item within 30 days of delivery.",
      "Items must be unused, with original tags and packaging intact.",
      "Refunds are processed to the original payment method within 5–7 business days of us receiving the return.",
      "To start a return, contact support@axenwear.example with your order ID.",
    ],
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "By using this website and placing an order you agree to our terms of service.",
      "Prices, offers and availability are subject to change without notice. We reserve the right to cancel any order due to stock or pricing errors.",
      "All product designs, logos and content are the property of Axen Wear and may not be reproduced without permission.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We collect only the information needed to process your orders and improve your experience — name, contact details, and order history.",
      "We never sell your personal data. Payment information is handled securely by our payment partners and is not stored on our servers.",
      "You can request deletion of your account data at any time by contacting support@axenwear.example.",
    ],
  },
};

export default function InfoPage() {
  const { slug } = useParams();
  const page = PAGES[slug];

  if (!page) {
    return (
      <div className="info-page">
        <h1>Page not found</h1>
        <p>The page you’re looking for doesn’t exist.</p>
        <Link to="/" className="info-back">← Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="info-page">
      <h1>{page.title}</h1>
      {page.body.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
      <Link to="/" className="info-back">← Back to Home</Link>
    </div>
  );
}
