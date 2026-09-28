// Content transcribed from the live site at 123walkin.com so the rebuild says
// the same things in the same order. Copy is quoted as published; only the
// structure around it is new. Nothing here links back to the live site.
import type { SpotName } from "@/components/illustrations";

export const site = {
  /** The live address. Sitemap, canonical links and share previews are built from it. */
  url: "https://123walkin.com",
  name: "123 Virtual Clinic",
  shortName: "123 Walkin Clinic",
  phone: "+1 604-755-4408",
  phoneHref: "tel:+16047554408",
  email: "moa@123walkin.com",
  emailHref: "mailto:moa@123walkin.com",
  /**
   * Where the Book buttons go. "/book/" is the Cortico-style flow built into this
   * site: it books through Bimble when NEXT_PUBLIC_BIMBLE_CLINIC_SLUG is set, and
   * is a demo otherwise. To send patients to Cortico instead, set this to
   * corticoUrl — Cortico can't be embedded (X-Frame-Options: DENY).
   */
  bookingUrl: "/book/",
  /** The clinic's real Cortico booking page — the same link the live site uses. */
  corticoUrl: "https://123walkin.cortico.ca/book/first-available/?location=123-walk-in-clinic-abbotsford",
  copyright: `Copyright ${new Date().getFullYear()} © 123 Walkin Clinic`,
  disclaimer:
    "Disclaimer: The content on 123 Virtual Clinic's website, including text, graphics, and images, is intended for informational and educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your physician or another qualified healthcare provider for any medical concerns, and never delay professional medical treatment based on information read online.",
};

export const hero = {
  heading: "Best Telehealth Care Anytime, Anywhere in British Columbia",
  body:
    "Experience the best telehealth that adapts to your life. With 123 Walkin Clinic, you have immediate access to professional medical care whenever you need it. No more waiting for appointments or traveling to clinics. Our doctors are available at your convenience, offering personalized consultations, prescriptions, and follow-up care.",
  primary: "Book An Appointment",
  secondary: "How It Works",
};

export const howItWorks = {
  heading: "HOW IT WORKS",
  intro:
    "Connecting online with professional healthcare providers in BC is easy with 123 Virtual Clinic. Our straightforward process includes easy registration, flexible appointment scheduling, and comprehensive virtual consultations. We streamline your journey to better health, focusing on convenience and efficiency.",
  steps: [
    {
      title: "Simple Registration",
      body: "Click “Get Started” to easily register your details with us. Choose a time that fits into your busy schedule.",
      spot: "wave" as SpotName,
    },
    {
      title: "Choose Appointment Type",
      body: "Select between a phone call or video chat for your consultation. We adapt to your preferences and requirements.",
      spot: "clock" as SpotName,
    },
    {
      title: "Consult & Get Diagnosed",
      body: "Get diagnosed, receive prescriptions, or obtain any necessary medical documents to continue with your day.",
      spot: "consult" as SpotName,
    },
  ],
};

export const doctorsCanDo = {
  headingLead: "What Our",
  headingMark: "Virtual Doctors",
  headingTail: "Can Do For You",
  intro:
    "Our experienced virtual doctor & health service provides timely and comprehensive medical care to British Columbia residents, even those who do not have a family doctor. Our platform is equipped to deal with a wide variety of health concerns.",
  cards: [
    {
      id: "common-ailments",
      title: "Common Ailments",
      body: "Manage cold, flu symptoms, allergies, and minor infections effectively.",
      spot: "sneeze" as SpotName,
      details: ["Cold & flu symptoms", "Seasonal allergies", "Sore throat & sinus infections", "Minor infections"],
    },
    {
      id: "skin-concerns",
      title: "Skin Concerns",
      body: "Receive professional help for rashes and various skin issues quickly.",
      spot: "skin" as SpotName,
      details: ["Rashes", "Acne", "Eczema", "Skin infections"],
    },
    {
      id: "prescription-services",
      title: "Prescription Services",
      body: "Prescriptions from our doctors sent to your preferred pharmacy.",
      spot: "clipboard" as SpotName,
      details: ["New prescriptions", "Renewals of ongoing medication", "Sent straight to your pharmacy", "Follow-up care"],
    },
    {
      id: "doctors-notes",
      title: "Doctor’s Notes",
      body: "Easily obtain necessary doctor’s notes for work or school.",
      spot: "note" as SpotName,
      details: ["Work notes", "School notes", "Quick virtual visit", "Private fee — not covered by MSP"],
    },
  ],
};

