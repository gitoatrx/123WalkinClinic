// Content for the inner pages, transcribed from screenshots of the live site
// (How It Works, Services, Pricing, FAQ). Headings, intros and every visible
// answer are the live copy. Answers that were collapsed in the screenshots are
// marked DRAFT — replace them with the live wording when the page source is available.
import type { IconName } from "@/components/icons";

export type QA = { q: string; a: string };

/* ---------------- How It Works ---------------- */

export const howItWorksPage = {
  heroTitle: "Consult Our Online Healthcare Professionals Today in British Columbia",
  heroBody:
    "Experience effortless access to Quality Tele Healthcare. Our virtual platform seamlessly connects you with experienced doctors for your online medical consultations.",
  stepsHeading: "Your Easy Access to Telehealth",
  firstStepBody: "Click “Book Now” to easily register your details with us. Choose a time that fits into your busy schedule.",
  helpHeading: "Our Virtual Doctors Can Help",
  helpBody:
    "123 Virtual Clinic platform is designed to bypass the inconveniences of traditional clinic visits. Avoid the crowded waiting rooms and long queues at doctors’ offices. Our proficient virtual doctors are ready to assist with a variety of health concerns, ensuring you receive timely and effective care to enhance your wellbeing.",
  limitsHeading: "Our Virtual Doctors Can Help",
  limitsBody:
    "Our virtual healthcare is effective for many concerns, but it has its limits. Complex or urgent medical issues necessitate in-person, emergency, or continuous care settings, which are outside our virtual consultation scope.",
  faqHeading: "Frequently Asked Questions",
};

export type ServiceBlock = { id: string; title: string; body: string; icon: IconName; gradient: string };

export const serviceBlocks: ServiceBlock[] = [
  {
    id: "virtual-consultations",
    title: "Virtual Consultations",
    body: "Experience the best and easiest virtual consultation. Our online doctors are just a phone or video call away, ready to assess your health concerns and develop a personalized care plan to improve your wellbeing. Virtual appointments are now more accessible than ever.",
    icon: "video",
    gradient: "from-[#d9e3fb] to-[#e7f1fb]",
  },
  {
    id: "prescription-services",
    title: "Prescription Services",
    body: "During your virtual consultation, if medication is needed, our doctors can prescribe it. Choose to have your prescription sent to your preferred pharmacy or delivered directly to you, free of charge, for added convenience.",
    icon: "clipboard",
    gradient: "from-[#f8e3ef] to-[#eef0fb]",
  },
  {
    id: "doctors-notes",
    title: "Doctor’s Notes Online",
    body: "Need a medical note for work or school? Our online doctors can provide one if necessary. We understand the importance of health for you and those around you. A doctor’s note can be emailed to you promptly.",
    icon: "file",
    gradient: "from-[#dfeafb] to-[#adf6ef]",
  },
  {
    id: "blood-tests",
    title: "Blood Test Requests",
    body: "For conditions requiring further analysis, our online doctors can issue blood test requisitions. These can be directly emailed to you or forwarded to your nearest Lifelabs facility for your convenience and health monitoring.",
    icon: "syringe",
    gradient: "from-[#fbe7d3] via-[#f7e4ee] to-[#efefef]",
  },
  {
    id: "imaging",
    title: "Imaging Requisitions",
    body: "If your condition requires detailed examination, our doctors can arrange for imaging requisitions. These can be sent directly to your email or to a local imaging center like West Coast Medical Imaging for a thorough diagnosis.",
    icon: "stethoscope",
    gradient: "from-[#e3effb] via-[#dffbea] to-[#fbfbd6]",
  },
  {
    id: "guidance",
    title: "General Medical Guidance",
    body: "Managing health concerns can be challenging. Our virtual doctors are here to offer advice and support through our online consultations, helping you navigate health issues with ease and confidence.",
    icon: "heart",
    gradient: "from-[#e8eafb] to-[#f7ecf1]",
  },
];

