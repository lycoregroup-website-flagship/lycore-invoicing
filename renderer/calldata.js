/* Call console defaults, generated from the console's data folder. */
const DEFAULT_SCRIPTS = [
  { id: "00-balin-original", body: "---\nname: Balin original (colour-coded)\nnoun: business\nsearch: {{category}} {{city}}\n---\n\n## OPENER\n\n> Hey {{first_name}}, how's it going?\n\n~ Do not ask if it is them or the owner. If lead is male name = male answers or female name = female answers, assume it is. You will be transferred over better if it isn't anyway.\n\n~ Pause, let them answer.\n\n? If not business owner\n\n> Hey! can I talk to {{first_name}}\n\n~ If you sound like a sales person they will gate keep. Sound like you're the owner's best friend looking for them.\n\n> Hey, quick question. I see you guys have {{reviews}} reviews, are you guys new in the area?\n\n~ Let them answer, do NOT react.\n\n> Got it. So listen, I've been testing something to help businesses like yours consistently get more reviews, and I wanted to run it by you real quick. Do you have 30 seconds?\n\n? OR\n\n> I've got a program I'm testing that helps businesses like yours generate reviews more consistently, and I wanted to run it by you real quick. Do you have 30 seconds?\n\n? If they say no\n\n> I get it, look, if in 30 seconds you don't like what I have to say, you can hang up on me. Sound fair?\n\n~ Then continue immediately.\n\n## SECTION 2 - PROBLEM MATH (REVIEWS ONLY)\n\n~ Immediately after they say yes to 30 seconds.\n\n~ Do not explain why you're asking. Just ask.\n\n> How long have you guys been in business?\n\n+ years | Years in business\n\n~ Let them answer.\n\n> About how many jobs are you doing in a typical month?\n\n+ jobs_month | Jobs per month\n\n~ Let them answer.\n\n> Okay, so roughly {{years}} years and {{jobs_month}} jobs a month... you've helped around {{customers}} customers.\n\n~ Short pause.\n\n> And you've got about {{reviews}} reviews.\n\n! Pause. Say nothing.\n\n~ This is the first hit. Let the silence work.\n\n## SECTION 3 - BUSINESS REALITY\n\n~ Zoom out, still no pitch, this is ammunition. Continue casually, same tone.\n\n> How many trucks or crews do you have running right now?\n\n+ crews | Trucks / crews\n\n~ Let them answer.\n\n> What's an average job worth for you?\n\n+ avg_job | Average job value\n\n~ Do not react. Do not comment. Just note it.\n\n## SECTION 4 - HISTORY\n\n~ Still calm, still curious.\n\n> What have you tried in the past to get more reviews?\n\n+ tried | What they tried\n\n> What worked?\n\n> What didn't?\n\n~ When they answer, you do not correct them. You're collecting words for later.\n\n## SECTION 5 - PIVOT\n\n~ Current state = status question. Same vibe, casual slide-in, no reset.\n\n> By the way, do you know where you're ranked on Google right now?\n\n? If yes\n\n> Where are you sitting?\n\n? If no\n\n> Let's look it up real quick.\n\n~ Immediately go into it, no commentary.\n\n+ rank | Where they rank\n\n## SECTION 6 - IMPACT QUESTIONS\n\n~ Right after status.\n\n> Do you know why you're on page {{rank}}, has anyone ever ACTUALLY explained to you how it works?\n\n~ Let them answer, again, no teaching yet.\n\n## SECTION 7 - BRIDGE INTO \"WHAT IT TAKES\"\n\n? If they say yes\n\n> Yeah, that's part of it. But what google is actually looking for is...\n\n? If they say no\n\n> That makes sense, most people haven't had it explained. What actually matters is this...\n\n## SECTION 8 - WHAT IT TAKES\n\n~ Requirements.\n\n> To show up consistently, a few things have to be happening at the same time:\n\n> The Google Business profile has to be fully built out and optimized, descriptions, services, categories, all of it.\n\n> There needs to be regular activity on the listing itself, not just once in a while.\n\n> That includes consistent Google posts written around the services people are actually searching for.\n\n> Reviews need to keep coming in, and they need to be responded to properly so Google sees ongoing engagement.\n\n> Photos matter. Google looks at image activity and freshness, not just how many are uploaded.\n\n> Those images also need to be geo-tagged correctly so Google can tie them back to the business's actual areas you service.\n\n> And all of this has to be happening continuously, not as a one-time setup.\n\n> That's what google looks for.\n\n## SECTION 9 - WALK-THROUGH\n\n~ Designed to trigger \"how?\". This is framed as simple, obvious, doable.\n\n> All you really have to do is make sure:\n\n> Your Google Business description is accurate and matches the services you actually do.\n\n> You're getting reviews consistently.\n\n> You're replying to those reviews.\n\n> You're making Google posts, kind of like you would on Facebook.\n\n> You've got FAQs on your site that line up with what people search for locally.\n\n> And most importantly, you're geo-tagging your images.\n\n! Stop talking.\n\n? If they ask \"How do you geo-tag images?\" or \"What does that mean?\"\n\n~ Immediately move to the close.\n\n? If they don't ask\n\n> Do you know how to do that?\n\n~ If no, move to the close. If yes, move to the close anyway.\n\n## CLOSE - ONE CONTINUOUS RUN\n\n! Do not pause.\n\n~ Trigger line, when they ask \"how\".\n\n> That's actually what we built.\n\n~ Answer the 'How?', clean, factual. No word changes.\n\n> So what this does is it handles all of that for you automatically. It fully optimizes your Google Business profile, descriptions, services, categories, everything Google looks at. It creates and posts Google updates consistently, written around the services people are actually searching for. It helps manage reviews and responses so Google sees constant engagement. It keeps fresh photos going up and geo-tags those images properly so Google can tie them back to your location. And it keeps all of that running week after week without you having to remember to do it.\n\n! DO NOT STOP TALKING.\n\n## VALUE STACK\n\n~ One run, no breaks. Read exactly as set in Settings, never quote a number from memory.\n\n> {{offer_line}}\n\n~ The discount is spoken only, on this call. Never in writing.\n\n> {{discount_line}}\n\n## ASSUMPTIVE CARD ASK\n\n~ Then shut up.\n\n> So will that be Visa or Mastercard?\n\n! STOP. No explaining. No filling silence. No saving them.\n\n~ If they hesitate: handle one objection using the ammo you gained from the questions up front, then immediately return to the ask. Broken record. Every time.\n\n> So will that be Visa or Mastercard?\n\n## AUDIT - FINAL SAFETY NET\n\n> Alright, totally fair. Let's do this instead. We have an audit tool that breaks down exactly what's missing on your Google listing and why you're sitting where you are. I'll send it over for free right now so you can actually see the issues and have more information on where to start. I'll send you the link now, go ahead and run it while we're on the phone.\n\n+ email | Their email\n\n+ mobile | Their mobile\n\n~ Once they're looking at it.\n\n> See how it's flagging those things? That's exactly what we were talking about earlier, the profile optimization, the activity, the images, the geo-tagging. That's why you're stuck on page {{rank}}. So now that you can actually see it, does it make more sense to fix it properly or keep guessing?\n" },
  { id: "01-water-restoration", body: "---\nname: Water Damage Restoration\nnoun: water damage restoration company\nsearch: water damage restoration {{city}}\npanic: a flooded basement at one in the morning\nvolume_q: About how many water jobs are you running in a typical month?\nvalue_q: What's an average water job worth to you?\n---\n\n## 1 · GATEKEEPER\nbadge: only if someone else picks up\n\n~ You are not selling. You are the owner's friend who needs two minutes. Warm, slightly bored, in a hurry.\n\n! Do not dial this lead until {{competitor}} and their review count are filled in. Without a name this call is generic and you lose them in ten seconds.\n\n> Hey, is {{first_name}} around?\n\n? If they ask who's calling\n\n> It's Brenda. It's about {{business}} sitting at {{reviews}} reviews on Google while {{competitor}} is at {{competitor_reviews}}, in {{city}}. Two minutes, and it's his listing so it's his call, not mine.\n\n? If they push for details\n\n> I'd rather not mangle it secondhand. If he's mid-job I can hold, or give me a window and I'll call back then.\n\n> If it's easier, tell him Brenda called about {{competitor}} outranking him on Google Maps. If he says don't bother, that's it, I won't call again.\n\n= Gatekeepers block pitches, not messages. A named competitor and two real numbers is a message. Blocking it now becomes their decision instead of their job.\n\n## 2 · OPENER\nbadge: owner on the line\n\n~ Do not ask if it's them. Assume it is. If it isn't, you'll get transferred faster anyway.\n\n> Hey {{first_name}}, how's it going?\n\n~ Pause. Let them answer. Do not talk over the answer.\n\n> Hey, quick question. I see you guys have {{reviews}} reviews. Are you new in the area?\n\n~ Let them answer. Do NOT react. No \"oh wow\", no \"that's great\". Nothing.\n\n> Got it. So listen, I've been testing something to help water damage restoration companies consistently get more reviews, and I wanted to run it by you real quick. Do you have thirty seconds?\n\n? If they say no\n\n> I get it. Look, if in thirty seconds you don't like what I have to say, you can hang up on me. Sound fair?\n\n~ Then continue immediately. Do not wait for a second yes.\n\n## 3 · PROBLEM MATH\nbadge: reviews only\n\n~ Do not explain why you're asking. Just ask.\n\n> How long have you guys been in business?\n\n+ years | Years in business\n\n> About how many water jobs are you doing in a typical month?\n\n+ jobs_month | Jobs per month\n\n> Okay, so roughly {{years}} years and {{jobs_month}} jobs a month. You've helped around {{customers}} customers.\n\n~ Short pause.\n\n> And you've got about {{reviews}} reviews. {{competitor}} has {{competitor_reviews}}.\n\n! STOP TALKING. This is the first hit. Let the silence work.\n\n= Balin's version stops at their own number. Naming {{competitor}} and their count in the same breath is the only change, and it is what turns a statistic into a comparison they cannot argue with.\n\n## 4 · BUSINESS REALITY\nbadge: zoom out, still no pitch, this is ammunition\n\n> How many trucks or crews do you have running right now?\n\n+ crews | Trucks / crews\n\n> What's an average job worth for you?\n\n+ avg_job | Average job value\n\n~ Do not react. Do not comment. Just note it. You will use this number against them at the close.\n\n## 5 · HISTORY\nbadge: still calm, still curious\n\n> What have you tried in the past to get more reviews?\n\n+ tried | What they tried\n\n> What worked?\n\n> What didn't?\n\n~ When they answer, you do not correct them. You are collecting words for later.\n\n= Whatever they say here is your objection handling. \"We ask but people forget\" comes back at the close as their own diagnosis, in their own voice.\n\n## 6 · PIVOT\nbadge: same vibe, casual slide-in, no reset\n\n> By the way, do you know where you're ranked on Google right now?\n\n? If yes\n\n> Where are you sitting?\n\n? If no\n\n> Let's look it up real quick.\n\n~ Immediately go into it, no commentary. Search: {{search}}\n\n+ rank | Where they rank\n\n## 7 · IMPACT QUESTIONS\nbadge: right after status\n\n> Do you know why you're on page {{rank}}, has anyone ever actually explained to you how it works?\n\n~ Let them answer. No teaching yet.\n\n? If they say yes\n\n> Yeah, that's part of it. But what Google is actually looking for is...\n\n? If they say no\n\n> That makes sense, most people haven't had it explained. What actually matters is this...\n\n## 8 · WHAT IT TAKES\nbadge: requirements\n\n~ Deliver this calmly, like you're describing how an engine works. Facts, not a pitch.\n\n> To show up consistently, a few things have to be happening at the same time.\n\n> The Google Business profile has to be fully built out and optimized. Descriptions, services, categories, all of it.\n\n> There needs to be regular activity on the listing itself, not just once in a while. That includes consistent Google posts written around the services people are actually searching for.\n\n> Reviews need to keep coming in, and they need to be responded to properly so Google sees ongoing engagement.\n\n> Photos matter. Google looks at image activity and freshness, not just how many are uploaded.\n\n> Those images also need to be geo-tagged correctly so Google can tie them back to the actual areas you service.\n\n> And all of this has to be happening continuously, not as a one-time setup.\n\n> That's what Google looks for.\n\n## 9 · THE SEARCH SHIFT\nbadge: one line, then move on\n\n> And it's not only Google anymore. When somebody asks ChatGPT or Gemini for a water damage restoration company in {{city}}, those answers get built from the same profile and the same reviews. {{competitor}} is already in shape for it. That's not something you catch up on in a week.\n\n~ Say it once and keep moving. Do not let it become the topic. It is a reason to start now, not a second product.\n\n## 10 · WALK-THROUGH\nbadge: designed to trigger \"how?\"\n\n~ Framed as simple, obvious, doable. You want them thinking \"that's it?\"\n\n> All you really have to do is make sure your Google Business description is accurate and matches the services you actually do.\n\n> You're getting reviews consistently.\n\n> You're replying to those reviews.\n\n> You're making Google posts, kind of like you would on Facebook.\n\n> You've got FAQs on your site that line up with what people search for locally.\n\n> And most importantly, you're geo-tagging your images.\n\n! STOP TALKING.\n\n? If they ask \"how do you geo-tag images\" or \"what does that mean\"\n\n~ Immediately move to the close.\n\n? If they don't ask\n\n> Do you know how to do that?\n\n~ If no, move to the close. If yes, move to the close anyway.\n\n## 11 · CLOSE\nbadge: one continuous run, do not pause\n\n> That's actually what we built.\n\n> So what this does is it handles all of that for you automatically. It fully optimizes your Google Business profile, descriptions, services, categories, everything Google looks at. It creates and posts Google updates consistently, written around the services people are actually searching for. It helps manage reviews and responses so Google sees constant engagement. It keeps fresh photos going up and geo-tags those images properly so Google can tie them back to the areas you service. And it keeps all of that running week after week without you having to remember to do it.\n\n! DO NOT STOP TALKING. Roll straight into the offer.\n\n## 12 · VALUE STACK\nbadge: one run, no breaks\n\n~ Read the offer exactly as configured in Settings. Never quote a number from memory.\n\n> {{offer_line}}\n\n~ The discount is spoken only, on this call, right now. It never goes in an email, a text, a landing page, or anything they can screenshot.\n\n> {{discount_line}}\n\n## 13 · ASSUMPTIVE CARD ASK\nbadge: then shut up\n\n> So will that be Visa or Mastercard?\n\n! STOP. No explaining. No filling silence. No saving them.\n\n~ If they hesitate: handle one objection using the ammo from step 5, then immediately return to the ask. Broken record. Every time.\n\n> So will that be Visa or Mastercard?\n\n## 14 · FREE AUDIT\nbadge: final safety net\n\n~ Only once the card ask has genuinely stalled. Your tone changes here. You stop selling completely.\n\n> Alright, totally fair. Let me do something for you anyway.\n\n> You gave me a few minutes when you didn't have to, and most people don't. So I'm taking that as you actually caring about where this goes.\n\n> We have an audit tool that breaks down exactly what's missing on your Google listing and why you're sitting where you are. I'm going to send it over to you for free right now.\n\n> What's the best email for it?\n\n+ email | Their email\n\n> And a cell, so if there's a line in there you don't understand you can just text me and I'll explain it. You shouldn't need somebody on staff to read it.\n\n+ mobile | Their mobile\n\n> I'll send you the link now, go ahead and run it while we're on the phone.\n\n~ Send it while they are still on the line. If you send it after, they never open it.\n\n## 15 · AUDIT WALK-THROUGH\nbadge: the real close\n\n> See how it's flagging those things? That's exactly what we were talking about earlier. The profile optimization, the activity, the images, the geo-tagging.\n\n> That's why you're stuck on page {{rank}} and {{competitor}} isn't.\n\n> So now that you can actually see it, does it make more sense to fix it properly or keep guessing?\n\n~ Silence. Then back to the ask.\n\n## 16 · IMAGINE\nbadge: use when they're close but flat\n\n> Think about {{panic}}. Somebody's standing in six inches of water, phone in hand, and they type in {{search}}.\n\n> Right now they're not seeing you. They're seeing {{competitor}}, sitting above you with {{competitor_reviews}} reviews. Same job, same truck, same price. Different listing.\n\n> At {{avg_job}} a job, that's the whole thing.\n\n## 17 · ONBOARDING\nbadge: after the yes\n\n> Perfect. Two quick things and I'll let you get back to work.\n\n> First, I'll need access to the Google Business profile. Whoever set it up originally will have it. If nobody knows, we can recover it, it just takes a couple of days.\n\n> Second, what's the best number for you directly, not the office line, in case anything comes up in the first week?\n\n> You'll get a confirmation from me today. Anything you're unsure about, text that number, it comes straight to me.\n" },
  { id: "02-bail-bonds", body: "---\nname: Bail Bonds\nnoun: bail bondsman\nsearch: bail bonds {{city}}\npanic: a mother in the jail parking lot at two in the morning\nvolume_q: About how many bonds are you writing in a typical month?\nvalue_q: What's your average premium on a bond?\n---\n\n## 1 · GATEKEEPER\nbadge: only if someone else picks up\n\n~ Warm, unhurried, mildly bored. You are not careful, because you have nothing to be careful about.\n\n! Do not dial this lead until {{competitor}} and their review count are filled in. Without a name this call is generic and you lose them in ten seconds.\n\n> Hey, is {{first_name}} around?\n\n? If they ask who's calling\n\n> It's Brenda. It's about {{business}} sitting at {{reviews}} reviews on Google while {{competitor}} is at {{competitor_reviews}}, in {{city}}. Two minutes, and it's his listing so it's his call, not mine.\n\n? If they push for details\n\n> I'd rather not mangle it secondhand. If he's at the jail I can hold, or give me a window and I'll call back then.\n\n> If it's easier, tell him Brenda called about {{competitor}} outranking him on Google Maps. If he says don't bother, that's it, I won't call again.\n\n= Gatekeepers block pitches, not messages. A named competitor and two real numbers is a message.\n\n## 2 · OPENER\nbadge: owner on the line\n\n~ Do not ask if it's them. Assume.\n\n> Hey {{first_name}}, how's it going?\n\n~ Pause. Let them answer.\n\n> Hey, quick question. I see you guys have {{reviews}} reviews. Are you new in the area?\n\n~ Let them answer. Do NOT react.\n\n> Got it. So listen, I've been testing something to help bail bond offices consistently get more reviews, and I wanted to run it by you real quick. Do you have thirty seconds?\n\n? If they say no\n\n> I get it. Look, if in thirty seconds you don't like what I have to say, you can hang up on me. Sound fair?\n\n~ Then continue immediately.\n\n## 3 · PROBLEM MATH\nbadge: reviews only\n\n~ Do not explain why you're asking. Just ask.\n\n> How long have you been writing bonds?\n\n+ years | Years in business\n\n> About how many bonds are you writing in a typical month?\n\n+ jobs_month | Bonds per month\n\n> Okay, so roughly {{years}} years and {{jobs_month}} bonds a month. You've helped around {{customers}} families through the worst night of their lives.\n\n~ Short pause.\n\n> And you've got about {{reviews}} reviews. {{competitor}} has {{competitor_reviews}}.\n\n! STOP TALKING. Let the silence work.\n\n= In bail this hits harder than any other trade, because almost nobody asks. Which also means {{competitor}} did not need many reviews to get above you, and neither do you to get back.\n\n## 4 · BUSINESS REALITY\nbadge: zoom out, this is ammunition\n\n> How many agents do you have working right now?\n\n+ crews | Agents\n\n> What's your average premium on a bond?\n\n+ avg_job | Average premium\n\n~ Do not react. Do not comment. Just note it.\n\n## 5 · HISTORY\nbadge: still calm, still curious\n\n> What have you tried in the past to get more reviews?\n\n+ tried | What they tried\n\n> What worked?\n\n> What didn't?\n\n~ Do not correct them. You are collecting words for later.\n\n~ Common one here: \"people don't want to admit they used a bondsman.\" Let them say it. You use it in step 16.\n\n## 6 · PIVOT\nbadge: casual slide-in, no reset\n\n> By the way, do you know where you're ranked on Google right now?\n\n? If yes\n\n> Where are you sitting?\n\n? If no\n\n> Let's look it up real quick.\n\n~ Immediately go into it, no commentary. Search: {{search}}\n\n+ rank | Where they rank\n\n## 7 · IMPACT QUESTIONS\n\n> Do you know why you're on page {{rank}}, has anyone ever actually explained to you how it works?\n\n? If they say yes\n\n> Yeah, that's part of it. But what Google is actually looking for is...\n\n? If they say no\n\n> That makes sense, most people haven't had it explained. What actually matters is this...\n\n## 8 · WHAT IT TAKES\nbadge: requirements\n\n> To show up consistently, a few things have to be happening at the same time.\n\n> The Google Business profile has to be fully built out and optimized. Descriptions, services, categories, all of it.\n\n> There needs to be regular activity on the listing itself, not just once in a while. That includes consistent Google posts written around the services people are actually searching for.\n\n> Reviews need to keep coming in, and they need to be responded to properly so Google sees ongoing engagement.\n\n> Photos matter. Google looks at image activity and freshness, not just how many are uploaded.\n\n> Those images also need to be geo-tagged correctly so Google can tie them back to the counties you actually cover.\n\n> And all of this has to be happening continuously, not as a one-time setup.\n\n> That's what Google looks for.\n\n## 9 · THE SEARCH SHIFT\nbadge: one line, then move on\n\n> And it's not only Google anymore. When somebody asks ChatGPT or Gemini for a bail bondsman in {{city}}, those answers get built from the same profile and the same reviews. {{competitor}} is already in shape for it. That's not something you catch up on in a week.\n\n~ Say it once and keep moving.\n\n## 10 · WALK-THROUGH\nbadge: designed to trigger \"how?\"\n\n> All you really have to do is make sure your Google Business description is accurate and matches the services you actually do.\n\n> You're getting reviews consistently.\n\n> You're replying to those reviews.\n\n> You're making Google posts, kind of like you would on Facebook.\n\n> You've got FAQs on your site that line up with what people search for locally.\n\n> And most importantly, you're geo-tagging your images.\n\n! STOP TALKING.\n\n? If they ask \"how do you geo-tag images\" or \"what does that mean\"\n\n~ Immediately move to the close.\n\n? If they don't ask\n\n> Do you know how to do that?\n\n~ Either answer, move to the close.\n\n## 11 · CLOSE\nbadge: one continuous run, do not pause\n\n> That's actually what we built.\n\n> So what this does is it handles all of that for you automatically. It fully optimizes your Google Business profile, descriptions, services, categories, everything Google looks at. It creates and posts Google updates consistently, written around the services people are actually searching for. It helps manage reviews and responses so Google sees constant engagement. It keeps fresh photos going up and geo-tags those images properly so Google can tie them back to the counties you cover. And it keeps all of that running week after week without you having to remember to do it.\n\n! DO NOT STOP TALKING.\n\n## 12 · VALUE STACK\nbadge: one run, no breaks\n\n~ Read the offer exactly as configured in Settings. Never quote a number from memory.\n\n> {{offer_line}}\n\n~ Discount is spoken only, on this call. Never in writing.\n\n> {{discount_line}}\n\n## 13 · ASSUMPTIVE CARD ASK\nbadge: then shut up\n\n> So will that be Visa or Mastercard?\n\n! STOP. No explaining. No filling silence. No saving them.\n\n~ One objection using the ammo from step 5, then straight back.\n\n> So will that be Visa or Mastercard?\n\n## 14 · FREE AUDIT\nbadge: final safety net\n\n> Alright, totally fair. Let me do something for you anyway.\n\n> You gave me a few minutes when you didn't have to, and most people don't. So I'm taking that as you actually caring about where this goes.\n\n> We have an audit tool that breaks down exactly what's missing on your Google listing and why you're sitting where you are. I'm going to send it over to you for free right now.\n\n> What's the best email for it?\n\n+ email | Their email\n\n> And a cell, so if there's a line in there you don't understand you can just text me and I'll explain it.\n\n+ mobile | Their mobile\n\n> I'll send you the link now, go ahead and run it while we're on the phone.\n\n## 15 · AUDIT WALK-THROUGH\n\n> See how it's flagging those things? That's exactly what we were talking about earlier. The profile optimization, the activity, the images, the geo-tagging.\n\n> That's why you're stuck on page {{rank}} and {{competitor}} isn't.\n\n> So now that you can actually see it, does it make more sense to fix it properly or keep guessing?\n\n## 16 · IMAGINE\nbadge: use when they're close but flat\n\n> Think about {{panic}}. She's got her son's booking number written on the back of a receipt and she types in {{search}}. She calls the first three. Not the best three, the first three.\n\n> Right now that's {{competitor}} with {{competitor_reviews}} reviews, not you with {{reviews}}.\n\n> You told me people don't like admitting they used a bondsman. That's exactly why the few you do have are worth more here than in any other trade.\n\n> At {{avg_job}} a bond, that's not a small gap.\n\n## 17 · ONBOARDING\nbadge: after the yes\n\n> Perfect. Two quick things and I'll let you go.\n\n> First, I'll need access to the Google Business profile. Whoever set it up will have it. If nobody knows, we can recover it, it just takes a couple of days.\n\n> Second, what's the best number for you directly, not the office line, in case anything comes up in the first week?\n\n> You'll get a confirmation from me today. Anything you're unsure about, text that number, it comes straight to me.\n" },
  { id: "03-towing", body: "---\nname: Towing\nnoun: tow truck company\nsearch: tow truck {{city}}\npanic: someone on the shoulder of the highway in the dark with their hazards on\nvolume_q: About how many tows are you running in a typical month?\nvalue_q: What's an average cash call worth to you?\n---\n\n## 1 · GATEKEEPER\nbadge: only if someone else picks up\n\n~ Warm, unhurried, slightly bored. Dispatch will gate you hard if you sound like a rep.\n\n! Do not dial this lead until {{competitor}} and their review count are filled in. Without a name this call is generic and you lose them in ten seconds.\n\n> Hey, is {{first_name}} around?\n\n? If they ask who's calling\n\n> It's Brenda. It's about {{business}} sitting at {{reviews}} reviews on Google while {{competitor}} is at {{competitor_reviews}}, in {{city}}. Two minutes, and it's his listing so it's his call, not mine.\n\n? If they push for details\n\n> I'd rather not mangle it secondhand. If he's out on a call I can hold, or give me a window and I'll call back then.\n\n> If it's easier, tell him Brenda called about {{competitor}} outranking him on Google Maps. If he says don't bother, that's it, I won't call again.\n\n## 2 · OPENER\nbadge: owner on the line\n\n~ Do not ask if it's them. Assume.\n\n> Hey {{first_name}}, how's it going?\n\n~ Pause. Let them answer.\n\n> Hey, quick question. I see you guys have {{reviews}} reviews. Are you new in the area?\n\n~ Let them answer. Do NOT react.\n\n> Got it. So listen, I've been testing something to help towing companies consistently get more reviews, and I wanted to run it by you real quick. Do you have thirty seconds?\n\n? If they say no\n\n> I get it. Look, if in thirty seconds you don't like what I have to say, you can hang up on me. Sound fair?\n\n~ Then continue immediately.\n\n## 3 · PROBLEM MATH\nbadge: reviews only\n\n~ Do not explain why you're asking. Just ask.\n\n> How long have you guys been in business?\n\n+ years | Years in business\n\n> About how many tows are you doing in a typical month?\n\n+ jobs_month | Tows per month\n\n> Okay, so roughly {{years}} years and {{jobs_month}} tows a month. You've helped around {{customers}} customers.\n\n~ Short pause.\n\n> And you've got about {{reviews}} reviews. {{competitor}} has {{competitor_reviews}}.\n\n! STOP TALKING. Let the silence work.\n\n## 4 · BUSINESS REALITY\nbadge: zoom out, this is ammunition\n\n> How many trucks do you have running right now?\n\n+ crews | Trucks\n\n> How much of your work is motor club versus cash calls?\n\n+ mix | Club vs cash split\n\n> What's an average cash call worth to you?\n\n+ avg_job | Average cash call\n\n~ Do not react. Do not comment. Just note it. The cash-call number is the one you use at the close, never the club rate.\n\n= This is the towing-specific hit. Club work pays what the club decides. Cash calls off Google pay what you charge. Every position you climb past {{competitor}} moves work from the first bucket to the second.\n\n## 5 · HISTORY\nbadge: still calm, still curious\n\n> What have you tried in the past to get more reviews?\n\n+ tried | What they tried\n\n> What worked?\n\n> What didn't?\n\n~ Do not correct them. You are collecting words for later.\n\n~ Common one here: \"people are in a bad mood when we tow them.\" Let them say it. You use it in step 16.\n\n## 6 · PIVOT\nbadge: casual slide-in, no reset\n\n> By the way, do you know where you're ranked on Google right now?\n\n? If yes\n\n> Where are you sitting?\n\n? If no\n\n> Let's look it up real quick.\n\n~ Immediately go into it, no commentary. Search: {{search}}\n\n+ rank | Where they rank\n\n## 7 · IMPACT QUESTIONS\n\n> Do you know why you're on page {{rank}}, has anyone ever actually explained to you how it works?\n\n? If they say yes\n\n> Yeah, that's part of it. But what Google is actually looking for is...\n\n? If they say no\n\n> That makes sense, most people haven't had it explained. What actually matters is this...\n\n## 8 · WHAT IT TAKES\nbadge: requirements\n\n> To show up consistently, a few things have to be happening at the same time.\n\n> The Google Business profile has to be fully built out and optimized. Descriptions, services, categories, all of it.\n\n> There needs to be regular activity on the listing itself, not just once in a while. That includes consistent Google posts written around the services people are actually searching for.\n\n> Reviews need to keep coming in, and they need to be responded to properly so Google sees ongoing engagement.\n\n> Photos matter. Google looks at image activity and freshness, not just how many are uploaded.\n\n> Those images also need to be geo-tagged correctly so Google can tie them back to the actual areas you run.\n\n> And all of this has to be happening continuously, not as a one-time setup.\n\n> That's what Google looks for.\n\n## 9 · THE SEARCH SHIFT\nbadge: one line, then move on\n\n> And it's not only Google anymore. When somebody asks ChatGPT or Gemini for a tow truck in {{city}}, those answers get built from the same profile and the same reviews. {{competitor}} is already in shape for it. That's not something you catch up on in a week.\n\n~ Say it once and keep moving.\n\n## 10 · WALK-THROUGH\nbadge: designed to trigger \"how?\"\n\n> All you really have to do is make sure your Google Business description is accurate and matches the services you actually do.\n\n> You're getting reviews consistently.\n\n> You're replying to those reviews.\n\n> You're making Google posts, kind of like you would on Facebook.\n\n> You've got FAQs on your site that line up with what people search for locally.\n\n> And most importantly, you're geo-tagging your images.\n\n! STOP TALKING.\n\n? If they ask \"how do you geo-tag images\" or \"what does that mean\"\n\n~ Immediately move to the close.\n\n? If they don't ask\n\n> Do you know how to do that?\n\n~ Either answer, move to the close.\n\n## 11 · CLOSE\nbadge: one continuous run, do not pause\n\n> That's actually what we built.\n\n> So what this does is it handles all of that for you automatically. It fully optimizes your Google Business profile, descriptions, services, categories, everything Google looks at. It creates and posts Google updates consistently, written around the services people are actually searching for. It helps manage reviews and responses so Google sees constant engagement. It keeps fresh photos going up and geo-tags those images properly so Google can tie them back to the areas you run. And it keeps all of that running week after week without you having to remember to do it.\n\n! DO NOT STOP TALKING.\n\n## 12 · VALUE STACK\nbadge: one run, no breaks\n\n~ Read the offer exactly as configured in Settings. Never quote a number from memory.\n\n> {{offer_line}}\n\n~ Discount is spoken only, on this call. Never in writing.\n\n> {{discount_line}}\n\n## 13 · ASSUMPTIVE CARD ASK\nbadge: then shut up\n\n> So will that be Visa or Mastercard?\n\n! STOP. No explaining. No filling silence. No saving them.\n\n~ One objection using the ammo from step 5, then straight back.\n\n> So will that be Visa or Mastercard?\n\n## 14 · FREE AUDIT\nbadge: final safety net\n\n> Alright, totally fair. Let me do something for you anyway.\n\n> You gave me a few minutes when you didn't have to, and most people don't. So I'm taking that as you actually caring about where this goes.\n\n> We have an audit tool that breaks down exactly what's missing on your Google listing and why you're sitting where you are. I'm going to send it over to you for free right now.\n\n> What's the best email for it?\n\n+ email | Their email\n\n> And a cell, so if there's a line in there you don't understand you can just text me and I'll explain it.\n\n+ mobile | Their mobile\n\n> I'll send you the link now, go ahead and run it while we're on the phone.\n\n## 15 · AUDIT WALK-THROUGH\n\n> See how it's flagging those things? That's exactly what we were talking about earlier. The profile optimization, the activity, the images, the geo-tagging.\n\n> That's why you're stuck on page {{rank}} and {{competitor}} isn't.\n\n> So now that you can actually see it, does it make more sense to fix it properly or keep guessing?\n\n## 16 · IMAGINE\nbadge: use when they're close but flat\n\n> Think about {{panic}}. They're not comparing quotes. They type {{search}} and they call whoever comes up first, because it's cold and they want this over with.\n\n> Right now that's {{competitor}} with {{competitor_reviews}} reviews, not you with {{reviews}}.\n\n> You said people are in a bad mood when you tow them. That's the point. Nobody in this trade has many, so the handful you do get move you further than they would anywhere else.\n\n> And every spot you climb turns club work into cash calls. At {{avg_job}} a call, that's the difference.\n\n## 17 · ONBOARDING\nbadge: after the yes\n\n> Perfect. Two quick things and I'll let you get back to it.\n\n> First, I'll need access to the Google Business profile. Whoever set it up will have it. If nobody knows, we can recover it, it just takes a couple of days.\n\n> Second, what's the best number for you directly, not dispatch, in case anything comes up in the first week?\n\n> You'll get a confirmation from me today. Anything you're unsure about, text that number, it comes straight to me.\n" },
  { id: "04-pest-control", body: "---\nname: Pest Control\nnoun: pest control company\nsearch: pest control {{city}}\npanic: somebody who just pulled the fridge out and saw what was living behind it\nvolume_q: About how many new customers are you signing in a typical month?\nvalue_q: What's a customer worth to you over a year, once they're on a plan?\n---\n\n## 1 · GATEKEEPER\nbadge: only if someone else picks up\n\n~ Warm, unhurried, slightly bored. Office managers in pest control screen hard.\n\n! Do not dial this lead until {{competitor}} and their review count are filled in. Without a name this call is generic and you lose them in ten seconds.\n\n> Hey, is {{first_name}} around?\n\n? If they ask who's calling\n\n> It's Brenda. It's about {{business}} sitting at {{reviews}} reviews on Google while {{competitor}} is at {{competitor_reviews}}, in {{city}}. Two minutes, and it's his listing so it's his call, not mine.\n\n? If they push for details\n\n> I'd rather not mangle it secondhand. If he's out on routes I can hold, or give me a window and I'll call back then.\n\n> If it's easier, tell him Brenda called about {{competitor}} outranking him on Google Maps. If he says don't bother, that's it, I won't call again.\n\n## 2 · OPENER\nbadge: owner on the line\n\n~ Do not ask if it's them. Assume.\n\n> Hey {{first_name}}, how's it going?\n\n~ Pause. Let them answer.\n\n> Hey, quick question. I see you guys have {{reviews}} reviews. Are you new in the area?\n\n~ Let them answer. Do NOT react.\n\n> Got it. So listen, I've been testing something to help pest control companies consistently get more reviews, and I wanted to run it by you real quick. Do you have thirty seconds?\n\n? If they say no\n\n> I get it. Look, if in thirty seconds you don't like what I have to say, you can hang up on me. Sound fair?\n\n~ Then continue immediately.\n\n## 3 · PROBLEM MATH\nbadge: reviews only\n\n~ Do not explain why you're asking. Just ask.\n\n> How long have you guys been in business?\n\n+ years | Years in business\n\n> About how many new customers are you signing in a typical month?\n\n+ jobs_month | New customers per month\n\n> Okay, so roughly {{years}} years and {{jobs_month}} new customers a month. You've been into around {{customers}} homes.\n\n~ Short pause.\n\n> And you've got about {{reviews}} reviews. {{competitor}} has {{competitor_reviews}}.\n\n! STOP TALKING. Let the silence work.\n\n## 4 · BUSINESS REALITY\nbadge: zoom out, this is ammunition\n\n> How many techs do you have running routes right now?\n\n+ crews | Techs\n\n> How much of your book is recurring plans versus one-off treatments?\n\n+ mix | Recurring vs one-off\n\n> What's a customer worth to you over a year, once they're on a plan?\n\n+ avg_job | Annual customer value\n\n~ Do not react. Do not comment. Just note it.\n\n= Push them past the price of an initial treatment to the annual figure. In pest control the annual number is what closes, and most owners have never said it out loud.\n\n## 5 · HISTORY\nbadge: still calm, still curious\n\n> What have you tried in the past to get more reviews?\n\n+ tried | What they tried\n\n> What worked?\n\n> What didn't?\n\n~ Do not correct them. You are collecting words for later.\n\n~ Common one here: \"the tech asks at the door but nobody does it.\" Let them say it. You use it in step 16.\n\n## 6 · PIVOT\nbadge: casual slide-in, no reset\n\n> By the way, do you know where you're ranked on Google right now?\n\n? If yes\n\n> Where are you sitting?\n\n? If no\n\n> Let's look it up real quick.\n\n~ Immediately go into it, no commentary. Search: {{search}}\n\n+ rank | Where they rank\n\n## 7 · IMPACT QUESTIONS\n\n> Do you know why you're on page {{rank}}, has anyone ever actually explained to you how it works?\n\n? If they say yes\n\n> Yeah, that's part of it. But what Google is actually looking for is...\n\n? If they say no\n\n> That makes sense, most people haven't had it explained. What actually matters is this...\n\n## 8 · WHAT IT TAKES\nbadge: requirements\n\n> To show up consistently, a few things have to be happening at the same time.\n\n> The Google Business profile has to be fully built out and optimized. Descriptions, services, categories, all of it.\n\n> There needs to be regular activity on the listing itself, not just once in a while. That includes consistent Google posts written around the services people are actually searching for. Termites in spring, roaches in summer, rodents when it turns cold.\n\n> Reviews need to keep coming in, and they need to be responded to properly so Google sees ongoing engagement.\n\n> Photos matter. Google looks at image activity and freshness, not just how many are uploaded.\n\n> Those images also need to be geo-tagged correctly so Google can tie them back to the actual neighbourhoods you service.\n\n> And all of this has to be happening continuously, not as a one-time setup.\n\n> That's what Google looks for.\n\n## 9 · THE SEARCH SHIFT\nbadge: one line, then move on\n\n> And it's not only Google anymore. When somebody asks ChatGPT or Gemini for a pest control company in {{city}}, those answers get built from the same profile and the same reviews. {{competitor}} is already in shape for it. That's not something you catch up on in a week.\n\n~ Say it once and keep moving.\n\n## 10 · WALK-THROUGH\nbadge: designed to trigger \"how?\"\n\n> All you really have to do is make sure your Google Business description is accurate and matches the services you actually do.\n\n> You're getting reviews consistently.\n\n> You're replying to those reviews.\n\n> You're making Google posts, kind of like you would on Facebook.\n\n> You've got FAQs on your site that line up with what people search for locally.\n\n> And most importantly, you're geo-tagging your images.\n\n! STOP TALKING.\n\n? If they ask \"how do you geo-tag images\" or \"what does that mean\"\n\n~ Immediately move to the close.\n\n? If they don't ask\n\n> Do you know how to do that?\n\n~ Either answer, move to the close.\n\n## 11 · CLOSE\nbadge: one continuous run, do not pause\n\n> That's actually what we built.\n\n> So what this does is it handles all of that for you automatically. It fully optimizes your Google Business profile, descriptions, services, categories, everything Google looks at. It creates and posts Google updates consistently, written around the services people are actually searching for. It helps manage reviews and responses so Google sees constant engagement. It keeps fresh photos going up and geo-tags those images properly so Google can tie them back to the neighbourhoods you service. And it keeps all of that running week after week without you having to remember to do it.\n\n! DO NOT STOP TALKING.\n\n## 12 · VALUE STACK\nbadge: one run, no breaks\n\n~ Read the offer exactly as configured in Settings. Never quote a number from memory.\n\n> {{offer_line}}\n\n~ Discount is spoken only, on this call. Never in writing.\n\n> {{discount_line}}\n\n## 13 · ASSUMPTIVE CARD ASK\nbadge: then shut up\n\n> So will that be Visa or Mastercard?\n\n! STOP. No explaining. No filling silence. No saving them.\n\n~ One objection using the ammo from step 5, then straight back.\n\n> So will that be Visa or Mastercard?\n\n## 14 · FREE AUDIT\nbadge: final safety net\n\n> Alright, totally fair. Let me do something for you anyway.\n\n> You gave me a few minutes when you didn't have to, and most people don't. So I'm taking that as you actually caring about where this goes.\n\n> We have an audit tool that breaks down exactly what's missing on your Google listing and why you're sitting where you are. I'm going to send it over to you for free right now.\n\n> What's the best email for it?\n\n+ email | Their email\n\n> And a cell, so if there's a line in there you don't understand you can just text me and I'll explain it.\n\n+ mobile | Their mobile\n\n> I'll send you the link now, go ahead and run it while we're on the phone.\n\n## 15 · AUDIT WALK-THROUGH\n\n> See how it's flagging those things? That's exactly what we were talking about earlier. The profile optimization, the activity, the images, the geo-tagging.\n\n> That's why you're stuck on page {{rank}} and {{competitor}} isn't.\n\n> So now that you can actually see it, does it make more sense to fix it properly or keep guessing?\n\n## 16 · IMAGINE\nbadge: use when they're close but flat\n\n> Think about {{panic}}. They are not shopping around. They want it gone today, and they call whoever comes up first when they type {{search}}.\n\n> Right now that's {{competitor}} with {{competitor_reviews}} reviews, not you with {{reviews}}.\n\n> You said your techs ask at the door and nobody follows through. That's every company in this trade, which is exactly why {{competitor}} got ahead without doing anything clever.\n\n> And a customer here isn't one job, it's a plan. At {{avg_job}} a year, every one you don't get shows up again next year and the year after.\n\n## 17 · ONBOARDING\nbadge: after the yes\n\n> Perfect. Two quick things and I'll let you get back to it.\n\n> First, I'll need access to the Google Business profile. Whoever set it up will have it. If nobody knows, we can recover it, it just takes a couple of days.\n\n> Second, what's the best number for you directly, not the office line, in case anything comes up in the first week?\n\n> You'll get a confirmation from me today. Anything you're unsure about, text that number, it comes straight to me.\n" },
  { id: "05-vet-clinics", body: "---\nname: Vet Clinics\nnoun: vet\nsearch: vet {{city}}\npanic: someone whose dog just ate something at seven in the evening\nvolume_q: About how many new clients are you taking on in a typical month?\nvalue_q: What's a new client worth to you over the years they stay with you?\n---\n\n## 1 · GATEKEEPER\nbadge: almost always, in this vertical\n\n~ Front desk at a clinic is genuinely busy and genuinely protective. Be brief and be a human. Pushing here gets you permanently blocked.\n\n! Do not dial this lead until {{competitor}} and their review count are filled in. Without a name this call is generic and you lose them in ten seconds.\n\n> Hey, is {{first_name}} around? Or whoever handles the practice side rather than the clinical side.\n\n? If they ask who's calling\n\n> It's Brenda. It's about {{business}} sitting at {{reviews}} reviews on Google while {{competitor}} is at {{competitor_reviews}}, in {{city}}. Two minutes, and it's really their call not mine.\n\n? If they push for details\n\n> I'd rather not mangle it secondhand, it's their listing. Sounds like you're slammed, so give me a window and I'll call back then.\n\n> If it's easier, tell them Brenda called about {{competitor}} outranking them on Google Maps. If they say don't bother, that's it, I won't call again.\n\n= In clinics, patience at the desk is what gets you through. The front desk talks to the owner far more than you ever will.\n\n## 2 · OPENER\nbadge: owner or practice manager on the line\n\n> Hey {{first_name}}, how's it going?\n\n~ Pause. Let them answer.\n\n> Hey, quick question. I see you guys have {{reviews}} reviews. Are you new in the area?\n\n~ Let them answer. Do NOT react.\n\n> Got it. So listen, I've been testing something to help veterinary practices consistently get more reviews, and I wanted to run it by you real quick. Do you have thirty seconds?\n\n? If they say no\n\n> I get it. Look, if in thirty seconds you don't like what I have to say, you can hang up on me. Sound fair?\n\n~ Then continue immediately.\n\n## 3 · PROBLEM MATH\nbadge: reviews only\n\n~ Do not explain why you're asking. Just ask.\n\n> How long has the practice been open?\n\n+ years | Years open\n\n> About how many new clients are you taking on in a typical month?\n\n+ jobs_month | New clients per month\n\n> Okay, so roughly {{years}} years and {{jobs_month}} new clients a month. You've looked after around {{customers}} families.\n\n~ Short pause.\n\n> And you've got about {{reviews}} reviews. {{competitor}} has {{competitor_reviews}}.\n\n! STOP TALKING. Let the silence work.\n\n## 4 · BUSINESS REALITY\nbadge: zoom out, this is ammunition\n\n> How many vets do you have on the floor right now?\n\n+ crews | Vets on staff\n\n> Are you taking new clients at the moment, or are you at capacity?\n\n+ mix | Capacity status\n\n> What's a new client worth to you over the years they stay with you?\n\n+ avg_job | Client lifetime value\n\n~ Do not react. Do not comment. Just note it.\n\n= If they say they are at capacity, do not fight it. At capacity the question stops being how many and becomes which ones, and the listing decides who walks in.\n\n## 5 · HISTORY\nbadge: still calm, still curious\n\n> What have you tried in the past to get more reviews?\n\n+ tried | What they tried\n\n> What worked?\n\n> What didn't?\n\n~ Do not correct them. You are collecting words for later.\n\n~ Common one here: \"the only people who leave reviews are the angry ones.\" Let them say it in full. It is the strongest thing you will get on this call and you use it in step 16.\n\n## 6 · PIVOT\nbadge: casual slide-in, no reset\n\n> By the way, do you know where you're ranked on Google right now?\n\n? If yes\n\n> Where are you sitting?\n\n? If no\n\n> Let's look it up real quick.\n\n~ Immediately go into it, no commentary. Search: {{search}}\n\n+ rank | Where they rank\n\n## 7 · IMPACT QUESTIONS\n\n> Do you know why you're on page {{rank}}, has anyone ever actually explained to you how it works?\n\n? If they say yes\n\n> Yeah, that's part of it. But what Google is actually looking for is...\n\n? If they say no\n\n> That makes sense, most people haven't had it explained. What actually matters is this...\n\n## 8 · WHAT IT TAKES\nbadge: requirements\n\n> To show up consistently, a few things have to be happening at the same time.\n\n> The Google Business profile has to be fully built out and optimized. Descriptions, services, categories, all of it.\n\n> There needs to be regular activity on the listing itself, not just once in a while. That includes consistent Google posts written around the services people are actually searching for.\n\n> Reviews need to keep coming in, and they need to be responded to properly so Google sees ongoing engagement.\n\n> Photos matter. Google looks at image activity and freshness, not just how many are uploaded.\n\n> Those images also need to be geo-tagged correctly so Google can tie them back to the actual areas you draw from.\n\n> And all of this has to be happening continuously, not as a one-time setup.\n\n> That's what Google looks for.\n\n## 9 · THE SEARCH SHIFT\nbadge: one line, then move on\n\n> And it's not only Google anymore. When somebody asks ChatGPT or Gemini for a vet in {{city}}, those answers get built from the same profile and the same reviews. {{competitor}} is already in shape for it. That's not something you catch up on in a week.\n\n~ Say it once and keep moving.\n\n## 10 · WALK-THROUGH\nbadge: designed to trigger \"how?\"\n\n> All you really have to do is make sure your Google Business description is accurate and matches the services you actually do.\n\n> You're getting reviews consistently.\n\n> You're replying to those reviews. Especially the bad ones, properly, not defensively.\n\n> You're making Google posts, kind of like you would on Facebook.\n\n> You've got FAQs on your site that line up with what people search for locally.\n\n> And most importantly, you're geo-tagging your images.\n\n! STOP TALKING.\n\n? If they ask \"how do you geo-tag images\" or \"what does that mean\"\n\n~ Immediately move to the close.\n\n? If they don't ask\n\n> Do you know how to do that?\n\n~ Either answer, move to the close.\n\n## 11 · CLOSE\nbadge: one continuous run, do not pause\n\n> That's actually what we built.\n\n> So what this does is it handles all of that for you automatically. It fully optimizes your Google Business profile, descriptions, services, categories, everything Google looks at. It creates and posts Google updates consistently, written around the services people are actually searching for. It helps manage reviews and responses so Google sees constant engagement, including drafting the replies to the difficult ones. It keeps fresh photos going up and geo-tags those images properly so Google can tie them back to the areas you draw from. And it keeps all of that running week after week without your front desk having to remember to do it.\n\n! DO NOT STOP TALKING.\n\n## 12 · VALUE STACK\nbadge: one run, no breaks\n\n~ Read the offer exactly as configured in Settings. Never quote a number from memory.\n\n> {{offer_line}}\n\n~ Discount is spoken only, on this call. Never in writing.\n\n> {{discount_line}}\n\n## 13 · ASSUMPTIVE CARD ASK\nbadge: then shut up\n\n> So will that be Visa or Mastercard?\n\n! STOP. No explaining. No filling silence. No saving them.\n\n~ One objection using the ammo from step 5, then straight back.\n\n> So will that be Visa or Mastercard?\n\n## 14 · FREE AUDIT\nbadge: final safety net\n\n> Alright, totally fair. Let me do something for you anyway.\n\n> You gave me a few minutes when you didn't have to, and most people don't. So I'm taking that as you actually caring about where this goes.\n\n> We have an audit tool that breaks down exactly what's missing on your Google listing and why you're sitting where you are. I'm going to send it over to you for free right now.\n\n> What's the best email for it?\n\n+ email | Their email\n\n> And a cell, so if there's a line in there you don't understand you can just text me and I'll explain it.\n\n+ mobile | Their mobile\n\n> I'll send you the link now, go ahead and run it while we're on the phone.\n\n## 15 · AUDIT WALK-THROUGH\n\n> See how it's flagging those things? That's exactly what we were talking about earlier. The profile optimization, the activity, the images, the geo-tagging.\n\n> That's why you're stuck on page {{rank}} and {{competitor}} isn't.\n\n> So now that you can actually see it, does it make more sense to fix it properly or keep guessing?\n\n## 16 · IMAGINE\nbadge: use when they're close but flat\n\n> Think about {{panic}}. They are not reading your website. They type {{search}}, they look at the stars, and they call.\n\n> Right now that's {{competitor}} with {{competitor_reviews}} reviews, not you with {{reviews}}.\n\n> You told me the only people who leave reviews are the angry ones. That's the whole problem in one sentence. Your rating is being written by your worst days, because nobody is asking on the good ones.\n\n> At {{avg_job}} over the life of a client, you don't need many going to {{competitor}} for it to matter.\n\n## 17 · ONBOARDING\nbadge: after the yes\n\n> Perfect. Two quick things and I'll let you get back to the floor.\n\n> First, I'll need access to the Google Business profile. Whoever set it up will have it. If nobody knows, we can recover it, it just takes a couple of days.\n\n> Second, what's the best number for you directly, not the front desk, in case anything comes up in the first week?\n\n> You'll get a confirmation from me today. Anything you're unsure about, text that number, it comes straight to me.\n" },
];
const DEFAULT_OBJECTIONS = {
  "_note": "Rebuilt on Daniel G's four-step NRS sequence: acknowledge, push them out, pull them back in, re-close. The first line of every card is the acknowledge-and-exit, which is why it is the one always on screen. Never solve the first objection, it is almost always smoke. See data/library/daniel-g-the-sales-game.md.",
  "groups": [
    {
      "id": "anything",
      "key": "0",
      "name": "Works on anything",
      "hint": "If you freeze, use these. They fit every objection in the list.",
      "pinned": true,
      "items": [
        {
          "trigger": "Use on ANY objection",
          "variants": ["what else", "stuck", "frozen", "anything", "help"],
          "means": "Their first objection is almost always smoke. Two calm words move it about half the time, and the second one they give you is the real one.",
          "say": [
            "What else?",
            "(say it calm and curious, like you are mildly interested, not challenging them)",
            "(then stop talking and let them fill it)"
          ],
          "then": "Whatever comes out second is the objection you actually handle. Find that card and go."
        },
        {
          "trigger": "The four steps, if you lose your place",
          "variants": ["structure", "sequence", "nrs", "framework", "steps"],
          "means": "Every card below is built on this. If none of them fit what they said, build one live from this.",
          "say": [
            "1. Agree with them completely. Do not argue, do not defend.",
            "2. Push them out. Offer more room than they asked for. Their shoulders drop.",
            "3. Pull them back in with one question about what they are still unsure of.",
            "4. Answer that, then go back to the card ask."
          ],
          "then": "Beginners handle zero. Amateurs try once. The money is in the third and fourth attempt on this same call."
        }
      ]
    },
    {
      "id": "start",
      "key": "1",
      "name": "Right at the start",
      "hint": "They have not heard anything yet. Reflex, not a real no.",
      "items": [
        {
          "trigger": "I'm not interested",
          "variants": ["Not interested", "No thanks", "We're good", "Not looking for anything"],
          "means": "They are saying no to being phoned, not to you. Never ask what they are not interested in, that starts a chase.",
          "say": [
            "Oh, that's completely my fault, I should have said this at the start. It might not even be a fit, I don't know enough about you yet.",
            "Honestly the only reason I called is I had your listing open next to {{competitor}}'s. Thirty seconds and if you still don't care, hang up on me.",
            "How long have you guys been in business?"
          ],
          "then": "You leaned out, so they lean in. Go straight into the questions, do not ask permission twice."
        },
        {
          "trigger": "We're all set",
          "variants": ["We're covered", "Already handled", "We've got that sorted"],
          "means": "They think you are selling something they already buy.",
          "say": [
            "Good, that usually means somebody's paying attention.",
            "Then this'll take ten seconds, because you'd know the answer.",
            "Where are you ranked on Google right now?"
          ],
          "then": "If they don't know, you have the call. Go to the ranking question."
        },
        {
          "trigger": "Who is this?",
          "variants": ["How did you get my number?", "Where did you get this number?", "Is this a sales call?"],
          "means": "Guard is up. A flat answer drops it. Dodging confirms what they suspect.",
          "say": [
            "Brenda. Your number's on your Google listing, that's actually what I'm calling about.",
            "I see you guys have {{reviews}} reviews. Are you new in the area?"
          ],
          "then": "Answer flat, then move. Never sound caught out and never apologise for calling."
        },
        {
          "trigger": "Just email me",
          "variants": ["Send me something", "Put it in an email", "Have you got a website"],
          "means": "A polite way out. Take the exit, then use it to get the real answer.",
          "say": [
            "Yeah, I can do that, that's probably easier for both of us.",
            "What's the best email?",
            "And so I'm not sending you something useless, what would you actually need to see in there? Where you're ranked, or what {{competitor}} is doing differently?"
          ],
          "then": "Their answer is the opening. You are back in the conversation and you now have the email either way."
        },
        {
          "trigger": "I'm driving",
          "variants": ["I'm on a job", "I'm with a customer", "I'm on another call", "Bad time"],
          "means": "Usually true. Take it, but leave with a set time, not a vague one.",
          "say": [
            "No worries, I'm not doing this while you're driving.",
            "Are you better later this afternoon, or first thing tomorrow?"
          ],
          "then": "Two options, not an open question. Ask when is good and you get never."
        },
        {
          "trigger": "Take me off your list",
          "variants": ["Don't call here again", "Put me on your do not call list", "Stop calling me"],
          "means": "A real request. Honour it immediately. No clever line, no second attempt.",
          "say": [
            "Done, I'll take you off right now. Sorry to have bothered you.",
            "Have a good one."
          ],
          "then": "Hang up. Set the lead to Do not call so it is locked in your list and never dialled again."
        }
      ]
    },
    {
      "id": "busy",
      "key": "2",
      "name": "They say they're busy",
      "hint": "The most common one. Almost never about time.",
      "items": [
        {
          "trigger": "I'm too busy",
          "variants": ["No time right now", "I'm swamped", "It's a mad house here", "I've got a lot on"],
          "means": "Busy is every owner's normal state. Pressing for one more minute only gets you an angry buyer.",
          "say": [
            "Course you are, and honestly I can't do much right now either, I've got someone waiting on me.",
            "Would it be easier if I just sent this over instead? What's the best email?",
            "And so it's actually worth opening, what would you need to see in there? Where you're sitting on the map, or what {{competitor}} is doing that you're not?"
          ],
          "then": "You matched their urgency and handed them the exit. Their answer puts you straight back in."
        },
        {
          "trigger": "I'm always busy, that's the job",
          "variants": ["I never have time", "That's just how it is here"],
          "means": "They are not asking to get off the phone, they are telling you time is not the currency. So use the other one.",
          "say": [
            "Right, and you'll be busy next month too. That's not going to change.",
            "But you make time for the things that move money. If a truck went down this morning you'd have found an hour.",
            "So it isn't whether you're busy. It's whether this is worth an hour. Is it?"
          ],
          "then": "Yes means keep going. No means ask what would make it worth one."
        },
        {
          "trigger": "Call me later",
          "variants": ["Try me next week", "Catch me another time", "Ring me back"],
          "means": "A soft no unless you pin it. A callback with no time on it is a dead lead.",
          "say": [
            "Happy to. Last time somebody said that I called back four times and never got them, so let's not do that to each other.",
            "Two o'clock tomorrow, or is Thursday morning cleaner?"
          ],
          "then": "Two options only. Say the time out loud so they hear you commit to it."
        },
        {
          "trigger": "I haven't got time to manage another thing",
          "variants": ["I can't take on more work", "I've got enough to do"],
          "means": "A fair worry. They think you are handing them a job.",
          "say": [
            "Then don't take it on. Honestly, if this needed you every week I wouldn't be selling it to someone as busy as you.",
            "The only time you spend is ten minutes at the start giving me access to the listing.",
            "What made you think it'd be more than that? I want to make sure I explained it properly."
          ],
          "then": "Their answer tells you which part you oversold. Fix that one, then back to the ask."
        }
      ]
    },
    {
      "id": "someoneelse",
      "key": "3",
      "name": "Someone else decides",
      "hint": "They cannot say yes, or they think it is already covered.",
      "items": [
        {
          "trigger": "We already have someone",
          "variants": ["We use an agency", "My nephew does our marketing", "We've got a marketing guy", "Our web guy handles it"],
          "means": "Usually a website person or a relative. Almost never someone touching the listing weekly.",
          "say": [
            "Good, that's more than most people have. And I'm not looking to replace anyone.",
            "What are they doing on the listing itself though? Not the website. Posts, review replies, photo activity, geo-tagging.",
            "Because you're behind {{competitor}} at {{competitor_reviews}} reviews, which normally means someone set it up once and moved on."
          ],
          "then": "Never insult whoever they use. Ask what they do and let the gap show itself."
        },
        {
          "trigger": "I need to ask my partner",
          "variants": ["My wife handles that", "I'll run it by my brother", "That's not my call"],
          "means": "Nine times out of ten the partner is a smokescreen. Get the name, agree completely, then find the real one.",
          "say": [
            "150%, you should. What's their name?",
            "And how long would you roughly need with them on something like this? Take longer if you want, I'm not going anywhere.",
            "In the meantime, so you've got everything when you sit down with them, what were you still a bit unsure about yourself today?"
          ],
          "then": "What comes out is the real objection. The partner disappears once you have it."
        },
        {
          "trigger": "I do it myself",
          "variants": ["I handle our Google stuff", "I post on there sometimes", "I've been meaning to get to it"],
          "means": "They did it once, a while ago. Do not say that to them.",
          "say": [
            "Respect, most people don't touch it at all.",
            "When did the last post go up?",
            "That's the bit that gets everybody. It isn't hard, it's just every week forever, and nobody's got a forever."
          ],
          "then": "Their own answer does the work. Then back to the ask."
        }
      ]
    },
    {
      "id": "price",
      "key": "4",
      "name": "It's the price",
      "hint": "A real money objection comes after they see value. An early one is a brush-off.",
      "items": [
        {
          "trigger": "That's too expensive",
          "variants": ["That's a lot", "I can't justify that", "More than I thought"],
          "means": "It costs more than they think the problem costs. Your job is the second number.",
          "say": [
            "Compared to what, though?",
            "You told me a job's worth {{avg_job}} to you. So this is less than one job.",
            "The question isn't whether it's cheap. It's whether it brings you more than one."
          ],
          "then": "Straight back to the ask. Do not start knocking your own price down."
        },
        {
          "trigger": "We don't have the budget",
          "variants": ["Cash is tight", "Not this quarter", "Money's thin right now"],
          "means": "She said she doesn't have it. She didn't say the business doesn't, and she didn't say no. Do not pour attention on it.",
          "say": [
            "No worries at all, and there's usually a way to sort that out later anyway.",
            "But I wouldn't want you doing this in a month's time still half unsure about it. I'd rather you were certain.",
            "So while the money's sorting itself out, what were you still a bit unsure about today? Is it whether it actually works, or whether it works for your kind of business?"
          ],
          "then": "The objection almost always moves off money here. Handle whatever replaces it."
        },
        {
          "trigger": "It's a waste of money",
          "variants": ["Marketing never works for us", "We've thrown money at this before", "It's all a scam"],
          "means": "An old agency burned them. They are arguing with someone who is not you.",
          "say": [
            "Who was it that burned you?",
            "Yeah. Most of that's ads, where you pay for the click whether or not anything comes of it.",
            "This isn't ads. It's the listing you already own, kept in the shape Google wants. You stop paying, you keep the reviews."
          ],
          "then": "Let them finish the story. Interrupting it makes you the villain in it."
        },
        {
          "trigger": "I can get it cheaper elsewhere",
          "variants": ["Someone quoted me less", "I found it cheaper", "Another company's half that"],
          "means": "They are looking at price, not cost. Separate the two words for them.",
          "say": [
            "Probably. When you say cheaper, do you mean the price or the cost?",
            "Price is what you pay this month. Cost is what it costs you to still be behind {{competitor}} this time next year.",
            "If it's the cheapest price you're after, that's honestly not us. If it's the cheapest cost, that is us. Which one are you actually after?"
          ],
          "then": "Once they say outcome rather than price, go straight back to the ask."
        }
      ]
    },
    {
      "id": "dontneed",
      "key": "5",
      "name": "They don't think they need it",
      "hint": "Business is fine, so why change. The hardest group.",
      "items": [
        {
          "trigger": "We get enough customers",
          "variants": ["We're busy enough", "We're booked out", "We've got plenty of work"],
          "means": "True today. They are describing this month, not the year.",
          "say": [
            "Good. That's a nicer problem than most people I call have.",
            "Is that every month, or is that right now?",
            "The reason I ask is the listing takes months to move. Everybody who calls me does it in their slow season, when it's already too late to fix the slow season."
          ],
          "then": "Plant it and leave it. Do not fight a man who is winning."
        },
        {
          "trigger": "All our work is word of mouth",
          "variants": ["We're referral only", "We've never needed Google", "Our customers come from friends"],
          "means": "Real pride, and it is how they got here. Do not attack it.",
          "say": [
            "That's the best kind, and it's why you've lasted {{years}} years.",
            "Here's the thing though. When someone gets your name from a friend, the first thing they do is look you up. Nobody calls a stranger's number without checking.",
            "So word of mouth still lands on your listing. It just lands on {{reviews}} reviews instead of your best work."
          ],
          "then": "This makes the listing something that protects referrals rather than replaces them."
        },
        {
          "trigger": "We're already set up on Google",
          "variants": ["Our profile's fine", "We've done all that", "It's already optimised"],
          "means": "Someone told them it was done. It was done once.",
          "say": [
            "Alright, then this'll be quick.",
            "When did the last photo go up, and when did you last reply to a review?",
            "That's the whole thing. It isn't whether it was set up right, it's whether anything has happened on it since."
          ],
          "then": "Two questions, both about dates. Dates cannot be argued with."
        },
        {
          "trigger": "We're at capacity",
          "variants": ["We can't take more work", "We'd have to hire", "We're turning work away"],
          "means": "A real limit. Change the goal from more to better.",
          "say": [
            "Then forget volume for a second.",
            "At capacity the question stops being how many and starts being which ones. Right now you take whoever finds you.",
            "Higher up the map you get first pick instead of leftovers. Same book, better book."
          ],
          "then": "Back to the ask."
        }
      ]
    },
    {
      "id": "trust",
      "key": "6",
      "name": "They don't trust it",
      "hint": "They think you might be a scam, or that it will not work for them.",
      "items": [
        {
          "trigger": "This sounds like a scam",
          "variants": ["Is this legit?", "I get these calls all the time", "How do I know you're real?"],
          "means": "Fair enough, they do get these calls. Calm beats defensive every time.",
          "say": [
            "You should be suspicious, you get called ten times a week.",
            "So don't take my word for any of it. Pull your own listing up right now while I'm on the phone.",
            "Everything I've said you can check yourself in about a minute. What do you see?"
          ],
          "then": "Never sound offended. Sounding offended reads as guilty."
        },
        {
          "trigger": "We got burned before",
          "variants": ["The last company took our money", "We tried an agency, disaster", "Been there, done that"],
          "means": "They need to tell you the story. Let them tell all of it.",
          "say": [
            "What happened?",
            "Yeah, I've heard that one more than once.",
            "So what would have to be different this time for you to even consider it?"
          ],
          "then": "They hand you the exact terms of the sale. Then meet them, or say honestly that you can't."
        },
        {
          "trigger": "Is there a guarantee?",
          "variants": ["Do you guarantee results?", "What if it doesn't work?", "Is there a refund?"],
          "means": "They are asking for perfection. You do not sell perfect, you sell better.",
          "say": [
            "When you say guarantee, what exactly do you mean?",
            "Because no, we don't guarantee a number. Anyone who does is lying to you, nobody controls Google.",
            "What I can tell you is you're on {{reviews}} and {{competitor}} is on {{competitor_reviews}}. Are you after better than where you are now, or are you after perfect?"
          ],
          "then": "When they say better, go straight back to the ask."
        },
        {
          "trigger": "That won't work for my business",
          "variants": ["We're different", "Our customers don't use Google", "Not in this trade"],
          "means": "They think their trade is the exception. Usually the opposite is true.",
          "say": [
            "Maybe. Where did your last three new customers come from?",
            "And when they found you, what do you reckon they looked at first?",
            "It's the same listing either way. The only question is what it says about you when they get there."
          ],
          "then": "Ask, don't argue. Never tell a man he's wrong about his own trade."
        }
      ]
    },
    {
      "id": "hardwork",
      "key": "7",
      "name": "It sounds like hard work",
      "hint": "They think it will be difficult or that they will not understand it.",
      "items": [
        {
          "trigger": "That sounds too complicated",
          "variants": ["That's a lot to take in", "That's over my head", "I don't follow"],
          "means": "You explained too much. Shrink the ask, not the product.",
          "say": [
            "That's on me, I threw a lot at you.",
            "Your side of it is one thing. You give me access to the listing, that's it.",
            "Which bit sounded like work? I want to know where I lost you."
          ],
          "then": "Fix only that bit, then back to the ask."
        },
        {
          "trigger": "I'm not good with computers",
          "variants": ["I'm not tech savvy", "My kid does all that", "I can barely work my phone"],
          "means": "A bit of embarrassment. Take it off the table completely.",
          "say": [
            "Perfect, that's exactly who this is built for.",
            "There's nothing to learn and nothing to log into. If you can answer a phone you're doing your half.",
            "And anything you don't understand, you text me and I'll explain it in plain words."
          ],
          "then": "Back to the ask."
        }
      ]
    },
    {
      "id": "puttingoff",
      "key": "8",
      "name": "They're putting it off",
      "hint": "Late-call soft no. Push the exit wider than they asked for, then pull them back.",
      "items": [
        {
          "trigger": "Let me think about it",
          "variants": ["I'll get back to you", "Leave it with me", "I need to sleep on it", "I don't decide that fast"],
          "means": "Something specific is bothering them and they will not name it. Give them more room than they asked for and it comes out.",
          "say": [
            "150%, take all the time you need on something like this.",
            "How long would you roughly need? Actually, make it two weeks, I'm tied up most of next week anyway.",
            "And in that time, what can I send over that you were still a bit unsure about today? That way when you do decide, you're certain either way."
          ],
          "then": "Pushing the exit wider is the move. Their shoulders drop and the real objection falls out."
        },
        {
          "trigger": "Send me some information",
          "variants": ["Have you got a brochure?", "Email me the details", "Send it over and I'll look"],
          "means": "A way out, softened. It is also your opening for the audit.",
          "say": [
            "I'll do better than a brochure.",
            "You gave me a few minutes when you didn't have to, so let me send you something actually useful. We've got an audit that shows exactly what's missing and why {{competitor}} is above you.",
            "What's the best email? And what did you most want to see in there?"
          ],
          "then": "Go to the free audit step. Get the email and the mobile, and send it while they are still on the line."
        },
        {
          "trigger": "Call me next month",
          "variants": ["After the season", "Once things quiet down", "Try me in the new year"],
          "means": "Real seasonality, or a polite forever. Name the cost of waiting once, then let it go.",
          "say": [
            "I can do that. One thing worth knowing before you park it.",
            "This isn't a switch, it's a build. Whatever we start today shows up in about three months.",
            "So starting in {{next_month}} means waiting until the season's over to be ready for the season."
          ],
          "then": "Say it once. If they still want the date, book it properly and be pleasant."
        },
        {
          "trigger": "We're selling the business",
          "variants": ["We're winding down", "I'm retiring soon", "We're closing up"],
          "means": "Often true, and it changes what matters. Do not push the monthly, push the sale price.",
          "say": [
            "Ah, congratulations. Then this is worth thirty more seconds, not less.",
            "Whoever buys it values it on the customers it brings in on its own.",
            "{{reviews}} reviews against {{competitor}} at {{competitor_reviews}} shows up in that number."
          ],
          "then": "If they engage, keep going. If not, mark it dead and move on quickly."
        }
      ]
    },
    {
      "id": "gatekeeper",
      "key": "9",
      "name": "Not the owner on the phone",
      "hint": "They are wired to take orders and to avoid decisions that cost money. Use both.",
      "items": [
        {
          "trigger": "Who am I speaking with? (ask this FIRST)",
          "variants": ["opening", "start", "hello", "name"],
          "means": "Flip it before they can screen you. Getting their name first takes control and means you never call this business blind again.",
          "say": [
            "Hello, who am I speaking with, please?",
            "(write the name down, use it for the rest of the call and on every future call here)"
          ],
          "then": "You never lose a gatekeeper call if you come away with a name. You only lose if you learn nothing."
        },
        {
          "trigger": "What is this about?",
          "variants": ["Can I ask what it's regarding?", "Is he expecting your call?", "Who's calling?"],
          "means": "That is their job. Give a real subject with real numbers, framed as something that is not their responsibility.",
          "say": [
            "It's about {{business}} sitting at {{reviews}} reviews on Google while {{competitor}} is at {{competitor_reviews}}, in {{city}}.",
            "Is that your side of things, the Google listing, or is that {{first_name}}?"
          ],
          "then": "They will say it isn't theirs. That is the point. Now they want to hand you off."
        },
        {
          "trigger": "That would be someone else",
          "variants": ["That's the owner's area", "You'd need to speak to him", "Not my department"],
          "means": "They have just told you it is above their pay grade. Now give an order, do not ask a question.",
          "say": [
            "Great. Can you kindly pass me through to {{first_name}}? I need this off my plate today."
          ],
          "then": "Never ask 'is he available', that hands the decision back. A direct request gets actioned, because actioning requests is the job."
        },
        {
          "trigger": "He's not available",
          "variants": ["She's out", "He's on a job", "He's not in today"],
          "means": "Could be true, could be the wall. Do not test which.",
          "say": [
            "No worries. When's he usually got a quiet ten minutes, morning or end of day?",
            "I'll ring back then rather than keep bothering you."
          ],
          "then": "Making their day easier is how you get the second call answered."
        },
        {
          "trigger": "We don't take sales calls",
          "variants": ["He doesn't take these", "We don't do cold calls", "Company policy"],
          "means": "A rule they will enforce. Change what you are, not how hard you push.",
          "say": [
            "Totally fair, and I won't waste your afternoon.",
            "Can I leave you one line for him? Brenda called about {{competitor}} outranking him on Google Maps.",
            "If he says don't bother, that's it, I won't call again. You've got my word."
          ],
          "then": "The promise not to call again is the whole move. It costs nothing and it is the only thing they want."
        },
        {
          "trigger": "Tell me and I'll pass it on",
          "variants": ["I handle his messages", "I'll relay it", "You can tell me"],
          "means": "They want control. Give them some, but keep a reason to talk to the owner.",
          "say": [
            "Sure. Short version is you're at {{reviews}} reviews and {{competitor}} is at {{competitor_reviews}}, and there's a reason for it that's fixable.",
            "The bit I can't do secondhand is answer his questions, and he'll have two or three.",
            "So pass that on, and if he wants the detail I'm here."
          ],
          "then": "You gave them something real to carry, which is what gets it actually delivered."
        }
      ]
    }
  ]
};