export const conditions = {
  eyebrow: "Navigating Your Health Concerns",
  heading: "British Columbia’s Best Telehealth for Diverse Medical Needs",
  items: [
    "Influenza",
    "COVID-19",
    "Chronic Pain",
    "Allergies",
    "Asthma",
    "Bronchitis",
    "Hypertension",
    "Arthritis",
    "Eczema",
    "Skin Infection",
    "Acne",
    "Conjunctivitis",
    "Headaches",
    "Gastro",
    "Sinusitis",
    "Diabetes",
  ],
};

export const pricing = {
  heading: "Pricing",
  intro:
    "Get affordable access to quality Telehealth care, regardless of your insurance status. Our telehealth pricing structure is transparent and designed to cater to everyone’s needs.",
  plans: [
    {
      title: "Virtual Care",
      price: "$0",
      body: "Covered by B.C.’s Medical Service Plan (MSP), allowing you to access medical care virtually at no cost.",
      featured: true,
    },
    {
      title: "Private Visit",
      price: "$100",
      body: "For those without MSP coverage, we offer private consultations at a reasonable fee.",
      featured: false,
    },
    {
      title: "Doctor’s Notes",
      price: "$50",
      body: "Need a note for work or school? We provide this service at a minimal cost, as it’s not covered under MSP.",
      featured: false,
    },
  ],
};

export const finalCta = {
  heading: "Are you ready to book your next virtual appointment?",
  button: "BOOK NOW",
};

export const nav = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "/how-it-works/" },
  { label: "Services", href: "/services/" },
  { label: "Pricing", href: "/pricing/" },
  { label: "Faq", href: "/faq/" },
];

export const footerLocations = [
  "Virtual Clinic in Abbotsford",
  "Virtual Clinic in Surrey",
  "Virtual Clinic in Burnaby",
  "Virtual Clinic in Chilliwack",
  "Virtual Clinic In Bellingham",
  "Virtual Clinic In Mission",
  "Virtual Clinic In Langley",
  "Virtual Clinic In Maple Ridge",
  "Virtual Clinic In Ferndale",
  "Virtual Clinic in McMillan Island",
];

// FAQ answers are written from what the live homepage and pricing say.
export const faqs: { q: string; a: string }[] = [
  {
    q: "Who can use 123 Virtual Clinic?",
    a: "Residents of British Columbia, including people who do not have a family doctor.",
  },
  {
    q: "Is a virtual visit covered by MSP?",
    a: "Yes. Virtual care is covered by B.C.’s Medical Service Plan (MSP), so eligible patients pay $0.",
  },
  {
    q: "What if I don’t have MSP coverage?",
    a: "You can still see a doctor. Private visits are available for $100.",
  },
  {
    q: "Can I get a doctor’s note for work or school?",
    a: "Yes. Doctor’s notes cost $50 because they are not covered under MSP.",
  },
  {
    q: "Will I talk to the doctor by phone or video?",
    a: "Your choice. When you book, select a phone call or a video chat — whichever suits you.",
  },
  {
    q: "How do I get my prescription?",
    a: "If the doctor prescribes medication, the prescription is sent to your preferred pharmacy.",
  },
  {
    q: "What can the virtual doctors help with?",
    a: "Common ailments like cold, flu and allergies, skin concerns such as rashes and acne, prescriptions and renewals, doctor’s notes, and ongoing conditions like asthma, hypertension and diabetes.",
  },
  {
    q: "What do I need for my appointment?",
    a: "A phone or a device with a camera and internet connection, your BC Services Card or MSP number, and the name of the pharmacy you’d like to use.",
  },
  {
    q: "Is virtual care right for an emergency?",
    a: "No. For chest pain, trouble breathing, severe bleeding or any other emergency, call 911 or go to the nearest emergency department.",
  },
];