export const limits: { title: string; body: string }[] = [
  {
    title: "Emergency Situations",
    body: "Our virtual clinic is not equipped for emergencies. In cases of medical emergencies like chest pains, severe breathing issues, intense infections, early childhood fevers, potential blackouts, seizures, stroke symptoms, severe abdominal pain, broken bones, or any urgent health concerns, our virtual service is not suitable. For such symptoms, please promptly visit an Emergency Department or dial 911.",
  },
  {
    title: "ICBC and WCB Cases",
    body: "Our virtual clinic isn’t ideal for motor vehicle or workplace injuries. The care we offer is episodic and on-demand, without assurance of the same doctor for follow-ups. Most musculoskeletal injuries need physical assessments. Thus, these should be managed at an in-person clinic, by a family physician, or at an urgent care center.",
  },
  {
    title: "Disability and Long-Term Absence Forms",
    body: "Our virtual healthcare providers are unable to complete forms related to disability or prolonged absences. Such documentation requires in-depth evaluation that goes beyond virtual consultations.",
  },
  {
    title: "Controlled Medications",
    body: "Controlled substances such as narcotic pain relievers, benzodiazepines, muscle relaxants, and stimulants are not prescribed by our virtual clinic’s doctors.",
  },
];

/* ---------------- Shared FAQ answers ---------------- */

const A = {
  whatIs:
    "A digital healthcare service connecting you with BC-licensed medical professionals. Our platform offers convenient, comprehensive medical care, designed with user needs in mind, ensuring timely access to healthcare.",
  howToSee:
    "Through VirtualClinic, book an appointment effortlessly online. At your appointment time, choose to connect with the doctor via phone, video, or secure messaging on any device, without needing to download an app.",
  isFree:
    "Mostly, yes. Telehealth is free for MSP-covered services in BC, including consultations with licensed physicians. However, some services like doctor’s notes aren’t MSP-covered. Non-MSP-covered services, like Naturopath visits, may be reimbursable through third-party insurance, but direct billing isn’t available.",
  howWork:
    "Virtual clinics are digital platforms where healthcare professionals and patients interact. They allow for initial assessments of health concerns, reducing the need for immediate in-person visits to hospitals or clinics.",
  noDoctor:
    "If you’re without a doctor in BC, search for 123VC on Google. Our VirtualClinic will appear, allowing you to swiftly book an online appointment. Choose your preferred communication method with the doctor – phone, video, or secure messaging, all without needing an app.",
  issues:
    "Virtual clinics are ideal for routine and non-urgent medical issues. These include cold and flu symptoms, rashes, insect bites, seasonal allergies, minor infections, general health inquiries, and stable medication refills.",
  whenUse:
    "123 Virtual Clinic is ideal for addressing non-urgent, common health issues. This includes:\n\n-Cold and flu symptoms\n-Rashes and insect bites\n-Seasonal allergies and minor allergic reactions\n-Minor infections\n-General health inquiries\n-Prescription refills for stable medications\nFor more details, see our Treatable Conditions section. Remember, some issues may require an in-person visit, and our providers will guide you accordingly.",
  whenNot:
    "Avoid using 123 Virtual Clinic for conditions needing physical examination or in emergencies. This includes:\n\n-Chest pain or palpitations\n-Increasing abdominal pain\n-Head injuries\n-Broken bones\n-Numbness, weakness, or neurological changes\n-Sudden vision changes or eye pain\n-Sudden leg swelling\n-Any issue needing urgent care\nIn emergencies, call 911 or go to the nearest emergency department. Telehealth is not suitable for these situations.",
  // DRAFT — collapsed in the screenshots.
  howUse:
    "Click Book Now, register your details, choose a time and an appointment type, then wait for the doctor to call or video-chat with you.",
  whatTele:
    "Virtual care, telemedicine, and telehealth are often used interchangeably. They describe healthcare services provided through digital means like phone calls, video chats, or interactive messaging. Instead of an in-person visit, you connect with healthcare providers digitally. This approach enables physicians and other healthcare professionals to assess, diagnose, and treat patients remotely, effectively addressing many common health issues.",
  access:
    "Accessing telehealth services in British Columbia is streamlined with 123 Virtual Clinic. Simply click on the book an appointment button. You can choose a convenient time for a virtual consultation via a secure video or phone call. After your consultation, any necessary prescriptions can be sent directly to your preferred pharmacy. The process ensures privacy, convenience, and continuous support for all your healthcare needs, making professional medical care accessible anywhere in BC.",
  canSee: "Yes, you can see a doctor online in British Columbia through our virtual services. Our platform enables you to consult with licensed healthcare professionals via secure video or phone calls from the comfort of your home. You can receive medical advice, prescriptions, and follow-up care, making it an effective and convenient option for accessing healthcare without needing to visit a physical clinic.",
  howTeleBC:
    "In British Columbia, telehealth works by connecting patients with healthcare providers through digital platforms. Patients can register on our website, schedule appointments at convenient times, and consult with doctors via secure video or phone calls. This service allows for a wide range of medical consultations—from diagnosing and treating common ailments to managing chronic conditions and prescribing medications, all remotely. Prescriptions can be sent directly to a pharmacy, and other services such as issuing doctor’s notes are also available, making healthcare more accessible across the province.",
  rxPhone:
    "Yes, in British Columbia, you can get a prescription over the phone through 123 Virtual Clinic telehealth services. Licensed doctors are authorized to assess your health condition during a virtual consultation and can issue prescriptions remotely. These prescriptions can then be sent directly to your preferred pharmacy for pickup or delivery, offering a convenient way to manage your medication needs without needing to visit a clinic in person.",
  number:
    "604-755-4408\nFor general telehealth services in British Columbia, such as those provided by HealthLink BC, you can dial 811. This number connects residents with healthcare professionals who can offer advice, information, and support for non-emergency health issues any time of the day or night.",
};

