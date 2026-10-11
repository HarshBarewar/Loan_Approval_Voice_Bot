/**
 * NLP Fact Extractor
 * Heuristic rules and regular expressions for robust, deterministic fact extraction
 * from conversational Indian English customer utterances.
 */

import {
  ExtractedFacts,
  IncomeMode,
  OccupationType,
  OwnershipStatus,
  PropertyType
} from '../types.js';

export class NLPExtractor {
  /**
   * Parse Indian currency strings into numeric INR
   * Handles: "50 lakhs", "₹75 lakh", "1 crore", "90L", "₹1.5 cr", "50,00,000"
   */
  public static parseCurrencyINR(text: string): number | null {
    const clean = text.toLowerCase().replace(/,/g, '');

    // Pattern: Crore (e.g., "1 crore", "1.5 cr", "2 crores", "1 करोड़", "2 करोड")
    const crMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores|करोड़|करोड)(?:$|[\s,.;!?'"]|\b)/i);
    if (crMatch) {
      return Math.round(parseFloat(crMatch[1]) * 10000000);
    }
    if (/\bone\s+crore\b/i.test(clean) || /(?:एक\s*करोड़|एक\s*करोड)/i.test(clean)) return 10000000;
    if (/\btwo\s+crores?\b/i.test(clean) || /(?:दो\s*करोड़|दो\s*करोड)/i.test(clean)) return 20000000;

    // Word based Lakhs: English and Hindi words
    const wordLakhs: Record<string, number> = {
      'ten': 10, 'fifteen': 15, 'twenty': 20, 'twenty-five': 25, 'twenty five': 25,
      'thirty': 30, 'thirty-five': 35, 'thirty five': 35,
      'forty': 40, 'forty-five': 45, 'forty five': 45,
      'fifty': 50, 'fifty-five': 55, 'fifty five': 55,
      'sixty': 60, 'sixty-five': 65, 'sixty five': 65,
      'seventy': 70, 'seventy-five': 75, 'seventy five': 75,
      'eighty': 80, 'eighty-five': 85, 'eighty five': 85,
      'ninety': 90, 'ninety-five': 95, 'ninety five': 95,
      'one hundred': 100,
      'दस': 10, 'पंद्रह': 15, 'बीस': 20, 'पच्चीस': 25, 'तीस': 30, 'पैंतीस': 35,
      'चालीस': 40, 'पैंतालीस': 45, 'पचास': 50, 'पचपन': 55, 'साठ': 60, 'पैंसठ': 65,
      'सत्तर': 70, 'पचहत्तर': 75, 'अस्सी': 80, 'पचासी': 85, 'नब्बे': 90, 'पंचानवे': 95,
      'सौ': 100, 'एक सौ': 100
    };

    for (const [word, val] of Object.entries(wordLakhs)) {
      const isAscii = /^[a-z\s-]+$/i.test(word);
      const reg = isAscii
        ? new RegExp(`\\b${word}\\s+lakhs?\\b`, 'i')
        : new RegExp(`(?:^|[\\s,.;!?])${word}\\s*(?:लाख|लख)(?:$|[\\s,.;!?])`, 'i');
      if (reg.test(clean)) {
        return val * 100000;
      }
    }

    // Numeric Lakhs: "50 lakh", "75 lakhs", "90 lac", "₹50l", "50 लाख"
    const lakhMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l|लाख|लख)(?:$|[\s,.;!?'"]|\b)/i);
    if (lakhMatch) {
      return Math.round(parseFloat(lakhMatch[1]) * 100000);
    }

    // Direct numbers: ₹5000000 or 5000000
    const numMatch = clean.match(/(?:rs\.?|inr|₹)?\s*(\d{5,9})\b/i);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }

    return null;
  }

  /**
   * Parse Repayment Tenure in years
   */
  public static parseTenure(text: string): number | null {
    const clean = text.toLowerCase();

    // Check correction pattern first: "make that 12 years", "actually, make that 12 years"
    const correctionMatch = clean.match(/(?:actually,?\s*(?:make that|make it)?|make that|make it|change to|rather)\s+(\d{1,2})\s*(?:years?|yrs?|yr|साल|वर्ष)?/i);
    if (correctionMatch) {
      return parseInt(correctionMatch[1], 10);
    }

    // Word tenure: English and Hindi
    const wordTenure: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'twenty': 20,
      'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
      'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
      'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'सोलह': 16
    };

    for (const [word, val] of Object.entries(wordTenure)) {
      const isAscii = /^[a-z\s-]+$/i.test(word);
      const reg = isAscii
        ? new RegExp(`\\b${word}\\s*(?:years?|yrs?)\\b`, 'i')
        : new RegExp(`(?:^|[\\s,.;!?])${word}\\s*(?:साल|वर्ष)(?:$|[\\s,.;!?])`, 'i');
      if (reg.test(clean)) {
        return val;
      }
    }

    // Numeric tenure: "5 years", "10 yrs", "12 years", "10 साल", "5 वर्ष"
    const digitMatch = clean.match(/(?:^|[\s,.;!?]|\b)(\d{1,2})\s*(?:years?|yrs?|yr|साल|वर्ष)(?:$|[\s,.;!?]|\b)/i);
    if (digitMatch) {
      return parseInt(digitMatch[1], 10);
    }

    // Standalone number in tenure context
    if (/(?:tenure|period|term|duration|अवधि|समय|साल|वर्ष)/i.test(clean)) {
      const standalone = clean.match(/(?:^|[\s,.;!?]|\b)(\d{1,2})(?:$|[\s,.;!?]|\b)/);
      if (standalone) return parseInt(standalone[1], 10);
    }

    return null;
  }

