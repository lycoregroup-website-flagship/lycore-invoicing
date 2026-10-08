/* LYCORE Sales Lab -- seed data (Phase 1).
   Everything here is either (a) a proposal the owner has not approved with a real client,
   (b) a hypothesis to test, or (c) a fictional simulation profile. Nothing here is a
   verified fact about real businesses, and no figure below comes from research.
   Seeds are merged into saved data by id, so user edits are never overwritten. */

const LAB_UNKNOWN = 'Not determined yet. Fill in from real quotes and costs.';

const LAB_SEED_OFFERS = [
  {
    id: 'offer-revenue-leak-fix',
    name: 'LYCORE Revenue Leak Fix',
    status: 'proposed',
    industry: 'Pest control (US)',
    delivery: 'GoHighLevel (GHL)',
    positioning: 'We find where your pest control business is losing track of inquiries or estimates, fix one verified gap, and show you that the follow-up is working.',
    terms: [
      'One managed workflow.',
      'One location.',
      'One defined operational problem.',
      'Limited 14-day proof pilot, only after access and required compliance approvals.',
      'No LYCORE service fee during the pilot.',
      'Third-party charges disclosed separately.',
      'Monthly management test price: $299.',
      'No automatic enrollment after the pilot.',
      'Additional products require separately agreed scope and fees.'
    ],
    termsNote: 'PROPOSED terms for testing. Not approved or promised to any real client.',
    modules: [
      {
        id: 'mod-a', key: 'A', name: 'Missed Inquiry Recovery',
        idealCustomer: 'Owner-operated or small-office pest control company where calls and web inquiries arrive while technicians are in the field, and nobody owns follow-up.',
        prerequisites: 'Access to their phone system and GHL sub-account; a named staff contact for callbacks; sender registration and consent wording approved before any text is sent.',
        integrations: 'GoHighLevel (conversations, workflows, pipelines). Existing field-service software only if it can be read without duplicating records.',
        deliverables: 'Missed-call text-back where technically and legally appropriate. Staff notification. Callback queue. Inbound inquiry qualification. Follow-up tracking. Human handoff. Booking attribution.',
        limitations: 'Does not replace a person answering the phone. Text-back depends on carrier registration being approved. Cannot guarantee any number of bookings.',
        estimatedCosts: LAB_UNKNOWN,
        complianceChecks: 'Verify before launch: consent for texting and where it is recorded; carrier (A2P) registration status; opt-out handling and suppression list; calling and texting hours; whether any call recording notice is needed. Confirm each with a qualified advisor, not from this note.',
        pricing: 'Covered by the single proposed monthly test price. Not priced separately.',
        riskReversal: 'No LYCORE fee during the 14-day pilot. No automatic enrollment after.',
        outcomes: 'Measured from the client\'s own records: inquiries received, inquiries answered or called back, time to first response, bookings attributed to follow-up. Targets are not set until a baseline exists.'
      },
      {
        id: 'mod-b', key: 'B', name: 'Estimate Follow-up',
        idealCustomer: 'Company that gives estimates or quotes and has no consistent follow-up, so outcomes are unknown.',
        prerequisites: 'A list of outstanding estimates in a usable form; permission to contact those customers; a rule for who handles a reply.',
        integrations: 'GoHighLevel pipelines and workflows. Estimate data from their field-service software or a spreadsheet export.',
        deliverables: 'Identify outstanding estimates. Timely follow-up where permitted. Track responses and outcomes. Notify staff when an estimate needs a person. Prevent duplicate or inappropriate contact. Record won, lost and unresolved.',
        limitations: 'Only as good as the estimate data supplied. Cannot contact people who opted out or have no consent. Does not change pricing or sales skill.',
        estimatedCosts: LAB_UNKNOWN,
        complianceChecks: 'Verify before launch: basis for contacting each estimate recipient; consent on the channel used; opt-out and suppression; duplicate-contact rules; message content accuracy.',
        pricing: 'Covered by the single proposed monthly test price. Not priced separately.',
        riskReversal: 'No LYCORE fee during the 14-day pilot. No automatic enrollment after.',
        outcomes: 'From the client\'s records: estimates outstanding at start, replies received, estimates marked won, lost or unresolved after the pilot.'
      },
      {
        id: 'mod-c', key: 'C', name: 'Managed Review Automation',
        idealCustomer: 'Company with completed jobs and few or stale public reviews, where review requests depend on technicians remembering.',
        prerequisites: 'A reliable signal that a job is complete; contact details with consent for the channel used; access to their Google Business Profile.',
        integrations: 'GoHighLevel workflows. Google Business Profile for monitoring public review activity.',
        deliverables: 'Review requests after eligible completed jobs. Appropriate consent and contact preferences. Honest invitation to every customer, with no sentiment filtering. Monitoring of request delivery and public review activity.',
        limitations: 'No fake reviews, no paid positive reviews, no review gating, no unsupported guarantees. Cannot promise a rating or a review count. Customers decide whether to respond.',
        estimatedCosts: LAB_UNKNOWN,
        complianceChecks: 'Verify before launch: the platform\'s current review policy (no selective solicitation of only happy customers, no incentives for positive reviews); FTC rules on reviews and testimonials; consent for the channel; opt-out handling. Every customer gets the same request.',
        pricing: 'Covered by the single proposed monthly test price. Not priced separately.',
        riskReversal: 'No LYCORE fee during the 14-day pilot. No automatic enrollment after.',
        outcomes: 'Requests sent, requests delivered, new public reviews received, response rate, and the star distribution as it actually falls.'
      },
      {
        id: 'mod-d', key: 'D', name: 'Neighborhood Growth',
        idealCustomer: 'Company with service vehicles and a defined service area that wants trackable local awareness.',
        prerequisites: 'Branded vehicles or approval to brand them; a service-area definition; a landing page host; budget for physical production.',
        integrations: 'GoHighLevel forms and funnels, QR code tracking, a landing page per neighborhood.',
        deliverables: 'Vehicle magnets and QR campaigns. Trackable landing pages. Neighborhood-specific service information. New inquiry forms. Customer referrals. QR scan and booking attribution.',
        limitations: 'Physical production and fulfillment are separate costs. Results depend on routes driven and local awareness. Not a replacement for follow-up.',
        estimatedCosts: LAB_UNKNOWN + ' Physical production and fulfillment are separate line items.',
        complianceChecks: 'Verify before launch: local rules on vehicle signage if any; accuracy of service claims on landing pages; consent on any form that collects contact details; referral program rules.',
        pricing: 'Not priced. Requires separately agreed scope and fees.',
        riskReversal: 'None proposed. Not part of the 14-day pilot.',
        outcomes: 'QR scans, form submissions and bookings attributed to each neighborhood page.'
      },
      {
        id: 'mod-e', key: 'E', name: 'Retention and Renewals',
        idealCustomer: 'Company with recurring-treatment customers and no consistent renewal reminders.',
        prerequisites: 'A customer list with service dates and plan terms; consent for reminders; a staff owner for replies.',
        integrations: 'GoHighLevel workflows. Customer data from their field-service software or export.',
        deliverables: 'Appropriate recurring-treatment reminders. Customer renewal follow-up. Staff alerts. Booking and retention reporting.',
        limitations: 'Depends on accurate customer and plan data. Cannot contact customers who opted out. Does not fix service quality.',
        estimatedCosts: LAB_UNKNOWN,
        complianceChecks: 'Verify before launch: consent on the channel; opt-out and suppression; accuracy of plan dates in every message; contact-frequency limits.',
        pricing: 'Not priced. Requires separately agreed scope and fees.',
        riskReversal: 'None proposed. Not part of the 14-day pilot.',
        outcomes: 'Renewals due, reminders delivered, renewals booked, and retention over time from the client\'s records.'
      }
    ],
    versions: []
  },
  {
    id: 'offer-reputation-websites-live',
    name: 'Reputation and websites (current live cold calls)',
    status: 'testing',
    industry: 'Small local service businesses',
    delivery: 'GoHighLevel (GHL), planned',
    positioning: 'Make sure the business\'s public listings and reviews show what their customers actually think, so people who look them up find a trustworthy page.',
    terms: [
      'Price: not finalized.',
      'The review automation is planned on GoHighLevel and not yet built.',
      'No guarantees about ratings or review counts.'
    ],
    termsNote: 'This is what is being sold on real calls today. Real call outcomes for it are the evidence the Lab should rank against.',
    modules: [
      {
        id: 'mod-rep', key: 'R', name: 'Review requests and listing cleanup',
        idealCustomer: 'Local service business with few or stale reviews compared with nearby competitors, or buying leads from lead platforms.',
        prerequisites: 'Access to their Google Business Profile; a way to know when a job is done; contact consent.',
        integrations: 'GoHighLevel (planned), Google Business Profile.',
        deliverables: 'Ask every customer for a review after a job. Monitor public reviews. Fix inconsistent listings.',
        limitations: 'No review gating, no fake or paid reviews, no promised ratings.',
        estimatedCosts: LAB_UNKNOWN,
        complianceChecks: 'Same as Managed Review Automation: platform review policy, FTC rules, consent, opt-out.',
        pricing: 'Not finalized.',
        riskReversal: 'None defined yet.',
        outcomes: 'From call logs and real pilots only.'
      },
      {
        id: 'mod-web', key: 'W', name: 'Mobile-first website',
        idealCustomer: 'Business with no site, or a site that is hard to use on a phone.',
        prerequisites: 'Business details, photos, service area, a way to receive inquiries.',
        integrations: 'Site host and form handling.',
        deliverables: 'A site that works on a phone with tap-to-call, hours, services and reviews shown.',
        limitations: 'Does not guarantee search ranking or inquiries.',
        estimatedCosts: LAB_UNKNOWN,
        complianceChecks: 'Accuracy of every business claim on the page; consent on any contact form.',
        pricing: 'Not finalized.',
        riskReversal: 'None defined yet.',
        outcomes: 'From the client\'s own inquiry counts after launch.'
      }
    ],
    versions: []
  }
];