export const howItWorksFaqs: QA[] = [
  {
    q: "Here, you’ll find answers to the most frequently asked questions regarding our virtual healthcare platform, helping you understand our services better.",
    a: A.whatIs,
  },
  { q: "How to see a doctor in BC online?", a: A.howToSee },
  { q: "Is telehealth free in BC?", a: A.isFree },
  { q: "How do virtual clinics work?", a: A.howWork },
  { q: "What can I do if I don’t have a doctor in BC?", a: A.noDoctor },
  { q: "What kind of Issues can be addressed on a virtual clinic?", a: A.issues },
];

/* ---------------- Services ---------------- */

export const servicesPage = {
  heroTitle: "Virtual Healthcare Services",
  heroBody:
    "Connect with our qualified, Canadian-licensed doctors in British Columbia for premier online medical services. Our virtual platform enables you to get diagnosed and treated efficiently from the comfort of your home.",
  solutionsHeading: "Our Healthcare Solutions",
  solutionsBody:
    "We offer a wide range of virtual healthcare services, easily accessible through your phone, tablet, or computer. Be it a minor ailment like a cold or a recurring chronic issue, our experienced online doctors are ready to provide the care you need",
};

/* ---------------- Pricing ---------------- */

export const pricingPage = {
  heroTitle: "Affordable Care Options",
  heroBody: "Access essential online healthcare without the burden of out-of-pocket expenses.",
  plansHeading: "Streamlined Healthcare Solutions",
  plansBody: "Navigate your health needs without complexity or high costs. Our virtual clinic simplifies your access to healthcare",
  plans: [
    {
      title: "Virtual Care – $0",
      body: "Covered by B.C.’s Medical Service Plan (MSP), allowing you to access medical care virtually at no cost.",
      icon: "video" as IconName,
    },
    {
      title: "Private Visit – $100",
      body: "For those without MSP coverage, we offer private consultations at a reasonable fee.",
      icon: "stethoscope" as IconName,
    },
    {
      title: "Doctor’s Notes – $50",
      body: "Need a note for work or school? We provide this service at a minimal cost, as it’s not covered under MSP.",
      icon: "file" as IconName,
    },
    {
      title: "Page forms – $75",
      body: "Our doctors can offer help with forms, subject to their professional discretion, at a rate of $75 per page",
      icon: "clipboard" as IconName,
    },
  ],
  cancelHeading: "Appointment Cancellation Guidelines",
  cancelBody:
    "To guarantee a seamless visit, our staff performs thorough preparations in advance. Please provide at least 12 hours’ notice for cancellations. Failing to do so, or missing your appointment, will result in a $50 charge.",
  mspHeading: "Understanding the Medical Services Plan",
  mspBody: [
    "“In British Columbia, public health insurance is known as the Medical Services Plan (MSP). It covers essential medical services for residents, including virtual and telehealth consultations with doctors.",
    "Once registered with MSP, you’ll receive a unique 10-digit Personal Health Number. Use this for easy registration for services like virtual care with us, streamlining your access to necessary healthcare.”",
  ],
  faqHeading: "Frequently Asked Question",
  // DRAFT answers — collapsed in the screenshots.
  faqs: [
    { q: "Is it free to use a virtual clinic?", a: "Yes, for eligible B.C. residents — virtual visits are covered by MSP. Private visits without MSP are $100." },
    { q: "Is there a charge for an online doctor’s note?", a: "Yes. Doctor’s notes are $50 because they are not covered under MSP." },
    {
      q: "How do I apply for British Columbia’s Medical Services Plan ?",
      a: "Apply through Health Insurance BC. New residents usually have a waiting period before coverage begins, so apply as soon as you arrive.",
    },
    {
      q: "What does MSP Cover?",
      a: "Medically necessary services from physicians — including virtual and telehealth consultations — plus many diagnostic services such as lab tests and imaging.",
    },
    {
      q: "What does MSP not Cover?",
      a: "Services that are not medically required, such as doctor’s notes, form completion and travel-related consultations. Most prescription drugs are covered separately through PharmaCare.",
    },
    {
      q: "Are my prescriptions covered?",
      a: "Prescription drugs are not covered by MSP. You may be eligible for help through BC PharmaCare or your private insurance.",
    },
    { q: "Are travel related visits covered under MSP?", a: "No. Travel consultations and travel vaccinations are not covered under MSP." },
  ] as QA[],
};