  /**
   * Extract all structured facts from an utterance using rule patterns
   */
  public static extractFacts(utterance: string, contextState?: any): ExtractedFacts {
    const clean = utterance.toLowerCase();
    const facts: ExtractedFacts = {};

    // 1. Property Type
    const isAgriculturalNegated = /(?:नहीं|not|no)\s*(?:कृषि|खेती|खेत|फार्मलैंड|agricultur)/i.test(clean) ||
                                  /(?:कृषि|खेती|खेत|फार्मलैंड|agricultur)\s*(?:नहीं|not)/i.test(clean);
    if (!isAgriculturalNegated && /(?:agricultur(?:al|e)|farm(?:land)?|कृषि|खेती|खेत|फार्मलैंड)/i.test(clean)) {
      facts.propertyType = PropertyType.AGRICULTURAL;
    } else if (/(?:residential|house|flat|apartment|villa|home|आवासीय|रेजिडेंशियल|मकान|घर|फ्लैट)/i.test(clean)) {
      facts.propertyType = PropertyType.RESIDENTIAL;
    } else if (/(?:commercial|shop|office|retail|mall|व्यावसायिक|कमर्शियल|दुकान|दफ़्तर|दफ्तर|ऑफिस)/i.test(clean)) {
      facts.propertyType = PropertyType.COMMERCIAL;
    } else if (/(?:industrial|factory|shed|warehouse|plant|औद्योगिक|इंडस्ट्रियल|फैक्ट्री|कारखाना)/i.test(clean)) {
      facts.propertyType = PropertyType.INDUSTRIAL;
    }

    // 2. Ownership Status
    if (/(?:joint(?:ly)?|co-own(?:ed)?|with my (?:wife|husband|spouse|brother|father|mother|family)|shared|संयुक्त|जॉइंट|पत्नी के साथ|परिवार|साझा)/i.test(clean)) {
      facts.ownershipStatus = OwnershipStatus.JOINT;
    } else if (/(?:sole(?:ly)?|single|myself|only me|my own|individual|खुद का|केवल मेरे|अकेला|एकल|मेरे नाम|मेरे ही नाम|सिर्फ मेरे)/i.test(clean)) {
      facts.ownershipStatus = OwnershipStatus.SOLE;
    }

    // 3. Original Property Documents
    // Determine if the conversation is currently waiting for original document verification
    const isAskingDocuments = Boolean(
      (contextState?.checklist?.originalDocuments?.value === null &&
       (contextState?.checklist?.propertyType?.value !== null ||
        contextState?.checklist?.ownershipStatus?.value !== null)) ||
      (contextState?.nextMissingQuestion &&
       /(?:मूल दस्तावेज़|ओरिजिनल पेपर्स|दस्तावेज़|कागज़ात|पेपर्स|original.*deeds|original.*documents|title deeds|original.*papers)/i.test(contextState.nextMissingQuestion))
    );

    // Negative indicators for document availability
    const hasDocNegativeKeywords =
      /(?:उपलब्ध\s*नहीं|नहीं\s*उपलब्ध|दस्तावेज़\s*नहीं|दस्तावेज\s*नहीं|कागज़ात\s*नहीं|कागजात\s*नहीं|पेपर्स\s*नहीं|ओरिजिनल\s*नहीं|मूल\s*नहीं|पास\s*नहीं|नहीं\s*हैं?|नहीं\s*उसे?|नहीं\s*उस\s*पर|उसे\s*पर\s*नहीं|नाहीं?|not\s*available|unavailable|don'?t\s*have|do\s*not\s*have|no\s*original|original.*not|deeds.*not|without\s*original)/i.test(clean) ||
      /(?:only copies|photocop(?:y|ies)|xerox|copies only|duplicates? only|lost|सिर्फ फोटोकॉपी|केवल फोटोकॉपी|फोटोकॉपी ही|फोटोकॉपी|ज़ेरॉक्स|ज़ीरॉक्स|खो गए|गुम हो गए|केवल कॉपी|बैंक में गिरवी|बैंक के पास)/i.test(clean);

    // Explicit "No" response when asked about original documents
    const isExplicitNoInDocContext =
      isAskingDocuments &&
      /(?:^|[\s,.;!?])(?:नहीं|ना|नाही|नो|जी नहीं|नहीं जी|उसे पर नहीं|नहीं उस पर|no|nope|nah|not really)(?:$|[\s,.;!?])/i.test(clean);

    if (
      // Case A: Standalone negative statement about documents or lack of originals
      (hasDocNegativeKeywords && /(?:original|deeds|documents?|papers?|title|मूल|ओरिजिनल|दस्तावेज़|दस्तावेज|कागज़ात|कागजात|पेपर्स)/i.test(clean)) ||
      // Case B: Copies / xerox / lost / bank pledged
      /(?:only copies|photocop(?:y|ies)|xerox|copies only|duplicates? only|lost|सिर्फ फोटोकॉपी|केवल फोटोकॉपी|फोटोकॉपी|ज़ेरॉक्स|खो गए|गुम हो गए|केवल कॉपी)/i.test(clean) ||
      // Case C: When agent asked about documents, customer says "नहीं", "नहीं उपलब्ध नहीं है", "नहीं उस पर", "no", etc.
      (isAskingDocuments && (hasDocNegativeKeywords || isExplicitNoInDocContext))
    ) {
      facts.originalDocuments = false;
    } else if (
      // Positive document indicators (MUST NOT have document negation or context "No"!)
      !hasDocNegativeKeywords && !isExplicitNoInDocContext && (
        /(?:original(?:s)?\s+(?:deeds|documents|papers|title deeds)?\s*(?:are\s+)?(?:available|with me|at home|ready)|in (?:the )?(?:locker|safe)|papers at home|deeds at home|have the original|deeds are available|documents are available|मूल दस्तावेज़|मूल दस्तावेज|ओरिजिनल पेपर्स|कागज़ात हैं|दस्तावेज़ हैं)/i.test(clean) ||
        (/(?:original|मूल|ओरिजिनल)/i.test(clean) && /(?:available|ready|with me|at home|in locker|उपलब्ध|पास|घर|लॉकर)/i.test(clean)) ||
        (isAskingDocuments && /(?:^|[\s,.;!?])(?:हाँ|हां|जी हाँ|जी हां|हाँ जी|बिल्कुल|उपलब्ध हैं|उपलब्ध है|हैं|yes|yeah|yep|sure|available|ready|i have them|have them)(?:$|[\s,.;!?])/i.test(clean))
      )
    ) {
      facts.originalDocuments = true;
    }

    // 4. Occupation & Income Mode
    if (/(?:salaried|job|employee|employed|working in (?:an?|a)|नौकरी|सैलरीड|नौकरीपेशा|कर्मचारी)/i.test(clean)) {
      facts.occupation = OccupationType.SALARIED;
    } else if (/(?:self[- ]employed|business|shop owner|freelance|consultant|own business|व्यवसाय|व्यापार|बिजनेस|खुद का काम|दुकानदार)/i.test(clean)) {
      facts.occupation = OccupationType.SELF_EMPLOYED;
    }

    const hasCashKeywords = /(?:cash(?:-in-hand| in hand)?|by cash|in cash|नकद|कैश|हाथ में)/i.test(clean) ||
                            /(?:बैंक में नहीं|खाते में नहीं|अकाउंट में नहीं|not in bank|not via bank)/i.test(clean);
    if (hasCashKeywords) {
      facts.incomeMode = IncomeMode.CASH;
    } else if (/(?:bank(?:ing)?|account|online transfer|direct deposit|neft|cheque|credited|बैंक|अकाउंट|खाता|बैंक ट्रांसफर|खाते में)/i.test(clean)) {
      facts.incomeMode = IncomeMode.BANK;
    }

    // 5. Existing Property Loan & EMI Reduction
    if (/(?:loan on (?:this|the) property|mortgage on (?:this|the) property|existing (?:home|property) loan|running loan on (?:this|the) house|पहले से लोन|चालू लोन|प्रॉपर्टी पर लोन|घर पर लोन)/i.test(clean)) {
      facts.existingPropertyLoan = true;
    }
    if (/(?:reduce (?:my )?emi|lower (?:my )?emi|balance transfer|transfer (?:my )?loan|cut down (?:the )?emi|ईएमआई कम|बैलेंस ट्रांसफर|किस्त कम)/i.test(clean)) {
      facts.emiReductionRequested = true;
    }

    // 6. Customer Availability / Busy
    if (/(?:busy|driving|in a meeting|can'?t talk|call (?:me )?(?:back|later)|not free|व्यस्त|मीटिंग में|ड्राइविंग|बाद में फोन|कल फोन|अभी समय नहीं)/i.test(clean)) {
      facts.isBusy = true;
      const timeMatch = clean.match(/(?:call (?:at|after)|at|after)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\s*(?:pm|am)|tomorrow(?:\s+at\s+\d{1,2}(?:am|pm)?)?)/i);
      if (timeMatch) {
        facts.callbackTime = timeMatch[1].trim();
      } else if (/कल|tomorrow/i.test(clean)) {
        facts.callbackTime = 'कल';
      }
    }

    // 7. Customer Decline
    if (/(?:not interested|don'?t want|no thanks|cancel|stop calling|decline|नहीं चाहिए|दिलचस्पी नहीं|मना|कॉल मत करो|ज़रूरत नहीं)/i.test(clean)) {
      facts.customerDeclined = true;
    }

    // 8. ₹75 Lakhs Cap Alternative Agreement
    const isAskingLoanCap = Boolean(
      contextState?.maxAmountCapOffered === true &&
      contextState?.maxAmountCapAccepted === null
    );

    if (
      /(?:yes proceed with (?:75|75 lakh)|okay with 75|agree to 75|fine with 75|75 lakh is fine|75 is okay|yes 75 lakh|75 लाख ठीक है|75 लाख चलेगा|75 लाख मंजूर|हाँ 75 लाख|हां 75 लाख)/i.test(clean) ||
      (isAskingLoanCap && /(?:^|[\s,.;!?])(?:हाँ|हां|जी हाँ|ठीक है|चलेगा|मंजूर|yes|yeah|sure|okay|fine)(?:$|[\s,.;!?])/i.test(clean))
    ) {
      facts.maxAmountAccepted = true;
    } else if (
      /(?:no 75 is not enough|need more than 75|cannot proceed with 75|decline 75|not interested with 75|75 लाख कम है|नहीं 75 लाख|75 लाख नहीं चाहिए)/i.test(clean) ||
      (isAskingLoanCap && /(?:^|[\s,.;!?])(?:नहीं|ना|नाही|नो|कम है|नहीं चलेगा|no|nope|nah|not enough)(?:$|[\s,.;!?])/i.test(clean))
    ) {
      facts.maxAmountAccepted = false;
    }

    // 9. Loan Amount vs Market Value Disambiguation
    // English & Hindi patterns:
    // e.g. "worth 1 crore, need 50 lakh" or "मूल्य 1 करोड़, 50 लाख का लोन चाहिए"
    const worthMatch = clean.match(/(?:worth|value(?:d)?(?: at)?|market value(?: of)?|मूल्य|कीमत)\s*[:=]?\s*([^,;]+)/i);
    const needMatch = clean.match(/(?:need|require|want|looking for|loan (?:of|amount))\s*[:=]?\s*([^,;]+)/i);
    const needBefore = clean.match(/([^,;]+)\s*(?:का लोन चाहिए|का लोन|लोन चाहिए)/i);
    const worthBefore = clean.match(/([^,;]+)\s*(?:का मूल्य|की कीमत|की संपत्ति)/i);

    const worthText = worthMatch ? worthMatch[1] : (worthBefore ? worthBefore[1] : null);
    const needText = needMatch ? needMatch[1] : (needBefore ? needBefore[1] : null);

    if (worthText && needText) {
      facts.marketValueInr = this.parseCurrencyINR(worthText);
      facts.loanAmountInr = this.parseCurrencyINR(needText);
    } else if (worthText) {
      facts.marketValueInr = this.parseCurrencyINR(worthText);
    } else if (needText) {
      facts.loanAmountInr = this.parseCurrencyINR(needText);
    } else {
      // Fallback check depending on conversation context
      const parsedCurr = this.parseCurrencyINR(clean);
      if (parsedCurr !== null) {
        if (contextState?.checklist?.desiredLoanAmount?.value === null) {
          facts.loanAmountInr = parsedCurr;
        } else if (contextState?.checklist?.marketValue?.value === null) {
          facts.marketValueInr = parsedCurr;
        }
      }
    }

    // 10. Desired Tenure
    const parsedTenure = this.parseTenure(clean);
    if (parsedTenure !== null) {
      facts.tenureYears = parsedTenure;
    }

    return facts;
  }

  /**
   * Check if utterance is an ambiguous document response
   */
  public static isAmbiguousDocuments(utterance: string): boolean {
    const clean = utterance.toLowerCase();
    return /(?:should be somewhere|might have them|not sure|have to check|probably somewhere|will search|कहीं रखे होंगे|ढूंढना पड़ेगा|देखना पड़ेगा)/i.test(clean);
  }

  /**
   * Check if utterance is asking about interest rates
   */
  public static isInterestRateQuestion(utterance: string): boolean {
    const clean = utterance.toLowerCase();
    return (
      /(?:what(?:'s| is) (?:the |your |the current )?(?:interest|roi|rate|interest rate)|rate of interest|how much interest|ब्याज दर|कितना ब्याज|ब्याज कितना)/i.test(clean) ||
      (/(?:interest|roi|ब्याज)/i.test(clean) && /(?:rate|charge|what|how much|offer|दर|कितना)/i.test(clean))
    );
  }

  /**
   * Check if utterance is an unrelated question or diversion
   */
  public static isUnrelatedQuestion(utterance: string): boolean {
    const clean = utterance.toLowerCase();
    return /(?:what company|who are you|where are you located|how did you get my number|what time is it|आप कौन हो|कहाँ से बोल रहे हो)/i.test(clean);
  }
}