const LAB_SEED_PAINS = (function () {
  const P = (o) => Object.assign({
    industry: 'Pest control (US)', segment: 'Owner-operated and small-office companies',
    evidenceLevel: 'Untested sales assumption', severity: 3, willingnessToPay: 'Unknown. Test with real prospects.',
    proofRequired: 'A baseline from the prospect\'s own records before and after.', analogy: '',
    objections: [], confirms: [], disproves: [], existingSoftware: '', offer: '', closing: '', favorite: false
  }, o);
  return [
    P({
      id: 'pain-missed-inquiries', name: 'Inquiries arrive when nobody can answer',
      symptom: 'Calls and web forms come in while technicians are on jobs; callbacks happen late or not at all.',
      rootCause: 'No one owns first response, and nothing alerts staff or follows up automatically.',
      consequence: 'Some people who asked for service book with whoever answers first.',
      financialEffect: '(inquiries missed) x (share that would have booked) x (value of a first service). Every input must come from the prospect. Do not state a number first.',
      discovery: ['When a call comes in while your techs are out, what happens to it?', 'How do web form inquiries reach you?'],
      consequenceQ: ['What happens to someone who calls and gets voicemail?', 'How would you know if they called the next company?'],
      statusQuo: ['What do you do today to catch those?', 'How long does a callback usually take?'],
      confirms: ['They admit callbacks are slow or skipped.', 'They cannot say how many calls go unanswered.'],
      disproves: ['Someone always answers within minutes.', 'They track every missed call and return it the same day.'],
      offer: 'Missed Inquiry Recovery (module A).',
      existingSoftware: 'Many field-service and phone systems have missed-call features. Check what they already have before pitching.',
      analogy: 'Missed customer inquiries: a shop with a door that is sometimes locked during business hours. Use only after they admit calls go unanswered.',
      objections: ['We already have software.', 'Our receptionist answers everything.'],
      closing: 'Offer to look at one week of their call log together, then agree on one gap to fix.'
    }),
    P({
      id: 'pain-estimates-silent', name: 'Estimates go out and nothing follows',
      symptom: 'Quotes are sent and the customer goes quiet. Nobody knows which are won, lost or still open.',
      rootCause: 'Follow-up depends on someone remembering, and there is no list of outstanding estimates.',
      consequence: 'Outcomes are unknown, so the owner cannot tell if estimates are priced well or just not followed up.',
      financialEffect: '(outstanding estimates) x (share that could still convert) x (average job value). Prospect supplies every input.',
      discovery: ['After you send an estimate, what happens next?', 'How many are open right now?'],
      consequenceQ: ['What happens to the ones that never reply?', 'How do you know which ones you lost to someone else?'],
      statusQuo: ['Who follows up today, and how?'],
      confirms: ['They cannot say how many estimates are open.', 'Follow-up happens only when someone remembers.'],
      disproves: ['They track every estimate and follow up on a schedule.'],
      offer: 'Estimate Follow-up (module B).',
      existingSoftware: 'Jobber and similar tools include quote follow-up. Ask whether it is switched on and used.',
      analogy: 'Quotes that never receive follow-up: planting seeds and never going back to water them. Use only after they admit quotes go quiet.',
      objections: ['Our software already follows up.', 'We\'ve been burned by agencies.'],
      closing: 'Offer to review their open estimates together and pick one workflow to fix.'
    }),
    P({
      id: 'pain-reviews-ad-hoc', name: 'Review requests depend on technicians remembering',
      symptom: 'Few or stale public reviews compared with nearby competitors.',
      rootCause: 'Asking for a review is manual and inconsistent.',
      consequence: 'People who look the company up see a thin page. A single bad review carries more weight when there are few reviews.',
      financialEffect: 'Hard to estimate honestly. Do not claim a booking impact. Measure reviews received and inquiries before and after.',
      discovery: ['How do customers usually end up leaving a review?', 'Who asks them, and when?'],
      consequenceQ: ['What do you think someone sees when they look you up before calling?'],
      statusQuo: ['What have you tried to get more reviews?'],
      confirms: ['They say technicians ask only sometimes.', 'Reviews are old or rare.'],
      disproves: ['They already receive steady recent reviews through a working process.'],
      offer: 'Managed Review Automation (module C). Every customer gets the same request. No filtering.',
      existingSoftware: 'Many CRMs include review requests. Ask if it is in use.',
      analogy: 'Customers who never receive review requests: a restaurant that never hands anyone the comment card.',
      objections: ['We already have great reviews.', 'Nobody cares about reviews.', 'Our technicians already ask.'],
      closing: 'Offer a side-by-side of their public reviews against two nearby companies, then agree whether it matters to them.'
    }),
    P({
      id: 'pain-renewals-lapse', name: 'Recurring customers lapse without a reminder',
      symptom: 'Customers on recurring treatment plans stop without anyone noticing.',
      rootCause: 'No consistent renewal or reminder process.',
      consequence: 'Recurring revenue erodes quietly.',
      financialEffect: '(lapsed recurring customers) x (annual plan value). Prospect supplies both.',
      discovery: ['How do you remind recurring customers a visit is due?', 'How many lapse in a typical year?'],
      consequenceQ: ['What happens when someone just stops booking?'],
      statusQuo: ['Who tracks renewals today?'],
      confirms: ['They cannot say how many customers lapsed.'],
      disproves: ['Renewal reminders are automated and working.'],
      offer: 'Retention and Renewals (module E).',
      analogy: 'Follow-up that depends on staff remembering: a calendar nobody looks at.',
      objections: ['We get enough referrals.', 'We\'re fully booked.'],
      closing: 'Offer to count lapsed customers from their own list together.'
    }),
    P({
      id: 'pain-attribution', name: 'Marketing spend without knowing what produces bookings',
      symptom: 'They pay for leads or ads and cannot say which source books.',
      rootCause: 'Sources are not tracked to a booked job.',
      consequence: 'Money may be going to sources that do not convert, and the owner cannot tell.',
      financialEffect: '(monthly marketing spend) compared with (bookings traceable to each source). Prospect supplies both.',
      discovery: ['Where do most of your new customers come from?', 'What do you spend on getting them?'],
      consequenceQ: ['How do you know which source is worth it?'],
      statusQuo: ['What tracking do you do today?'],
      confirms: ['They complain about lead costs and cannot trace results.'],
      disproves: ['They track cost per booked job by source.'],
      offer: 'Neighborhood Growth (module D) or booking attribution in module A.',
      analogy: 'Marketing spend with poor conversion tracking: filling a tank without a fuel gauge.',
      objections: ['We\'ve already spent enough on marketing.', 'It\'s too expensive.'],
      closing: 'Offer to trace the last month of bookings back to a source together.'
    }),
    P({
      id: 'pain-office-overwhelmed', name: 'Office staff cannot keep up with follow-up',
      symptom: 'Scheduling, calls and billing crowd out follow-up tasks.',
      rootCause: 'Follow-up is manual and competes with urgent work.',
      consequence: 'Follow-up is the first thing to slip when the office is busy.',
      financialEffect: 'Staff time spent plus follow-up not done. Prospect supplies hours and task counts.',
      discovery: ['What takes up most of your office\'s day?', 'What gets dropped when it\'s busy?'],
      consequenceQ: ['What does it cost when that falls through?'],
      statusQuo: ['Has anything been tried to lighten that load?'],
      confirms: ['They name specific tasks that routinely slip.'],
      disproves: ['The office is staffed with spare capacity.'],
      offer: 'Modules A and B, scoped to one workflow.',
      analogy: 'Poor response times: a one-person counter during the lunch rush.',
      objections: ['Our receptionist answers everything.', 'I don\'t trust AI.'],
      closing: 'Offer to map one repeated task and agree what to automate first.'
    })
  ];
})();