/* ---------------- FAQ ---------------- */

export const faqPage = {
  heroTitle: "Frequently Asked Questions",
  heroBody:
    "New to virtual care? Don’t worry, we’ve got you covered. This section provides answers to common questions, making your first virtual visit smooth and understandable.",
  general: [
    { q: "What is Virtual Clinic?", a: A.whatIs },
    { q: "How to see a doctor in BC online?", a: A.howToSee },
    { q: "Is telehealth free in BC?", a: A.isFree },
    { q: "How do virtual clinics work?", a: A.howWork },
    { q: "What can I do if I don’t have a doctor in BC?", a: A.noDoctor },
    { q: "What kind of Issues can be addressed on a virtual clinic?", a: A.issues },
    { q: "When should I consider using 123 Virtual Clinic?", a: A.whenUse },
    { q: "When should I not use 123 Virtual Clinic?", a: A.whenNot },
    { q: "How do I use 123 Virtual Clinic’s Platform?", a: A.howUse },
    { q: "What is Virtual Care, Telemedicine, and Telehealth?", a: A.whatTele },
    { q: "How do I access telehealth in BC?", a: A.access },
    { q: "Can you see a doctor online in BC?", a: A.canSee },
    { q: "How does telehealth work in BC?", a: A.howTeleBC },
    { q: "Can you get a prescription over the phone in BC?", a: A.rxPhone },
    { q: "What is the number for BC telehealth?", a: A.number },
  ] as QA[],
  rxHeading: "Prescriptions",
  rxBody:
    "Need guidance on prescriptions? This section offers detailed information on how and where we can assist you in managing your medication needs.",
  rx: [
    {
      q: "What kind of prescriptions can I get online?",
      a: "Routine prescriptions for non-severe conditions like acne or seasonal allergies can often be prescribed online. If you need refills for ongoing medications (e.g., birth control, thyroid medication), our online doctors can provide them, with the prescription sent to your local pharmacy. For chronic or severe conditions, a regular healthcare provider might be needed. Our doctors can also issue online doctor’s notes when necessary. However, they cannot prescribe controlled substances like narcotics, benzodiazepines, sedatives, or stimulants.",
    },
    {
      q: "Can I take my prescription to an in-person pharmacy?",
      a: "Yes, you can take an online prescription to any in-person pharmacy. Our doctors can fax your prescription directly to your chosen pharmacy. When booking, just specify your regular or preferred pharmacy.",
    },
    {
      q: "How do I find an online pharmacy?",
      a: "In Canada, verify the legitimacy of online pharmacies through the pharmacy regulatory authority in their province or territory. Always ensure the online pharmacy is licensed by checking on the provincial pharmacists regulatory authority’s website. Avoid filling prescriptions from unverified or suspicious online sources.",
    },
  ] as QA[],
  imagingHeading: "Imaging Requisitions",
  imagingBody:
    "Looking to understand more about imaging requisitions? Here, you’ll find answers to frequently asked questions, helping you navigate the process with ease.",
  imaging: [
    {
      q: "Where do I book medical imaging near me?",
      a: "To schedule a medical imaging appointment in British Columbia, you can contact facilities like West Coast Medical Imaging or Greig & Associates. Alternatively, you can take a requisition to a hospital’s imaging department. It’s advisable to call in advance for an appointment.",
    },
    {
      q: "What is an x-ray?",
      a: "An X-ray is a medical imaging technique that uses electromagnetic waves to produce images of internal body structures. It’s particularly effective for examining harder tissues like bones and is both quick and painless.",
    },
    {
      q: "How is an x-ray performed?",
      a: "At the imaging facility, you’ll register and provide your health insurance details. If uninsured, private payment may be required. You’ll remove certain clothing and accessories to avoid interference with the X-ray. The technologist will position you for the X-ray, which captures images using a small amount of radiation. A radiologist will then analyze these images and report the findings to your doctor.",
    },
    {
      q: "Do x-rays expose you to radiation?",
      a: "Yes, X-rays involve a minimal amount of ionizing radiation to create images. For instance, the radiation from a chest X-ray is about 0.1 mSv, equivalent to the natural radiation exposure over approximately 10 days.",
    },
  ] as QA[],
  notesHeading: "Doctor’s Notes",
  notesBody:
    "Curious about doctor’s notes? Discover how and when they’re necessary, and how our services can support you in obtaining one.",
  notes: [
    {
      q: "Why do I need an online doctor’s note or sick note?",
      a: "Doctor’s notes are often required by schools or employers to confirm illness-related absences. They can justify sick leave or ensure your absence is recorded correctly. Some workplaces may require a doctor’s note for sick leave as part of their medical leave policy.",
    },
    {
      q: "What are the requirements for an online doctor’s note?",
      a: "Typically, a doctor’s note is a signed document confirming your illness, doctor’s appointment, or treatment on a specific date. It respects your privacy by not disclosing the exact medical condition. If extended time off is needed, the doctor can specify this on the note.",
    },
    {
      q: "Is there a charge for an online doctor’s note?",
      a: "Doctor’s notes incur a fee as they are not covered under MSP. Check our pricing page for current rates.",
    },
    {
      q: "Why choose 123VC for a doctor’s note?",
      a: "123VC offers convenient access to healthcare, including doctor’s notes, without the wait. Our licensed physicians can address your health concerns and provide necessary documentation for rest and recovery. However, they do not issue prolonged absence notes or backdate them significantly.",
    },
  ] as QA[],
};