const LAB_PERSONAS_FIELDS = ['companySize', 'serviceLines', 'jobVolume', 'existingSoftware', 'decisionAuthority', 'genuineProblems', 'problemsSolved', 'recentEvents', 'previousVendors', 'timeAvailability', 'budgetSensitivity', 'trustLevel', 'responsePreference', 'willingnessToBuy', 'likelyObjections', 'evidenceThatChangesView', 'hasLegitimateOpportunity'];

const LAB_SEED_PERSONAS = (function () {
  const H = (o) => Object.assign({
    companySize: '3 techs, 1 office person', serviceLines: ['General pest', 'Termite inspections'], jobVolume: 'About 50 jobs a week',
    existingSoftware: 'None beyond a spreadsheet', decisionAuthority: 'Owner decides alone', genuineProblems: [], problemsSolved: [],
    recentEvents: 'Nothing notable', previousVendors: 'None', timeAvailability: 'Short', budgetSensitivity: 3, trustLevel: 3,
    responsePreference: 'Phone', willingnessToBuy: 30, likelyObjections: [], evidenceThatChangesView: '', hasLegitimateOpportunity: true
  }, o);
  const A = (id, name, role, mood, hidden) => ({ id, name, role, mood, synthetic: true, hidden: H(hidden || {}) });
  return [
    A('p-cautious', 'Friendly but cautious owner', 'Owner', 'Polite, wants to be sure before agreeing to anything.', { genuineProblems: ['Estimates are not followed up consistently'], likelyObjections: ['I need to think about it.', 'What if it doesn\'t work?'], evidenceThatChangesView: 'A specific example drawn from their own quotes.', trustLevel: 3, willingnessToBuy: 45 }),
    A('p-busy-field', 'Busy field-service owner', 'Owner', 'Answering from a truck. Few words.', { timeAvailability: 'Under two minutes', genuineProblems: ['Misses calls while on jobs'], likelyObjections: ['Call me later.', 'Send me an email.'], evidenceThatChangesView: 'One concrete cost of a missed call, stated by them.', willingnessToBuy: 35, responsePreference: 'Text or email' }),
    A('p-booked-referrals', 'Fully booked, referral-driven owner', 'Owner', 'Calm. Genuinely does not need more.', { jobVolume: 'Booked weeks ahead', problemsSolved: ['Demand', 'Follow-up on referrals'], genuineProblems: [], likelyObjections: ['We\'re fully booked.', 'We get enough referrals.'], evidenceThatChangesView: 'Nothing realistic. May still agree to an unrelated courtesy.', willingnessToBuy: 5, hasLegitimateOpportunity: false }),
    A('p-new-operator', 'New operator with little revenue', 'Owner', 'Enthusiastic and short of cash.', { companySize: '1 tech, owner answers phones', jobVolume: 'About 8 jobs a week', budgetSensitivity: 5, genuineProblems: ['Cannot afford to miss any inquiry'], likelyObjections: ['It\'s too expensive.', 'Why should I trust a new company?'], evidenceThatChangesView: 'A low-risk pilot with no upfront fee.', willingnessToBuy: 25, hasLegitimateOpportunity: false }),
    A('p-strong-reviews', 'Established operator with a strong review profile', 'Owner', 'Proud of the reputation. A little defensive.', { problemsSolved: ['Reviews', 'Reputation'], genuineProblems: ['Estimate follow-up is informal'], likelyObjections: ['We already have great reviews.', 'Nobody cares about reviews.'], evidenceThatChangesView: 'Moving off reviews to a different, real gap in follow-up.', willingnessToBuy: 20 }),
    A('p-marketing-fatigue', 'Owner who receives constant marketing calls', 'Owner', 'Guarded and a little tired of it.', { trustLevel: 2, likelyObjections: ['You\'re just another AI company.', 'What makes you different?'], evidenceThatChangesView: 'The caller is specific and plainly not reading a script.', willingnessToBuy: 20 }),
    A('p-burned', 'Owner burned by a previous agency', 'Owner', 'Wary. Will bring up the past.', { previousVendors: 'Paid an agency for months and could not see results', trustLevel: 1, budgetSensitivity: 4, genuineProblems: ['Cannot tell what marketing produced'], likelyObjections: ['We\'ve been burned by agencies.', 'What if it doesn\'t work?'], evidenceThatChangesView: 'No long contract and numbers they can check themselves.', willingnessToBuy: 25 }),
    A('p-ghl-user', 'Owner who already uses GHL', 'Owner', 'Confident. May know more than the caller.', { existingSoftware: 'GoHighLevel with a few workflows', problemsSolved: ['Basic missed-call text-back'], genuineProblems: ['Workflows are half-built and unmonitored'], likelyObjections: ['We already have software.', 'Our software already follows up.'], evidenceThatChangesView: 'An honest audit of what is switched on and unused.', willingnessToBuy: 30 }),
    A('p-jobber', 'Owner who uses Jobber or field-service software', 'Owner', 'Practical. Likes their current tool.', { existingSoftware: 'Jobber', problemsSolved: ['Scheduling', 'Invoicing'], genuineProblems: ['Quote follow-up is not switched on'], likelyObjections: ['We already have software.'], evidenceThatChangesView: 'Showing a gap the existing tool could cover, even if that means not buying from LYCORE.', willingnessToBuy: 25 }),
    A('p-technical', 'Technically sophisticated owner', 'Owner', 'Asks detailed questions on how it works.', { existingSoftware: 'Several tools connected through Zapier', trustLevel: 3, likelyObjections: ['What happens if you disappear?', 'How does it integrate?'], evidenceThatChangesView: 'Clear, honest technical answers and an admission of limits.', willingnessToBuy: 30 }),
    A('p-indifferent', 'Indifferent owner who sees no value', 'Owner', 'Flat. Answers in a word or two.', { genuineProblems: [], problemsSolved: [], likelyObjections: ['Not interested.', 'We\'re fine.'], evidenceThatChangesView: 'Nothing available on this call.', willingnessToBuy: 2, hasLegitimateOpportunity: false }),
    A('p-messaging-worry', 'Owner concerned about customer messaging', 'Owner', 'Protective of customers.', { likelyObjections: ['I don\'t want to annoy my customers.', 'I don\'t trust AI.'], genuineProblems: ['Reviews and follow-up are inconsistent'], evidenceThatChangesView: 'Seeing the exact wording, the consent rules and the opt-out.', trustLevel: 2, willingnessToBuy: 30 }),
    A('p-high-ad-costs', 'Owner experiencing high advertising costs', 'Owner', 'Frustrated about lead costs.', { genuineProblems: ['Pays high prices for leads from lead platforms'], likelyObjections: ['We\'ve already spent enough on marketing.', 'It\'s too expensive.'], evidenceThatChangesView: 'A way to measure what leads convert before spending more.', budgetSensitivity: 4, willingnessToBuy: 40 }),
    A('p-lost-estimates', 'Owner losing outstanding estimates', 'Owner', 'Knows quotes slip away. Open to talking.', { genuineProblems: ['Estimates go quiet and are never revisited'], likelyObjections: ['Someone else does it cheaper.', 'I need to talk to my partner.'], decisionAuthority: 'Owner with a business partner', evidenceThatChangesView: 'Counting their open estimates together.', willingnessToBuy: 55 }),
    A('p-overwhelmed-office', 'Owner with overwhelmed office staff', 'Owner', 'Stretched thin and short on patience.', { companySize: '6 techs, 2 office staff', genuineProblems: ['Follow-up always slips'], likelyObjections: ['I don\'t have time for another thing.', 'Call me later.'], evidenceThatChangesView: 'Proof it takes almost no time from staff.', willingnessToBuy: 45 }),
    A('p-multilocation', 'Multi-location operations manager', 'Operations manager', 'Process-minded. Not the final buyer.', { companySize: '4 locations, 25 techs', decisionAuthority: 'Recommends. Regional owner approves.', existingSoftware: 'Field-service software plus a call center', genuineProblems: ['Inconsistent follow-up between locations'], likelyObjections: ['I need to run this by corporate.', 'Does it scale?'], evidenceThatChangesView: 'A one-location pilot with clear measures.', willingnessToBuy: 35 }),
    A('p-gatekeeper', 'Gatekeeper or dispatcher', 'Dispatcher', 'Protective of the owner\'s time.', { decisionAuthority: 'Cannot decide. Can pass a message.', likelyObjections: ['What is this about?', 'He\'s not available.', 'We don\'t take sales calls.'], evidenceThatChangesView: 'A short, specific, honest reason and an easy message to pass on.', willingnessToBuy: 0, responsePreference: 'Message to owner' }),
    A('p-people-pleaser', 'People-pleaser who agrees without intending to act', 'Owner', 'Warm and agreeable. Commits to nothing.', { likelyObjections: ['Sure, sounds good.', 'Send me something.'], evidenceThatChangesView: 'A specific, dated next step they state themselves. Vague yes means no.', willingnessToBuy: 8 }),
    A('p-email-me', 'Prospect who repeatedly says "Email me"', 'Owner', 'Will not engage by voice. Polite and firm.', { responsePreference: 'Email only', likelyObjections: ['Email me.', 'Just send it over.'], evidenceThatChangesView: 'Nothing on the phone. One concise clarification is fair, then confirm the address and end well.', willingnessToBuy: 10 }),
    A('p-quote-silent', 'Prospect who received a quote and went silent', 'Owner', 'Embarrassed or unsure. Avoids the topic.', { recentEvents: 'Received a quote from LYCORE two weeks ago and did not reply', likelyObjections: ['I haven\'t had a chance.', 'I need to think about it.'], evidenceThatChangesView: 'A low-pressure question about what is unclear in the quote.', willingnessToBuy: 35 }),
    A('p-hostile', 'Hostile prospect who challenges the caller\'s credibility', 'Owner', 'Aggressive and testing.', { trustLevel: 1, likelyObjections: ['Who are you?', 'How much commission are you earning?', 'You\'re just another AI company.'], evidenceThatChangesView: 'Calm, honest answers without defensiveness. Even then the likely outcome is a firm no.', willingnessToBuy: 3, hasLegitimateOpportunity: false })
  ];
})();
